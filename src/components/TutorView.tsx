import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, RotateCcw, Trash2, Loader2, AlertCircle, Camera, ImagePlus, X, WandSparkles, Download, Image as ImageIcon } from 'lucide-react';
import { StudentUser, TutorMessage } from '../types';
import * as api from '../services/api';
import { prepareImage } from '../utils/image';

interface Props { student: StudentUser }
const MAX_IMAGES = 3;

export const TutorView: React.FC<Props> = ({ student }) => {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [prep, setPrep] = useState(false);
  const [error, setError] = useState<{ msg: string; retryable: boolean; question: string; images: string[] } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inflight = useRef(false);
  const [saved, setSaved] = useState<Record<number, 'ok' | 'err' | 'busy'>>({});
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const referenceRef = useRef<HTMLInputElement>(null);
  const [imageMode, setImageMode] = useState(false);
  const [imageRatio, setImageRatio] = useState<'auto' | 'square' | 'portrait' | 'landscape'>('auto');
  const [referenceImage, setReferenceImage] = useState('');
  const [generatedImages, setGeneratedImages] = useState<Array<{prompt:string; image:string; ratio:string}>>([]);
  const [imagePrep, setImagePrep] = useState(false);

  const createImage = async (brief: string) => {
    if (brief.trim().length < 4 || busy) return;
    const lower = brief.toLowerCase();
    const ratio = imageRatio === 'auto'
      ? (/عرضي|بانر|يوتيوب|شريحة|منظر طبيعي|landscape|banner|thumbnail|wide/i.test(lower) ? 'landscape'
        : /بوستر|إعلان|اعلان|قصة|ريلز|تيك توك|شخصية|portrait|poster|story|vertical/i.test(lower) ? 'portrait' : 'square')
      : imageRatio;
    const dimensions = ratio === 'landscape' ? { width: 1536, height: 1024 } : ratio === 'portrait' ? { width: 1024, height: 1536 } : { width: 1024, height: 1024 };
    const enhanced = [
      'Create one polished, high-resolution image from the following Egyptian Arabic creative brief.',
      'Automatically improve composition, lighting, depth, perspective, materials, visual hierarchy and fine details.',
      'Keep the subject faithful to the brief. Use accurate educational/scientific details when relevant. Do not invent logos, dates, prices, or extra text.',
      'Avoid watermarks, borders, mockups, UI elements, distorted typography, and duplicated subjects.',
      'User brief: ' + brief.trim()
    ].join('\n\n');
    setBusy(true); setError(null);
    try {
      const result = await api.generateElloolImage(enhanced, dimensions.width, dimensions.height, referenceImage);
      if (!result?.image) throw new Error(result?.error || 'محرك الصور لم يُرجع صورة.');
      setGeneratedImages(prev => [{ prompt: brief.trim(), image: result.image!, ratio }, ...prev].slice(0, 12));
      setText('');
    } catch (e: any) {
      setError({ msg: e?.message || 'تعذر إنشاء الصورة حالياً. حاول مرة أخرى.', retryable: false, question: '', images: [] });
    } finally { setBusy(false); }
  };

  const addImageReference = async (file?: File) => {
    if (!file) return;
    setImagePrep(true);
    try { setReferenceImage(await prepareImage(file)); }
    catch (e:any) { setError({ msg: e?.message || 'تعذر تجهيز الصورة المرجعية.', retryable: false, question: '', images: [] }); }
    finally { setImagePrep(false); if (referenceRef.current) referenceRef.current.value = ''; }
  };

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages, busy]);
  // continue the saved conversation (text only; photos stay private on the server)
  useEffect(() => { let on = true; api.tutorHistory(student.codeUsed).then(h => { if (on && h.length) setMessages(prev => prev.length ? prev : h.slice(-20)); }); return () => { on = false; }; }, [student.codeUsed]);

  const send = async (question: string, imgs: string[], base: TutorMessage[]) => {
    if (inflight.current) return; // no duplicate submissions
    inflight.current = true;
    setBusy(true);
    setError(null);
    const shown = question || (imgs.length ? '📷 سؤال بصورة' : '');
    const r = await api.askTutor(student.codeUsed, student.grade, question, base, imgs);
    inflight.current = false;
    setBusy(false);
    const userMsg: TutorMessage = { role: 'user', content: shown, images: imgs };
    if (r.ok) {
      setMessages([...base, userMsg, { role: 'assistant', content: r.answer }].slice(-20));
    } else {
      setMessages([...base, userMsg].slice(-20));
      const f = r as { error: string; retryable: boolean };
      setError({ msg: f.error, retryable: f.retryable, question, images: imgs });
    }
  };

  const canSend = !busy && !prep && (text.trim().length >= 2 || images.length > 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (imageMode) { if (text.trim().length >= 4 && !busy) createImage(text.trim()); return; }
    if (!canSend) return;
    const q = text.trim();
    const imgs = images;
    setText(''); setImages([]);
    send(q, imgs, messages);
  };

  const retry = () => {
    if (!error) return;
    const base = messages.slice(0, -1); // drop the unanswered question and resend it
    setMessages(base);
    send(error.question, error.images, base);
  };

  const saveToMistakes = async (idx: number) => {
    const ans = messages[idx];
    const ques = [...messages.slice(0, idx)].reverse().find(m => m.role === 'user');
    if (!ans || !ques) return;
    setSaved(s => ({ ...s, [idx]: 'busy' }));
    const r = await api.mistakeAdd(student.codeUsed, { source: 'ai', question: (ques.content || 'سؤال بصورة').slice(0, 3000), explanation: ans.content.slice(0, 6000), reason: 'لم أفهم الدرس' });
    setSaved(s => ({ ...s, [idx]: r.ok ? 'ok' : 'err' }));
  };

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPrep(true); setError(null);
    try {
      const room = MAX_IMAGES - images.length;
      const out: string[] = [];
      for (const f of Array.from(files).slice(0, Math.max(0, room))) out.push(await prepareImage(f));
      setImages(prev => [...prev, ...out].slice(0, MAX_IMAGES));
      if (files.length > room) setError({ msg: `أقصى عدد للصور ${MAX_IMAGES} في السؤال الواحد.`, retryable: false, question: '', images: [] });
    } catch (e: any) {
      setError({ msg: e?.message || 'تعذر تجهيز الصورة.', retryable: false, question: '', images: [] });
    }
    setPrep(false);
    if (camRef.current) camRef.current.value = '';
    if (galRef.current) galRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 min-h-[22rem] max-h-[32rem] overflow-y-auto space-y-3">
        {messages.length === 0 && !busy && (
          <div className="text-center text-slate-400 text-sm py-10 space-y-2">
            <Bot className="w-10 h-10 mx-auto text-emerald-400" />
            <p>اسأل المدرس الذكي عن أي مفهوم أو سؤال في الأحياء، أو صوّر المسألة وابعتها، وهيشرحلك خطوة بخطوة.</p>
            <p className="text-[11px]">الحد: 5 أسئلة في الدقيقة و40 في اليوم، و15 صورة في اليوم.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-100 border border-slate-700'
            }`}>
              {m.images && m.images.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {m.images.map((src, k) => <img key={k} src={src} alt="صورة المسألة" className="h-24 w-24 object-cover rounded-lg border border-slate-900/30" />)}
                </div>
              )}
              {!m.images?.length && m.imageCount ? <span className="block text-[11px] opacity-80 mb-1">📷 أُرسلت {m.imageCount} صورة</span> : null}
              {m.content}
              {m.role === 'assistant' && (
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <button type="button" disabled={saved[i] === 'busy' || saved[i] === 'ok'} onClick={() => saveToMistakes(i)}
                    className="text-[11px] font-bold text-emerald-300 hover:text-emerald-200 disabled:opacity-70">
                    {saved[i] === 'ok' ? '✓ اتحفظ في كل الأخطاء' : saved[i] === 'err' ? 'تعذر الحفظ. حاول تاني' : saved[i] === 'busy' ? 'جاري الحفظ…' : '+ احفظ السؤال ده في كل الأخطاء'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-end">
            <div className="rounded-2xl px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> {messages[messages.length - 1]?.images?.length ? 'المدرس الذكي بيقرا الصورة ويحل…' : 'المدرس الذكي بيجهز الشرح…'}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
          <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error.msg}</span>
          {error.retryable && (
            <button onClick={retry} disabled={busy} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 font-bold">
              <RotateCcw className="w-3.5 h-3.5" /> إعادة المحاولة
            </button>
          )}
        </div>
      )}

      {(images.length > 0 || prep) && (
        <div className="flex flex-wrap items-center gap-2">
          {images.map((src, i) => (
            <div key={i} className="relative">
              <img src={src} alt="معاينة" className="h-20 w-20 object-cover rounded-xl border border-slate-700" />
              <button type="button" onClick={() => setImages(images.filter((_, k) => k !== i))} aria-label="إزالة الصورة"
                className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
            </div>
          ))}
          {prep && <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> بجهّز الصورة…</span>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-2">
        <button type="button" onClick={() => setImageMode(false)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-black bg-slate-800 text-slate-200"><Bot className="w-4 h-4" /> المدرس الذكي</button>
        <button type="button" onClick={() => setImageMode(true)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-black bg-emerald-500 text-slate-950"><WandSparkles className="w-4 h-4" /> إنشاء صورة</button>
        {imageMode && <>
          <select value={imageRatio} onChange={e => setImageRatio(e.target.value as any)} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200">
            <option value="auto">المقاس تلقائي</option><option value="square">مربع</option><option value="portrait">طولي</option><option value="landscape">عرضي</option>
          </select>
          <input ref={referenceRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => addImageReference(e.target.files?.[0])} />
          <button type="button" onClick={() => referenceRef.current?.click()} disabled={imagePrep || busy} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200"><ImageIcon className="inline w-4 h-4 ml-1" /> {referenceImage ? "تغيير الصورة المرجعية" : "صورة مرجعية"}</button>
          {referenceImage && <button type="button" onClick={() => setReferenceImage("")} className="text-xs text-red-300">إزالة المرجع</button>}
        </>}
      </div>
      {imageMode && <p className="text-xs text-slate-400">اكتب وصفك بالمصري عادي؛ هنحسّن التكوين والإضاءة والتفاصيل تلقائيًا، ونختار المقاس المناسب لو اخترت تلقائي.</p>}
      {imageMode && generatedImages.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {generatedImages.map((item, i) => <div key={i} className="rounded-2xl border border-slate-700 bg-slate-900 p-3 space-y-2">
          <img src={item.image} alt={item.prompt} className="w-full rounded-xl object-contain max-h-[520px]" />
          <p className="text-xs text-slate-300">{item.prompt}</p>
          <a href={item.image} download={"ellool-ai-image-" + (i + 1) + ".jpg"} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950"><Download className="w-4 h-4" /> حفظ الصورة</a>
        </div>)}
      </div>}
      <form onSubmit={submit} className="flex gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e); } }}
          maxLength={2500}
          rows={2}
          placeholder={imageMode ? 'اكتب وصف الصورة بالمصري… مثال: بوستر سينمائي عن قانون أوم مع عناصر فيزيائية واقعية' : images.length ? 'اكتب سؤالك عن الصورة (اختياري)…' : 'اكتب سؤالك هنا…'}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <div className="flex flex-col gap-1.5">
          <button type="submit" disabled={!canSend}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs disabled:opacity-50 inline-flex items-center gap-1.5">
            {imageMode ? <WandSparkles className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />} {imageMode ? 'إنشاء الصورة' : 'إرسال'}
          </button>
          {messages.length > 0 && (
            <button type="button" onClick={() => { setMessages([]); setError(null); }}
              className="px-4 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-[11px] inline-flex items-center justify-center gap-1">
              <Trash2 className="w-3 h-3" /> مسح
            </button>
          )}
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => addFiles(e.target.files)} />
        <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
        <button type="button" onClick={() => camRef.current?.click()} disabled={images.length >= MAX_IMAGES || busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-emerald-300 font-bold text-xs disabled:opacity-50">
          <Camera className="w-4 h-4" /> إرسال صورة (تصوير)
        </button>
        <button type="button" onClick={() => galRef.current?.click()} disabled={images.length >= MAX_IMAGES || busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-emerald-300 font-bold text-xs disabled:opacity-50">
          <ImagePlus className="w-4 h-4" /> من المعرض
        </button>
        <span className="text-[11px] text-slate-500">حتى {MAX_IMAGES} صور للسؤال. الصور بتتحفظ بشكل خاص ومحدش غيرك يشوفها.</span>
      </div>
    </div>
  );
};
