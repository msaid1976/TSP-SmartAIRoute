from __future__ import annotations

import re
from collections.abc import Iterable

from smartroute_shared.schemas import ParseResult, ProblemNode

from app.services.validator import malformed_coords_error

NUMBER_PATTERN = r"[-+]?(?:\d+(?:\.\d+)?|\.\d+)"
PAREN_TOKEN = re.compile(
    rf"^\s*(?P<name>[^():,\n][^():\n]*?)\s*\(\s*(?P<x>{NUMBER_PATTERN})\s*,\s*(?P<y>{NUMBER_PATTERN})\s*\)\s*$"
)
COLON_TOKEN = re.compile(
    rf"^\s*(?P<name>[^:,\n]+?)\s*:\s*(?P<x>{NUMBER_PATTERN})\s*,\s*(?P<y>{NUMBER_PATTERN})\s*$"
)
SPACE_TOKEN = re.compile(
    rf"^\s*(?P<name>\S+)\s+(?P<x>{NUMBER_PATTERN})\s+(?P<y>{NUMBER_PATTERN})\s*$"
)
PAREN_FINDER = re.compile(
    rf"(?P<name>[^():,\n][^():\n]*?)\s*\(\s*(?P<x>{NUMBER_PATTERN})\s*,\s*(?P<y>{NUMBER_PATTERN})\s*\)"
)


def parse_text(text: str) -> ParseResult:
    warnings: list[str] = []
    nodes: list[ProblemNode] = []
    consumed_ranges: list[tuple[int, int]] = []

    for match in PAREN_FINDER.finditer(text):
        nodes.append(_node_from_match(match.group("name"), match.group("x"), match.group("y")))
        consumed_ranges.append(match.span())

    remaining_segments = _remaining_segments(text, consumed_ranges)
    for segment in _split_segments(remaining_segments):
        if not segment:
            continue

        parsed_node = _parse_coordinate_segment(segment)
        if parsed_node is None:
            warnings.append(malformed_coords_error(_guess_node_id(segment)))
            continue

        nodes.append(parsed_node)

    return ParseResult(
        inputType="text",
        problemType="tsp",
        nodes=nodes,
        startNodeId=nodes[0].id if nodes else None,
        metadata={"inputSources": ["text"], "sourceText": text},
        warnings=warnings,
    )


def parse_table(rows: list[list]) -> ParseResult:
    cleaned_rows = [
        [_stringify(cell) for cell in row]
        for row in rows
        if any(_stringify(cell) for cell in row)
    ]
    if not cleaned_rows:
        return ParseResult(
            inputType="table",
            nodes=[],
            metadata={"inputSources": ["table"], "sourceTableRows": rows},
        )

    header = [cell.strip().lower() for cell in cleaned_rows[0]]
    if _is_node_table_header(header):
        return _parse_node_table(cleaned_rows)

    if _looks_like_labeled_matrix(cleaned_rows):
        labels = [cell.strip() for cell in cleaned_rows[0][1:]]
        matrix_rows = [row[1:] for row in cleaned_rows[1:]]
        parsed = parse_matrix(matrix_rows, labels=labels)
        parsed.inputType = "table"
        parsed.metadata["inputSources"] = ["table"]
        parsed.metadata["sourceTableRows"] = rows
        return parsed

    parsed = parse_matrix(cleaned_rows)
    parsed.inputType = "table"
    parsed.metadata["inputSources"] = ["table"]
    parsed.metadata["sourceTableRows"] = rows
    return parsed


def parse_matrix(data: list[list], labels: list[str] | None = None) -> ParseResult:
    matrix = [[float(_stringify(cell)) for cell in row] for row in data]
    size = len(matrix)
    effective_labels = labels if labels and len(labels) == size else _auto_labels(size)
    nodes = [
        ProblemNode(id=label, label=label, x=None, y=None)
        for label in effective_labels
    ]

    return ParseResult(
        inputType="matrix",
        problemType="matrix_tsp",
        nodes=nodes,
        distanceMatrix=matrix,
        startNodeId=nodes[0].id if nodes else None,
        metadata={
            "inputSources": ["matrix"],
            "labels": effective_labels,
        },
    )


def parse_canvas(payload: dict) -> ParseResult:
    wrapper_input_type = payload.get("inputType")
    raw_payload = payload.get("payload", payload)
    raw_nodes = raw_payload.get("nodes", [])
    raw_edges = raw_payload.get("edges", [])
    raw_geo = raw_payload.get("geo")

    nodes = [
        ProblemNode(
            id=str(node["id"]),
            label=str(node.get("label", node["id"])),
            x=float(node["x"]),
            y=float(node["y"]),
        )
        for node in raw_nodes
    ]

    input_type = "map" if wrapper_input_type == "map" else "gui"
    input_sources = [input_type]
    metadata: dict = {
        "inputSources": input_sources,
        "edgeHints": [
            [str(edge["sourceId"]), str(edge["targetId"])]
            for edge in raw_edges
        ],
    }

    if isinstance(raw_geo, dict):
        if "map" not in input_sources:
            input_sources.append("map")
        metadata["geo"] = raw_geo

    return ParseResult(
        inputType=input_type,
        nodes=nodes,
        startNodeId=raw_payload.get("startNodeId"),
        returnToStart=bool(raw_payload.get("returnToStart", True)),
        objective=raw_payload.get("objective", "min_distance"),
        metadata=metadata,
    )


def _parse_node_table(rows: list[list[str]]) -> ParseResult:
    header = [cell.strip().lower() for cell in rows[0]]
    id_index = header.index("id") if "id" in header else header.index("name")
    name_index = header.index("name") if "name" in header else id_index
    x_index = header.index("x")
    y_index = header.index("y")

    nodes: list[ProblemNode] = []
    warnings: list[str] = []

    for row in rows[1:]:
        if len(row) <= max(id_index, name_index, x_index, y_index):
            warnings.append(malformed_coords_error(_guess_node_id(" ".join(row))))
            continue

        node_id = row[id_index].strip()
        label = row[name_index].strip() or node_id
        try:
            x = float(row[x_index].strip())
            y = float(row[y_index].strip())
        except ValueError:
            warnings.append(malformed_coords_error(node_id or _guess_node_id(" ".join(row))))
            continue

        nodes.append(ProblemNode(id=node_id, label=label, x=x, y=y))

    return ParseResult(
        inputType="table",
        problemType="tsp",
        nodes=nodes,
        startNodeId=nodes[0].id if nodes else None,
        metadata={"inputSources": ["table"], "sourceTableRows": rows},
        warnings=warnings,
    )


def _parse_coordinate_segment(segment: str) -> ProblemNode | None:
    for pattern in (PAREN_TOKEN, COLON_TOKEN, SPACE_TOKEN):
        match = pattern.match(segment)
        if match is not None:
            return _node_from_match(match.group("name"), match.group("x"), match.group("y"))

    return None


def _node_from_match(name: str, x_value: str, y_value: str) -> ProblemNode:
    label = name.strip()
    return ProblemNode(id=label, label=label, x=float(x_value), y=float(y_value))


def _remaining_segments(text: str, ranges: list[tuple[int, int]]) -> list[str]:
    if not ranges:
        return [text]

    segments: list[str] = []
    cursor = 0
    for start, end in ranges:
        if start > cursor:
            segments.append(text[cursor:start])
        cursor = end
    if cursor < len(text):
        segments.append(text[cursor:])

    return segments


def _split_segments(chunks: Iterable[str]) -> list[str]:
    segments: list[str] = []
    for chunk in chunks:
        for segment in re.split(r"[\n;]+", chunk):
            stripped = segment.strip().strip(",")
            if stripped and not re.fullmatch(r"[A-Za-z\s]+:?", stripped):
                segments.append(stripped)
    return segments


def _guess_node_id(segment: str) -> str:
    cleaned = segment.strip()
    if not cleaned:
        return "unknown"
    for delimiter in ("(", ":", " "):
        if delimiter in cleaned:
            prefix = cleaned.split(delimiter, 1)[0].strip(" ,")
            if prefix:
                return prefix
    return cleaned.strip(" ,")


def _is_node_table_header(header: list[str]) -> bool:
    return ("id" in header or "name" in header) and "x" in header and "y" in header


def _looks_like_labeled_matrix(rows: list[list[str]]) -> bool:
    if len(rows) < 2 or len(rows[0]) < 2:
        return False
    numeric_rows = all(_looks_like_number(cell) for row in rows[1:] for cell in row[1:])
    return numeric_rows and not _looks_like_number(rows[0][1])


def _looks_like_number(value: str) -> bool:
    try:
        float(value.strip())
    except ValueError:
        return False
    return True


def _stringify(value: object) -> str:
    return str(value).strip()


def _auto_labels(size: int) -> list[str]:
    return [_index_to_label(index) for index in range(size)]


def _index_to_label(index: int) -> str:
    label = ""
    current = index

    while True:
        current, remainder = divmod(current, 26)
        label = chr(ord("A") + remainder) + label
        if current == 0:
            return label
        current -= 1
