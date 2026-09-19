import type { JevAnswer, JevClient, JevRequest } from "./client";

interface ProxyResponse {
  answers: JevAnswer[];
  upstream_model_id?: string;
}

// Posts batched questions to our Cloudflare Worker (worker/src/index.ts),
// which holds the JEV_API_KEY secret and enforces the shared rate limit.
export class WorkerJevClient implements JevClient {
  constructor(private readonly workerUrl: string) {}

  async ask(req: JevRequest): Promise<JevAnswer[]> {
    const url = this.workerUrl.replace(/\/$/, "") + "/jev";
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`worker jev ${res.status}: ${detail.slice(0, 300)}`);
    }
    const body = (await res.json()) as ProxyResponse;
    if (body.upstream_model_id) {
      // Log once per response so we can prove the model version is pinned.
      // eslint-disable-next-line no-console
      console.debug(`[jev] upstream_model_id=${body.upstream_model_id}`);
    }
    return body.answers ?? [];
  }
}
