import React, { useMemo, useState } from 'react';
import { Microscope, ZoomIn, ZoomOut, RotateCcw, Eye, FlaskConical } from 'lucide-react';

type Sample = 'onion' | 'cheek' | 'leaf';
const samples = {
  onion: { name:'بشرة البصل', note:'خلايا نباتية متراصة ذات جدر خلوية واضحة. قد تُستخدم صبغة مناسبة لإظهار النواة بصورة أوضح.', structure:'جدار خلوي واضح · نواة · سيتوبلازم · فجوة كبيرة', color:'#86efac' },
  cheek: { name:'خلايا بطانة الخد', note:'خلايا حيوانية طلائية؛ لا تمتلك جدارًا خلويًا، ويظهر حد الخلية والغشاء والسيتوبلازم والنواة في الشريحة المصبوغة.', structure:'غشاء بلازمي · سيتوبلازم · نواة', color:'#f9a8d4' },
  leaf: { name:'بشرة ورقة نبات', note:'تُظهر بشرة الورقة خلايا البشرة والثغور، وقد تُلاحظ الخلايا الحارسة المحيطة بفتحة الثغر.', structure:'خلايا البشرة · ثغر · خليتان حارستان', color:'#a3e635' }
} as const;

export const VirtualMicroscope: React.FC = () => {
  const [sample,setSample] = useState<Sample>('onion');
  const [zoom,setZoom] = useState(10);
  const [stain,setStain] = useState(true);
  const [labels,setLabels] = useState(true);
  const [focus,setFocus] = useState(65);
  const data=samples[sample];
  const cells=useMemo(()=>Array.from({length:sample==='leaf'?9:12},(_,i)=>i),[sample]);
  return <section dir="rtl" className="mt-7 rounded-3xl border border-violet-400/20 bg-slate-900/85 p-5 sm:p-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div><div className="text-xs font-bold text-violet-300 mb-1">المرحلة التالية · المجهر الافتراضي</div><h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2"><Microscope className="w-6 h-6 text-violet-300"/> افحص العينة بنفسك</h2><p className="text-xs text-slate-400 mt-1">غيّر الشريحة والتكبير والتركيز، ثم تعرّف على التراكيب الظاهرة.</p></div>
      <span className="text-xs rounded-full border border-violet-300/20 text-violet-200 px-3 py-1">محاكاة تعليمية توضيحية</span>
    </div>
    <div className="flex flex-wrap gap-2 mb-4">
      {(Object.keys(samples) as Sample[]).map(k=><button key={k} onClick={()=>{setSample(k);setFocus(65);}} className={`px-3 py-2 rounded-xl border text-xs font-bold ${sample===k?'bg-violet-400 text-slate-950 border-violet-300':'bg-slate-950 text-slate-300 border-slate-700'}`}>{samples[k].name}</button>)}
    </div>
    <div className="grid lg:grid-cols-[1.3fr_.8fr] gap-4">
      <div className="rounded-2xl border border-slate-700 bg-[#071018] p-3 overflow-hidden">
        <div className="flex justify-between text-[11px] text-slate-400 mb-2"><span>مجال الرؤية</span><span>تكبير تقريبي: ×{zoom*4}</span></div>
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#102b2b] border border-slate-700 flex items-center justify-center">
          <svg viewBox="0 0 600 450" className="w-full h-full" role="img" aria-label={`محاكاة توضيحية لعينة ${data.name}`}>
            <defs><radialGradient id="scopeBg"><stop stopColor="#254b49"/><stop offset="1" stopColor="#071b20"/></radialGradient><filter id="soft"><feGaussianBlur stdDeviation={stain?0:2}/></filter></defs>
            <rect width="600" height="450" fill="url(#scopeBg)"/>
            <g transform={`translate(300 225) scale(${zoom/10}) translate(-300 -225)`} filter="url(#soft)">
              {sample==='onion' && cells.map(i=>{const x=60+(i%4)*125,y=55+Math.floor(i/4)*118;return <g key={i}><rect x={x} y={y} width="112" height="104" rx="9" fill="#b7d7ad" fillOpacity=".12" stroke="#b7e2ae" strokeWidth="4"/><path d={`M ${x+10} ${y+12} Q ${x+55} ${y+2} ${x+100} ${y+14} M ${x+10} ${y+88} Q ${x+55} ${y+98} ${x+100} ${y+88}`} fill="none" stroke="#d9f99d" strokeOpacity=".35" strokeWidth="2"/><ellipse cx={x+68} cy={y+53} rx="12" ry="15" fill={stain?'#a78bfa':'#6b8c86'} fillOpacity=".8"/>{labels&&<text x={x+68} y={y+78} fill="#f8fafc" fontSize="10" textAnchor="middle">نواة</text>}</g>;})}
              {sample==='cheek' && cells.map(i=>{const x=35+(i%4)*137,y=45+Math.floor(i/4)*135;return <g key={i} transform={`rotate(${(i%3-1)*9} ${x+55} ${y+48})`}><path d={`M ${x+4} ${y+44} Q ${x+8} ${y+2} ${x+60} ${y+8} Q ${x+116} ${y+12} ${x+108} ${y+58} Q ${x+92} ${y+98} ${x+42} ${y+88} Q ${x-2} ${y+82} ${x+4} ${y+44}Z`} fill="#f9a8d4" fillOpacity=".2" stroke="#fbcfe8" strokeWidth="3"/><ellipse cx={x+58} cy={y+49} rx="15" ry="19" fill={stain?'#a78bfa':'#9d7890'} fillOpacity=".85"/>{labels&&<text x={x+58} y={y+78} fill="#fff" fontSize="10" textAnchor="middle">نواة</text>}</g>;})}
              {sample==='leaf' && cells.map(i=>{const x=35+(i%3)*180,y=35+Math.floor(i/3)*130;return <g key={i}><path d={`M ${x+8} ${y+45} Q ${x+35} ${y-4} ${x+145} ${y+15} Q ${x+168} ${y+70} ${x+120} ${y+100} Q ${x+25} ${y+112} ${x+8} ${y+45}Z`} fill="#a3e635" fillOpacity=".13" stroke="#bef264" strokeWidth="3"/>{[0,1,2,3].map(j=><ellipse key={j} cx={x+42+j*22} cy={y+46+(j%2)*20} rx="7" ry="3" fill="#4ade80" opacity=".8"/> )}</g>;})}
              {sample==='leaf'&&<g><path d="M280 80 Q240 220 280 365 M320 80 Q360 220 320 365" stroke="#facc15" strokeWidth="8" fill="none" strokeLinecap="round"/><ellipse cx="300" cy="225" rx="22" ry="65" fill="#071018" stroke="#bef264" strokeWidth="5"/>{labels&&<text x="340" y="225" fill="white" fontSize="15">فتحة الثغر</text>}</g>}
            </g>
            <circle cx="300" cy="225" r="210" fill="none" stroke="#dbeafe" strokeOpacity=".28" strokeWidth="3"/>
            <circle cx="300" cy="225" r="4" fill="#fff" opacity=".5"/>
          </svg>
          <div className="absolute top-3 left-3 rounded-lg bg-black/40 px-2 py-1 text-[10px] text-white/80">تركيز {focus}%</div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <label className="text-xs text-slate-300">التكبير <span className="text-violet-300 font-bold">×{zoom*4}</span><input aria-label="التكبير" type="range" min="5" max="20" value={zoom} onChange={e=>setZoom(Number(e.target.value))} className="w-full accent-violet-400 mt-2"/></label>
          <label className="text-xs text-slate-300">التركيز <span className="text-violet-300 font-bold">{focus}%</span><input aria-label="التركيز" type="range" min="0" max="100" value={focus} onChange={e=>setFocus(Number(e.target.value))} className="w-full accent-violet-400 mt-2"/></label>
        </div>
      </div>
      <aside className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 flex flex-col">
        <h3 className="font-black text-white text-lg mb-2">{data.name}</h3>
        <p className="text-sm leading-7 text-slate-300">{data.note}</p>
        <div className="mt-4 rounded-xl bg-violet-400/10 border border-violet-300/20 p-3"><div className="text-[11px] text-violet-200 font-bold mb-1">تراكيب يُتوقع ملاحظتها</div><p className="text-sm text-slate-200 leading-6">{data.structure}</p></div>
        <div className="mt-4 flex flex-col gap-3">
          <button onClick={()=>setStain(v=>!v)} className="flex items-center justify-between rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200"><span className="flex items-center gap-2"><FlaskConical className="w-4 h-4"/>محاكاة تأثير الصبغة</span><span>{stain?'مفعّلة':'متوقفة'}</span></button>
          <button onClick={()=>setLabels(v=>!v)} className="flex items-center justify-between rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200"><span className="flex items-center gap-2"><Eye className="w-4 h-4"/>مسميات التراكيب</span><span>{labels?'ظاهرة':'مخفية'}</span></button>
          <button onClick={()=>{setZoom(10);setFocus(65);setStain(true);setLabels(true);}} className="flex items-center justify-center gap-2 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold text-xs px-3 py-3"><RotateCcw className="w-4 h-4"/>إعادة ضبط المجهر</button>
        </div>
        <div className="mt-auto pt-4 text-[10px] text-slate-500 leading-6">هذه رسومات تخطيطية للتعلم وليست صورًا مجهرية حقيقية أو مقياسًا دقيقًا. تختلف التفاصيل المرئية حسب نوع العينة وطريقة إعداد الشريحة والصبغة.</div>
      </aside>
    </div>
  </section>;
};
