import { useEffect, useRef, useState } from "react";
import { HeartIcon, SparkleIcon, SpinnerGapIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { DashboardCard } from "../components/dashboard/DashboardCard";
import { partnerName } from "../data/thread";
import { useCouplePhoto } from "../hooks/useCouplePhoto";
import styles from "./CouplePhotoPage.module.css";

function formatGeneratedAt(iso: string | null): string {
  if (!iso) return "";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "Generated just now";
  if (minutes < 60) return `Generated ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Generated ${hours}h ago`;
  return `Generated ${Math.round(hours / 24)}d ago`;
}

interface PhotoSlotProps {
  label: string;
  file: File | null;
  fallbackUrl: string | null;
  onChange: (file: File | null) => void;
}

function PhotoSlot({ label, file, fallbackUrl, onChange }: PhotoSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const previewUrl = objectUrl ?? fallbackUrl;

  return (
    <DashboardCard icon={<UploadSimpleIcon size={16} weight="fill" />} title={label}>
      <button type="button" className={styles.slot} onClick={() => inputRef.current?.click()}>
        {previewUrl ? (
          <img src={previewUrl} alt={`${label}'s fit check`} className={styles.slotImage} />
        ) : (
          <span className={styles.slotEmpty}>
            <UploadSimpleIcon size={22} />
            Upload a full-body fit check
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={styles.hiddenInput}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </DashboardCard>
  );
}

export function CouplePhotoPage() {
  const { state, isGenerating, error, generate } = useCouplePhoto();
  const [userFile, setUserFile] = useState<File | null>(null);
  const [partnerFile, setPartnerFile] = useState<File | null>(null);
  const [styleNote, setStyleNote] = useState("");

  const canGenerate = Boolean(userFile && partnerFile) && !isGenerating;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Couple photo</h1>
        <p className={styles.subtitle}>
          Upload a full-body fit check from each of you and generate an AI photo of you together.
        </p>
      </header>

      <main className={`${styles.main} no-scrollbar`}>
        <div className={styles.uploadGrid}>
          <PhotoSlot label="You" file={userFile} fallbackUrl={state.userPhotoUrl} onChange={setUserFile} />
          <PhotoSlot
            label={partnerName}
            file={partnerFile}
            fallbackUrl={state.partnerPhotoUrl}
            onChange={setPartnerFile}
          />
        </div>

        <DashboardCard icon={<SparkleIcon size={16} weight="fill" />} title="Style (optional)">
          <p className={styles.helpText}>
            Face, body, and outfit accuracy are always preserved — this only changes the artistic style.
          </p>
          <textarea
            className={styles.styleInput}
            placeholder='e.g. "studio ghibli vibes", "golden hour on a beach", "black and white film photo"'
            value={styleNote}
            maxLength={300}
            rows={2}
            onChange={(event) => setStyleNote(event.target.value)}
          />
        </DashboardCard>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.generateButton}
            disabled={!canGenerate}
            onClick={() => userFile && partnerFile && generate(userFile, partnerFile, styleNote)}
          >
            {isGenerating ? (
              <>
                <SpinnerGapIcon size={18} className={styles.spinner} />
                Generating…
              </>
            ) : (
              <>
                <HeartIcon size={18} weight="fill" />
                Generate couple photo
              </>
            )}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </div>

        {state.generatedUrl && (
          <DashboardCard icon={<HeartIcon size={16} weight="fill" />} title="Result">
            <p className={styles.helpText}>{formatGeneratedAt(state.generatedAt)}</p>
            <img src={state.generatedUrl} alt="Generated couple photo" className={styles.resultImage} />
          </DashboardCard>
        )}
      </main>
    </div>
  );
}
