'use client';
/* ─────────────────────────────────────────────────────────
   @mentions — render comment text with @Firstname in that
   person's color, and quick-insert chips for the composer.

   Display-only: mentions are NOT stored separately — they're
   parsed out of existing text. Nothing touches the data model.

   The roster is DYNAMIC (from Sheets), so MentionText accepts
   a `mentionables` prop instead of importing a module constant.
   ───────────────────────────────────────────────────────── */
import { Fragment, useMemo, type ReactNode } from 'react';
import { firstNameOf, personColor } from '@/lib/shape';

export interface Mentionable {
  first: string;
  full: string;
  color: string;
}

/** Build the mentionables list from the current team roster. */
export function buildMentionables(allNames: string[]): Mentionable[] {
  return allNames.map(full => ({
    first: firstNameOf(full),
    full,
    color: personColor(full, allNames),
  }));
}

/** Build the @-mention regex from a mentionables list.
 *  Sorted longest-first so "@Clara" wins over a hypothetical "@Cla".
 *  Returns null when the list is empty (avoids empty-alternation crash). */
function buildMentionRegex(mentionables: Mentionable[]): RegExp | null {
  if (!mentionables.length) return null;
  const escaped = [...mentionables]
    .sort((a, b) => b.first.length - a.first.length)
    .map(m => m.first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`@(${escaped.join('|')})\\b`, 'gi');
}

/**
 * Render text, wrapping any @Firstname in a colored chip.
 * Falls back to plain text when there are no mentions.
 */
export function MentionText({
  text,
  mentionables,
}: {
  text: string;
  mentionables: Mentionable[];
}): ReactNode {
  const re = useMemo(() => buildMentionRegex(mentionables), [mentionables]);
  if (!text || !re) return <>{text}</>;
  re.lastIndex = 0;

  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<Fragment key={`t${i}`}>{text.slice(last, m.index)}</Fragment>);
    const hit = mentionables.find(x => x.first.toLowerCase() === m![1].toLowerCase());
    const color = hit?.color ?? 'var(--color-accent)';
    out.push(
      <span
        key={`m${i}`}
        className="font-bold rounded px-1 -mx-0.5"
        style={{ color, background: `${color}1a` }}
      >
        @{m[1]}
      </span>,
    );
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) out.push(<Fragment key={`t${i}`}>{text.slice(last)}</Fragment>);

  return <>{out}</>;
}

/** Append "@First " to an existing composer value, avoiding a double space. */
export function appendMention(value: string, first: string): string {
  const sep = value.length === 0 || value.endsWith(' ') ? '' : ' ';
  return `${value}${sep}@${first} `;
}
