import { SparkleIcon } from "@phosphor-icons/react";
import styles from "./Avatar.module.css";

interface AvatarProps {
  initial: string;
  size?: number;
  aiActive?: boolean;
}

export function Avatar({ initial, size = 44, aiActive = false }: AvatarProps) {
  return (
    <div className={styles.wrapper} style={{ width: size, height: size }}>
      <div
        className={styles.circle}
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
        }}
        aria-hidden="true"
      >
        {initial}
      </div>
      {aiActive && (
        <span className={styles.badge} title="AI companion active">
          <SparkleIcon size={10} weight="fill" />
        </span>
      )}
    </div>
  );
}
