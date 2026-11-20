# InnoSync 🚀

[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://adoptium.net/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-green.svg)](https://spring.io/projects/spring-boot)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue.svg)](https://neon.tech/)
[![Docker](https://img.shields.io/badge/Docker-✓-blue.svg)](https://docker.com/)

> **Talent-matching and project collaboration platform for university communities and innovation hubs.**

InnoSync connects project creators with talent. Creators describe the roles they need; **Quick Sync** uses machine learning to propose the team that fits best, and talents discover projects, apply, and accept invitations.

---

## 🌐 Live demo

| | |
|---|---|
| **App** | https://inno-sync-capstone-sum25-git-deploy-free-tier-me-bb6e.vercel.app |
| **API docs (Swagger)** | https://innosync-api-jju7.onrender.com/swagger-ui/index.html |
| **ML service docs** | https://innosync-ml.onrender.com/docs |

**Demo accounts**: log in to see a populated dashboard (projects, applicants, invitations, Quick Sync):

| Account | Email | Password | Who they are |
|---|---|---|---|
| Main demo | `demo@example.com` | `InnoSyncDemo2026` | Demo User, a product manager who owns three projects |
| Second demo | `demo2@example.com` | `InnoSyncDemo2026` | Sam Rivera, a full stack developer with one small project |

**Try the notifications:** log in as one account in a normal window and as the other in a private window, then act in one window and watch the 🔔 bell in the other. A pop-up appears within about 20 seconds, or as soon as you switch to that window. The two accounts start with three pending items between them:

| Log in as | Do this | The other account is told |
|---|---|---|
| Demo User | **Dashboard → Applications**: accept or reject Sam's application to *AI Study Buddy* | Sam: "You're in!" or "Update on your application" |
| Demo User | **Dashboard → Invitations**: accept or decline Sam's invitation to *PeerPrep* | Sam: "Demo User accepted your invitation" |
| Sam Rivera | **Dashboard → Invitations**: accept or decline Demo's invitation to *CampusConnect* | Demo: "Sam Rivera accepted your invitation" |
| Either | **Find Talent → Contact**, or **Find Project → Apply** | The other: a new invitation or application |

> ⏱️ **First load can take 30–60 seconds.** The API and ML service run on Render's free plan, which sleeps after 15 minutes without traffic. Once awake, the app is fast.
>
> The demo accounts are shared, so anyone can change their data. The seed script restores it (see [Demo data](#-demo-data)): it recreates deleted items, but it doesn't reset answers that were already given.

![InnoSync Demo](assets/Week4_Capstone.gif)

## 📋 Table of contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🛠️ Tech stack](#️-tech-stack)
- [🤖 How Quick Sync works](#-how-quick-sync-works)
- [☁️ Deployment](#️-deployment)
- [🌱 Demo data](#-demo-data)
- [💻 Local development](#-local-development)
- [📚 API overview](#-api-overview)
- [🧪 Testing](#-testing)
- [⚠️ Known limits](#️-known-limits)
- [👥 Team](#-team)

## ✨ Features

**For talents**
- Profile with skills, positions, education, experience level and work history
- **Find Project**: search and filter open roles by level, project type, team size and skills; apply to a specific role
- Accept or decline invitations from project teams
- Delete invitations and proposals from your lists (deleting a pending one declines or withdraws it)

**For project creators**
- Create projects with roles, required skills and expertise levels
- **Find Talent**: filter people by experience, education, level and skills, then invite them
- **Quick Sync**: an ML-recommended team for your project, with **Reroll All** (suggest a different team) and per-person **Reroll** (replace one member, keep the rest)
- Review and respond to applications; delete applications from your list (a pending one is rejected and the applicant told); delete projects you own (the team is notified)
- You can't invite yourself or apply to your own project; the API rejects both

**Everywhere**
- **Notifications**: a bell with an unread badge and a pop-up whenever someone invites you, applies to your project, or answers your invitation or application. It updates on its own every 20 seconds and when you return to the tab. Click to open, mark all read, or dismiss.
- Dashboard overview: live counts, recent activity, profile strength, and a project list with team fill
- Responsive design down to phone size, with smooth animations that respect *reduced motion*
- **Chat**: coming soon (the tab shows a preview)

## 🏗️ Architecture

```
            Browser
               │
               ▼
┌──────────────────────────┐        ┌───────────────────────────┐
│  Frontend · Next.js 15   │ HTTPS  │  ML service · FastAPI     │
│  Vercel                  │───────►│  Render (Docker)          │
└────────────┬─────────────┘        │  /recommend-team          │
             │ HTTPS (JWT)          └─────────────┬─────────────┘
             ▼                                    │ REST (service account)
┌──────────────────────────┐                      │
│  API · Spring Boot 3     │◄─────────────────────┘
│  Render (Docker)         │
└────────────┬─────────────┘
             │ JDBC
             ▼
┌──────────────────────────┐
│  PostgreSQL · Neon       │
└──────────────────────────┘
```

The ML service has no database of its own. It logs in to the API with a service account and reads projects, roles and profiles from it.

## 🛠️ Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, CSS Modules |
| Backend | Spring Boot 3.5, Java 21, Spring Security + JWT, Spring Data JPA / Hibernate, springdoc OpenAPI |
| ML | FastAPI, Python 3.11, scikit-learn, pandas, NumPy |
| Database | PostgreSQL (Neon serverless) |
| Hosting | Vercel (frontend), Render (API + ML, Docker), Neon (database) |
| Tooling | Docker, GitHub Actions (backend tests), Testcontainers, Playwright-based UI checks |

## 🤖 How Quick Sync works

When a creator opens Quick Sync, the ML service pulls the project's roles and every profile, then:

1. **Profiles**: every talent's skills, level, education and work history become candidates for roles matching their position.
2. **Skill matching**: TF-IDF vectors and cosine similarity rank candidates per role against the role's required technologies.
3. **Synergy scoring**: shared skills and experience balance measure how well people fit together.
4. **ML ranking**: several candidate teams are generated, and a trained scikit-learn model (`ML/team_quality_model.joblib`) picks the best one.

**Rerolling**: the request accepts optional `seed`, `exclude_ids` and `keep_ids`.

- **Reroll All** explores new candidate teams and avoids the current members wherever someone else fits.
- **Reroll** on one person keeps everyone else and replaces only that slot.
- If nobody else fits a role, the app says so instead of returning the same person silently.

## ☁️ Deployment

The live demo runs on free tiers: **Vercel** (frontend), **Render** (API + ML via [render.yaml](render.yaml)), and **Neon** (Postgres). Step-by-step instructions are in **[DEPLOYMENT.md](DEPLOYMENT.md)**.

### Configuration

Secrets live only in the hosting dashboards, never in the repository.

| Service | Variable | Purpose |
|---|---|---|
| API (Render) | `DB_URL` | `jdbc:postgresql://<neon-host>/<db>?sslmode=require` |
| | `DB_USERNAME`, `DB_PASSWORD` | Neon role credentials |
| | `JWT_SECRET` | Signs login tokens (generated by Render) |
| | `ALLOWED_ORIGINS` | Frontend URL(s) allowed by CORS, comma-separated, no trailing slash |
| | `SHOW_SQL` | Optional: `true` logs every SQL statement (off by default) |
| ML (Render) | `BACKEND_URL` | The API's URL, no trailing slash |
| | `ML_PASSWORD` | Service-account password, 8–20 characters |
| Frontend (Vercel) | `NEXT_PUBLIC_API_URL` | The API's URL (baked in at build time) |
| | `NEXT_PUBLIC_ML_URL` | The ML service's URL |
| | `NEXT_PUBLIC_DEMO_EMAIL`, `NEXT_PUBLIC_DEMO_PASSWORD` | Optional: adds a one-click "Explore with the demo account" button to the login page |
| | `NEXT_PUBLIC_DEMO2_EMAIL` | Optional: adds a link under it to log in as the second demo account (uses the same password unless `NEXT_PUBLIC_DEMO2_PASSWORD` is set) |

Pushing to the deployed branch redeploys automatically: Vercel takes about a minute, Render several minutes.

## 🌱 Demo data

[scripts/seed-demo.mjs](scripts/seed-demo.mjs) fills an empty deployment with the two demo accounts, 21 mock talents, 11 projects, 42 roles, applications and invitations. It uses only the public API, so everything passes the same validation as real users. It's safe to re-run: existing records are skipped and deleted ones are recreated.

```bash
# secrets come from scripts/.seed.env (gitignored) or the environment
API_URL=https://innosync-api-jju7.onrender.com \
ML_URL=https://innosync-ml.onrender.com \
SEED_SECRET=<any-long-random-string> \
DEMO_PASSWORD=<8-20 characters> \
node scripts/seed-demo.mjs
```

`SEED_SECRET` derives the passwords of the mock accounts, so they can't be guessed. Both demo accounts use `DEMO_PASSWORD`. With `ML_URL` set, the script also checks that Quick Sync can fill every role.

## 💻 Local development

**Prerequisites:** Java 21, Node.js 18+, Docker.

```bash
# 1. Database
docker run -d --name innosync-db -e POSTGRES_PASSWORD=localpw -e POSTGRES_DB=innosync -p 5432:5432 postgres:16-alpine

# 2. API (http://localhost:8080)
cd backend
./mvnw -DskipTests package
DB_URL=jdbc:postgresql://localhost:5432/innosync DB_USERNAME=postgres DB_PASSWORD=localpw \
JWT_SECRET=<any-long-random-string> ALLOWED_ORIGINS=http://localhost:3000 \
java -jar target/backend-0.0.1-SNAPSHOT.jar

# 3. ML service (http://localhost:8000). Docker avoids Python version issues
cd ML
docker build -t innosync-ml .
docker run -p 8000:8000 -e BACKEND_URL=http://host.docker.internal:8080 -e ML_PASSWORD=<8-20 chars> innosync-ml

# 4. Frontend (http://localhost:3000)
cd frontend/innosync
npm install
NEXT_PUBLIC_API_URL=http://localhost:8080 NEXT_PUBLIC_ML_URL=http://localhost:8000 npm run dev

# 5. Optional: demo data
API_URL=http://localhost:8080 ML_URL=http://localhost:8000 SEED_SECRET=dev DEMO_PASSWORD=LocalDemo2026 \
node scripts/seed-demo.mjs
```

Tables are created automatically on first start (`ddl-auto: update`).

## 📚 API overview

Full, interactive reference: **[Swagger UI](https://innosync-api-jju7.onrender.com/swagger-ui/index.html)** (locally: http://localhost:8080/swagger-ui/index.html).

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/signup`, `/login`, `/refresh`, `/logout` |
| Profiles | `GET /api/profile/me`, `GET /api/profile/all`, `PUT /api/profile`, resume and picture upload |
| Projects | `GET /api/projects/me`, `/joined`, `/{id}`, `POST /api/projects`, `DELETE /api/projects/{id}` (owner only) |
| Roles | `GET /api/projects/roles` (all open roles with skills, level, type and size), `GET` / `POST /api/projects/{id}/roles` |
| Applications | `POST /api/applications/project-roles/{roleId}`, `GET /api/applications` (mine), `GET /api/applications/received` (to my projects), `PATCH /api/applications/{id}/status`, `DELETE /api/applications/{id}` |
| Invitations | `POST /api/invitations`, `GET /api/invitations/received`, `/sent`, `PATCH /api/invitations/{id}/respond`, `DELETE /api/invitations/{id}` |
| Notifications | `GET /api/notifications?limit=30` (latest + unread count), `GET /api/notifications/unread-count`, `PATCH /api/notifications/{id}/read`, `PATCH /api/notifications/read-all`, `DELETE /api/notifications/{id}` |
| Team | `GET /api/projects/{id}/team-members`, `DELETE /api/projects/{id}/team-members/{userId}` |
| ML | `POST /recommend-team` (`project_id`, optional `seed`, `exclude_ids`, `keep_ids`); each member comes back with the `role` / `role_id` they fill, a `role_match_score` and `matched_skills` / `missing_skills`. `GET /health` |

## 🧪 Testing

```bash
# Backend unit tests (94 tests, no Docker needed)
cd backend
./mvnw test -Dtest='*ServiceTest,AuthControllerTest,JwtUtilTest'

# Full backend suite, including integration tests (needs Docker for Testcontainers)
./mvnw test

# Frontend: type check, lint, production build
cd frontend/innosync
npx tsc --noEmit
npm run lint
npm run build
```

> The integration tests use Testcontainers 1.21.0, which Docker Engine 29+ rejects (HTTP 400). On a recent Docker, upgrade Testcontainers or run only the unit tests above.

## ⚠️ Known limits

These are acceptable for a showcase deployment:

- **Cold starts.** Render's free plan sleeps after 15 minutes idle. An uptime pinger (e.g. UptimeRobot hitting `/api/profile/all` every 10 minutes) keeps the API awake, within the free plan's 750 hours a month.
- **Uploads aren't persistent.** Resumes and profile pictures are stored on the container's disk and are lost on redeploy.
- **Archive is not saved.** Archiving a project only changes the current view; the database has no archived status yet.
- **Chat isn't implemented** beyond the preview screen.
- **Notifications are polled, not pushed.** New ones show up within about 20 seconds (sooner when you switch back to the tab). Push via WebSockets wasn't worth it on the free plan, which sleeps idle connections.
- **The ML endpoint is public.** `/recommend-team` accepts any origin without authentication.

## 👥 Team

Innopolis University · Summer 2025 Capstone

| Role | Members |
|---|---|
| Team Lead | Baha |
| Frontend | Asgat & Anvar |
| Backend | Yusuf & Egor |
| ML / AI | Gurban |
| DevOps | Aibek |

Questions: Telegram **@abdugafforzoda** · [GitHub Issues](https://github.com/IU-Capstone-Project-2025/InnoSync/issues)

## 📄 License

MIT.

---

<div align="center">
  <p>Built with ❤️ by the InnoSync team · Innopolis University Capstone Project 2025</p>
</div>
