import { SparkleIcon } from "@phosphor-icons/react";

interface AvatarProps {
  initial: string;
  size?: number;
  aiActive?: boolean;
}

export function Avatar({ initial, size = 44, aiActive = false }: AvatarProps) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full font-display text-lg font-medium text-white"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
        }}
        aria-hidden="true"
      >
        {initial}
      </div>
      {aiActive && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-surface bg-secondary text-white"
          title="AI companion active"
        >
          <SparkleIcon size={10} weight="fill" />
        </span>
      )}
    </div>
  );
}
