import { notFound } from "next/navigation";
import { getRun } from "@/lib/runs";
import { ScenarioWorkspace } from "./ScenarioWorkspace";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const run = await getRun(runId);
  if (!run) return notFound();

  return <ScenarioWorkspace run={run} />;
}
