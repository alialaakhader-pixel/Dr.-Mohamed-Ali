import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// AI tutor (text + photos of problems). Secrets (server side only): a Groq (gsk_...), xAI (xai-...) or OpenAI (sk-...) key;
// optional GROQ_MODEL / GROQ_VISION_MODEL / XAI_MODEL / OPENAI_MODEL. Student identity, subscription and rate limits are enforced by the
// ha_ai_gate2 RPC (code+device, or the email-account JWT). Photos are stored in the private bucket `ha-ai-images` (service role only).
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: cors });

// Provider is detected from the key itself (gsk_ = Groq, xai- = xAI Grok, sk- = OpenAI), not from the secret's name.
type Provider = { id: "groq" | "xai" | "openai"; key: string; url: string; models: string[]; vision: string[] };

const providers = (): Provider[] => {
  const found: Record<string, string> = {};
  let all: Record<string, string> = {};
  try { all = Deno.env.toObject(); } catch { /* ignore */ }
  for (const [name, raw] of Object.entries(all)) {
    const v = (raw || "").trim();
    if (!v || name.startsWith("SUPABASE_") || name.startsWith("SB_") || name === "DENO_DEPLOYMENT_ID") continue;
    if (v.startsWith("gsk_")) found.groq = v;
    else if (v.startsWith("xai-")) found.xai = v;
    else if (/^sk-[A-Za-z0-9_-]{20,}/.test(v)) found.openai = v;
  }
  const list: Provider[] = [];
  const m = (v: string | undefined, ...d: string[]) => [v, ...d].filter((x): x is string => !!x);
  if (found.groq) list.push({ id: "groq", key: found.groq, url: "https://api.groq.com/openai/v1/chat/completions",
    models: m(Deno.env.get("GROQ_MODEL"), "openai/gpt-oss-120b", "llama-3.3-70b-versatile"),
    vision: m(Deno.env.get("GROQ_VISION_MODEL"), "qwen/qwen3.8-27b", "meta-llama/llama-4-scout-17b-16e-instruct") });
  if (found.xai) list.push({ id: "xai", key: found.xai, url: "https://api.x.ai/v1/chat/completions",
    models: m(Deno.env.get("XAI_MODEL"), "grok-4", "grok-3"), vision: m(Deno.env.get("XAI_MODEL"), "grok-4") });
  if (found.openai) list.push({ id: "openai", key: found.openai, url: "https://api.openai.com/v1/chat/completions",
    models: m(Deno.env.get("OPENAI_MODEL"), "gpt-4o"), vision: m(Deno.env.get("OPENAI_MODEL"), "gpt-4o") });
  return list;
};


// Biology curriculum map per grade. Edit/extend this when the teacher confirms the official outline.
// Grade 3 outline below follows the Egyptian 3rd secondary biology book structure (unverified against the official book).
const CURRICULUM: Record<string, string> = {
  "3ث": `الوحدة الأولى: التركيب والوظيفة في الكائنات الحية
- الفصل الأول: الدعامة والحركة (دعامة الكائنات الحية، حركة الكائنات الحية)
- الفصل الثاني: التنسيق الهرموني (التنسيق الهرموني في الكائنات الحية، الغدد في الإنسان)
- الفصل الثالث: التكاثر (طرق التكاثر في الكائنات الحية، التكاثر في النباتات الزهرية، التكاثر في الإنسان)
- الفصل الرابع: المناعة (المناعة في النبات، المناعة في الإنسان، آلية عمل الجهاز المناعي)
الوحدة الثانية: البيولوجيا الجزيئية
- الفصل الخامس: الحمض النووي والمعلومات الوراثية (جهود العلماء لمعرفة المادة الوراثية، DNA، DNA في أوليات وحقيقيات النواة، تركيب المحتوى الجيني، الطفرات)
- الفصل السادس: الأحماض النووية وتخليق البروتين (RNA وتخليق البروتين، التكنولوجيا الجزيئية، الهندسة الوراثية)
الوحدة الثالثة: الأحياء وعلوم الأرض
- الفصل السابع: علم الجيولوجيا ومادة الأرض، مكونات كوكب الأرض، البراكين وصور القشرة الأرضية، الزمن الجيولوجي، أنواع الصخور ودورة الصخور`,
};

const GRADE_NAMES: Record<string, string> = {
  "1ث": "الصف الأول الثانوي",
  "2ث": "الصف الثاني الثانوي",
  "3ث": "الصف الثالث الثانوي (الثانوية العامة)",
};

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMG_RE = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function storeImage(code: string, idx: number, mime: string, b64: string): Promise<string | null> {
  if (!SUPABASE_URL || !SERVICE) return null;
  try {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ext = mime === "png" ? "png" : mime === "webp" ? "webp" : "jpg";
    const path = `${code.replace(/[^A-Za-z0-9_-]/g, "_")}/${Date.now()}-${idx}.${ext}`;
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/ha-ai-images/${path}`, {
      method: "POST",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": `image/${mime === "jpeg" ? "jpeg" : mime}`, "x-upsert": "false" },
      body: bytes,
    });
    return r.ok ? path : null;
  } catch { return null; }
}

async function logChat(code: string, question: string, answer: string, paths: string[]) {
  if (!SUPABASE_URL || !SERVICE) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/ha_ai_log_service`, {
      method: "POST",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_code: code, p_question: question, p_answer: answer, p_paths: paths }),
    });
  } catch { /* logging must never break the answer */ }
}

// ---------- study-tool modes (summary / hard idea / exam / cards / mind map / Feynman / recall) ----------
const MODES = ["chat", "summary", "hard", "exam", "cards", "mindmap", "feynman", "recall"] as const;
type Mode = typeof MODES[number];
const JSON_ONLY = "\n\nأعد الناتج JSON صالحاً فقط، بدون أي نص قبله أو بعده وبدون علامات ```. كل النصوص بالعربية المصرية المبسطة والمصطلحات والأسماء العلمية بالصيغة الصحيحة.";

function modeSpec(mode: Mode, count: number, level: string): { extra: string; json: boolean; maxTokens: number; temp: number } {
  const lv = level === "easy" ? "سهل" : level === "medium" ? "متوسط" : level === "hard" ? "صعب (أفكار ومسائل مركّبة)" : "متدرج من السهل إلى الصعب";
  switch (mode) {
    case "summary": return { json: false, maxTokens: 3500, temp: 0.25, extra: `

المهمة الآن: اكتب ملخصاً منظماً وسهل المراجعة للموضوع الذي يحدده الطالب، بهذا الترتيب وبعناوين واضحة:
1) الفكرة العامة في جملتين.
2) المفاهيم والعمليات الأساسية: اشرح المكونات والعلاقات والمراحل المهمة.
3) المفاهيم والتعريفات المهمة (نقاط قصيرة).
4) أخطاء ومفاهيم متداخلة شائعة يقع فيها الطلاب.
5) كيف يأتي هذا الجزء في الامتحان + نصائح.
6) سؤال تطبيقي نموذجي بإجابة مفسرة.
لا تذكر أرقام صفحات ولا تدّعِ نقلاً من الكتاب. فقرات قصيرة وقوائم.` };
    case "hard": return { json: false, maxTokens: 4000, temp: 0.3, extra: `

المهمة الآن: اشرح الفكرة الصعبة التي يحددها الطالب من الصفر وعلى مراحل متدرجة، بعناوين:
1) تشبيه بسيط من الحياة اليومية.
2) الشرح البيولوجي المبسط خطوة بخطوة.
3) العلاقة أو العملية الحيوية المرتبطة بالفكرة إن كانت مناسبة لمستوى الصف.
4) مثال تطبيقي من علم الأحياء.
5) ثلاثة مفاهيم شائعة قد يخلط بينها الطلاب وكيف تميزها.
6) "اختبر نفسك": سؤالان بإجابتيهما.
اشرح وكأن الطالب لا يعرف شيئاً عن الفكرة، ثم ارتقِ تدريجياً.` };
    case "exam": return { json: true, maxTokens: 7000, temp: 0.35, extra: `

المهمة الآن: ضع امتحاناً اختيار من متعدد من ${count} أسئلة عن الموضوع الذي يحدده الطالب، بمستوى: ${lv}، على نمط أسئلة الثانوية العامة المصرية.
شروط: كل سؤال له 4 اختيارات فقط، إجابة واحدة صحيحة، المموهات منطقية (أخطاء شائعة)، أرقام ووحدات صحيحة ومحسوبة بدقة، ولا تكرر الأفكار. ضع تفسيراً مختصراً للحل في explanation. وزّع موضع الإجابة الصحيحة عشوائياً.
الصيغة: {"title":"...","questions":[{"q":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]}` + JSON_ONLY };
    case "cards": return { json: true, maxTokens: 5000, temp: 0.3, extra: `

المهمة الآن: أنشئ ${count} بطاقة مراجعة (Flashcards) للموضوع الذي يحدده الطالب. كل بطاقة: front سؤال قصير أو مصطلح أو مفهوم أو مرحلة حيوية، و back إجابة موجزة ودقيقة (مع الوحدة إن وُجدت). نوّع بين تعريفات ومقارنات ومراحل عمليات حيوية وتطبيقات سريعة.
الصيغة: {"cards":[{"front":"...","back":"..."}]}` + JSON_ONLY };
    case "mindmap": return { json: true, maxTokens: 4000, temp: 0.3, extra: `

المهمة الآن: ارسم خريطة ذهنية للموضوع الذي يحدده الطالب: عقدة مركزية و4 إلى 7 فروع رئيسية، ولكل فرع من 2 إلى 5 نقاط قصيرة جداً (كلمات أو مفاهيم).
الصيغة: {"root":"...","branches":[{"title":"...","children":["...","..."]}]}` + JSON_ONLY };
    case "feynman": return { json: true, maxTokens: 4000, temp: 0.2, extra: `

المهمة الآن (أسلوب فاينمان): الطالب كتب شرحه الخاص لفكرة معيّنة. قيّم شرحه بصدق ودقة علمية بدون مجاملة زائدة: score من 0 إلى 100، good (ما أجاد فيه)، gaps (نقاط ناقصة)، mistakes (معلومات خاطئة مع التصحيح)، improved (نسخة محسّنة قصيرة بأسلوب بسيط يفهمه طفل في الإعدادي)، followUp (سؤال واحد يختبر فهمه أعمق).
الصيغة: {"score":0,"good":["..."],"gaps":["..."],"mistakes":["..."],"improved":"...","followUp":"..."}` + JSON_ONLY };
    case "recall": return { json: true, maxTokens: 4000, temp: 0.2, extra: `

المهمة الآن (الاسترجاع النشط): الطالب كتب من ذاكرته كل ما يتذكره عن الموضوع دون النظر في الكتاب. قارن بما يجب معرفته في هذا الموضوع بمنهج صفه: score من 0 إلى 100، covered (ما تذكره صحيحاً)، missed (نقاط مهمة نسيها)، wrong (أخطاء مع التصحيح)، tip (نصيحة مراجعة محددة).
الصيغة: {"score":0,"covered":["..."],"missed":["..."],"wrong":["..."],"tip":"..."}` + JSON_ONLY };
    default: return { json: false, maxTokens: 2500, temp: 0.3, extra: "" };
  }
}

const strs = (a: unknown, max = 12): string[] => Array.isArray(a) ? a.map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, max) : [];

function extractJson(text: string): any | null {
  const t = text.replace(/```(?:json)?/gi, "").trim();
  const i = t.indexOf("{"), j = t.lastIndexOf("}");
  if (i < 0 || j <= i) return null;
  try { return JSON.parse(t.slice(i, j + 1)); } catch { return null; }
}

function normalize(mode: Mode, raw: any): any | null {
  if (!raw || typeof raw !== "object") return null;
  if (mode === "exam") {
    const qs = (Array.isArray(raw.questions) ? raw.questions : []).map((q: any) => {
      const options = strs(q?.options, 4);
      const ci = Number(q?.correctIndex);
      if (!q?.q || options.length < 2 || !Number.isInteger(ci) || ci < 0 || ci >= options.length) return null;
      return { q: String(q.q).trim(), options, correctIndex: ci, explanation: String(q?.explanation ?? "").trim() };
    }).filter(Boolean);
    return qs.length ? { title: String(raw.title ?? "امتحان").trim(), questions: qs } : null;
  }
  if (mode === "cards") {
    const cards = (Array.isArray(raw.cards) ? raw.cards : []).map((c: any) => (c?.front && c?.back ? { front: String(c.front).trim(), back: String(c.back).trim() } : null)).filter(Boolean).slice(0, 20);
    return cards.length ? { cards } : null;
  }
  if (mode === "mindmap") {
    const branches = (Array.isArray(raw.branches) ? raw.branches : []).map((b: any) => (b?.title ? { title: String(b.title).trim(), children: strs(b.children, 6) } : null)).filter(Boolean).slice(0, 8);
    return raw.root && branches.length ? { root: String(raw.root).trim(), branches } : null;
  }
  if (mode === "feynman") {
    const sc = Math.max(0, Math.min(100, Math.round(Number(raw.score)) || 0));
    return { score: sc, good: strs(raw.good), gaps: strs(raw.gaps), mistakes: strs(raw.mistakes), improved: String(raw.improved ?? "").trim(), followUp: String(raw.followUp ?? "").trim() };
  }
  if (mode === "recall") {
    const sc = Math.max(0, Math.min(100, Math.round(Number(raw.score)) || 0));
    return { score: sc, covered: strs(raw.covered), missed: strs(raw.missed), wrong: strs(raw.wrong), tip: String(raw.tip ?? "").trim() };
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  // Health check: reports only which providers are configured (never the keys).
  if (req.method === "GET") {
    return reply(200, {
      ok: true,
      service: "ha-ai-tutor",
      providers: providers().map((p) => ({ id: p.id, models: p.models, vision: p.vision })),
      supabaseUrlConfigured: !!SUPABASE_URL,
    });
  }
  if (req.method !== "POST") return reply(405, { ok: false, error: "الطريقة غير مسموحة." });

  const chain = providers();
  const supabaseUrl = SUPABASE_URL;
  // The publishable key is public; fall back to the one the browser sent if the env var is not injected.
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || req.headers.get("apikey") || "";
  if (chain.length === 0) return reply(503, { ok: false, code: "NO_AI_KEY", error: "خدمة المدرس الذكي لم تُفعّل بعد. يلزم ضبط مفتاح الذكاء الاصطناعي في أسرار الخادم." });
  if (!supabaseUrl || !anonKey) return reply(503, { ok: false, code: "NO_SUPABASE_ENV", error: "إعدادات التحقق من الطالب غير مكتملة على الخادم." });

  let body: any;
  try { body = await req.json(); } catch { return reply(400, { ok: false, error: "تعذر قراءة الطلب." }); }

  const code = String(body?.code ?? "").trim().slice(0, 80);
  const device = String(body?.device ?? "").trim().slice(0, 120);
  const modeRaw = String(body?.mode ?? "chat");
  const mode: Mode = (MODES as readonly string[]).includes(modeRaw) ? (modeRaw as Mode) : "chat";
  const topic = String(body?.topic ?? "").trim().slice(0, 600);
  const studentText = String(body?.text ?? "").trim().slice(0, 2500);
  const count = Math.max(3, Math.min(15, parseInt(String(body?.count ?? "8"), 10) || 8));
  const levelRaw = String(body?.level ?? "mixed");
  const level = ["easy", "medium", "hard", "mixed"].includes(levelRaw) ? levelRaw : "mixed";
  const spec = modeSpec(mode, count, level);
  const question = mode === "chat"
    ? String(body?.question ?? "").trim()
    : (topic + (studentText ? `\n\nما كتبه الطالب:\n${studentText}` : "")).trim();
  const gradeRaw = String(body?.grade ?? "").trim().slice(0, 80);
  const grade = GRADE_NAMES[gradeRaw] || "المرحلة الثانوية";
  const history = mode === "chat" && Array.isArray(body?.history) ? body.history.slice(-8) : [];

  const rawImages: string[] = Array.isArray(body?.images) ? body.images.filter((x: unknown) => typeof x === "string") : [];
  if (rawImages.length > MAX_IMAGES) return reply(400, { ok: false, error: `أقصى عدد للصور ${MAX_IMAGES} في السؤال الواحد.` });
  const images: { mime: string; b64: string; url: string }[] = [];
  for (const d of rawImages) {
    const mt = IMG_RE.exec(d);
    if (!mt) return reply(400, { ok: false, error: "صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP." });
    if (Math.floor((mt[2].length * 3) / 4) > MAX_IMAGE_BYTES) return reply(400, { ok: false, error: "الصورة كبيرة جداً (الحد 2 ميجا). صوّرها بجودة أقل أو قصّها." });
    images.push({ mime: mt[1], b64: mt[2], url: d });
  }

  if (!code || !device) return reply(401, { ok: false, error: "سجّل دخول الطالب أولاً حتى نتحقق من حسابك." });
  if (mode !== "chat" && topic.length < 2) return reply(400, { ok: false, error: "اكتب اسم الدرس أو الموضوع." });
  if (mode !== "chat" && images.length > 0) return reply(400, { ok: false, error: "هذه الأداة لا تدعم الصور." });
  if (question.length > 3300 || (images.length === 0 && question.length < 2)) return reply(400, { ok: false, error: "اكتب سؤالاً من 2 إلى 2500 حرف، أو أرسل صورة." });

  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const userToken = bearer && bearer !== anonKey ? bearer : anonKey;

  try {
    const gate = await fetch(`${supabaseUrl}/rest/v1/rpc/ha_ai_gate2`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ p_code: code, p_device: device, p_images: images.length }),
    });
    if (!gate.ok) return reply(401, { ok: false, error: "تعذر التحقق من حساب الطالب." });
    const g = await gate.json();
    if (!g?.ok) {
      if (g?.error === "RATE_LIMIT") return reply(429, { ok: false, code: "RATE_LIMIT", error: "بعتّ أسئلة كتير بسرعة. استنى دقيقة وحاول تاني." });
      if (g?.error === "DAILY_LIMIT") return reply(429, { ok: false, code: "DAILY_LIMIT", error: "وصلت للحد اليومي من أسئلة المدرس الذكي. كمّل بكرة." });
      if (g?.error === "IMAGE_LIMIT") return reply(429, { ok: false, code: "IMAGE_LIMIT", error: "وصلت للحد اليومي لإرسال الصور (15 صورة). كمّل بكرة أو اكتب المسألة نصاً." });
      if (g?.error === "SUBSCRIPTION_REQUIRED") return reply(403, { ok: false, code: "SUBSCRIPTION_REQUIRED", error: "المدرس الذكي ضمن باقة اشتراك. فعّل اشتراكك من لوحة الطالب ← اشتراكي." });
      return reply(401, { ok: false, error: "بيانات الدخول غير صحيحة أو هذا الجهاز غير مسجل." });
    }

    const safeHistory = history
      .filter((m: any) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 2500) }));

    const imageRules = images.length > 0
      ? `

الصور:
- الطالب أرسل ${images.length === 1 ? "صورة" : images.length + " صور"} لمسألة أو سؤال. اقرأ نص المسألة من الصورة أولاً، ثم اكتب السؤال والمكونات أو المراحل كما فهمتها قبل الشرح.
- افهم الرسومات والأشكال التشريحية والخلوية والرسوم الوراثية قدر الإمكان، واذكر ما تستطيع قراءته من التسميات والمراحل.
- إذا كانت الصورة غير واضحة أو مقصوصة أو بها جزء لا يُقرأ، فاطلب صورة أوضح ولا تخترع أي بيانات أو أرقام. وإذا كانت المسألة ناقصة فاسأل عن الناقص.`
      : "";

    const systemPrompt = `أنت "المدرس الذكي" داخل منصة إحياء بإشراف الدكتور محمد علي، ومتخصص في شرح مادة الأحياء لطلاب المرحلة الثانوية في مصر. الطالب في: ${grade}.

المنهج والمصطلحات:
${CURRICULUM[gradeRaw] ? "خريطة منهج الصف (للاسترشاد بالترتيب والعناوين فقط، ولا تنسب أي معلومة لصفحة بعينها):\n" + CURRICULUM[gradeRaw] + "\n" : ""}- التزم بمحتوى الأحياء الذي يقدمه الطالب أو يحدده مدرس المنصة للصف المذكور. استخدم المصطلحات العلمية العربية الدقيقة، وميّز بين الحقائق العلمية العامة وما لم يتم التحقق من وروده في المنهج.
- لا تشرح من خارج منهج الصف إلا إذا طلب الطالب ذلك صراحةً؛ وإذا كان السؤال خارج منهج صفه فاذكر ذلك بوضوح ثم اشرح باختصار أو وجّهه للدرس المناسب.
- لا تنسب معلومة إلى رقم صفحة أو درس أو امتحان معيّن في الكتاب ولا تدّعِ أنك اطلعت على كتاب الوزارة أو فيديوهات المدرس أو درجات الطالب؛ إن لم تكن متأكداً من موضع نقطة في المنهج فقل ذلك.

طريقة الحل (فكّر بدقة قبل الإجابة):
1. حدّد المطلوب والمعطيات ووحداتها، وحوّل الوحدات إلى SI عند اللزوم.
2. حدّد المفهوم أو العملية الحيوية المناسبة، واشرح تسلسلها وعلاقاتها ومكوناتها خطوة بخطوة. استخدم الحساب فقط عندما يتضمن السؤال بيانات كمية فعلية.
3. راجع الدقة العلمية للمصطلحات والمراحل والعلاقات، وتحقق من اتساق أي حسابات أو نسب وراثية مطلوبة.
4. اذكر الخلاصة بوضوح، وأضف الوحدة فقط إذا كان السؤال يتضمن قياساً كمياً.
5. اختم بسؤال قصير أو مسألة مشابهة تتأكد بها من فهم الطالب.
- إذا كانت المسألة ناقصة المعطيات أو غير واضحة فاسأل عن الناقص بدلاً من التخمين. وإذا كانت المعطيات غير كافية أو كان الرسم غير واضح، فاطلب التوضيح ولا تفترض تفاصيل غير ظاهرة.
- إذا طلب الطالب الحل مباشرة فاشرح أسلوب التفكير مع الحل ولا تكتفِ بالناتج.

الأسلوب: بالعربية المصرية المبسّطة، صبور ومشجّع، فقرات قصيرة ومصطلحات وتعريفات علمية واضحة. إذا كان السؤال خارج الدراسة والأحياء فأجب باختصار ووجّه الطالب للموضوع التعليمي.${imageRules}${spec.extra}`;

    const userText = mode === "chat"
      ? (question || "اقرأ المسألة في الصورة واشرح حلها خطوة بخطوة.")
      : `الموضوع: ${topic}${studentText ? `\n\nما كتبه الطالب:\n${studentText}` : ""}`;
    const userContent = images.length > 0
      ? [{ type: "text", text: userText }, ...images.map((im) => ({ type: "image_url", image_url: { url: im.url } }))]
      : userText;
    const messages = [{ role: "system", content: systemPrompt }, ...safeHistory, { role: "user", content: userContent }];

    let sawRateLimit = false;
    let answer = "";
    let usedModel = "";
    let usedProvider = "";
    let parsed: any = null;
    outer:
    for (const prov of chain) {
      for (const model of (images.length > 0 ? prov.vision : prov.models)) {
        const response = await fetch(prov.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${prov.key}` },
          body: JSON.stringify({ model, temperature: spec.temp, messages, max_tokens: spec.maxTokens }),
        });
        const result = await response.json().catch(() => null);
        if (response.ok) {
          const a = result?.choices?.[0]?.message?.content;
          if (typeof a === "string" && a.trim()) {
            if (spec.json) {
              const pj = normalize(mode, extractJson(a));
              if (!pj) { console.error("bad_json", prov.id, model, mode); continue; }
              parsed = pj;
            }
            answer = a.trim(); usedModel = model; usedProvider = prov.id; break outer;
          }
          continue; // empty answer: try the next model
        }
        console.error("ai_error", prov.id, model, response.status, JSON.stringify(result?.error ?? {}).slice(0, 300));
        if (response.status === 429) sawRateLimit = true;
        if (response.status === 401 || response.status === 402 || response.status === 403 || response.status === 429) break; // key/credit/limit: next provider
        // 400/404 (unknown, retired or non-vision model) or 5xx: try the next model
      }
    }

    if (!answer) {
      return sawRateLimit
        ? reply(429, { ok: false, error: "الضغط على المدرس الذكي كبير حالياً. حاول بعد دقيقة." })
        : reply(502, { ok: false, error: images.length > 0 ? "تعذّر تحليل الصورة الآن. جرّب صورة أوضح أو اكتب المسألة نصاً." : "حصلت مشكلة أثناء توليد الشرح. حاول مرة أخرى." });
    }

    const paths: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const p = await storeImage(code, i, images[i].mime, images[i].b64);
      if (p) paths.push(p);
    }
    if (!spec.json) {
      const label = mode === "summary" ? "[ملخص] " : mode === "hard" ? "[فكرة صعبة] " : "";
      await logChat(code, label + (question || "(سؤال بصورة)"), answer, paths);
    }
    return reply(200, { ok: true, answer: spec.json ? "" : answer, data: parsed, mode, model: usedModel, provider: usedProvider, remainingToday: g.remainingToday });
  } catch (_e) {
    return reply(502, { ok: false, error: "تعذّر الوصول للخدمة. حاول مرة أخرى." });
  }
});
