import pytest
from app.api.routes.problems import create_problem, get_problem, get_problem_distance_matrix
from app.main import app
from app.models.problem import ProblemRecord
from httpx import ASGITransport, AsyncClient
from smartroute_shared.schemas import ProblemInputRequest
from sqlalchemy import select
from sqlalchemy.orm import Session


@pytest.mark.anyio
async def test_preview_problem_returns_normalized_problem_without_db_write(
    session: Session,
) -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/api/problems/preview",
            json={"inputType": "text", "payload": "A(0,0), B(3,4)"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["problem"]["problemType"] == "tsp"
    assert payload["warnings"] == []
    assert session.execute(select(ProblemRecord)).scalars().all() == []


def test_create_and_fetch_problem(session: Session) -> None:
    created = create_problem(
        request=ProblemInputRequest(
            inputType="matrix",
            payload={"data": [[0, 7], [3, 0]], "labels": ["A", "B"]},
        ),
        session=session,
    )

    fetched = get_problem(str(created.problemId), session)
    matrix = get_problem_distance_matrix(str(created.problemId), session)

    assert fetched.problemType == "atsp"
    assert matrix.distanceMatrix == [[0.0, 7.0], [3.0, 0.0]]


@pytest.mark.anyio
async def test_preview_returns_human_readable_validation_errors() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/api/problems/preview",
            json={"inputType": "text", "payload": "A(0,0)"},
        )

    assert response.status_code == 422
    assert response.json()["detail"] == ["At least 2 nodes are required. Found: 1."]


@pytest.mark.anyio
async def test_preview_accepts_table_csv_text_payload() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/api/problems/preview",
            json={
                "inputType": "table",
                "payload": {
                    "text": "name,x,y\nWarehouse A,0,0\nPort B,3,5\nDepot C,7,2",
                },
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["problem"]["problemType"] == "tsp"
    assert [node["id"] for node in payload["problem"]["nodes"]] == [
        "Warehouse A",
        "Port B",
        "Depot C",
    ]


@pytest.mark.anyio
async def test_preview_rejects_invalid_table_payload_shape() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/api/problems/preview",
            json={
                "inputType": "table",
                "payload": {"rows": [["name", "x", "y"], ["A", "0", "0"]]},
            },
        )

    assert response.status_code == 422
    assert response.json()["detail"] == [
        "Table payload must be either a 2D array of rows or an object with a 'text' CSV string."
    ]


@pytest.mark.anyio
async def test_preview_map_latlon_computes_haversine_distances() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/api/problems/preview",
            json={
                "inputType": "map",
                "payload": {
                    "nodes": [
                        {"id": "Kuala Lumpur", "label": "Kuala Lumpur", "x": 3.139, "y": 101.6869},
                        {"id": "George Town", "label": "George Town", "x": 5.4141, "y": 100.3288},
                    ],
                    "edges": [],
                    "startNodeId": "Kuala Lumpur",
                    "returnToStart": True,
                    "objective": "min_distance",
                    "geo": {"countryCode": "MY", "countryName": "Malaysia", "coordinateSystem": "latlon"},
                },
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["problem"]["problemType"] == "tsp"
    matrix = payload["problem"]["distanceMatrix"]
    assert matrix is not None
    # Great-circle distance is roughly ~290-320 km. We just sanity check it is non-trivial.
    assert 200.0 < matrix[0][1] < 500.0
