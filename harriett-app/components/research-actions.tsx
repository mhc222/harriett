"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChartNoAxesCombined, Check, Database, FileText, LoaderCircle } from "lucide-react";

export function ResearchActions({
  researchId,
  hasSellerBrief,
  hasCmaDraft,
  portalStatus,
}: {
  researchId: string;
  hasSellerBrief: boolean;
  hasCmaDraft: boolean;
  portalStatus: "running" | "completed" | "failed" | null;
}) {
  const router = useRouter();
  const [working, setWorking] = useState<"brief" | "cma" | "portal" | null>(null);
  const [briefCreated, setBriefCreated] = useState(hasSellerBrief);
  const [cmaCreated, setCmaCreated] = useState(hasCmaDraft);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (portalStatus !== "running") return;
    const timer = window.setInterval(() => router.refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, [portalStatus, router]);

  async function createBrief() {
    setWorking("brief");
    setError(null);
    try {
      const response = await fetch(`/api/research/${researchId}/seller-brief`, { method: "POST" });
      const result = (await response.json()) as { artifactId?: string; error?: string };
      if (!response.ok || !result.artifactId) {
        throw new Error(result.error ?? "The seller brief could not be created.");
      }
      setBriefCreated(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The seller brief could not be created.");
    } finally {
      setWorking(null);
    }
  }

  async function createCma() {
    setWorking("cma");
    setError(null);
    try {
      const response = await fetch(`/api/research/${researchId}/cma-draft`, { method: "POST" });
      const result = (await response.json()) as { artifactId?: string; error?: string };
      if (!response.ok || !result.artifactId) {
        throw new Error(result.error ?? "The CMA expert prep could not be created.");
      }
      setCmaCreated(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The CMA expert prep could not be created.");
    } finally {
      setWorking(null);
    }
  }

  async function enrichPortalData() {
    setWorking("portal");
    setError(null);
    try {
      const response = await fetch(`/api/research/${researchId}/bright-data`, { method: "POST" });
      const result = (await response.json()) as { researchId?: string; error?: string };
      if (!response.ok || !result.researchId) {
        throw new Error(result.error ?? "Portal enrichment could not be started.");
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Portal enrichment could not be started.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="research-actions">
      <button
        type="button"
        className="secondary-button"
        disabled={working !== null || portalStatus === "running" || portalStatus === "completed"}
        onClick={enrichPortalData}
      >
        {working === "portal" || portalStatus === "running"
          ? <LoaderCircle className="animate-spin" size={17} />
          : portalStatus === "completed"
            ? <Check size={17} />
            : <Database size={17} />}
        {working === "portal" || portalStatus === "running"
          ? "Portal enrichment running..."
          : portalStatus === "completed"
            ? "Portal data included"
            : portalStatus === "failed"
              ? "Retry portal enrichment"
              : "Add portal-observed comps"}
      </button>
      <button
        type="button"
        className={cmaCreated ? "secondary-button" : "primary-button"}
        disabled={working !== null || cmaCreated}
        onClick={createCma}
      >
        {working === "cma" ? <LoaderCircle className="animate-spin" size={17} /> : cmaCreated ? <Check size={17} /> : <ChartNoAxesCombined size={17} />}
        {working === "cma" ? "Building CMA prep..." : cmaCreated ? "CMA prep saved" : "Save CMA expert prep"}
      </button>
      <button
        type="button"
        className="secondary-button"
        disabled={working !== null || briefCreated}
        onClick={createBrief}
      >
        {working === "brief" ? <LoaderCircle className="animate-spin" size={17} /> : briefCreated ? <Check size={17} /> : <FileText size={17} />}
        {working === "brief" ? "Creating brief..." : briefCreated ? "Seller brief created" : "Create seller brief"}
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
