# Continuum

**Live demo:** `https://continuum.sangamhoni.workers.dev`

> Your second brain. Dump memories, ask questions, build connections.

---

## Why Continuum?

You know that feeling when you read something interesting, save it "for later," and then completely forget about it? Or when you're working on a project and you *know* you've thought about this problem before, but you can't remember where or when?

Continuum is your second brain. It's like having a personal assistant that never forgets anything you tell it.

Here's how I use it: I'm a student working on multiple projects, reading papers, watching tutorials, having random thoughts. But it's not just academic stuff - I save poems I love, quotes that hit different, questions about my career path, random shower thoughts, articles about philosophy, music recommendations, anything that makes me think.

I used to have notes scattered everywhere - Google Docs, Notion, bookmarks, random text files. When I needed to find something, I'd spend 10 minutes searching through everything, and half the time I'd give up.

Now, I just dump everything into Continuum. That interesting article about distributed systems? Saved. A poem that made me cry? Saved. A question about whether I should switch careers? Saved. A random thought about edge computing at 2am? Saved. A quote from a book that changed how I think? Saved.

Then when I'm working on something and think "wait, didn't I read something about this?", I just ask Continuum. It searches through everything I've saved - the technical stuff, the personal stuff, the random stuff - and answers my question by citing exactly where I saved it. Every answer comes with clickable citations [1] [2] that show you the exact memory it's drawing from, so you can always trace back to the source.

But it's more than just search. Continuum builds connections between your memories. It notices patterns - "you keep coming back to topics about resilience and distributed systems" - and helps you see how your ideas connect. You can filter your questions by categories and tags, so when you ask "what have I learned about cloud computing?", it only looks at those specific memories.

Think of Continuum as a graphical version of your learning journey. Everything you've saved is connected, categorized, and ready to be questioned. Your thoughts, your research, your random ideas, your career questions, your favorite poems - all in one place, all searchable, all connected. It's your second brain, always there when you need it.

---

## 🚀 Run It From Scratch (Zero → Deployed)

> **New to all of this?** Good. This section assumes you have **never used Cloudflare, Node, or a terminal before**. Follow it top to bottom and you'll have Continuum running on your own computer and then live on the internet. No prior experience needed.

**What you'll end up with:**
- Continuum running locally at `http://localhost:8787`
- Continuum deployed to a public URL like `https://continuum.yourname.workers.dev`

**What it costs:** **$0.** Everything here runs on Cloudflare's free tier. No credit card is required to sign up or to deploy.

**Time needed:** about 15–20 minutes the first time.

---

### Step 0 — Open a terminal

You'll type commands into a **terminal** (also called a "command line"). This is normal and nothing here can break your computer.

- **macOS:** Press `Cmd + Space`, type `Terminal`, press Enter.
- **Windows:** Press the Start button, type `PowerShell`, press Enter. (Or install [Windows Terminal](https://aka.ms/terminal).)
- **Linux:** Open your usual terminal app (often `Ctrl + Alt + T`).

Everything below is typed into this window. After typing a command, press **Enter** to run it.

---

### Step 1 — Install Node.js (this also gives you `npm` and `npx`)

Continuum needs **Node.js version 18 or newer**. Node comes bundled with `npm` (installs packages) and `npx` (runs packages) — you don't install those separately.

1. Go to **https://nodejs.org** and download the **LTS** version.
2. Run the installer and click through with the default options.
3. **Close and reopen your terminal**, then verify it worked:

```bash
node --version    # should print v18.x.x or higher
npm --version     # should print a version number (9+ is fine)
```

If both print a version number, you're good. If `node` is "not recognized / not found," the installer didn't finish or you didn't reopen the terminal — reinstall and reopen.

> **Tip (optional):** Advanced users often manage Node with [nvm](https://github.com/nvm-sh/nvm) (`nvm install --lts`). You do **not** need this to continue.

---

### Step 2 — Install Git (to download the code)

1. Go to **https://git-scm.com/downloads**, download for your OS, install with defaults.
2. Reopen your terminal and verify:

```bash
git --version     # should print a version number
```

> **No-Git shortcut:** You can instead download the code as a ZIP from the GitHub page ("Code" → "Download ZIP"), unzip it, and skip the `git clone` line in Step 4. Everything else is identical.

---

### Step 3 — Create a free Cloudflare account

Continuum runs on Cloudflare. You need a (free) account.

1. Go to **https://dash.cloudflare.com/sign-up**.
2. Sign up with your email and a password. **Verify your email** when Cloudflare sends the confirmation link.
3. That's it — you do **not** need to add a domain, and you do **not** need a credit card for the free tier.

> **About Workers AI:** This project uses Cloudflare's built-in AI (for embeddings and the LLM). It's enabled automatically the first time your code calls it — there is no separate "turn on AI" button you need to click. The free tier includes a generous daily AI allowance.

---

### Step 4 — Get the code and enter the folder

In your terminal, run these one at a time:

```bash
# Download the project
git clone https://github.com/sangamhoni/continuum-serverless.git

# Move into the project folder
cd continuum-serverless
```

> If you used the ZIP shortcut from Step 2, instead `cd` into the folder you unzipped, e.g. `cd Downloads/continuum-serverless-main`.

You are now "inside" the project. Every remaining command must be run from here.

---

### Step 5 — Install the project's dependencies

This downloads everything the project needs (including the **Wrangler** tool, which is Cloudflare's command-line tool — it installs automatically, you don't install it yourself):

```bash
npm install
```

This takes a minute or two and creates a `node_modules/` folder. You only need to do this **once** (and again only if dependencies change).

---

### Step 6 — Log in to Cloudflare from your terminal

This connects your code to the Cloudflare account you made in Step 3:

```bash
npx wrangler login
```

- A **browser window opens** asking you to authorize Wrangler. Click **Allow**.
- Return to the terminal — it should say you're logged in.

Verify it worked:

```bash
npx wrangler whoami    # should print your Cloudflare account email
```

> **Headless/remote machine with no browser?** Instead create an API token at **dash.cloudflare.com → My Profile → API Tokens** (use the "Edit Cloudflare Workers" template), then set it before running commands:
> - macOS/Linux: `export CLOUDFLARE_API_TOKEN=your_token_here`
> - Windows PowerShell: `$env:CLOUDFLARE_API_TOKEN="your_token_here"`

---

### Step 7 — Run it locally

```bash
npm run dev
```

Wait for it to say it's ready, then open **http://localhost:8787** in your browser.

Try it out: click to add a memory (paste any thought or link), then ask a question in the chat. 🎉

> **Important — local mode still uses the cloud:** Even locally, the AI (embeddings + LLM) runs on Cloudflare's servers using *your* account's free tier. That's why Step 6 (login) is required even just to run locally. There is no fully offline mode.

To stop the local server, go back to the terminal and press **`Ctrl + C`**.

---

### Step 8 — Deploy it to the internet

When you're ready to put it online:

```bash
npm run deploy
```

On your **first ever deploy**, Wrangler may ask you to **register a free `workers.dev` subdomain** (e.g. `yourname`). Pick one — this becomes part of your public URL. It only asks once.

When it finishes, it prints your live URL:

```
https://continuum.<your-subdomain>.workers.dev
```

Open that URL in any browser, on any device — your second brain is now live. The Durable Objects storage migration runs **automatically** on first deploy; you don't configure anything.

---

### Step 9 — Confirm everything works

1. Visit your live URL.
2. Add a memory (e.g. paste an article link with a short note).
3. Ask a question about it in the chat — you should get an answer **with clickable `[1]` citations**.
4. Refresh the page — your memory should still be there (it's saved in your Cloudflare account).

If all four work, you've reproduced the entire project from scratch. ✅

---

### Everyday commands (after setup)

| I want to… | Run this |
| --- | --- |
| Run locally | `npm run dev` → http://localhost:8787 |
| Deploy / update the live site | `npm run deploy` |
| Watch live server logs | `npm run tail` |
| Check who I'm logged in as | `npx wrangler whoami` |
| Stop the local server | Press `Ctrl + C` in the terminal |

To push **code changes** live: edit files, save, then run `npm run deploy` again. The same URL updates in place.

---

### 🩹 Troubleshooting (common first-timer issues)

| Symptom | What's happening | Fix |
| --- | --- | --- |
| `node: command not found` / `not recognized` | Node isn't installed, or terminal wasn't reopened | Reinstall Node (Step 1) and **open a fresh terminal** |
| `npm install` fails with permission/EACCES errors | Folder permissions | Don't use `sudo`; make sure you own the folder, or re-clone into your home directory |
| Browser didn't open on `wrangler login` | No default browser / remote machine | Copy the URL it prints into a browser, or use the API-token method in Step 6 |
| `Authentication error` on deploy | Not logged in | Run `npx wrangler login` again, then `npx wrangler whoami` to confirm |
| `Address already in use` / port 8787 busy | Another `dev` server is still running | Stop it with `Ctrl + C`, or close the other terminal, then retry `npm run dev` |
| AI calls return **429 / Too Many Requests** | You hit the free-tier daily AI limit | **No charge happens** — just wait; limits reset daily. (See "Protecting Against Charges" below.) |
| Memories don't persist locally | Expected during experiments | Local storage is per-machine; deploy (Step 8) for durable cloud storage |
| Wrong Node version warning | Node older than 18 | Upgrade Node (Step 1) to the current LTS |

> **Still stuck?** Run `npm run tail` while reproducing the problem to see the live error logs — they usually say exactly what's wrong.

---

### 🧹 Tearing it down (optional)

If you want to remove your deployment later:

```bash
npx wrangler delete        # removes the Worker
```

Or go to **Cloudflare Dashboard → Workers & Pages → continuum → Settings** and delete it there. This stops all usage against your account.

---

## Quick Start (condensed reference)

> Already comfortable with Node + Cloudflare? Here's the short version. First-timers: use the **Run It From Scratch** guide above instead.

### Prerequisites

- Node.js v18+ (LTS recommended)
- npm v9+
- Cloudflare account (free tier works - configured for free plan compatibility)
- Wrangler CLI (installed automatically via npm)

### Installation

```bash
# Clone the repository
git clone https://github.com/sangamhoni/continuum-serverless.git
cd continuum-serverless

# Install dependencies
npm install

# Authenticate with Cloudflare
npx wrangler login

# Start development server
npm run dev
```

Visit `http://localhost:8787` and start building your second brain!

**⚠️ Important: Local Development Still Uses Cloudflare Services**
- Even when running locally (`npm run dev`), Continuum uses Cloudflare services:
  - **Workers AI** (embeddings & LLM) - requires your Cloudflare account
  - **Durable Objects** - data is stored in your Cloudflare account
- Local dev uses **your** Cloudflare account's free tier limits
- There is no fully local mode - Cloudflare services are required

### Deployment

```bash
npm run deploy
```

**Personal Use - Deploy Your Own Instance:**
- When you deploy, Continuum runs on **your** Cloudflare account
- All data (memories, embeddings, etc.) is stored in **your** Cloudflare Durable Objects
- This is your personal instance - deploy it to your own account for your own use
- If others want to use Continuum, they should clone and deploy their own instance

**First Deployment:**
- Wrangler will create the Worker on your Cloudflare account
- Durable Objects migration will run automatically (configured for free plan compatibility)
- Your Worker will be available at: `https://continuum.<your-subdomain>.workers.dev`
- All data is stored in your Cloudflare account - completely private to you

**Multi-User Support (Within Your Deployment):**
- If you share your deployment URL, each visitor automatically gets their own isolated Continuum
- No login required - unique user IDs are generated and stored in browser localStorage
- Complete data isolation - users cannot access each other's memories
- **⚠️ All data is stored in YOUR Cloudflare account** (you have access to all Durable Objects)
- **⚠️ All usage counts against YOUR free tier limits:**
  - Workers requests: 100,000/day, 1,000/minute (shared across all visitors)
  - Durable Objects requests: 100,000/day (shared across all visitors)
  - Workers AI: Limited free tier (shared across all visitors)
- **✅ Protection**: Free tier won't charge you - exceeding limits returns 429 errors (no charges)
- **📊 Monitor**: Check Cloudflare Dashboard → Workers → Metrics to track usage
- **🔔 Alerts**: Usage notifications enabled by default - you'll be notified of spikes
- **For personal use, deploy your own instance to your own Cloudflare account**

**Verify Deployment:**
1. Visit your Worker URL
2. Open browser DevTools → Application → Local Storage
3. Verify `continuum_user_id` is created automatically
4. Add a memory and verify it persists
5. Open in incognito window to test multi-user isolation

---

## Technology & Why

### Cloudflare Workers + Durable Objects

I chose Cloudflare Workers because I wanted something that scales automatically and runs at the edge - fast responses no matter where you are. Durable Objects give me per-user isolation and strong consistency, which is perfect for personal data. Each user gets their own "brain" that never mixes with others.

**Personal Deployment:**
- When you deploy, all data is stored in **your** Cloudflare account
- Durable Objects are created in your account - you own and control all the data
- Perfect for personal use - deploy your own instance for your own second brain
- **Each person should deploy to their own Cloudflare account** to avoid sharing free tier limits

**How Multi-User Isolation Works (Within Your Deployment):**
- Each visitor gets a unique user ID stored in their browser's localStorage
- The user ID is automatically sent in API requests via Authorization headers
- Backend routes each user ID to their own Durable Object instance
- Complete isolation - no cross-user data access possible
- All Durable Objects are stored in your Cloudflare account

### Workers AI

Cloudflare's Workers AI lets me run embeddings and LLM inference right at the edge, no external API calls needed. I'm using:
- **BGE embeddings** for semantic search - finds memories by meaning, not just keywords
- **Llama 3.3 70B** for understanding, classification, and synthesis - it reads your memories and helps you think through them

### Why This Stack?

I wanted something that:
- Works out of the box (no database setup, no API keys to manage)
- Scales automatically (handles one user or a million)
- Is fast (edge computing means low latency)
- Is affordable (Cloudflare's free tier is generous)
- Keeps your data private (each user's data is completely isolated)

---

## Features

### 🧠 Save Anything

Dump your thoughts, articles, URLs, questions, or random ideas into your second brain. Continuum automatically categorizes them and extracts key concepts. You can add your own context - "why am I saving this?" - to help you remember later.

### 💬 Ask Questions with Citations

Ask anything about your saved memories. "What patterns do you notice in my interests?" "Summarize everything I know about distributed systems." "What did I think about edge computing?" Continuum searches through everything you've saved and answers by citing the exact memories it's drawing from. Every answer includes clickable citations [1] [2] that expand to show you the source memory - date, content, and context. You can always see where the answer came from.

### 🔗 Smart Linking

When you save something new, Continuum finds related memories and suggests connections. It notices when you're thinking about similar topics and helps you build a web of connected ideas. Your second brain sees the connections you might miss.

### 🏷️ Categories & Tags

Everything is automatically categorized, but you can customize. Filter your questions by specific categories or tags - ask "what have I learned about technology?" and it only searches those memories. Your sidebar shows all your categories with counts, so you can see what you're thinking about most.

### 📚 Memory Archive

Browse everything you've saved in a beautiful timeline view. Filter by type, category, date, or search by keywords. Click any memory to see its full content, related memories, and the concepts Continuum extracted from it. It's like browsing through your own mind.

### 🔍 Your Semantic Search

This isn't keyword search - it's semantic, personalized to you. Ask "what did I learn about state management?" and it finds memories about Durable Objects, databases, caching, even if you never used those exact words. It understands meaning, not just text matching. Your second brain gets what you mean.

But here's the powerful part: you can filter your search by categories and tags. Want to know what you've learned about technology? Filter by the "technology" category. Curious about your career thoughts? Filter by "career" or "work" tags. Your search becomes a reflection of your interests - when you filter by specific categories and tags, Continuum only searches through those memories, giving you answers tailored to that part of your personality. Your second brain adapts to what you want to explore.

### 🎯 Filtered Questions

Want to ask about a specific topic? Select categories and tags before asking your question. Continuum will only search through those filtered memories, giving you focused answers about exactly what you want to explore. Your second brain can focus on what matters, customized to your interests and personality.

---

## How It Works

1. **Save memories** - Paste content, add context, tag it. Continuum classifies it and extracts concepts.
2. **Build understanding** - Everything gets embedded into a semantic space, so similar ideas are close together.
3. **Ask questions** - Your questions get embedded too, then Continuum finds the most relevant memories.
4. **Get answers** - The AI synthesizes an answer from your memories, citing exactly where each piece came from.

**Deployment & Data Storage:**
- Deploy to your own Cloudflare account - all data is stored in your account
- Each visitor to your deployment gets a unique user ID (stored in browser localStorage)
- User ID is sent with every API request via Authorization header
- Backend routes to user-specific Durable Object for complete isolation
- All Durable Objects are stored in your Cloudflare account - you own the data

**Cost & Usage Protection:**
- ✅ **Free tier is FREE** - You won't be charged unless you explicitly upgrade to paid plan
- ⚠️ Free tier limits: 100K Workers requests/day, 1K requests/minute, 100K Durable Objects requests/day
- ⚠️ If limits are exceeded, requests return 429 (Too Many Requests) errors - **no charges**
- ⚠️ Public deployment uses your Cloudflare account's free tier for ALL visitors
- 📊 **Monitor usage**: Cloudflare Dashboard → Workers → Your Worker → Metrics
- 🔔 **Usage notifications**: Enabled by default - you'll get alerts if usage spikes
- 💡 **For LinkedIn demo**: Free tier should handle moderate traffic, but monitor usage
- 💡 **If traffic spikes**: Cloudflare will return 429 errors (no charges), service resumes next day

Everything runs on Cloudflare's edge network - fast, private, and scalable. Deploy your own instance for your personal use.

---

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Deploy
npm run deploy

# View logs
npm run tail
```

---

## Protecting Against Charges (For Public Demos)

If you're sharing your deployment publicly (e.g., LinkedIn demo), here's how to stay safe:

### ✅ Free Tier Protection
- **Cloudflare free tier is FREE** - You won't be charged unless you explicitly upgrade
- If you exceed limits, requests return 429 errors - **no charges occur**
- Limits reset daily (100K requests/day)

### 📊 Monitor Usage
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → Your Worker
3. Click **Metrics** tab to see:
   - Request count (daily/minute)
   - CPU time
   - Errors (429 = rate limited)
4. Set up custom alerts if needed

### 🔔 Usage Notifications
- **Enabled by default** - You'll receive email notifications for:
  - Weekly usage summaries
  - CPU usage spikes (25% above 7-day average)
- Check notifications in Cloudflare Dashboard → Notifications

### ⚠️ What Happens When Limits Are Exceeded
- **Workers**: Returns 429 (Too Many Requests) - no charges
- **Durable Objects**: Returns 429 - no charges  
- **Service resumes**: Limits reset at midnight UTC
- **No billing impact**: Free tier stays free

### 💡 Best Practices for Public Demos
1. **Monitor first few days** - Check usage patterns
2. **Set up alerts** - Get notified of unusual spikes
3. **Add disclaimer** - Mention it's a demo with free tier limits
4. **Consider**: For high-traffic demos, ask users to deploy their own instance

### 🚨 If You're Worried About Traffic
- Free tier handles ~100K requests/day (roughly 1,200 requests/hour)
- For a demo, this is usually sufficient
- If traffic spikes, Cloudflare protects you (429 errors, no charges)
- You can always add a note: "Demo - deploy your own instance for unlimited use"

---

*Built with ❤️ using Cloudflare Workers, Durable Objects, and Workers AI*
