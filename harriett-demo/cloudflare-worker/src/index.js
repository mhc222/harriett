import PostalMime from "postal-mime";

async function streamToArrayBuffer(stream, streamSize) {
  const result = new Uint8Array(streamSize);
  let bytesRead = 0;
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result.set(value, bytesRead);
    bytesRead += value.length;
  }
  return result;
}

async function notifyVercel(env, payload) {
  await fetch("https://harriett-demo.vercel.app/api/webhook/inbound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export default {
  async email(message, env) {
    try {
    const rawEmail = await streamToArrayBuffer(message.raw, message.rawSize);
    const parser = new PostalMime();
    const email = await parser.parse(rawEmail);

    const from = message.from;
    const fromName = email.from?.name || from.split("@")[0];
    const subject = email.subject || "";

    console.log("[email-worker] attachments:", JSON.stringify(
      (email.attachments || []).map(a => ({ mimeType: a.mimeType, filename: a.filename, size: a.content?.byteLength }))
    ));

    const pdfAttachment = email.attachments?.find(
      (a) =>
        a.mimeType === "application/pdf" ||
        a.mimeType === "application/octet-stream" ||
        a.filename?.toLowerCase().endsWith(".pdf")
    );

    if (!pdfAttachment) {
      console.log("[email-worker] no PDF found, notifying Vercel hasPdf:false");
      await notifyVercel(env, { from, fromName, subject, hasPdf: false });
      return;
    }

    // Upload PDF to Supabase storage
    const storagePath = `uploads/${Date.now()}-inbound.pdf`;

    const uploadRes = await fetch(
      `${env.SUPABASE_URL}/storage/v1/object/pdf-uploads/${storagePath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/pdf",
          "x-upsert": "true",
        },
        body: pdfAttachment.content,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error("[email-worker] Supabase upload failed:", err);
      await notifyVercel(env, { from, fromName, subject, hasPdf: false });
      return;
    }

    // Notify Vercel with path only — no large payload
    await notifyVercel(env, {
      from,
      fromName,
      subject,
      storagePath,
      pdfName: pdfAttachment.filename || "document.pdf",
    });
    } catch (err) {
      console.error("[harriett-email-worker] fatal:", err?.message ?? err);
    }
  },
};
