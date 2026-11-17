import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Mountain, Layers3, Flame, Gem, Shell, RotateCcw } from 'lucide-react';

type ModelKey = 'earth' | 'plates' | 'volcano' | 'rocks' | 'fossils' | 'minerals';
type Topic = { key: ModelKey; title: string; subtitle: string; detail: string; facts: string[] };

const TOPICS: Topic[] = [
  { key: 'earth', title: 'تركيب الأرض الداخلي', subtitle: 'القشرة · الوشاح · اللب', detail: 'يوضح النموذج الطبقات الرئيسة للأرض في مقطع كروي تعليمي. القشرة هي الطبقة الخارجية الرقيقة، يليها الوشاح، ثم اللب الخارجي السائل واللب الداخلي الصلب.', facts: ['القشرة والجزء العلوي الصلب من الوشاح يكوّنان الغلاف الصخري.', 'الوشاح صلب في معظمه، لكنه يتشوه ببطء على الأزمنة الجيولوجية.', 'يتكون اللب الخارجي أساسًا من الحديد والنيكل في حالة سائلة، بينما اللب الداخلي صلب بسبب الضغط الهائل.'] },
  { key: 'plates', title: 'حركة الصفائح التكتونية', subtitle: 'تباعد · تقارب · انزلاق', detail: 'الصفائح التكتونية أجزاء كبيرة من الغلاف الصخري تتحرك ببطء فوق نطاق أكثر قابلية للتشوه في الوشاح العلوي. تفاعلات حدودها ترتبط بتكوّن الجبال والزلازل والبراكين.', facts: ['الحدود المتباعدة تسمح بتكوّن قشرة جديدة، خاصة عند حيد وسط المحيط.', 'الحدود المتقاربة قد ينتج عنها اندساس أو تصادم قاري وتكوّن سلاسل جبلية.', 'الحدود التحويلية تسمح بانزلاق الصفائح بمحاذاة بعضها.'] },
  { key: 'volcano', title: 'بنية البركان', subtitle: 'حجرة صهارية · قناة · فوهة', detail: 'يعرض المجسم مقطعًا مبسطًا لبركان طبقي. الصهارة هي المادة المنصهرة تحت سطح الأرض، وعندما تصل إلى السطح تسمى لابة أو حممًا بركانية.', facts: ['تتجمع الصهارة في خزانات أو مناطق تخزين تحت سطح الأرض.', 'قد تصعد الصهارة عبر قنوات وشقوق لتصل إلى السطح.', 'تختلف طبيعة الثوران باختلاف تركيب الصهارة ودرجة حرارتها ومحتواها من الغازات.'] },
  { key: 'rocks', title: 'دورة الصخور', subtitle: 'نارية · رسوبية · متحولة', detail: 'الصخور مواد طبيعية صلبة تتكون من معدن واحد أو عدة معادن. تتغير الصخور عبر عمليات مثل التبلور والتجوية والنقل والترسيب والدفن والتحول والانصهار.', facts: ['الصخور النارية تنتج من تبريد الصهارة أو اللابة.', 'الصخور الرسوبية تتكون من تراكم الرواسب أو الترسيب الكيميائي أو الحيوي.', 'الصخور المتحولة تنتج من تغير صخور سابقة بفعل الحرارة والضغط والسوائل دون انصهار كامل.'] },
  { key: 'fossils', title: 'مختبر الحفريات', subtitle: 'آثار الحياة القديمة', detail: 'الحفرية بقايا أو أثر لكائن حي عاش في الماضي الجيولوجي وحُفظ طبيعيًا في الصخور أو الرواسب. يساعد سجل الحفريات في فهم تاريخ الحياة والبيئات القديمة.', facts: ['قد تحفظ الحفريات أجزاء صلبة أو طبعات وآثار حركة وأنفاقًا.', 'تساعد الحفريات المرشدة في المقارنة بين الطبقات وتحديد أعمارها النسبية.', 'ليست كل الكائنات تتحول إلى حفريات؛ فالحفظ يحتاج ظروفًا مناسبة.'] },
  { key: 'minerals', title: 'متحف المعادن', subtitle: 'الصلادة · الانفصام · البريق', detail: 'المعدن مادة طبيعية صلبة غير عضوية، لها تركيب كيميائي محدد أو مدى محدود، وبناء ذري منتظم. تُستخدم خواصه الفيزيائية للمساعدة في التعرف عليه.', facts: ['مقياس موهس يرتب المعادن حسب مقاومتها للخدش من 1 إلى 10.', 'البريق يصف طريقة انعكاس الضوء عن سطح المعدن.', 'الانفصام هو ميل المعدن للانقسام على مستويات ضعف في بنيته البلورية.'] }
];

function material(color: number, roughness = 0.72, metalness = 0.05, opacity = 1) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, transparent: opacity < 1, opacity, side: THREE.DoubleSide });
}

function makeRockTexture(base: string, seed: number) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'); if (!ctx) return null;
  ctx.fillStyle = base; ctx.fillRect(0,0,512,512);
  let n = seed >>> 0;
  const rand = () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
  for (let i=0;i<14500;i++) {
    const x=rand()*512,y=rand()*512,r=.35+rand()*3.8,a=.025+rand()*.22;
    ctx.fillStyle=(rand()>.52?"rgba(245,235,215,":"rgba(12,18,22,")+a+")";
    ctx.beginPath();ctx.ellipse(x,y,r,r*(.35+rand()*.9),rand()*Math.PI,0,Math.PI*2);ctx.fill();
  }
  for(let i=0;i<85;i++){
    const x=rand()*512,y=rand()*512;ctx.strokeStyle="rgba(25,22,18,"+(.025+rand()*.075)+")";ctx.lineWidth=.5+rand()*2;
    ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+rand()*35,y+rand()*35,x-rand()*35,y+rand()*35,x+rand()*55-25,y+rand()*55-25);ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1.5,1.5);texture.anisotropy=4;return texture;
}
function makeRockMaterial(base: string, seed: number) {
  const map=makeRockTexture(base,seed);
  return new THREE.MeshStandardMaterial({color:0xffffff,map:map||undefined,roughness:.94,bumpMap:map||undefined,bumpScale:.075});
}
function makeIrregularRock(radius:number, seed:number) {
  const geometry=new THREE.IcosahedronGeometry(radius,5);const pos=geometry.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const wave=Math.sin(x*17+seed)*Math.cos(y*13-seed*.7)*Math.sin(z*15+seed*.3);
    const fine=Math.sin(x*39+seed)*Math.sin(y*31+seed*2)*Math.cos(z*35);
    const factor=1+wave*.045+fine*.012;pos.setXYZ(i,x*factor,y*factor,z*factor);
  }
  geometry.computeVertexNormals();return geometry;
}
function buildModel(key: ModelKey) {
  const root = new THREE.Group();
  const addMesh = (geometry: THREE.BufferGeometry, color: number, position: [number,number,number], scale: [number,number,number] = [1,1,1], roughness = 0.78) => {
    const mesh = new THREE.Mesh(geometry, material(color, roughness, 0.02));
    mesh.position.set(...position); mesh.scale.set(...scale); root.add(mesh); return mesh;
  };
  const line = (points: THREE.Vector3[], color: number, radius = 0.018) => {
    const curve = new THREE.CatmullRomCurve3(points);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(48, points.length * 3), radius, 8, false), material(color, 0.72));
    root.add(mesh); return mesh;
  };
  const shellGeometry = (radius: number) => new THREE.SphereGeometry(radius, 96, 64, 0, Math.PI * 1.72, 0, Math.PI);
  if (key === 'earth') {
    // Radii are intentionally exaggerated for visibility; the order of layers is correct.
    const layers = [
      { r: 2.02, c: 0x557d8d },
      { r: 1.78, c: 0xb86d43 },
      { r: 1.02, c: 0xe58a32 },
      { r: 0.36, c: 0xffd36a }
    ];
    layers.forEach((layer, i) => {
      const mesh = new THREE.Mesh(shellGeometry(layer.r), material(layer.c, 0.86, 0.015));
      mesh.rotation.y = -0.42; mesh.rotation.z = 0.08; root.add(mesh);
      if (i === 0) {
        const crustEdge = new THREE.Mesh(new THREE.TorusGeometry(2.015, 0.025, 10, 120), material(0x9ac4c7));
        crustEdge.rotation.x = Math.PI / 2; crustEdge.position.y = -0.04; root.add(crustEdge);
      }
    });
    const outerBoundary = new THREE.Mesh(new THREE.SphereGeometry(1.025, 72, 48), new THREE.MeshBasicMaterial({color:0xffbd62,wireframe:true,transparent:true,opacity:.12}));
    root.add(outerBoundary);
    const innerGlow = new THREE.Mesh(new THREE.SphereGeometry(.37, 48, 32), new THREE.MeshPhysicalMaterial({color:0xffdf83,emissive:0x8a3d0a,emissiveIntensity:.22,roughness:.42,clearcoat:.35}));
    root.add(innerGlow);
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(2.09, 64, 48), new THREE.MeshBasicMaterial({color:0x38bdf8,wireframe:true,transparent:true,opacity:.075}));
    root.add(atmosphere);
    // A narrow cutaway edge makes the internal sequence legible.
    const cutEdge = new THREE.Mesh(new THREE.TorusGeometry(1.12, .018, 8, 96), material(0xffd29a));
    cutEdge.position.set(.05,0,.02); cutEdge.rotation.y=Math.PI/2.2; root.add(cutEdge);
  } else if (key === 'plates') {
    const crustMat = material(0x668c78, .9);
    const left = new THREE.Mesh(new THREE.BoxGeometry(1.92,.34,2.55), crustMat);
    left.position.set(-1.02,.23,0); left.rotation.z=-.025;
    const right = new THREE.Mesh(new THREE.BoxGeometry(1.92,.34,2.55), material(0x9b8061,.92));
    right.position.set(1.02,.23,0); right.rotation.z=.025;
    root.add(left,right);
    const mantle = new THREE.Mesh(new THREE.BoxGeometry(4.25,.9,2.7), material(0xb85e3d,.96,0,.42));
    mantle.position.y=-.48; root.add(mantle);
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(.1,.48,.44,48,1), material(0xe6a36a));
    ridge.position.set(0,.54,0); root.add(ridge);
    const magma = new THREE.Mesh(new THREE.CylinderGeometry(.13,.2,.66,32), material(0xf97316,.42));
    magma.position.set(0,.22,0); root.add(magma);
    for(let i=0;i<3;i++){
      const x=-.22+i*.22;
      const dike=new THREE.Mesh(new THREE.BoxGeometry(.035,.5,2.45),material(0xffa34d,.5));
      dike.position.set(x,.42,0); root.add(dike);
    }
    root.add(new THREE.ArrowHelper(new THREE.Vector3(-1,0,0),new THREE.Vector3(-.2,.82,0),.66,0x67e8f9,.18,.12));
    root.add(new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(.2,.82,0),.66,0x67e8f9,.18,.12));
    // Mantle upwelling beneath a divergent boundary.
    root.add(new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(0,-.86,0),.58,0xfbbf24,.18,.12));
  } else if (key === 'volcano') {
    // Stratovolcano profile with a summit crater and a central conduit.
    const profile = [
      new THREE.Vector2(0,-1.42),new THREE.Vector2(.55,-1.38),new THREE.Vector2(1.08,-.95),
      new THREE.Vector2(1.48,-.28),new THREE.Vector2(1.7,.42),new THREE.Vector2(1.48,.86),
      new THREE.Vector2(.92,1.22),new THREE.Vector2(.52,1.28),new THREE.Vector2(.38,1.12),
      new THREE.Vector2(.25,1.02),new THREE.Vector2(.12,1.08),new THREE.Vector2(0,1.08)
    ];
    const cone = new THREE.Mesh(new THREE.LatheGeometry(profile,96), material(0x80624e,.94));
    cone.position.y=.08; root.add(cone);
    for(let j=0;j<5;j++){
      const y=-.72+j*.36, r=1.18-j*.18;
      const pts:THREE.Vector3[]=[];
      for(let i=0;i<=80;i++){const t=i/80*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(t)*r,y+Math.sin(t*3+j)*.025,Math.sin(t)*r));}
      line(pts,j%2?0xb58a65:0x59463c,.012);
    }
    const crater = new THREE.Mesh(new THREE.TorusGeometry(.34,.09,16,72), material(0x332b27,.98));
    crater.rotation.x=Math.PI/2; crater.position.y=1.18; root.add(crater);
    const throat = new THREE.Mesh(new THREE.CylinderGeometry(.14,.2,1.95,32), material(0xef6a32,.45));
    throat.position.set(0,-.08,0); root.add(throat);
    const chamber = new THREE.Mesh(new THREE.SphereGeometry(.58,48,32), material(0xd94a32,.38));
    chamber.scale.set(1.55,.72,1.15); chamber.position.set(0,-1.18,0); root.add(chamber);
    const sideDike = new THREE.Mesh(new THREE.BoxGeometry(.09,.9,.1),material(0xe8753c,.42));
    sideDike.position.set(.72,-.36,0); sideDike.rotation.z=-.62; root.add(sideDike);
    for(let i=0;i<7;i++){
      const puff=new THREE.Mesh(new THREE.SphereGeometry(.13+(i%3)*.045,20,14),new THREE.MeshStandardMaterial({color:0x9aa6ad,transparent:true,opacity:.3,roughness:1}));
      puff.position.set(Math.sin(i*2.1)*.36,1.42+i*.16,Math.cos(i*1.7)*.22);root.add(puff);
    }
  } else if (key === 'rocks') {
    // Distinctive teaching specimens: granite, layered sandstone, banded gneiss and basalt.
    const granite=addMesh(makeIrregularRock(.62,11),0xffffff,[-1.48,.08,0],[1.08,.82,.9]);
    granite.material=makeRockMaterial('#777b80',11);
    granite.rotation.set(.3,.6,.1);
    for(let i=0;i<75;i++){
      const p=new THREE.Vector3((Math.sin(i*12.31)*.48)-1.48,(Math.cos(i*7.7)*.34)+.08,(Math.sin(i*4.17)*.38));
      addMesh(new THREE.SphereGeometry(.018+(i%4)*.004,8,6),[0xd7c6a1,0x2d3034,0xb7a4a0][i%3],[p.x,p.y,p.z]);
    }
    const sandstone=addMesh(makeIrregularRock(.58,23),0xffffff,[-.48,.06,0],[.92,.8,.86]);
    sandstone.material=makeRockMaterial('#b98b57',23);
    sandstone.rotation.set(.15,.2,.1);
    for(let j=0;j<5;j++){
      const y=-.28+j*.14, pts:THREE.Vector3[]=[];
      for(let i=0;i<=32;i++){const t=i/32*Math.PI*2;pts.push(new THREE.Vector3(-.48+Math.cos(t)*(.48-j*.018),.06+y+Math.sin(t)*(.38-j*.014),Math.sin(t)*.42));}
      line(pts,0xe3c08c,.012);
    }
    const gneiss=addMesh(makeIrregularRock(.57,37),0xffffff,[.52,.05,0],[.96,.82,.88]);
    gneiss.material=makeRockMaterial('#77707c',37);
    gneiss.rotation.set(.2,.4,.25);
    for(let j=0;j<7;j++){
      const pts:THREE.Vector3[]=[];
      for(let i=0;i<=28;i++){const t=i/28*Math.PI*2;pts.push(new THREE.Vector3(.52+Math.cos(t)*(.48-j*.025),.05+Math.sin(t)*(.36-j*.018)+Math.sin(t*2)*.025,Math.sin(t)*.42));}
      line(pts,j%2?0xe0c7b2:0x393943,.018);
    }
    const basalt=addMesh(new THREE.CylinderGeometry(.42,.48,.9,6,5),0xffffff,[1.52,.04,0],[1,.92,.9]);
    basalt.material=makeRockMaterial('#454d54',49);
    basalt.rotation.set(.1,.35,.1);
    for(let i=0;i<3;i++){
      const col=new THREE.Mesh(new THREE.CylinderGeometry(.11,.13,.72,6),material(0x687078,.92));
      col.position.set(1.52+(i-1)*.2,-.02,.35);col.rotation.z=(i-1)*.07;root.add(col);
    }
  } else if (key === 'fossils') {
    // Ribbed ammonite-like shell with a visible logarithmic spiral.
    const pts:THREE.Vector3[]=[];
    for(let i=0;i<260;i++){const t=i/259*Math.PI*6.4;const r=.055*Math.exp(i/259*2.55);pts.push(new THREE.Vector3(Math.cos(t)*r,Math.sin(t)*r,.05*Math.sin(t*2)));}
    const curve=new THREE.CatmullRomCurve3(pts);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve,320,.095,12,false),material(0xd8b98b,.72)));
    for(let i=0;i<24;i++){
      const t=i/24*Math.PI*6.4,r=.055*Math.exp(i/24*2.55);
      const center=new THREE.Vector3(Math.cos(t)*r,Math.sin(t)*r,0);
      const tangent=new THREE.Vector3(-Math.sin(t),Math.cos(t),0).normalize();
      const ribPts=[center.clone().addScaledVector(tangent,-.12),center.clone(),center.clone().addScaledVector(tangent,.12)];
      line(ribPts,0xf0d9b4,.018);
    }
    const body=addMesh(new THREE.SphereGeometry(.23,32,24),0x8c745d,[.9,-.08,0],[1.5,.7,.7]);
    body.rotation.z=-.2;
    const aperture=addMesh(new THREE.SphereGeometry(.12,20,16),0x4b3c32,[1.18,-.08,.02],[1.1,.75,.65]);
  } else {
    // Quartz prism, halite cube and calcite rhombohedron; crystal habits are schematic.
    const quartz = new THREE.Group();
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,1.1,6,1),new THREE.MeshPhysicalMaterial({color:0x83c9e8,roughness:.18,metalness:.05,transmission:.16,transparent:true,opacity:.88,clearcoat:1}));
    shaft.position.y=.1;quartz.add(shaft);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(.3,.42,6),new THREE.MeshPhysicalMaterial({color:0xb4e6f7,roughness:.16,transparent:true,opacity:.9,clearcoat:1}));
    tip.position.y=.86;quartz.add(tip);quartz.position.set(-1.05,-.02,0);quartz.rotation.z=.08;root.add(quartz);
    const halite=addMesh(new THREE.BoxGeometry(.8,.8,.8),0xd9d9d0,[.05,-.08,0],[1,1,1]);
    halite.rotation.set(.18,.35,.12);
    const calciteGeo=new THREE.BoxGeometry(.78,.78,.78);const cp=calciteGeo.attributes.position;
    for(let i=0;i<cp.count;i++){const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i);cp.setXYZ(i,x+y*.24,y+z*.12,z+x*.08);}
    calciteGeo.computeVertexNormals();const calcite=addMesh(calciteGeo,0xe7c58a,[1.08,-.12,.18],[1,.72,.82]);
    calcite.rotation.set(.35,.48,.2);
    const calciteEdges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.78,.78,.78)),new THREE.LineBasicMaterial({color:0xffe6b8,transparent:true,opacity:.8}));
    calciteEdges.position.copy(calcite.position);calciteEdges.rotation.copy(calcite.rotation);calciteEdges.scale.copy(calcite.scale);root.add(calciteEdges);
  }
  return root;
}
export const GeologyLab: React.FC = () => {
  const host = useRef<HTMLDivElement>(null);
  const [model, setModel] = useState<ModelKey>('earth');
  const [dragging, setDragging] = useState(false);
  const [resetNonce, setResetNonce] = useState(0);
  const active = useMemo(() => TOPICS.find(t => t.key === model) || TOPICS[0], [model]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07151d);
    const camera = new THREE.PerspectiveCamera(42, el.clientWidth / Math.max(el.clientHeight, 1), 0.1, 100);
    camera.position.set(0, 0.4, 7.2);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const ambient = new THREE.HemisphereLight(0xe8f4ff, 0x30271f, 1.35);
    const keyLight = new THREE.DirectionalLight(0xffe4bd, 3.2);
    keyLight.position.set(4, 5, 6);
    const rimLight = new THREE.PointLight(0x38bdf8, 34, 12);
    rimLight.position.set(-4, 1, -3);
    scene.add(ambient, keyLight, rimLight);
    const grid = new THREE.GridHelper(12, 24, 0x164e63, 0x12313d);
    grid.position.y = -2.15;
    scene.add(grid);
    const group = buildModel(model);
    scene.add(group);
    let frame = 0;
    let down = false;
    let px = 0;
    let py = 0;
    const onDown = (e: PointerEvent) => { down = true; px = e.clientX; py = e.clientY; renderer.domElement.setPointerCapture(e.pointerId); setDragging(true); };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      group.rotation.y += (e.clientX - px) * 0.008;
      group.rotation.x = THREE.MathUtils.clamp(group.rotation.x + (e.clientY - py) * 0.006, -0.75, 0.75);
      px = e.clientX; py = e.clientY;
    };
    const onUp = () => { down = false; setDragging(false); };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); camera.position.z = THREE.MathUtils.clamp(camera.position.z + e.deltaY * 0.004, 4.2, 10); };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointercancel', onUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    const resize = new ResizeObserver(() => {
      if (!el.clientWidth || !el.clientHeight) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    });
    resize.observe(el);
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (!down) group.rotation.y += 0.0018;
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointercancel', onUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => m.dispose());
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
  }, [model, resetNonce]);

  const resetView = () => setResetNonce(value => value + 1);
  const icons: Record<ModelKey, React.ReactNode> = {
    earth: <Layers3 className="w-4 h-4" />,
    plates: <Mountain className="w-4 h-4" />,
    volcano: <Flame className="w-4 h-4" />,
    rocks: <Gem className="w-4 h-4" />,
    fossils: <Shell className="w-4 h-4" />,
    minerals: <Gem className="w-4 h-4" />
  };

  return (
    <section dir="rtl" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-5">
      <header className="rounded-[2rem] border border-amber-400/20 bg-gradient-to-br from-slate-950 via-[#13252b] to-slate-950 p-5 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200 mb-3">المختبر الجيولوجي التفاعلي · 3D</div>
            <h1 className="text-2xl sm:text-4xl font-black text-white">استكشف باطن الأرض وتاريخها</h1>
            <p className="text-sm text-slate-300 mt-2">نماذج تعليمية تفاعلية لتركيب الأرض والصخور والحفريات والمعادن.</p>
          </div>
          <span className="text-xs text-amber-100 border border-amber-300/20 rounded-full px-3 py-2">اسحب المجسم للتدوير · عجلة الفأرة للتقريب</span>
        </div>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
        {TOPICS.map(topic => <button key={topic.key} onClick={() => setModel(topic.key)} className={"rounded-xl border p-3 text-right transition " + (model === topic.key ? "border-amber-300 bg-amber-300/10 text-amber-100" : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500")}>
          <span className="block mb-2">{icons[topic.key]}</span><span className="block text-xs font-black">{topic.title}</span><span className="block text-[10px] text-slate-400 mt-1">{topic.subtitle}</span>
        </button>)}
      </div>
      <div className="grid lg:grid-cols-[1.35fr_.8fr] gap-4">
        <div className="overflow-hidden rounded-3xl border border-slate-700 bg-[#07151d]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/80"><div><div className="text-sm font-black text-white">{active.title}</div><div className="text-[11px] text-slate-400">{active.subtitle}</div></div><button onClick={resetView} className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300" title="إعادة عرض المجسم"><RotateCcw className="w-4 h-4" /></button></div>
          <div ref={host} className="h-[390px] sm:h-[540px] w-full touch-none cursor-grab active:cursor-grabbing" />
          <div className="px-4 py-2 border-t border-slate-700 text-[11px] text-slate-400">{dragging ? 'حرّك المجسم واسحب للتدوير' : 'اسحب بإصبعك أو بالفأرة لتدوير المجسم، واستخدم عجلة الفأرة للتقريب'}</div>
        </div>
        <aside className="rounded-3xl border border-slate-700 bg-slate-900/90 p-4 sm:p-5 space-y-4">
          <div><div className="text-xs font-bold text-amber-200 mb-2">الفكرة العلمية</div><p className="text-sm text-slate-200 leading-7">{active.detail}</p></div>
          <div className="border-t border-slate-700 pt-3"><h2 className="text-sm font-black text-white mb-3">نقاط مهمة</h2><ul className="space-y-3">{active.facts.map((fact, i) => <li key={i} className="flex gap-2 text-xs text-slate-300 leading-6"><span className="text-amber-300 font-black">{i + 1}.</span><span>{fact}</span></li>)}</ul></div>
          <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-[11px] text-amber-100/80 leading-6">المجسمات توضيحية ومبسطة وليست بمقياس حقيقي. الألوان والأحجام لا تمثل قياسات أو عينات جيولوجية فعلية.</div>
        </aside>
      </div>
    </section>
  );
};
