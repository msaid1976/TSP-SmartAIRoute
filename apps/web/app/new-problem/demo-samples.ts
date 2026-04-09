import type { ProblemInputType, SerializedCanvasPayload } from "@smartroute/shared";

export interface TextDemoSample {
  id: string;
  title: string;
  summary: string;
  name: string;
  text: string;
}

export interface TableDemoSample {
  id: string;
  title: string;
  summary: string;
  name: string;
  csv: string;
}

export interface MatrixDemoSample {
  id: string;
  title: string;
  summary: string;
  name: string;
  labels: string;
  matrix: string;
}

export interface DrawDemoSample {
  id: string;
  title: string;
  summary: string;
  name: string;
  payload: SerializedCanvasPayload;
}

export interface ImageDemoSample {
  id: string;
  title: string;
  summary: string;
  source: string;
  extractedPreview: string;
}

export const TEXT_DEMO_SAMPLES: TextDemoSample[] = [
  {
    id: "capitals",
    title: "European capitals",
    summary: "A compact four-city route with decimal coordinates.",
    name: "European Capitals Sprint",
    text: "London(51.5,-0.1), Paris(48.8,2.3), Brussels(50.8,4.3), Amsterdam(52.4,4.9)",
  },
  {
    id: "harbors",
    title: "Harbor hops",
    summary: "Short comma-separated input using the Name(x,y) format.",
    name: "Harbor Hopper Demo",
    text: "Singapore(0,0), Klang(3,6), Penang(8,7), Phuket(11,2), Colombo(5,-4)",
  },
  {
    id: "campus",
    title: "Campus landmarks",
    summary: "Mixed spacing and readable labels for a walking route demo.",
    name: "Campus Landmarks Walk",
    text: "Library: 0,0\nEngineeringHall: 2,4\nMainGate: 6,5\nAuditorium: 8,1",
  },
];

export const TABLE_DEMO_SAMPLES: TableDemoSample[] = [
  {
    id: "warehouses",
    title: "Warehouse network",
    summary: "A realistic CSV node list with headers and plain coordinates.",
    name: "Warehouse Network Demo",
    csv: "name,x,y\nWarehouse A,0,0\nPort B,3,5\nDepot C,7,2\nHub D,9,7",
  },
  {
    id: "museums",
    title: "Museum district",
    summary: "Useful for a guided city-route demonstration.",
    name: "Museum District Route",
    csv: "id,x,y\nHistory Museum,12,8\nModern Art,19,13\nScience Center,25,6\nBotanical House,31,15",
  },
  {
    id: "stations",
    title: "Transit stations",
    summary: "Five nodes with larger spacing for a clearer matrix preview.",
    name: "Transit Station Loop",
    csv: "name,x,y\nNorth Station,5,26\nCentral Station,14,16\nEast Station,28,18\nSouth Station,18,4\nWest Station,3,10",
  },
];

export const MATRIX_DEMO_SAMPLES: MatrixDemoSample[] = [
  {
    id: "intercity",
    title: "Intercity road matrix",
    summary: "Symmetric matrix with named nodes for a standard TSP demo.",
    name: "Intercity Matrix Demo",
    labels: "A, B, C, D",
    matrix: "0,12,18,25\n12,0,9,14\n18,9,0,11\n25,14,11,0",
  },
  {
    id: "last-mile",
    title: "Last-mile travel time",
    summary: "Asymmetric matrix to show ATSP classification.",
    name: "Last Mile Time Matrix",
    labels: "Depot, Stop 1, Stop 2, Stop 3",
    matrix: "0,8,11,15\n6,0,5,9\n10,7,0,4\n14,10,6,0",
  },
  {
    id: "coastal",
    title: "Coastal transfer cost",
    summary: "Larger values that read clearly in the distance-matrix endpoint.",
    name: "Coastal Transfer Matrix",
    labels: "Harbor A, Harbor B, Harbor C, Harbor D, Harbor E",
    matrix: "0,45,62,88,97\n45,0,21,51,66\n62,21,0,34,48\n88,51,34,0,19\n97,66,48,19,0",
  },
];

export const DRAW_DEMO_SAMPLES: DrawDemoSample[] = [
  {
    id: "triangle",
    title: "Quick triangle",
    summary: "A minimal graph to teach add, draw, and start in seconds.",
    name: "Triangle Route Demo",
    payload: {
      inputType: "gui",
      payload: {
        nodes: [
          { id: "A", label: "A", x: 18, y: 62 },
          { id: "B", label: "B", x: 48, y: 22 },
          { id: "C", label: "C", x: 78, y: 62 },
        ],
        edges: [
          { sourceId: "A", targetId: "B" },
          { sourceId: "B", targetId: "C" },
          { sourceId: "C", targetId: "A" },
        ],
        startNodeId: "A",
        returnToStart: true,
        objective: "min_distance",
      },
    },
  },
  {
    id: "harbor-loop",
    title: "Harbor loop",
    summary: "A five-node layout that shows chained edge drawing and a start node.",
    name: "Harbor Loop Sketch",
    payload: {
      inputType: "gui",
      payload: {
        nodes: [
          { id: "A", label: "A", x: 14, y: 66 },
          { id: "B", label: "B", x: 34, y: 26 },
          { id: "C", label: "C", x: 58, y: 18 },
          { id: "D", label: "D", x: 80, y: 44 },
          { id: "E", label: "E", x: 64, y: 76 },
        ],
        edges: [
          { sourceId: "A", targetId: "B" },
          { sourceId: "B", targetId: "C" },
          { sourceId: "C", targetId: "D" },
          { sourceId: "D", targetId: "E" },
          { sourceId: "E", targetId: "A" },
        ],
        startNodeId: "B",
        returnToStart: true,
        objective: "min_distance",
      },
    },
  },
  {
    id: "district-grid",
    title: "District grid",
    summary: "A broader layout that makes drag-and-drop adjustment more obvious.",
    name: "District Grid Demo",
    payload: {
      inputType: "gui",
      payload: {
        nodes: [
          { id: "A", label: "A", x: 12, y: 24 },
          { id: "B", label: "B", x: 38, y: 18 },
          { id: "C", label: "C", x: 68, y: 20 },
          { id: "D", label: "D", x: 18, y: 70 },
          { id: "E", label: "E", x: 48, y: 58 },
          { id: "F", label: "F", x: 78, y: 72 },
        ],
        edges: [
          { sourceId: "A", targetId: "B" },
          { sourceId: "B", targetId: "C" },
          { sourceId: "A", targetId: "D" },
          { sourceId: "B", targetId: "E" },
          { sourceId: "C", targetId: "F" },
          { sourceId: "D", targetId: "E" },
          { sourceId: "E", targetId: "F" },
        ],
        startNodeId: "A",
        returnToStart: true,
        objective: "min_distance",
      },
    },
  },
];

export const IMAGE_DEMO_SAMPLES: ImageDemoSample[] = [
  {
    id: "whiteboard",
    title: "Whiteboard route sketch",
    summary: "A photographed whiteboard with circles, labels, and rough distances.",
    source: "team-whiteboard-route.jpg",
    extractedPreview: "A(12,18), B(31,42), C(68,27), D(54,76)",
  },
  {
    id: "worksheet",
    title: "Printed worksheet",
    summary: "A scanned paper exercise with a distance matrix and labeled stops.",
    source: "distance-matrix-worksheet.png",
    extractedPreview: "labels: Depot, Stop 1, Stop 2, Stop 3\n0,8,11,15\n6,0,5,9\n10,7,0,4\n14,10,6,0",
  },
  {
    id: "slide",
    title: "Presentation slide",
    summary: "A route-planning slide with city labels and manually placed coordinates.",
    source: "strategy-deck-route-slide.jpeg",
    extractedPreview: "London(51.5,-0.1), Paris(48.8,2.3), Amsterdam(52.4,4.9), Brussels(50.8,4.3)",
  },
];

export function demoCountByMode(mode: ProblemInputType): number {
  switch (mode) {
    case "text":
      return TEXT_DEMO_SAMPLES.length;
    case "table":
      return TABLE_DEMO_SAMPLES.length;
    case "matrix":
      return MATRIX_DEMO_SAMPLES.length;
    case "gui":
      return DRAW_DEMO_SAMPLES.length;
    case "map":
      return 2;
    case "image":
      return IMAGE_DEMO_SAMPLES.length;
  }
}
