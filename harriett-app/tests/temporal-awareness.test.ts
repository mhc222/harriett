import { describe, expect, it } from "vitest";
import { renderTemporalContext, requiresFirstStepTool } from "@/lib/ai/runtime";

describe("agent temporal awareness", () => {
  it("renders the current local date and resolves tomorrow", () => {
    const context = renderTemporalContext(
      new Date("2026-08-25T16:20:00.000Z"),
      "America/Chicago"
    );

    expect(context).toContain("Tuesday, August 25, 2026 at 11:20 AM CDT");
    expect(context).toContain("Tomorrow is Wednesday, August 26, 2026");
    expect(context).toContain("Never ask the agent for today's date");
    expect(context).toContain("America/New_York");
  });

  it("requires live tools for provider-backed requests", () => {
    expect(requiresFirstStepTool("calendar")).toBe(true);
    expect(requiresFirstStepTool("contact")).toBe(true);
    expect(requiresFirstStepTool("email")).toBe(true);
    expect(requiresFirstStepTool("history")).toBe(true);
    expect(requiresFirstStepTool("task")).toBe(true);
    expect(requiresFirstStepTool("approval")).toBe(true);
    expect(requiresFirstStepTool("writing")).toBe(false);
  });
});
