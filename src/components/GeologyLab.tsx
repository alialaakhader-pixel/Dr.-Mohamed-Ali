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

function buildModel(key: ModelKey) {
  const root = new THREE.Group();
  if (key === 'earth') {
    const shells = [
      { r: 2.05, c: 0x4f8eae },
      { r: 1.88, c: 0xc77b45 },
      { r: 1.05, c: 0xf1a23a },
      { r: 0.58, c: 0xffd36a }
    ];
    shells.forEach((s, i) => {
      const geo = new THREE.SphereGeometry(s.r, 64, 48, 0, Math.PI * 1.58, 0, Math.PI);
      const mesh = new THREE.Mesh(geo, material(s.c, 0.82, 0.02, i === 0 ? 0.95 : 1));
      mesh.rotation.y = -0.42;
      root.add(mesh);
    });
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(2.12, 48, 32), new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.12 }));
    root.add(atmosphere);
  } else if (key === 'plates') {
    const left = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 2.5), material(0x3f8b83));
    left.position.set(-1.05, 0.12, 0);
    left.rotation.z = -0.045;
    const right = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 2.5), material(0x8c7358));
    right.position.set(1.05, -0.02, 0);
    right.rotation.z = 0.045;
    root.add(left, right);
    const mantle = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.72, 2.65), material(0xb85e3d, 0.95, 0, 0.45));
    mantle.position.y = -0.52;
    root.add(mantle);
    const ridge = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 24), material(0xf4a261));
    ridge.position.set(0, 0.53, 0);
    root.add(ridge);
    root.add(new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(-0.25, 0.75, 0), 0.72, 0x67e8f9, 0.22, 0.14));
    root.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0.25, 0.75, 0), 0.72, 0x67e8f9, 0.22, 0.14));
  } else if (key === 'volcano') {
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(1.75, 2.55, 56, 1, false), material(0x80624e));
    mountain.position.y = 0.45;
    root.add(mountain);
    const crater = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.12, 12, 48), material(0x3b2d28));
    crater.rotation.x = Math.PI / 2;
    crater.position.y = 1.74;
    root.add(crater);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.75, 24), material(0xf97316, 0.4, 0.1));
    pipe.position.set(0, -0.2, 0);
    root.add(pipe);
    const chamber = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), material(0xef4444, 0.35, 0.05));
    chamber.scale.set(1.35, 0.62, 1);
    chamber.position.y = -1.2;
    root.add(chamber);
    for (let i = 0; i < 7; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.16 + (i % 3) * 0.05, 16, 12), new THREE.MeshStandardMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.45 }));
      puff.position.set(Math.sin(i * 2.1) * 0.36, 1.95 + i * 0.19, Math.cos(i * 1.7) * 0.22);
      root.add(puff);
    }
  } else if (key === 'rocks') {
    const rocks = [
      { x: -1.55, c: 0x6d7f8b, label: 'نارية' },
      { x: -0.52, c: 0xc5a16b, label: 'رسوبية' },
      { x: 0.52, c: 0x8c6e9d, label: 'متحولة' },
      { x: 1.55, c: 0x647d64, label: 'صهارة' }
    ];
    rocks.forEach((r, i) => {
      const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.58, 1), material(r.c));
      mesh.position.set(r.x, 0.18, 0);
      mesh.rotation.set(0.2 + i * 0.15, i * 0.55, 0.15);
      mesh.scale.set(1.05, 0.8 + (i % 2) * 0.25, 0.9);
      root.add(mesh);
    });
    root.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1.0, -0.65, 0), 0.62, 0x67e8f9, 0.18, 0.12));
    root.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0.95, -0.65, 0), 0.62, 0x67e8f9, 0.18, 0.12));
  } else if (key === 'fossils') {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 180; i++) {
      const t = i / 179 * Math.PI * 5.5;
      const r = 0.08 + i / 179 * 0.9;
      pts.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, 0.08 * Math.sin(t * 2)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const shell = new THREE.Mesh(new THREE.TubeGeometry(curve, 220, 0.075, 8, false), material(0xd8b98b));
    root.add(shell);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), material(0x9b8061));
    body.position.set(0.95, -0.08, 0);
    body.scale.set(1.2, 0.7, 0.65);
    root.add(body);
    for (let i = 0; i < 8; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.18 + i * 0.055, 0.018, 6, 32), material(0xe8cda4));
      rib.position.set(-0.08, 0, 0.12 + i * 0.012);
      rib.scale.set(1, 0.85, 0.55);
      root.add(rib);
    }
  } else {
    const crystalA = new THREE.Mesh(new THREE.OctahedronGeometry(0.88, 0), material(0x7dd3fc, 0.22, 0.25, 0.88));
    crystalA.position.set(-0.9, 0.05, 0);
    crystalA.scale.set(0.8, 1.35, 0.8);
    const crystalB = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), material(0xe5c07b, 0.34, 0.15));
    crystalB.position.set(0.82, -0.1, 0);
    crystalB.rotation.set(0.25, 0.45, 0.15);
    const crystalC = new THREE.Mesh(new THREE.DodecahedronGeometry(0.56, 0), material(0x9f8ad4, 0.28, 0.18));
    crystalC.position.set(0, -0.75, 0.55);
    root.add(crystalA, crystalB, crystalC);
  }
  return root;
}

export const GeologyLab: React.FC = () => {
  const host = useRef<HTMLDivElement>(null);
  const [model, setModel] = useState<ModelKey>('earth');
  const [dragging, setDragging] = useState(false);
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
    el.appendChild(renderer.domElement);
    const ambient = new THREE.AmbientLight(0xffffff, 1.65);
    const keyLight = new THREE.DirectionalLight(0xffe4bd, 2.4);
    keyLight.position.set(4, 5, 6);
    const rimLight = new THREE.PointLight(0x38bdf8, 26, 12);
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
  }, [model]);

  const resetView = () => setModel(current => current);
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
