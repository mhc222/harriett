export type MemoryMode = "disabled" | "shadow" | "governed";

export function memoryMode(): MemoryMode {
  const configured = process.env.MEMORY_MODE;
  if (configured === "disabled" || configured === "shadow" || configured === "governed") {
    return configured;
  }
  return "shadow";
}

export function shouldActivateCandidate(opts: {
  mode: MemoryMode;
  sensitivity: "ordinary" | "sensitive" | "consequential";
  explicit: boolean;
  confidence: number;
}): boolean {
  return (
    opts.mode === "governed" &&
    opts.sensitivity === "ordinary" &&
    opts.explicit &&
    opts.confidence >= 0.9
  );
}
