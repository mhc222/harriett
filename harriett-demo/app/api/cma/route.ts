import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/app/lib/claude";

export const maxDuration = 60;
import { CMA_SYSTEM } from "@/app/lib/prompts";
import type { CmaInput, CmaAnalysis } from "@/app/lib/types";

export async function POST(req: NextRequest) {
  try {
    const input: CmaInput = await req.json();

    const subjectPpsf = Math.round(input.subjectSqft > 0
      ? (input.subjectSqft * 150) / input.subjectSqft
      : 0);

    const compsText = input.comps.map((c, i) => {
      const ppsf = Math.round(c.salePrice / c.sqft);
      return `Comp ${i + 1}: ${c.address}, ${c.city}
  Sale Price: $${c.salePrice.toLocaleString()} | ${c.beds}bd/${c.baths}ba | ${c.sqft} sqft | $${ppsf}/sqft
  Sold: ${c.saleDate}${c.yearBuilt ? ` | Built ${c.yearBuilt}` : ""}
  Notes: ${c.notes || "None"}`;
    }).join("\n\n");

    const prompt = `Subject Property:
Address: ${input.subjectAddress}, ${input.subjectCity}
Size: ${input.subjectBeds}bd/${input.subjectBaths}ba | ${input.subjectSqft} sqft${input.subjectYearBuilt ? ` | Built ${input.subjectYearBuilt}` : ""}
Notes: ${input.subjectNotes || "None"}
Seller: ${input.sellerNames.join(", ")}
Agent: ${input.agentName}, Pritchett-Moore Real Estate

Comparable Sales:
${compsText}

Analyze these comps and produce the CMA JSON.`;

    const raw = await callClaude(CMA_SYSTEM, prompt, 3000);
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const analysis: CmaAnalysis = JSON.parse(cleaned);
    return NextResponse.json(analysis);
  } catch (e) {
    console.error("CMA error:", e);
    return NextResponse.json({ error: "Failed to generate CMA" }, { status: 500 });
  }
}
