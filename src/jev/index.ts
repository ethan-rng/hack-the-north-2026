import { MockJevClient } from "./mock";
import { WorkerJevClient } from "./worker";
import type { JevClient } from "./client";

// Mock unless USE_MOCK_JEV=false AND JEV_WORKER_URL is set. Real Jev lives
// behind the Cloudflare Worker in worker/ — Next.js never sees the API key.
let cached: JevClient | undefined;
export function getJevClient(): JevClient {
  if (cached) return cached;
  const useMock = process.env.USE_MOCK_JEV !== "false";
  const workerUrl = process.env.JEV_WORKER_URL;
  if (useMock || !workerUrl) {
    cached = new MockJevClient();
    return cached;
  }
  cached = new WorkerJevClient(workerUrl);
  return cached;
}
