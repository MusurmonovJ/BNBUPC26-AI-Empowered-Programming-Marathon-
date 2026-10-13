// The offline tagger: runs entirely in the browser, so the garden can connect memories with no API key.
// It finds people, places and feelings with the compromise NLP library plus a few rules for what compromise
// misses (unknown first names, family named by relation, generic places, song titles). Every name it returns
// still goes through the engine's entity matching, so "Mom" and "my mother" stay one person.

import { RELATIONS, relationOf, type Garden, type Kind } from '../engine';
import type { Tags } from '../engine/garden';
import { feelingsOf } from './feelings';

export type OfflineTags = { people: Tags; places: Tags; feelings: Tags };

type Nlp = typeof import('compromise').default;
let nlpPromise: Promise<Nlp> | null = null;
/** compromise is loaded lazily (its own chunk), and started early by preloadOfflineTagger(). */
function loadNlp(): Promise<Nlp> {
  nlpPromise ??= import('compromise').then((m) => m.default);
  return nlpPromise;
}
export const preloadOfflineTagger = () => { void loadNlp(); };

/** Everyday places worth threading even in lowercase ("the library rooftop at university"). */
const GENERIC_PLACES = ['home', 'homeplace', 'home place', 'family home', 'childhood home', 'homestead',
  'school', 'university', 'college', 'hospital', 'church', 'temple', 'mosque', 'office', 'work'];
/** Home named by what it is ("our house"), or reached rather than stood in ("went home", "back home"). */
const OWN_HOME = /\b(?:my|our)\s+(?:house|flat|apartment)\b/i;
const TO_HOME = /\b(?:went|go|goes|going|gone|came|come|comes|coming|back|walked|walking|drove|driving|flew|got|get|getting|headed|heading|ran|running|way)\s+home\b/i;
/** Words that look like names at the start of a sentence but aren't. */
const NOT_NAMES = new Set(['i', 'we', 'you', 'she', 'he', 'they', 'it', 'my', 'our', 'the', 'a', 'an', 'this', 'that', 'there', 'then', 'when', 'after', 'before']);

/** Strip quotes, trailing punctuation and a possessive: "Grandma Mei’s" → "Grandma Mei". */
export function cleanName(s: string): string {
  return s.replace(/[“”"«»]/g, '').replace(/[.,;:!?)]+$/g, '').replace(/^[(]+/, '').replace(/[’']s$/i, '').trim();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const capitalised = (w: string) => /^\p{Lu}/u.test(w);

/** A song is "title, artist. note": only the note talks about the person's life. */
function bodyOf(kind: Kind, text: string): string {
  if (kind !== 'song') return text;
  // The title ends at the first full stop followed by a capitalised word ("No. 1" doesn't count).
  const m = /\.\s+(?=\p{Lu})/u.exec(text);
  return m ? text.slice(m.index + m[0].length) : '';
}

/** Family and friends by relation: "Mom", "my sister", "Grandma Mei", "my best friend Sam". */
function relationPeople(text: string): string[] {
  const out: string[] = [];
  for (const r of RELATIONS) {
    for (const w of r.words) {
      const word = escapeRe(w);
      // "Grandma Mei", "Aunt Lisa": a relation followed by a capitalised name is that named person.
      const named = new RegExp(`(?:^|[^\\p{L}])(?:my\\s+|our\\s+)?(${word})\\s+(\\p{Lu}\\p{Ll}+)`, 'giu');
      for (const m of text.matchAll(named)) {
        // The `i` flag makes p{Lu} match lowercase too, so check the capital separately ("my sister and Priya").
        if (!capitalised(m[2])) continue;
        if (r.bare && capitalised(m[1])) out.push(`${m[1]} ${m[2]}`);
        else out.push(m[2]); // "my sister Ana" → Ana
      }
      const re = r.bare
        ? new RegExp(`(?:^|[^\\p{L}])((?:my\\s+|our\\s+)?${word})(?:[’']s)?(?=$|[^\\p{L}])`, 'giu')
        : new RegExp(`(?:^|[^\\p{L}])((?:my|our)\\s+${word})(?:[’']s)?(?=$|[^\\p{L}])`, 'giu');
      for (const m of text.matchAll(re)) {
        const after = text.slice((m.index ?? 0) + m[0].length);
        if (/^\s+\p{Lu}\p{Ll}+/u.test(after)) continue; // already taken as a named person above
        if (r.bare && !/^(my|our)\s/i.test(m[1]) && !capitalised(m[1])) continue; // "the father of the bride" isn't Dad
        out.push(m[1]);
      }
    }
  }
  return out;
}

/** Names the garden already knows, with their ids. */
function knownIn(g: Garden, text: string): { people: Tags; places: Tags; feelings: Tags } {
  const lower = text.toLowerCase();
  const hit = (kind: 'person' | 'place' | 'feeling') => Object.values(g.entities)
    .filter((e) => e.kind === kind && [e.name.toLowerCase(), ...e.aliases].some((n) => n.length > 1 &&
      new RegExp(`(^|[^\\p{L}])${escapeRe(n)}(?=$|[^\\p{L}])`, 'iu').test(lower)))
    .map((e) => ({ name: e.name, id: e.id }));
  return { people: hit('person'), places: hit('place'), feelings: hit('feeling') };
}

/** Keep one tag per name; drop a name contained in a longer one ("Mei" when "Grandma Mei" is there). */
function dedupe(tags: Tags): Tags {
  const seen = new Map<string, Tags[number]>();
  for (const t of tags) {
    const k = t.name.toLowerCase();
    if (!k) continue;
    if (!seen.has(k) || t.id) seen.set(k, t);
  }
  const all = [...seen.values()];
  return all.filter((t) => !all.some((o) => o !== t && !t.id &&
    o.name.length > t.name.length && new RegExp(`(^|\\s)${escapeRe(t.name)}(\\s|$)`, 'i').test(o.name)));
}

export async function offlineTag(g: Garden, kind: Kind, text: string): Promise<OfflineTags> {
  const nlp = await loadNlp();
  const body = bodyOf(kind, text);
  const known = knownIn(g, body);
  const doc = nlp(body);

  /* places: compromise's places, capitalised names after in/at/near/from, and everyday places */
  const places = new Set<string>(doc.places().out('array').map(cleanName));
  for (const m of body.matchAll(/\b(?:in|at|near|from|to|around)\s+(?:the\s+)?((?:\p{Lu}[\p{L}’'-]+)(?:\s+\p{Lu}[\p{L}’'-]+)*)/gu)) {
    const name = cleanName(m[1]);
    const relation = relationOf(name.toLowerCase().replace(/^(my|our)\s+/, ''));
    if (!relation && !nlp(name).has('#Person') && !nlp(name).has('#Date')) places.add(name);
  }
  for (const p of GENERIC_PLACES) {
    if (new RegExp(`\\b(?:at|in|from|to|around)\\s+(?:the\\s+|my\\s+|our\\s+)?${p}\\b`, 'i').test(body)) places.add(p);
  }
  // Every name for home becomes "home" in the engine's matching (relations.ts PLACE_NAMES), so they thread together.
  if (OWN_HOME.test(body) || TO_HOME.test(body)) places.add('home');
  const isPlace = (name: string) => [...places].some((p) => p.toLowerCase() === name.toLowerCase() ||
    new RegExp(`(^|\\s)${escapeRe(name)}(\\s|$)`, 'i').test(p));

  /* people: compromise's people, family by relation, and capitalised names it doesn't know */
  const people = new Set<string>([...doc.people().out('array').map(cleanName), ...relationPeople(body).map(cleanName)]);
  // Mid-sentence proper nouns that aren't places or dates ("with Leo", "and Priya").
  for (const p of doc.match('#ProperNoun+').not('#Date').not('#Place').out('array') as string[]) {
    const name = cleanName(p);
    if (name && !isPlace(name)) people.add(name);
  }
  // A sentence starting with a name: "Leo and me…", "Priya taught me…".
  for (const s of doc.sentences().json() as { terms: { text: string; tags: string[] }[] }[]) {
    const [first, second, third] = s.terms;
    if (!first || !capitalised(first.text) || NOT_NAMES.has(first.text.toLowerCase())) continue;
    const looksLikeName = first.tags.includes('Singular') && !first.tags.some((t) => ['Verb', 'Adjective', 'Pronoun', 'Determiner', 'Date', 'Place'].includes(t));
    const actsLikePerson = (second?.text.toLowerCase() === 'and' && /^(me|i)$/i.test(third?.text ?? '')) || second?.tags.includes('PastTense');
    if (looksLikeName && actsLikePerson && !isPlace(first.text)) people.add(cleanName(first.text));
  }

  const notMe = (n: string) => !/^(i|me|myself)$/i.test(n);
  const named = (xs: Iterable<string>) => [...xs].filter((n) => n && notMe(n)).map((name) => ({ name }));
  return {
    people: dedupe([...known.people, ...named([...people].filter((n) => !isPlace(n)))]),
    places: dedupe([...known.places, ...named(places)]),
    feelings: dedupe([...known.feelings, ...feelingsOf(text).map((name) => ({ name }))]).slice(0, 2),
  };
}
