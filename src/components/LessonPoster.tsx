import React, { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Palette, RefreshCw } from 'lucide-react';
import { Ctx, DISPLAY, FONT, GRADE_LABEL, H, W, bolt, display, ensureFonts, extruded, fitText, glowSpot, loadPhoto, person, pill, rr } from './PlanPoster';

// ---------- topic detection ----------
export type TopicKind = 'circuit' | 'wave' | 'magnet' | 'heat' | 'mech' | 'modern' | 'general';
export const TOPIC_LABELS: Record<TopicKind, string> = {
  circuit: 'تركيب الخلية', wave: 'الوراثة', magnet: 'التكاثر', heat: 'أجهزة الجسم', mech: 'العمليات الحيوية', modern: 'الأحياء الجزيئية', general: 'عام'
};
const KEYWORDS: [TopicKind, RegExp][] = [
  ['circuit', /خلية|غشاء|سيتوبلازم|عضية|ميتوكندريا|ريبوسوم|جولجي|شبكة إندوبلازمية/],
  ['wave', /وراث|جين|كروموسوم|DNA|RNA|أليل|طفرة|مندل|هاردي|واينبرغ/],
  ['magnet', /تكاثر|إخصاب|جنين|انقسام|ميتوزي|ميوزي|زهرة|حبوب اللقاح/],
  ['heat', /جهاز|هضم|تنفس|دوران|إخراج|عصبي|هرمون|مناعة|دم|قلب/],
  ['modern', /جزيئ|بروتين|إنزيم|ATP|طاقة خلوية|تخليق|نسخ|ترجمة/],
  ['mech', /اتزان|اتزان داخلي|نقل|انتشار|أسموزية|بناء ضوئي|نتح|أيض|بيئة|جماعة حيوية/]
];
export function detectKind(title: string): TopicKind {
  for (const [k, re] of KEYWORDS) if (re.test(title)) return k;
  return 'general';
}
const DEFAULT_FORMULAS: Record<TopicKind, string[]> = {
  circuit: ['الغشاء البلازمي', 'النواة', 'الميتوكوندريا'],
  wave: ['DNA', 'الجين', 'الكروموسوم'],
  magnet: ['الانقسام الخلوي', 'الإخصاب', 'التكاثر'],
  heat: ['الجهاز الدوري', 'الجهاز العصبي', 'جهاز المناعة'],
  mech: ['الانتشار', 'النقل النشط', 'الاتزان الداخلي'],
  modern: ['البروتين', 'الإنزيم', 'ATP'],
  general: ['الخلية', 'الوراثة', 'العمليات الحيوية']
};

// ---------- palettes ----------
interface Pal { bg1: string; bg2: string; glow: string; accent: string; accent2: string; ink: string }
const PALS: Pal[] = [
  { bg1: '#050a24', bg2: '#0b1a52', glow: 'rgba(56,189,248,0.45)', accent: '#38bdf8', accent2: '#facc15', ink: '#031225' },
  { bg1: '#1a0638', bg2: '#4c1d95', glow: 'rgba(217,70,239,0.45)', accent: '#e879f9', accent2: '#fde047', ink: '#1a0638' },
  { bg1: '#2a0606', bg2: '#7f1d1d', glow: 'rgba(251,146,60,0.5)', accent: '#fb923c', accent2: '#fde68a', ink: '#2a0606' },
  { bg1: '#04201c', bg2: '#0f5c4d', glow: 'rgba(52,211,153,0.45)', accent: '#34d399', accent2: '#fde047', ink: '#04201c' },
  { bg1: '#0a0f2c', bg2: '#312e81', glow: 'rgba(129,140,248,0.5)', accent: '#818cf8', accent2: '#fb7185', ink: '#0a0f2c' },
  { bg1: '#1c1002', bg2: '#78350f', glow: 'rgba(251,191,36,0.5)', accent: '#fbbf24', accent2: '#ffffff', ink: '#1c1002' }
];
const KIND_PAL: Record<TopicKind, number> = { circuit: 0, wave: 1, magnet: 4, heat: 2, mech: 3, modern: 4, general: 5 };

// small deterministic random
const rnd = (seed: number) => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

// ---------- art ----------
function ambient(ctx: Ctx, kind: TopicKind, p: Pal, seed: number) {
  const r = rnd(seed + 7);
  ctx.save();
  // soft dot grid
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let y = 40; y < H; y += 60) for (let x = 30; x < W; x += 60) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill(); }
  // floating symbols
  const syms: Record<TopicKind, string[]> = {
    circuit: ['CELL', 'DNA', 'RNA', 'ATP', 'GENE', 'RNA'], wave: ['DNA', 'RNA', 'GENE', 'BASE', 'RNA', 'CELL'], magnet: ['MITOSIS', 'MEIOSIS', 'CELL', 'GENE', 'DNA', 'ZYGOTE'],
    heat: ['HEART', 'BLOOD', 'LUNG', 'CELL', 'HORMONE', 'BRAIN'], mech: ['OSMOSIS', 'ATP', 'ENZYME', 'CELL', 'DIFFUSION', 'HOMEOSTASIS'], modern: ['PROTEIN', 'ENZYME', 'ATP', 'DNA', 'RNA', 'GENE'], general: ['CELL', 'DNA', 'RNA', 'ATP', 'GENE', 'BIOLOGY']
  };
  ctx.font = `700 54px ${FONT}`;
  for (let i = 0; i < 14; i++) {
    ctx.save(); ctx.globalAlpha = 0.07 + r() * 0.1; ctx.fillStyle = p.accent;
    ctx.translate(r() * W, r() * H); ctx.rotate((r() - 0.5) * 0.7); ctx.font = `700 ${40 + r() * 60}px ${FONT}`;
    ctx.fillText(syms[kind][i % 6], 0, 0); ctx.restore();
  }
  ctx.restore();
}

function emblem(ctx: Ctx, kind: TopicKind, p: Pal, cx: number, cy: number, s: number, seed: number) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const glow = (c: string, b = 24) => { ctx.shadowColor = c; ctx.shadowBlur = b; };
  // One consistent cell illustration for all biology topics; not presented as a precise anatomical model.
  ctx.save(); ctx.shadowColor = p.accent; ctx.shadowBlur = 24; ctx.fillStyle = 'rgba(16,185,129,0.12)'; ctx.strokeStyle = p.accent; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.ellipse(0, 0, 190, 145, -0.12, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(56,189,248,0.25)'; ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(20, -4, 58, 48, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 0.4; const x = Math.cos(a) * (105 + (i%2)*18); const y = Math.sin(a) * (72 + (i%2)*12); ctx.fillStyle = 'rgba(251,191,36,0.28)'; ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 22, 11, a, 0, Math.PI*2); ctx.fill(); ctx.stroke(); }
  ctx.restore(); ctx.restore(); return;
  if (kind === 'circuit') {
    // PCB loop with battery, resistor, bulb
    ctx.strokeStyle = p.accent; ctx.lineWidth = 7; glow(p.accent);
    ctx.beginPath(); ctx.moveTo(-200, -120); ctx.lineTo(200, -120); ctx.lineTo(200, 120); ctx.lineTo(-200, 120); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#0b1230';
    ctx.fillRect(-18, -140, 36, 40); ctx.strokeRect(-18, -140, 36, 40);                           // resistor box
    ctx.beginPath(); ctx.moveTo(-60, -120); ctx.lineTo(-40, -150); ctx.lineTo(-20, -90); ctx.lineTo(0, -150); ctx.lineTo(20, -90); ctx.lineTo(40, -150); ctx.lineTo(60, -120); ctx.stroke();
    ctx.strokeStyle = p.accent2; glow(p.accent2);
    ctx.beginPath(); ctx.moveTo(-200, 120); ctx.moveTo(-30, 80); ctx.lineTo(-30, 160); ctx.moveTo(30, 100); ctx.lineTo(30, 140); ctx.stroke(); // battery
    ctx.beginPath(); ctx.arc(200, 0, 46, 0, Math.PI * 2); ctx.fillStyle = 'rgba(250,204,21,0.25)'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(172, 0); ctx.lineTo(228, 0); ctx.moveTo(200, -28); ctx.lineTo(200, 28); ctx.stroke();
    bolt(ctx, -10, -330, 160, p.accent2, seed);
  } else if (kind === 'wave') {
    // prism + split light
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 6; glow('#fff');
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(0, -170); ctx.lineTo(150, 110); ctx.lineTo(-150, 110); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-330, -10); ctx.lineTo(-60, 10); ctx.stroke();
    ['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#6366f1', '#a855f7'].forEach((c, i) => {
      ctx.strokeStyle = c; ctx.lineWidth = 7; glow(c, 14); ctx.beginPath(); ctx.moveTo(60, 30); ctx.lineTo(340, 20 + i * 24); ctx.stroke();
    });
  } else if (kind === 'magnet') {
    // bar magnet + field lines
    glow(p.accent, 22);
    for (let i = 1; i <= 4; i++) { ctx.strokeStyle = `rgba(255,255,255,${0.55 - i * 0.08})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 130 + i * 62, 40 + i * 52, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ef4444'; rr(ctx, -140, -40, 140, 80, 10); ctx.fill();
    ctx.fillStyle = '#2563eb'; rr(ctx, 0, -40, 140, 80, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `900 54px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('N', -70, 20); ctx.fillText('S', 70, 20);
  } else if (kind === 'heat') {
    glow('#fb923c', 30);
    const g = ctx.createLinearGradient(0, 180, 0, -180); g.addColorStop(0, '#dc2626'); g.addColorStop(1, '#fde047');
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(ctx, -34, -190, 68, 330, 34); ctx.fill();
    ctx.fillStyle = g; rr(ctx, -20, -30, 40, 170, 20); ctx.fill(); ctx.beginPath(); ctx.arc(0, 150, 52, 0, Math.PI * 2); ctx.fillStyle = '#dc2626'; ctx.fill();
    const r = rnd(seed); ctx.shadowBlur = 0;
    for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(-160 + r() * 320, -40 + r() * 240, 3 + r() * 7, 0, Math.PI * 2); ctx.fillStyle = `rgba(253,186,116,${0.3 + r() * 0.5})`; ctx.fill(); }
  } else if (kind === 'mech') {
    // projectile arc with ball trail + force arrows
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 4; ctx.setLineDash([14, 12]);
    ctx.beginPath(); ctx.moveTo(-300, 140); ctx.quadraticCurveTo(0, -300, 300, 140); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i <= 6; i++) { const t = i / 6; const x = -300 + 600 * t, y = (1 - t) * (1 - t) * 140 + 2 * (1 - t) * t * -300 + t * t * 140; ctx.beginPath(); ctx.arc(x, y, i === 3 ? 26 : 16, 0, Math.PI * 2); ctx.fillStyle = i === 3 ? p.accent2 : p.accent; glow(p.accent); ctx.fill(); }
    ctx.shadowBlur = 0; ctx.strokeStyle = p.accent2; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(0, 50); ctx.moveTo(-14, 30); ctx.lineTo(0, 54); ctx.lineTo(14, 30); ctx.stroke();
  } else if (kind === 'modern') {
    glow(p.accent, 20); ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate((i * Math.PI) / 3); ctx.strokeStyle = p.accent; ctx.beginPath(); ctx.ellipse(0, 0, 210, 72, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(210 * Math.cos(i * 2 + 1), 72 * Math.sin(i * 2 + 1), 13, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 46); g.addColorStop(0, '#fff'); g.addColorStop(1, p.accent2); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
  } else {
    glow(p.accent, 26); ctx.strokeStyle = p.accent; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = p.accent2; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ---------- layout helpers ----------
export interface LessonPosterOpts {
  title: string; subtitle?: string; grade: string | null; kind?: TopicKind | 'auto'; formulas?: string[]; autoFormulas?: boolean; when?: string; variant?: number;
}
export type LessonLayout = 'hero' | 'center' | 'banner';
export const LESSON_LAYOUTS: { id: LessonLayout; label: string }[] = [
  { id: 'hero', label: 'عنوان جانبي' }, { id: 'center', label: 'خلية في المنتصف' }, { id: 'banner', label: 'لافتة علوية' }
];

function wrapTitle(t: string, maxLines: number, perLine: number): string[] {
  const words = t.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > perLine && lines.length < maxLines - 1) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

function chips(ctx: Ctx, list: string[], cx: number, y: number, p: Pal, maxW: number, size = 30) {
  if (!list.length) return;
  ctx.font = `800 ${size}px ${FONT}`;
  const ws = list.map(f => ctx.measureText(f).width + 44);
  let rows: { f: string; w: number }[][] = [[]], cur = 0;
  list.forEach((f, i) => { if (cur + ws[i] > maxW && rows[rows.length - 1].length) { rows.push([]); cur = 0; } rows[rows.length - 1].push({ f, w: ws[i] }); cur += ws[i] + 12; });
  rows.forEach((row, ri) => {
    const total = row.reduce((a, c) => a + c.w + 12, -12);
    let x = cx - total / 2;
    row.forEach(c => {
      ctx.save(); rr(ctx, x, y + ri * 62, c.w, 50, 25); ctx.fillStyle = 'rgba(2,6,23,0.7)'; ctx.fill(); ctx.strokeStyle = p.accent; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = `800 ${size}px ${FONT}`; ctx.direction = 'ltr'; ctx.fillText(c.f, x + c.w / 2, y + ri * 62 + 36); ctx.direction = 'rtl';
      x += c.w + 12;
    });
  });
}

function drawHero(ctx: Ctx, o: Required<Pick<LessonPosterOpts, 'title'>> & LessonPosterOpts, kind: TopicKind, p: Pal, img: HTMLImageElement | null, formulas: string[]) {
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, p.bg1); bg.addColorStop(0.6, p.bg2); bg.addColorStop(1, p.bg1);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  glowSpot(ctx, 240, 1060, 760, p.glow); glowSpot(ctx, 860, 300, 520, p.glow);
  ambient(ctx, kind, p, 3);
  ctx.save(); ctx.globalAlpha = 0.5; emblem(ctx, kind, p, 800, 360, 0.95, 5); ctx.restore();
  person(ctx, img, 300, H, 1130);
  const lines = wrapTitle(o.title, 3, 11); const n = lines.length;
  const size = n === 1 ? 170 : n === 2 ? 150 : 120;
  ctx.fillStyle = p.accent2; ctx.font = `900 34px ${FONT}`; ctx.fillText(o.grade ? (GRADE_LABEL[o.grade] || o.grade) + ' · أحياء' : 'أحياء', 810, 130);
  lines.forEach((ln, i) => extruded(ctx, ln, 810, 270 + i * (size * 0.95), 440, size, '#ffffff', p.accent, 12, 44));
  let y = 270 + n * size * 0.95 + 10;
  if (o.subtitle) { ctx.font = `800 34px ${FONT}`; fitText(ctx, o.subtitle, 420, 34, 800, 22); const w = Math.min(ctx.measureText(o.subtitle).width + 60, 460); pill(ctx, 810 - w / 2, y, w, 64, 'rgba(2,6,23,0.82)', p.accent2); ctx.fillStyle = '#fff'; ctx.fillText(o.subtitle, 810, y + 44); y += 84; }
  chips(ctx, formulas, 810, Math.max(y + 20, 880), p, 440);
  if (o.when) { ctx.font = `900 34px ${FONT}`; const w = Math.min(ctx.measureText(o.when).width + 70, 440); pill(ctx, 810 - w / 2, 1080, w, 66, p.accent2); ctx.fillStyle = p.ink; ctx.fillText(o.when, 810, 1125); }
  ctx.save(); ctx.shadowColor = p.accent; ctx.shadowBlur = 28; pill(ctx, 600, 1190, 440, 90, p.accent); ctx.restore();
  ctx.fillStyle = p.ink; ctx.font = `900 38px ${FONT}`; ctx.fillText('شاهد الدرس على المنصة', 820, 1248);
  ctx.fillStyle = '#e2e8f0'; ctx.font = `900 30px ${FONT}`; ctx.fillText('الدكتور محمد علي', 830, 70);
}

function drawCenter(ctx: Ctx, o: LessonPosterOpts, kind: TopicKind, p: Pal, img: HTMLImageElement | null, formulas: string[]) {
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, p.bg1); bg.addColorStop(0.5, p.bg2); bg.addColorStop(1, p.bg1);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  glowSpot(ctx, W / 2, 430, 620, p.glow);
  ambient(ctx, kind, p, 9);
  emblem(ctx, kind, p, W / 2, 400, 1.3, 11);
  person(ctx, img, W / 2 + 6, 900, 820);
  const fd = ctx.createLinearGradient(0, 690, 0, 905); fd.addColorStop(0, 'rgba(0,0,0,0)'); fd.addColorStop(1, p.bg1);
  ctx.fillStyle = fd; ctx.fillRect(0, 690, W, 215); ctx.fillStyle = p.bg1; ctx.fillRect(0, 903, W, H - 903);
  glowSpot(ctx, W / 2, 1150, 520, p.glow);
  ctx.fillStyle = '#e2e8f0'; ctx.font = `800 30px ${FONT}`; ctx.fillText('د. محمد علي · أحياء' + (o.grade ? ' · ' + (GRADE_LABEL[o.grade] || o.grade) : ''), W / 2, 62);
  const lines = wrapTitle(o.title, 2, 22);
  lines.forEach((ln, i) => { display(ctx, ln, W / 2, 925 + i * 92, W - 160, 100, '#ffffff', { stroke: p.bg1, sw: 14, shadow: p.accent, blur: 34, min: 50 }); });
  let y = 925 + lines.length * 92 - 30;
  if (o.subtitle) { ctx.fillStyle = p.accent2; ctx.font = `800 32px ${FONT}`; fitText(ctx, o.subtitle, W - 200, 32, 800, 22); ctx.fillText(o.subtitle, W / 2, y + 30); y += 44; }
  chips(ctx, formulas, W / 2, y + 22, p, W - 120, 28);
  const by = 1272;
  pill(ctx, 200, by, W - 400, 62, p.accent); ctx.fillStyle = p.ink; ctx.font = `900 32px ${FONT}`; ctx.fillText(o.when ? o.when : 'شاهد الدرس على المنصة', W / 2, by + 43);
}

function drawBanner(ctx: Ctx, o: LessonPosterOpts, kind: TopicKind, p: Pal, img: HTMLImageElement | null, formulas: string[]) {
  const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, p.bg2); bg.addColorStop(1, p.bg1);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  glowSpot(ctx, W / 2, 800, 640, p.glow);
  ambient(ctx, kind, p, 21);
  // title banner
  const lines = wrapTitle(o.title, 2, 18);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; ctx.fillStyle = p.accent2; rr(ctx, 50, 50, W - 100, 90 + lines.length * 100, 36); ctx.fill(); ctx.restore();
  ctx.fillStyle = p.ink; ctx.font = `900 32px ${FONT}`; ctx.fillText(o.grade ? (GRADE_LABEL[o.grade] || o.grade) + ' · أحياء' : 'أحياء', W / 2, 105);
  lines.forEach((ln, i) => { display(ctx, ln, W / 2, 205 + i * 100, W - 180, 104, p.ink, { min: 48 }); });
  const by = 50 + 90 + lines.length * 100;
  emblem(ctx, kind, p, 190, by + 330, 0.62, 31); emblem(ctx, kind, p, W - 190, by + 520, 0.5, 33);
  person(ctx, img, W / 2 + 4, 1190, 860);
  // card
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 40; ctx.fillStyle = '#ffffff'; rr(ctx, 50, 1170, W - 100, 250, 60); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#1e1b4b'; ctx.font = `900 40px ${FONT}`; ctx.fillText('د. محمد علي', 250, 1245);
  ctx.fillStyle = p.bg2; ctx.font = `italic 700 34px Georgia, serif`; ctx.fillText('Biology', 250, 1292);
  pill(ctx, 410, 1215, 260, 76, p.accent); ctx.fillStyle = p.ink; ctx.font = `900 30px ${FONT}`; ctx.fillText(o.when ? o.when : 'شاهد الدرس', 540, 1264);
  ctx.fillStyle = '#334155'; ctx.font = `800 26px ${FONT}`;
  const f = formulas.slice(0, 2); f.forEach((t, i) => { ctx.direction = 'ltr'; ctx.fillText(t, 830, 1243 + i * 42); ctx.direction = 'rtl'; });
  if (o.subtitle) { ctx.fillStyle = '#64748b'; ctx.font = `700 22px ${FONT}`; fitText(ctx, o.subtitle, W - 160, 24, 700, 16); ctx.fillText(o.subtitle, W / 2, 1322); }
}

export async function renderLessonPoster(o: LessonPosterOpts, layout: LessonLayout): Promise<string> {
  await ensureFonts();
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!; ctx.direction = 'rtl'; ctx.textAlign = 'center';
  const img = await loadPhoto();
  const kind = !o.kind || o.kind === 'auto' ? detectKind(o.title) : o.kind;
  const pal = PALS[(KIND_PAL[kind] + (o.variant || 0)) % PALS.length];
  const custom = (o.formulas || []).map(s => s.trim()).filter(Boolean).slice(0, 3);
  const formulas = custom.length ? custom : o.autoFormulas === false ? [] : DEFAULT_FORMULAS[kind];
  const opts = { ...o, title: o.title.trim() || 'درس جديد' };
  if (layout === 'hero') drawHero(ctx, opts, kind, pal, img, formulas);
  else if (layout === 'center') drawCenter(ctx, opts, kind, pal, img, formulas);
  else drawBanner(ctx, opts, kind, pal, img, formulas);
  return c.toDataURL('image/jpeg', 0.92);
}

// ---------- teacher panel ----------
export const LessonPosterStudio: React.FC = () => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [grade, setGrade] = useState<string>('3ث');
  const [kind, setKind] = useState<TopicKind | 'auto'>('auto');
  const [formulas, setFormulas] = useState('');
  const [auto, setAuto] = useState(true);
  const [when, setWhen] = useState('');
  const [variant, setVariant] = useState(0);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const detected = useMemo(() => detectKind(title), [title]);

  const generate = async () => {
    if (title.trim().length < 2) return;
    setBusy(true);
    const o: LessonPosterOpts = { title, subtitle, grade: grade || null, kind, formulas: formulas.split('\n'), autoFormulas: auto, when, variant };
    const out: Record<string, string> = {};
    for (const l of LESSON_LAYOUTS) { try { out[l.id] = await renderLessonPoster(o, l.id); } catch { /* skip */ } }
    setUrls(out); setBusy(false);
  };
  // re-render when the palette variant changes after a first generation
  useEffect(() => { if (Object.keys(urls).length) generate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [variant]);

  const input = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500';
  const safe = (s: string) => s.trim().replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) || 'poster';
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5 text-white">
      <div>
        <h2 className="text-xl font-display font-black flex items-center gap-2"><Palette className="w-5 h-5 text-emerald-400" /> استوديو بوسترات الدروس</h2>
        <p className="text-xs text-slate-400 mt-1">اكتب اسم الدرس وهيتركّب بوستر تعليمي بهوية إحياء ورسمة خلوية توضيحية، مع 3 تخطيطات قابلة للتنزيل.</p>
      </div>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 sm:col-span-2"><span className="text-[11px] font-bold text-slate-400">اسم الدرس *</span>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={60} placeholder="مثال: تركيب الخلية النباتية والحيوانية" className={input} /></label>
        <label className="space-y-1"><span className="text-[11px] font-bold text-slate-400">سطر فرعي (اختياري)</span>
          <input value={subtitle} onChange={e => setSubtitle(e.target.value)} maxLength={60} placeholder="مثال: الباب الأول — تركيب الخلية" className={input} /></label>
        <label className="space-y-1"><span className="text-[11px] font-bold text-slate-400">الموعد أو الدعوة (اختياري)</span>
          <input value={when} onChange={e => setWhen(e.target.value)} maxLength={40} placeholder="مثال: الأحد 8 م · لايف" className={input} /></label>
        <label className="space-y-1"><span className="text-[11px] font-bold text-slate-400">الصف</span>
          <select value={grade} onChange={e => setGrade(e.target.value)} className={input}>
            <option value="1ث">الصف الأول الثانوي</option><option value="2ث">الصف الثاني الثانوي</option><option value="3ث">الصف الثالث الثانوي</option><option value="">بدون صف</option>
          </select></label>
        <label className="space-y-1"><span className="text-[11px] font-bold text-slate-400">نوع الرسمة {kind === 'auto' && title.trim().length > 1 ? `(تلقائي: ${TOPIC_LABELS[detected]})` : ''}</span>
          <select value={kind} onChange={e => setKind(e.target.value as TopicKind | 'auto')} className={input}>
            <option value="auto">تلقائي حسب اسم الدرس</option>
            {(Object.keys(TOPIC_LABELS) as TopicKind[]).map(k => <option key={k} value={k}>{TOPIC_LABELS[k]}</option>)}
          </select></label>
        <label className="space-y-1 sm:col-span-2"><span className="text-[11px] font-bold text-slate-400">المفاهيم اللي تظهر على البوستر (سطر لكل قانون، حد أقصى 3)</span>
          <textarea value={formulas} onChange={e => setFormulas(e.target.value)} rows={3} maxLength={160} dir="ltr" placeholder={'V = I R\nP = V I'} className={input + ' font-mono'} /></label>
        <label className="flex items-center gap-2 text-xs text-slate-300 sm:col-span-2">
          <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> لو سيبت المفاهيم فاضية، حط مفاهيم مناسبة للموضوع تلقائياً
        </label>
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          <button type="button" onClick={generate} disabled={busy || title.trim().length < 2}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm disabled:opacity-50">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> بركّب…</> : 'ركّب البوستر'}
          </button>
          {Object.keys(urls).length > 0 && (
            <button type="button" onClick={() => setVariant(v => v + 1)} disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm disabled:opacity-50">
              <RefreshCw className="w-4 h-4" /> ألوان مختلفة
            </button>
          )}
        </div>
      </div>
      {Object.keys(urls).length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {LESSON_LAYOUTS.map(l => urls[l.id] && (
            <div key={l.id} className="space-y-2">
              <img src={urls[l.id]} alt={`${title} — ${l.label}`} className="w-full rounded-2xl border border-slate-700 shadow-xl" />
              <a href={urls[l.id]} download={`${safe(title)}-${l.id}.jpg`} className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-emerald-300 font-bold text-xs hover:border-emerald-500/60">
                <Download className="w-3.5 h-3.5" /> تحميل: {l.label}
              </a>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-500">البوستر بيتركّب من صورتك الحقيقية داخل المتصفح، مش صورة مولّدة بالذكاء الاصطناعي.</p>
    </div>
  );
};
