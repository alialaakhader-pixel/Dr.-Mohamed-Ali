import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
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
    renderer.setSize(el.clientWidth,el.clientHeight);
    el.appendChild(renderer.domElement);
    const root=new THREE.Group(); scene.add(root); rootRef.current=root;
    scene.add(new THREE.AmbientLight(0xffffff,1.6));
    const key=new THREE.DirectionalLight(0xb8fff0,2.4); key.position.set(3,4,5); scene.add(key);
    const rim=new THREE.PointLight(0x0ea5a4,18); rim.position.set(-3,-2,-2); scene.add(rim);
    const shellGeo=new THREE.SphereGeometry(1,64,48);
    const shellMat=new THREE.MeshPhysicalMaterial({color:kind==='plant'?0x2f9c67:0x16a39a,transparent:true,opacity:.18,roughness:.24,metalness:.05,side:THREE.DoubleSide,clearcoat:.9});
    const shell=new THREE.Mesh(shellGeo,shellMat); shell.scale.set(kind==='plant'?1.25:1.12,kind==='plant'?.86:1,kind==='plant'?.78:.88); root.add(shell);
    const inner=new THREE.Mesh(new THREE.SphereGeometry(.94,48,32),new THREE.MeshStandardMaterial({color:0x1c786d,transparent:true,opacity:.18,roughness:.8}));
    inner.scale.copy(shell.scale).multiplyScalar(.94); root.add(inner);
    const visible=parts.filter(p=>kind==='plant'?p.id!=='lysosome':!['chloroplast','vacuole'].includes(p.id));
    visible.forEach(p=>{
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),new THREE.MeshPhysicalMaterial({color:p.color,roughness:.34,metalness:.04,clearcoat:.7}));
      mesh.position.set(...p.pos as [number,number,number]); mesh.scale.set(...p.scale as [number,number,number]); mesh.userData.partId=p.id; mesh.userData.baseColor=p.color; root.add(mesh);
      if(p.id==='mitochondria'||p.id==='chloroplast'){
        const groove=new THREE.Mesh(new THREE.TorusGeometry(.19,.018,8,36),new THREE.MeshBasicMaterial({color:p.id==='mitochondria'?0x7c2d12:0x14532d}));
        groove.position.copy(mesh.position); groove.rotation.y=.8; groove.scale.set(1.25,.65,.8); root.add(groove);
      }
    });
    const stars=new THREE.Points(new THREE.BufferGeometry().setFromPoints(Array.from({length:100},()=>new THREE.Vector3((Math.random()-.5)*7,(Math.random()-.5)*5,(Math.random()-.5)*3))),new THREE.PointsMaterial({color:0x6ee7b7,size:.018,transparent:true,opacity:.55}));
    scene.add(stars);
    let raf=0; let down=false; let px=0; let py=0; let moved=false;
    const pointerDown=(e:PointerEvent)=>{down=true;moved=false;px=e.clientX;py=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);setDragging(true);};
    const pointerMove=(e:PointerEvent)=>{if(!down)return;const dx=e.clientX-px,dy=e.clientY-py;if(Math.abs(dx)+Math.abs(dy)>3)moved=true;root.rotation.y+=dx*.008;root.rotation.x+=dy*.008;px=e.clientX;py=e.clientY;};
    const pointerUp=()=>{down=false;setDragging(false);};
    const pointerClick=(e:PointerEvent)=>{if(moved)return;const rect=renderer.domElement.getBoundingClientRect();const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);const hits=ray.intersectObjects(root.children,false);const hit=hits.find(h=>h.object.userData.partId);if(hit?.object.userData.partId)onSelect(hit.object.userData.partId);};
    renderer.domElement.addEventListener('pointerdown',pointerDown);
    renderer.domElement.addEventListener('pointermove',pointerMove);
    renderer.domElement.addEventListener('pointerup',pointerUp);
    renderer.domElement.addEventListener('pointercancel',pointerUp);
    renderer.domElement.addEventListener('click',pointerClick);
    const resize=()=>{if(!el)return;camera.aspect=el.clientWidth/Math.max(el.clientHeight,1);camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);};
    const observer=new ResizeObserver(resize);observer.observe(el);
    const animate=()=>{raf=requestAnimationFrame(animate);root.rotation.y+=down?0:.0015;root.children.forEach(o=>{if(o instanceof THREE.Mesh && o.userData.partId){const mat=o.material as THREE.MeshPhysicalMaterial;mat.emissive.setHex(o.userData.partId===selectedRef.current?0x164e63:0x000000);mat.emissiveIntensity=o.userData.partId===selectedRef.current?0.65:0;}});camera.position.z=5.2/zoom;renderer.render(scene,camera);};
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
