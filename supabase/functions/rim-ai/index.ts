// 99RIM AI sort: orders the rhymes the app found, best to write with first.
//
// The app finds rhymes itself, from pronunciations (rhyme.js). Claude only reorders
// those words and never adds any, so the list stays real rhymes.
//
// Deploy: supabase functions deploy rim-ai
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Optional: RIM_MODEL (default claude-opus-5-5), ALLOWED_ORIGIN (default *)

import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import { betaZodOutputFormat } from "npm:@anthropic-ai/sdk@0.133.0/helpers/beta/zod";
import { z } from "npm:zod@4.6.6";

const MODEL = Deno.env.get("RIM_MODEL") || "claude-opus-5-5";
const ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";
const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const Input = z.object({
  // The word, phrase or whole line the user searched for.
  text: z.string().trim().min(1).max(300),
  lang: z.enum(["da", "en"]).default("da"),
  // Rhymes the app found, best sound match first.
  candidates: z.array(z.string().trim().min(1).max(40)).min(1).max(150),
});

const Output = z.object({
  words: z.array(z.string()).describe("The candidate words, best first. Leave out words that are useless to write with."),
});

const SYSTEM = {
  da: `Du sorterer rim for danske sangskrivere og rappere. Du får det, brugeren søgte på (et ord, en vending eller en hel linje), og en liste af ord, der rimer på det.
Sortér ordene, så de bedste at skrive med kommer først: almindelige, levende ord før navne, forkortelser, engelske ord og sjældne ord; flerstavelsesrim før enstavelsesrim; og hvis der er en linje, ord der passer til linjens betydning og stemning.
Brug kun ord fra listen, stavet præcis som i listen. Udelad ord, der er ubrugelige at skrive med.`,
  en: `You sort rhymes for songwriters and rappers. You get what the user searched for (a word, a phrase or a whole line) and a list of words that rhyme with it.
Order the words so the best ones to write with come first: common, vivid words before names, abbreviations and rare words; multi-syllable rhymes before single-syllable ones; and if there's a line, words that fit its meaning and mood.
Only use words from the list, spelled exactly as in the list. Leave out words that are useless to write with.`,
};

// Best effort: each running instance allows 20 requests per minute per IP.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 20;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "?";
  if (limited(ip)) return json({ error: "rate_limited" }, 429);

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "bad_request" }, 400);
  const { text, lang, candidates } = parsed.data;

  try {
    const res = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(Output) },
      system: SYSTEM[lang],
      messages: [{ role: "user", content: `Søgning: ${text}\n\nRim: ${candidates.join(", ")}` }],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) return json({ error: "no_answer" }, 502);
    // Keep only real candidates, once each.
    const allowed = new Set(candidates);
    const words = [...new Set(res.parsed_output.words)].filter((w) => allowed.has(w));
    return json({ words });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 503);
    if (e instanceof Anthropic.APIError) return json({ error: "ai_error", status: e.status }, 502);
    return json({ error: "ai_unreachable" }, 502);
  }
});
