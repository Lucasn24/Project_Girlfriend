export type MessageSender = "you" | "partner-ai" | "partner-human";

export interface TextMessage {
  kind: "message";
  type: "text";
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read";
}

export interface VoiceMessage {
  kind: "message";
  type: "voice";
  id: string;
  sender: MessageSender;
  duration: string;
  waveform: number[];
  timestamp: string;
  status?: "sent" | "delivered" | "read";
}

export interface PhotoMessage {
  kind: "message";
  type: "photo";
  id: string;
  sender: MessageSender;
  caption?: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read";
}

export type ChatMessage = TextMessage | VoiceMessage | PhotoMessage;

export interface Divider {
  kind: "divider";
  id: string;
  label: string;
  icon: "sun" | "moon";
}

export type ThreadItem = ChatMessage | Divider;

export type CalendarOwner = "user" | "partner";

export type CalendarEventSource = "local" | "ical" | "google";

export interface CalendarEvent {
  id: string;
  owner: CalendarOwner;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  source: CalendarEventSource;
}

export interface CalendarStatus {
  configured: boolean;
  lastSyncedAt: string | null;
  error: string | null;
}

export interface CouplePhotoState {
  userPhotoUrl: string | null;
  partnerPhotoUrl: string | null;
  generatedUrl: string | null;
  generatedAt: string | null;
}

export type GameOwner = "user" | "partner";

interface GameResultBase {
  id: string;
  owner: GameOwner;
  puzzleDate: string;
  submittedAt: string;
  rawText: string;
  gridEmoji: string;
}

export interface WordleResult extends GameResultBase {
  game: "wordle";
  puzzleNumber: number | null;
  guesses: number | null;
  hardMode: boolean;
}

export interface MinuteCrypticResult extends GameResultBase {
  game: "minute-cryptic";
  hints: number | null;
  parDelta: number | null;
  solverCount: number | null;
}

export type GameResult = WordleResult | MinuteCrypticResult;

export type PhotoTimelineOwner = "user" | "partner";

export interface PhotoTimelineEntry {
  id: string;
  owner: PhotoTimelineOwner;
  timestamp: string;
  caption?: string;
  originalFile: string;
  thumbFile: string;
  mimeType: string;
  width: number;
  height: number;
  createdAt: string;
  thumbUrl: string;
  originalUrl: string;
}
