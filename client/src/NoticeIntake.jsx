import { useEffect, useMemo, useState } from "react";

const allowedFiles = ".txt,.md,.pdf,.png,.jpg,.jpeg,.webp";

function AnalysisSection({ icon, title, children }) {
  return (
    <div className="rounded-xl border border-[#e8eee9] bg-white p-4">
      <p className="flex items-center gap-2 text-xs font-bold text-[#385a48]"><span className="text-[#57906a]">{icon}</span>{title}</p>
      <div className="mt-2 text-sm leading-6 text-[#65756b]">{children}</div>
    </div>
  );
}

export default function NoticeIntake({ open, categories, onClose, onSaved }) {
  const [mode, setMode] = useState("text");
  const [noticeText, setNoticeText] = useState("");
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("অন্যান্য");
  const [priority, setPriority] = useState("normal");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setMode("text");
      setNoticeText("");
      setFile(null);
      setTitle("");
      setDepartment("");
      setCategory("অন্যান্য");
      setPriority("normal");
      setResult(null);
      setBusy(false);
      setSaving(false);
      setError("");
    }
  }, [open]);

  const categoryOptions = useMemo(
    () => [...new Set(["অন্যান্য", "পরীক্ষা", "লাইব্রেরি", "পরিবহন", "বৃত্তি", "ইভেন্ট", ...categories])],
    [categories],
  );

  if (!open) return null;

  function chooseFile(nextFile) {
    if (!nextFile) return;
    if (nextFile.size > 10 * 1024 * 1024) {
      setError("ফাইলের আকার ১০ MB-এর মধ্যে রাখুন।");
      return;
    }
    setFile(nextFile);
    setError("");
    if (!title.trim()) setTitle(nextFile.name.replace(/\.[^.]+$/, "").slice(0, 200));
  }

  async function analyzeNotice(event) {
    event.preventDefault();
    if (!file && !noticeText.trim()) {
      setError("নোটিশের লেখা পেস্ট করুন অথবা একটি ফাইল বেছে নিন।");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    const form = new FormData();
    form.append("notice_text", noticeText);
    form.append("title", title);
    form.append("department", department);
    if (file) form.append("file", file);
    try {
      const response = await fetch("/api/ingest", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "নোটিশ বিশ্লেষণ করা যায়নি।");
      setResult(data);
      if (!title.trim() && data.source_name) setTitle(data.source_name.replace(/\.[^.]+$/, "").slice(0, 200));
    } catch (requestError) {
      setError(requestError.message || "Flask/Gemma সার্ভারের সঙ্গে সংযোগ করা যায়নি।");
    } finally {
      setBusy(false);
    }
  }

  async function publishNotice() {
    const analysis = result?.analysis;
    const content = result?.extracted_text || analysis?.transcribed_notice_text || "";
    if (!analysis || !content.trim()) {
      setError("নোটিশের লেখা পাওয়া যায়নি। TXT/PDF ব্যবহার করুন অথবা ছবিতে লেখা পরিষ্কার আছে কি না দেখুন।");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || result.source_name || "নতুন ক্যাম্পাস নোটিশ",
          category,
          department,
          priority,
          summary: analysis.short_summary,
          content,
          analysis,
          source_name: result.source_name,
          tags: [category, ...(analysis.key_deadlines || [])].slice(0, 20),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "নোটিশ প্রকাশ করা যায়নি।");
      onSaved(data.notice);
    } catch (requestError) {
      setError(requestError.message || "নোটিশ সেভ করা যায়নি।");
    } finally {
      setSaving(false);
    }
  }

  const analysis = result?.analysis;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#10251d]/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="intake-heading" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-[26px] bg-[#f7f9f7] shadow-2xl sm:rounded-[26px]">
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-[#174f40] px-5 py-5 text-white sm:px-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#b2d4c1]">NOTICE INTAKE · GEMMA AI</p>
            <h2 id="intake-heading" className="mt-1 text-xl font-bold">নতুন নোটিশ যোগ করুন</h2>
            <p className="mt-1 text-xs text-[#c4dbd0]">লেখা, PDF বা notice board-এর ছবি থেকে দরকারি তথ্য বের করুন।</p>
          </div>
          <button onClick={onClose} disabled={busy || saving} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg text-white hover:bg-white/20 disabled:opacity-50" aria-label="বন্ধ করুন">×</button>
        </header>

        <form onSubmit={analyzeNotice} className="space-y-5 p-5 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-[#53665a]">নোটিশের শিরোনাম
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder="যেমন: মিডটার্ম পরীক্ষার রুটিন" className="mt-2 w-full rounded-xl border border-[#dfe7e1] bg-white px-3.5 py-3 text-sm font-normal outline-none transition focus:border-[#76a989] focus:ring-4 focus:ring-[#dcefe2]" />
            </label>
            <label className="block text-xs font-bold text-[#53665a]">বিভাগ / দপ্তর
              <input value={department} onChange={(event) => setDepartment(event.target.value)} maxLength={120} placeholder="যেমন: পরীক্ষা নিয়ন্ত্রকের দপ্তর" className="mt-2 w-full rounded-xl border border-[#dfe7e1] bg-white px-3.5 py-3 text-sm font-normal outline-none transition focus:border-[#76a989] focus:ring-4 focus:ring-[#dcefe2]" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-[#53665a]">নোটিশের বিভাগ
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe7e1] bg-white px-3.5 py-3 text-sm font-normal outline-none focus:border-[#76a989]">
                {categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-[#53665a]">গুরুত্ব
              <select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe7e1] bg-white px-3.5 py-3 text-sm font-normal outline-none focus:border-[#76a989]">
                <option value="normal">সাধারণ</option><option value="high">জরুরি</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-[#e1e9e3] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-sm font-bold text-[#294b39]">নোটিশের উৎস</p><p className="mt-1 text-xs text-[#89968d]">ফেসবুক/মেসেঞ্জার থেকে কপি করা লেখা অথবা ফাইল দিন</p></div>
              <div className="flex rounded-xl bg-[#f0f4f1] p-1">
                <button type="button" onClick={() => setMode("text")} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === "text" ? "bg-white text-[#286548] shadow-sm" : "text-[#849188]"}`}>লেখা পেস্ট</button>
                <button type="button" onClick={() => setMode("file")} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === "file" ? "bg-white text-[#286548] shadow-sm" : "text-[#849188]"}`}>ফাইল দিন</button>
              </div>
            </div>
            {mode === "text" ? (
              <textarea value={noticeText} onChange={(event) => setNoticeText(event.target.value)} maxLength={40000} rows={7} placeholder="নোটিশের সম্পূর্ণ লেখা এখানে পেস্ট করুন…" className="mt-4 w-full resize-y rounded-xl border border-[#e3eae4] bg-[#fbfcfb] p-4 text-sm leading-6 text-[#40584a] outline-none transition placeholder:text-[#a4afa7] focus:border-[#80b293] focus:ring-4 focus:ring-[#e5f1e8]" />
            ) : (
              <label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files?.[0]); }} className="mt-4 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#d5e3d8] bg-[#fbfdfb] px-4 text-center transition hover:border-[#89b89a] hover:bg-[#f5faf6]">
                <input type="file" accept={allowedFiles} className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} />
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e9f4ec] text-2xl text-[#43825d]">↑</span>
                <span className="mt-3 text-sm font-bold text-[#456352]">ফাইল টেনে আনুন অথবা ক্লিক করে বাছুন</span>
                <span className="mt-1 text-xs text-[#91a096]">TXT, PDF, PNG, JPG, WEBP · সর্বোচ্চ ১০ MB</span>
                {file && <span className="mt-3 rounded-full bg-[#e8f3eb] px-3 py-1.5 text-xs font-semibold text-[#36714e]">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</span>}
              </label>
            )}
            {mode === "file" && <p className="mt-3 text-[11px] leading-5 text-[#98a39b]">স্ক্যান করা PDF ও ছবির লেখা vision-enabled Gemma দিয়ে পড়া হবে। বড় PDF-এর প্রথম ৫টি scanned page বিশ্লেষণ করা হয়।</p>}
          </div>

          {error && <div role="alert" className="rounded-xl border border-[#f0d6c9] bg-[#fff5f0] px-4 py-3 text-sm text-[#9a5435]">{error}</div>}
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={onClose} disabled={busy || saving} className="rounded-xl px-4 py-3 text-sm font-bold text-[#78877e] hover:bg-[#edf2ee] disabled:opacity-50">বাতিল</button>
            <button type="submit" disabled={busy || saving || (!file && !noticeText.trim())} className="inline-flex items-center gap-2 rounded-xl bg-[#246348] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(36,99,72,.18)] transition hover:bg-[#1d543d] disabled:cursor-wait disabled:opacity-50">
              <span>✧</span>{busy ? "Gemma বিশ্লেষণ করছে…" : "নোটিশ বিশ্লেষণ করুন"}
            </button>
          </div>

          {result && analysis && <section className="space-y-4 border-t border-[#e3eae4] pt-5">
            <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#75a083]">AI EXTRACTION COMPLETE</p><h3 className="mt-1 text-lg font-extrabold text-[#264635]">প্রকাশের আগে তথ্য যাচাই করুন</h3></div><span className="rounded-full bg-[#edf5ef] px-3 py-1.5 text-[10px] font-bold text-[#5e8b69]">{result.model || "Gemma"}</span></div>
            {result.warning && <p className="rounded-lg bg-[#fff8e9] px-3 py-2 text-xs text-[#8f6d36]">{result.warning}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <AnalysisSection icon="◉" title="সংক্ষিপ্ত সারাংশ">{analysis.short_summary || "উল্লেখ নেই"}</AnalysisSection>
              <AnalysisSection icon="◷" title="গুরুত্বপূর্ণ তারিখ">
                {analysis.key_deadlines?.length ? <ul className="list-inside list-disc space-y-1">{analysis.key_deadlines.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : "নোটিশে নির্দিষ্ট তারিখ নেই"}
              </AnalysisSection>
              <AnalysisSection icon="◎" title="কারা প্রযোজ্য">{analysis.target_audience || "উল্লেখ নেই"}</AnalysisSection>
              <AnalysisSection icon="↗" title="শিক্ষার্থীর করণীয়">
                {analysis.action_items?.length ? <ul className="list-inside list-disc space-y-1">{analysis.action_items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : "নির্দিষ্ট করণীয় উল্লেখ নেই"}
              </AnalysisSection>
            </div>
            {result.extracted_text && <details className="rounded-xl border border-[#e3eae4] bg-white px-4 py-3"><summary className="cursor-pointer text-xs font-bold text-[#607568]">পড়া মূল লেখা দেখুন</summary><p className="mt-3 max-h-36 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-[#829087]">{result.extracted_text.slice(0, 6000)}</p></details>}
            <div className="flex flex-wrap justify-end gap-3 border-t border-[#e3eae4] pt-4">
              <button type="button" onClick={() => setResult(null)} className="rounded-xl px-4 py-3 text-sm font-bold text-[#78877e] hover:bg-[#edf2ee]">আবার সম্পাদনা</button>
              <button type="button" onClick={publishNotice} disabled={saving || !(result.extracted_text || analysis.transcribed_notice_text)} className="inline-flex items-center gap-2 rounded-xl bg-[#174f40] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#103c30] disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? "বোর্ডে যোগ হচ্ছে…" : "নোটিশ বোর্ডে প্রকাশ করুন"}<span>↗</span>
              </button>
            </div>
          </section>}
        </form>
      </section>
    </div>
  );
}
