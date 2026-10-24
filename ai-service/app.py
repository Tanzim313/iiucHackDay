"""Flask microservice that grounds Gemma answers in campus notices."""

from __future__ import annotations

import os

import requests
from flask import Flask, jsonify, request

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:1b")
OLLAMA_TIMEOUT_SECONDS = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "45"))

NOTICE_AI_SYSTEM_PROMPT = """\
You are an expert AI assistant for university students (such as at IIUC).
Analyze the provided university campus notice and extract structured, actionable information.

Please structure your response clearly with:
1. **Short Summary:** A clear 2-3 sentence summary of what the notice is about.
2. **Key Deadlines / Dates:** Exact dates, times, and deadlines mentioned (if any).
3. **Target Audience:** Who this notice is for (e.g., CSE 8th semester, all students, female hall residents).
4. **Action Items:** What students need to do next.

Keep the language clear, concise, and helpful for students. Use the same language as the notice.
Only use information stated in the notice. Do not guess missing dates, audiences, or actions; write "Not mentioned" when the notice does not say.
"""


def ask_ollama(system_prompt, user_prompt):
    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/chat",
        json={
            "model": OLLAMA_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "stream": False,
            "options": {"temperature": 0.2},
        },
        timeout=OLLAMA_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    answer = response.json().get("message", {}).get("content", "").strip()
    if not answer:
        raise ValueError("Ollama returned an empty answer")
    return answer


@app.get("/health")
def health():
    return jsonify({"status": "ok", "model": OLLAMA_MODEL})


@app.post("/analyze")
def analyze_notice():
    payload = request.get_json(silent=True) or {}
    notice_text = payload.get("notice_text")
    if not isinstance(notice_text, str) or not notice_text.strip():
        return jsonify({"error": "notice_text is required"}), 400

    try:
        analysis = ask_ollama(NOTICE_AI_SYSTEM_PROMPT, notice_text.strip())
        return jsonify({"analysis": analysis, "model": OLLAMA_MODEL})
    except requests.RequestException:
        app.logger.exception("Could not reach the configured Ollama service")
        return jsonify({"error": "AI model is unavailable"}), 503
    except (ValueError, AttributeError):
        app.logger.exception("Ollama returned an invalid response")
        return jsonify({"error": "AI model returned an invalid response"}), 502


@app.post("/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    question = payload.get("question")
    notices = payload.get("notices", [])
    if not isinstance(question, str) or not question.strip():
        return jsonify({"error": "question is required"}), 400
    if not isinstance(notices, list):
        return jsonify({"error": "notices must be a list"}), 400

    context = "\n\n".join(
        f"[{notice.get('id', 'unknown')}] {notice.get('title', 'Untitled')} | "
        f"{notice.get('date', '')} | {notice.get('department', '')}\n"
        f"{notice.get('content') or notice.get('summary', '')}"
        for notice in notices[:8]
        if isinstance(notice, dict)
    )
    messages = [
        {
            "role": "system",
            "content": (
                "তুমি Campus Notice Navigator-এর সহকারী। কেবল দেওয়া ক্যাম্পাস নোটিশের তথ্য থেকে "
                "উত্তর দাও এবং ব্যবহারকারীর ভাষায় সংক্ষেপে লেখো। তথ্য না থাকলে তা স্পষ্ট করে বলো; "
                "তারিখ, নিয়ম বা তথ্য বানিয়ে বলবে না। প্রাসঙ্গিক নোটিশের ID উল্লেখ করো।"
            ),
        },
        {
            "role": "user",
            "content": f"নোটিশ:\n{context or 'কোনো নোটিশ দেওয়া হয়নি।'}\n\nপ্রশ্ন: {question.strip()}",
        },
    ]

    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={"model": OLLAMA_MODEL, "messages": messages, "stream": False, "options": {"temperature": 0.2}},
            timeout=OLLAMA_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        answer = response.json().get("message", {}).get("content", "").strip()
        if not answer:
            return jsonify({"error": "model returned an empty answer"}), 502
        return jsonify({"answer": answer, "model": OLLAMA_MODEL})
    except requests.RequestException:
        app.logger.exception("Could not reach the configured Ollama service")
        return jsonify({"error": "AI model is unavailable"}), 503
    except (ValueError, AttributeError):
        app.logger.exception("Ollama returned an invalid response")
        return jsonify({"error": "AI model returned an invalid response"}), 502


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("AI_SERVICE_PORT", "5001")), debug=False)
