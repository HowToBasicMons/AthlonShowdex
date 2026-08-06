/**
 * Builds bundled, authoritative per-mod type charts from the Pokéathlon server repo, so Showdex's
 * calc uses the SERVER's custom-type matchups (immunities/resistances of Sound/Light/Cosmic/Nuclear/
 * Crystal) instead of relying on the live client's `window.BattleTypeChart` (which can be stale or
 * incomplete for custom types).
 *
 * Output: src/assets/typecharts/pokeathlon-typecharts.json
 *   { [modSlug]: { [typeId]: { damageTaken: { [AttackerName]: code } } } }
 *   code: 0 neutral, 1 weak (x2), 2 resist (x0.5), 3 immune (x0)  — same as BattleTypeChart.
 *
 * The bundled slugs match `getPokeathlonModId()`'s slugs (gen-stripped), e.g. 'soulstones'.
 * Mods without a typechart override (mariomon, pokeathlon) still get the comprehensive BASE chart,
 * which fully defines every custom type — something the live client chart often lacks.
 *
 * Run from the showdex/ dir: node scripts/build-pokeathlon-typecharts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const SERVER = path.resolve(process.cwd(), '../pokeathlon-server/data');
const OUT = path.resolve(process.cwd(), 'src/assets/typecharts/pokeathlon-typecharts.json');

/**
 * Maps a server mod directory -> the Showdex mod slug (gen-stripped) that `getPokeathlonModId()`
 * produces. Explicit to avoid older-gen collisions (e.g. gen6infinity vs gen9infinity).
 * `null` dir means "base chart only" (no override file).
 */
const MOD_DIRS = {
  soulstones: 'gen9soulstones',
  chaos: 'gen9chaos',
  chaosfusion: 'gen9chaosfusion',
  infinity: 'gen9infinity',
  insurgence: 'gen9insurgence',
  uranium: 'gen9uranium',
  infinitefusion: 'gen7infinitefusion',
  mariomon: null,
  pokeathlon: null,
};

/**
 * Evaluates a `export const TypeChart: ... = <expr>;` file into a plain object.
 *
 * Handles three shapes:
 *   1. object literal:  `= { ... };`
 *   2. re-export alias: `= Chaos;` (resolves the matching `import { TypeChart as Chaos } from '...'`)
 *   3. anything else:   returns `{}` (treated as no overrides)
 */
const loadChart = (file) => {
  const src = fs.readFileSync(file, 'utf8');

  // strip the leading `export const TypeChart...= ` to isolate the right-hand side
  const rhs = src.replace(/^[\s\S]*?TypeChart[^=]*=\s*/, '').trim();

  // 1. object literal
  if (rhs.startsWith('{')) {
    const m = rhs.match(/^(\{[\s\S]*\})\s*;?\s*$/);

    if (m) {
      // eslint-disable-next-line no-eval
      return eval(`(${m[1]})`);
    }
  }

  // 2. re-export of another module's TypeChart (e.g. `= Chaos;`)
  const aliasMatch = rhs.match(/^([A-Za-z_$][\w$]*)\s*;?\s*$/);

  if (aliasMatch) {
    const alias = aliasMatch[1];
    const importMatch = src.match(
      new RegExp(`import\\s*\\{[^}]*TypeChart\\s+as\\s+${alias}[^}]*\\}\\s*from\\s*['"]([^'"]+)['"]`),
    );

    if (importMatch) {
      let rel = importMatch[1];

      if (!/\.[tj]s$/.test(rel)) {
        rel += '.ts';
      }

      return loadChart(path.resolve(path.dirname(file), rel));
    }
  }

  // 3. unparseable / empty -> no overrides
  return {};
};

const base = loadChart(path.join(SERVER, 'typechart.ts'));

// extract only damageTaken, keep all base types
const damageTakenOf = (chart) => Object.fromEntries(
  Object.entries(chart)
    .filter(([, v]) => v && v.damageTaken)
    .map(([t, v]) => [t, { damageTaken: { ...v.damageTaken } }]),
);

const baseDT = damageTakenOf(base);
const out = {};

for (const [slug, dir] of Object.entries(MOD_DIRS)) {
  // start from a deep copy of the base chart
  const merged = {};
  for (const [t, v] of Object.entries(baseDT)) {
    merged[t] = { damageTaken: { ...v.damageTaken } };
  }

  if (dir) {
    const tcFile = path.join(SERVER, 'mods', dir, 'typechart.ts');

    if (fs.existsSync(tcFile)) {
      const modChart = damageTakenOf(loadChart(tcFile));

      for (const [t, v] of Object.entries(modChart)) {
        merged[t] = { damageTaken: { ...(baseDT[t]?.damageTaken || {}), ...v.damageTaken } };
      }
    }
  }

  out[slug] = merged;
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 0)}\n`);
console.log(`wrote ${OUT}\nmods: ${Object.keys(out).join(', ')}`);
