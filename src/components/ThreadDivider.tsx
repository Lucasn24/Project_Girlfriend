import { MoonStarsIcon, SunIcon } from "@phosphor-icons/react";
import type { Divider } from "../types";

export function ThreadDivider({ label, icon }: Divider) {
  return (
    <div
      role="separator"
      className="my-1 flex items-center gap-2.5 px-6 py-1 text-center"
    >
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      <span className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
        {icon === "moon" ? (
          <MoonStarsIcon size={13} className="shrink-0 text-secondary" />
        ) : (
          <SunIcon size={13} className="shrink-0 text-accent" />
        )}
        <span className="max-w-xs">{label}</span>
      </span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}
