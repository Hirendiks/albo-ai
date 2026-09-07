# 🚀 Albo AI - Free Production Deployment Guide ($0 / Month Forever)

This guide walks you through deploying **Albo AI** to production on **Vercel** with **Upstash Redis** for multi-user cloud synchronization with **$0 monthly cost forever**.

---

## 🏗️ Architecture Overview

| Component | Service | Cost | Quota / Tier |
| :--- | :--- | :--- | :--- |
| **Hosting & API** | [Vercel](https://vercel.com) (Hobby) | **$0 / mo** | 100 GB bandwidth, 1M function calls, auto-SSL, instant worldwide CDN |
| **Cloud Database** | [Upstash Redis](https://upstash.com) | **$0 / mo** | 10,000 commands/day free forever (no credit card required) |
| **AI Extraction** | [Google Gemini 2.0 Flash](https://aistudio.google.com) | **$0 / mo** | 1,500 requests/day free forever |

---

## 📋 Step 1: Push Your Code to GitHub

1. Install [Git for Windows](https://git-scm.com/download/win) if you haven't already.
2. Open a terminal in this project folder and run:
   ```bash
   git init
   git add .
   git commit -m "Deploy: Albo AI production release"
   git branch -M main
   ```
3. Create a new repository on [GitHub](https://github.com/new) named `albo-ai`.
4. Link and push your repository:
   ```bash
   git remote add origin https://github.com/<YOUR-USERNAME>/albo-ai.git
   git push -u origin main
   ```

---

## 🔑 Step 2: Get Your Free API Keys

### 1. Upstash Redis (For Multi-User Cloud Storage)
1. Go to [upstash.com](https://upstash.com) and sign in with GitHub or Google.
2. Click **Create Database**:
   - Type: **Redis**
   - Plan: **Free** ($0 / month)
   - Region: Select any region close to your users.
3. Once created, scroll down to the **REST API** section and copy:
   - `UPSTASH_REDIS_REST_URL` (starts with `https://...`)
   - `UPSTASH_REDIS_REST_TOKEN` (long token string)

### 2. Google Gemini API Key (For AI Analysis & Summarization)
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click **Create API key**.
3. Copy your key.

---

## ⚡ Step 3: Deploy to Vercel in 2 Minutes

1. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **"Add New..."** → **"Project"**.
3. Select your `albo-ai` repository and click **"Import"**.
4. In the **Environment Variables** section, paste the keys:
   - `GEMINI_API_KEY` = *(your Gemini key from Step 2)*
   - `UPSTASH_REDIS_REST_URL` = *(your Upstash REST URL from Step 2)*
   - `UPSTASH_REDIS_REST_TOKEN` = *(your Upstash REST token from Step 2)*
5. Click **"Deploy"**!

Vercel will build the project in ~45 seconds and give you a live production URL (e.g. `https://albo-ai.vercel.app`).

---

## 👥 How It Behaves For Users

- **Visitors / Guests**: View the interactive showcase cards.
- **Signed-in Users**:
  - Sign in with any Google account or Gmail address.
  - Their account starts **completely clean (0 items)** without demo data.
  - When they save links, videos, and articles, they are instantly backed up to Upstash and synced across their phones, tablets, and computers.
- **Offline / Local Fallback**: If internet connection drops, changes are cached locally in the browser and synced when reconnected.

---

## 🛠️ Local Development

To run locally:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
