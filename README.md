# Anti-Phishing OA (Demo)

A demo chat UI that mimics the **Zalo Official Account** chat experience. It shows how an anti-fraud bot would look and behave if implemented as a real Zalo OA:

- User forwards a suspicious message or a screenshot (chat, SMS, bank transfer, QR code, job offer, etc.)
- The bot (backed by Groq) analyzes it and replies with a clear verdict:
  - ⚠️ **CÓ DẤU HIỆU LỪA ĐẢO** (likely fraud)
  - ✅ **CÓ VẺ AN TOÀN** (looks safe)
  - ❓ **CHƯA ĐỦ THÔNG TIN** (not enough info)
- Plus a short explanation and recommended next steps, in Vietnamese.
- A message that's **just a link** (no other text, no image) is checked instantly against [Google Safe Browsing](https://developers.google.com/safe-browsing) instead of going through the AI - faster and authoritative for known-bad URLs.

This build is a **standalone Next.js app** (not yet wired to the real Zalo OA API/webhook) — it's meant to demonstrate the intended look, flow, and AI response quality before building the production Zalo OA integration (OAuth token exchange, webhook signature verification, message sending via Zalo's Send API).

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in GROQ_API_KEY (and optionally GOOGLE_SAFE_BROWSING_API_KEY)
npm run dev
```

## Deploy

Deploy as a normal Next.js project on [Vercel](https://vercel.com/new). Set the `GROQ_API_KEY` environment variable in the project settings (and `GOOGLE_SAFE_BROWSING_API_KEY` if you want the link fast-path enabled - without it, link-only messages just fall back to the AI pipeline).

## Stack

- Next.js (App Router)
- [Groq](https://console.groq.com) `groq/compound-mini` (web search) and `qwen/qwen3.6-27b` (vision) for fraud classification
- [Google Safe Browsing API](https://developers.google.com/safe-browsing) for instant link-only checks
- Plain CSS styled to resemble the Zalo chat UI
