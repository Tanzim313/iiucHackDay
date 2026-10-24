# iiucHackDay
# Campus Notice Navigator

ক্যাম্পাসের ঘোষণা, পরীক্ষার সময়সূচি, পরিবহন আপডেট ও ইভেন্ট এক জায়গায় খুঁজে পাওয়ার জন্য React, Express এবং Flask দিয়ে তৈরি একটি AI-সহায়ক নোটিশ নেভিগেটর। শিক্ষার্থীরা বিভাগ বা কীওয়ার্ড দিয়ে নোটিশ ফিল্টার করতে পারে এবং বাংলায় বা ইংরেজিতে প্রশ্ন করতে পারে।

## বৈশিষ্ট্য

- Vite ও Tailwind CSS-ভিত্তিক responsive React frontend
- Express REST API-তে নোটিশ তালিকা, বিভাগ ও একক নোটিশ
- Flask AI microservice থেকে স্থানীয় Ollama/Gemma-ভিত্তিক উত্তর
- AI সার্ভিস না থাকলে Express-এর local notice-search fallback
- জরুরি নোটিশ, বিভাগ ও মেয়াদ অনুযায়ী filter
- নমুনা নোটিশ `data/sample_notices.json`-এ রাখা হয়েছে

## প্রয়োজনীয় সফটওয়্যার

- Node.js `20.19+` অথবা `22.12+`
- Python `3.10` বা নতুন
- AI উত্তর চালাতে [Ollama](https://ollama.com/) ঐচ্ছিক; এটি ছাড়া নোটিশ খোঁজা ও fallback উত্তর চলবে

## চালানোর নিয়ম

প্রতিটি সার্ভিস আলাদা terminal-এ চালু রাখুন। সব কমান্ড project root থেকে চালানো যাবে।

### 1. Express API

```bash
cd server
npm install
npm run dev
```

API চলবে `http://127.0.0.1:4000`-এ।

### 2. Flask AI service

```bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r ai-service/requirements.txt
python ai-service/app.py
```

AI service চলবে `http://127.0.0.1:5001`-এ। Gemma দিয়ে উত্তর চালাতে Ollama চালু করে মডেলটি নামান:

```bash
ollama pull gemma3:1b
```

`OLLAMA_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_TIMEOUT_SECONDS`, `AI_SERVICE_PORT` environment variable দিয়ে AI service কনফিগার করা যায়। Express-এর `AI_SERVICE_URL` এবং `PORT`-ও বদলানো যায়।

### 3. React frontend

```bash
cd client
npm install
npm run dev
```

Vite-এর development proxy `/api` অনুরোধ Express API-তে পাঠায়। টার্মিনালে দেখানো frontend URL খুলুন। Production bundle বানাতে `client/`-এ গিয়ে `npm run build` চালান।

## API

- `GET /api/health` — Express status
- `GET /api/notices` — সক্রিয় নোটিশ ও বিভাগ
- `GET /api/notices?includeExpired=true` — মেয়াদোত্তীর্ণ নোটিশসহ তালিকা
- `GET /api/notices/:id` — ID অনুযায়ী নোটিশ
- `POST /api/chat` — `{ "question": "..." }` পাঠিয়ে নোটিশভিত্তিক উত্তর
- Flask `GET /health` এবং `POST /chat` — AI microservice endpoints

## প্রকল্প কাঠামো

```text
client/       React + Vite + Tailwind frontend
server/       Express API, routes ও notice controller
ai-service/   Flask microservice এবং Ollama/Gemma সংযোগ
data/         নমুনা notice JSON
```

`data/sample_notices.json`-এর তথ্য ডেমোর জন্য। বাস্তবে ব্যবহারের আগে সংশ্লিষ্ট বিশ্ববিদ্যালয় দপ্তরের যাচাইকৃত নোটিশ দিয়ে এটি প্রতিস্থাপন করুন।
