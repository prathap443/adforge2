# AdForge — Personal Ad Video Generator

Paste product copy, upload screenshots, get 3 short vertical ad videos with voiceover and captions.

## Stack
- **Frontend**: Next.js 14 (App Router)
- **Backend**: Express + Node.js (Railway / DigitalOcean)
- **LLM**: Claude Sonnet (script generation)
- **TTS**: OpenAI TTS (voiceover)
- **Render**: FFmpeg via fluent-ffmpeg

## Quick start

```bash
# 1. Install dependencies
cd frontend && npm install
cd ../backend && npm install

# 2. Set env vars (copy .env.example → .env in both folders)

# 3. Verify FFmpeg
ffmpeg -version

# 4. Run dev
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev
```

## Day-by-day build order
1. Form → Claude scripts
2. OpenAI TTS → MP3 per ad
3. FFmpeg → one MP4
4. All 3 ads + captions
5. Download, history, error handling

## Folder structure
```
ad-tool/
├── frontend/          # Next.js app
│   ├── app/
│   │   ├── page.tsx              # Home + input form
│   │   ├── generate/page.tsx     # Results + video cards
│   │   └── history/page.tsx      # Past generations
│   ├── components/
│   │   ├── ProductForm.tsx
│   │   ├── ScriptPreview.tsx
│   │   ├── VideoCard.tsx
│   │   ├── UploadBox.tsx
│   │   └── LoadingState.tsx
│   ├── lib/
│   │   ├── api.ts                # Backend fetch helpers
│   │   └── utils.ts
│   └── types/index.ts
│
├── backend/           # Express API
│   ├── routes/
│   │   ├── generate.ts           # POST /api/generate
│   │   ├── status.ts             # GET /api/status/:jobId
│   │   └── history.ts            # GET /api/history
│   ├── services/
│   │   ├── scriptGenerator.ts    # Claude → JSON scripts
│   │   ├── sceneTiming.ts        # Duration calculation
│   │   ├── ttsService.ts         # OpenAI TTS → MP3
│   │   ├── renderer.ts           # Orchestrates FFmpeg
│   │   └── ffmpeg.ts             # Raw FFmpeg wrappers
│   ├── utils/
│   │   ├── fileStore.ts          # /tmp file management
│   │   ├── validators.ts         # Input + AI output validation
│   │   └── cleanup.ts            # Delete old tmp files
│   └── tmp/                      # All generated files (gitignored)
│       ├── uploads/
│       ├── audio/
│       ├── frames/
│       ├── videos/
│       └── history/
```
