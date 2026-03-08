# Windows Setup Guide

Step-by-step guide to set up a project built with the SideQuest Starter template on Windows. No prior coding experience required.

---

## 1. Install Git

Open **PowerShell** (search "PowerShell" in Start menu) and run:

```powershell
winget install Git.Git
```

Close and reopen PowerShell after installation.

Verify:

```powershell
git --version
```

---

## 2. Install Node.js (via fnm)

fnm (Fast Node Manager) lets you install and switch between Node.js versions.

```powershell
winget install Schniz.fnm
```

Close and reopen PowerShell. Then add fnm to your PowerShell profile:

```powershell
if (!(Test-Path -Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force }
Add-Content -Path $PROFILE -Value 'fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression'
```

Close and reopen PowerShell again, then install Node.js LTS:

```powershell
fnm install --lts
fnm use lts-latest
```

Verify:

```powershell
node -v
```

You should see something like `v22.x.x` or higher.

**Alternative:** If fnm gives you trouble, you can use [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) instead. Download the installer, then run `nvm install lts` and `nvm use lts`.

---

## 3. Install pnpm

```powershell
npm install -g pnpm
```

Verify:

```powershell
pnpm -v
```

---

## 4. Install GitHub CLI

```powershell
winget install GitHub.cli
```

Close and reopen PowerShell. Log in:

```powershell
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

```powershell
npm install -g @anthropic-ai/claude-code
```

Run it once to authenticate:

```powershell
claude
```

Follow the prompts to connect your Anthropic account.

---

## 6. Install a Code Editor

If you don't already have one:
- [VS Code](https://code.visualstudio.com/) (free, most popular)
- [Cursor](https://cursor.sh/) (VS Code fork with built-in AI)

You can also install VS Code via winget:

```powershell
winget install Microsoft.VisualStudioCode
```

---

## 7. Fork and Clone the Repo

1. Go to your project's repository on GitHub
2. Click the **Fork** button (top right) to create your own copy
3. Clone your fork:

```powershell
gh repo clone YOUR_USERNAME/your-project
cd your-project
```

Replace `YOUR_USERNAME` with your GitHub username and `your-project` with the actual repo name.

---

## 8. Install Dependencies

```powershell
pnpm install
```

This downloads all the project's packages. May take a minute the first time.

---

## 9. Create a Clerk App

Clerk handles user authentication (sign in / sign up).

1. Go to [clerk.com](https://clerk.com) and create a free account
2. Click **Create Application**
3. Name it after your project (e.g. "My App Dev")
4. Under sign-in options, enable **Email** and/or **Google** (your choice)
5. Click **Create Application**
6. Find your **Publishable Key** (starts with `pk_test_...`). Copy it.

> **Recommended:** Enable **Google OAuth** for smoother sign-in. Go to **Configure** > **SSO Connections** > **Enable Google**. Email/password sign-in can trigger "Client Trust" issues in some hosting environments. Google OAuth avoids this.

---

## 10. Create a Convex Project

Convex is the backend database. First run sets everything up:

```powershell
pnpm convex dev
```

This will:
1. Open your browser to log in with GitHub
2. Ask you to create a new project -- name it after your project (e.g. "my-app")
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
   - **`CLERK_JWT_ISSUER_DOMAIN`** -- the Issuer URL from step 11 (e.g. `https://your-app.clerk.accounts.dev`)
5. Click **Save**

---

## 13. Start the App

Run the frontend:

```powershell
pnpm dev
```

In a separate PowerShell window, start the Convex dev server:

```powershell
pnpm convex dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. You should see your app running.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `'node' is not recognized` | Close and reopen PowerShell, or run fnm setup again |
| `'pnpm' is not recognized` | Run `npm install -g pnpm` again |
| Execution policy error | Run PowerShell as Admin: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| "No address provided to ConvexReactClient" | Add `VITE_CONVEX_URL` to `.env.local` (copy the value from the `CONVEX_URL` line) |
| "needs_client_trust not supported" | Make sure you're using `@clerk/react` (v6), not `@clerk/clerk-react` (v5). Also check Clerk > Attack Protection > Bot Protection is set to **Disabled** or **CAPTCHA**. |
| Clerk sign-in not working | Double-check `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local` |
| Convex errors about auth | Verify `CLERK_JWT_ISSUER_DOMAIN` is set in Convex dashboard |
| Port 5173 already in use | Kill other dev servers or use `pnpm dev --port 3000` |
