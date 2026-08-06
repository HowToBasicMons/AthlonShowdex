import { type TypeName } from '@smogon/calc';
import { formatId } from '@showdex/utils/core';

/**
 * Pokéathlon Infinite Fusion mechanics (Showdex side).
 *
 * Faithful port of the live battle-client logic (`getPokemonTypes` / `getStats`
 * in `pokeathlon-battle-tooltips.js`), so the Calcdex derives typing and base
 * stats identical to the Pokéathlon Showdown server for any Head + Body pair.
 *
 * - Head: the named species (`speciesForme`). Source of the primary type & the
 *   special-stat bias (HP, Sp. Atk, Sp. Def).
 * - Body: the fusion partner (`fusion`). Source of the bonus type & the
 *   physical-stat bias (Atk, Def, Spe).
 */

const SPECIAL_BIASED = ['hp', 'spa', 'spd'] as const;

/**
 * Species whose primary/secondary types are **swapped** for fusion-typing purposes.
 *
 * * Per the Infinite Fusion typing rules (6.x), these Pokémon "pass on" the swapped type order to
 *   fusions (e.g. Magnemite contributes Steel/Electric rather than its official Electric/Steel).
 * * Showdex reads from the base gen Pokédex (official type order), so this swap must be applied
 *   to reconcile with the live Pokéathlon server's fusion typing.
 * * Keyed by species id (`formatId(name)`).
 *
 * @since 1.3.0
 */
export const SwappedFusionTypeSpecies = new Set<string>([
  'magnemite',
  'magneton',
  'magnezone',
  'spiritomb',
  'ferroseed',
  'ferrothorn',
  'phantump',
  'trevenant',
  'sandygast',
  'palossand',
]);

/**
 * Returns a species' types in the order it contributes to a fusion.
 *
 * * For most species this is just their natural type order; for the species in
 *   `SwappedFusionTypeSpecies` the primary/secondary are swapped first.
 *
 * @since 1.3.0
 */
export const orderFusionTypes = (
  forme: string,
  types: readonly TypeName[],
): readonly TypeName[] => {
  if (types?.length === 2 && SwappedFusionTypeSpecies.has(formatId(forme))) {
    return [types[1], types[0]];
  }

  return types;
};

/** Matches Infinite Fusion formats (where the fusion mechanic is active). */
export const InfiniteFusionFormatRegex = /^gen\d+(?:if|newlands)/i;

/**
 * Whether the given format (genful id, e.g. `'gen7ifdexou'`) is an Infinite
 * Fusion format, in which the fusion mechanic applies.
 *
 * @since 1.3.0
 */
export const detectInfiniteFusionFormat = (
  format: string,
): boolean => !!format && InfiniteFusionFormatRegex.test(format);

/**
 * Matches any **Pokéathlon custom-mod format** — i.e., a fangame mod with its own roster, moves,
 * items &/or types that don't exist in the standard Smogon dataset.
 *
 * * Covers Infinite Fusion (`if`/`newlands`/`infinitefusion`), Insurgence (`insurgence`/`ins`),
 *   Uranium (`uranium`/`ura`), Infinity (`infinity`/`inf`), Mariomon, Chaos & Soulstones.
 * * The abbreviated keywords (e.g. `ins`, `ura`, `inf`) are required since several formats use them
 *   (e.g. `gen9inshbfdraft`, `gen6urarandombattle`, `gen6infrandombattle`).
 * * Anchored to the gen prefix so it can't false-positive on standard formats.
 *
 * @since 1.3.0
 */
export const PokeathlonModFormatRegex = /^gen\d+(?:if|newlands|infinitefusion|insurgence|ins|uranium|ura|infinity|inf|mariomon|chaos|soulstones)/i;

/**
 * Whether the given format (genful id, e.g. `'gen9soulstonesou'`) is a custom Pokéathlon mod format.
 *
 * * Used to gate off Smogon preset/usage downloads (which don't apply to these custom rosters) &
 *   rely on the Pokéathlon server's own usage data instead.
 *
 * @since 1.3.0
 */
export const detectPokeathlonModFormat = (
  format: string,
): boolean => !!format && PokeathlonModFormatRegex.test(format);

/**
 * Ordered [keyword regex, mod slug] pairs mapping a (genless) Pokéathlon format to its server mod.
 *
 * * Order matters: longer/more-specific keywords come first so abbreviations don't mis-match (e.g.
 *   `infinitefusion` before `if`, `insurgence` before `ins`, `infinity`/`inf` after the fusion ones).
 *
 * @since 1.0.7
 */
const PokeathlonModSlugs: [RegExp, string][] = [
  [/^(?:infinitefusion|newlands|if)/, 'infinitefusion'],
  [/^chaosfusion/, 'chaosfusion'],
  [/^chaos/, 'chaos'],
  [/^soulstones/, 'soulstones'],
  [/^(?:insurgence|ins)/, 'insurgence'],
  [/^(?:uranium|ura)/, 'uranium'],
  [/^(?:infinity|inf)/, 'infinity'],
  [/^mariomon/, 'mariomon'],
  [/^pokeathlon/, 'pokeathlon'],
];

/**
 * Resolves the Pokéathlon **server mod id** (e.g. `'gen9soulstones'`) for a battle format, or `null`
 * if the format isn't a recognized custom mod.
 *
 * * Used by `getDexForFormat()` to return the correct modded `Dex` so per-mod move types (e.g.
 *   Soulstones' Aura Sphere → Light, Hyper Voice/Boomburst → Sound), base stats, learnsets, abilities
 *   & items resolve everywhere — instead of falling back to the base gen dex.
 *
 * @example getPokeathlonModId('gen9soulstonesou') // 'gen9soulstones'
 * @since 1.0.7
 */
export const getPokeathlonModId = (
  format: string,
): string => {
  if (!format) {
    return null;
  }

  const match = /^gen(\d+)(.+)$/.exec(formatId(format));

  if (!match) {
    return null;
  }

  const [, gen, rest] = match;
  const found = PokeathlonModSlugs.find(([re]) => re.test(rest));

  return found ? `gen${gen}${found[1]}` : null;
};

/** Normalizes a Normal/Flying type pair down to `['Flying']` (reference parity). */
const normalizeTypes = (
  types: readonly TypeName[],
): TypeName[] => (
  types?.length === 2 && types.includes('Flying') && types.includes('Normal')
    ? ['Flying']
    : [...(types || [])]
);

/**
 * Computes the fused typing from a Head and Body species' types.
 *
 * Mirrors `getPokemonTypes`: Head's first type is primary, the Body's last type
 * is the Bonus Type, deduplicated via a `Set` (which yields Redundancy
 * Avoidance & a mono-type result when the bonus collides with the primary).
 *
 * @since 1.3.0
 */
export const fuseTypes = (
  headTypes: readonly TypeName[],
  bodyTypes: readonly TypeName[],
): TypeName[] => {
  const head = normalizeTypes(headTypes);
  const body = normalizeTypes(bodyTypes);

  if (!head.length) {
    return body;
  }

  if (!body.length) {
    return head;
  }

  const typesSet = new Set<TypeName>([head[0]]);
  const bonusType = body[body.length - 1];

  typesSet.add(bonusType);

  // Redundancy Avoidance: if the Body is dual-typed & its bonus duplicated the
  // primary, fall back to the Body's primary type instead.
  if (body.length === 2 && typesSet.size === 1) {
    typesSet.add(body[0]);
  }

  return Array.from(typesSet);
};

/**
 * Computes the fused typing **authoritatively** by reading Head & Body types from the
 * `gen9infinitefusion` mod dex — exactly mirroring the live client's `getPokemonTypes()`.
 *
 * * The IF mod's species data already encodes the correct (sometimes swapped) type order, so no
 *   manual swap table is needed here. This is preferred over the base-dex + `orderFusionTypes()`
 *   approach since it can't drift from the server.
 * * Returns `null` if the client / IF mod data isn't available, so callers can fall back.
 *
 * @since 1.0.4
 */
export const fuseTypesFromMod = (
  headForme: string,
  bodyForme: string,
): TypeName[] => {
  if (typeof Dex === 'undefined' || !headForme || !bodyForme) {
    return null;
  }

  try {
    const mod = (Dex as unknown as {
      mod?: (id: string) => { species?: { get?: (f: string) => { exists?: boolean; types?: TypeName[] } } };
    })?.mod?.('gen9infinitefusion');

    const head = mod?.species?.get?.(headForme);
    const body = mod?.species?.get?.(bodyForme);

    if (head?.exists && body?.exists && head.types?.length && body.types?.length) {
      // fuseTypes() applies the exact same Set-based algorithm the client uses
      return fuseTypes(head.types, body.types);
    }
  } catch {
    // fall through -> caller uses its base-dex fallback
  }

  return null;
};

/**
 * Computes a single fused base stat.
 *
 * HP / Sp. Atk / Sp. Def are biased toward the Head (2/3 head, 1/3 body).
 * Atk / Def / Spe are biased toward the Body (1/3 head, 2/3 body).
 * The floor is applied to the full weighted sum.
 *
 * @since 1.3.0
 */
export const fuseStat = (
  stat: Showdown.StatName,
  headStat: number,
  bodyStat: number,
): number => (
  (SPECIAL_BIASED as readonly string[]).includes(stat)
    ? Math.floor((headStat * 2) / 3 + bodyStat / 3)
    : Math.floor(headStat / 3 + (bodyStat * 2) / 3)
);

/**
 * Computes the full fused base-stat table from a Head and Body base-stat table.
 *
 * @since 1.3.0
 */
export const fuseBaseStats = (
  headStats: Showdown.StatsTable,
  bodyStats: Showdown.StatsTable,
): Showdown.StatsTable => (['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as Showdown.StatName[])
  .reduce((prev, stat) => {
    prev[stat] = fuseStat(stat, headStats?.[stat] ?? 0, bodyStats?.[stat] ?? 0);

    return prev;
  }, {} as Showdown.StatsTable);

/**
 * Aegislash's two Stance Change formes, in toggle order (Shield first).
 *
 * @since 1.0.7
 */
export const AegislashStanceFormes: readonly string[] = ['Aegislash', 'Aegislash-Blade'];

/**
 * Returns the Stance Change formes a fusion's **Body** (`fusion`) can toggle between, or `[]` if it
 * has none.
 *
 * * Pokéathlon Infinite Fusion: when Aegislash is the *Head*, its Shield/Blade formes already live in
 *   `altFormes` (so the PokeInfo forme switcher offers them). But when Aegislash is the *Body*, the
 *   switcher is Head-based & never sees them — so this exposes the Body's stance formes for a manual
 *   toggle (which flips the `fusion` field, re-fusing the swapped Atk<->Def & SpA<->SpD stats).
 * * Currently only Aegislash has a Stance Change forme pair; detection mirrors the `syncPokemon()`
 *   emulation (any `aegislash` / `aegislash-blade` id).
 *
 * @example getFusionBodyStanceFormes('Aegislash') // ['Aegislash', 'Aegislash-Blade']
 * @example getFusionBodyStanceFormes('Pikachu') // []
 * @since 1.0.7
 */
export const getFusionBodyStanceFormes = (
  fusion?: string,
): string[] => (
  !!fusion && formatId(fusion).replace(/blade$/, '') === 'aegislash'
    ? [...AegislashStanceFormes]
    : []
);

/**
 * Per-fusion-pair preferred sprite "alt" variants, keyed by `{headNum}.{bodyNum}`.
 *
 * * Ported from the Pokéathlon usage-stats generator's `preferred_alts` map.
 * * Pokéathlon fusion sprites can have multiple community variants distinguished by a trailing
 *   letter (e.g. `269.34b.png`); these are the variants chosen as the default for each pair.
 *
 * @since 1.3.0
 */
export const PreferredFusionSpriteAlts: Record<string, string> = {
  '269.34': 'b', // Togeking
  '455.248': 'b', // Toxitar
  '275.348': 'a', // Poryesect
  '275.255': 'a', // Porymagius
  '299.212': 'b', // Garzor
  '449.377': 'a', // Regidreigon
  '361.227': 'a', // Krookomory
  '381.500': 'b', // Jiancie
  '339.296': 'a', // Sylcario
  '275.149': 'a', // Porynite
  '339.149': 'b', // Sylnite
  '367.348': 'a', // Chandelesect
  '143.355': 'a', // Snoreloom
  '197.329': 'a', // Umbslash
  '248.151': 'a', // Tyranew
  '334.244': 'a', // Flytei
};

/**
 * Returns the Pokéathlon **fusion name** for a Head + Body pair (e.g. `Jirachi` + `Hawlucha` →
 * `'Jilucha'`), straight from the live client's `getFusionData()`.
 *
 * * Used to display the proper fusion name in the Calcdex when the player hasn't set a nickname.
 * * Returns `null` if the client isn't available, either species is missing, or no fusion name
 *   exists for the pair.
 *
 * @since 1.3.0
 */
export const getFusionName = (
  headForme: string,
  bodyForme: string,
): string => {
  if (typeof Dex === 'undefined' || !headForme || !bodyForme) {
    return null;
  }

  try {
    const getData = (Dex as unknown as {
      getFusionData?: (p: { species: string; fusion: string }) => { nickname?: string };
    })?.getFusionData;

    if (typeof getData !== 'function') {
      return null;
    }

    // try the exact formes first, then fall back to the base species for each half (e.g. battle
    // formes like 'Aegislash-Blade' have no fusion data of their own — the fusion identity lives on
    // the base 'Aegislash'), so the proper fusion name survives an Aegislash stance change.
    const headBase = Dex.species?.get?.(headForme)?.baseSpecies || headForme;
    const bodyBase = Dex.species?.get?.(bodyForme)?.baseSpecies || bodyForme;

    return getData({ species: headForme, fusion: bodyForme })?.nickname
      || getData({ species: headBase, fusion: bodyBase })?.nickname
      || null;
  } catch {
    return null;
  }
};

/**
 * Builds the Pokéathlon fusion sprite URL for a Head + Body pair.
 *
 * Ported from the Pokéathlon client / usage-stats generator:
 * `…/sprites/fusion-sprites/{headNum}.{bodyNum}{alt}.png`, where the Head (`speciesForme`) supplies
 * the first National Dex number & the Body (`fusion`) the second, with an optional preferred-alt
 * suffix (see `PreferredFusionSpriteAlts`).
 *
 * * Returns `null` when either species can't be resolved to a positive Dex number (e.g. an
 *   unrecognized Body, or a pre-defined fusion species that isn't a two-species fusion).
 * * The resource origin is taken from the live client's `Dex.resourcePrefix` (so it points at
 *   whichever Pokéathlon mirror is serving the client), falling back to `play.pokeathlon.com`.
 *
 * @since 1.3.0
 */
export const getFusionSpriteUrl = (
  headForme: string,
  bodyForme: string,
): string => {
  if (typeof Dex === 'undefined' || !headForme || !bodyForme) {
    return null;
  }

  // client-exact: use the live client's own getFusionData() to compute the sprite "extension"
  // (handles head/body ordering + alt-sprite variants exactly like the battle view)
  try {
    const getData = (Dex as unknown as {
      getFusionData?: (p: { species: string; fusion: string }) => { extension?: string };
    })?.getFusionData;

    if (typeof getData === 'function') {
      // try the exact formes, then fall back to each half's base species — battle formes like
      // 'Aegislash-Blade' return an empty extension (the fusion sprite lives on the base 'Aegislash'),
      // so this keeps the fused sprite intact through an Aegislash stance change.
      const headBase = Dex.species?.get?.(headForme)?.baseSpecies || headForme;
      const bodyBase = Dex.species?.get?.(bodyForme)?.baseSpecies || bodyForme;

      const ext = getData({ species: headForme, fusion: bodyForme })?.extension
        || getData({ species: headBase, fusion: bodyBase })?.extension;

      if (ext) {
        return `https://play.pokeathlon.com/sprites/fusion-sprites/${ext}.png`;
      }
    }
  } catch {
    // fall through to the number-based computation below
  }

  const headNum = Dex.species?.get?.(headForme)?.num;
  const bodyNum = Dex.species?.get?.(bodyForme)?.num;

  if (!headNum || !bodyNum || headNum < 1 || bodyNum < 1) {
    return null;
  }

  const alt = PreferredFusionSpriteAlts[`${headNum}.${bodyNum}`] || '';

  // fusion sprites live on the Pokéathlon server itself (confirmed 200 at this path; the standard
  // sprite dirs 404 here), regardless of what Dex.resourcePrefix resolves to.
  return `https://play.pokeathlon.com/sprites/fusion-sprites/${headNum}.${bodyNum}${alt}.png`;
};
