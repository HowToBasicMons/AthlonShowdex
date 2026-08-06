import { type GenerationNum } from '@smogon/calc';
import { Types } from '@smogon/calc/dist/data/types';
import { formatId } from '@showdex/utils/core';
import PokeathlonTypeCharts from '@showdex/assets/typecharts/pokeathlon-typecharts.json';

/**
 * A single defender type's `damageTaken` map (attacker Proper-name -> code).
 */
type DamageTakenChart = Record<string, { damageTaken?: Record<string, number> }>;

/**
 * Bundled, authoritative per-mod type charts built from the Pokéathlon **server repo** (via
 * `scripts/build-pokeathlon-typecharts.mjs`), keyed by gen-stripped mod slug (e.g. `'soulstones'`).
 *
 * Used in preference to the live client's `window.BattleTypeChart`, which can be stale or missing
 * custom-type (Cosmic/Nuclear/Crystal/Sound/Light) immunities & resistances.
 */
const BundledCharts = PokeathlonTypeCharts as unknown as Record<string, DamageTakenChart>;

/**
 * Maps Showdown's `damageTaken` codes to damage multipliers.
 *
 * * `0` → neutral (×1), `1` → super effective (×2), `2` → resisted (×0.5), `3` → immune (×0).
 */
const DamageTakenToMultiplier: Record<number, number> = {
  0: 1,
  1: 2,
  2: 0.5,
  3: 0,
};

/**
 * Cache of built `Types` resolvers, keyed by `${sourceKey}:${gen}`.
 *
 * * `sourceKey` is the bundled mod slug (e.g. `'soulstones'`) or `'live'` for the client chart.
 * * For the live chart, we also track the chart object reference it was built from & evict the
 *   `'live'` entries whenever it changes (e.g. switching into a different mod's battle).
 */
const cachedTypesDex = new Map<string, Types>();
let cachedLiveChart: object | null = null;

/**
 * Builds a `Types`-compatible resolver from a Showdown-style `damageTaken` chart.
 *
 * * `chart` keys are lowercase type ids; `damageTaken` keys are Proper-cased attacker names.
 */
const buildTypesDex = (gen: GenerationNum, chart: DamageTakenChart): Types => {
  const fallback = new Types(gen);

  // build an id -> Proper Name lookup from every damageTaken object
  const properNames: Record<string, string> = {};

  Object.keys(chart).forEach((id) => {
    const damageTaken = chart[id]?.damageTaken;

    if (!damageTaken) {
      return;
    }

    Object.keys(damageTaken).forEach((attackerName) => {
      properNames[formatId(attackerName)] = attackerName;
    });
  });

  const properName = (id: string) => properNames[id]
    || `${id.charAt(0).toUpperCase()}${id.slice(1)}`;

  const buildEffectiveness = (attackerName: string) => Object.keys(chart).reduce((eff, defId) => {
    const damageTaken = chart[defId]?.damageTaken;

    if (damageTaken && attackerName in damageTaken) {
      eff[properName(defId)] = DamageTakenToMultiplier[damageTaken[attackerName]] ?? 1;
    }

    return eff;
  }, {} as Record<string, number>);

  const cache: Record<string, unknown> = {};

  const get = (id: string) => {
    const key = formatId(id);

    // '???' & unknown ids -> defer to the stock chart
    if (!key || !(key in chart)) {
      return fallback.get(id as never);
    }

    if (!cache[key]) {
      const name = properName(key);

      cache[key] = {
        kind: 'Type',
        id: key,
        name,
        effectiveness: buildEffectiveness(name),
      };
    }

    return cache[key];
  };

  return {
    get,
    * [Symbol.iterator]() {
      // eslint-disable-next-line no-restricted-syntax
      for (const id of Object.keys(chart)) {
        yield get(id);
      }
    },
  } as unknown as Types;
};

/**
 * Returns the `types` property used in the `Generation` class.
 *
 * * Note that the object returned by `Dex.types.get()` (from the global `Dex` object) does not
 *   include properties like `effectiveness` that is provided by the `get()` method of the `Types` class.
 * * Pokéathlon adaptation: the type effectiveness is derived from a `damageTaken` chart instead of
 *   `@smogon/calc`'s static 18-type chart. This adds support for the server's **custom types**
 *   (Cosmic, Nuclear, Crystal, Sound, Light, ...) & picks up server-side tweaks to the standard
 *   matchups, keeping damage calcs accurate.
 *   - When `modId` resolves to a bundled, authoritative server chart, that is used (preferred).
 *   - Otherwise falls back to the live client's `window.BattleTypeChart`, then to the stock `Types`.
 *
 * @param gen Generation number for the stock `Types` fallback.
 * @param modId Pokéathlon server mod id (e.g. `'gen9soulstones'`) from `getPokeathlonModId()`, if any.
 * @since 1.0.3
 */
export const getTypesDex = (
  gen: GenerationNum,
  modId?: string,
): Types => {
  // prefer the bundled, authoritative server chart when this format maps to one
  const slug = modId ? modId.replace(/^gen\d+/, '') : null;
  const bundled = slug ? BundledCharts[slug] : null;

  if (bundled) {
    const key = `${slug}:${gen}`;

    if (!cachedTypesDex.has(key)) {
      cachedTypesDex.set(key, buildTypesDex(gen, bundled));
    }

    return cachedTypesDex.get(key);
  }

  const chart = (typeof window !== 'undefined'
    && (window as unknown as { BattleTypeChart?: DamageTakenChart })?.BattleTypeChart)
    || null;

  if (!chart || typeof chart !== 'object') {
    return new Types(gen);
  }

  // invalidate the live cache if the chart object changed (e.g. switched into a different mod's battle)
  if (chart !== cachedLiveChart) {
    cachedLiveChart = chart;

    [...cachedTypesDex.keys()]
      .filter((k) => k.startsWith('live:'))
      .forEach((k) => cachedTypesDex.delete(k));
  }

  const key = `live:${gen}`;

  if (!cachedTypesDex.has(key)) {
    cachedTypesDex.set(key, buildTypesDex(gen, chart));
  }

  return cachedTypesDex.get(key);
};
