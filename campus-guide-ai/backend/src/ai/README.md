# Campus Guide-AI — Chat Backend Update

This update adds:
- POST /api/chat
- Gemini as the primary model
- Grok as the fallback model
- Neon verified-campus context before either model is called
- strict no-guessing campus instructions
- /api/health AI key configuration status

## Files to copy
- src/ai/gemini.js
- src/ai/grok.js
- src/routes/chat.js
- src/server.js
- .env.example

## Environment variables
Keep API keys only in backend/.env. Never put them in React/Vite frontend code.

Required for AI:
GEMINI_API_KEY=...
XAI_API_KEY=...

Optional model names:
GEMINI_MODEL=gemini-3.8-flash
GROK_MODEL=grok-4.7

## Test
Restart backend:

npm run dev

Open:
http://localhost:5000/api/health

Then POST JSON to:
http://localhost:5000/api/chat

Body:
{"message":"Where is Ganga Block?"}
