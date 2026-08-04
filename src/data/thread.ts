import type { ThreadItem } from "../types";

export const partnerName = "Lucas";

export const thread: ThreadItem[] = [
  { kind: "divider", id: "d1", label: "Today", icon: "sun" },
  {
    kind: "message",
    type: "text",
    id: "m1",
    sender: "partner-human",
    text: "Just got out of my morning run — Tokyo is so pretty at sunrise. Wish you could see it.",
    timestamp: "6:52 AM",
  },
  {
    kind: "message",
    type: "photo",
    id: "m2",
    sender: "partner-human",
    caption: "The view from the bridge",
    timestamp: "6:53 AM",
  },
  {
    kind: "message",
    type: "text",
    id: "m3",
    sender: "you",
    text: "That's stunning. Save me a spot for when I visit \u{1F495}",
    timestamp: "9:01 AM",
    status: "read",
  },
  {
    kind: "message",
    type: "voice",
    id: "m4",
    sender: "you",
    duration: "0:24",
    waveform: [4, 9, 14, 8, 18, 11, 6, 15, 9, 12, 5, 8],
    timestamp: "9:03 AM",
    status: "read",
  },
  {
    kind: "divider",
    id: "d2",
    label: "Lucas fell asleep at 11:42 PM his time — his AI companion is replying in his voice",
    icon: "moon",
  },
  {
    kind: "message",
    type: "text",
    id: "m5",
    sender: "partner-ai",
    text: "That made me smile — I'll hold you to it. Get some rest soon, it's late there too.",
    timestamp: "11:44 PM",
  },
  {
    kind: "message",
    type: "text",
    id: "m6",
    sender: "you",
    text: "Not yet, still thinking about you. How was the rest of your day?",
    timestamp: "9:07 AM",
    status: "delivered",
  },
  {
    kind: "message",
    type: "text",
    id: "m7",
    sender: "partner-ai",
    text: "Good — long one, but the run helped. Real Lucas will tell you the rest when he's up, I'm just keeping your seat warm \u{1F642}",
    timestamp: "11:46 PM",
  },
];
