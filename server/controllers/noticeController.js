import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const noticesPath = fileURLToPath(new URL("../../data/sample_notices.json", import.meta.url));
const aiServiceUrl = (process.env.AI_SERVICE_URL || "http://127.0.0.1:5001").replace(/\/$/, "");

async function loadNotices() {
  const raw = await readFile(noticesPath, "utf8");
  const notices = JSON.parse(raw);
  if (!Array.isArray(notices)) throw new Error("Notice data must be a JSON list");
  return notices;
}

function isExpired(notice) {
  return Boolean(notice.expiry_date && notice.expiry_date < new Date().toISOString().slice(0, 10));
}

function sortNotices(notices) {
  return notices.sort((a, b) => {
    const priority = Number(b.priority === "high") - Number(a.priority === "high");
    return priority || (b.date || "").localeCompare(a.date || "");
  });
}

export async function getNotices(req, res, next) {
  try {
    const all = await loadNotices();
    const includeExpired = req.query.includeExpired === "true";
    const query = String(req.query.q || "").trim().toLocaleLowerCase();
    const category = String(req.query.category || "").trim();
    const notices = sortNotices(all.filter((notice) => {
      if (!includeExpired && isExpired(notice)) return false;
      if (category && notice.category !== category) return false;
      if (!query) return true;
      const fields = [notice.title, notice.summary, notice.content, notice.department, ...(notice.tags || [])];
      return fields.join(" ").toLocaleLowerCase().includes(query);
    }));
    res.json({
      notices,
      categories: [...new Set(all.map((notice) => notice.category).filter(Boolean))].sort(),
      total: notices.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function getNotice(req, res, next) {
  try {
    const notices = await loadNotices();
    const notice = notices.find((item) => item.id === req.params.id);
    if (!notice) return res.status(404).json({ error: "Notice not found" });
    return res.json({ notice });
  } catch (error) {
    return next(error);
  }
}

function terms(text) {
  return new Set((text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter((word) => word.length > 1));
}

function relevantNotices(question, notices) {
  const questionTerms = terms(question);
  return notices
    .filter((notice) => !isExpired(notice))
    .map((notice) => {
      const text = [notice.title, notice.summary, notice.content, ...(notice.tags || [])].join(" ");
      const score = [...questionTerms].filter((word) => terms(text).has(word)).length;
      return { notice, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || (b.notice.date || "").localeCompare(a.notice.date || ""))
    .slice(0, 5)
    .map(({ notice }) => notice);
}

function fallbackAnswer(notices) {
  if (!notices.length) {
    return "দুঃখিত, আপনার প্রশ্নের সঙ্গে মেলে এমন সক্রিয় নোটিশ পাওয়া যায়নি। অন্য শব্দে খুঁজে দেখুন।";
  }
  const items = notices.slice(0, 3).map((notice) =>
    `• **${notice.title}** (${notice.id}, ${notice.date})\n  ${notice.summary || notice.content}`,
  );
  return `প্রাসঙ্গিক নোটিশ থেকে পাওয়া তথ্য:\n\n${items.join("\n\n")}\n\nআরও নির্দিষ্ট তথ্য জানতে নোটিশের বিষয় উল্লেখ করে প্রশ্ন করুন।`;
}

export async function askAssistant(req, res, next) {
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  if (!question) return res.status(400).json({ error: "question is required" });

  try {
    const notices = await loadNotices();
    const matches = relevantNotices(question, notices);
    try {
      const response = await fetch(`${aiServiceUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, notices: matches }),
        signal: AbortSignal.timeout(50000),
      });
      const result = await response.json();
      if (!response.ok || typeof result.answer !== "string") throw new Error("AI service unavailable");
      return res.json({ answer: result.answer, usedAI: true });
    } catch {
      return res.json({ answer: fallbackAnswer(matches), usedAI: false });
    }
  } catch (error) {
    return next(error);
  }
}
