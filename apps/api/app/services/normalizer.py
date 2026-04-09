from __future__ import annotations

from math import atan2, cos, hypot, isclose, radians, sin, sqrt
from uuid import uuid4

from smartroute_shared.schemas import CanonicalProblem, ParseResult, ProblemNode, ProblemType

from app.services.validator import ProblemValidationError, validate_parse_result

MAX_NODE_COUNT = 500


def normalize(parsed: ParseResult) -> CanonicalProblem:
    errors = validate_parse_result(parsed, maximum_nodes=MAX_NODE_COUNT)
    if errors:
        raise ProblemValidationError(errors)

    nodes = [
        ProblemNode(id=node.id, label=node.label, x=node.x, y=node.y)
        for node in parsed.nodes
    ]
    distance_matrix = _normalize_distance_matrix(parsed, nodes)
    problem_type = _infer_problem_type(parsed, nodes, distance_matrix)
    start_node_id = _resolve_start_node_id(parsed, nodes)
    metadata = {"inputSources": [parsed.inputType], **parsed.metadata}

    return CanonicalProblem(
        problemId=uuid4(),
        problemType=problem_type,
        name=parsed.name,
        nodes=nodes,
        distanceMatrix=distance_matrix,
        startNodeId=start_node_id,
        returnToStart=parsed.returnToStart,
        objective=parsed.objective,
        secondaryObjectives=list(parsed.secondaryObjectives),
        constraints={"maxNodeCount": MAX_NODE_COUNT, **parsed.constraints},
        metadata=metadata,
    )


def _normalize_distance_matrix(
    parsed: ParseResult,
    nodes: list[ProblemNode],
) -> list[list[float]] | None:
    if parsed.distanceMatrix is not None:
        return [[round(float(value), 6) for value in row] for row in parsed.distanceMatrix]

    if any(node.x is None or node.y is None for node in nodes):
        return None

    if _is_latlon_problem(parsed):
        return _build_haversine_matrix(nodes)

    matrix: list[list[float]] = []
    for source in nodes:
        row: list[float] = []
        for target in nodes:
            if source.id == target.id:
                row.append(0.0)
                continue
            distance = hypot(
                (source.x or 0.0) - (target.x or 0.0),
                (source.y or 0.0) - (target.y or 0.0),
            )
            row.append(round(distance, 6))
        matrix.append(row)

    return matrix


def _resolve_start_node_id(parsed: ParseResult, nodes: list[ProblemNode]) -> str:
    if parsed.startNodeId and any(node.id == parsed.startNodeId for node in nodes):
        return parsed.startNodeId
    return nodes[0].id


def _infer_problem_type(
    parsed: ParseResult,
    nodes: list[ProblemNode],
    distance_matrix: list[list[float]] | None,
) -> ProblemType:
    if not parsed.returnToStart:
        return "open_tsp"

    if distance_matrix is None:
        return "tsp"

    has_coordinates = all(node.x is not None and node.y is not None for node in nodes)
    if not has_coordinates:
        return "atsp" if not _is_symmetric(distance_matrix) else "matrix_tsp"

    if _is_latlon_problem(parsed):
        return "atsp" if not _is_symmetric(distance_matrix) else "tsp"

    euclidean_matrix = _normalize_distance_matrix(
        ParseResult(inputType=parsed.inputType, nodes=nodes),
        nodes,
    )
    if euclidean_matrix is not None and not _matrices_equal(distance_matrix, euclidean_matrix):
        return "weighted_tsp"

    return "atsp" if not _is_symmetric(distance_matrix) else "tsp"


def _is_latlon_problem(parsed: ParseResult) -> bool:
    geo = parsed.metadata.get("geo")
    if not isinstance(geo, dict):
        return False
    return geo.get("coordinateSystem") == "latlon"


def _build_haversine_matrix(nodes: list[ProblemNode]) -> list[list[float]]:
    matrix: list[list[float]] = []
    for source in nodes:
        row: list[float] = []
        for target in nodes:
            if source.id == target.id:
                row.append(0.0)
                continue
            row.append(round(_haversine_km(source.x or 0.0, source.y or 0.0, target.x or 0.0, target.y or 0.0), 6))
        matrix.append(row)
    return matrix


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0088
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    lat1_r = radians(lat1)
    lat2_r = radians(lat2)

    a = sin(d_lat / 2) ** 2 + cos(lat1_r) * cos(lat2_r) * sin(d_lon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return radius_km * c


def _is_symmetric(matrix: list[list[float]]) -> bool:
    for row_index, row in enumerate(matrix):
        for column_index, value in enumerate(row):
            if not isclose(value, matrix[column_index][row_index], rel_tol=1e-9, abs_tol=1e-9):
                return False
    return True


def _matrices_equal(left: list[list[float]], right: list[list[float]]) -> bool:
    if len(left) != len(right):
        return False

    for left_row, right_row in zip(left, right, strict=False):
        if len(left_row) != len(right_row):
            return False
        for left_value, right_value in zip(left_row, right_row, strict=False):
            if not isclose(left_value, right_value, rel_tol=1e-9, abs_tol=1e-9):
                return False

    return True
