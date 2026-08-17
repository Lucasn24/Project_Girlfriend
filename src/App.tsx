import { useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { CalendarPage } from "./pages/CalendarPage";
import { ChatPage } from "./pages/ChatPage";
import { CouplePhotoPage } from "./pages/CouplePhotoPage";
import { DashboardPage } from "./pages/DashboardPage";
import { GamesPage } from "./pages/GamesPage";
import { PhotoTimelinePage } from "./pages/PhotoTimelinePage";
import { SettingsPage } from "./pages/SettingsPage";
import { useChat } from "./hooks/chat/useChat";

export type View = "dashboard" | "chat" | "calendar" | "couplePhoto" | "photoTimeline" | "games" | "settings";

function App() {
  const [view, setView] = useState<View>("dashboard");
  const chat = useChat();

  return (
    <AppShell view={view} onNavigate={setView}>
      {view === "dashboard" && <DashboardPage />}
      {view === "chat" && <ChatPage chat={chat} />}
      {view === "calendar" && <CalendarPage />}
      {view === "couplePhoto" && <CouplePhotoPage />}
      {view === "photoTimeline" && <PhotoTimelinePage />}
      {view === "games" && <GamesPage />}
      {view === "settings" && <SettingsPage />}
    </AppShell>
  );
}

export default App;
