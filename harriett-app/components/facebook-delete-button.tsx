"use client";

interface FacebookDeleteButtonProps {
  artifactId: string;
  pageName: string;
  deleting: boolean;
}

export function FacebookDeleteButton({ artifactId, pageName, deleting }: FacebookDeleteButtonProps) {
  return (
    <form
      action="/api/social/facebook/delete"
      method="post"
      onSubmit={(event) => {
        if (!window.confirm(`Delete this post from ${pageName}? This permanently removes it from Facebook.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="artifactId" value={artifactId} />
      <button type="submit" className="destructive-button" disabled={deleting}>
        {deleting ? "Deleting from Facebook..." : "Delete from Facebook"}
      </button>
    </form>
  );
}
