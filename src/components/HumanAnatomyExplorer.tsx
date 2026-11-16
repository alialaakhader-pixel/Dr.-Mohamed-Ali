import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Activity, Bone, Eye, EyeOff, RotateCcw, Search, ZoomIn, ZoomOut } from 'lucide-react';

type Sex = 'male' | 'female';
type SystemKey = 'skin' | 'skeleton' | 'muscles' | 'organs' | 'vessels' | 'nerves' | 'joints';
type AnatomyItem = { key:string; label:string; system:SystemKey; category:string; color?:string; sex?:Sex; anchor?:number[]; anchorFemale?:number[] };
type LayerState = Record<SystemKey, boolean>;

const MODEL_URL:Record<Sex,string> = {
 male:'https://cdn.jsdelivr.net/npm/open-anatomy-3d@0.1.0/models/anatomy-male.glb',
 female:'https://cdn.jsdelivr.net/npm/open-anatomy-3d@0.1.0/models/anatomy-female.glb'
};
const SYSTEMS:{key:SystemKey;label:string;short:string}[]=[
 {key:'skin',label:'الجلد والسطح الخارجي',short:'الجلد'},
 {key:'skeleton',label:'الهيكل العظمي',short:'العظام'},
 {key:'muscles',label:'الجهاز العضلي',short:'العضلات'},
 {key:'organs',label:'الأعضاء الداخلية',short:'الأعضاء'},
 {key:'vessels',label:'الأوعية الدموية',short:'الأوعية'},
 {key:'nerves',label:'الجهاز العصبي',short:'الأعصاب'},
 {key:'joints',label:'المفاصل',short:'المفاصل'}
];
const DEFAULT_LAYERS:LayerState={skin:false,skeleton:true,muscles:false,organs:true,vessels:false,nerves:false,joints:false};
const AR_NAMES:Record<string,string>={
 ankle_l:'مفصل الكاحل الأيسر',ankle_r:'مفصل الكاحل الأيمن',elbow_l:'مفصل المرفق الأيسر',elbow_r:'مفصل المرفق الأيمن',hip_l:'مفصل الورك الأيسر',hip_r:'مفصل الورك الأيمن',knee_l:'مفصل الركبة الأيسر',knee_r:'مفصل الركبة الأيمن',shoulder_l:'مفصل الكتف الأيسر',shoulder_r:'مفصل الكتف الأيمن',wrist_l:'مفصل الرسغ الأيسر',wrist_r:'مفصل الرسغ الأيمن',
 abdominal_muscles:'عضلات جدار البطن',back_muscles_l:'عضلات الظهر اليسرى',back_muscles_r:'عضلات الظهر اليمنى',calf_l:'عضلات بطة الساق اليسرى',calf_r:'عضلات بطة الساق اليمنى',chest_muscles_l:'العضلة الصدرية اليسرى',chest_muscles_r:'العضلة الصدرية اليمنى',deltoid_l:'العضلة الدالية اليسرى',deltoid_r:'العضلة الدالية اليمنى',diaphragm:'الحجاب الحاجز',foot_muscles_l:'عضلات القدم اليسرى',foot_muscles_r:'عضلات القدم اليمنى',forearm_muscles_l:'عضلات الساعد الأيسر',forearm_muscles_r:'عضلات الساعد الأيمن',gluteal_l:'عضلات الألية اليسرى',gluteal_r:'عضلات الألية اليمنى',hamstrings_l:'عضلات خلف الفخذ الأيسر',hamstrings_r:'عضلات خلف الفخذ الأيمن',hand_muscles_l:'عضلات اليد اليسرى',hand_muscles_r:'عضلات اليد اليمنى',iliopsoas_l:'العضلة الحرقفية القطنية اليسرى',iliopsoas_r:'العضلة الحرقفية القطنية اليمنى',adductors_l:'العضلات المقربة اليسرى',adductors_r:'العضلات المقربة اليمنى',intercostals_l:'العضلات الوربية اليسرى',intercostals_r:'العضلات الوربية اليمنى',neck_muscles_l:'عضلات الرقبة اليسرى',neck_muscles_r:'عضلات الرقبة اليمنى',pelvic_floor:'عضلات قاع الحوض',quadriceps_l:'العضلة رباعية الرؤوس اليسرى',quadriceps_r:'العضلة رباعية الرؤوس اليمنى',rotator_cuff_l:'الكفة المدورة اليسرى',rotator_cuff_r:'الكفة المدورة اليمنى',shin_muscles_l:'عضلات مقدمة الساق اليسرى',shin_muscles_r:'عضلات مقدمة الساق اليمنى',shoulder_muscles_l:'عضلات حزام الكتف الأيسر',shoulder_muscles_r:'عضلات حزام الكتف الأيمن',trapezius_l:'العضلة شبه المنحرفة اليسرى',trapezius_r:'العضلة شبه المنحرفة اليمنى',upper_arm_muscles_l:'عضلات العضد الأيسر',upper_arm_muscles_r:'عضلات العضد الأيمن',
 cranial_nerves:'الأعصاب القحفية وأعصاب العين',spinal_cord:'الحبل الشوكي',
 adrenal_l:'الغدة الكظرية اليسرى',adrenal_r:'الغدة الكظرية اليمنى',appendix:'الزائدة الدودية',brain:'المخ',brainstem:'جذع الدماغ',breast_l:'الثدي الأيسر',breast_r:'الثدي الأيمن',bronchi:'الشعب الهوائية',cerebellum:'المخيخ',esophagus:'المريء',eye_l:'العين اليسرى',eye_r:'العين اليمنى',fallopian_tubes:'قناتا فالوب',gallbladder:'المرارة والقنوات الصفراوية',heart:'القلب',kidney_l:'الكلية اليسرى',kidney_r:'الكلية اليمنى',colon:'الأمعاء الغليظة',larynx:'الحنجرة',liver:'الكبد',lung_l:'الرئة اليسرى',lung_r:'الرئة اليمنى',reproductive:'الأعضاء التناسلية الذكرية',ovary_l:'المبيض الأيسر',ovary_r:'المبيض الأيمن',pancreas:'البنكرياس',pharynx:'البلعوم',pituitary:'الغدة النخامية',prostate:'غدة البروستاتا',salivary_glands:'الغدد اللعابية',small_intestine:'الأمعاء الدقيقة',spleen:'الطحال',stomach:'المعدة',thymus:'الغدة الزعترية',tongue:'اللسان',trachea:'القصبة الهوائية',ureter_l:'الحالب الأيسر',ureter_r:'الحالب الأيمن',bladder:'المثانة البولية',uterus:'الرحم',vagina:'القناة المهبلية',
 spine_cervical:'الفقرات العنقية',clavicle_l:'الترقوة اليسرى',clavicle_r:'الترقوة اليمنى',foot_l:'عظام القدم اليسرى',foot_r:'عظام القدم اليمنى',forearm_l:'عظام الساعد الأيسر',forearm_r:'عظام الساعد الأيمن',hand_l:'عظام اليد اليسرى',hand_r:'عظام اليد اليمنى',mandible:'عظم الفك السفلي',patella_l:'صابونة الركبة اليسرى',patella_r:'صابونة الركبة اليمنى',spine_lumbar:'الفقرات القطنية',pelvis:'الحوض والعجز',ribs_l:'الأضلاع اليسرى',ribs_r:'الأضلاع اليمنى',lower_leg_l:'عظام الساق اليسرى',lower_leg_r:'عظام الساق اليمنى',scapula_l:'لوح الكتف الأيسر',scapula_r:'لوح الكتف الأيمن',skull:'الجمجمة',sternum:'عظم القص',teeth:'الأسنان واللثة',femur_l:'عظم الفخذ الأيسر',femur_r:'عظم الفخذ الأيمن',spine_thoracic:'الفقرات الصدرية',humerus_l:'عظم العضد الأيسر',humerus_r:'عظم العضد الأيمن',skin:'الجلد',
 aorta:'الشريان الأورطي',arteries_abdomen:'شرايين البطن',arteries_thorax:'شرايين الصدر',arteries_head:'شرايين الرأس والرقبة',arteries_arm_l:'شرايين الذراع الأيسر',arteries_leg_l:'شرايين الساق اليسرى',arteries_pelvis:'شرايين الحوض',arteries_arm_r:'شرايين الذراع الأيمن',arteries_leg_r:'شرايين الساق اليمنى',carotid_l:'الشريان السباتي الأيسر',carotid_r:'الشريان السباتي الأيمن',coronary_arteries:'الشرايين التاجية',vena_cava_inferior:'الوريد الأجوف السفلي',pulmonary_vessels:'الأوعية الدموية الرئوية',vena_cava_superior:'الوريد الأجوف العلوي',veins_abdomen:'أوردة البطن',veins_thorax:'أوردة الصدر',veins_arm_l:'أوردة الذراع الأيسر',veins_leg_l:'أوردة الساق اليسرى',veins_pelvis:'أوردة الحوض',veins_arm_r:'أوردة الذراع الأيمن',veins_leg_r:'أوردة الساق اليمنى'
};
const ROLE:Record<string,string>={
 heart:'عضو عضلي أجوف يضخ الدم عبر الدورة الدموية الرئوية والجهازية.',brain:'مركز التحكم الرئيس؛ يستقبل المعلومات ويعالجها وينسق وظائف الجسم.',lungs:'تحدث في الحويصلات الهوائية عملية تبادل الأكسجين وثاني أكسيد الكربون.',liver:'يعالج المغذيات، وينتج العصارة الصفراوية، ويسهم في تنظيم مستوى الجلوكوز وإزالة بعض السموم.',stomach:'يخلط الطعام بالعصارة المعدية ويبدأ الهضم الكيميائي للبروتينات.',small_intestine:'يكتمل فيها معظم الهضم ويحدث معظم امتصاص المغذيات.',colon:'يمتص الماء والأملاح ويساعد في تكوين البراز.',kidney_l:'ترشح الدم وتساهم في تنظيم الماء والأملاح وتكوين البول.',kidney_r:'ترشح الدم وتساهم في تنظيم الماء والأملاح وتكوين البول.',bladder:'تخزن البول مؤقتًا قبل خروجه من الجسم.',trachea:'تنقل الهواء إلى الشعب الهوائية وتدعمها حلقات غضروفية.',uterus:'عضو عضلي أجوف، وتستقبل بطانته البويضة المخصبة في حالة حدوث الإخصاب.',ovary_l:'ينتج البويضات ويفرز هرمونات منها الإستروجين والبروجستيرون.',ovary_r:'ينتج البويضات ويفرز هرمونات منها الإستروجين والبروجستيرون.',reproductive:'مجموعة أعضاء تشريحية مرتبطة بالتكاثر وإنتاج الأمشاج والهرمونات.',prostate:'غدة تساهم إفرازاتها في تكوين السائل المنوي.',aorta:'أكبر شريان في الجسم، ينقل الدم من البطين الأيسر إلى شرايين الجسم.',spinal_cord:'ينقل السيالات العصبية بين الدماغ وأجزاء الجسم ويشارك في الأفعال المنعكسة.',skin:'يغطي الجسم ويحميه ويسهم في الإحساس وتنظيم درجة الحرارة.'
};
const systemName=(s:SystemKey)=>SYSTEMS.find(x=>x.key===s)?.label??s;
const itemName=(p:AnatomyItem)=>AR_NAMES[p.key]||p.label;
const sideLabel=(key:string)=>key.endsWith('_l')?'الجانب الأيسر':key.endsWith('_r')?'الجانب الأيمن':'';
const describe=(p:AnatomyItem)=>ROLE[p.key]||(
 p.system==='skeleton'?'جزء من الهيكل العظمي يدعم الجسم ويحمي الأعضاء ويسهم في الحركة بالتعاون مع العضلات.':
 p.system==='muscles'?'عضلة أو مجموعة عضلية تساهم في حركة الجسم أو تثبيت المفاصل أو دعم الأعضاء.':
 p.system==='vessels'?'جزء من شبكة الأوعية الدموية التي تنقل الدم بين القلب وأنسجة الجسم.':
 p.system==='nerves'?'جزء من الجهاز العصبي ينقل الإشارات العصبية ويساعد على استقبال المعلومات وتنسيق الاستجابات.':
 p.system==='joints'?'منطقة اتصال بين العظام تسمح بدرجات مختلفة من الحركة وتساعد على ثبات الهيكل العظمي.':
 'تركيب تشريحي ضمن '+systemName(p.system)+'؛ اختره في النموذج لمشاهدة موضعه وعلاقته بباقي التراكيب.'
);

export const HumanAnatomyExplorer:React.FC=()=>{
 const host=useRef<HTMLDivElement>(null),rootRef=useRef<THREE.Group|null>(null),selectedRef=useRef('heart'),layersRef=useRef<LayerState>(DEFAULT_LAYERS),onSelectRef=useRef<(key:string)=>void>(()=>{});
 const [sex,setSex]=useState<Sex>('male'),[items,setItems]=useState<AnatomyItem[]>([]),[selected,setSelected]=useState('heart'),[system,setSystem]=useState<SystemKey|'all'>('all'),[layers,setLayers]=useState<LayerState>(DEFAULT_LAYERS),[query,setQuery]=useState(''),[zoom,setZoom]=useState(1),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{selectedRef.current=selected;},[selected]);useEffect(()=>{layersRef.current=layers;},[layers]);useEffect(()=>{onSelectRef.current=setSelected;},[]);
 useEffect(()=>{
  let disposed=false,renderer:THREE.WebGLRenderer|undefined,controls:OrbitControls|undefined,frame=0,resizeObserver:ResizeObserver|undefined;
  const el=host.current;if(!el)return;
  setLoading(true);setError('');
  const scene=new THREE.Scene();scene.background=new THREE.Color('#071a20');
  const camera=new THREE.PerspectiveCamera(38,1,.01,100);camera.position.set(0,0,3.6);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));renderer.setSize(el.clientWidth,el.clientHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;el.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xe8f8ff,0x25313c,2.1));
  const keyLight=new THREE.DirectionalLight(0xffffff,3.1);keyLight.position.set(3,5,6);scene.add(keyLight);
  const rimLight=new THREE.DirectionalLight(0x48c9c1,1.8);rimLight.position.set(-4,1,-4);scene.add(rimLight);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.target.set(0,0,0);controls.minDistance=1.15;controls.maxDistance=7;controls.enablePan=true;
  const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
  Promise.all([
   fetch('/anatomy/catalog.json').then(r=>{if(!r.ok)throw new Error('تعذر تحميل دليل الأعضاء');return r.json();}),
   loader.loadAsync(MODEL_URL[sex])
  ]).then(([catalog,gltf])=>{
   if(disposed)return;
   const model=gltf.scene as THREE.Group;model.name='anatomy-model';model.updateMatrixWorld(true);
   const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
   model.position.sub(center);scene.add(model);rootRef.current=model;
   const fitDistance=Math.max(size.y*1.85,2.7);camera.position.set(0,0,fitDistance);controls!.target.set(0,0,0);controls!.update();
   const normalized=(catalog as AnatomyItem[]).filter(p=>!p.sex||p.sex===sex);
   setItems(normalized);
   const validKeys=new Set(normalized.map(p=>p.key));
   model.traverse(obj=>{
    const entry=normalized.find(p=>p.key===obj.name);
    if(entry){
     obj.userData.structureKey=entry.key;
     obj.traverse(child=>{child.userData.structureKey=entry.key;});
    }
    if(obj instanceof THREE.Mesh){
     const mats=Array.isArray(obj.material)?obj.material:[obj.material];
     mats.forEach((mat:any)=>{mat.userData.baseEmissive=mat.emissive?.getHex?.()??0;if(obj.userData.structureKey==='skin'){mat.transparent=true;mat.opacity=.22;mat.depthWrite=false;}});
    }
   });
   for(const s of SYSTEMS){const group=model.getObjectByName(s.key);if(group)group.visible=layersRef.current[s.key];}
   model.traverse(obj=>{if(obj instanceof THREE.Mesh&&obj.userData.structureKey&&!validKeys.has(obj.userData.structureKey))obj.visible=false;});
   setSelected(validKeys.has('heart')?'heart':normalized[0]?.key||'');
   setLoading(false);
  }).catch(err=>{if(!disposed){setLoading(false);setError('لم نتمكن من تحميل المجسم التشريحي. تحقق من الاتصال ثم أعد المحاولة.');console.error(err);}});
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const click=(event:PointerEvent)=>{if(!rootRef.current)return;const rect=renderer!.domElement.getBoundingClientRect();pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObject(rootRef.current,true);for(const hit of hits){let obj:THREE.Object3D|null=hit.object;while(obj&&obj!==rootRef.current&&!obj.userData.structureKey)obj=obj.parent;if(obj?.userData.structureKey){const key=String(obj.userData.structureKey);if(key!=='skin')onSelectRef.current(key);return;}}};
  renderer.domElement.addEventListener('click',click);
  const resize=()=>{if(!renderer)return;camera.aspect=el.clientWidth/Math.max(1,el.clientHeight);camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);};resizeObserver=new ResizeObserver(resize);resizeObserver.observe(el);
  const animate=()=>{frame=requestAnimationFrame(animate);if(rootRef.current){rootRef.current.traverse(obj=>{if(!(obj instanceof THREE.Mesh)||!obj.userData.structureKey)return;const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach((mat:any)=>{if(mat.emissive){const active=obj.userData.structureKey===selectedRef.current;mat.emissive.setHex(active?0x145d59:(mat.userData.baseEmissive||0));}});});}controls?.update();renderer?.render(scene,camera);};animate();
  return()=>{disposed=true;cancelAnimationFrame(frame);resizeObserver?.disconnect();renderer?.domElement.removeEventListener('click',click);controls?.dispose();if(rootRef.current){rootRef.current.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach((m:any)=>m.dispose());}});rootRef.current=null;}renderer?.dispose();if(renderer?.domElement.parentElement===el)el.removeChild(renderer.domElement);};
 },[sex]);
 useEffect(()=>{const root=rootRef.current;if(!root)return;for(const s of SYSTEMS){const group=root.getObjectByName(s.key);if(group)group.visible=layers[s.key];}},[layers,sex,loading]);
 const visibleItems=useMemo(()=>items.filter(p=>(system==='all'||p.system===system)&&itemName(p).toLowerCase().includes(query.toLowerCase())),[items,system,query]);
 const active=items.find(p=>p.key===selected);
 const toggleLayer=(key:SystemKey)=>setLayers(prev=>({...prev,[key]:!prev[key]}));
 const setPreset=(preset:'all'|'inside'|'outside'|'bones')=>{
  if(preset==='all')setLayers({skin:true,skeleton:true,muscles:true,organs:true,vessels:true,nerves:true,joints:true});
  if(preset==='inside')setLayers({skin:false,skeleton:false,muscles:false,organs:true,vessels:true,nerves:true,joints:false});
  if(preset==='outside')setLayers({skin:true,skeleton:false,muscles:false,organs:false,vessels:false,nerves:false,joints:false});
  if(preset==='bones')setLayers({skin:false,skeleton:true,muscles:false,organs:false,vessels:false,nerves:false,joints:true});
 };
 const zoomBy=(factor:number)=>{const root=rootRef.current;if(!root)return;setZoom(z=>Math.max(.7,Math.min(1.8,z*factor)));};
 useEffect(()=>{const root=rootRef.current;if(!root)return;},[zoom]);
 return <section dir="rtl" className="rounded-[2rem] border border-cyan-400/20 bg-slate-950/95 p-4 sm:p-6 space-y-5 shadow-2xl">
  <header className="flex flex-col md:flex-row md:items-end justify-between gap-3"><div><div className="inline-flex items-center gap-2 text-cyan-300 text-xs font-bold mb-2"><Activity className="w-4 h-4"/> أطلس تشريحي ثلاثي الأبعاد</div><h2 className="text-2xl sm:text-3xl font-black text-white">جسم الإنسان الحقيقي — طبقة بطبقة</h2><p className="text-sm text-slate-400 mt-2">نماذج تشريحية مفصلة؛ اختر تركيبًا من القائمة أو اضغط عليه في المجسم.</p></div><span className="text-xs text-emerald-200 border border-emerald-400/20 rounded-full px-3 py-2">147 تركيبًا تشريحيًا في الفهرس</span></header>
  <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-slate-400">النموذج:</span><button onClick={()=>{setSex('male');setSelected('heart');}} className={`rounded-xl px-4 py-2 text-sm font-bold border ${sex==='male'?'bg-cyan-400 text-slate-950 border-cyan-300':'bg-slate-900 text-slate-200 border-slate-700'}`}>ذكري</button><button onClick={()=>{setSex('female');setSelected('heart');}} className={`rounded-xl px-4 py-2 text-sm font-bold border ${sex==='female'?'bg-pink-300 text-slate-950 border-pink-200':'bg-slate-900 text-slate-200 border-slate-700'}`}>أنثوي</button></div>
  <div className="flex flex-wrap gap-2"><button onClick={()=>setPreset('all')} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white">عرض كل الطبقات</button><button onClick={()=>setPreset('inside')} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white">الأعضاء الداخلية</button><button onClick={()=>setPreset('outside')} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white">السطح الخارجي</button><button onClick={()=>setPreset('bones')} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white">الهيكل العظمي</button></div>
  <div className="grid lg:grid-cols-[1.3fr_.8fr] gap-4">
   <div className="relative overflow-hidden rounded-3xl border border-slate-700 bg-[#071a20]"><div ref={host} className="h-[470px] sm:h-[620px] w-full touch-none cursor-grab active:cursor-grabbing"/>
    {loading&&<div className="absolute inset-0 grid place-items-center bg-slate-950/80 text-center p-6"><div><div className="mx-auto mb-3 h-9 w-9 rounded-full border-2 border-cyan-300/30 border-t-cyan-300 animate-spin"/><p className="text-sm font-bold text-white">جارٍ تحميل النموذج التشريحي عالي التفاصيل…</p><p className="text-xs text-slate-400 mt-2">قد يستغرق التحميل الأول لحظات بسبب حجم المجسم.</p></div></div>}
    {error&&<div className="absolute inset-0 grid place-items-center bg-slate-950/90 p-6 text-center"><div><p className="text-sm text-rose-200 mb-3">{error}</p><button onClick={()=>setSex(s=>s==='male'?'female':'male')} className="rounded-xl bg-cyan-400 text-slate-950 px-4 py-2 text-sm font-bold">إعادة المحاولة</button></div></div>}
    <div className="absolute top-3 right-3 flex flex-wrap gap-2"><button onClick={()=>toggleLayer('skin')} className="rounded-lg border border-slate-600 bg-slate-950/90 px-3 py-2 text-xs font-bold text-white"><Eye className="inline w-4 h-4 ml-1"/>الجلد</button><button onClick={()=>toggleLayer('skeleton')} className="rounded-lg border border-slate-600 bg-slate-950/90 px-3 py-2 text-xs font-bold text-white"><Bone className="inline w-4 h-4 ml-1"/>العظام</button></div>
    <div className="absolute bottom-3 left-3 flex gap-2"><button onClick={()=>zoomBy(1.12)} className="p-2 rounded-lg bg-slate-900/95 border border-slate-700 text-white" aria-label="تكبير"><ZoomIn className="w-4 h-4"/></button><button onClick={()=>zoomBy(.89)} className="p-2 rounded-lg bg-slate-900/95 border border-slate-700 text-white" aria-label="تصغير"><ZoomOut className="w-4 h-4"/></button><button onClick={()=>{setZoom(1);const root=rootRef.current;if(root){root.rotation.set(0,0,0);}}} className="p-2 rounded-lg bg-slate-900/95 border border-slate-700 text-white" aria-label="إعادة ضبط"><RotateCcw className="w-4 h-4"/></button></div><div className="absolute bottom-3 right-3 rounded-lg bg-slate-950/85 px-3 py-2 text-[11px] text-cyan-100">اسحب للتدوير · اضغط على أي تركيب لتحديده</div>
   </div>
   <aside className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4 space-y-4">
    <div><h3 className="text-sm font-black text-white mb-3">طبقات الجسم</h3><div className="grid grid-cols-2 gap-2">{SYSTEMS.filter(s=>s.key!=='joints').map(s=><button key={s.key} onClick={()=>toggleLayer(s.key)} className={`rounded-xl border p-2 text-xs font-bold text-right ${layers[s.key]?'border-cyan-300/60 bg-cyan-400/10 text-cyan-100':'border-slate-700 bg-slate-950 text-slate-400'}`}>{layers[s.key]?<Eye className="inline w-3.5 h-3.5 ml-1"/>:<EyeOff className="inline w-3.5 h-3.5 ml-1"/>}{s.short}</button>)}</div></div>
    <div><label className="block text-xs text-slate-400 mb-2">ابحث عن عضو أو عظمة أو عضلة</label><div className="relative"><Search className="absolute right-3 top-3 w-4 h-4 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="اكتب اسم التركيب..." className="w-full rounded-xl bg-slate-950 border border-slate-700 py-2.5 pr-9 pl-3 text-sm text-white outline-none focus:border-cyan-400"/></div></div>
    <div className="flex flex-wrap gap-1.5">{([{key:'all',label:'الكل'},...SYSTEMS.map(s=>({key:s.key,label:s.short}))] as {key:string;label:string}[]).map(s=><button key={s.key} onClick={()=>setSystem(s.key as SystemKey|'all')} className={`rounded-lg px-2 py-1.5 text-[11px] border ${system===s.key?'bg-emerald-400 text-slate-950 border-emerald-300':'bg-slate-950 text-slate-300 border-slate-700'}`}>{s.label}</button>)}</div>
    <div className="max-h-[230px] overflow-y-auto space-y-1.5 pr-1">{visibleItems.map(p=><button key={p.key} onClick={()=>setSelected(p.key)} className={`w-full text-right rounded-xl border p-2.5 transition ${selected===p.key?'border-cyan-300 bg-cyan-400/10':'border-slate-700 bg-slate-950/70 hover:border-slate-500'}`}><span className="block text-xs font-bold text-white">{itemName(p)}</span><span className="block text-[10px] text-slate-400 mt-1">{systemName(p.system)}</span></button>)}</div>
    {active&&<div className="border-t border-slate-700 pt-3"><p className="text-[11px] text-cyan-300 font-bold mb-1">التركيب المحدد</p><h3 className="text-lg font-black text-white">{itemName(active)}</h3><p className="text-xs text-slate-400 mt-1">{systemName(active.system)} {sideLabel(active.key)}</p><p className="text-sm text-slate-300 leading-7 mt-2">{describe(active)}</p></div>}
   </aside>
  </div>
  <p className="text-[11px] text-slate-400 leading-6">المجسمات مستمدة من مجموعات بيانات تشريحية مفتوحة ومرخصة للاستخدام، وهي لأغراض التعليم والتصور العلمي فقط وليست أداة تشخيص طبي. بعض المفاصل تظهر كنقاط تحديد تعليمية وليست أسطحًا تشريحية مستقلة.</p>
  <details className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><summary className="cursor-pointer text-xs font-bold text-slate-300">مصادر النماذج والترخيص</summary><p className="text-[11px] leading-6 text-slate-400 mt-2">Anatomy: BodyParts3D © The Database Center for Life Science (CC BY 4.0); female organs: Human Reference Atlas 3D Reference Organs, HuBMAP (CC BY 4.0); female body: MakeHuman (CC0). Modified by open-anatomy-3d. <a className="text-cyan-300 underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a> · <a className="text-cyan-300 underline" href="https://github.com/MervinR07/open-anatomy-3d" target="_blank" rel="noreferrer">المصدر الأصلي والتفاصيل</a></p></details>
 </section>;
};
