import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Bone, Eye, EyeOff, RotateCcw, ZoomIn, ZoomOut, HeartPulse, Activity, UserRound } from 'lucide-react';

type Sex='male'|'female';
type ViewMode='all'|'external'|'internal'|'skeleton';
type Part={id:string;name:string;system:string;function:string;color:number;position:[number,number,number];scale:[number,number,number];kind:'internal'|'external';sex?:Sex};
const baseParts:Part[]=[
{id:'brain',name:'المخ',system:'الجهاز العصبي',function:'يعالج المعلومات الحسية ويسهم في تنظيم الحركة والتفكير والذاكرة ووظائف الجسم.',color:0xe8a0bd,position:[0,3.12,0],scale:[.48,.42,.42],kind:'internal'},
{id:'lungs',name:'الرئتان',system:'الجهاز التنفسي',function:'تحتويان على الحويصلات الهوائية التي يتم عندها تبادل الغازات بين الهواء والدم.',color:0xe78a9a,position:[0,1.55,0],scale:[.86,.76,.3],kind:'internal'},
{id:'heart',name:'القلب',system:'الجهاز الدوري',function:'عضلة مجوفة تضخ الدم عبر الدورة الدموية الرئوية والجهازية.',color:0xd93455,position:[-.16,1.58,.34],scale:[.3,.4,.25],kind:'internal'},
{id:'liver',name:'الكبد',system:'الجهاز الهضمي',function:'ينتج العصارة الصفراوية ويسهم في تنظيم المغذيات ومعالجة مواد مختلفة وتخزين الجليكوجين.',color:0x9b6049,position:[.42,.78,.12],scale:[.62,.3,.27],kind:'internal'},
{id:'stomach',name:'المعدة',system:'الجهاز الهضمي',function:'عضو عضلي يخلط الطعام بالعصارة المعدية ويبدأ هضم البروتينات.',color:0xe6a45f,position:[-.4,.67,.2],scale:[.34,.43,.25],kind:'internal'},
{id:'intestines',name:'الأمعاء الدقيقة والغليظة',system:'الجهاز الهضمي',function:'يكتمل فيها الهضم ويحدث معظم امتصاص المغذيات في الدقيقة، وتمتص الغليظة الماء والأملاح.',color:0xe5b36f,position:[0,.03,.15],scale:[.58,.55,.25],kind:'internal'},
{id:'kidneys',name:'الكليتان',system:'الجهاز الإخراجي',function:'ترشحان الدم وتساهمان في تنظيم الماء والأملاح والتخلص من الفضلات بتكوين البول.',color:0x9b5362,position:[-.62,.42,-.12],scale:[.22,.35,.2],kind:'internal'},
{id:'bladder',name:'المثانة البولية',system:'الجهاز الإخراجي',function:'عضو عضلي مرن يخزن البول مؤقتًا قبل خروجه من الجسم.',color:0xe7bd76,position:[0,-.78,.12],scale:[.28,.3,.22],kind:'internal'},
{id:'trachea',name:'القصبة الهوائية',system:'الجهاز التنفسي',function:'أنبوب تدعمه حلقات غضروفية وينقل الهواء إلى الشعب الهوائية.',color:0x8ed2ce,position:[0,2.12,.05],scale:[.13,.55,.13],kind:'internal'},
{id:'eyes',name:'العينان',system:'أعضاء الحس الخارجية',function:'تستقبلان الضوء وتحولانه إلى إشارات عصبية يفسرها المخ لتكوين الرؤية.',color:0x83c9e8,position:[0,3.22,.34],scale:[.23,.1,.09],kind:'external'},
{id:'ears',name:'الأذنان',system:'أعضاء الحس الخارجية',function:'تستقبلان الموجات الصوتية وتشاركان في الاتزان.',color:0xd9a28d,position:[-.48,3.08,0],scale:[.1,.2,.1],kind:'external'},
{id:'nose',name:'الأنف',system:'أعضاء الحس الخارجية',function:'يسهم في الشم، كما يمر عبره الهواء ويُرطّب ويُنقّى ويُدفّأ.',color:0xd9a28d,position:[0,3.02,.39],scale:[.09,.17,.08],kind:'external'},
{id:'mouth',name:'الفم',system:'أعضاء الحس الخارجية',function:'مدخل القناة الهضمية، ويشارك في المضغ والتذوق والكلام.',color:0xb96b78,position:[0,2.82,.34],scale:[.17,.07,.06],kind:'external'},
{id:'skin',name:'الجلد',system:'الجهاز اللحافي',function:'يغطي الجسم ويحميه، ويسهم في الإحساس وتنظيم درجة الحرارة وتقليل فقد الماء.',color:0xc98f78,position:[0,1.3,-.38],scale:[.83,1.35,.08],kind:'external'},
{id:'hands',name:'اليدان',system:'الأطراف الخارجية',function:'تساعدان في الإمساك بالأشياء واللمس وأداء الحركات الدقيقة.',color:0xc98f78,position:[-.9,.48,.08],scale:[.13,.23,.1],kind:'external'},
{id:'feet',name:'القدمان',system:'الأطراف الخارجية',function:'تدعمان الجسم وتساعدان على الوقوف والمشي والاتزان.',color:0xc98f78,position:[.34,-2.48,.12],scale:[.2,.12,.3],kind:'external'}
];
const reproductive:Record<Sex,Part[]> = {
 male:[
 {id:'prostate',name:'غدة البروستاتا',system:'الجهاز التناسلي الذكري',function:'غدة تقع أسفل المثانة وتحيط بجزء من الإحليل، وتضيف إفرازات إلى السائل المنوي.',color:0x9d8bc8,position:[.12,-.88,.2],scale:[.22,.15,.16],kind:'internal',sex:'male'},
 {id:'testes',name:'الخصيتان',system:'الجهاز التناسلي الذكري',function:'تنتجان الحيوانات المنوية وهرمون التستوستيرون. يظهر موضعهما في هذا النموذج برسم تشريحي تعليمي مبسّط.',color:0xc69b79,position:[0,-1.2,.3],scale:[.3,.17,.14],kind:'internal',sex:'male'}
 ],
 female:[
 {id:'uterus',name:'الرحم',system:'الجهاز التناسلي الأنثوي',function:'عضو عضلي أجوف، وتنمو بطانته خلال الدورة الشهرية، ويستقبل البويضة المخصبة في حالة حدوث الإخصاب.',color:0xd87991,position:[0,-.68,.24],scale:[.27,.38,.16],kind:'internal',sex:'female'},
 {id:'ovaries',name:'المبيضان',system:'الجهاز التناسلي الأنثوي',function:'ينتجان البويضات ويُفرزان هرمونات منها الإستروجين والبروجستيرون.',color:0xe6a2b3,position:[-.38,-.62,.2],scale:[.14,.17,.12],kind:'internal',sex:'female'},
 {id:'fallopian',name:'قناتا فالوب',system:'الجهاز التناسلي الأنثوي',function:'قناتان تصلان منطقتي المبيضين بالرحم، ويحدث الإخصاب غالبًا في القناة.',color:0xe6a2b3,position:[0,-.43,.24],scale:[.47,.08,.09],kind:'internal',sex:'female'}
 ]
};
const systemNames=['كل الأعضاء','أعضاء الحس الخارجية','الجهاز اللحافي','الجهاز العصبي','الجهاز التنفسي','الجهاز الدوري','الجهاز الهضمي','الجهاز الإخراجي','الجهاز التناسلي الذكري','الجهاز التناسلي الأنثوي'];
const material=(color:number,opacity=1)=>new THREE.MeshStandardMaterial({color,roughness:.48,transparent:opacity<1,opacity,side:THREE.DoubleSide});
const ellipsoid=(parent:THREE.Group,pos:[number,number,number],scale:[number,number,number],color:number,opacity=1)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,18),material(color,opacity));m.position.set(...pos);m.scale.set(...scale);parent.add(m);return m;};
const bone=(g:THREE.Group,a:[number,number,number],b:[number,number,number],r=.05)=>{const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),9),material(0xe7dfc8));m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());g.add(m);};
const buildSkeleton=(g:THREE.Group,sex:Sex)=>{ellipsoid(g,[0,3.12,0],[.39,.4,.34],0xe7dfc8);ellipsoid(g,[0,2.88,.12],[.25,.12,.25],0xd6cdb8);for(let i=0;i<12;i++)ellipsoid(g,[0,2.48-i*.16,0],[.09,.07,.09],0xe7dfc8);bone(g,[-.55,2.18,0],[0,2.12,.02]);bone(g,[0,2.12,.02],[.55,2.18,0]);bone(g,[0,2.12,.08],[0,1.15,.08],.06);for(let i=0;i<7;i++){const y=2.02-i*.125,w=.42+i*.025;bone(g,[0,y,.02],[-w,y-.1,.04],.027);bone(g,[-w,y-.1,.04],[-w*.95,y-.19,.02],.027);bone(g,[0,y,.02],[w,y-.1,.04],.027);bone(g,[w,y-.1,.04],[w*.95,y-.19,.02],.027);}const pelvisWidth=sex==='female'?.56:.43;bone(g,[-pelvisWidth,-.42,0],[-.30,-.70,.02],.075);bone(g,[-.30,-.70,.02],[0,-.61,.04],.075);bone(g,[pelvisWidth,-.42,0],[.30,-.70,.02],.075);bone(g,[.30,-.70,.02],[0,-.61,.04],.075);for(const s of [-1,1]){bone(g,[s*.55,2.16,0],[s*.79,1.55,0],.06);bone(g,[s*.79,1.55,0],[s*.88,.9,.02],.05);bone(g,[s*.88,.9,.02],[s*.9,.55,.03],.035);for(let f=-2;f<=2;f++)bone(g,[s*.9+f*.045,.55,.03],[s*.9+f*.065,.32-Math.abs(f)*.025,.04],.018);bone(g,[s*.28,-.62,0],[s*.34,-1.42,0],.085);bone(g,[s*.34,-1.42,0],[s*.34,-2.2,.02],.06);bone(g,[s*.34,-2.2,.02],[s*.34,-2.52,.18],.04);}};

const anatomicalGeometry=(id:string):THREE.BufferGeometry=>{
 if(id==='heart'){
  const s=new THREE.Shape();s.moveTo(0,-.75);s.bezierCurveTo(-.25,-.45,-.95,.05,-.85,.55);s.bezierCurveTo(-.78,1.05,-.18,1.02,0,.58);s.bezierCurveTo(.22,1.03,.82,1.05,.88,.53);s.bezierCurveTo(.98,.02,.28,-.48,0,-.75);
  return new THREE.ExtrudeGeometry(s,{depth:.28,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.09,bevelThickness:.08,curveSegments:20});
 }
 if(id==='intestines'){
  const pts:THREE.Vector3[]=[];for(let i=0;i<180;i++){const t=i/179,angle=t*Math.PI*12,r=.62-.22*t;pts.push(new THREE.Vector3(Math.cos(angle)*r,Math.sin(angle)*r*.78,0));}
  const curve=new THREE.CatmullRomCurve3(pts);return new THREE.TubeGeometry(curve,240,.09,10,false);
 }
 if(id==='stomach'){
  const points=[new THREE.Vector2(.08,-.9),new THREE.Vector2(.35,-.72),new THREE.Vector2(.56,-.35),new THREE.Vector2(.48,.05),new THREE.Vector2(.3,.35),new THREE.Vector2(.18,.72),new THREE.Vector2(.08,.9)];
  return new THREE.LatheGeometry(points,32);
 }
 const g=new THREE.SphereGeometry(1,48,36),p=g.attributes.position as THREE.BufferAttribute;
 for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i),factor=1;
  if(id==='brain'){factor+=.035*Math.sin(y*34+Math.atan2(z,x)*5)*Math.sin(x*22); }
  if(id==='lungs'){factor*=1-.18*Math.exp(-Math.pow(x*5,2));}
  if(id==='liver'){factor*=1-.13*Math.max(0,-y)*Math.max(0,x);}
  if(id==='kidneys'){factor*=1-.18*Math.exp(-Math.pow((x+.35)*7,2))*Math.max(0,z);}
  if(id==='bladder'){factor*=1+.08*Math.cos(y*8);}
  p.setXYZ(i,x*factor,y*factor,z*factor);
 }
 p.needsUpdate=true;g.computeVertexNormals();return g;
};

export const HumanAnatomyExplorer:React.FC=()=>{
 const host=useRef<HTMLDivElement>(null),selectedRef=useRef('heart'),onSelectRef=useRef<(id:string)=>void>(()=>{});
 const [sex,setSex]=useState<Sex>('male'),[view,setView]=useState<ViewMode>('all'),[selected,setSelected]=useState('heart'),[system,setSystem]=useState('كل الأعضاء'),[showSkeleton,setShowSkeleton]=useState(true),[showBody,setShowBody]=useState(true),[zoom,setZoom]=useState(1),[reset,setReset]=useState(0);
 const parts=useMemo(()=>[...baseParts,...reproductive[sex]],[sex]);
 const filtered=useMemo(()=>parts.filter(p=>(system==='كل الأعضاء'||p.system===system)&& (view==='all'||(view==='internal'&&p.kind==='internal')||(view==='external'&&p.kind==='external')||view==='skeleton')), [parts,system,view]);
 const active=parts.find(p=>p.id===selected)||parts[0];
 useEffect(()=>{selectedRef.current=selected;},[selected]);useEffect(()=>{onSelectRef.current=setSelected;},[]);
 useEffect(()=>{if(!parts.some(p=>p.id===selected))setSelected('heart');},[sex]);
 useEffect(()=>{
 const el=host.current;if(!el)return;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#071a20');const camera=new THREE.PerspectiveCamera(36,1,.1,100);camera.position.set(0,.35,9.8);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setSize(el.clientWidth,el.clientHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;el.appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xd8fff5,0x243447,2));const light=new THREE.DirectionalLight(0xffffff,2.6);light.position.set(4,6,8);scene.add(light);
 const root=new THREE.Group();scene.add(root);const body=new THREE.Group();root.add(body);
 ellipsoid(body,[0,1.55,-.16],sex==='male'?[.82,1.02,.36]:[.72,1.02,.34],0x6db9b1,.16);
 ellipsoid(body,[0,.25,-.16],sex==='male'?[.55,.85,.3]:[.66,.85,.3],0x6db9b1,.14);
 ellipsoid(body,[0,3.1,-.08],[.48,.48,.38],0x6db9b1,.15);
 for(const s of [-1,1]){ellipsoid(body,[s*(sex==='male'?.94:.87),1.5,-.12],[.2,.95,.22],0x6db9b1,.13);ellipsoid(body,[s*(sex==='male'?.36:.31),-1.38,-.12],[.22,1.12,.24],0x6db9b1,.13);}
 const organGroup=new THREE.Group();root.add(organGroup);const meshes:THREE.Mesh[]=[];
 parts.filter(p=>p.kind==='internal').forEach(p=>{const m=new THREE.Mesh(anatomicalGeometry(p.id),new THREE.MeshPhysicalMaterial({color:p.color,roughness:.4,clearcoat:.2}));m.position.set(...p.position);m.scale.set(...p.scale);m.userData.organId=p.id;organGroup.add(m);meshes.push(m);});
 const externalGroup=new THREE.Group();root.add(externalGroup);
 const externalMeshes:THREE.Mesh[]=[];
 parts.filter(p=>p.kind==='external').forEach(p=>{const m=ellipsoid(externalGroup,p.position,p.scale,p.color,.92);m.userData.organId=p.id;externalMeshes.push(m);});
 const skeleton=new THREE.Group();root.add(skeleton);buildSkeleton(skeleton,sex);const grid=new THREE.GridHelper(12,24,0x155e63,0x12353c);grid.position.y=-2.75;scene.add(grid);
 let down=false,moved=false,px=0,py=0,raf=0;
 const downFn=(e:PointerEvent)=>{down=true;moved=false;px=e.clientX;py=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);};
 const moveFn=(e:PointerEvent)=>{if(!down)return;const dx=e.clientX-px,dy=e.clientY-py;if(Math.abs(dx)+Math.abs(dy)>3)moved=true;root.rotation.y+=dx*.008;root.rotation.x=Math.max(-.5,Math.min(.5,root.rotation.x+dy*.006));px=e.clientX;py=e.clientY;};
 const upFn=()=>{down=false;};
 const clickFn=(e:PointerEvent)=>{if(moved)return;const r=renderer.domElement.getBoundingClientRect(),v=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(v,camera);const hit=ray.intersectObjects([...organGroup.children,...externalGroup.children],false).find(h=>h.object.userData.organId);if(hit)onSelectRef.current(String(hit.object.userData.organId));};
 renderer.domElement.addEventListener('pointerdown',downFn);renderer.domElement.addEventListener('pointermove',moveFn);renderer.domElement.addEventListener('pointerup',upFn);renderer.domElement.addEventListener('pointercancel',upFn);renderer.domElement.addEventListener('click',clickFn);
 const resize=()=>{camera.aspect=el.clientWidth/Math.max(1,el.clientHeight);camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);};const observer=new ResizeObserver(resize);observer.observe(el);
 const animate=()=>{raf=requestAnimationFrame(animate);meshes.concat(externalMeshes).forEach(m=>{const mat=m.material as THREE.MeshStandardMaterial;mat.emissive.setHex(m.userData.organId===selectedRef.current?0x174e52:0x000000);});body.visible=showBody&&(view==='all'||view==='external');externalGroup.visible=showBody&&(view==='all'||view==='external');organGroup.visible=view==='all'||view==='internal';skeleton.visible=showSkeleton&&(view==='all'||view==='skeleton');camera.position.z=9.8/zoom;renderer.render(scene,camera);};animate();
 return()=>{cancelAnimationFrame(raf);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',downFn);renderer.domElement.removeEventListener('pointermove',moveFn);renderer.domElement.removeEventListener('pointerup',upFn);renderer.domElement.removeEventListener('pointercancel',upFn);renderer.domElement.removeEventListener('click',clickFn);scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();const m=(o as THREE.Mesh).material;if(Array.isArray(m))m.forEach(x=>x.dispose());else if(m)m.dispose();}});renderer.dispose();el.removeChild(renderer.domElement);};
 },[sex,parts,view,showSkeleton,showBody,zoom,reset]);
 const choose=(id:string)=>setSelected(id);
 const changeView=(v:ViewMode)=>{setView(v);setSystem('كل الأعضاء');};
 return <section dir="rtl" className="rounded-[2rem] border border-cyan-400/20 bg-slate-950/95 p-5 sm:p-7 space-y-5 shadow-2xl">
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-3"><div><div className="inline-flex items-center gap-2 text-cyan-300 text-xs font-bold mb-2"><Activity className="w-4 h-4"/> أطلس جسم الإنسان التفاعلي</div><h2 className="text-2xl sm:text-3xl font-black text-white">استكشف جسم الإنسان وأجهزته ثلاثية الأبعاد</h2><p className="text-sm text-slate-400 mt-2">اختر النموذج، ثم انتقل بين الأعضاء الخارجية والداخلية والهيكل العظمي.</p></div><span className="text-xs text-cyan-200 border border-cyan-400/20 rounded-full px-3 py-2">3D · WebGL</span></div>
 <div className="flex flex-wrap gap-2"><span className="text-xs text-slate-400 self-center ml-1">نوع النموذج:</span><button onClick={()=>{setSex('male');setSelected('heart');}} className={`rounded-xl px-4 py-2 text-sm font-bold border ${sex==='male'?'bg-cyan-400 text-slate-950 border-cyan-300':'bg-slate-900 text-slate-200 border-slate-700'}`}><UserRound className="inline w-4 h-4 ml-1"/>ذكري</button><button onClick={()=>{setSex('female');setSelected('heart');}} className={`rounded-xl px-4 py-2 text-sm font-bold border ${sex==='female'?'bg-pink-300 text-slate-950 border-pink-200':'bg-slate-900 text-slate-200 border-slate-700'}`}><UserRound className="inline w-4 h-4 ml-1"/>أنثوي</button></div>
 <div className="flex flex-wrap gap-2">{([{id:'all',label:'عرض الكل'},{id:'external',label:'الأعضاء الخارجية'},{id:'internal',label:'الأعضاء الداخلية'},{id:'skeleton',label:'الهيكل العظمي'}] as {id:ViewMode;label:string}[]).map(v=><button key={v.id} onClick={()=>changeView(v.id)} className={`rounded-xl px-3 py-2 text-xs font-bold border ${view===v.id?'bg-emerald-400 text-slate-950 border-emerald-300':'bg-slate-900 text-slate-300 border-slate-700'}`}>{v.label}</button>)}</div>
 <div className="grid lg:grid-cols-[1.35fr_.75fr] gap-4">
 <div className="relative overflow-hidden rounded-3xl border border-slate-700 bg-[#071a20]"><div ref={host} className="h-[430px] sm:h-[570px] w-full touch-none cursor-grab active:cursor-grabbing"/>
 <div className="absolute top-3 right-3 flex flex-wrap gap-2"><button onClick={()=>setShowSkeleton(v=>!v)} className="rounded-lg border border-slate-600 bg-slate-950/90 px-3 py-2 text-xs font-bold text-white"><Bone className="inline w-4 h-4 ml-1"/>{showSkeleton?'إخفاء الهيكل':'إظهار الهيكل'}</button><button onClick={()=>setShowBody(v=>!v)} className="rounded-lg border border-slate-600 bg-slate-950/90 px-3 py-2 text-xs font-bold text-white">{showBody?<EyeOff className="inline w-4 h-4 ml-1"/>:<Eye className="inline w-4 h-4 ml-1"/>}{showBody?'إخفاء شكل الجسم':'إظهار شكل الجسم'}</button></div>
 <div className="absolute bottom-3 left-3 flex gap-2"><button onClick={()=>setZoom(z=>Math.max(.75,z-.15))} className="p-2 rounded-lg bg-slate-900/95 border border-slate-700 text-white" aria-label="تصغير"><ZoomOut className="w-4 h-4"/></button><button onClick={()=>setZoom(z=>Math.min(1.7,z+.15))} className="p-2 rounded-lg bg-slate-900/95 border border-slate-700 text-white" aria-label="تكبير"><ZoomIn className="w-4 h-4"/></button><button onClick={()=>{setZoom(1);setReset(v=>v+1);}} className="p-2 rounded-lg bg-slate-900/95 border border-slate-700 text-white" aria-label="إعادة ضبط"><RotateCcw className="w-4 h-4"/></button></div><div className="absolute bottom-3 right-3 rounded-lg bg-slate-950/85 px-3 py-2 text-[11px] text-cyan-100">اسحب للتدوير · انقر على عضو لتحديده</div></div>
 <aside className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4 sm:p-5 space-y-4"><div><label className="block text-xs text-slate-400 mb-2">تصفية حسب الجهاز</label><select value={system} onChange={e=>setSystem(e.target.value)} className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3 text-sm text-white">{systemNames.filter(s=>sex==='male'?s!=='الجهاز التناسلي الأنثوي':s!=='الجهاز التناسلي الذكري').map(s=><option key={s}>{s}</option>)}</select></div>
 <div className="max-h-[260px] overflow-y-auto space-y-2">{filtered.map(o=><button key={o.id} onClick={()=>choose(o.id)} className={`w-full text-right rounded-xl border p-3 transition ${selected===o.id?'border-cyan-300 bg-cyan-400/10':'border-slate-700 bg-slate-950/70 hover:border-slate-500'}`}><span className="block text-sm font-bold text-white">{o.name}</span><span className="block text-[11px] text-slate-400 mt-1">{o.system}</span></button>)}</div>
 <div className="border-t border-slate-700 pt-4"><div className="flex items-center gap-2 text-cyan-300 text-xs font-bold mb-2"><HeartPulse className="w-4 h-4"/> العضو المحدد</div><h3 className="text-xl font-black text-white">{active.name}</h3><p className="text-xs text-slate-400 mt-1">{active.system}</p><p className="text-sm text-slate-300 leading-7 mt-3">{active.function}</p></div></aside></div>
 <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-xs leading-6 text-amber-100">ملاحظة علمية: النموذج تخطيطي تعليمي وليس أطلسًا طبيًا دقيقًا أو مقياسًا حقيقيًا للأحجام. شكل الجسم الخارجي مبسط، والأعضاء التناسلية معروضة كرسوم تشريحية داخلية تعليمية غير تفصيلية. لا يغني عن الرسوم المرجعية المعتمدة في المنهج.</div>
 </section>;
};
