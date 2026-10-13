// Family and friends named by relation, not by name. Used by entity matching (so "Mom", "mum" and
// "my mother" are one person, whichever tagger produced the name) and by the offline tagger.

export type Relation = {
  /** How the person is shown, e.g. in "what holds you". */
  display: string;
  /** Lowercase words that all mean this person once "my"/"our" is stripped. The first is the canonical key. */
  words: string[];
  /** Recognised even without "my" ("Mom hugged me"); otherwise only as "my sister", "our cousin". */
  bare?: boolean;
};

export const RELATIONS: Relation[] = [
  { display: 'Mom', words: ['mom', 'mum', 'mother', 'mama', 'mommy', 'mummy', 'momma'], bare: true },
  { display: 'Dad', words: ['dad', 'father', 'papa', 'daddy', 'pa'], bare: true },
  { display: 'Grandma', words: ['grandma', 'grandmother', 'granny', 'nana', 'gran', 'grandmom', 'nan'], bare: true },
  { display: 'Grandpa', words: ['grandpa', 'grandfather', 'granddad', 'grandad', 'gramps', 'grampa'], bare: true },
  { display: 'my sister', words: ['sister', 'sis', 'little sister', 'big sister', 'older sister', 'younger sister'] },
  { display: 'my brother', words: ['brother', 'little brother', 'big brother', 'older brother', 'younger brother'] },
  { display: 'my best friend', words: ['best friend', 'bestie', 'best mate'] },
  { display: 'my wife', words: ['wife'] },
  { display: 'my husband', words: ['husband'] },
  { display: 'my partner', words: ['partner'] },
  { display: 'my girlfriend', words: ['girlfriend'] },
  { display: 'my boyfriend', words: ['boyfriend'] },
  { display: 'my son', words: ['son'] },
  { display: 'my daughter', words: ['daughter'] },
  { display: 'my aunt', words: ['aunt', 'auntie', 'aunty'] },
  { display: 'my uncle', words: ['uncle'] },
  { display: 'my cousin', words: ['cousin'] },
  { display: 'my teacher', words: ['teacher'] },
  { display: 'my roommate', words: ['roommate', 'flatmate'] },
];

const BY_WORD = new Map<string, Relation>();
for (const r of RELATIONS) for (const w of r.words) BY_WORD.set(w, r);

/** The relation a normalised name refers to ("mother" → Mom), if any. */
export function relationOf(normalised: string): Relation | undefined {
  return BY_WORD.get(normalised);
}

/** Canonical matching key for a relation ("mother" → "mom"). */
export function relationKey(normalised: string): string {
  const r = BY_WORD.get(normalised);
  return r ? r.words[0] : normalised;
}

/* ---------- places with more than one name ---------- */

/**
 * Everyday places that are one place whatever they are called, so "home", "our homeplace" and "my house" thread
 * together whichever tagger named them. Keys are compared after "my/our/the" and punctuation are stripped.
 */
export const PLACE_NAMES: { display: string; words: string[] }[] = [
  { display: 'home', words: ['home', 'homeplace', 'home place', 'family home', 'childhood home', 'home house', 'homestead'] },
];
/** "my house", "our flat": a home named by what it is, only when it is mine or ours. */
const OWN_HOME = /^(my|our)\s+(house|flat|apartment|place)$/;

const PLACE_BY_WORD = new Map<string, { display: string; words: string[] }>();
for (const p of PLACE_NAMES) for (const w of p.words) PLACE_BY_WORD.set(w, p);

/** The everyday place a name refers to ("our homeplace" → home), if any. `raw` is the name before stripping. */
export function placeOf(normalised: string, raw = ''): { display: string; words: string[] } | undefined {
  if (OWN_HOME.test(raw.trim().toLowerCase().replace(/[’']s$/, ''))) return PLACE_NAMES[0];
  return PLACE_BY_WORD.get(normalised);
}

/** Canonical matching key for a place ("homeplace" → "home"). */
export function placeKey(normalised: string, raw = ''): string {
  const p = placeOf(normalised, raw);
  return p ? p.words[0] : normalised;
}
