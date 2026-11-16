import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: cors });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const MODEL = Deno.env.get("IMAGE_MODEL") || "gpt-image-2.5-sunburst";

function openAiKey(): string {
  const explicit = Deno.env.get("OPENAI_API_KEY") || "";
  if (/^sk-[A-Za-z0-9_-]{20,}/.test(explicit)) return explicit;
  const all = Deno.env.toObject();
  for (const [name, raw] of Object.entries(all)) {
    if (!/OPENAI/i.test(name)) continue;
    const value = (raw || "").trim();
    if (/^sk-[A-Za-z0-9_-]{20,}/.test(value)) return value;
  }
  return "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { ok: false, error: "الطريقة غير مسموحة." });
  if (!SUPABASE_URL || !ANON) return reply(503, { ok: false, error: "إعدادات Supabase غير مكتملة." });

  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token || token === ANON) return reply(401, { ok: false, error: "سجّل دخول المدرس أولاً." });

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON, Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) return reply(401, { ok: false, error: "جلسة المدرس غير صالحة. سجّل الدخول مجدداً." });
    const teacherRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ha_is_teacher`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!teacherRes.ok || await teacherRes.json().catch(() => false) !== true) {
      return reply(403, { ok: false, error: "هذه الأداة متاحة لحساب المدرس فقط." });
    }

    const key = openAiKey();
    if (!key) return reply(503, { ok: false, error: "محرك توليد الصور غير مفعّل بعد. يلزم إضافة مفتاح OpenAI إلى أسرار Supabase باسم OPENAI_API_KEY." });

    let body: any;
    try { body = await req.json(); } catch { return reply(400, { ok: false, error: "تعذر قراءة بيانات التصميم." }); }
    const prompt = String(body?.prompt || "").trim().slice(0, 12000);
    const reference = String(body?.referenceImage || "");
    if (prompt.length < 30) return reply(400, { ok: false, error: "اكتب وصفاً أوضح للتصميم." });
    if (reference && !/^data:image\/(jpeg|png|webp);base64,/.test(reference)) {
      return reply(400, { ok: false, error: "الصورة المرجعية يجب أن تكون JPG أو PNG أو WebP." });
    }
    if (reference.length > 7_000_000) return reply(413, { ok: false, error: "الصورة المرجعية كبيرة جداً؛ قلل حجمها إلى أقل من 5 ميجابايت." });

    const url = reference ? "https://api.openai.com/v1/images/edits" : "https://api.openai.com/v1/images/generations";
    const form = new FormData();
    form.set("model", MODEL);
    form.set("prompt", prompt);
    form.set("size", "1024x1536");
    form.set("quality", "high");
    form.set("output_format", "png");
    if (reference) {
      const match = reference.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return reply(400, { ok: false, error: "تعذر قراءة الصورة المرجعية." });
      const mime = `image/${match[1]}`;
      const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
      const ext = match[1] === "jpeg" ? "jpg" : match[1];
      form.set("image", new File([bytes], `teacher-reference.${ext}`, { type: mime }));
    }
    const generated = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const data: any = await generated.json().catch(() => null);
    if (!generated.ok) {
      console.error("image_generation_error", generated.status, JSON.stringify(data?.error || {}).slice(0, 500));
      if (generated.status === 401 || generated.status === 403) return reply(503, { ok: false, error: "مفتاح محرك الصور غير صالح أو غير مفعّل." });
      if (generated.status === 429) return reply(429, { ok: false, error: "وصلت إلى حد الاستخدام الحالي لمحرك الصور. حاول لاحقاً." });
      return reply(502, { ok: false, error: data?.error?.message || "فشل توليد الصورة. جرّب وصفاً آخر." });
    }
    const image = data?.data?.[0]?.b64_json;
    if (!image) return reply(502, { ok: false, error: "المحرك لم يُرجع صورة. حاول مرة أخرى." });
    return reply(200, { ok: true, image: `data:image/png;base64,${image}`, model: MODEL });
  } catch (error) {
    console.error("image_studio_failure", error);
    return reply(502, { ok: false, error: "تعذر الوصول لمحرك الصور حالياً." });
  }
});
