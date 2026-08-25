import { describe, expect, it } from "vitest";
import {
  cleanArecMarkdown,
  describeArecDocument,
  extractMarkdownLinks,
  normalizeArecUrl,
} from "../scripts/knowledge/ingest-arec-corpus.mjs";

describe("AREC corpus ingestion", () => {
  it("preserves LawSectionID while rejecting unrelated URLs", () => {
    expect(
      normalizeArecUrl(
        "https://arec.alabama.gov/pages/laws/ViewLaw.aspx?LawSectionID=92&AspxAutoDetectCookieSupport=1"
      )
    ).toBe(
      "https://arec.alabama.gov/pages/laws/ViewLaw.aspx?AspxAutoDetectCookieSupport=1&LawSectionID=92"
    );
    expect(normalizeArecUrl("https://arec.alabama.gov/pages/about/staff.aspx")).toBeNull();
    expect(normalizeArecUrl("https://example.com/docs/rule.pdf")).toBeNull();
  });

  it("discovers relative PDF links with their labels", () => {
    const links = extractMarkdownLinks(
      "[NEW RECAD Form](../../docs/forms/recad.pdf)",
      "https://arec.alabama.gov/pages/laws/StatutoryChanges.aspx"
    );
    expect(links).toEqual([
      {
        label: "NEW RECAD Form",
        url: "https://arec.alabama.gov/docs/forms/recad.pdf",
      },
    ]);
  });

  it("normalizes a rule as an exact, review-gated legal record", () => {
    const markdown = `# License Laws/Rules

Category: CHAPTER 790-X-3
Rule 790-X-3-.16. Advertising Teams
The team's name must include the word team or group.

### About Us
Publisher boilerplate`;
    const document = describeArecDocument({
      url: "https://arec.alabama.gov/pages/laws/ViewLaw.aspx?AspxAutoDetectCookieSupport=1&LawSectionID=172",
      markdown,
      publishCurrent: false,
    });
    expect(document).toMatchObject({
      id: "arec-790-x-3-16",
      kind: "regulation",
      authority: 98,
      status: "review",
      metadata: {
        document_type: "rule",
        citation: "790-X-3-.16",
        category: "CHAPTER 790-X-3",
        lifecycle: "current",
        review_on_change: true,
      },
    });
    expect(document.content).not.toContain("Publisher boilerplate");
  });

  it("never auto-publishes proposed material", () => {
    const document = describeArecDocument({
      url: "https://arec.alabama.gov/docs/proposed-rule.pdf",
      label: "Proposed Rule Amendment 790-X-3-.13",
      markdown: "# Proposed Rule Amendment\nEffective February 14, 2027",
      publishCurrent: true,
    });
    expect(document.status).toBe("review");
    expect(document.effective_from).toBe("2027-02-14");
    expect(document.metadata.lifecycle).toBe("pending");
  });

  it("labels appendix guidance without mistaking an embedded rule citation for its identity", () => {
    const document = describeArecDocument({
      url: "https://arec.alabama.gov/pages/laws/ViewLaw.aspx?LawSectionID=105",
      markdown:
        "Category: APPENDIX\n\nA-1. Receipt of Funds Policy Revision\n\nAuthority text\nRule 790-X-1-.01(2) is incorporated by reference.\n\nAbout Us\nFooter",
      publishCurrent: true,
    });
    expect(document).toMatchObject({
      id: "arec-a-1",
      title: "AREC A-1 Receipt of Funds Policy Revision",
      kind: "procedure",
      authority: 94,
      status: "published",
      metadata: { document_type: "appendix", citation: "A-1" },
    });
  });

  it("removes AREC navigation and footer content", () => {
    expect(cleanArecMarkdown("Header\n# Statutory Changes\nBody\n### Get in Touch\nPhone")).toBe(
      "# Statutory Changes\nBody"
    );
  });
});
