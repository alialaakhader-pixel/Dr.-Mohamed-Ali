import React, { useMemo, useState } from 'react';
import { Microscope, Dna, Leaf, CircleDot, Info, Sparkles, RotateCcw } from 'lucide-react';

type CellKind = 'animal' | 'plant';
type Part = { id:string; name:string; en:string; role:string; x:number; y:number; rx:number; ry:number; color:string };

const animalParts: Part[] = [
  {id:'nucleus',name:'النواة',en:'Nucleus',role:'تحتوي المادة الوراثية DNA وتتحكم في أنشطة الخلية من خلال تنظيم التعبير الجيني.',x:49,y:49,rx:13,ry:12,color:'#a78bfa'},
  {id:'mitochondria',name:'الميتوكوندريا',en:'Mitochondrion',role:'موقع رئيسي للتنفس الهوائي وإنتاج معظم ATP في الخلايا حقيقية النواة.',x:24,y:36,rx:8,ry:4,color:'#fb923c'},
  {id:'er',name:'الشبكة الإندوبلازمية',en:'Endoplasmic reticulum',role:'شبكة أغشية؛ الخشنة ترتبط بتصنيع ومعالجة البروتينات، والملساء تشارك في تصنيع الدهون ووظائف أخرى.',x:66,y:32,rx:10,ry:5,color:'#38bdf8'},
  {id:'golgi',name:'جهاز جولجي',en:'Golgi apparatus',role:'يعدّل بعض البروتينات والدهون ويصنفها ويغلفها في حويصلات لتوجيهها إلى أماكنها.',x:70,y:66,rx:9,ry:5,color:'#f472b6'},
  {id:'ribosome',name:'الريبوسومات',en:'Ribosomes',role:'المواقع التي تتم عليها ترجمة mRNA لتكوين سلاسل عديد الببتيد.',x:31,y:66,rx:5,ry:4,color:'#facc15'},
  {id:'lysosome',name:'الجسيمات الحالّة',en:'Lysosomes',role:'حويصلات تحتوي إنزيمات محللة، وتشارك في الهضم داخل الخلية وإعادة تدوير بعض مكوناتها.',x:82,y:48,rx:4,ry:4,color:'#fb7185'},
];
const plantParts: Part[] = [
  {id:'nucleus',name:'النواة',en:'Nucleus',role:'تحتوي المادة الوراثية DNA وتتحكم في أنشطة الخلية من خلال تنظيم التعبير الجيني.',x:49,y:49,rx:12,ry:11,color:'#a78bfa'},
  {id:'chloroplast',name:'البلاستيدة الخضراء',en:'Chloroplast',role:'تحتوي أصباغ البناء الضوئي، وتتم داخلها تفاعلات تحويل الطاقة الضوئية إلى طاقة كيميائية.',x:25,y:34,rx:9,ry:5,color:'#4ade80'},
  {id:'vacuole',name:'الفجوة العصارية',en:'الفجوة العصارية',role:'تخزن الماء ومواد مذابة مختلفة، وتساعد في الحفاظ على ضغط الامتلاء في الخلية النباتية.',x:68,y:48,rx:15,ry:13,color:'#38bdf8'},
  {id:'mitochondria',name:'الميتوكوندريا',en:'Mitochondrion',role:'موقع رئيسي للتنفس الهوائي وإنتاج معظم ATP في الخلايا حقيقية النواة.',x:28,y:69,rx:8,ry:4,color:'#fb923c'},
  {id:'golgi',name:'جهاز جولجي',en:'Golgi apparatus',role:'يعدّل بعض البروتينات والدهون ويصنفها ويغلفها في حويصلات.',x:79,y:70,rx:8,ry:5,color:'#f472b6'},
  {id:'ribosome',name:'الريبوسومات',en:'الريبوسومات',role:'المواقع التي تتم عليها ترجمة mRNA لتكوين سلاسل عديد الببتيد.',x:78,y:29,rx:5,ry:4,color:'#facc15'},
];

export const LivingBiologyLab: React.FC = () => {
  const [kind,setKind] = useState<CellKind>('animal');
  const [selected,setSelected] = useState('nucleus');
  const [showLabels,setShowLabels] = useState(true);
  const parts = useMemo(()=>kind==='animal'?animalParts:plantParts,[kind]);
  const active = parts.find(p=>p.id===selected) || parts[0];

  const chooseKind=(next:CellKind)=>{setKind(next);setSelected('nucleus');};

  return (
    <section dir="rtl" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-slate-950/90 shadow-2xl">
        <div className="absolute inset-0 pointer-events-none opacity-40" style={{backgroundImage:'radial-gradient(circle at 15% 15%,rgba(16,185,129,.24),transparent 34%),radial-gradient(circle at 85% 80%,rgba(14,165,233,.18),transparent 35%)'}}/>
        <div className="relative p-5 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300 mb-3"><Microscope className="w-4 h-4"/> مختبر الأحياء الحي · المرحلة الأولى</div>
              <h1 className="text-2xl sm:text-4xl font-black text-white">استكشف الخلية بنفسك</h1>
              <p className="text-slate-400 mt-2 text-sm sm:text-base">اختر أحد التراكيب داخل النموذج، واكتشف اسمه ووظيفته العلمية.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>chooseKind('animal')} className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition ${kind==='animal'?'bg-emerald-500 text-slate-950 border-emerald-400':'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-400'}`}><CircleDot className="inline w-4 h-4 ml-2"/>خلية حيوانية</button>
              <button onClick={()=>chooseKind('plant')} className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition ${kind==='plant'?'bg-emerald-500 text-slate-950 border-emerald-400':'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-400'}`}><Leaf className="inline w-4 h-4 ml-2"/>خلية نباتية</button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.35fr_.8fr] gap-5 items-stretch">
            <div className="relative rounded-3xl border border-slate-700/70 bg-[#061a1b] p-3 sm:p-5 min-h-[330px] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(rgba(110,231,183,.45) 1px,transparent 1px)',backgroundSize:'22px 22px'}}/>
              <svg viewBox="0 0 100 100" className="relative w-full max-w-[540px] h-auto drop-shadow-2xl" role="img" aria-label={kind==='animal'?'رسم تفاعلي لخلية حيوانية':'رسم تفاعلي لخلية نباتية'}>
                {kind==='plant' ? <><rect x="5" y="7" width="90" height="86" rx="15" fill="#14532d" fillOpacity=".42" stroke="#86efac" strokeWidth="2.5"/><rect x="9" y="11" width="82" height="78" rx="12" fill="#0f766e" fillOpacity=".16" stroke="#5eead4" strokeWidth="1.2"/></> : <><ellipse cx="50" cy="50" rx="45" ry="42" fill="#0f766e" fillOpacity=".23" stroke="#5eead4" strokeWidth="2.2"/><ellipse cx="50" cy="50" rx="42" ry="39" fill="#0f766e" fillOpacity=".12" stroke="#99f6e4" strokeOpacity=".55" strokeWidth=".7"/></>}
                <path d="M18 46 Q25 24 42 29 T72 24 M18 57 Q28 78 43 72 T78 76" fill="none" stroke="#2dd4bf" strokeOpacity=".35" strokeWidth="1.2"/>
                {kind==='animal' && <g fill="#fb7185" fillOpacity=".18" stroke="#fb7185" strokeOpacity=".65"><circle cx="18" cy="24" r="2.4"/><circle cx="83" cy="77" r="2.8"/><circle cx="84" cy="22" r="1.8"/></g>}
                {parts.map((p)=>{
                  const chosen=p.id===selected;
                  return <g key={p.id} onClick={()=>setSelected(p.id)} className="cursor-pointer" role="button" aria-label={p.name} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(p.id);}}}>
                    <ellipse cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill={p.color} fillOpacity={chosen?'.72':'.3'} stroke={p.color} strokeWidth={chosen?'1.4':'.65'} className="transition-all"/>
                    {p.id==='nucleus' && <><ellipse cx={p.x} cy={p.y} rx={p.rx*.55} ry={p.ry*.55} fill="#7c3aed" fillOpacity=".7"/><circle cx={p.x+3} cy={p.y-2} r="2" fill="#ddd6fe"/></>}
                    {p.id==='mitochondria' && <path d={`M ${p.x-p.rx*.65} ${p.y} q 3 -3 5 0 t 5 0`} fill="none" stroke="#7c2d12" strokeWidth=".8"/>}
                    {p.id==='chloroplast' && <g stroke="#166534" strokeWidth=".8"><path d={`M ${p.x-5} ${p.y-2} h10 M ${p.x-5} ${p.y} h10 M ${p.x-5} ${p.y+2} h10`}/></g>}
                    {showLabels && <text x={p.x} y={p.y+p.ry+4} textAnchor="middle" fontSize="3.2" fill="#ecfeff" stroke="#052e2b" strokeWidth=".55" paintOrder="stroke">{p.name}</text>}
                    {chosen && <ellipse cx={p.x} cy={p.y} rx={p.rx+2.2} ry={p.ry+2.2} fill="none" stroke="#f8fafc" strokeWidth=".65" strokeDasharray="1.5 1.2"/>}
                  </g>;
                })}
              </svg>
              <div className="absolute bottom-3 left-3 flex gap-2">
                <button onClick={()=>setShowLabels(v=>!v)} className="px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700 text-xs font-bold text-slate-200">{showLabels?'إخفاء المسميات':'إظهار المسميات'}</button>
                <button onClick={()=>setSelected('nucleus')} className="p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-300" aria-label="إعادة ضبط التحديد"><RotateCcw className="w-4 h-4"/></button>
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-5">
                <span className="text-xs font-bold text-emerald-300">التركيب المحدد</span>
                <span className="text-[10px] text-slate-500" dir="ltr">{active.en}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{backgroundColor:active.color+'22',color:active.color}}><Dna className="w-6 h-6"/></div>
              <h2 className="text-2xl font-black text-white">{active.name}</h2>
              <p className="text-sm leading-8 text-slate-300 mt-3">{active.role}</p>
              <div className="mt-auto pt-6">
                <div className="flex items-start gap-2 text-xs leading-6 text-slate-500 border-t border-slate-800 pt-4"><Info className="w-4 h-4 mt-1 shrink-0 text-emerald-400"/>نموذج تعليمي توضيحي مبسط، وليس مقياسًا حقيقيًا لأحجام العضيات أو مواقعها. راجع شرح الدكتور ومراجع المنهج للتفاصيل الدقيقة.</div>
              </div>
            </aside>
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs text-emerald-200/80"><Sparkles className="w-4 h-4"/> المرحلة التالية: إضافة تكبير وتحريك داخل الخلية ومحاكاة العمليات الحيوية خطوة بخطوة.</div>
        </div>
      </div>
    </section>
  );
};
