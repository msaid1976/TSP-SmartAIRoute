from app.services.normalizer import normalize
from app.services.parser import parse_canvas, parse_matrix, parse_table, parse_text


def test_parse_text_supports_multiple_coordinate_formats() -> None:
    parsed = parse_text("A(0,0), B(3,5)\nCityC 8 13\nD: 21,34")

    assert [node.id for node in parsed.nodes] == ["A", "B", "CityC", "D"]
    assert parsed.warnings == []


def test_parse_text_ignores_intro_prefix_and_handles_named_cities() -> None:
    parsed = parse_text("Cities: London(51.5,-0.1), Paris(48.8,2.3)")

    assert [node.id for node in parsed.nodes] == ["London", "Paris"]
    assert parsed.warnings == []


def test_parse_table_supports_node_rows() -> None:
    parsed = parse_table([["id", "x", "y"], ["A", "0", "0"], ["B", "3", "5"]])

    assert parsed.problemType == "tsp"
    assert [(node.id, node.x, node.y) for node in parsed.nodes] == [
        ("A", 0.0, 0.0),
        ("B", 3.0, 5.0),
    ]


def test_parse_matrix_returns_matrix_problem() -> None:
    parsed = parse_matrix([[0, 10, 15], [10, 0, 20], [15, 20, 0]])

    assert parsed.problemType == "matrix_tsp"
    assert parsed.distanceMatrix == [[0.0, 10.0, 15.0], [10.0, 0.0, 20.0], [15.0, 20.0, 0.0]]
    assert all(node.x is None and node.y is None for node in parsed.nodes)


def test_parse_canvas_preserves_edge_hints() -> None:
    parsed = parse_canvas(
        {
            "inputType": "gui",
            "payload": {
                "nodes": [
                    {"id": "A", "label": "A", "x": 12.5, "y": 30},
                    {"id": "B", "label": "B", "x": 48, "y": 18},
                ],
                "edges": [{"sourceId": "A", "targetId": "B"}],
                "startNodeId": "A",
                "returnToStart": True,
                "objective": "min_distance",
            },
        }
    )

    assert parsed.startNodeId == "A"
    assert parsed.metadata["edgeHints"] == [["A", "B"]]


def test_normalize_builds_symmetric_distance_matrix_from_coordinates() -> None:
    normalized = normalize(parse_text("A(0,0), B(3,4)"))

    assert normalized.problemType == "tsp"
    assert normalized.distanceMatrix == [[0.0, 5.0], [5.0, 0.0]]
