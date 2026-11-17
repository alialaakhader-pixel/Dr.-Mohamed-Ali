import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

type Props = { kind: 'animal' | 'plant'; selected: string; onSelect: (id:string)=>void };

const parts = [
  {id:'nucleus',label:'النواة',color:0x9b7bdf,pos:[0,0,0],scale:[.42,.36,.38]},
  {id:'mitochondria',label:'الميتوكوندريا',color:0xf28b45,pos:[-.78,.28,.1],scale:[.34,.16,.2]},
  {id:'er',label:'الشبكة الإندوبلازمية',color:0x39bde0,pos:[.7,.42,-.12],scale:[.42,.16,.2]},
  {id:'golgi',label:'جهاز جولجي',color:0xe879b4,pos:[.68,-.48,.12],scale:[.32,.16,.22]},
  {id:'ribosome',label:'الريبوسومات',color:0xf3cf52,pos:[-.55,-.55,.22],scale:[.13,.13,.13]},
  {id:'lysosome',label:'الجسيمات الحالّة',color:0xef7188,pos:[.9,.02,.32],scale:[.13,.13,.13]},
  {id:'chloroplast',label:'البلاستيدة الخضراء',color:0x54c879,pos:[-.78,.55,-.12],scale:[.3,.16,.18]},
  {id:'vacuole',label:'الفجوة العصارية',color:0x48b8d6,pos:[.3,.05,-.38],scale:[.48,.34,.28]},
];

export const CellScene3D: React.FC<Props> = ({kind,selected,onSelect}) => {
  const host=useRef<HTMLDivElement>(null);
  const rootRef=useRef<THREE.Group|null>(null);
  const selectedRef=useRef(selected);
  const [resetKey,setResetKey]=useState(0);
  useEffect(()=>{selectedRef.current=selected;},[selected]);
  useEffect(()=>{if(rootRef.current){rootRef.current.rotation.set(0,0,0);}},[resetKey,kind]);
  const [zoom,setZoom]=useState(1);
  const [dragging,setDragging]=useState(false);

  useEffect(()=>{
    const el=host.current;
    if(!el) return;
    const scene=new THREE.Scene();
    scene.background=new THREE.Color('#061a1b');
    const camera=new THREE.PerspectiveCamera(36,1,.1,100);
    camera.position.set(0,0,5.2);
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.setSize(el.clientWidth,el.clientHeight);
    el.appendChild(renderer.domElement);
    const root=new THREE.Group(); scene.add(root); rootRef.current=root;
    scene.add(new THREE.HemisphereLight(0xe9fff8,0x142b2d,1.45));
    const key=new THREE.DirectionalLight(0xd7fff3,3.15); key.position.set(3,4,5); key.castShadow=true; scene.add(key);
    const rim=new THREE.PointLight(0x0ea5a4,24); rim.position.set(-3,-2,-2); scene.add(rim);
    const fill=new THREE.DirectionalLight(0x9bcaff,1.1);fill.position.set(-4,2,4);scene.add(fill);
    renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.08;
    const shellMat=new THREE.MeshPhysicalMaterial({color:kind==='plant'?0x4eaa68:0x20a99e,transparent:true,opacity:.24,roughness:.16,metalness:.015,side:THREE.DoubleSide,clearcoat:1,clearcoatRoughness:.08,depthWrite:false,transmission:.08});
    if(kind==='plant'){
      root.add(new THREE.Mesh(new RoundedBoxGeometry(2.35,1.78,1.62,8,.16),new THREE.MeshPhysicalMaterial({color:0x527d48,roughness:.88,transparent:true,opacity:.5,clearcoat:.12})));
      root.add(new THREE.Mesh(new RoundedBoxGeometry(2.22,1.65,1.5,8,.14),shellMat));
    }else{
      const shell=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),shellMat);shell.scale.set(1.18,1.02,.9);root.add(shell);
      const membrane=new THREE.Mesh(new THREE.SphereGeometry(.985,72,48),new THREE.MeshBasicMaterial({color:0x72e3d2,wireframe:true,transparent:true,opacity:.13}));membrane.scale.copy(shell.scale);root.add(membrane);
    }
    const cytoplasm=new THREE.Mesh(new THREE.SphereGeometry(.92,64,48),new THREE.MeshStandardMaterial({color:0x2b8d7b,transparent:true,opacity:.12,roughness:.9,depthWrite:false}));cytoplasm.scale.set(1.05,.88,.78);root.add(cytoplasm);
    const visible=parts.filter(p=>kind==='plant'?p.id!=='lysosome':!['chloroplast','vacuole'].includes(p.id));
    const mat=(color:number)=>new THREE.MeshPhysicalMaterial({color,roughness:.34,metalness:.015,clearcoat:.75});
    visible.forEach(p=>{
      const g=new THREE.Group();g.position.set(...p.pos as [number,number,number]);g.scale.set(...p.scale as [number,number,number]);g.userData.partId=p.id;
      const organelleGeometry=p.id==='mitochondria'?new THREE.CapsuleGeometry(.62,.95,8,24):new THREE.SphereGeometry(1,48,32);
      const base=new THREE.Mesh(organelleGeometry,mat(p.color));if(p.id==='mitochondria')base.rotation.z=Math.PI/2;base.userData.partId=p.id;g.add(base);
      if(p.id==='nucleus'){
        const env=new THREE.Mesh(new THREE.SphereGeometry(.91,40,28),new THREE.MeshPhysicalMaterial({color:0xc4b5fd,transparent:true,opacity:.28,side:THREE.DoubleSide}));env.userData.partId=p.id;g.add(env);
        const nucleolus=new THREE.Mesh(new THREE.SphereGeometry(.25,28,20),mat(0x6d4bb5));nucleolus.position.set(.2,-.12,.72);nucleolus.userData.partId=p.id;g.add(nucleolus);
        for(let i=0;i<18;i++){const t=i/18*Math.PI*2;const pore=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),new THREE.MeshBasicMaterial({color:0xf0eaff}));pore.position.set(Math.cos(t)*.86,Math.sin(t)*.86,.05);pore.userData.partId=p.id;g.add(pore);}
      }
      if(p.id==='mitochondria'){
        for(let i=0;i<7;i++){const pts:THREE.Vector3[]=[];for(let j=0;j<=40;j++){const x=-.86+j/40*1.72;pts.push(new THREE.Vector3(x,Math.sin(j/40*Math.PI*8+i*.62)*(.13+(i%2)*.025),(i-3)*.12));}const crista=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),96,.027,8,false),mat(0x713a20));crista.userData.partId=p.id;g.add(crista);}
      }
      if(p.id==='er'){
        for(let i=0;i<8;i++){const pts:THREE.Vector3[]=[];for(let j=0;j<=32;j++){const x=-.92+j/32*1.84;pts.push(new THREE.Vector3(x,Math.sin(j/32*Math.PI*2+i*.64)*(.13+i*.009),(i-3.5)*.085));}const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),80,.026,8,false),mat(i%2?0x38bdf8:0x1d8eaf));tube.userData.partId=p.id;g.add(tube);if(i%2===0){for(let k=0;k<12;k++){const bead=new THREE.Mesh(new THREE.SphereGeometry(.022,8,6),mat(0xe8d68a));bead.position.set(-.82+k*.14,Math.sin(k/11*Math.PI*2+i*.64)*(.13+i*.009),(i-3.5)*.085+.025);bead.userData.partId=p.id;g.add(bead);}}}
      }
      if(p.id==='golgi'){
        for(let i=0;i<6;i++){const sac=new THREE.Mesh(new THREE.TorusGeometry(.52-i*.055,.075,10,48,Math.PI*1.45),mat(i%2?0xf9a8d4:0xc45b9b));sac.rotation.z=-.18+i*.065;sac.position.y=(i-2.5)*.16;sac.userData.partId=p.id;g.add(sac);}
        for(let i=0;i<5;i++){const ves=new THREE.Mesh(new THREE.SphereGeometry(.07,12,8),mat(0xf9a8d4));ves.position.set(.55+i*.09,-.38-i*.035,.12);ves.userData.partId=p.id;g.add(ves);}
      }
      if(p.id==='ribosome'){for(let i=0;i<28;i++){const t=i*2.399,r=.25*Math.sqrt(i/28),bead=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),mat(0xffe27a));bead.position.set(Math.cos(t)*r,Math.sin(t)*r,Math.sin(i*1.7)*.1);bead.userData.partId=p.id;g.add(bead);}}
      if(p.id==='lysosome'){for(let i=0;i<9;i++){const granule=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),mat(0x9f3455));granule.position.set(Math.sin(i*2.1)*.48,Math.cos(i*1.4)*.42,Math.sin(i)*.35);granule.userData.partId=p.id;g.add(granule);}}
      if(p.id==='chloroplast'){for(let a=0;a<5;a++){for(let b=0;b<6;b++){const disc=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.035,24),mat(0x14532d));disc.rotation.x=Math.PI/2;disc.position.set((a-2)*.28,(b-2.5)*.065,.12*Math.sin(a));disc.userData.partId=p.id;g.add(disc);}}for(let a=0;a<4;a++){const lamella=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3((a-1.5)*.28,-.22,-.05),new THREE.Vector3((a-1.5)*.28,0,-.12),new THREE.Vector3((a-1.5)*.28,.22,-.05)]),32,.018,6,false),mat(0x8acb62));lamella.userData.partId=p.id;g.add(lamella);}}
      if(p.id==='vacuole'){base.material=new THREE.MeshPhysicalMaterial({color:0x67d9ed,transparent:true,opacity:.34,roughness:.12,transmission:.22,clearcoat:1});const tonoplast=new THREE.Mesh(new THREE.SphereGeometry(.96,32,24),new THREE.MeshBasicMaterial({color:0x9cecf5,wireframe:true,transparent:true,opacity:.22}));tonoplast.userData.partId=p.id;g.add(tonoplast);}
      root.add(g);
    });
    const stars=new THREE.Points(new THREE.BufferGeometry().setFromPoints(Array.from({length:100},()=>new THREE.Vector3((Math.random()-.5)*7,(Math.random()-.5)*5,(Math.random()-.5)*3))),new THREE.PointsMaterial({color:0x6ee7b7,size:.018,transparent:true,opacity:.55}));
    scene.add(stars);
    let raf=0; let down=false; let px=0; let py=0; let moved=false;
    const pointerDown=(e:PointerEvent)=>{down=true;moved=false;px=e.clientX;py=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);setDragging(true);};
    const pointerMove=(e:PointerEvent)=>{if(!down)return;const dx=e.clientX-px,dy=e.clientY-py;if(Math.abs(dx)+Math.abs(dy)>3)moved=true;root.rotation.y+=dx*.008;root.rotation.x+=dy*.008;px=e.clientX;py=e.clientY;};
    const pointerUp=()=>{down=false;setDragging(false);};
    const pointerClick=(e:PointerEvent)=>{if(moved)return;const rect=renderer.domElement.getBoundingClientRect();const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);const hits=ray.intersectObjects(root.children,true);const hit=hits.find(h=>h.object.userData.partId);if(hit?.object.userData.partId)onSelect(hit.object.userData.partId);};
    renderer.domElement.addEventListener('pointerdown',pointerDown);
    renderer.domElement.addEventListener('pointermove',pointerMove);
    renderer.domElement.addEventListener('pointerup',pointerUp);
    renderer.domElement.addEventListener('pointercancel',pointerUp);
    renderer.domElement.addEventListener('click',pointerClick);
    const resize=()=>{if(!el)return;camera.aspect=el.clientWidth/Math.max(el.clientHeight,1);camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);};
    const observer=new ResizeObserver(resize);observer.observe(el);
    const animate=()=>{raf=requestAnimationFrame(animate);root.rotation.y+=down?0:.0015;root.traverse(o=>{if(o instanceof THREE.Mesh && o.userData.partId){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach((mat:any)=>{if(mat.emissive){const active=o.userData.partId===selectedRef.current;mat.emissive.setHex(active?0x164e63:0x000000);mat.emissiveIntensity=active?0.65:0;}});}});camera.position.z=5.2/zoom;renderer.render(scene,camera);};
    animate();
    return ()=>{cancelAnimationFrame(raf);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointercancel',pointerUp);renderer.domElement.removeEventListener('click',pointerClick);scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose();}});renderer.dispose();rootRef.current=null;el.removeChild(renderer.domElement);};
  },[kind,zoom,onSelect]);

  return <div className="relative rounded-3xl overflow-hidden border border-emerald-400/20 bg-[#061a1b]">
    <div ref={host} className="w-full h-[330px] sm:h-[430px] touch-none cursor-grab active:cursor-grabbing" aria-label="مجسم تفاعلي ثلاثي الأبعاد للخلية" />
    <div className="absolute top-3 right-3 rounded-lg bg-slate-950/80 border border-emerald-400/20 px-3 py-2 text-xs text-emerald-200">{dragging?'حرّك لاستكشاف الخلية':'اسحب لتدوير المجسم · انقر مرتين على عضية لتحديدها'}</div>
    <div className="absolute bottom-3 left-3 flex gap-2">
      <button onClick={()=>setZoom(z=>Math.max(.75,z-.15))} className="p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-white" aria-label="تصغير"><ZoomOut className="w-4 h-4"/></button>
      <button onClick={()=>setZoom(z=>Math.min(1.8,z+.15))} className="p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-white" aria-label="تكبير"><ZoomIn className="w-4 h-4"/></button>
      <button onClick={()=>{setZoom(1);setResetKey(k=>k+1);}} className="p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-white" aria-label="إعادة ضبط"><RotateCcw className="w-4 h-4"/></button>
    </div>
  </div>;
};
