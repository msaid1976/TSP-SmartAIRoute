from __future__ import annotations

from collections import Counter

from smartroute_shared.schemas import ParseResult, ProblemNode


class ProblemValidationError(ValueError):
    def __init__(self, errors: list[str]):
        super().__init__("\n".join(errors))
        self.errors = errors


def node_count_error(count: int) -> str:
    return f"At least 2 nodes are required. Found: {count}."


def duplicate_id_error(node_id: str, occurrences: int) -> str:
    return f"Node '{node_id}' appears {occurrences} times. All node IDs must be unique."


def malformed_coords_error(node_id: str) -> str:
    return f"Cannot parse coordinates for node '{node_id}'. Expected format: Name(x,y)."


def matrix_not_square_error(rows: int, cols: int) -> str:
    return f"Distance matrix is not square. Got {rows}×{cols}."


def max_node_count_error(count: int, maximum: int) -> str:
    return f"At most {maximum} nodes are allowed. Found: {count}."


def validate_node_count(nodes: list[ProblemNode], maximum: int = 500) -> list[str]:
    count = len(nodes)
    errors: list[str] = []

    if count < 2:
        errors.append(node_count_error(count))
    if count > maximum:
        errors.append(max_node_count_error(count, maximum))

    return errors


def validate_duplicate_ids(nodes: list[ProblemNode]) -> list[str]:
    counts = Counter(node.id for node in nodes)
    return [duplicate_id_error(node_id, count) for node_id, count in counts.items() if count > 1]


def validate_matrix_shape(matrix: list[list[float]] | None) -> list[str]:
    if matrix is None:
        return []

    rows = len(matrix)
    for row in matrix:
        if len(row) != rows:
            return [matrix_not_square_error(rows, len(row))]

    return []


def validate_parse_result(parsed: ParseResult, maximum_nodes: int = 500) -> list[str]:
    errors = [
        *validate_node_count(parsed.nodes, maximum_nodes),
        *validate_duplicate_ids(parsed.nodes),
        *validate_matrix_shape(parsed.distanceMatrix),
    ]
    return errors
