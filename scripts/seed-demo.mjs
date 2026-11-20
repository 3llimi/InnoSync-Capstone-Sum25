#!/usr/bin/env node
// Seeds a running InnoSync API with a demo account plus mock talents, projects (job offers),
// applications and invitations, using only the public API (same validation as real users).
//
// Safe to re-run: existing users, projects, roles, applications and invitations are skipped.
//
//   API_URL=https://your-api.onrender.com [ML_URL=https://your-ml.onrender.com] \
//     node scripts/seed-demo.mjs
//
// Secrets come from scripts/.seed.env (gitignored) or the environment:
//   SEED_SECRET    derives the (unguessable) password of every mock account
//   DEMO_PASSWORD  password of the demo account (8-20 characters, the API's limit)

import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applications, DEMO_EMAIL, invitations, projects, users } from "./seed-data.mjs";

// ── config ──────────────────────────────────────────────────────────────────
const here = dirname(fileURLToPath(import.meta.url));
const envFile = join(here, ".seed.env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
const API = (process.env.API_URL || "").replace(/\/+$/, "");
const ML = (process.env.ML_URL || "").replace(/\/+$/, "");
const { SEED_SECRET, DEMO_PASSWORD } = process.env;
if (!API || !SEED_SECRET || !DEMO_PASSWORD) {
  console.error("Missing API_URL, SEED_SECRET or DEMO_PASSWORD (see header of this file).");
  process.exit(1);
}
if (DEMO_PASSWORD.length < 8 || DEMO_PASSWORD.length > 20) {
  console.error("DEMO_PASSWORD must be 8-20 characters (the API rejects anything else).");
  process.exit(1);
}

// Mock accounts get a deterministic password nobody can guess without SEED_SECRET.
const passwordFor = (u) =>
  u.demo ? DEMO_PASSWORD
    : createHmac("sha256", SEED_SECRET).update(u.email).digest("base64url").slice(0, 18);

// ── http ────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function http(method, path, { token, body, base = API } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let lastErr;
  // Free hosts cold-start slowly, so retry network errors and gateway timeouts.
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(base + path, {
        method, headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });
      if ([502, 503, 504].includes(res.status) && attempt < 5) { await sleep(attempt * 5000); continue; }
      const text = await res.text();
      let data = text;
      try { data = text ? JSON.parse(text) : null; } catch { /* leave as text */ }
      if (!res.ok) {
        const err = new Error(`${method} ${path} -> HTTP ${res.status} ${typeof data === "string" ? data : JSON.stringify(data)}`.slice(0, 300));
        err.status = res.status;
        throw err;
      }
      return data;
    } catch (e) {
      if (e.status) throw e; // real HTTP error: don't retry
      lastErr = e;
      await sleep(attempt * 5000);
    }
  }
  throw lastErr;
}

// ── seeding ─────────────────────────────────────────────────────────────────
const failures = [];
const fail = (what, e) => { failures.push(`${what}: ${e.message}`); console.log(`   ✗ ${what}: ${e.message}`); };
const stats = { users: 0, usersExisting: 0, projects: 0, roles: 0, applications: 0, invitations: 0 };

const tokens = new Map();   // email -> access token
const ids = new Map();      // email -> { userId, profileId }
const projectIndex = new Map(); // title -> { id, roles: [{id, roleName}] }

async function ensureUser(u) {
  const password = passwordFor(u);
  let token;
  try {
    const res = await http("POST", "/api/auth/signup", { body: { email: u.email, password, fullName: u.fullName } });
    token = res.accessToken;
    stats.users++;
  } catch (e) {
    if (e.status !== 409) throw e;
    const res = await http("POST", "/api/auth/login", { body: { email: u.email, password } });
    token = res.accessToken;
    stats.usersExisting++;
  }
  tokens.set(u.email, token);

  const profile = await http("POST", "/api/profile", {
    token,
    body: {
      telegram: u.telegram, github: u.github, bio: u.bio,
      position: u.position, education: u.education,
      expertise: u.level, expertise_level: u.level, experience_years: u.years,
      technologies: u.technologies,
      work_experience: u.work,
    },
  });
  ids.set(u.email, { userId: profile.user_id, profileId: profile.id });
}

async function ensureProject(p) {
  const token = tokens.get(p.owner);
  const mine = await http("GET", "/api/projects/me", { token });
  let proj = mine.find((x) => x.title === p.title);
  if (!proj) {
    proj = await http("POST", "/api/projects", {
      token, body: { title: p.title, description: p.description, projectType: p.projectType, teamSize: p.teamSize },
    });
    stats.projects++;
  }
  let roles = await http("GET", `/api/projects/${proj.id}/roles`, { token });
  // Create any role that's missing; duplicates of a name are matched by count.
  const have = new Map();
  for (const r of roles) have.set(r.roleName, (have.get(r.roleName) || 0) + 1);
  for (const r of p.roles) {
    if ((have.get(r.roleName) || 0) > 0) { have.set(r.roleName, have.get(r.roleName) - 1); continue; }
    await http("POST", `/api/projects/${proj.id}/roles`, { token, body: r });
    stats.roles++;
  }
  roles = await http("GET", `/api/projects/${proj.id}/roles`, { token });
  projectIndex.set(p.title, { id: proj.id, roles });
}

function roleId(title, roleName, nth = 0) {
  const proj = projectIndex.get(title);
  if (!proj) throw new Error(`unknown project "${title}"`);
  const match = proj.roles.filter((r) => r.roleName === roleName)[nth];
  if (!match) throw new Error(`no role "${roleName}" #${nth} in "${title}"`);
  return match.id;
}

const ownerOf = (title) => projects.find((p) => p.title === title).owner;

async function applyAndRespond(a) {
  const rid = roleId(a.project, a.role, a.nth || 0);
  const token = tokens.get(a.who);
  const mine = await http("GET", "/api/applications", { token });
  let app = mine.find((x) => x.projectRoleId === rid);
  if (!app) {
    app = await http("POST", `/api/applications/project-roles/${rid}`, { token });
    stats.applications++;
  }
  if (a.status !== "PENDING" && app.status !== a.status) {
    await http("PATCH", `/api/applications/${app.id}/status?status=${a.status}`, { token: tokens.get(ownerOf(a.project)) });
  }
}

async function inviteAndRespond(inv) {
  const rid = roleId(inv.project, inv.role);
  const sender = tokens.get(inv.from);
  const recipientId = ids.get(inv.to).userId;
  const sent = await http("GET", "/api/invitations/sent", { token: sender });
  let found = sent.find((x) => x.projectRoleId === rid && x.recipientId === recipientId);
  if (!found) {
    found = await http("POST", "/api/invitations", { token: sender, body: { projectRoleId: rid, recipientId } });
    stats.invitations++;
  }
  if (inv.status !== "INVITED" && found.status === "INVITED") {
    await http("PATCH", `/api/invitations/${found.id}/respond?response=${inv.status}`, { token: tokens.get(inv.to) });
  }
}

async function step(label, items, fn, describe) {
  console.log(`\n${label} (${items.length})`);
  for (const item of items) {
    try { await fn(item); console.log(`   ✓ ${describe(item)}`); }
    catch (e) { fail(describe(item), e); }
  }
}

console.log(`Seeding ${API}`);
console.log("(the first request can take up to a minute while a free host wakes up)");

await step("Users and profiles", users, ensureUser, (u) => `${u.fullName} · ${u.position}`);
// Later steps need every user's token/ids, so stop early if sign-up broke.
if (failures.length) { console.error("\nSign-up/profile failures above; aborting before dependent steps."); process.exit(1); }
await step("Projects and roles", projects, ensureProject, (p) => `${p.title} [${p.roles.length} roles]`);
await step("Applications", applications, applyAndRespond, (a) => `${a.who.split("@")[0]} → ${a.role} @ ${a.project} (${a.status})`);
await step("Invitations", invitations, inviteAndRespond, (i) => `${i.from.split("@")[0]} → ${i.to.split("@")[0]}: ${i.role} (${i.status})`);

// ── verification ────────────────────────────────────────────────────────────
console.log("\nVerification");
try {
  const profiles = await http("GET", "/api/profile/all");
  const incomplete = profiles.filter((p) => !p.education || !p.expertise_level || !p.experience_years || !p.position);
  console.log(`   profiles visible to the ML service: ${profiles.length} (incomplete: ${incomplete.length})`);
  if (incomplete.length) failures.push(`${incomplete.length} incomplete profile(s) would break ML recommendations`);
} catch (e) { fail("profile check", e); }

if (ML) {
  for (const p of projects) {
    const id = projectIndex.get(p.title)?.id;
    if (!id) continue;
    try {
      const r = await http("POST", "/recommend-team", { base: ML, body: { project_id: id } });
      console.log(`   ML ✓ ${p.title}: ${r.members.length}/${p.roles.length} roles filled, score ${Number(r.combined_score).toFixed(2)}`);
    } catch (e) { fail(`ML recommend "${p.title}"`, e); }
  }
}

console.log(`\nCreated: ${stats.users} users (${stats.usersExisting} already existed), ${stats.projects} projects, ${stats.roles} roles, ${stats.applications} applications, ${stats.invitations} invitations.`);
if (failures.length) { console.error(`\n${failures.length} problem(s):\n - ${failures.join("\n - ")}`); process.exit(1); }
console.log(`\nDone. Demo login: ${DEMO_EMAIL} (password from DEMO_PASSWORD).`);
