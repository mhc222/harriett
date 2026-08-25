import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DocumentProcessingStatus } from "@/components/document-processing-status";
import { createUserClient } from "@/lib/db/server";

export default async function DocumentReviewProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createUserClient();
  const { data: document } = await db
    .from("documents")
    .select("id, deal_id, filename, parse_status")
    .eq("id", id)
    .single();
  if (!document) notFound();
  if (document.deal_id) redirect(`/deals/${document.deal_id}`);

  return (
    <div className="page-stack transaction-progress-page">
      <Link href="/pipeline" className="text-link inline-flex items-center gap-2"><ArrowLeft size={15} /> Back to pipeline</Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Transaction review</p>
          <h1>{document.filename}</h1>
          <p className="page-intro">You can leave this page. The review continues in the background and the transaction will appear in the pipeline.</p>
        </div>
      </header>
      <DocumentProcessingStatus documentId={document.id} initialStatus={document.parse_status} />
    </div>
  );
}
