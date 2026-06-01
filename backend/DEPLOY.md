# Deploying CHAMP Backend to Railway

## Prerequisites
- [Railway CLI](https://docs.railway.app/develop/cli): `npm install -g @railway/cli`
- Railway account at railway.app

## Steps

### 1. Login and init
```bash
railway login
cd backend/
railway init        # create a new project or link existing
```

### 2. Set environment variables
In Railway dashboard → Variables, add all keys from `.env.example`:
- `DATABASE_URL` — Supabase connection string (from Supabase → Settings → Database)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET` — random 64-char string
- `NODE_ENV=production`
- `STORAGE_PROVIDER=supabase`
- `EXPO_ACCESS_TOKEN` — from expo.dev account settings

### 3. Deploy
```bash
railway up
```

Railway auto-detects Node.js via `package.json` and runs `node src/server.js` (defined in `Procfile`).

### 4. Get public URL
```bash
railway domain
```

Copy the URL (e.g. `https://champ-backend.up.railway.app`).

### 5. Update mobile app
In `mobile/.env`, set:
```
EXPO_PUBLIC_API_URL=https://champ-backend.up.railway.app/api
```

For production builds, set `EXPO_PUBLIC_API_URL` in your EAS build environment.

## Health check
Railway pings `/health` every 30s. Verify: `https://your-domain.up.railway.app/health`

## Logs
```bash
railway logs
```
