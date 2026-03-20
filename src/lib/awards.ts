import { Person, MetricKey, delta } from './shape';

export interface Award {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  bgClass: string;
}

export const AWARDS: Award[] = [
  { id: 'progressive', emoji: '🏆', title: 'The Progressive', subtitle: 'Highest improvement curve', color: '#00FF88', bgClass: 'bg-neon' },
  { id: 'belly-boss', emoji: '🍕', title: 'Belly Boss', subtitle: 'Enjoys life & stays consistent', color: '#FBBF24', bgClass: 'bg-amber' },
  { id: 'lazy-legend', emoji: '🦥', title: 'Lazy Legend', subtitle: 'Minimum effort, maximum results', color: '#A78BFA', bgClass: 'bg-purple' },
  { id: 'talent', emoji: '✨', title: 'The Talent', subtitle: 'Natural performer, chaotic consistency', color: '#38BDF8', bgClass: 'bg-blue' },
  { id: 'streak', emoji: '🔥', title: 'Streak Master', subtitle: 'Most measurements logged', color: '#FF3B3B', bgClass: 'bg-red' },
  { id: 'transformer', emoji: '💎', title: 'The Transformer', subtitle: 'Biggest total body change', color: '#F472B6', bgClass: 'bg-magenta' },
];

export function computeAwards(people: Person[]): Map<string, Award> {
  const map = new Map<string, Award>();
  if (people.length < 2) return map;

  const withHistory = people.filter((p) => p.entries.length >= 2);

  // 🏆 The Progressive — biggest body fat DROP (percentage points)
  let bestBfDrop = 0, progressive = '';
  withHistory.forEach((p) => {
    const first = p.entries[0].bodyFat;
    const last = p.latest.bodyFat;
    if (first != null && last != null && first - last > bestBfDrop) {
      bestBfDrop = first - last;
      progressive = p.name;
    }
  });
  if (progressive) map.set(progressive, AWARDS[0]);

  // 🍕 Belly Boss — highest body fat who still shows up consistently (most entries with high BF)
  let bellyBoss = '', bbScore = 0;
  people.forEach((p) => {
    const bf = p.latest.bodyFat ?? 0;
    const score = bf * Math.sqrt(p.entries.length); // high BF + lots of check-ins
    if (score > bbScore && !map.has(p.name)) { bbScore = score; bellyBoss = p.name; }
  });
  if (bellyBoss) map.set(bellyBoss, AWARDS[1]);

  // 🦥 Lazy Legend — fewest measurements but decent body fat
  let lazyLeg = '', lazyScore = Infinity;
  people.forEach((p) => {
    if (map.has(p.name)) return;
    const bf = p.latest.bodyFat ?? 50;
    const score = p.entries.length + bf * 0.1; // low entries + low BF = lazy legend
    if (score < lazyScore && p.entries.length >= 1) { lazyScore = score; lazyLeg = p.name; }
  });
  if (lazyLeg) map.set(lazyLeg, AWARDS[2]);

  // ✨ The Talent — lowest body fat overall (natural performer)
  let talent = '', bestBf = Infinity;
  people.forEach((p) => {
    if (map.has(p.name)) return;
    const bf = p.latest.bodyFat ?? 99;
    if (bf < bestBf) { bestBf = bf; talent = p.name; }
  });
  if (talent) map.set(talent, AWARDS[3]);

  // 🔥 Streak Master — most measurements
  let streaker = '', maxEntries = 0;
  people.forEach((p) => {
    if (map.has(p.name)) return;
    if (p.entries.length > maxEntries) { maxEntries = p.entries.length; streaker = p.name; }
  });
  if (streaker) map.set(streaker, AWARDS[4]);

  // 💎 Transformer — biggest total weight change (abs)
  let transformer = '', maxChange = 0;
  people.forEach((p) => {
    if (map.has(p.name) || p.entries.length < 2) return;
    const d = Math.abs((p.latest.kg ?? 0) - (p.entries[0].kg ?? 0));
    if (d > maxChange) { maxChange = d; transformer = p.name; }
  });
  if (transformer) map.set(transformer, AWARDS[5]);

  return map;
}

// Fun tooltip quotes based on trends
export function funQuote(metric: MetricKey, value: number, trend: 'up' | 'down' | 'flat'): string {
  const quotes: Record<string, Record<string, string[]>> = {
    kg: {
      up: ['Bulking season! 💪', 'Gravity is winning', 'More of you to love'],
      down: ['Shredding! 🔥', 'Ghost mode activated', 'Lighter than yesterday'],
      flat: ['Perfectly balanced', 'Maintenance mode ON', 'The scale respects you'],
    },
    bodyFat: {
      up: ['Winter coating applied 🧸', 'Building reserves', 'Strategic fluff'],
      down: ['Getting shredded! 🗡️', 'Abs incoming...', 'Fat cells in panic'],
      flat: ['Holding the line', 'Consistent legend', 'Not even flinching'],
    },
    muscle: {
      up: ['Gains train! 🚂', 'Hulk mode loading...', 'Protein is working'],
      down: ['Recovery phase 😴', 'Needs more protein', 'Temporary setback'],
      flat: ['Solid foundation', 'Maintenance gains', 'Steady as a rock'],
    },
  };
  const mq = quotes[metric] || quotes.kg;
  const arr = mq[trend] || mq.flat;
  return arr[Math.floor(Math.random() * arr.length)];
}
