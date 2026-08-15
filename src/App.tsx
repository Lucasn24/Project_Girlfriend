import { useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { ChatPage } from "./pages/ChatPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useChat } from "./hooks/useChat";

export type View = "dashboard" | "chat" | "settings";

function App() {
  const [view, setView] = useState<View>("dashboard");
  const chat = useChat();

  return (
    <AppShell view={view} onNavigate={setView}>
      {view === "dashboard" && <DashboardPage items={chat.items} />}
      {view === "chat" && <ChatPage chat={chat} />}
      {view === "settings" && <SettingsPage />}
    </AppShell>
  );
}

export default App;
