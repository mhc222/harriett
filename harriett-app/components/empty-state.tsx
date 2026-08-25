import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <div className="quiet-state">
      <Icon size={22} aria-hidden="true" />
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p>{detail}</p>
      </div>
    </div>
  );
}
