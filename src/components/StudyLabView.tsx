import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, FileText, Lightbulb, ClipboardCheck, Layers, Network, MessageSquare, Brain, Timer, Play, Pause, RotateCcw, Check, X, Copy, AlertCircle } from 'lucide-react';
import { StudentUser } from '../types';
import * as api from '../services/api';

interface Props { student: StudentUser }

const box = 'rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4 space-y-3';
const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500';
const btnCls = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs disabled:opacity-50';
const ghostBtn = 'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs hover:border-emerald-500/60 disabled:opacity-50';

const cairoDay = (d = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Africa/Cairo' }).format(d);
const plusDays = (n: number) => cairoDay(new Date(Date.now() + n * 86400_000));
const lsGet = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : d; } catch { return d; } };
const lsSet = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

const Err: React.FC<{ msg: string; onRetry?: () => void }> = ({ msg, onRetry }) => (
  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
    <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{msg}</span>
    {onRetry && <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 font-bold"><RotateCcw className="w-3.5 h-3.5" /> إعادة</button>}
  </div>
);

function useTool<T = any>(student: StudentUser, mode: api.AiToolMode) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [retry, setRetry] = useState(false);
  const inflight = useRef(false);
  const run = async (p: { topic: string; text?: string; count?: number; level?: string }): Promise<{ answer: string; data: T | null } | null> => {
    if (inflight.current) return null;
    inflight.current = true; setBusy(true); setErr(''); setRetry(false);
    const r = await api.aiTool(student.codeUsed, student.grade, mode, p);
    inflight.current = false; setBusy(false);
    if (!r.ok) { const f = r as { error: string; retryable: boolean }; setErr(f.error); setRetry(f.retryable); return null; }
    const okr = r as { answer: string; data: any };
    return { answer: okr.answer, data: okr.data as T | null };
  };
  return { run, busy, err, retry, clear: () => setErr('') };
}

const TopicInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
  <input value={value} onChange={e => onChange(e.target.value)} maxLength={200} placeholder={placeholder || 'اكتب اسم الدرس أو الفكرة… مثال: تركيب الخلية، الوراثة، الانقسام الخلوي'} className={inputCls} />
);

// ---------- Summary / hard idea (text answers) ----------
const TextTool: React.FC<Props & { mode: 'summary' | 'hard' }> = ({ student, mode }) => {
  const [topic, setTopic] = useState('');
  const [out, setOut] = useState('');
  const [copied, setCopied] = useState(false);
  const t = useTool(student, mode);
  const go = async () => { const r = await t.run({ topic: topic.trim() }); if (r) setOut(r.answer); };
  return (
    <div className="space-y-3">
      <div className={box}>
        <p className="text-xs text-slate-400">{mode === 'summary' ? 'اكتب الدرس وهيطلعلك ملخص منظم: المفاهيم بوحداتها، التعريفات، الأخطاء الشائعة ونصايح الامتحان.' : 'اكتب الفكرة اللي مش فاهمها وهيشرحها من الصفر: تشبيه من حياتك، شرح مبسط، مثال محلول، وأخطاء شائعة.'}</p>
        <TopicInput value={topic} onChange={setTopic} />
        <button type="button" className={btnCls} disabled={t.busy || topic.trim().length < 2} onClick={go}>
          {t.busy ? <><Loader2 className="w-4 h-4 animate-spin" /> بجهّز…</> : mode === 'summary' ? 'اعمل الملخص' : 'اشرحلي'}
        </button>
      </div>
      {t.err && <Err msg={t.err} onRetry={t.retry ? go : undefined} />}
      {out && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4 text-sm leading-relaxed text-slate-100 whitespace-pre-wrap">
          {out}
          <div className="mt-3 pt-3 border-t border-slate-700">
            <button type="button" className={ghostBtn} onClick={() => { try { navigator.clipboard?.writeText(out); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } }}>
              <Copy className="w-3.5 h-3.5" /> {copied ? 'تم النسخ ✓' : 'نسخ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- Exam ----------
const ExamTool: React.FC<Props> = ({ student }) => {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(8);
  const [level, setLevel] = useState('mixed');
  const [exam, setExam] = useState<api.AiExam | null>(null);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState<'' | 'busy' | 'ok' | 'err'>('');
  const t = useTool<api.AiExam>(student, 'exam');
  const go = async () => {
    const r = await t.run({ topic: topic.trim(), count, level });
    if (r?.data) { setExam(r.data); setPicked({}); setDone(false); setSaved(''); }
  };
  const score = exam ? exam.questions.filter((q, i) => picked[i] === q.correctIndex).length : 0;
  const saveWrong = async () => {
    if (!exam) return;
    setSaved('busy');
    let ok = true;
    for (let i = 0; i < exam.questions.length; i++) {
      const q = exam.questions[i];
      if (picked[i] === q.correctIndex) continue;
      const r = await api.mistakeAdd(student.codeUsed, { source: 'ai', question: q.q.slice(0, 3000), options: q.options, correctIndex: q.correctIndex, studentIndex: picked[i] ?? null, explanation: q.explanation.slice(0, 6000), reason: 'لم أفهم الدرس', lessonTitle: topic.trim().slice(0, 120) });
      if (!r.ok) ok = false;
    }
    setSaved(ok ? 'ok' : 'err');
  };
  return (
    <div className="space-y-3">
      <div className={box}>
        <p className="text-xs text-slate-400">المدرس الذكي يعمللك امتحان اختيار من متعدد على نمط الثانوية العامة في أي درس، وبيصحح ويشرح كل سؤال.</p>
        <TopicInput value={topic} onChange={setTopic} />
        <div className="flex flex-wrap gap-2">
          <select value={count} onChange={e => setCount(Number(e.target.value))} className={inputCls + ' !w-auto'}>
            {[5, 8, 10, 15].map(n => <option key={n} value={n}>{n} أسئلة</option>)}
          </select>
          <select value={level} onChange={e => setLevel(e.target.value)} className={inputCls + ' !w-auto'}>
            <option value="mixed">متدرج</option><option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب (أفكار مركبة)</option>
          </select>
          <button type="button" className={btnCls} disabled={t.busy || topic.trim().length < 2} onClick={go}>
            {t.busy ? <><Loader2 className="w-4 h-4 animate-spin" /> بجهّز الامتحان…</> : 'ابدأ امتحان جديد'}
          </button>
        </div>
      </div>
      {t.err && <Err msg={t.err} onRetry={t.retry ? go : undefined} />}
      {exam && (
        <div className="space-y-3">
          <h3 className="font-display font-black text-white">{exam.title}</h3>
          {exam.questions.map((q, i) => (
            <div key={i} className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4 space-y-2">
              <p className="text-sm font-bold text-white whitespace-pre-wrap">{i + 1}) {q.q}</p>
              <div className="space-y-1.5">
                {q.options.map((o, k) => {
                  const chosen = picked[i] === k;
                  const right = done && k === q.correctIndex;
                  const wrong = done && chosen && k !== q.correctIndex;
                  return (
                    <button key={k} type="button" disabled={done} onClick={() => setPicked(p => ({ ...p, [i]: k }))}
                      className={`w-full text-right px-3 py-2 rounded-xl border text-sm transition ${right ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200' : wrong ? 'bg-red-500/20 border-red-500/60 text-red-200' : chosen ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-100' : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'}`}>
                      {o}
                    </button>
                  );
                })}
              </div>
              {done && q.explanation && <p className="text-xs text-slate-300 bg-slate-900/70 rounded-xl p-2.5 leading-relaxed">💡 {q.explanation}</p>}
            </div>
          ))}
          {!done ? (
            <button type="button" className={btnCls} disabled={Object.keys(picked).length < exam.questions.length} onClick={() => setDone(true)}>سلّم الامتحان</button>
          ) : (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-2">
              <p className="font-black text-emerald-200">نتيجتك: {score} من {exam.questions.length} ({Math.round(score / exam.questions.length * 100)}%)</p>
              <div className="flex flex-wrap gap-2">
                {score < exam.questions.length && (
                  <button type="button" className={ghostBtn} disabled={saved === 'busy' || saved === 'ok'} onClick={saveWrong}>
                    {saved === 'ok' ? '✓ اتحفظت الأخطاء في دفتر الأخطاء' : saved === 'busy' ? 'جاري الحفظ…' : saved === 'err' ? 'تعذر حفظ بعضها. حاول تاني' : 'احفظ الأخطاء في دفتر الأخطاء'}
                  </button>
                )}
                <button type="button" className={ghostBtn} onClick={go} disabled={t.busy}>امتحان جديد في نفس الموضوع</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------- Flashcards with spaced repetition (Leitner boxes) ----------
interface Card { id: string; front: string; back: string; box: number; due: string; topic: string }
const INTERVALS = [0, 1, 2, 4, 8, 16];
const CardsTool: React.FC<Props> = ({ student }) => {
  const key = `ha_lab_cards_${student.codeUsed}`;
  const [deck, setDeck] = useState<Card[]>(() => lsGet<Card[]>(key, []));
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);
  const [show, setShow] = useState(false);
  const t = useTool<api.AiCards>(student, 'cards');
  const today = cairoDay();
  const due = useMemo(() => deck.filter(c => c.due <= today), [deck, today]);
  const save = (d: Card[]) => { setDeck(d); lsSet(key, d); };
  const go = async () => {
    const r = await t.run({ topic: topic.trim(), count });
    if (!r?.data) return;
    const have = new Set(deck.map(c => c.front));
    const fresh: Card[] = r.data.cards.filter(c => !have.has(c.front)).map((c, i) => ({ id: `${Date.now()}_${i}`, front: c.front, back: c.back, box: 0, due: today, topic: topic.trim() }));
    save([...deck, ...fresh]);
  };
  const cur = due[0];
  const grade = (knew: boolean) => {
    if (!cur) return;
    const nb = knew ? Math.min(cur.box + 1, 5) : 0;
    save(deck.map(c => c.id === cur.id ? { ...c, box: nb, due: plusDays(INTERVALS[nb]) } : c));
    setShow(false);
  };
  return (
    <div className="space-y-3">
      <div className={box}>
        <p className="text-xs text-slate-400">بطاقات مراجعة بنظام التكرار المتباعد: اللي تعرفها بتظهرلك بعد فترة أطول، واللي تنساها بترجعلك بسرعة. البطاقات بتتحفظ على جهازك.</p>
        <TopicInput value={topic} onChange={setTopic} />
        <div className="flex flex-wrap gap-2">
          <select value={count} onChange={e => setCount(Number(e.target.value))} className={inputCls + ' !w-auto'}>
            {[6, 10, 15, 20].map(n => <option key={n} value={n}>{n} بطاقة</option>)}
          </select>
          <button type="button" className={btnCls} disabled={t.busy || topic.trim().length < 2} onClick={go}>
            {t.busy ? <><Loader2 className="w-4 h-4 animate-spin" /> بجهّز…</> : 'ولّد بطاقات'}
          </button>
        </div>
      </div>
      {t.err && <Err msg={t.err} onRetry={t.retry ? go : undefined} />}
      <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
        <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700">إجمالي البطاقات: {deck.length}</span>
        <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-200">مستحقة اليوم: {due.length}</span>
        <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-200">متقنة: {deck.filter(c => c.box >= 5).length}</span>
      </div>
      {deck.length > 0 && !cur && <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm text-center">خلصت مراجعة اليوم 🎉 ارجع بكرة للبطاقات الجديدة.</div>}
      {cur && (
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-slate-900 to-slate-800 p-5 space-y-4 text-center">
          <p className="text-[11px] text-slate-400">{cur.topic} · الصندوق {cur.box + 1} من 6 · باقي {due.length}</p>
          <p className="text-lg font-black text-white leading-relaxed whitespace-pre-wrap">{cur.front}</p>
          {show ? (
            <>
              <p className="text-base text-emerald-200 leading-relaxed whitespace-pre-wrap bg-slate-950/60 rounded-xl p-3">{cur.back}</p>
              <div className="flex justify-center gap-2">
                <button type="button" onClick={() => grade(false)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 font-black text-xs"><X className="w-4 h-4" /> لسه مش حافظها</button>
                <button type="button" onClick={() => grade(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-black text-xs"><Check className="w-4 h-4" /> عرفتها</button>
              </div>
            </>
          ) : (
            <button type="button" className={btnCls} onClick={() => setShow(true)}>اعرض الإجابة</button>
          )}
        </div>
      )}
      {deck.length > 0 && <button type="button" className={ghostBtn} onClick={() => { if (window.confirm('مسح كل البطاقات المحفوظة؟')) save([]); }}>مسح كل البطاقات</button>}
    </div>
  );
};

// ---------- Feynman / active recall (student writes, AI grades) ----------
const ScoreBadge: React.FC<{ score: number }> = ({ score }) => (
  <span className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-4 font-black text-lg ${score >= 80 ? 'border-emerald-500 text-emerald-300' : score >= 50 ? 'border-emerald-500 text-emerald-300' : 'border-red-500 text-red-300'}`}>{score}%</span>
);
const List: React.FC<{ title: string; items: string[]; tone: string }> = ({ title, items, tone }) => items.length === 0 ? null : (
  <div className={`rounded-xl border p-3 ${tone}`}>
    <p className="text-xs font-black mb-1.5">{title}</p>
    <ul className="list-disc pr-5 space-y-1 text-sm leading-relaxed">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
  </div>
);

const WriteTool: React.FC<Props & { mode: 'feynman' | 'recall' }> = ({ student, mode }) => {
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [res, setRes] = useState<any>(null);
  const t = useTool<any>(student, mode);
  const go = async () => { const r = await t.run({ topic: topic.trim(), text: text.trim() }); if (r?.data) setRes(r.data); };
  const fey = mode === 'feynman';
  return (
    <div className="space-y-3">
      <div className={box}>
        <p className="text-xs text-slate-400">
          {fey ? 'أسلوب فاينمان: اشرح الفكرة بكلامك كأنك بتعلّمها لصاحبك. لو عرفت تشرحها ببساطة يبقى فاهمها فعلاً. المدرس الذكي يقيّم شرحك ويصلّح الغلط.'
            : 'الاسترجاع النشط: اقفل الكتاب واكتب كل اللي فاكره عن الدرس من دماغك. المدرس الذكي يقولك إيه اللي نسيته وإيه اللي غلط فيه.'}
        </p>
        <TopicInput value={topic} onChange={setTopic} placeholder="اسم الدرس أو الفكرة" />
        <textarea value={text} onChange={e => setText(e.target.value)} rows={6} maxLength={2400} className={inputCls}
          placeholder={fey ? 'اشرح الفكرة هنا بأسلوبك…' : 'اكتب كل اللي فاكره عن الدرس: مفاهيم، تعريفات، أمثلة…'} />
        <button type="button" className={btnCls} disabled={t.busy || topic.trim().length < 2 || text.trim().length < 20} onClick={go}>
          {t.busy ? <><Loader2 className="w-4 h-4 animate-spin" /> بقيّم…</> : 'قيّم إجابتي'}
        </button>
        {text.trim().length > 0 && text.trim().length < 20 && <p className="text-[11px] text-slate-500">اكتب 20 حرف على الأقل.</p>}
      </div>
      {t.err && <Err msg={t.err} onRetry={t.retry ? go : undefined} />}
      {res && (
        <div className="space-y-3">
          <div className="flex items-center gap-3"><ScoreBadge score={res.score} /><span className="text-sm text-slate-300">{fey ? 'تقييم شرحك' : 'نسبة ما تذكرته'}</span></div>
          {fey ? (
            <>
              <List title="✅ أجدت في" items={res.good} tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-100" />
              <List title="➕ ناقص" items={res.gaps} tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-100" />
              <List title="❌ غلط ومصحح" items={res.mistakes} tone="border-red-500/30 bg-red-500/10 text-red-100" />
              {res.improved && <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3 text-sm leading-relaxed text-slate-100"><p className="text-xs font-black text-emerald-300 mb-1">النسخة المحسّنة</p>{res.improved}</div>}
              {res.followUp && <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-100"><p className="text-xs font-black mb-1">سؤال للتعمق</p>{res.followUp}</div>}
            </>
          ) : (
            <>
              <List title="✅ فاكره صح" items={res.covered} tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-100" />
              <List title="➕ نسيته" items={res.missed} tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-100" />
              <List title="❌ غلط ومصحح" items={res.wrong} tone="border-red-500/30 bg-red-500/10 text-red-100" />
              {res.tip && <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-100"><p className="text-xs font-black mb-1">نصيحة مراجعة</p>{res.tip}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ---------- Mind map (radial SVG) ----------
const COLORS = ['#f59e0b', '#38bdf8', '#34d399', '#f472b6', '#a78bfa', '#fb923c', '#facc15', '#22d3ee'];
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const MindmapTool: React.FC<Props> = ({ student }) => {
  const [topic, setTopic] = useState('');
  const [map, setMap] = useState<api.AiMindmap | null>(null);
  const t = useTool<api.AiMindmap>(student, 'mindmap');
  const go = async () => { const r = await t.run({ topic: topic.trim() }); if (r?.data) setMap(r.data); };
  const cx = 450, cy = 360;
  return (
    <div className="space-y-3">
      <div className={box}>
        <p className="text-xs text-slate-400">خريطة ذهنية للدرس كله في صفحة واحدة: الفكرة في النص وحواليها الفروع والمفاهيم.</p>
        <TopicInput value={topic} onChange={setTopic} />
        <button type="button" className={btnCls} disabled={t.busy || topic.trim().length < 2} onClick={go}>
          {t.busy ? <><Loader2 className="w-4 h-4 animate-spin" /> برسم…</> : 'ارسم الخريطة'}
        </button>
      </div>
      {t.err && <Err msg={t.err} onRetry={t.retry ? go : undefined} />}
      {map && (
        <div className="rounded-2xl border border-slate-700 bg-slate-950 p-2 overflow-x-auto">
          <svg viewBox="0 0 900 720" className="w-full min-w-[640px]" role="img" aria-label={`خريطة ذهنية: ${map.root}`} style={{ direction: 'rtl' }}>
            {map.branches.map((b, i) => {
              const a = (i / map.branches.length) * Math.PI * 2 - Math.PI / 2;
              const bx = cx + Math.cos(a) * 185, by = cy + Math.sin(a) * 150;
              const col = COLORS[i % COLORS.length];
              return (
                <g key={i}>
                  <line x1={cx} y1={cy} x2={bx} y2={by} stroke={col} strokeWidth={3} opacity={0.7} />
                  {b.children.map((c, k) => {
                    const spread = 0.34, ca = a + (k - (b.children.length - 1) / 2) * spread;
                    const kx = cx + Math.cos(ca) * 345, ky = cy + Math.sin(ca) * 285;
                    return (
                      <g key={k}>
                        <line x1={bx} y1={by} x2={kx} y2={ky} stroke={col} strokeWidth={1.5} opacity={0.5} />
                        <rect x={kx - 62} y={ky - 14} width={124} height={28} rx={14} fill="#0f172a" stroke={col} strokeWidth={1.2} />
                        <text x={kx} y={ky + 4} textAnchor="middle" fontSize={11} fill="#e2e8f0" fontWeight={700}><title>{c}</title>{clip(c, 20)}</text>
                      </g>
                    );
                  })}
                  <rect x={bx - 70} y={by - 18} width={140} height={36} rx={18} fill={col} />
                  <text x={bx} y={by + 5} textAnchor="middle" fontSize={13} fill="#0f172a" fontWeight={900}><title>{b.title}</title>{clip(b.title, 18)}</text>
                </g>
              );
            })}
            <ellipse cx={cx} cy={cy} rx={92} ry={50} fill="#1e293b" stroke="#f59e0b" strokeWidth={3} />
            <text x={cx} y={cy + 6} textAnchor="middle" fontSize={16} fill="#fde68a" fontWeight={900}>{clip(map.root, 22)}</text>
          </svg>
        </div>
      )}
    </div>
  );
};

// ---------- Pomodoro ----------
const PHASES = { focus: { label: 'تركيز', min: 25, color: 'text-emerald-300' }, short: { label: 'استراحة قصيرة', min: 5, color: 'text-emerald-300' }, long: { label: 'استراحة طويلة', min: 15, color: 'text-sky-300' } } as const;
type Phase = keyof typeof PHASES;
const PomodoroTool: React.FC<Props> = ({ student }) => {
  const logKey = `ha_lab_pomo_${student.codeUsed}`;
  const [phase, setPhase] = useState<Phase>('focus');
  const [left, setLeft] = useState(PHASES.focus.min * 60);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<Record<string, number>>(() => lsGet(logKey, {}));
  const endAt = useRef(0);
  const today = cairoDay();
  const doneToday = log[today] || 0;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const rest = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(rest);
      if (rest === 0) {
        window.clearInterval(id); setRunning(false);
        try { const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const o = ctx.createOscillator(); o.connect(ctx.destination); o.frequency.value = 880; o.start(); setTimeout(() => { o.stop(); ctx.close(); }, 600); } catch { /* ignore */ }
        try { navigator.vibrate?.(300); } catch { /* ignore */ }
        if (phase === 'focus') {
          const next = { ...log, [today]: (log[today] || 0) + 1 }; setLog(next); lsSet(logKey, next);
          const n = next[today];
          const np: Phase = n % 4 === 0 ? 'long' : 'short'; setPhase(np); setLeft(PHASES[np].min * 60);
        } else { setPhase('focus'); setLeft(PHASES.focus.min * 60); }
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [running, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => { if (!running) endAt.current = Date.now() + left * 1000; setRunning(r => !r); };
  const pick = (p: Phase) => { setRunning(false); setPhase(p); setLeft(PHASES[p].min * 60); };
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0');
  return (
    <div className={box + ' text-center'}>
      <p className="text-xs text-slate-400">ذاكر 25 دقيقة تركيز كامل وبعدها 5 دقايق راحة، وكل 4 جلسات خد راحة طويلة. عقلك بيتعلم أحسن على جرعات قصيرة.</p>
      <div className="flex justify-center gap-1.5">
        {(Object.keys(PHASES) as Phase[]).map(p => (
          <button key={p} type="button" onClick={() => pick(p)} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border ${phase === p ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>{PHASES[p].label}</button>
        ))}
      </div>
      <div className={`font-mono font-black text-6xl tracking-wider ${PHASES[phase].color}`} dir="ltr">{mm}:{ss}</div>
      <div className="flex justify-center gap-2">
        <button type="button" className={btnCls} onClick={toggle}>{running ? <><Pause className="w-4 h-4" /> إيقاف</> : <><Play className="w-4 h-4" /> ابدأ</>}</button>
        <button type="button" className={ghostBtn} onClick={() => pick(phase)}><RotateCcw className="w-3.5 h-3.5" /> إعادة</button>
      </div>
      <p className="text-xs text-slate-300">جلسات التركيز المكتملة اليوم: <b className="text-emerald-300">{doneToday}</b> ({doneToday * 25} دقيقة)</p>
    </div>
  );
};

// ---------- Lab shell ----------
const TOOLS = [
  { id: 'summary', label: 'ملخص', icon: FileText },
  { id: 'hard', label: 'فكرة صعبة', icon: Lightbulb },
  { id: 'exam', label: 'امتحان', icon: ClipboardCheck },
  { id: 'cards', label: 'بطاقات مراجعة', icon: Layers },
  { id: 'feynman', label: 'اشرحها بنفسك', icon: MessageSquare },
  { id: 'recall', label: 'اختبر ذاكرتك', icon: Brain },
  { id: 'mindmap', label: 'خريطة ذهنية', icon: Network },
  { id: 'pomo', label: 'بومودورو', icon: Timer }
] as const;
type ToolId = typeof TOOLS[number]['id'];

export const StudyLabView: React.FC<Props> = ({ student }) => {
  const [tool, setTool] = useState<ToolId>('summary');
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setTool(id)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${tool === id ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-black' : 'bg-slate-800/70 text-slate-300 border-slate-700 hover:text-white'}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>
      {tool === 'summary' && <TextTool student={student} mode="summary" />}
      {tool === 'hard' && <TextTool student={student} mode="hard" />}
      {tool === 'exam' && <ExamTool student={student} />}
      {tool === 'cards' && <CardsTool student={student} />}
      {tool === 'feynman' && <WriteTool student={student} mode="feynman" />}
      {tool === 'recall' && <WriteTool student={student} mode="recall" />}
      {tool === 'mindmap' && <MindmapTool student={student} />}
      {tool === 'pomo' && <PomodoroTool student={student} />}
      <p className="text-[11px] text-slate-500">كل استخدام للذكاء الاصطناعي هنا بيتحسب ضمن حدك اليومي مع المدرس الذكي. الإجابات للمراجعة والتدريب، وراجع المنهج لو في شك.</p>
    </div>
  );
};
