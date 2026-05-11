import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── ROASTMASTER PROMPT ───────────────────────────────────────────────────
const SYSTEM_PROMPT = `Ești "Coach Petrache" — AI-ul echipei ShapeSquad. Un personaj cu personalitate: parte coach, parte prieten care te ia peste picior, parte observator atent. Vorbești ÎN ROMÂNĂ, casual, cu umor inteligent.

## CINE EȘTI
- Coach cu suflet, dar și cu replici tăioase când e cazul
- Cunoști pe toată lumea din echipă pe nume + personalitatea lor
- Faci roast inteligent — niciodată cruzime, doar ironie afectuoasă
- Respecți corpurile reale ale oamenilor — BF 25% e OK pentru oameni normali, nu suntem la Mr. Olympia

## VIBES PER PERSOANĂ (folosește-le natural în răspunsuri)
- **Petrica** 🤖💜 — visătorul care a construit appul ăsta. Scrie cod, nu reps. Are mai multe variabile decât ridicări. E ținta preferată pentru roast — el ne-a creat, deci poate să încaseze. Spune-i "boss-ul digital", "vizionarul cu mouse-ul mai antrenat decât pieptul", "Petrache nostru care a inventat XP-ul ca să-și justifice că nu vine la sală".
- **Gaby** 🏍️🧱 — half gym bro, half Lego architect. Ridică Lego-uri mai grele decât deadliftul.
- **Cata** 🎮 — CS legend + DB optimization. SELECT * FROM gains.
- **Clara** 😴🏃‍♀️ — doarme 9h și tot te lasă în praf la alergat.
- **Bogdan** 🇮🇹🍕 — suflet italian în corp românesc. Pulsul îi crește lângă pizza ȘI lângă imprimante.
- **Lavinia** 🐕🤔 — filosof zilnic, sclavă lui Ari nopți. Convo-urile ei ard mai multe calorii decât cardio-ul.
- **Cristi** 🚗👔 — team leader perfecționist. Mașina lui e mai curată decât codul tău.
- **Adina** 🌹👗 — 20+ parfumuri, 0 zile sărite la sală. Vine la sală mai îmbrăcată decât tu la nunți.
- **Stefi** 🐍🍔 — are un șarpe. Atât. Mică, imprevizibilă, flămândă. Aproprie-te cu mâncare.
- **Varamea** 📺👫 — Survivor expert + TikTok scholar. Cu Buicu fac TikTok-uri ca să rămână cuplu.

## STIL DE RĂSPUNS
- **MAXIM 2-3 propoziții.** Punctuale, cu punch. Fără bullet points lungi.
- **1-2 emoji-uri** natural (💪 🔥 📈 😏 👀 🫡)
- **Numește oamenii pe nume** când vorbești despre ei
- **Date concrete** din ce ai în context (nu inventa numere)
- **Roast friendly** când e potrivit, mai ales cu Petrica
- **Celebrează frecvența logging-ului**, nu doar valorile

## EXEMPLE DE TON
- "Petrica are LVL 8 și 760 XP. Frumos. Acum dacă ar și veni la sală, am avea legenda completă 😏"
- "Adina −1.7% BF de la start și 7 măsurători. Asta e consistență cu parfum, nu glumă 🌹💪"
- "Clara doarme 9h și totuși tot are streak. Cum? Magie. Sau dormind în sală. 😴"
- "Bogdan, lasă pizza pentru o zi și hai la cardio. Promit, va fi acolo și mâine 🍕"

## REGULI STRICTE
1. **DOAR despre ShapeSquad, fitness, sănătate, nutriție, sport, motivație, body composition, antrenamente, sleep.** Orice altceva — REFUZĂ politicos, cu umor. Exemplu: "Frate, eu sunt despre kg și BF%, nu despre crypto / politică / cum să-ți declari TVA-ul. Întreabă-mă ce face echipa la sală 💪"
2. **NICIODATĂ** insulte reale despre corp. BF 25% nu e prost — e normal. NU comenta negativ despre cum arată cineva.
3. **NU inventa date.** Dacă nu ai info → spune că nu ai info. Nu scoate numere din burtă.
4. **NU da diagnostice medicale.** Pentru chestii medicale → trimite la medic.
5. **Răspunde DOAR în română.**

Acum, dă-le ce au nevoie. Cu stil. 🫡`;

// Topics that are OFF-LIMITS (server-side soft check; the AI also enforces it)
const OFF_TOPIC_PATTERNS = [
  /\b(crypto|bitcoin|ethereum|nft|trading|forex|stocks?|bursa|acțiuni)\b/i,
  /\b(politică|alegeri|guvern|psd|pnl|usr|partid)\b/i,
  /\b(tvâ|tva|impozit|anaf|fiscal|contabil)\b/i,
  /\b(razboi|război|ucraina|rusia|gaza)\b/i,
  /\b(porno|sexual|nud[ae]?|cum să fac sex)\b/i,
];

const FITNESS_KEYWORDS = [
  /\b(kg|kilograme|greutate|slăbe|îngrașă|gras|slab|gros|subțire)\b/i,
  /\b(bf|body ?fat|grăsime|masă|muscle|muscul|talie|piept|biceps|fes|abs)\b/i,
  /\b(sală|gym|antrenament|reps|sets|cardio|alergat|alergare|înot|bicicletă)\b/i,
  /\b(mâncare|mancare|nutriție|nutritie|proteine|carbohidrați|calorii|dietă|dieta)\b/i,
  /\b(somn|dormit|odihnă|odihna|sleep|recovery)\b/i,
  /\b(progres|trend|xp|lvl|level|streak|leaderboard|ranking)\b/i,
  /\b(petrica|adina|gaby|cata|clara|bogdan|lavinia|cristi|stefi|varamea|echipa|squad)\b/i,
  /\b(motivat|disciplin|consist|obiectiv|target|goal)\b/i,
  /\b(coach|petrache|shapesquad|ai|chatbot|bot|hello|salut|hei|hai|cum|ce|cine|de ce|când|unde)\b/i,
];

function isLikelyOffTopic(text: string): boolean {
  // If we hit an obviously banned topic, refuse
  if (OFF_TOPIC_PATTERNS.some((re) => re.test(text))) return true;
  // If text has zero fitness/squad keywords AND is long enough to judge, refuse
  if (text.length < 8) return false; // too short — let AI handle (might be "hi", "cine?", etc)
  const hasFitness = FITNESS_KEYWORDS.some((re) => re.test(text));
  return !hasFitness;
}

// ─── RATE LIMITING (per-IP, daily) ────────────────────────────────────────
// In-memory store. For multi-instance Vercel deploys, swap for Vercel KV / Upstash.
interface RateBucket {
  date: string; // YYYY-MM-DD
  count: number;
}
const RATE_STORE = new Map<string, RateBucket>();
const DAILY_LIMIT = 10;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getClientKey(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  const ip = fwd ? fwd.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';
  // Optional: include a per-user identifier from header
  const user = req.headers.get('x-shapesquad-user') || 'anon';
  return `${ip}::${user}`;
}

function checkRate(key: string): { ok: boolean; used: number; remaining: number } {
  const today = todayKey();
  const bucket = RATE_STORE.get(key);
  if (!bucket || bucket.date !== today) {
    RATE_STORE.set(key, { date: today, count: 1 });
    return { ok: true, used: 1, remaining: DAILY_LIMIT - 1 };
  }
  if (bucket.count >= DAILY_LIMIT) {
    return { ok: false, used: bucket.count, remaining: 0 };
  }
  bucket.count += 1;
  return { ok: true, used: bucket.count, remaining: DAILY_LIMIT - bucket.count };
}

// ─── ROUTE HANDLER ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: { messages: ChatMessage[]; people?: any[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
  }

  // ── Rate limit (charge first, refund on refusal/error) ──
  const clientKey = getClientKey(req);
  const rate = checkRate(clientKey);
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: 'Ai consumat cele 10 dialoguri pe ziua de azi. Ne vedem mâine, cu mintea fresh 🫡',
        rateLimited: true,
        used: rate.used,
        remaining: 0,
      },
      { status: 429 }
    );
  }

  // ── Topic guard (BEFORE API key check — refusal is free, no API call) ──
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUser && isLikelyOffTopic(lastUser.content)) {
    // Refund the rate token (don't punish refusals)
    const bucket = RATE_STORE.get(clientKey);
    if (bucket && bucket.count > 0) bucket.count -= 1;
    return NextResponse.json({
      text: 'Frate, eu sunt despre ShapeSquad — kg, BF%, sport, mâncare, somn, sală. Crypto, politică sau ANAF-ul nu intră în chat-ul ăsta. Întreabă-mă ce face echipa la sală 💪',
      used: rate.used - 1,
      remaining: DAILY_LIMIT - (rate.used - 1),
    });
  }

  // ── API key check (after topic guard so refusals work without key) ──
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Refund: we won't actually call Anthropic
    const bucket = RATE_STORE.get(clientKey);
    if (bucket && bucket.count > 0) bucket.count -= 1;
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY nu e setat. Adaugă-l în .env.local sau în Vercel env vars.' },
      { status: 500 }
    );
  }

  // ── Build people context (compact) ──
  const peopleSummary = (body.people || []).map((p: any) => ({
    name: p.name,
    gender: p.gender,
    entries: p.entries?.length || 0,
    latest: {
      kg: p.latest?.kg,
      bodyFat: p.latest?.bodyFat,
      muscle: p.latest?.muscle,
      water: p.latest?.water,
      talie: p.latest?.talie,
      date: p.latest?.date,
    },
    first: {
      kg: p.first?.kg,
      bodyFat: p.first?.bodyFat,
      date: p.first?.date,
    },
    bfDelta:
      p.first?.bodyFat != null && p.latest?.bodyFat != null
        ? Number((p.latest.bodyFat - p.first.bodyFat).toFixed(2))
        : null,
    kgDelta:
      p.first?.kg != null && p.latest?.kg != null
        ? Number((p.latest.kg - p.first.kg).toFixed(2))
        : null,
  }));

  const dataContext =
    peopleSummary.length > 0
      ? `\n\n## DATELE ACTUALE ALE ECHIPEI (${peopleSummary.length} membri)\n${JSON.stringify(peopleSummary, null, 2)}`
      : '';

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: SYSTEM_PROMPT + dataContext,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const text = response.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return NextResponse.json({
      text,
      used: rate.used,
      remaining: rate.remaining,
    });
  } catch (e: any) {
    console.error('Anthropic error:', e);
    // Refund the rate token on error
    const bucket = RATE_STORE.get(clientKey);
    if (bucket && bucket.count > 0) bucket.count -= 1;
    return NextResponse.json({ error: e?.message || 'Anthropic API error' }, { status: 500 });
  }
}

// GET /api/chat — return current rate status (used by UI to show counter)
export async function GET(req: NextRequest) {
  const clientKey = getClientKey(req);
  const today = todayKey();
  const bucket = RATE_STORE.get(clientKey);
  const count = bucket && bucket.date === today ? bucket.count : 0;
  return NextResponse.json({
    used: count,
    remaining: Math.max(0, DAILY_LIMIT - count),
    limit: DAILY_LIMIT,
  });
}
