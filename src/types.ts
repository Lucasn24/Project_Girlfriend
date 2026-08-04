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
