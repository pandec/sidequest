# Vercel Deploy Guide (Dev)

Vercel gives you a free public URL so you can open your app on your phone or share it with friends. Your Convex backend runs separately — Vercel just hosts the React frontend.

---

## Prerequisites

- Your code is pushed to a GitHub repository
- You have (or can create) a free [Vercel account](https://vercel.com)

---

## 1. Sign In to Vercel

Go to [vercel.com](https://vercel.com) and sign up or log in with your GitHub account.

---

## 2. Import Your Project

1. Click **Add New** > **Project**
2. Find your GitHub repo in the list and click **Import**

Vercel automatically detects it's a Vite project. No build config changes needed.

---

## 3. Add Environment Variables

Before clicking Deploy, scroll down to **Environment Variables** and add these two:

| Name | Value |
|------|-------|
| `VITE_CONVEX_URL` | Same value as in your `.env.local` (e.g. `https://your-project.convex.cloud`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Same value as in your `.env.local` (starts with `pk_test_...`) |

> **Where to find these?** Open `.env.local` in your project folder. Both values should already be there from setup.

---

## 4. Deploy

Click **Deploy** and wait a minute or two. When it finishes, Vercel gives you a `*.vercel.app` URL.

Open it on your phone — it should work!

---

## Auto-Deploys

Every time you push to the `main` branch, Vercel automatically rebuilds and redeploys your app. No manual steps needed.

---

## Install as an App (PWA)

Your app is installable like a native app:

- **iPhone (Safari):** tap the Share button > **Add to Home Screen**
- **Android (Chrome):** tap the menu (three dots) > **Install app**

---

## Important: Dev Mode Warning

> **This setup uses your dev Clerk and Convex instances.**
>
> Clerk's dev mode works on `*.vercel.app` domains automatically — no extra configuration needed.
>
> **For a production setup** with a custom domain, production Clerk instance, and production Convex deployment — talk to Bartosz before going live.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page after deploy | Check that both env vars are set correctly in Vercel > Settings > Environment Variables. Redeploy after adding them. |
| Auth not working | Make sure you used your dev keys (`pk_test_...`), not production keys. Dev keys are the ones from your `.env.local`. |
| "No address provided to ConvexReactClient" | `VITE_CONVEX_URL` is missing or wrong. Re-check the value — it should start with `https://` and end with `.convex.cloud`. |
| Changes not showing up | Push your latest code to `main`. Vercel only deploys what's on GitHub. |
| App works locally but not on Vercel | Env vars are likely missing. Vercel doesn't read your `.env.local` — they must be added in the Vercel dashboard. |
