import React, { useState } from 'react';
import { MapPinned, Mountain, Waves, Layers3, Compass, ExternalLink } from 'lucide-react';

type Region = {
  id: string;
  name: string;
  short: string;
  description: string;
  features: string[];
  x: number;
  y: number;
};

const REGIONS: Region[] = [
  {
    id: 'west', name: 'الصحراء الغربية', short: 'هضاب ومنخفضات وواحات',
    description: 'تمتد غرب وادي النيل حتى الحدود الليبية، وتتميز بسطح صحراوي واسع وهضاب ومنخفضات وواحات مثل سيوة والبحرية والفرافرة والداخلة والخارجة.',
    features: ['منخفض القطارة', 'واحات سيوة والبحرية والفرافرة', 'هضبة الجلف الكبير'],
    x: 145, y: 175
  },
  {
    id: 'nile', name: 'وادي النيل والدلتا', short: 'ممر نهري ورواسب حديثة',
    description: 'يمتد وادي النيل من جنوب مصر شمالًا، ويتسع شمال القاهرة ليكوّن دلتا النيل بفرعي رشيد ودمياط. وتنتشر على امتداده رواسب نهرية حديثة.',
    features: ['وادي النيل', 'دلتا النيل', 'رواسب الطمي النهري'],
    x: 267, y: 110
  },
  {
    id: 'east', name: 'الصحراء الشرقية', short: 'جبال البحر الأحمر وصخور القاعدة',
    description: 'تقع بين وادي النيل والبحر الأحمر. وتظهر بها سلاسل جبلية وصخور قاعدية قديمة، وتوجد نطاقات من الصخور النارية والمتحولة في أجزاء واسعة منها.',
    features: ['جبال البحر الأحمر', 'صخور القاعدة القديمة', 'أودية تصب نحو البحر الأحمر'],
    x: 335, y: 205
  },
  {
    id: 'sinai', name: 'شبه جزيرة سيناء', short: 'هضاب وجبال وتنوع صخري',
    description: 'تقع شمال شرق مصر بين خليجي السويس والعقبة. يختلف شمالها عن جنوبها؛ ويضم الجنوب نطاقات جبلية وعرة تظهر بها صخور نارية ومتحولة قديمة.',
    features: ['جبال جنوب سيناء', 'هضبة التيه', 'خليجا السويس والعقبة'],
    x: 408, y: 115
  },
  {
    id: 'redsea', name: 'ساحل البحر الأحمر', short: 'ساحل جبلي وأودية',
    description: 'يمتد بمحاذاة الجانب الشرقي للصحراء الشرقية، وتقترب الجبال في مواضع كثيرة من الساحل، وتقطعها أودية قصيرة تتجه نحو البحر.',
    features: ['سلاسل جبلية ساحلية', 'أودية البحر الأحمر', 'سهل ساحلي ضيق في مواضع عديدة'],
    x: 366, y: 275
  },
  {
    id: 'south', name: 'جنوب مصر والنوبة', short: 'النيل وبحيرة ناصر ومكاشف صخرية',
    description: 'تظهر في أقصى الجنوب مناطق صخرية ومكاشف قديمة، كما يمتد وادي النيل جنوبًا عبر منطقة النوبة حتى بحيرة ناصر.',
    features: ['أسوان', 'بحيرة ناصر', 'مكاشف صخور قديمة في مناطق متفرقة'],
    x: 265, y: 315
  }
];

export const GeologyAtlas: React.FC = () => {
  const [selectedId, setSelectedId] = useState('west');
  const selected = REGIONS.find(region => region.id === selectedId) || REGIONS[0];

  return (
    <section dir="rtl" className="max-w-7xl mx-auto px-4 sm:px-6 pb-10 space-y-5">
      <header className="rounded-[2rem] border border-cyan-400/20 bg-gradient-to-br from-slate-950 via-[#102b31] to-slate-950 p-5 sm:p-8 shadow-xl">
        <div className="flex items-center gap-2 text-cyan-200 text-xs font-bold mb-3"><MapPinned className="w-4 h-4" /> أطلس مصر الجيولوجي التفاعلي</div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">اكتشف تضاريس وأقاليم مصر</h2>
        <p className="text-sm text-slate-300 mt-2 leading-7">اختر إقليمًا من الخريطة للتعرف على موقعه وأبرز مظاهره الطبيعية والجيولوجية.</p>
      </header>

      <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-4">
        <div className="rounded-3xl border border-slate-700 bg-[#07151d] p-3 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-sm font-black text-white">خريطة استكشافية لمصر</div>
            <span className="text-[10px] text-slate-400">اضغط على إحدى العلامات</span>
          </div>
          <svg viewBox="0 0 520 390" role="img" aria-label="خريطة تخطيطية لمصر ومناطقها الجغرافية" className="w-full h-auto rounded-2xl bg-[#0b2029]">
            <defs>
              <linearGradient id="egyptLand" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#b99a62" />
                <stop offset="100%" stopColor="#6f795b" />
              </linearGradient>
            </defs>
            <path d="M190 28 L320 28 L354 48 L390 62 L424 74 L452 99 L433 125 L447 151 L420 184 L402 222 L388 267 L360 327 L330 355 L296 350 L276 318 L255 287 L241 253 L225 221 L213 190 L201 161 L184 128 L174 91 Z" fill="url(#egyptLand)" stroke="#e7d2a3" strokeWidth="2.5" />
            <path d="M184 28 L320 28 L354 48 L390 62 L424 74 L452 99 L433 125 L447 151 L420 184 L402 222 L388 267 L360 327 L330 355 L296 350 L276 318 L255 287 L241 253 L225 221 L213 190 L201 161 L184 128 L174 91 Z" fill="none" stroke="#f5e7c6" strokeDasharray="5 5" strokeWidth="1" opacity=".55" />
            <path d="M255 93 Q265 135 264 178 Q270 230 265 315" fill="none" stroke="#4ec6d4" strokeWidth="5" strokeLinecap="round" />
            <path d="M255 93 Q230 76 211 67 M255 93 Q280 75 303 65" fill="none" stroke="#4ec6d4" strokeWidth="3" strokeLinecap="round" />
            <path d="M330 185 Q355 205 365 244 Q370 272 360 327" fill="none" stroke="#4ec6d4" strokeWidth="2" strokeDasharray="5 5" opacity=".8" />
            <path d="M390 62 Q408 87 420 114" fill="none" stroke="#4ec6d4" strokeWidth="2" strokeDasharray="4 5" />
            <text x="80" y="32" fill="#8bd5e1" fontSize="12">البحر المتوسط</text>
            <text x="454" y="235" fill="#8bd5e1" fontSize="12" transform="rotate(90 454 235)">البحر الأحمر</text>
            <text x="430" y="55" fill="#8bd5e1" fontSize="11">خليج العقبة</text>
            <text x="370" y="42" fill="#8bd5e1" fontSize="11">خليج السويس</text>
            <text x="278" y="205" fill="#08232a" fontSize="12" fontWeight="bold">النيل</text>
            <text x="145" y="210" fill="#f8e9c7" fontSize="13">الصحراء الغربية</text>
            <text x="302" y="240" fill="#f8e9c7" fontSize="12">الشرقية</text>
            <text x="410" y="150" fill="#f8e9c7" fontSize="12">سيناء</text>
            {REGIONS.map(region => (
              <g key={region.id} role="button" tabIndex={0} aria-label={region.name} onClick={() => setSelectedId(region.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(region.id); }} className="cursor-pointer">
                <circle cx={region.x} cy={region.y} r={selectedId === region.id ? 15 : 11} fill={selectedId === region.id ? '#22d3ee' : '#f8fafc'} stroke="#08232a" strokeWidth="3" />
                <circle cx={region.x} cy={region.y} r="4" fill="#08232a" />
              </g>
            ))}
            <g transform="translate(30 325)"><path d="M0 24 L10 0 L20 24 L10 18 Z" fill="#dbeafe"/><text x="10" y="40" fill="#cbd5e1" fontSize="10" textAnchor="middle">شمال</text></g>
          </svg>
          <p className="text-[11px] text-slate-400 leading-6 mt-3">تنبيه علمي: هذه خريطة تعليمية تخطيطية لتحديد الأقاليم وليست خريطة جيولوجية طباقية أو مساحية دقيقة، ولا تُستخدم لتحديد حدود التكوينات الصخرية.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
            {REGIONS.map(region => (
              <button key={region.id} onClick={() => setSelectedId(region.id)} className={'rounded-xl border px-3 py-2 text-right transition ' + (selectedId === region.id ? 'border-cyan-300 bg-cyan-300/10 text-cyan-100' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500')}>
                <span className="block text-xs font-bold">{region.name}</span>
                <span className="block text-[10px] text-slate-400 mt-1">{region.short}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-700 bg-slate-900/90 p-5 space-y-4">
          <div className="flex items-center gap-2 text-cyan-200"><Compass className="w-5 h-5" /><span className="text-xs font-bold">الإقليم المختار</span></div>
          <h3 className="text-xl font-black text-white">{selected.name}</h3>
          <p className="text-sm text-slate-300 leading-8">{selected.description}</p>
          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-black text-white mb-3">معالم ومظاهر بارزة</h4>
            <ul className="space-y-3">{selected.features.map((feature, index) => <li key={feature} className="flex items-start gap-2 text-xs text-slate-300"><span className="text-cyan-300 font-black">{index + 1}.</span><span>{feature}</span></li>)}</ul>
          </div>
          <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-3 text-[11px] leading-6 text-cyan-100/80">معلومة للمذاكرة: اربط بين شكل السطح ونوع العمليات الجيولوجية التي أسهمت في تكوينه، ولا تفترض أن كل إقليم يتكون من نوع صخر واحد.</div>
        </aside>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <div className="flex items-center gap-2 text-sm font-black text-white mb-2"><Layers3 className="w-4 h-4 text-cyan-300" /> مصادر وخرائط مرجعية</div>
        <p className="text-xs text-slate-400 leading-6 mb-3">للتوسع في الخرائط الجيولوجية التفصيلية، راجع طبقات الخرائط المنشورة عن هيئة المساحة الجيولوجية المصرية ومراجع الخرائط الإقليمية.</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <a href="https://www.esrs.wmich.edu/arcgis/rest/services/Nubian_project/MapServer" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200">خدمة خرائط جيولوجية لمصر <ExternalLink className="w-3 h-3" /></a>
          <a href="https://sci.tanta.edu.eg/files/Fathy-2013.pdf" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200">خريطة جيولوجية لجنوب سيناء <ExternalLink className="w-3 h-3" /></a>
        </div>
      </div>
    </section>
  );
};
