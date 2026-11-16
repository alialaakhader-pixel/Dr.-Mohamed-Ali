import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Bone, Eye, EyeOff, RotateCcw, ZoomIn, ZoomOut, HeartPulse, Activity } from 'lucide-react';

type Part = {id:string; name:string; system:string; function:string; color:number; position:[number,number,number]; scale:[number,number,number]; shape?:'sphere'|'box'};
const organs:Part[] = [
 {id:'brain',name:'المخ',system:'الجهاز العصبي',function:'جزء رئيسي من الجهاز العصبي المركزي؛ يعالج المعلومات الحسية ويسهم في تنظيم الحركة والتفكير والذاكرة ووظائف الجسم.',color:0xe8a0bd,position:[0,3.12,0],scale:[.48,.42,.42]},
 {id:'lungs',name:'الرئتان',system:'الجهاز التنفسي',function:'تحتويان على الحويصلات الهوائية التي يتم عندها تبادل الغازات بين الهواء والدم.',color:0xe78a9a,position:[-.0,1.55,0],scale:[.86,.76,.3]},
 {id:'heart',name:'القلب',system:'الجهاز الدوري',function:'عضلة مجوفة تضخ الدم عبر الدورة الدموية الرئوية والجهازية.',color:0xd93455,position:[-.16,1.58,.34],scale:[.3,.4,.25]},
 {id:'liver',name:'الكبد',system:'الجهاز الهضمي',function:'ينتج العصارة الصفراوية، ويسهم في تنظيم المغذيات ومعالجة مواد مختلفة وتخزين الجليكوجين.',color:0x9b6049,position:[.42,.78,.12],scale:[.62,.3,.27]},
 {id:'stomach',name:'المعدة',system:'الجهاز الهضمي',function:'عضو عضلي يخلط الطعام بالعصارة المعدية ويبدأ هضم البروتينات.',color:0xe6a45f,position:[-.4,.67,.2],scale:[.34,.43,.25]},
 {id:'intestines',name:'الأمعاء الدقيقة والغليظة',system:'الجهاز الهضمي',function:'تُستكمل فيها عملية الهضم ويحدث معظم امتصاص المغذيات في الأمعاء الدقيقة، بينما تمتص الأمعاء الغليظة الماء والأملاح.',color:0xe5b36f,position:[0,.03,.15],scale:[.58,.55,.25]},
 {id:'kidneys',name:'الكليتان',system:'الجهاز الإخراجي',function:'ترشحان الدم وتساهمان في تنظيم الماء والأملاح والتخلص من الفضلات بتكوين البول.',color:0x9b5362,position:[-.62,.42,-.12],scale:[.22,.35,.2]},
 {id:'bladder',name:'المثانة البولية',system:'الجهاز الإخراجي',function:'عضو عضلي مرن يخزن البول مؤقتًا قبل خروجه من الجسم.',color:0xe7bd76,position:[0,-.78,.12],scale:[.28,.3,.22]},
 {id:'trachea',name:'القصبة الهوائية',system:'الجهاز التنفسي',function:'أنبوب تدعمه حلقات غضروفية وينقل الهواء من الحنجرة إلى الشعب الهوائية.',color:0x8ed2ce,position:[0,2.12,.05],scale:[.13,.55,.13]}
];
const systemNames=['كل الأعضاء','الجهاز العصبي','الجهاز التنفسي','الجهاز الدوري','الجهاز الهضمي','الجهاز الإخراجي'];
const makeMaterial=(color:number,opacity=1)=>new THREE.MeshStandardMaterial({color,roughness:.48,metalness:.02,transparent:opacity<1,opacity,side:THREE.DoubleSide});
const addEllipsoid=(parent:THREE.Group,pos:[number,number,number],scale:[number,number,number],color:number,opacity=1)=>{
 const m=new THREE.Mesh(new THREE.SphereGeometry(1,28,20),makeMaterial(color,opacity));m.position.set(...pos);m.scale.set(...scale);parent.add(m);return m;
};
const addBone=(parent:THREE.Group,a:[number,number,number],b:[number,number,number],radius=.055)=>{
 const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=new THREE.Vector3().subVectors(vb,va);
 const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,d.length(),10),makeMaterial(0xe7dfc8));
 m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());parent.add(m);
 addEllipsoid(parent,a,[radius*1.18,radius*1.18,radius*1.18],0xe7dfc8);addEllipsoid(parent,b,[radius*1.18,radius*1.18,radius*1.18],0xe7dfc8);
};
const buildSkeleton=(g:THREE.Group)=>{
 // Skull, jaw, vertebral column and rib cage
 addEllipsoid(g,[0,3.12,0],[.39,.4,.34],0xe7dfc8);
 addEllipsoid(g,[0,2.88,.12],[.25,.12,.25],0xd6cdb8);
 for(let i=0;i<12;i++)addEllipsoid(g,[0,2.48-i*.16,0],[.09,.07,.09],0xe7dfc8);
 // clavicles, sternum and paired ribs
 addBone(g,[-.55,2.18,0],[0,2.12,.02],.045);addBone(g,[0,2.12,.02],[.55,2.18,0],.045);
 addBone(g,[0,2.12,.08],[0,1.15,.08],.065);
 for(let i=0;i<7;i++){
  const y=2.02-i*.125, w=.42+i*.025;
  addBone(g,[0,y,.02],[-w,y-.1,.04],.027);addBone(g,[-w,y-.1,.04],[-w*.95,y-.19,.02],.027);
  addBone(g,[0,y,.02],[w,y-.1,.04],.027);addBone(g,[w,y-.1,.04],[w*.95,y-.19,.02],.027);
 }
 // pelvis
 addBone(g,[-.48,-.42,0],[-.28,-.68,.02],.075);addBone(g,[-.28,-.68,.02],[0,-.58,.04],.075);
 addBone(g,[.48,-.42,0],[.28,-.68,.02],.075);addBone(g,[.28,-.68,.02],[0,-.58,.04],.075);
 // arms
 for(const side of [-1,1]){
  const s=side;
  addBone(g,[s*.55,2.16,0],[s*.79,1.55,0],.065);
  addBone(g,[s*.79,1.55,0],[s*.88,.9,.02],.05);
  addBone(g,[s*.88,.9,.02],[s*.9,.55,.03],.035);
  // hands and fingers
  for(let f=-2;f<=2;f++)addBone(g,[s*.9+f*.045,.55,.03],[s*.9+f*.065,.32-Math.abs(f)*.025,.04],.018);
  // legs
  addBone(g,[s*.28,-.62,0],[s*.34,-1.42,0],.09);
  addBone(g,[s*.34,-1.42,0],[s*.34,-2.2,.02],.065);
  addBone(g,[s*.34,-2.2,.02],[s*.34,-2.52,.18],.045);
 }
};
export const HumanAnatomyExplorer:React.FC=()=>{
 const host=useRef<HTMLDivElement>(null),selectedRef=useRef('heart'),onSelectRef=useRef<(id:string)=>void>(()=>{});
 const [selected,setSelected]=useState('heart'),[system,setSystem]=useState('كل الأعضاء'),[showSkeleton,setShowSkeleton]=useState(true),[showBody,setShowBody]=useState(true),[zoom,setZoom]=useState(1),[reset,setReset]=useState(0);
 const filtered=useMemo(()=>organs.filter(o=>system==='كل الأعضاء'||o.system===system),[system]);
 const active=organs.find(o=>o.id===selected)||organs[0];
 useEffect(()=>{selectedRef.current=selected;},[selected]);
 useEffect(()=>{onSelectRef.current=setSelected;},[]);
 useEffect(()=>{
  const el=host.current;if(!el)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#071a20');
  const camera=new THREE.PerspectiveCamera(36,1,.1,100);camera.position.set(0,.35,9.8);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setSize(el.clientWidth,el.clientHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;el.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xd8fff5,0x243447,2));
  const light=new THREE.DirectionalLight(0xffffff,2.6);light.position.set(4,6,8);scene.add(light);
  const root=new THREE.Group();scene.add(root);
  const body=new THREE.Group();root.add(body);
  // translucent anatomical body outline, intentionally simplified for orientation
  addEllipsoid(body,[0,1.55,-.16],[.82,1.02,.36],0x6db9b1,.13);
  addEllipsoid(body,[0,.25,-.16],[.55,.85,.3],0x6db9b1,.12);
  addEllipsoid(body,[0,3.1,-.08],[.48,.48,.38],0x6db9b1,.13);
  for(const side of [-1,1]){
   addEllipsoid(body,[side*.94,1.5,-.12],[.22,.95,.22],0x6db9b1,.12);
   addEllipsoid(body,[side*.36,-1.38,-.12],[.24,1.12,.24],0x6db9b1,.12);
  }
  const organGroup=new THREE.Group();root.add(organGroup);
  const meshes:THREE.Mesh[]=[];
  organs.forEach(o=>{
   const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),new THREE.MeshPhysicalMaterial({color:o.color,roughness:.38,clearcoat:.25,emissive:0x000000}));
   mesh.position.set(...o.position);mesh.scale.set(...o.scale);mesh.userData.organId=o.id;organGroup.add(mesh);meshes.push(mesh);
   if(o.id==='lungs'){for(const s of [-1,1]){const lobe=addEllipsoid(organGroup,[s*.28,1.56,.03],[.36,.58,.25],0xe78a9a,.92);lobe.userData.organId=o.id;meshes.push(lobe);}}
   if(o.id==='intestines'){for(let i=0;i<4;i++){const loop=new THREE.Mesh(new THREE.TorusGeometry(.19,.055,10,32),makeMaterial(0xe5b36f));loop.position.set(-.22+(i%2)*.3,.05+Math.floor(i/2)*.2,.32);loop.rotation.x=Math.PI/2;loop.userData.organId=o.id;organGroup.add(loop);meshes.push(loop);}}
  });
  const skeleton=new THREE.Group();root.add(skeleton);buildSkeleton(skeleton);
  const grid=new THREE.GridHelper(12,24,0x155e63,0x12353c);grid.position.y=-2.75;scene.add(grid);
  let down=false,moved=false,px=0,py=0,raf=0;
  const downFn=(e:PointerEvent)=>{down=true;moved=false;px=e.clientX;py=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);};
  const moveFn=(e:PointerEvent)=>{if(!down)return;const dx=e.clientX-px,dy=e.clientY-py;if(Math.abs(dx)+Math.abs(dy)>3)moved=true;root.rotation.y+=dx*.008;root.rotation.x=Math.max(-.5,Math.min(.5,root.rotation.x+dy*.006));px=e.clientX;py=e.clientY;};
  const upFn=()=>{down=false;};
  const clickFn=(e:PointerEvent)=>{if(moved)return;const r=renderer.domElement.getBoundingClientRect(),v=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(v,camera);const hit=ray.intersectObjects(organGroup.children,false).find(h=>h.object.userData.organId);if(hit)onSelectRef.current(String(hit.object.userData.organId));};
  renderer.domElement.addEventListener('pointerdown',downFn);renderer.domElement.addEventListener('pointermove',moveFn);renderer.domElement.addEventListener('pointerup',upFn);renderer.domElement.addEventListener('pointercancel',upFn);renderer.domElement.addEventListener('click',clickFn);
  const resize=()=>{camera.aspect=el.clientWidth/Math.max(1,el.clientHeight);camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);};const observer=new ResizeObserver(resize);observer.observe(el);
  const animate=()=>{raf=requestAnimationFrame(animate);meshes.forEach(m=>{const id=m.userData.organId;const mat=m.material as THREE.MeshPhysicalMaterial;mat.emissive.setHex(id===selectedRef.current?0x174e52:0x000000);mat.emissiveIntensity=id===selectedRef.current?.42:0;});body.visible=showBody;skeleton.visible=showSkeleton;camera.position.z=9.8/zoom;renderer.render(scene,camera);};animate();
  return()=>{cancelAnimationFrame(raf);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',downFn);renderer.domElement.removeEventListener('pointermove',moveFn);renderer.domElement.removeEventListener('pointerup',upFn);renderer.domElement.removeEventListener('pointercancel',upFn);renderer.domElement.removeEventListener('click',clickFn);scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();const m=(o as THREE.Mesh).material;if(Array.isArray(m))m.forEach(x=>x.dispose());else if(m)m.dispose();}});renderer.dispose();el.removeChild(renderer.domElement);};
 },[showSkeleton,showBody,zoom,reset]);
 const choose=(id:string)=>{setSelected(id);};
 return <section dir="rtl" className="rounded-[2rem] border border-cyan-400/20 bg-slate-950/95 p-5 sm:p-7 space-y-5 shadow-2xl">
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-3"><div><div className="inline-flex items-center gap-2 text-cyan-300 text-xs font-bold mb-2"><Activity className="w-4 h-4"/> أطلس جسم الإنسان التفاعلي</div><h2 className="text-2xl sm:text-3xl font-black text-white">استكشف الأعضاء والهيكل العظمي ثلاثي الأبعاد</h2><p className="text-sm text-slate-400 mt-2">دوّر المجسم واسحب للتقريب، أو اختر أي عضو من القائمة لعرض موقعه ووظيفته.</p></div><span className="text-xs text-cyan-200 border border-cyan-400/20 rounded-full px-3 py-2">3D · WebGL</span></div>
  <div className="grid lg:grid-cols-[1.35fr_.75fr] gap-4">
   <div className="relative overflow-hidden rounded-3xl border border-slate-700 bg-[#071a20]">
    <div ref={host} className="h-[430px] sm:h-[570px] w-full touch-none cursor-grab active:cursor-grabbing"/>
    <div className="absolute top-3 right-3 flex flex-wrap gap-2">
     <button onClick={()=>setShowSkeleton(v=>!v)} className="rounded-lg border border-slate-600 bg-slate-950/90 px-3 py-2 text-xs font-bold text-white">{showSkeleton?<Bone className="inline w-4 h-4 ml-1"/>:<Bone className="inline w-4 h-4 ml-1"/>}{showSkeleton?'إخفاء الهيكل':'إظهار الهيكل'}</button>
     <button onClick={()=>setShowBody(v=>!v)} className="rounded-lg border border-slate-600 bg-slate-950/90 px-3 py-2 text-xs font-bold text-white">{showBody?<EyeOff className="inline w-4 h-4 ml-1"/>:<Eye className="inline w-4 h-4 ml-1"/>}{showBody?'إخفاء الجسم':'إظهار الجسم'}</button>
    </div>
    <div className="absolute bottom-3 left-3 flex gap-2">
     <button onClick={()=>setZoom(z=>Math.max(.75,z-.15))} className="p-2 rounded-lg bg-slate-900/95 border border-slate-700 text-white" aria-label="تصغير"><ZoomOut className="w-4 h-4"/></button>
     <button onClick={()=>setZoom(z=>Math.min(1.7,z+.15))} className="p-2 rounded-lg bg-slate-900/95 border border-slate-700 text-white" aria-label="تكبير"><ZoomIn className="w-4 h-4"/></button>
     <button onClick={()=>{setZoom(1);setReset(v=>v+1);}} className="p-2 rounded-lg bg-slate-900/95 border border-slate-700 text-white" aria-label="إعادة ضبط"><RotateCcw className="w-4 h-4"/></button>
    </div>
    <div className="absolute bottom-3 right-3 rounded-lg bg-slate-950/85 px-3 py-2 text-[11px] text-cyan-100">اسحب للتدوير · انقر على عضو لتحديده</div>
   </div>
   <aside className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4 sm:p-5 space-y-4">
    <div><label className="block text-xs text-slate-400 mb-2">تصفية حسب الجهاز</label><select value={system} onChange={e=>setSystem(e.target.value)} className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3 text-sm text-white">{systemNames.map(s=><option key={s}>{s}</option>)}</select></div>
    <div className="max-h-[230px] overflow-y-auto space-y-2">{filtered.map(o=><button key={o.id} onClick={()=>choose(o.id)} className={`w-full text-right rounded-xl border p-3 transition ${selected===o.id?'border-cyan-300 bg-cyan-400/10':'border-slate-700 bg-slate-950/70 hover:border-slate-500'}`}><span className="block text-sm font-bold text-white">{o.name}</span><span className="block text-[11px] text-slate-400 mt-1">{o.system}</span></button>)}</div>
    <div className="border-t border-slate-700 pt-4"><div className="flex items-center gap-2 text-cyan-300 text-xs font-bold mb-2"><HeartPulse className="w-4 h-4"/> العضو المحدد</div><h3 className="text-xl font-black text-white">{active.name}</h3><p className="text-xs text-slate-400 mt-1">{active.system}</p><p className="text-sm text-slate-300 leading-7 mt-3">{active.function}</p></div>
   </aside>
  </div>
  <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-xs leading-6 text-amber-100">ملاحظة علمية: هذا نموذج ثلاثي الأبعاد تعليمي مبسط لتوضيح مواضع الأعضاء وعلاقاتها العامة، وليس أطلسًا تشريحيًا طبيًا دقيقًا أو مقياسًا حقيقيًا للأحجام. الهيكل العظمي تخطيطي، وبعض العظام الصغيرة والتفاصيل التشريحية غير ممثلة.</div>
 </section>;
};
