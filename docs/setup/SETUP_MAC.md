# macOS Setup Guide

Step-by-step guide to set up a project built with the SideQuest Starter template on your Mac. No prior coding experience required.

---

## 1. Install Xcode Command Line Tools

Open **Terminal** (search "Terminal" in Spotlight) and run:

```bash
xcode-select --install
```

A popup will appear. Click **Install** and wait for it to finish (may take a few minutes).

---

## 2. Install Homebrew

Homebrew is a package manager for macOS. Paste this into Terminal:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the on-screen instructions. When it finishes, it may ask you to run two commands to add Homebrew to your PATH. Run those commands.

Verify it works:

```bash
brew --version
```

---

## 3. Install Node.js (via fnm)

fnm (Fast Node Manager) lets you install and switch between Node.js versions easily.

```bash
brew install fnm
```

Add fnm to your shell. Run this:

```bash
echo 'eval "$(fnm env --use-on-cd --shell zsh)"' >> ~/.zshrc
source ~/.zshrc
```

Install the latest LTS (Long Term Support) version of Node.js:

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

## 4. Install pnpm

pnpm is a fast, disk-efficient package manager. Install it globally:

```bash
npm install -g pnpm
```

Verify:

```bash
pnpm -v
```

---

## 5. Install GitHub CLI

```bash
brew install gh
```

Log in to your GitHub account:

```bash
gh auth login
```

Choose:
- **GitHub.com**
- **HTTPS**
- **Login with a web browser**

Follow the browser prompts to complete authentication.

---

## 6. Install Claude Code CLI (optional)

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

## 7. Install a Code Editor

If you don't already have one, we recommend:
- [VS Code](https://code.visualstudio.com/) (free, most popular)
- [Cursor](https://cursor.sh/) (VS Code fork with built-in AI)

---

## 8. Fork and Clone the Repo

1. Go to your project's repository on GitHub
2. Click the **Fork** button (top right) to create your own copy
3. Clone your fork:

```bash
gh repo clone YOUR_USERNAME/your-project
cd your-project
```

Replace `YOUR_USERNAME` with your GitHub username and `your-project` with the actual repo name.

---

## 9. Install Dependencies

```bash
pnpm install
```

This downloads all the project's packages. It may take a minute the first time.

---

## 10. Create a Clerk App

Clerk handles user authentication (sign in / sign up).

1. Go to [clerk.com](https://clerk.com) and create a free account
2. Click **Create Application**
3. Name it after your project (e.g. "My App Dev")
4. Under sign-in options, enable **Email** and/or **Google** (your choice)
5. Click **Create Application**
6. On the next screen, find your **Publishable Key** (starts with `pk_test_...`). Copy it.

> **Recommended:** Enable **Google OAuth** for smoother sign-in. Go to **Configure** > **SSO Connections** > **Enable Google**. Email/password sign-in can trigger "Client Trust" issues in some hosting environments. Google OAuth avoids this.

---

## 11. Create a Convex Project

Convex is the backend database. The first time you run the dev server, it sets everything up:

```bash
pnpm convex dev
```

This will:
1. Open your browser to log in with GitHub
2. Ask you to create a new project -- name it after your project (e.g. "my-app")
3. Automatically create a `.env.local` file with `CONVEX_URL` and `CONVEX_DEPLOYMENT`

Once it says the schema is synced, press **Ctrl+C** to stop it.

> **CRITICAL:** Convex only creates `CONVEX_URL` in `.env.local`, but Vite needs the `VITE_` prefix to expose variables to the browser. You **must** manually add this line to `.env.local`:
>
> ```
> VITE_CONVEX_URL=https://your-project.convex.cloud
> ```
>
> Copy the value from the `CONVEX_URL` line that Convex already added. Without this, the app will crash with **"No address provided to ConvexReactClient"**.

---

## 12. Configure Clerk JWT Template for Convex

This step connects Clerk authentication to your Convex backend.

1. In the [Clerk Dashboard](https://dashboard.clerk.com), go to **Configure** > **JWT Templates**
2. Click **New template**
3. Choose the **Convex** template
4. Leave the default settings as-is
5. Click **Save**
6. Copy the **Issuer** URL (looks like `https://your-app.clerk.accounts.dev`)

---

## 13. Set Environment Variables

There are **2 places** where environment variables need to be set:

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
4. Add this variable:
   - **`CLERK_JWT_ISSUER_DOMAIN`** -- the Issuer URL you copied in step 12 (e.g. `https://your-app.clerk.accounts.dev`)
5. Click **Save**

---

## 14. Start the App

Run both the frontend and Convex backend together:

```bash
pnpm dev
```

In a separate terminal tab, start the Convex dev server:

```bash
pnpm convex dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. You should see your app running.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `command not found: node` | Close and reopen Terminal, or run `source ~/.zshrc` |
| `command not found: pnpm` | Run `npm install -g pnpm` again |
| "No address provided to ConvexReactClient" | Add `VITE_CONVEX_URL` to `.env.local` (copy the value from the `CONVEX_URL` line) |
| "needs_client_trust not supported" | Make sure you're using `@clerk/react` (v6), not `@clerk/clerk-react` (v5). Also check Clerk > Attack Protection > Bot Protection is set to **Disabled** or **CAPTCHA**. |
| Clerk sign-in not working | Double-check `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local` |
| Convex errors about auth | Verify `CLERK_JWT_ISSUER_DOMAIN` is set in Convex dashboard |
| Port 5173 already in use | Kill other dev servers or use `pnpm dev --port 3000` |
