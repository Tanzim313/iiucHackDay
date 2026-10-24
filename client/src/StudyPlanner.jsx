import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./StudyPlanner.css";

const emptyCourse = () => ({ code: "", name: "", credits: 3, difficulty: "medium", classTimes: "" });
const PLANNER_API_BASE = import.meta.env.VITE_PLANNER_API_URL || "http://localhost:5002";

function Table({ title, description, columns, rows, empty }) {
  return (
    <section className="planner-result-card">
      <div className="planner-card-heading">
        <div><h3>{title}</h3>{description && <p>{description}</p>}</div>
        <span className="planner-count">{rows?.length || 0}</span>
      </div>
      {!rows?.length ? <div className="planner-empty">{empty || "কোনো তথ্য পাওয়া যায়নি।"}</div> : (
        <div className="planner-table-scroll"><table className="planner-table">
          <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={`${title}-${index}`}>
            {columns.map((column) => <td key={column.key}>{row[column.key] ?? "—"}</td>)}
          </tr>)}</tbody>
        </table></div>
      )}
    </section>
  );
}

export default function StudyPlanner({ open, onClose }) {
  const [semester, setSemester] = useState("");
  const [routine, setRoutine] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [goal, setGoal] = useState("");
  const [courses, setCourses] = useState([emptyCourse()]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalCredits = useMemo(() => courses.reduce((sum, item) => sum + (Number(item.credits) || 0), 0), [courses]);
  if (!open) return null;

  const changeCourse = (index, key, value) => setCourses((current) => current.map((course, i) => i === index ? { ...course, [key]: value } : course));
  const addCourse = () => setCourses((current) => [...current, emptyCourse()]);
  const removeCourse = (index) => setCourses((current) => current.length === 1 ? current : current.filter((_, i) => i !== index));

  async function createPlan(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!routine.trim()) return setError("চলতি ক্লাসের রুটিন দিন—দিন ও সময়সহ।");
    if (!courses.some((course) => course.code.trim() && course.name.trim())) return setError("অন্তত একটি রিটেক/ইমপ্রুভমেন্ট কোর্স যোগ করুন।");
    setLoading(true);
    try {
      const response = await fetch(`${PLANNER_API_BASE}/study-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_semester: semester.trim(), current_routine: routine.trim(), preferred_time: preferredTime.trim(), goal: goal.trim(),
          retake_courses: courses.filter((course) => course.code.trim() && course.name.trim()).map((course) => ({ ...course, credits: Number(course.credits) || 1 })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "প্ল্যান তৈরি করা যায়নি। আবার চেষ্টা করুন।");
      setResult(payload.plan || payload);
    } catch (requestError) {
      setError(requestError.message || "সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।");
    } finally { setLoading(false); }
  }

  return <div className="planner-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
    <section className="planner-dialog" role="dialog" aria-modal="true" aria-labelledby="planner-title">
      <header className="planner-header">
        <div className="planner-title-wrap"><span className="planner-kicker"><span className="planner-pulse" /> GEMINI STUDY PLANNER</span>
          <h2 id="planner-title">আপনার সপ্তাহটা গুছিয়ে নিন</h2><p>ক্লাস, পছন্দের সময় আর রিটেক কোর্স দিন—AI আপনার জন্য বাস্তবসম্মত সাপ্তাহিক পরিকল্পনা সাজাবে।</p>
        </div>
        <button className="planner-close" onClick={onClose} aria-label="বন্ধ করুন">×</button>
      </header>
      <div className="planner-content">
        <form className="planner-form" onSubmit={createPlan}>
          <div className="planner-form-intro"><span className="planner-step">01</span><div><h3>আপনার একাডেমিক তথ্য</h3><p>যত নির্দিষ্ট সময় দেবেন, পরিকল্পনাটি তত কার্যকর হবে।</p></div></div>
          <div className="planner-field-grid">
            <label className="planner-field"><span>বর্তমান সেমিস্টার</span><input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="যেমন: ৭ম সেমিস্টার" /></label>
            <label className="planner-field"><span>পছন্দের পড়ার সময় <small>ঐচ্ছিক</small></span><input value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} placeholder="যেমন: বিকেল ৪টার পরে" /></label>
          </div>
          <label className="planner-field"><span>চলতি সেমিস্টারের ক্লাস রুটিন <b>*</b></span><textarea required rows="4" value={routine} onChange={(e) => setRoutine(e.target.value)} placeholder={'শনিবার: ১০:০০ - ১১:৩০ (CSE-4101), ১২:০০ - ১৩:৩০ (CSE-4103)\nরবিবার: ০৯:০০ - ১০:৩০ (CSE-4105)'} /><small>প্রতিটি দিনের নাম ও শুরু-শেষ সময় লিখুন।</small></label>

          <div className="planner-form-intro planner-course-intro"><span className="planner-step">02</span><div><h3>রিটেক / ইমপ্রুভমেন্ট কোর্স</h3><p>ক্রেডিট ও কঠিনতা দেখে Gemini পড়ার সময় ভাগ করবে।</p></div><span className="planner-credit-total">{totalCredits} ক্রেডিট</span></div>
          <div className="planner-course-list">{courses.map((course, index) => <div className="planner-course-row" key={index}>
            <label className="planner-field"><span>কোড</span><input value={course.code} onChange={(e) => changeCourse(index, "code", e.target.value)} placeholder="CSE-3105" /></label>
            <label className="planner-field planner-course-name"><span>কোর্সের নাম</span><input value={course.name} onChange={(e) => changeCourse(index, "name", e.target.value)} placeholder="Algorithms" /></label>
            <label className="planner-field"><span>ক্রেডিট</span><input type="number" min="1" max="6" value={course.credits} onChange={(e) => changeCourse(index, "credits", e.target.value)} /></label>
            <label className="planner-field"><span>কঠিনতা</span><select value={course.difficulty} onChange={(e) => changeCourse(index, "difficulty", e.target.value)}><option value="easy">সহজ</option><option value="medium">মাঝারি</option><option value="hard">কঠিন</option></select></label>
            <label className="planner-field planner-course-times"><span>রিটেক ক্লাসের সময় <small>ঐচ্ছিক</small></span><input value={course.classTimes} onChange={(e) => changeCourse(index, "classTimes", e.target.value)} placeholder="যেমন: রবিবার ১৪:০০ - ১৫:৩০" /></label>
            <button type="button" className="planner-remove-course" onClick={() => removeCourse(index)} aria-label="কোর্স মুছুন">−</button>
          </div>)}</div>
          <button type="button" className="planner-add-course" onClick={addCourse}>＋ আরেকটি কোর্স যোগ করুন</button>
          <label className="planner-field planner-goal"><span>আপনার লক্ষ্য <small>ঐচ্ছিক</small></span><input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="যেমন: আগামী মাসে পরীক্ষা, সপ্তাহে ৩ দিন রিটেক ক্লাস" /></label>
          {error && <div className="planner-error" role="alert">{error}</div>}
          <button className="planner-submit" type="submit" disabled={loading}>{loading ? <><span className="planner-spinner" /> পরিকল্পনা তৈরি হচ্ছে…</> : <>✦ <span>আমার সাপ্তাহিক প্ল্যান তৈরি করুন</span><span className="planner-submit-arrow">→</span></>}</button>
          <p className="planner-privacy">আপনার API key সার্ভারে সুরক্ষিত থাকে। প্ল্যানের জন্য দেওয়া তথ্য শুধু এই অনুরোধে ব্যবহার হয়।</p>
        </form>

        {result && <div className="planner-results">
          <div className="planner-result-banner"><span className="planner-result-icon">✓</span><div><span className="planner-kicker">YOUR WEEK, IN BALANCE</span><h2>আপনার সাপ্তাহিক পরিকল্পনা তৈরি</h2><p>ফ্রি সময়, ক্লাসের সংঘাত ও পড়ার অগ্রাধিকার মিলিয়ে সাজানো হয়েছে।</p></div></div>
          <Table title="ফ্রি স্লট" description="চলতি রুটিনের বাইরে পাওয়া সময়" rows={result.free_slots} columns={[{ key: "day", label: "দিন" }, { key: "start_time", label: "শুরু" }, { key: "end_time", label: "শেষ" }, { key: "duration", label: "সময়কাল" }]} />
          <Table title="ক্লাস কনফ্লিক্ট" description="রিটেক ক্লাস ও চলতি ক্লাসের ওভারল্যাপ" rows={result.conflicts} columns={[{ key: "course", label: "কোর্স" }, { key: "class_time", label: "রিটেক ক্লাস" }, { key: "current_class", label: "সংঘাত" }, { key: "suggestion", label: "বিকল্প" }]} empty="কোনো সংঘাত পাওয়া যায়নি।" />
          <Table title="সাবজেক্ট প্রায়োরিটি" description="ক্রেডিট ও কঠিনতা অনুযায়ী সময় বণ্টন" rows={result.priority_map} columns={[{ key: "course", label: "কোর্স" }, { key: "credits", label: "ক্রেডিট" }, { key: "difficulty", label: "কঠিনতা" }, { key: "sessions_per_week", label: "সেশন / সপ্তাহ" }, { key: "weekly_hours", label: "ঘণ্টা / সপ্তাহ" }]} />
          <Table title="সপ্তাহের বিস্তারিত রুটিন" description="পড়ার সেশন, ব্রেক, বাফার ও রিভিশন" rows={result.weekly_schedule} columns={[{ key: "day", label: "দিন" }, { key: "start_time", label: "শুরু" }, { key: "end_time", label: "শেষ" }, { key: "activity", label: "কাজ" }, { key: "course", label: "কোর্স" }, { key: "note", label: "নোট" }]} />
          {!!result.advice?.length && <section className="planner-result-card planner-advice"><h3>বাস্তবসম্মত পরামর্শ</h3><ul>{result.advice.map((tip, index) => <li key={index}>{tip}</li>)}</ul></section>}
          {!!result.assumptions?.length && <section className="planner-result-card planner-advice"><h3>যে অনুমানগুলো ধরা হয়েছে</h3><ul>{result.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul></section>}
        </div>}
      </div>
      <footer className="planner-footer"><span><i /> Planning around your classes, one week at a time</span><button onClick={onClose}>বন্ধ করুন</button></footer>
    </section>
  </div>;
}

function StudyPlannerLauncher() {
  const [open, setOpen] = useState(false);
  return <>
    {!open && <button className="planner-launcher" onClick={() => setOpen(true)}><span className="planner-launcher-mark">✦</span><span><strong>স্টাডি প্ল্যানার</strong><small>সপ্তাহটা গুছিয়ে নিন</small></span><span className="planner-launcher-arrow">→</span></button>}
    <StudyPlanner open={open} onClose={() => setOpen(false)} />
  </>;
}

if (typeof document !== "undefined" && !document.getElementById("study-planner-launcher")) {
  const launcherHost = document.createElement("div");
  launcherHost.id = "study-planner-launcher";
  document.body.appendChild(launcherHost);
  createRoot(launcherHost).render(<StudyPlannerLauncher />);
}
