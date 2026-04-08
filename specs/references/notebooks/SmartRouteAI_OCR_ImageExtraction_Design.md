# SmartRoute AI — OCR & Image Extraction Design Specification
### Component: Image Input Mode | Phase: 006B (after SaaS hardening)
### Pipeline: Upload → Preprocess → Classify → Extract → Validate → Normalize

---

## Overview

This document specifies the complete OCR and image graph extraction feature for
SmartRoute AI. It covers all four areas:

1. OCR pipeline — extracting city names and coordinates from map/table images
2. Graph extraction — detecting nodes and edges from hand-drawn sketches
3. User validation step — confirming and correcting detected nodes before solving
4. Backend architecture — technology choices with trade-off rationale

---

## Architecture decision: hybrid local-first approach

### Recommendation

Use a **tiered, local-first pipeline** with an optional VLM fallback:

| Tier | Technology | Use case | Cost |
|---|---|---|---|
| 1 — OCR | Tesseract 5 + EasyOCR fallback | Printed maps, scanned tables | Free, local |
| 2 — Graph extraction | OpenCV (blob + contour detection) | Hand-drawn sketches | Free, local |
| 3 — VLM fallback | Your Qwen3-VL-2B (from thesis) | Complex or mixed images | Free, local |
| 4 — Cloud fallback | Google Vision API | When tiers 1–3 confidence < 40% | Pay-per-use |

### Why this stack

**Tesseract 5** handles printed coordinate text and labelled maps well. It is battle-tested,
runs locally, and requires no API key. It is fast (< 500ms for typical inputs).

**EasyOCR** is a drop-in fallback when Tesseract confidence is low. It handles handwritten
labels, rotated text, and non-Latin characters better than Tesseract.

**OpenCV** blob and contour detection handles hand-drawn circles and lines reliably without
a neural network. For sketch inputs, nodes are detected as closed contours and edges as line
segments connecting them.

**Qwen3-VL-2B** (Mohamed's fine-tuned model from the thesis) is the ideal VLM fallback.
It is already locally deployed, privacy-preserving, runs on the RTX 5070 Ti, and understands
spatial relationships from images. When OCR + OpenCV cannot confidently extract a node list,
the image is passed to Qwen3-VL with a structured prompt requesting JSON output.

**Google Vision API** is the final fallback — only triggered when local confidence
is below 40% AND the user explicitly opts in (because it sends image data to a
third-party server). This respects the privacy-first principle from the thesis project.

---

## 1. OCR Pipeline

### 1.1 Input formats accepted

| Format | Notes |
|---|---|
| PNG / JPG | Standard photo or screenshot of a map |
| PDF (single page) | Rendered to image at 150 DPI before processing |
| Hand-drawn sketch (JPG/PNG) | Routes to graph extraction pipeline instead of OCR |

Upload size limit: 10 MB. Resolution cap: 4000 × 4000px (downscaled if exceeded).

### 1.2 Preprocessing steps

```python
# apps/api/services/ocr/preprocessor.py

import cv2
import numpy as np

def preprocess(image_bytes: bytes) -> np.ndarray:
    """
    Standard preprocessing pipeline for OCR.
    Returns grayscale numpy array ready for OCR engine.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # 1. Resize to max 2000px on longest edge (preserves aspect ratio)
    h, w = img.shape[:2]
    if max(h, w) > 2000:
        scale = 2000 / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)))

    # 2. Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 3. Denoise (Non-local means, mild settings)
    denoised = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)

    # 4. Adaptive threshold (handles uneven lighting from phone photos)
    binary = cv2.adaptiveThreshold(
        denoised, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2
    )

    return binary
```

### 1.3 Image classifier

Before routing to OCR or graph extraction, classify the image type:

```python
# apps/api/services/ocr/classifier.py

from enum import Enum

class ImageType(str, Enum):
    MAP = "map"           # Printed map with labelled locations
    TABLE = "table"       # Spreadsheet screenshot or coordinate table
    SKETCH = "sketch"     # Hand-drawn graph or route diagram
    UNKNOWN = "unknown"   # Cannot classify confidently

def classify_image(img: np.ndarray) -> tuple[ImageType, float]:
    """
    Returns (image_type, confidence).
    Uses structural heuristics — not a neural network.
    """
    # Heuristic 1: line density (tables have many horizontal/vertical lines)
    lines = cv2.HoughLinesP(img, 1, np.pi/180, threshold=80,
                             minLineLength=40, maxLineGap=10)
    line_count = len(lines) if lines is not None else 0

    # Heuristic 2: circle/blob density (sketches have hand-drawn circles)
    blobs = detect_blobs(img)
    blob_count = len(blobs)

    # Heuristic 3: text density (maps have many short text labels)
    # (estimated from Tesseract word count on a quick pass)

    if line_count > 20 and blob_count < 5:
        return ImageType.TABLE, 0.82
    elif blob_count > 3 and line_count < 15:
        return ImageType.SKETCH, 0.78
    else:
        return ImageType.MAP, 0.65
```

### 1.4 OCR engine (Tesseract + EasyOCR fallback)

```python
# apps/api/services/ocr/text_extractor.py

import pytesseract
import easyocr
from dataclasses import dataclass

@dataclass
class OCRToken:
    text: str
    x: float        # normalized [0, 100]
    y: float        # normalized [0, 100]
    confidence: float   # [0.0, 1.0]
    width: float
    height: float

def extract_text_tesseract(img: np.ndarray, img_w: int, img_h: int) -> list[OCRToken]:
    """Primary OCR pass using Tesseract 5."""
    data = pytesseract.image_to_data(
        img, output_type=pytesseract.Output.DICT,
        config='--psm 11 --oem 3'   # sparse text, LSTM engine
    )
    tokens = []
    for i in range(len(data['text'])):
        text = data['text'][i].strip()
        conf = int(data['conf'][i])
        if not text or conf < 0:
            continue
        tokens.append(OCRToken(
            text=text,
            x=round((data['left'][i] + data['width'][i] / 2) / img_w * 100, 2),
            y=round((data['top'][i] + data['height'][i] / 2) / img_h * 100, 2),
            confidence=conf / 100,
            width=data['width'][i] / img_w * 100,
            height=data['height'][i] / img_h * 100,
        ))
    return tokens

def extract_text_easyocr(img_bytes: bytes, img_w: int, img_h: int) -> list[OCRToken]:
    """Fallback OCR using EasyOCR — better for handwritten and rotated text."""
    reader = easyocr.Reader(['en'], gpu=True)
    results = reader.readtext(img_bytes)
    tokens = []
    for bbox, text, conf in results:
        cx = sum(p[0] for p in bbox) / 4
        cy = sum(p[1] for p in bbox) / 4
        tokens.append(OCRToken(
            text=text.strip(),
            x=round(cx / img_w * 100, 2),
            y=round(cy / img_h * 100, 2),
            confidence=round(conf, 3),
            width=0, height=0,
        ))
    return tokens

def extract_text(img: np.ndarray, img_bytes: bytes) -> list[OCRToken]:
    """
    Run Tesseract. If avg confidence < 0.55, fall back to EasyOCR.
    """
    h, w = img.shape[:2]
    tokens = extract_text_tesseract(img, w, h)
    avg_conf = sum(t.confidence for t in tokens) / max(len(tokens), 1)
    if avg_conf < 0.55 or len(tokens) < 2:
        return extract_text_easyocr(img_bytes, w, h)
    return tokens
```

### 1.5 Coordinate parser — merging text + position

After OCR extracts text tokens, the coordinate parser groups them into candidate nodes:

```python
# apps/api/services/ocr/coordinate_parser.py

from dataclasses import dataclass

@dataclass
class CandidateNode:
    id: str             # auto-assigned letter (A, B, C...)
    label: str          # OCR-extracted label
    x: float            # normalized [0, 100]
    y: float            # normalized [0, 100]
    confidence: float   # combined OCR + position confidence
    source: str         # 'ocr' | 'graph_extraction' | 'vlm'

def parse_candidates(tokens: list[OCRToken]) -> list[CandidateNode]:
    """
    Groups nearby tokens into single city labels.
    Assigns coordinate from token centroid.
    Filters out noise (single characters, numbers-only tokens).
    """
    # 1. Filter: keep tokens that look like city/location names
    #    (min 2 chars, not purely numeric, not common map artifacts)
    meaningful = [t for t in tokens if _is_location_label(t.text)]

    # 2. Cluster nearby tokens into single labels (within 5% of image size)
    clusters = _cluster_nearby_tokens(meaningful, proximity_pct=5.0)

    # 3. Build candidate nodes
    candidates = []
    for i, cluster in enumerate(clusters):
        label = ' '.join(t.text for t in cluster)
        cx = sum(t.x for t in cluster) / len(cluster)
        cy = sum(t.y for t in cluster) / len(cluster)
        conf = sum(t.confidence for t in cluster) / len(cluster)
        candidates.append(CandidateNode(
            id=_next_id(i),
            label=label,
            x=round(cx, 2),
            y=round(cy, 2),
            confidence=round(conf, 3),
            source='ocr',
        ))
    return candidates

def _is_location_label(text: str) -> bool:
    """Heuristic: at least 2 chars, contains a letter, not a scale bar number."""
    return len(text) >= 2 and any(c.isalpha() for c in text)

def _next_id(i: int) -> str:
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    return letters[i] if i < 26 else letters[i // 26 - 1] + letters[i % 26]
```

---

## 2. Graph Extraction (Hand-Drawn Sketches)

### 2.1 Node detection (blob + contour)

```python
# apps/api/services/ocr/graph_extractor.py

def detect_nodes(img: np.ndarray) -> list[CandidateNode]:
    """
    Detect hand-drawn circles/nodes using contour detection.
    Returns candidate nodes with pixel-normalized coordinates.
    """
    h, w = img.shape[:2]

    # Invert binary image (nodes are dark on light background)
    inv = cv2.bitwise_not(img)

    # Find contours
    contours, _ = cv2.findContours(inv, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    candidates = []
    for i, cnt in enumerate(contours):
        area = cv2.contourArea(cnt)
        if area < 200 or area > 8000:  # filter noise and large regions
            continue

        # Circularity check: 4π × area / perimeter²
        perimeter = cv2.arcLength(cnt, True)
        if perimeter == 0:
            continue
        circularity = 4 * np.pi * area / (perimeter ** 2)
        if circularity < 0.5:  # skip non-circular contours (likely edges/lines)
            continue

        M = cv2.moments(cnt)
        if M['m00'] == 0:
            continue
        cx = M['m10'] / M['m00']
        cy = M['m01'] / M['m00']

        candidates.append(CandidateNode(
            id=_next_id(i),
            label='',           # label filled in by OCR pass over nearby text
            x=round(cx / w * 100, 2),
            y=round(cy / h * 100, 2),
            confidence=round(min(circularity, 1.0), 3),
            source='graph_extraction',
        ))
    return candidates
```

### 2.2 Edge detection (line segments)

```python
def detect_edges(img: np.ndarray, nodes: list[CandidateNode],
                 img_w: int, img_h: int) -> list[tuple[str, str]]:
    """
    Detect hand-drawn lines between nodes using Hough line transform.
    Returns list of (sourceNodeId, targetNodeId) pairs.
    """
    lines = cv2.HoughLinesP(
        cv2.bitwise_not(img), 1, np.pi / 180,
        threshold=50, minLineLength=30, maxLineGap=15
    )
    if lines is None:
        return []

    edges = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        # Normalize line endpoints
        p1 = (x1 / img_w * 100, y1 / img_h * 100)
        p2 = (x2 / img_w * 100, y2 / img_h * 100)
        # Find nearest nodes to each endpoint
        src = _nearest_node(p1, nodes)
        tgt = _nearest_node(p2, nodes)
        if src and tgt and src.id != tgt.id:
            pair = tuple(sorted([src.id, tgt.id]))
            if pair not in edges:
                edges.append(pair)
    return edges

def _nearest_node(point: tuple, nodes: list[CandidateNode],
                  threshold_pct: float = 8.0) -> CandidateNode | None:
    """Returns nearest node within threshold_pct of image size."""
    best, best_dist = None, float('inf')
    for node in nodes:
        dist = ((node.x - point[0])**2 + (node.y - point[1])**2) ** 0.5
        if dist < threshold_pct and dist < best_dist:
            best, best_dist = node, dist
    return best
```

### 2.3 VLM fallback (Qwen3-VL-2B)

When both Tesseract and OpenCV produce low-confidence results, the image is passed
to the locally-running Qwen3-VL-2B model with a structured prompt:

```python
# apps/api/services/ocr/vlm_extractor.py

VLM_PROMPT = """
You are a routing problem extractor. Given the image, identify all city or location nodes
visible in the diagram. For each node, extract:
- id: a single letter or short code
- label: the full name or label text
- x: approximate horizontal position (0 = left edge, 100 = right edge)
- y: approximate vertical position (0 = top, 100 = bottom)
- confidence: your confidence in this detection (0.0 to 1.0)

Return ONLY a JSON array of node objects. No explanation, no markdown.
Example: [{"id":"A","label":"Warehouse A","x":22.0,"y":30.0,"confidence":0.9}]
"""

async def extract_with_vlm(image_bytes: bytes) -> list[CandidateNode]:
    """
    Calls locally-running Qwen3-VL-2B via Flask backend (thesis model).
    Falls back to Google Vision API if VLM unavailable or confidence still low.
    """
    import httpx, json, base64

    b64 = base64.b64encode(image_bytes).decode()
    payload = {
        "image": b64,
        "prompt": VLM_PROMPT,
        "max_tokens": 512,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "http://localhost:5000/vlm/extract",   # thesis Flask backend
                json=payload
            )
            resp.raise_for_status()
            raw = resp.json()["text"].strip()
            nodes_data = json.loads(raw)
            return [
                CandidateNode(
                    id=n["id"], label=n["label"],
                    x=float(n["x"]), y=float(n["y"]),
                    confidence=float(n.get("confidence", 0.7)),
                    source="vlm"
                )
                for n in nodes_data
            ]
    except Exception:
        return []   # caller decides whether to try cloud API
```

### 2.4 Pipeline orchestrator

```python
# apps/api/services/ocr/pipeline.py

async def extract_candidates(image_bytes: bytes) -> dict:
    """
    Full extraction pipeline. Returns candidate list + metadata.
    """
    # Preprocess
    img = preprocess(image_bytes)
    h, w = img.shape[:2]

    # Classify
    image_type, type_conf = classify_image(img)

    candidates: list[CandidateNode] = []
    edges: list[tuple[str, str]] = []

    if image_type == ImageType.SKETCH:
        # Graph extraction path
        candidates = detect_nodes(img)
        # Label candidates with nearby OCR text
        ocr_tokens = extract_text(img, image_bytes)
        candidates = _assign_labels_from_ocr(candidates, ocr_tokens)
        edges = detect_edges(img, candidates, w, h)

    else:
        # OCR path (MAP or TABLE)
        ocr_tokens = extract_text(img, image_bytes)
        candidates = parse_candidates(ocr_tokens)

    # Check overall confidence
    avg_conf = sum(c.confidence for c in candidates) / max(len(candidates), 1)

    if avg_conf < 0.55 or len(candidates) < 2:
        # VLM fallback
        vlm_candidates = await extract_with_vlm(image_bytes)
        if vlm_candidates:
            candidates = vlm_candidates

    return {
        "imageType": image_type,
        "candidates": [c.__dict__ for c in candidates],
        "edgeHints": [list(e) for e in edges],
        "avgConfidence": round(avg_conf, 3),
        "requiresReview": any(c.confidence < 0.70 for c in candidates),
    }
```

---

## 3. User Validation Step

### 3.1 API endpoint

**`POST /api/problems/image-extract`**

```json
// Request (multipart form)
{
  "file": <binary image>,
  "objective": "min_distance",
  "returnToStart": true
}

// Response
{
  "extractionId": "uuid",
  "imageType": "map",
  "avgConfidence": 0.81,
  "requiresReview": true,
  "candidates": [
    {"id": "A", "label": "Warehouse A", "x": 22.0, "y": 30.0, "confidence": 0.97, "source": "ocr"},
    {"id": "B", "label": "Port B",      "x": 48.0, "y": 20.0, "confidence": 0.94, "source": "ocr"},
    {"id": "C", "label": "Depot C",     "x": 72.0, "y": 28.0, "confidence": 0.71, "source": "ocr"},
    {"id": "F", "label": "",            "x": 15.0, "y": 72.0, "confidence": 0.43, "source": "ocr"}
  ],
  "edgeHints": [["A","B"],["B","C"]],
  "imageUrl": "/uploads/abc123.jpg"
}
```

**`POST /api/problems/image-confirm`**

```json
// Request — user's corrected node list
{
  "extractionId": "uuid",
  "confirmedNodes": [
    {"id": "A", "label": "Warehouse A", "x": 22.0, "y": 30.0},
    {"id": "B", "label": "Port B",      "x": 48.0, "y": 20.0},
    {"id": "C", "label": "Depot C",     "x": 72.0, "y": 28.0},
    {"id": "F", "label": "Depot F",     "x": 15.0, "y": 72.0}
  ],
  "objective": "min_distance",
  "returnToStart": true
}

// Response — normalized problem (same as other input modes)
{
  "ok": true,
  "normalizedProblem": { /* canonical schema with inputSources: ["image"] */ },
  "warnings": [],
  "errors": []
}
```

### 3.2 Validation UI (frontend)

The `ImageValidationPanel` component renders after `POST /api/problems/image-extract` returns.

**Layout:**
- Uploaded image fills the left panel as a background
- Detected nodes overlaid as draggable circles on the image
- Right sidebar shows the node list with confidence badges
- Bottom edit panel shows properties for the selected node
- Warning strip at bottom flags any nodes below 50% confidence

**Confidence color coding:**

| Confidence | Color | Badge | Action required |
|---|---|---|---|
| ≥ 80% | Green | "97%" | Auto-accepted, user can still edit |
| 50–79% | Amber | "71%" | Flagged for review, user should confirm |
| < 50% | Red | "43%" | Blocked — user MUST enter label before confirming |

**Interaction rules:**
- Drag a node dot → repositions it on the image, updates x/y in sidebar
- Click a node in list → selects it, opens edit panel
- Edit ID or label inline → updates immediately
- Delete button → removes node from candidate list
- "Add node" button → enters add mode (click image to place new node)
- "Confirm all" button → disabled if any red-badge nodes have empty labels
- On confirm → calls `POST /api/problems/image-confirm` with corrected list

### 3.3 Frontend component structure

```typescript
// apps/web/components/canvas/ImageValidationPanel.tsx

interface ImageValidationPanelProps {
  extractionResult: ImageExtractionResponse;
  onConfirm: (confirmedNodes: ConfirmedNode[]) => void;
}

// Internal state:
// - candidates: CandidateNode[]   (starts from API response, user edits)
// - selectedId: string | null
// - dragState: { nodeId, startX, startY } | null

// Key sub-components:
// - ImageCanvas: renders image + draggable node overlays (uses react-konva Stage)
// - NodeListSidebar: scrollable list with confidence badges
// - NodeEditPanel: inline edit for id, label, x, y
// - ConfidenceWarningStrip: shows count of nodes needing review
```

---

## 4. Validation Rules (image input)

| Condition | Behaviour |
|---|---|
| No candidates detected | Error: "No nodes could be detected. Try the text or table input instead, or draw nodes manually." |
| Avg confidence < 40% | Warning + offer VLM retry or switch to manual input |
| Any node label empty + confidence < 50% | Confirm button disabled with message: "Label required for low-confidence nodes (shown in red)." |
| Fewer than 3 confirmed nodes | Error: "At least 3 cities are required to define a routing problem." |
| Duplicate node IDs after user edit | Error: "Node ID 'X' already exists." |
| Node dragged outside image bounds | Snap to nearest valid position, no error |

---

## 5. DB and storage

### Image storage

Uploaded images are stored via the `StorageBackend` abstraction from Phase 006:

```python
# Storage key pattern
storage_key = f"uploads/{user_id}/{extraction_id}.jpg"
```

The `uploads` table (from Phase 006 schema) tracks:
- `storage_key` — path in object storage
- `mime_type` — image/jpeg, image/png, application/pdf
- `metadata_json` — `{"extractionId": "uuid", "imageType": "map", "candidateCount": 7}`

### Normalized problem — image source tracking

When a problem is confirmed from image input, the canonical schema reflects:

```json
{
  "inputSources": ["image"],
  "metadata": {
    "sourceImageRef": "uploads/user123/abc123.jpg",
    "extractionId": "uuid",
    "imageType": "map",
    "avgOcrConfidence": 0.81,
    "edgeHints": [["A","B"],["B","C"]]
  }
}
```

---

## 6. Phase placement

This feature is delivered as **Phase 006B** — after SaaS hardening — because it depends on:
- The `uploads` table and `StorageBackend` (Phase 006)
- The authentication system (Phase 006) — image uploads are user-owned
- The normalized problem pipeline (Phase 002) — confirmation calls the same normalizer

| Deliverable | Phase |
|---|---|
| Image upload placeholder (accept file, return stub) | Phase 002 |
| Full OCR pipeline (Tesseract + EasyOCR + OpenCV) | Phase 006B |
| VLM fallback integration (Qwen3-VL-2B) | Phase 006B |
| ImageValidationPanel frontend component | Phase 006B |
| `POST /api/problems/image-extract` | Phase 006B |
| `POST /api/problems/image-confirm` | Phase 006B |
| Google Vision API cloud fallback (optional) | Phase 007 / post-MVP |

---

## 7. Dependencies

```
# Python (add to requirements)
pytesseract==0.3.10
easyocr==1.7.1
opencv-python-headless==4.9.0.80
pillow==10.3.0
httpx==0.27.0        # for async VLM calls

# System (in Dockerfile)
RUN apt-get install -y tesseract-ocr tesseract-ocr-eng
```

---

## 8. Privacy notes

- Images never leave the server unless the user explicitly enables the Google Vision fallback
- The Qwen3-VL-2B model runs locally — no external API calls
- Extracted candidates are ephemeral until the user confirms — not persisted to DB until `POST /api/problems/image-confirm`
- Image files are stored under the authenticated user's namespace only

---

*SmartRoute AI — OCR & Image Extraction Specification*
*Part of the SmartRoute AI Spec Kit implementation plan*
