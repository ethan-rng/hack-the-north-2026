function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Cloudflare can wrap third-party model output in a completed job result. */
export function normalizeJevResponse(response: Record<string, unknown>): Record<string, unknown> {
  const result = "state" in response
    ? response.state === "Completed" ? response.result : undefined
    : response;
  if (!isRecord(result) || !isRecord(result.answers) || Object.keys(result.answers).length === 0) {
    throw new Error("Jev returned no completed structured answers");
  }
  return result;
}
