# Project_Girlfriend — Tether

**Tether** is a platform for long-distance couples to stay emotionally connected across any distance or timezone. This is the chat page: the partner-to-partner thread, where an AI companion steps in and replies in your voice whenever you're asleep or offline in another timezone.

Built with React, TypeScript, and Vite. Chat UI components live in `src/components/chatbot/`, each paired with its own CSS Module (`Component.tsx` + `Component.module.css`). A small Express backend (`server/`) calls the Gemini API to generate replies.

## Getting started

Requires [Node.js](https://nodejs.org/) 18+ and a free [Gemini API key](https://aistudio.google.com/apikey).

```bash
npm install
cp .env.example .env   # then paste your GEMINI_API_KEY into .env
npm run dev
```

This starts both the frontend (Vite, [http://localhost:5173](http://localhost:5173)) and the API server (Express, `:3001`) together. Open the printed Vite URL and send a message — the reply comes from Gemini, generated as the "Maya" persona.

Without a key set, the app still runs and the UI still works, but sending a message will show an inline error asking you to add `GEMINI_API_KEY`.

### Making it sound like you

The persona is a placeholder until you configure it. Edit `server/persona.ts`:

1. Replace the style description with how you actually text (tone, emoji use, typical message length, favorite phrases).
2. Paste 15–30 real example messages into `exampleMessages` — export your history from Telegram (**Settings → Advanced → Export Telegram data**, format: JSON) and pull your own messages out of the export.

No restart needed for `server/persona.ts` edits — `npm run dev` watches and reloads the API server automatically.

## Other scripts

```bash
npm run build      # type-check and build the frontend for production
npm run preview    # preview the production build locally
npm run lint        # run oxlint
npm run dev:web    # frontend only, no API server
npm run dev:api    # API server only
```
