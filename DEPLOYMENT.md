# Deploying InnoSync (free tier)

| Part | Host | Why |
|---|---|---|
| Frontend (Next.js) | Vercel | Free, no sleeping, built for Next.js |
| API (Spring Boot) | Render (Docker, free) | Runs the existing Dockerfile |
| ML (FastAPI) | Render (Docker, free) | Runs the existing Dockerfile |
| Database | Neon (free Postgres) | Render's free Postgres is deleted after 30 days |

Render free services sleep after ~15 min idle, so the first visit takes 30-60 s to wake. Open the site once before showing it to anyone.

Deploy in this order, because each step needs a URL from the one before.

## 1. Database (Neon)
1. Create a project at https://console.neon.tech and copy the **direct** (not `-pooler`) connection details.
2. Turn them into the three values the API needs:
   - `DB_URL` = `jdbc:postgresql://<host>/<dbname>?sslmode=require`
   - `DB_USERNAME` = the Neon role name
   - `DB_PASSWORD` = the Neon password

   Neon's `postgresql://user:pass@host/db` string will not work as `DB_URL`. The JDBC form takes the user and password separately.
3. Tables are created automatically on first boot (`ddl-auto: update`).

## 2. API + ML (Render)
1. Push this branch to your fork, then go to Render, choose **New, Blueprint**, and select your fork. Render reads [render.yaml](render.yaml) and creates `innosync-api` and `innosync-ml`.
2. When prompted, fill in:
   - `innosync-api`: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and `ALLOWED_ORIGINS` (use a placeholder such as `https://example.com` for now).
   - `innosync-ml`: `BACKEND_URL` set to the API's URL, for example `https://innosync-api.onrender.com`. Use no trailing slash.
3. `JWT_SECRET` is generated for you. Set `ML_PASSWORD` on `innosync-ml` to any 8-20 character password. The API rejects longer ones, and a longer value would stop Quick Sync from logging in.
4. After deploy, check `https://<ml-service>.onrender.com/health`.

## 3. Frontend (Vercel)
1. Import your fork at https://vercel.com/new and set **Root Directory** to `frontend/innosync`.
2. Add environment variables. These are baked in at build time, so redeploy if you change them:
   - `NEXT_PUBLIC_API_URL` = the API's Render URL
   - `NEXT_PUBLIC_ML_URL` = the ML service's Render URL
3. Deploy, then copy the Vercel URL.

## 4. Close the loop (CORS)
In Render, set the API's `ALLOWED_ORIGINS` to your Vercel URL, with no trailing slash. For several origins, separate them with commas. Render redeploys the API automatically.

## 5. Fill it with demo data
The database starts empty. Load the demo account and mock talents, projects, applications and invitations:

```bash
API_URL=<api-url> ML_URL=<ml-url> SEED_SECRET=<long-random-string> DEMO_PASSWORD=<8-20 chars> \
node scripts/seed-demo.mjs
```

You can also put `SEED_SECRET` and `DEMO_PASSWORD` in `scripts/.seed.env`, which is gitignored. The script is safe to re-run: it skips anything that exists and recreates anything that was deleted. See the [README](README.md#-demo-data).

## Optional settings
- `NEXT_PUBLIC_DEMO_EMAIL` and `NEXT_PUBLIC_DEMO_PASSWORD` (Vercel): show a one-click demo login button on the login page. This publishes that password in the frontend bundle.
- `SHOW_SQL=true` (Render API): log every SQL statement while debugging. Off by default because it costs CPU on the free instance.
- **Keep-warm ping:** an uptime monitor such as UptimeRobot calling `<api-url>/api/profile/all` every 10 minutes avoids most cold starts. The free plan allows 750 instance-hours a month, enough to keep one service awake around the clock.

## Current deployment
| | URL |
|---|---|
| Frontend | https://inno-sync-capstone-sum25-git-deploy-free-tier-me-bb6e.vercel.app (branch `deploy/free-tier`) |
| API | https://innosync-api-jju7.onrender.com |
| ML | https://innosync-ml.onrender.com |

## Known limits (fine for a showcase)
- **Uploads are not persistent.** Resumes and profile pictures are written to the container's disk, so they vanish on every redeploy or restart. Persisting them needs object storage or a paid disk.
- **Cold starts.** See the note at the top.
- **The ML endpoint is public.** `/recommend-team` has no auth and allows any origin. That's acceptable for a demo, but not for production.
