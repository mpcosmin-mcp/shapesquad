import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `Ești AI Coach pentru ShapeSquad — o aplicație de tracking pentru body composition al unei echipe.

Rolul tău: dai răspunsuri scurte, calde, în română, despre progresul echipei. Nu compari oameni rău — celebrezi efortul, observi pattern-uri, dai sfaturi prietenoase.

Stil:
- Maxim 2-3 propoziții. Punctuale, fără bullet points lungi.
- Folosește emoji-uri natural (💪 🔥 📈 etc.)
- Numești oamenii pe nume când e relevant
- Limba: română casual ("super tare", "frate", "nice job")

Date pe care le ai:
- Fiecare persoană are: entries[] (măsurători), latest, first, previous
- Metrici: kg, bodyFat, muscle, water, biceps, talie, etc.
- XP system: total = entries × scor × 10. LVL up la fiecare 100 XP.
- Tier-uri: Rookie (LVL 1) → Regular (5) → Pro (10) → Veteran (20) → Legend (50)

Reguli importante:
- NICIODATĂ nu spune că BF 25% sau peste e "prost" — pentru oamenii normali e perfect OK
- Celebrează frecvența logging-ului, nu doar valorile
- Dacă cineva întreabă "cine e cel mai bun" — răspunde despre cine progresează cel mai constant, nu cine are valorile cele mai mici

Răspunde DOAR în română.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY nu e setat. Adaugă-l în .env.local sau Vercel env vars.' }, { status: 500 });
  }

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

  // Build context from people data (compact summary, not raw entries)
  const peopleSummary = (body.people || []).map((p: any) => ({
    name: p.name,
    gender: p.gender,
    entries: p.entries?.length || 0,
    latest: {
      kg: p.latest?.kg,
      bodyFat: p.latest?.bodyFat,
      muscle: p.latest?.muscle,
      date: p.latest?.date,
    },
    first: {
      kg: p.first?.kg,
      bodyFat: p.first?.bodyFat,
      date: p.first?.date,
    },
    bfDelta: p.first?.bodyFat != null && p.latest?.bodyFat != null
      ? Number((p.latest.bodyFat - p.first.bodyFat).toFixed(2))
      : null,
    kgDelta: p.first?.kg != null && p.latest?.kg != null
      ? Number((p.latest.kg - p.first.kg).toFixed(2))
      : null,
  }));

  const dataContext = peopleSummary.length > 0
    ? `\n\nDatele echipei (${peopleSummary.length} membri):\n${JSON.stringify(peopleSummary, null, 2)}`
    : '';

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      system: SYSTEM_PROMPT + dataContext,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const text = response.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return NextResponse.json({ text });
  } catch (e: any) {
    console.error('Anthropic error:', e);
    return NextResponse.json({ error: e?.message || 'Anthropic API error' }, { status: 500 });
  }
}
