import { useEffect, useMemo, useState } from "react";

const categoryIcons = {
  "পরীক্ষা": "✳",
  "লাইব্রেরি": "▤",
  "পরিবহন": "↗",
  "বৃত্তি": "◇",
  "ইভেন্ট": "✦",
};

function formatDate(value) {
  if (!value) return "তারিখ নেই";
  return new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "short" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function NoticeCard({ notice }) {
  const urgent = notice.priority === "high";
  return (
    <article className="group rounded-2xl border border-[#e6ece7] bg-white p-5 shadow-[0_8px_28px_rgba(24,51,45,0.035)] transition hover:-translate-y-0.5 hover:border-[#c8ddd0] hover:shadow-[0_14px_35px_rgba(24,51,45,0.08)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${urgent ? "bg-[#fff0e9] text-[#b5542b]" : "bg-[#edf5ef] text-[#4a7763]"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${urgent ? "bg-[#e27a4e]" : "bg-[#74a78a]"}`} />
          {urgent ? "জরুরি নোটিশ" : notice.category}
        </span>
        <span className="shrink-0 text-xs font-medium text-[#8a9b91]">{formatDate(notice.date)}</span>
      </div>
      <h3 className="text-[17px] font-bold leading-7 text-[#1a3830]">{notice.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#718078]">{notice.summary}</p>
      <div className="mt-5 flex items-center justify-between border-t border-[#edf1ee] pt-4">
        <span className="truncate pr-3 text-xs font-medium text-[#8a9b91]">{notice.department}</span>
        <span className="shrink-0 text-[11px] font-semibold tracking-wide text-[#a2afa7]">{notice.id}</span>
      </div>
    </article>
  );
}

function App() {
  const [notices, setNotices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("সব নোটিশ");
  const [showExpired, setShowExpired] = useState(false);
  const [section, setSection] = useState("notices");
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "আসসালামু আলাইকুম! ক্যাম্পাসের নোটিশ নিয়ে যেকোনো প্রশ্ন করুন।" },
  ]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/notices?includeExpired=${showExpired}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("নোটিশ সার্ভার থেকে উত্তর পাওয়া যায়নি।");
        return response.json();
      })
      .then((data) => {
        setNotices(data.notices || []);
        setCategories(data.categories || []);
        setApiError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setApiError(error.message || "সার্ভারের সঙ্গে সংযোগ করা যায়নি।");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [showExpired]);

  const visibleNotices = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return notices.filter((notice) => {
      const categoryMatch = activeCategory === "সব নোটিশ" || notice.category === activeCategory;
      const text = [notice.title, notice.summary, notice.content, notice.department, ...(notice.tags || [])]
        .join(" ").toLocaleLowerCase();
      return categoryMatch && (!needle || text.includes(needle));
    });
  }, [notices, search, activeCategory]);

  async function sendQuestion(event) {
    event.preventDefault();
    const submitted = question.trim();
    if (!submitted || asking) return;
    setQuestion("");
    setMessages((current) => [...current, { role: "user", content: submitted }]);
    setAsking(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: submitted }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "উত্তর পাওয়া যায়নি।");
      setMessages((current) => [...current, {
        role: "assistant",
        content: data.answer,
        source: data.usedAI ? "Gemma AI" : "নোটিশ অনুসন্ধান",
      }]);
    } catch (error) {
      setMessages((current) => [...current, {
        role: "assistant",
        content: error.message || "সার্ভারের সঙ্গে সংযোগ করা যায়নি।",
      }]);
    } finally {
      setAsking(false);
    }
  }

  const urgentCount = notices.filter((notice) => notice.priority === "high").length;

  return (
    <div className="min-h-screen bg-[#f5f7f5] text-[#18332d]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[250px] shrink-0 flex-col border-r border-[#e7ece8] bg-[#fbfcfb] px-5 py-7 lg:flex">
          <div className="flex items-center gap-3 px-2">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dff0e5] text-xl text-[#327356]">✳</div>
            <div>
              <p className="text-sm font-extrabold tracking-tight">Campus Notice</p>
              <p className="text-[11px] font-medium text-[#8a9b91]">NAVIGATOR</p>
            </div>
          </div>

          <div className="mt-12 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#9aa79f]">মেনু</div>
          <nav className="mt-3 space-y-1">
            <button onClick={() => setSection("notices")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${section === "notices" ? "bg-[#eaf3ed] text-[#276647]" : "text-[#74837a] hover:bg-[#f0f4f1]"}`}>
              <span className="text-base">▤</span> নোটিশ বোর্ড
            </button>
            <button onClick={() => setSection("assistant")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${section === "assistant" ? "bg-[#eaf3ed] text-[#276647]" : "text-[#74837a] hover:bg-[#f0f4f1]"}`}>
              <span className="text-base">✧</span> AI সহকারী
            </button>
          </nav>

          <div className="mt-10 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#9aa79f]">নোটিশের বিভাগ</div>
          <nav className="mt-3 space-y-1">
            <button onClick={() => setActiveCategory("সব নোটিশ")} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${activeCategory === "সব নোটিশ" ? "font-semibold text-[#28684a]" : "text-[#74837a] hover:bg-[#f0f4f1]"}`}>
              <span className="flex items-center gap-3"><span>⌂</span> সব নোটিশ</span><span className="text-xs text-[#9aa79f]">{notices.length}</span>
            </button>
            {categories.map((category) => (
              <button key={category} onClick={() => setActiveCategory(category)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${activeCategory === category ? "font-semibold text-[#28684a]" : "text-[#74837a] hover:bg-[#f0f4f1]"}`}>
                <span className="w-4 text-center">{categoryIcons[category] || "·"}</span>{category}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl bg-[#eaf3ed] p-4">
            <div className="text-lg">🌱</div>
            <p className="mt-2 text-sm font-bold text-[#315c44]">ক্যাম্পাসে আপডেট থাকুন</p>
            <p className="mt-1 text-xs leading-5 text-[#718b79]">গুরুত্বপূর্ণ নোটিশগুলো এক জায়গায়, সহজে খুঁজে নিন।</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="lg:hidden">
              <p className="text-sm font-extrabold">Campus Notice Navigator</p>
            </div>
            <div className="hidden text-sm text-[#84938a] lg:block">শিক্ষার্থী পোর্টাল <span className="mx-2 text-[#c5cec8]">/</span> <span className="font-semibold text-[#435b4e]">{section === "notices" ? "নোটিশ বোর্ড" : "AI সহকারী"}</span></div>
            <div className="flex w-full items-center gap-3 sm:w-auto">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#e4eae5] bg-white px-3.5 py-2.5 text-[#94a198] shadow-sm sm:w-[260px] sm:flex-none">
                <span>⌕</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="নোটিশ খুঁজুন..." className="w-full bg-transparent text-sm text-[#30483c] outline-none placeholder:text-[#a4afa8]" aria-label="নোটিশ খুঁজুন" />
                <kbd className="hidden rounded border border-[#edf0ed] px-1.5 py-0.5 text-[10px] sm:inline">⌘ K</kbd>
              </label>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dcece1] text-sm font-bold text-[#3e7757]">II</div>
            </div>
          </header>

          <section className="relative mb-7 overflow-hidden rounded-[26px] bg-[#174f40] px-6 py-7 text-white sm:px-9 sm:py-9">
            <div className="absolute -right-10 -top-24 h-72 w-72 rounded-full border border-white/10" />
            <div className="absolute -right-2 -top-16 h-56 w-56 rounded-full border border-white/10" />
            <div className="relative max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#d2e9dc]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#b1e4bd]" /> ক্যাম্পাসের সব আপডেট এক জায়গায়
              </div>
              <h1 className="text-2xl font-bold leading-tight sm:text-[32px]">ক্যাম্পাসে কী চলছে?</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#c4dbd0] sm:text-[15px]">নোটিশ খুঁজুন, গুরুত্বপূর্ণ তারিখ জানুন, অথবা AI সহকারীকে সরাসরি প্রশ্ন করুন।</p>
              <button onClick={() => setSection("assistant")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ccebd4] px-4 py-2.5 text-sm font-bold text-[#1c513c] transition hover:bg-white">
                AI সহকারীকে জিজ্ঞেস করুন <span>↗</span>
              </button>
            </div>
            <div className="absolute bottom-0 right-8 hidden h-[88%] w-56 items-end justify-center sm:flex">
              <div className="relative mb-[-18px] grid h-40 w-40 place-items-center rounded-full bg-[#2c7058] text-7xl shadow-[0_0_0_16px_rgba(255,255,255,.04)]">📣</div>
            </div>
          </section>

          <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="rounded-2xl border border-[#e7ece8] bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#829188]">সক্রিয় নোটিশ</span><span className="text-[#7ea88c]">▤</span></div>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#234436]">{loading ? "—" : notices.length}</p>
              <p className="mt-1 text-[11px] text-[#a0aaa3]">বর্তমানে প্রাসঙ্গিক</p>
            </div>
            <div className="rounded-2xl border border-[#e7ece8] bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#829188]">জরুরি আপডেট</span><span className="text-[#d68d66]">◉</span></div>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#234436]">{loading ? "—" : urgentCount}</p>
              <p className="mt-1 text-[11px] text-[#a0aaa3]">গুরুত্ব দিয়ে দেখুন</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-[#e7ece8] bg-white p-4 sm:col-span-1 sm:p-5">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#829188]">নোটিশ বিভাগ</span><span className="text-[#7ea88c]">◇</span></div>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#234436]">{loading ? "—" : categories.length}</p>
              <p className="mt-1 text-[11px] text-[#a0aaa3]">এক নজরে সব বিষয়</p>
            </div>
          </section>

          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#91a096]">YOUR CAMPUS, UPDATED</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#1d3a30]">{section === "notices" ? "সাম্প্রতিক নোটিশ" : "AI সহকারীর সঙ্গে কথা বলুন"}</h2>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#7c8c82]">
              <input type="checkbox" checked={showExpired} onChange={(event) => setShowExpired(event.target.checked)} className="accent-[#35785a]" /> পুরোনো নোটিশও দেখান
            </label>
          </div>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {["সব নোটিশ", ...categories].map((category) => (
              <button key={category} onClick={() => setActiveCategory(category)} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold ${activeCategory === category ? "bg-[#246348] text-white" : "bg-white text-[#75867b] ring-1 ring-[#e7ece8]"}`}>{category}</button>
            ))}
            <button onClick={() => setSection("assistant")} className="shrink-0 rounded-full bg-[#eaf3ed] px-3.5 py-2 text-xs font-semibold text-[#276647]">✧ AI সহকারী</button>
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.8fr)]">
            <section className={section === "assistant" ? "order-2 xl:order-1" : ""}>
              {apiError && <div className="mb-4 rounded-xl border border-[#f0d6c9] bg-[#fff5f0] p-4 text-sm text-[#9a5435]">{apiError} Express API চালু আছে কি না দেখুন।</div>}
              {loading ? (
                <div className="rounded-2xl border border-[#e7ece8] bg-white p-8 text-center text-sm text-[#829188]">নোটিশ লোড হচ্ছে…</div>
              ) : visibleNotices.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {visibleNotices.map((notice) => <NoticeCard key={notice.id} notice={notice} />)}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#dce5de] bg-white p-10 text-center">
                  <div className="text-3xl">⌕</div><p className="mt-3 font-bold text-[#456453]">কোনো নোটিশ পাওয়া যায়নি</p><p className="mt-1 text-sm text-[#8b9a90]">অন্য শব্দ বা বিভাগ দিয়ে খুঁজে দেখুন।</p>
                </div>
              )}
            </section>

            <section className={`overflow-hidden rounded-2xl border border-[#e5ebe6] bg-white shadow-[0_8px_28px_rgba(24,51,45,0.035)] ${section === "assistant" ? "order-1 ring-2 ring-[#b8d7c2] xl:order-2" : ""}`}>
              <div className="flex items-center gap-3 border-b border-[#edf1ee] px-5 py-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e4f2e8] text-xl text-[#3b7b57]">✧</div>
                <div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-[#254436]">Campus AI সহকারী</h3><p className="mt-0.5 text-[11px] text-[#92a096]">নোটিশ থেকে উত্তর · বাংলা ও English</p></div>
                <span className="rounded-full bg-[#eef6ef] px-2.5 py-1 text-[10px] font-bold text-[#5a8b68]">LOCAL AI</span>
              </div>
              <div className="flex h-[330px] flex-col gap-3 overflow-y-auto bg-[#fbfcfb] p-4">
                {messages.map((message, index) => (
                  <div key={`${index}-${message.role}`} className={`max-w-[90%] rounded-2xl px-3.5 py-3 text-[13px] leading-6 ${message.role === "user" ? "self-end rounded-br-md bg-[#23634a] text-white" : "self-start rounded-bl-md border border-[#e8eee9] bg-white text-[#53665a]"}`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.source && <p className={`mt-2 text-[10px] ${message.role === "user" ? "text-white/60" : "text-[#93a096]"}`}>সূত্র: {message.source}</p>}
                  </div>
                ))}
                {asking && <div className="self-start rounded-2xl rounded-bl-md border border-[#e8eee9] bg-white px-4 py-3 text-xs text-[#819087]">নোটিশ দেখে উত্তর তৈরি করছি…</div>}
              </div>
              <form onSubmit={sendQuestion} className="border-t border-[#edf1ee] bg-white p-3">
                <div className="flex items-center gap-2 rounded-xl border border-[#e6ece7] bg-[#fbfcfb] p-1.5 pl-3 focus-within:border-[#98c2a4]">
                  <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="আপনার প্রশ্ন লিখুন..." className="min-w-0 flex-1 bg-transparent py-2 text-xs text-[#30483c] outline-none placeholder:text-[#a0aaa3]" aria-label="AI সহকারীকে প্রশ্ন করুন" />
                  <button disabled={!question.trim() || asking} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#28684b] text-white transition hover:bg-[#1d543b] disabled:cursor-not-allowed disabled:bg-[#bdcfc1]" aria-label="প্রশ্ন পাঠান">↗</button>
                </div>
                <p className="mt-2 text-center text-[10px] text-[#a2ada5]">উত্তরগুলো প্রকাশিত নোটিশের ভিত্তিতে তৈরি হয়</p>
              </form>
            </section>
          </div>
          <footer className="mt-10 border-t border-[#e7ece8] py-5 text-center text-[11px] text-[#9aa69e]">Campus Notice Navigator <span className="mx-1">·</span> ক্যাম্পাসের তথ্য, হাতের কাছে</footer>
        </main>
      </div>
    </div>
  );
}

export default App;
