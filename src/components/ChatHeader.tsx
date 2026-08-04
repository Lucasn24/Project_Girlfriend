import {
  CaretLeftIcon,
  DotsThreeVerticalIcon,
  GlobeHemisphereWestIcon,
} from "@phosphor-icons/react";
import { Avatar } from "./Avatar";
import { ThemeToggle } from "./ThemeToggle";
import { partnerName } from "../data/thread";

export function ChatHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          aria-label="Go back"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-muted transition-colors duration-200 hover:bg-surface-alt hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <CaretLeftIcon size={20} />
        </button>

        <Avatar initial="M" aiActive />

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-semibold leading-tight text-fg">
            {partnerName}
          </h1>
          <p className="flex items-center gap-1.5 truncate text-xs text-secondary">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary"
              aria-hidden="true"
            />
            AI companion active
          </p>
        </div>

        <div
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 py-1.5 text-xs font-medium text-fg-muted sm:flex"
          title="Distance and time difference"
        >
          <GlobeHemisphereWestIcon size={14} className="text-accent" />
          10,850 km · 14h ahead
        </div>

        <ThemeToggle />

        <button
          type="button"
          aria-label="More options"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-muted transition-colors duration-200 hover:bg-surface-alt hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <DotsThreeVerticalIcon size={20} weight="bold" />
        </button>
      </div>
    </header>
  );
}
