import React, { useMemo, useState } from 'react';
import { Dna, Info, RotateCcw, Sprout } from 'lucide-react';

type Genotype = 'AA' | 'Aa' | 'aa';
const gametes = (g: Genotype) => g === 'AA' ? ['A','A'] : g === 'aa' ? ['a','a'] : ['A','a'];
const normalize = (a: string, b: string) => [a,b].sort((x,y)=>x===y?0:x==='A'?-1:1).join('') as Genotype;

export const GeneticsSimulator: React.FC = () => {
  const [mother,setMother] = useState<Genotype>('Aa');
  const [father,setFather] = useState<Genotype>('Aa');
  const [showDetails,setShowDetails] = useState(false);
  const result = useMemo(() => {
    const mg=gametes(mother), fg=gametes(father);
    const cells=mg.map(m=>fg.map(f=>normalize(m,f)));
    const counts:Record<Genotype,number>={AA:0,Aa:0,aa:0};
    cells.flat().forEach(g=>counts[g]++);
    const dominant=counts.AA+counts.Aa;
    return {mg,fg,cells,counts,dominant,recessive:counts.aa};
  },[mother,father]);
  const reset=()=>{setMother('Aa');setFather('Aa');setShowDetails(false);};
  const selectClass='w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-3 text-white font-bold outline-none focus:border-emerald-400';
  return <section dir="rtl" className="rounded-3xl border border-emerald-400/20 bg-slate-950/90 p-5 sm:p-7 shadow-xl space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div><div className="inline-flex items-center gap-2 text-emerald-300 text-xs font-bold mb-2"><Dna className="w-4 h-4"/> مختبر الوراثة التفاعلي</div><h2 className="text-2xl font-black text-white">محاكي التهجين ومربع بانيت</h2><p className="text-sm text-slate-400 mt-1">غيّر الطراز الجيني للأبوين وشاهد احتمالات الأنماط الجينية والصفات.</p></div>
      <button onClick={reset} className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-emerald-400"><RotateCcw className="w-4 h-4"/>إعادة الضبط</button>
    </div>
    <div className="grid sm:grid-cols-2 gap-3">
      <label className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><span className="block text-xs text-slate-400 mb-2">الطراز الجيني للأم</span><select className={selectClass} value={mother} onChange={e=>setMother(e.target.value as Genotype)}><option value="AA">AA — نقي سائد</option><option value="Aa">Aa — هجين</option><option value="aa">aa — نقي متنحٍ</option></select></label>
      <label className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><span className="block text-xs text-slate-400 mb-2">الطراز الجيني للأب</span><select className={selectClass} value={father} onChange={e=>setFather(e.target.value as Genotype)}><option value="AA">AA — نقي سائد</option><option value="Aa">Aa — هجين</option><option value="aa">aa — نقي متنحٍ</option></select></label>
    </div>
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4"><Sprout className="w-5 h-5 text-emerald-400"/><h3 className="font-black text-white">مربع بانيت — التزاوج الحالي</h3></div>
      <div className="max-w-sm mx-auto grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-800 p-3 text-xs text-slate-500">بويضات الأم ←<br/>حيوانات الأب المنوية ↓</div>
        {result.fg.map((g,i)=><div key={'head'+i} className="rounded-xl bg-cyan-400/15 border border-cyan-300/30 p-3 text-xl font-black text-cyan-200">{g}</div>)}
        {result.cells.map((row,i)=><React.Fragment key={'row'+i}><div className="rounded-xl bg-emerald-400/15 border border-emerald-300/30 p-3 text-xl font-black text-emerald-200">{result.mg[i]}</div>{row.map((g,j)=><div key={i+'-'+j} className={`rounded-xl border p-4 text-xl font-black ${g==='aa'?'border-amber-300/30 bg-amber-300/10 text-amber-200':'border-emerald-300/30 bg-emerald-300/10 text-emerald-200'}`}>{g}</div>)}</React.Fragment>)}
      </div>
      <p className="text-center text-xs text-slate-500 mt-3">كل مربع يمثل احتمالًا متساويًا في هذا النموذج، وليس نتيجة مؤكدة لفرد بعينه.</p>
    </div>
    <div className="grid sm:grid-cols-2 gap-3">
      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4"><div className="text-xs text-emerald-200 mb-1">صفة سائدة (A_)</div><div className="text-3xl font-black text-white">{result.dominant*25}%</div><div className="text-xs text-slate-400 mt-1">{result.counts.AA+result.counts.Aa} من 4 احتمالات</div></div>
      <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4"><div className="text-xs text-amber-200 mb-1">صفة متنحية (aa)</div><div className="text-3xl font-black text-white">{result.recessive*25}%</div><div className="text-xs text-slate-400 mt-1">{result.recessive} من 4 احتمالات</div></div>
    </div>
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
      <h3 className="font-black text-white mb-3">النسب الجينية</h3>
      <div className="grid grid-cols-3 gap-2 text-center">{(['AA','Aa','aa'] as Genotype[]).map(g=><div key={g} className="rounded-xl bg-slate-950 p-3"><div className="font-black text-lg text-white">{g}</div><div className="text-xl font-black text-cyan-300">{result.counts[g]*25}%</div></div>)}</div>
    </div>
    <button onClick={()=>setShowDetails(v=>!v)} className="text-sm font-bold text-cyan-300 hover:text-cyan-200">{showDetails?'إخفاء التفسير':'عرض التفسير العلمي'}</button>
    {showDetails&&<div className="rounded-xl bg-slate-900 border border-slate-700 p-4 text-sm leading-7 text-slate-300">يحمل كل مشيج أليلًا واحدًا من الزوج. عند الإخصاب يجتمع أليل من الأم مع أليل من الأب، فتتكون أربعة احتمالات متساوية في مربع بانيت. في نموذج السيادة التامة يظهر الأليل السائد A في الطرازين AA وAa، ولا تظهر الصفة المتنحية إلا في aa.</div>}
    <div className="flex items-start gap-2 rounded-xl border border-sky-300/20 bg-sky-300/5 p-3 text-xs leading-6 text-sky-100"><Info className="w-4 h-4 shrink-0 mt-0.5"/>مثال تعليمي مبسط مستوحى من صفة شكل بذور البازلاء: الاستدارة سائدة (A) والتجعد متنحٍ (a). يفترض جينًا واحدًا وسيادة تامة وانعزال الأليلات؛ ولا ينطبق هذا النموذج على كل الصفات، خصوصًا الصفات البشرية المعقدة.</div>
  </section>;
};
