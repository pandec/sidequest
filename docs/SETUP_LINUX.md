# Linux Setup Guide

Step-by-step guide to get SQL Sidekick running on Linux. Covers Ubuntu/Debian and Fedora. No prior coding experience required.

---

## 1. Install Git and Build Essentials

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y git curl build-essential
```

### Fedora

```bash
sudo dnf install -y git curl gcc gcc-c++ make
```

---

## 2. Install Node.js (via fnm)

fnm (Fast Node Manager) lets you install and switch between Node.js versions.

```bash
curl -fsSL https://fnm.vercel.app/install | bash
```

Close and reopen your terminal (or run `source ~/.bashrc` / `source ~/.zshrc`).

Install the latest LTS version:

```bash
fnm install --lts
fnm use lts-latest
```

Verify:

```bash
node -v
```

You should see something like `v22.x.x` or higher.

---

## 3. Install pnpm

```bash
npm install -g pnpm
```

Verify:

```bash
pnpm -v
```

---

## 4. Install GitHub CLI

### Ubuntu / Debian

```bash
(type -p wget >/dev/null || (sudo apt update && sudo apt-get install wget -y)) \
  && sudo mkdir -p -m 755 /etc/apt/keyrings \
  && out=$(mktemp) && wget -nv -O$out https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  && cat $out | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
  && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && sudo apt update \
  && sudo apt install gh -y
```

### Fedora

```bash
sudo dnf install -y gh
```

### Authenticate

```bash
gh auth login
```

Choose:
- **GitHub.com**
- **HTTPS**
- **Login with a web browser**

Follow the browser prompts.

---

## 5. Install Claude Code CLI (optional)

If you want AI-assisted development with Claude Code:

```bash
npm install -g @anthropic-ai/claude-code
```

Run it once to authenticate:

```bash
claude
```

Follow the prompts to connect your Anthropic account.

---

## 6. Install a Code Editor

If you don't already have one:
- [VS Code](https://code.visualstudio.com/) -- download the `.deb` or `.rpm` package for your distro
- [Cursor](https://cursor.sh/) -- VS Code fork with built-in AI

On Ubuntu/Debian you can also install VS Code via snap:

```bash
sudo snap install code --classic
```

---

## 7. Fork and Clone the Repo

1. Go to the SQL Sidekick repository on GitHub
2. Click the **Fork** button (top right) to create your own copy
3. Clone your fork:

```bash
gh repo clone YOUR_USERNAME/sql-sidekick
cd sql-sidekick
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## 8. Install Dependencies

```bash
pnpm install
```

This downloads all the project's packages. May take a minute the first time.

---

## 9. Create a Clerk App

Clerk handles user authentication (sign in / sign up).

1. Go to [clerk.com](https://clerk.com) and create a free account
2. Click **Create Application**
3. Name it something like "SQL Sidekick"
4. Under sign-in options, enable **Email** and/or **Google** (your choice)
5. Click **Create Application**
6. Find your **Publishable Key** (starts with `pk_test_...`). Copy it.

> **Recommended:** Enable **Google OAuth** for smoother sign-in. Go to **Configure** > **SSO Connections** > **Enable Google**. Email/password sign-in can trigger "Client Trust" issues, especially behind Cloudflare. Google OAuth avoids this.

---

## 10. Create a Convex Project

Convex is the backend database. First run sets everything up:

```bash
pnpm convex dev
```

This will:
1. Open your browser to log in with GitHub
2. Ask you to create a new project -- name it "sql-sidekick"
3. Automatically create a `.env.local` file with `CONVEX_URL` and `CONVEX_DEPLOYMENT`

Once the schema is synced, press **Ctrl+C** to stop it.

> **CRITICAL:** Convex only creates `CONVEX_URL` in `.env.local`, but Vite needs the `VITE_` prefix to expose variables to the browser. You **must** manually add this line to `.env.local`:
>
> ```
> VITE_CONVEX_URL=https://your-project.convex.cloud
> ```
>
> Copy the value from the `CONVEX_URL` line that Convex already added. Without this, the app will crash with **"No address provided to ConvexReactClient"**.

---

## 11. Configure Clerk JWT Template for Convex

This connects Clerk authentication to your Convex backend.

1. In the [Clerk Dashboard](https://dashboard.clerk.com), go to **Configure** > **JWT Templates**
2. Click **New template**
3. Choose the **Convex** template
4. Leave defaults as-is
5. Click **Save**
6. Copy the **Issuer** URL (looks like `https://your-app.clerk.accounts.dev`)

---

## 12. Set Environment Variables

There are **3 places** where environment variables need to be set:

### 1. Local environment (`.env.local`)

Open `.env.local` in your editor. Make sure it contains both of these:

```
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

(The `CONVEX_URL` and `CONVEX_DEPLOYMENT` lines added by Convex should also be there -- don't remove them.)

### 2. Convex dashboard

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Select your project
3. Go to **Settings** > **Environment Variables**
4. Add these variables:
   - **`CLERK_JWT_ISSUER_DOMAIN`** -- the Issuer URL from step 11 (e.g. `https://your-app.clerk.accounts.dev`)
   - **`ANTHROPIC_API_KEY`** -- your Anthropic API key (needed for AI features)
5. Click **Save**

### 3. Cloudflare Pages (if deploying)

If you plan to deploy (see step 14), you'll also need to set these in your Cloudflare Pages project:
- `VITE_CONVEX_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`

---

## 13. Start the App

Run the frontend:

```bash
pnpm dev
```

In a separate terminal, start the Convex dev server:

```bash
pnpm convex dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. You should see SQL Sidekick running.

---

## 14. Deploy to Cloudflare Pages (optional)

If you want to deploy your app to the web:

1. Create a Cloudflare Pages project connected to your GitHub repo
2. Set the build command to `pnpm build` and the output directory to `dist`
3. Add environment variables in the Cloudflare Pages settings:
   - `VITE_CONVEX_URL` -- your production Convex URL
   - `VITE_CLERK_PUBLISHABLE_KEY` -- your Clerk publishable key
4. Or deploy from the CLI:

```bash
pnpm deploy
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `command not found: node` | Close and reopen terminal, or run `source ~/.bashrc` |
| `command not found: pnpm` | Run `npm install -g pnpm` again |
| "No address provided to ConvexReactClient" | Add `VITE_CONVEX_URL` to `.env.local` (copy the value from the `CONVEX_URL` line) |
| "needs_client_trust not supported" | Make sure you're using `@clerk/react` (v6), not `@clerk/clerk-react` (v5). Also check Clerk > Attack Protection > Bot Protection is set to **Disabled** or **CAPTCHA**. |
| Sign-in fails on Cloudflare | Enable Google OAuth in Clerk (Configure > SSO Connections > Enable Google), or ensure Bot Protection is disabled. |
| Clerk sign-in not working | Double-check `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local` |
| Convex errors about auth | Verify `CLERK_JWT_ISSUER_DOMAIN` is set in Convex dashboard |
| Port 5173 already in use | Kill other dev servers or use `pnpm dev --port 3000` |
| Permission denied on install | Use `sudo` for system-level installs, never for `pnpm install` in the project |
