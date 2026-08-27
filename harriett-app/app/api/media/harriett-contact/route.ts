import { loadHarriettContactCard } from "@/lib/contact-card";

export const runtime = "nodejs";

export async function GET() {
  try {
    const card = await loadHarriettContactCard();
    return new Response(card, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600",
        "Content-Disposition": 'inline; filename="harriett.vcf"',
        "Content-Type": "text/vcard; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("[harriett-contact-card] unavailable", error);
    return new Response("Contact card unavailable", { status: 503 });
  }
}
