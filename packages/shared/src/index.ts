export interface HealthResponse {
  status: "ok";
  db: "connected";
  version: string;
}

export interface PingResponse {
  status: "ok";
  message: "pong";
}

