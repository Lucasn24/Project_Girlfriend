import { GameSection } from "../components/games/GameSection";
import { PasteScoreForm } from "../components/games/PasteScoreForm";
import { GAME_ORDER } from "../data/games";
import { useGames } from "../hooks/games/useGames";
import styles from "./GamesPage.module.css";

export function GamesPage() {
  const { results, error, isSubmitting, submit, remove } = useGames();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Games</h1>
        <p className={styles.subtitle}>Paste your Wordle or Minute Cryptic result to track it.</p>
      </header>

      <main className={`${styles.main} no-scrollbar`}>
        <div className={styles.formWrap}>
          <PasteScoreForm isSubmitting={isSubmitting} error={error} onSubmit={submit} />
        </div>

        {GAME_ORDER.map((game) => (
          <GameSection
            key={game}
            game={game}
            results={results.filter((result) => result.game === game)}
            onDelete={remove}
          />
        ))}
      </main>
    </div>
  );
}
