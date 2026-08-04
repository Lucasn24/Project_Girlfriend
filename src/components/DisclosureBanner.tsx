import { BellRingingIcon, MoonStarsIcon } from "@phosphor-icons/react";
import { partnerName } from "../data/thread";

export function DisclosureBanner() {
  return (
    <div className="border-b border-border bg-surface-alt px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
          <MoonStarsIcon size={16} weight="fill" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-fg">
            <span className="font-semibold">{partnerName} is asleep in Tokyo.</span>{" "}
            Her AI companion is replying in her voice until 7:00 AM her time.
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              className="cursor-pointer text-xs font-semibold text-secondary underline decoration-secondary/40 underline-offset-2 transition-colors duration-200 hover:text-secondary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              How this works
            </button>
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary transition-colors duration-200 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <BellRingingIcon size={13} weight="bold" />
              Nudge {partnerName} instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
