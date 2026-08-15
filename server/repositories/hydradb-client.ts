import type { AppConfig } from "../config.js";

type HydraValue = { type: string; value?: unknown };
type HydraResponse = { columns: string[]; rows: HydraValue[][]; bookmark?: string };

export class HydraDbClient {
  constructor(private readonly config: AppConfig) {}

  async query(query: string, parameters: Record<string, unknown> = {}) {
    const response = await fetch(`${this.config.HYDRADB_HTTP_URL}/v1/graphs/${encodeURIComponent(this.config.HYDRADB_GRAPH_ID)}/query`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.HYDRADB_AUTH_TOKEN}`,
        "content-type": "application/json",
        "x-graph-namespace": this.config.HYDRADB_NAMESPACE,
      },
      body: JSON.stringify({
        cell_id: this.config.HYDRADB_CELL_ID,
        query,
        parameters,
        consistency: this.config.HYDRADB_CONSISTENCY,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HydraDB query failed (${response.status}): ${await response.text()}`);
    const data = await response.json() as HydraResponse;
    return data.rows.map((row) => Object.fromEntries(data.columns.map((column, index) => [column, decodeValue(row[index])]))) as Array<Record<string, unknown>>;
  }

  async health() {
    const response = await fetch(`${this.config.HYDRADB_HTTP_URL}/healthz`, { signal: AbortSignal.timeout(3_000) });
    if (!response.ok) throw new Error(`HydraDB health check failed (${response.status})`);
  }
}

function decodeValue(value?: HydraValue): unknown {
  if (!value || value.type === "null") return null;
  if (value.type === "list" && Array.isArray(value.value)) return value.value.map((item) => decodeValue(item as HydraValue));
  return value.value;
}
