# Deployment

## Why not Vercel
FFmpeg requires a persistent server with binary access.
Vercel serverless functions time out at 10-60s and can't run FFmpeg.

## Option A — Railway (easiest)
1. Push repo to GitHub
2. railway.app → New Project → Deploy from GitHub
3. Select the `backend` folder as root
4. Add env vars in Railway dashboard
5. Railway auto-installs FFmpeg via nixpacks

## Option B — DigitalOcean Droplet
```bash
# On a $6/mo Ubuntu droplet:
sudo apt update && sudo apt install -y ffmpeg nodejs npm
sudo npm install -g pm2
cd backend && npm install && npm run build
pm2 start dist/index.js --name adforge-backend
```

## Frontend
Deploy to Vercel normally — only the backend needs a persistent server.
Set NEXT_PUBLIC_API_URL to your Railway/DO backend URL.

## FFmpeg font path
On Railway/Ubuntu: /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
On Mac (dev): /Library/Fonts/Arial\ Bold.ttf
Set FONT_PATH in .env accordingly.
