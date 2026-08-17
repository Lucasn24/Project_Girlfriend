import { useState } from "react";
import type { PhotoTimelineEntry } from "../../types";
import { Polaroid } from "./Polaroid";
import styles from "./PolaroidStack.module.css";

interface PolaroidStackProps {
  members: PhotoTimelineEntry[];
  x: number;
  side: "above" | "below";
  onOpen: (photo: PhotoTimelineEntry) => void;
}

export function PolaroidStack({ members, x, side, onOpen }: PolaroidStackProps) {
  const [fanned, setFanned] = useState(false);
  const front = members[0];
  const peeks = members.slice(1);

  const handleFrontClick = () => {
    if (members.length === 1) {
      onOpen(front);
    } else {
      setFanned((prev) => !prev);
    }
  };

  return (
    <div
      className={`${styles.stack} ${side === "above" ? styles.stackAbove : styles.stackBelow}`}
      style={{ left: `${x}px` }}
    >
      {peeks.map((member, i) => {
        const depth = i + 1;
        return (
          <div
            key={member.id}
            className={styles.peekLayer}
            style={{
              zIndex: depth,
              transform: `translate(${depth * 4}px, ${(side === "above" ? -1 : 1) * depth * 4}px)`,
            }}
          >
            <Polaroid photo={member} clipSide={side} peek />
          </div>
        );
      })}

      <div className={styles.frontLayer} style={{ zIndex: peeks.length + 1 }}>
        <Polaroid photo={front} clipSide={side} onClick={handleFrontClick} badge={peeks.length || undefined} />
      </div>

      {fanned && peeks.length > 0 && (
        <div className={`${styles.fanPopover} ${side === "above" ? styles.fanAbove : styles.fanBelow}`}>
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              className={styles.fanItem}
              onClick={() => {
                setFanned(false);
                onOpen(member);
              }}
            >
              <Polaroid photo={member} clipSide={side} compact />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
