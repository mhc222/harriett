"use client";

interface FacebookDiscardButtonProps {
  artifactId: string;
}

export function FacebookDiscardButton({ artifactId }: FacebookDiscardButtonProps) {
  return (
    <form
      action="/api/social/facebook/drafts/delete"
      method="post"
      onSubmit={(event) => {
        if (!window.confirm("Delete this draft from Harriett? It was not published to Facebook.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="artifactId" value={artifactId} />
      <button type="submit" className="destructive-button">Delete draft</button>
    </form>
  );
}
