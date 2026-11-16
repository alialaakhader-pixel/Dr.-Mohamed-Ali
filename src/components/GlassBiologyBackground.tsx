import React from 'react';

/** Decorative biology-inspired background. These shapes are illustrative, not scientific models. */
export const GlassBiologyBackground: React.FC = () => (
  <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" style={{ contain: 'paint' }}>
    <div className="bio-orb bio-orb-one" />
    <div className="bio-orb bio-orb-two" />
    <div className="absolute -top-20 -right-16 w-80 h-80 sm:w-[26rem] sm:h-[26rem] opacity-20 animate-spin-slow">
      <svg viewBox="0 0 320 320" className="w-full h-full">
        <defs><linearGradient id="dnaA" x1="0" x2="1"><stop stopColor="#34d399"/><stop offset="1" stopColor="#38bdf8"/></linearGradient></defs>
        <path d="M75 10 C270 75 50 245 245 310 M245 10 C50 75 270 245 75 310" fill="none" stroke="url(#dnaA)" strokeWidth="5" strokeLinecap="round"/>
        {Array.from({length:13},(_,i)=>{const y=22+i*23;const x1=92+Math.sin(i*.48)*65;const x2=228-Math.sin(i*.48)*65;return <line key={i} x1={x1} y1={y} x2={x2} y2={y} stroke="#a7f3d0" strokeWidth="2.5" opacity=".8"/>})}
      </svg>
    </div>
    <div className="absolute top-[34%] -left-20 w-72 h-72 opacity-20">
      <svg viewBox="0 0 260 260" className="w-full h-full">
        <circle cx="130" cy="130" r="100" fill="#10b981" fillOpacity=".06" stroke="#5eead4" strokeWidth="2"/>
        <circle cx="130" cy="130" r="76" fill="#0f766e" fillOpacity=".10" stroke="#99f6e4" strokeOpacity=".6"/>
        <ellipse cx="140" cy="126" rx="31" ry="24" fill="#38bdf8" fillOpacity=".22" stroke="#7dd3fc" strokeWidth="2"/>
        {[[83,83],[176,83],[84,174],[178,170],[130,55],[205,130],[53,130]].map(([x,y],i)=><ellipse key={i} cx={x} cy={y} rx="13" ry="8" transform={`rotate(${i*24} ${x} ${y})`} fill="#34d399" fillOpacity=".5" stroke="#a7f3d0" strokeWidth="1.5"/>)}
      </svg>
    </div>
    <div className="absolute bottom-[-5rem] right-[18%] w-72 h-72 opacity-15">
      <svg viewBox="0 0 260 260" className="w-full h-full">
        {Array.from({length:8},(_,i)=><g key={i} transform={`rotate(${i*45} 130 130)`}><ellipse cx="130" cy="66" rx="17" ry="34" fill="#fb7185" fillOpacity=".22" stroke="#fda4af" strokeWidth="2"/><ellipse cx="130" cy="66" rx="6" ry="13" fill="#be123c" fillOpacity=".45"/></g>)}
        <circle cx="130" cy="130" r="24" fill="#0f766e" fillOpacity=".18" stroke="#5eead4" strokeWidth="2"/>
      </svg>
    </div>
    <div className="absolute inset-0 opacity-[.035]" style={{backgroundImage:'radial-gradient(#a7f3d0 1px, transparent 1px)',backgroundSize:'28px 28px'}} />
  </div>
);
