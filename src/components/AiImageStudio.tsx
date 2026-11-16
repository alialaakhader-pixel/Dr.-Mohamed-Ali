import React, { useRef, useState } from 'react';
import { Sparkles, Upload, Image as ImageIcon, Download, Loader2, RefreshCw, UserRound, WandSparkles } from 'lucide-react';
import { generateAiPoster } from '../services/api';

const REF_KEY = 'ehyaa_teacher_reference_image_v1';
const styles = [
  'cinematic premium editorial campaign, dramatic blue and teal studio lighting, dynamic diagonal composition',
  'luxury modern scientific magazine cover, clean ivory background, deep navy typography zones, refined 3D elements',
  'high-energy educational launch campaign, electric cobalt and warm yellow accents, bold layered composition',
  'photorealistic modern biology laboratory, cinematic depth, realistic glass and scientific materials',
  'minimal premium academic brand, elegant negative space, soft daylight, precise scientific hero object',
  'futuristic 3D science visualization, volumetric lighting, rich depth, polished materials, editorial layout',
  'bold sports-documentary inspired education campaign, energetic framing, crisp contrast, authentic photography'
];

const MASTER = `أنت مدير فني ومصمم إعلانات عالمي متخصص في الحملات التعليمية والعلمية العربية.
أنشئ تصميماً إعلانياً أصلياً عالي الجودة لمنصة الدكتور محمد علي للأحياء.
الهوية: اسم العلامة دائماً "الدكتور محمد علي" و"Biology"، اللغة العربية المصرية السليمة، اتجاه RTL، ألوان الهوية الأساسية أزرق ملكي/كحلي مع تركواز وأصفر ذهبي وأبيض. لا تضف شعارات جهات أخرى أو علامات مائية أو أرقام تواصل أو مواعيد غير مقدمة.
التنوع: كل توليد يجب أن يختار تكويناً بصرياً جديداً جذرياً؛ بدّل زاوية الكاميرا، توزيع العناصر، لوحة الألوان الثانوية، نوع الخلفية، الإضاءة، العمق، أشكال الإطارات، والـvisual metaphor. لا تكرر قالباً ثابتاً ولا تكتفِ بتبديل الألوان.
جودة التنفيذ: إعلان احترافي قابل للنشر، تسلسل بصري واضح، عنصر رئيسي واحد قوي، تفاصيل دقيقة، تباين مقروء، مساحات تنفس، حواف نظيفة، خامات وإضاءة واقعية، 3D عالي الجودة عند الحاجة، وتكوين متوازن على الهاتف.
المحتوى العلمي: إذا كان الموضوع أحياء، استخدم فقط بنية تشريحية/خلويّة/جزيئية صحيحة ومناسبة للموضوع. لا تخترع أعضاء أو أجزاء أو تسميات أو علاقات علمية. لا تخلط بين المفاهيم المتشابهة. اجعل المجسمات أقرب للمرجع العلمي لا للخيال.
النصوص: لا تخترع حقائق أو مواعيد أو أسعاراً. استخدم النص الذي أدخله المستخدم فقط. حافظ على كتابة الاسم والمصطلحات كما هي. إذا كان النص العربي داخل الصورة معرضاً للأخطاء، اترك مساحة واضحة للنص بدلاً من اختراع حروف مشوهة.
المخرَج: صورة واحدة عمودية بنسبة 4:5 مناسبة لمنشور سوشيال ميديا، عالية التفاصيل، بلا واجهة تطبيق أو موك أب.`;

export const AiImageStudio: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [copy, setCopy] = useState('الدكتور محمد علي | Biology');
  const [style, setStyle] = useState('');
  const [includeTeacher, setIncludeTeacher] = useState(true);
  const [reference, setReference] = useState<string>(() => { try { return localStorage.getItem(REF_KEY) || ''; } catch { return ''; } });
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refInput = useRef<HTMLInputElement>(null);

  const readReference = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setError('استخدم صورة JPG أو PNG أو WebP.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('حجم الصورة يجب ألا يتجاوز 5 ميجابايت.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || '');
      setReference(data);
      try { localStorage.setItem(REF_KEY, data); } catch { setError('تعذر حفظ المرجع على هذا الجهاز؛ قد تكون الصورة كبيرة.'); }
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    if (topic.trim().length < 4) { setError('اكتب فكرة التصميم أو موضوع الدرس بالتفصيل.'); return; }
    if (includeTeacher && !reference) { setError('ارفع صورة الدكتور مرة واحدة لتصبح المرجع الافتراضي المحفوظ على هذا الجهاز.'); refInput.current?.click(); return; }
    setBusy(true); setError(''); setResult('');
    const variation = styles[Math.floor(Math.random() * styles.length)];
    const prompt = [MASTER, 'اتجاه فني مختلف لهذه المحاولة: ' + (style.trim() || variation), 'موضوع الإعلان ومحتواه: ' + topic.trim(), 'النصوص المطلوب إظهارها حرفياً: ' + copy.trim(), 'اختلاف إلزامي: ابتكر تكويناً جديداً وغير متوقع مقارنة بالتصميمات السابقة. لا تنسخ الإعلان المرجعي.'].join('\n\n');
    try {
      const r = await generateAiPoster(prompt, includeTeacher ? reference : '');
      if (!r?.ok || !r.image) throw new Error(r?.error || 'لم يتم إنشاء الصورة.');
      setResult(r.image);
    } catch (e: any) {
      setError(e?.message || 'تعذر الاتصال بمحرك توليد الصور.'); 
    } finally { setBusy(false); }
  };

  const save = () => {
    if (!result) return;
    const a = document.createElement('a'); a.href = result; a.download = 'dr-mohamed-ali-biology-design.png'; a.click();
  };

  return <section dir="rtl" className="space-y-5 text-white">
    <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-5 md:p-7">
      <div className="flex items-center gap-3 mb-3"><div className="rounded-2xl bg-cyan-400/15 p-3 text-cyan-300"><WandSparkles className="w-7 h-7"/></div><div><h2 className="text-xl md:text-2xl font-black">استوديو الذكاء الاصطناعي للصور</h2><p className="text-sm text-slate-400">مصمم إعلانات علمية متجدد لهوية الدكتور محمد علي</p></div></div>
      <p className="text-sm text-slate-300 leading-7">اكتب فكرة الإعلان أو الدرس، وسيُنشئ المحرك تصميماً جديداً في كل مرة مع مراعاة الهوية العلمية والبصرية.</p>
      <div className="grid md:grid-cols-2 gap-4 mt-5">
        <label className="block"><span className="text-sm font-bold text-slate-300">فكرة التصميم / موضوع الدرس</span><textarea value={topic} onChange={e=>setTopic(e.target.value)} rows={4} maxLength={1800} placeholder="مثال: إعلان احترافي لشرح فصل الدعامة والحركة، مع إبراز الهيكل العظمي والمفاصل بصورة تشريحية علمية دقيقة..." className="mt-2 w-full rounded-2xl bg-slate-950/70 border border-slate-700 p-3 text-sm outline-none focus:border-cyan-400"/></label>
        <div className="space-y-3">
          <label className="block"><span className="text-sm font-bold text-slate-300">النصوص التي تظهر في التصميم</span><textarea value={copy} onChange={e=>setCopy(e.target.value)} rows={2} maxLength={500} className="mt-2 w-full rounded-2xl bg-slate-950/70 border border-slate-700 p-3 text-sm outline-none focus:border-cyan-400"/></label>
          <label className="block"><span className="text-sm font-bold text-slate-300">توجيه فني إضافي (اختياري)</span><input value={style} onChange={e=>setStyle(e.target.value)} maxLength={300} placeholder="مثال: أزرق ملكي، إضاءة سينمائية، 3D واقعي..." className="mt-2 w-full rounded-2xl bg-slate-950/70 border border-slate-700 p-3 text-sm outline-none focus:border-cyan-400"/></label>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={includeTeacher} onChange={e=>setIncludeTeacher(e.target.checked)} className="accent-cyan-400 w-4 h-4"/> استخدم صورة الدكتور كمرجع افتراضي للملامح</label>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/50 p-3 flex flex-wrap items-center gap-3">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center">{reference ? <img src={reference} className="w-full h-full object-cover" alt="مرجع الدكتور"/> : <UserRound className="w-7 h-7 text-slate-500"/>}</div>
        <div className="flex-1 min-w-40"><p className="font-bold text-sm">صورة الدكتور المرجعية</p><p className="text-xs text-slate-400 mt-1">{reference ? 'محفوظة على هذا الجهاز وتُستخدم تلقائياً عند تفعيل الخيار.' : 'ارفع الصورة مرة واحدة ليتم حفظها كمرجع افتراضي على هذا الجهاز.'}</p></div>
        <input ref={refInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>readReference(e.target.files?.[0])}/>
        <button type="button" onClick={()=>refInput.current?.click()} className="rounded-xl border border-cyan-400/40 px-3 py-2 text-xs font-bold text-cyan-200 flex items-center gap-2"><Upload className="w-4 h-4"/> {reference ? 'تغيير الصورة المرجعية' : 'رفع صورة الدكتور'}</button>
        {reference && <button type="button" onClick={()=>{setReference('');localStorage.removeItem(REF_KEY);}} className="text-xs text-red-300">مسح المرجع</button>}
      </div>
      {error && <p className="mt-3 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-200">{error}</p>}
      <button type="button" disabled={busy} onClick={generate} className="mt-5 w-full md:w-auto rounded-2xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 px-6 py-3 text-slate-950 font-black flex items-center justify-center gap-2">
        {busy ? <><Loader2 className="w-5 h-5 animate-spin"/> جاري ابتكار التصميم...</> : <><Sparkles className="w-5 h-5"/> توليد تصميم جديد ومختلف</>}
      </button>
    </div>
    {result && <div className="rounded-3xl border border-slate-700 bg-slate-900 p-4 space-y-3"><div className="flex items-center justify-between gap-2"><h3 className="font-black">التصميم الناتج</h3><div className="flex gap-2"><button onClick={save} className="rounded-xl bg-emerald-500 text-slate-950 px-3 py-2 text-xs font-black flex items-center gap-1"><Download className="w-4 h-4"/> حفظ</button><button onClick={generate} disabled={busy} className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-bold flex items-center gap-1"><RefreshCw className="w-4 h-4"/> تصميم آخر</button></div></div><img src={result} alt="تصميم مولّد" className="mx-auto max-h-[850px] w-auto max-w-full rounded-xl"/></div>}
  </section>;
};
