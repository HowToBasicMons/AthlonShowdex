import { formatId } from '@showdex/utils/core';

/**
 * Context available when resolving a Pokéathlon custom-ability stat modifier.
 *
 * * Mirrors the conditions the live client's `calculateModifiedStats()` checks for these abilities.
 * * All fields optional — an omitted field means "unknown / not in that state", so a conditional
 *   rule simply won't apply (which is the safe default, e.g. in the damage-calc path where the
 *   battle field isn't available).
 *
 * @since 1.0.5
 */
export interface PokeathlonAbilityContext {
  /** Sanitized active weather id (e.g. `'sand'`, `'hail'`, `'snow'`, `'sun'`, `'rain'`). */
  weather?: string;
  /** Sanitized active terrain id (e.g. `'grassy'`, `'electric'`, `'psychic'`). */
  terrain?: string;
  /** Whether the holder currently has a non-volatile status condition. */
  status?: boolean;
  /**
   * Active Pokéathlon **server mod id** (e.g. `'gen9soulstones'`), from `getPokeathlonModId()`.
   *
   * * Required to apply any **mod-scoped** rule (see `PokeathlonAbilityStatModRule.scope`) — e.g. an
   *   ability a specific mod *redefines* from its vanilla behavior (Soulstones' Battle Armor →
   *   SpD ×1.2). Un-scoped (custom-name) rules apply regardless.
   */
  modId?: string;
}

/**
 * A Pokéathlon custom-ability stat-multiplier rule.
 *
 * @since 1.0.5
 */
export interface PokeathlonAbilityStatModRule {
  /** Ability ids (via `formatId()`) this rule applies to. */
  abilities: string[];
  /** Stat -> multiplier map (e.g. `{ spa: 2 }` for ×2 Sp. Atk). */
  mods: Partial<Record<Showdown.StatName, number>>;
  /**
   * Optional activation condition. Omit for always-on abilities.
   *
   * * `weather` / `terrain`: the rule applies only if the context's weather/terrain id is in the list.
   * * `status`: the rule applies only if the holder has a non-volatile status.
   */
  condition?: {
    weather?: string[];
    terrain?: string[];
    status?: boolean;
  };
  /**
   * Optional mod scope — a list of mod slugs (e.g. `['soulstones']`, the part after `gen<#>`).
   *
   * * **Required** for any ability a mod *redefines* from a vanilla ability (e.g. Battle Armor),
   *   so the rule doesn't wrongly fire in other formats. Omit for custom-name abilities that only
   *   exist in Pokéathlon mods (safe to apply universally).
   */
  scope?: string[];
}

/**
 * Stat-multiplier effects for Pokéathlon's custom abilities (Insurgence / Uranium / etc.).
 *
 * * Ported 1:1 from the live client's `calculateModifiedStats()` ability checks. `@smogon/calc`
 *   doesn't know these fangame abilities, so Showdex applies them itself — to the displayed final
 *   stats (`calcPokemonFinalStats`, which has full field context) &, for the **always-on** ones, to
 *   the `rawStats` fed into the damage calc (`createSmogonPokemon`).
 * * Conditional rules (weather / terrain / status) are reflected in the displayed stats; only the
 *   unconditional ones are pre-applied to the damage calc (the calc path has no field context).
 *   Vanilla weather/terrain abilities (Chlorophyll, Solar Power, …) are already handled separately.
 *
 * @since 1.0.5
 */
export const PokeathlonAbilityStatMods: PokeathlonAbilityStatModRule[] = [
  // always-on
  { abilities: ['athenian', 'purefocus', 'genius'], mods: { spa: 2 } },
  { abilities: ['sharpcoral'], mods: { atk: 2, spa: 2, def: 0.5, spd: 0.5 } },
  { abilities: ['tormented'], mods: { spa: 1.5 } },

  // status-gated (Guts-style); Attunement is Soulstones-only & boosts SpA (not Atk), so scope it
  { abilities: ['attunement'], mods: { spa: 1.5 }, condition: { status: true }, scope: ['soulstones'] },

  // weather-gated
  { abilities: ['sandydefense'], mods: { def: 1.5, spd: 1.5 }, condition: { weather: ['sand'] } },
  { abilities: ['icecleats'], mods: { spe: 2 }, condition: { weather: ['hail', 'snow'] } },
  { abilities: ['shadowdance'], mods: { spe: 2 }, condition: { weather: ['newmoon'] } },
  { abilities: ['absolution'], mods: { spa: 1.5 }, condition: { weather: ['newmoon'] } },
  { abilities: ['supercell'], mods: { spa: 1.5 }, condition: { weather: ['rain', 'heavyrain', 'newmoon'] } },

  // terrain-gated
  { abilities: ['forestking'], mods: { atk: 1.3333, spa: 1.3333 }, condition: { terrain: ['grassy'] } },
  { abilities: ['psychoslider'], mods: { spe: 2 }, condition: { terrain: ['psychic'] } },

  // --- Soulstones: vanilla abilities the mod redefines (must be mod-scoped!) ---
  { abilities: ['battlearmor'], mods: { spd: 1.2 }, scope: ['soulstones'] },
  { abilities: ['shellarmor'], mods: { def: 1.2 }, scope: ['soulstones'] },
  { abilities: ['snowcloak'], mods: { def: 1.5 }, condition: { weather: ['hail', 'snow'] }, scope: ['soulstones'] },
  { abilities: ['sandveil'], mods: { spd: 1.5 }, condition: { weather: ['sand'] }, scope: ['soulstones'] },
  { abilities: ['overcoat'], mods: { def: 1.1, spd: 1.1 }, condition: { weather: ['sand', 'hail', 'snow'] }, scope: ['soulstones'] },
];

/**
 * Whether the given ability id has *any* rule in {@link PokeathlonAbilityStatMods} (used to decide
 * if it's a Pokéathlon-custom stat ability at all).
 *
 * @since 1.0.5
 */
export const isPokeathlonStatAbility = (
  ability: string,
): boolean => {
  const id = formatId(ability);

  return !!id && PokeathlonAbilityStatMods.some((rule) => rule.abilities.includes(id));
};

/**
 * Computes the net stat multipliers for a Pokéathlon custom ability, given the battle context.
 *
 * * Returns a `{ stat: multiplier }` map (only stats that are actually modified).
 * * `unconditionalOnly` skips every conditional rule — used by the damage-calc path, which has no
 *   field context, so only always-on abilities get pre-applied to `rawStats`.
 *
 * @since 1.0.5
 */
export const getPokeathlonAbilityStatMods = (
  ability: string,
  context: PokeathlonAbilityContext = {},
  unconditionalOnly = false,
): Partial<Record<Showdown.StatName, number>> => {
  const id = formatId(ability);

  if (!id) {
    return {};
  }

  const output: Partial<Record<Showdown.StatName, number>> = {};

  // active mod slug (e.g. 'soulstones') derived from the modId, for mod-scoped rules
  const activeModSlug = context.modId ? context.modId.replace(/^gen\d+/, '') : null;

  PokeathlonAbilityStatMods.forEach((rule) => {
    if (!rule.abilities.includes(id)) {
      return;
    }

    // mod-scoped rules (e.g. a vanilla ability a mod redefines) only apply in their mod
    if (rule.scope?.length && (!activeModSlug || !rule.scope.includes(activeModSlug))) {
      return;
    }

    if (rule.condition) {
      if (unconditionalOnly) {
        return;
      }

      const { weather, terrain, status } = rule.condition;

      if (weather?.length && !weather.includes(context.weather)) {
        return;
      }

      if (terrain?.length && !terrain.includes(context.terrain)) {
        return;
      }

      if (status && !context.status) {
        return;
      }
    }

    (Object.entries(rule.mods) as [Showdown.StatName, number][]).forEach(([stat, mult]) => {
      output[stat] = (output[stat] ?? 1) * mult;
    });
  });

  return output;
};

/**
 * A Pokéathlon custom **move-type damage-booster** ability rule.
 *
 * * These abilities multiply the holder's offensive output for moves of a specific type (the fangame
 *   equivalent of Blaze/Transistor for custom types), which `@smogon/calc` doesn't know. Showdex
 *   approximates them as a base-power modifier on the move (see `createSmogonMove()`).
 *
 * @since 1.0.7
 */
export interface PokeathlonAbilityMoveBoostRule {
  /** Ability ids (via `formatId()`) this rule applies to. */
  abilities: string[];
  /** Move types (proper-cased) the boost applies to. */
  moveTypes: string[];
  /** Damage multiplier (e.g. `1.5`, `2`). */
  multiplier: number;
  /** If set, only applies while the holder is at <= 1/3 of its max HP (Blaze/Overgrow-style). */
  requiresLowHp?: boolean;
  /** Mod slugs this applies in (e.g. `['soulstones']`) — see `PokeathlonAbilityStatModRule.scope`. */
  scope?: string[];
}

/**
 * Custom-type offensive booster abilities (Soulstones).
 *
 * * Ported from the server `data/mods/gen9soulstones/abilities.ts` (`onModifyAtk`/`onModifySpA`
 *   gated on `move.type`). Mod-scoped so they never fire in other formats.
 * * Note: Light Bulb & Terrorize *also* halve an incoming type defensively (Dark/Bug respectively);
 *   only their offensive boost is modeled here.
 *
 * @since 1.0.7
 */
export const PokeathlonAbilityMoveBoosts: PokeathlonAbilityMoveBoostRule[] = [
  { abilities: ['affection'], moveTypes: ['Fairy'], multiplier: 1.5, scope: ['soulstones'] },
  { abilities: ['arsonist'], moveTypes: ['Fire'], multiplier: 1.5, scope: ['soulstones'] },
  { abilities: ['requiem'], moveTypes: ['Dark'], multiplier: 1.5, scope: ['soulstones'] },
  { abilities: ['haunted'], moveTypes: ['Ghost'], multiplier: 1.5, scope: ['soulstones'] },
  { abilities: ['bonecollector'], moveTypes: ['Ground'], multiplier: 1.5, scope: ['soulstones'] },
  { abilities: ['virtuoso'], moveTypes: ['Sound'], multiplier: 1.5, scope: ['soulstones'] },
  { abilities: ['hivemind'], moveTypes: ['Bug'], multiplier: 1.5, scope: ['soulstones'] },
  { abilities: ['lightbulb'], moveTypes: ['Light'], multiplier: 2, scope: ['soulstones'] },
  { abilities: ['terrorize'], moveTypes: ['Psychic'], multiplier: 2, scope: ['soulstones'] },
  { abilities: ['maestro'], moveTypes: ['Sound'], multiplier: 1.5, requiresLowHp: true, scope: ['soulstones'] },
  { abilities: ['spellcaster'], moveTypes: ['Psychic'], multiplier: 1.5, requiresLowHp: true, scope: ['soulstones'] },
  { abilities: ['starstruck'], moveTypes: ['Cosmic'], multiplier: 1.5, requiresLowHp: true, scope: ['soulstones'] },
  { abilities: ['irradiate'], moveTypes: ['Light'], multiplier: 1.5, requiresLowHp: true, scope: ['soulstones'] },
  { abilities: ['funeralpyre'], moveTypes: ['Fire', 'Ghost'], multiplier: 2, scope: ['soulstones'] },

  // Insurgence custom-type offensive boosters
  { abilities: ['shadowsynergy'], moveTypes: ['Dark'], multiplier: 1.5, scope: ['insurgence'] },
  { abilities: ['shadowcall'], moveTypes: ['Dark'], multiplier: 1.5, requiresLowHp: true, scope: ['insurgence'] },
  { abilities: ['spiritcall'], moveTypes: ['Ghost'], multiplier: 1.5, requiresLowHp: true, scope: ['insurgence'] },
  { abilities: ['psychocall'], moveTypes: ['Psychic'], multiplier: 1.5, requiresLowHp: true, scope: ['insurgence'] },
];

/**
 * Computes the damage multiplier a custom move-type-booster ability applies to a move of `moveType`.
 *
 * * Returns `1` if the ability doesn't boost that type (or its mod/HP condition isn't met).
 * * `lowHp` = holder is at <= 1/3 max HP; `modId` = active server mod id (for scoping).
 *
 * @since 1.0.7
 */
export const getPokeathlonAbilityMoveBoost = (
  ability: string,
  moveType: string,
  context: { lowHp?: boolean; modId?: string } = {},
): number => {
  const id = formatId(ability);

  if (!id || !moveType) {
    return 1;
  }

  const activeModSlug = context.modId ? context.modId.replace(/^gen\d+/, '') : null;

  return PokeathlonAbilityMoveBoosts.reduce((mult, rule) => {
    if (!rule.abilities.includes(id) || !rule.moveTypes.includes(moveType)) {
      return mult;
    }

    if (rule.scope?.length && (!activeModSlug || !rule.scope.includes(activeModSlug))) {
      return mult;
    }

    if (rule.requiresLowHp && !context.lowHp) {
      return mult;
    }

    return mult * rule.multiplier;
  }, 1);
};

/**
 * Custom **defensive** type-resist abilities — the holder takes reduced damage from a move type
 * (the `onSourceModifyAtk`/`onSourceModifySpA` halves in the server data).
 *
 * * Modeled as a damage multiplier applied off the **defender's** ability in `createSmogonMove()`.
 * * Note: these are `breakable` on the server (Mold Breaker & co. ignore them); that nuance isn't
 *   modeled here.
 *
 * @since 1.0.7
 */
export const PokeathlonAbilityIncomingMoveMods: PokeathlonAbilityMoveBoostRule[] = [
  // Soulstones: Light Bulb halves incoming Dark; Terrorize halves incoming Bug
  { abilities: ['lightbulb'], moveTypes: ['Dark'], multiplier: 0.5, scope: ['soulstones'] },
  { abilities: ['terrorize'], moveTypes: ['Bug'], multiplier: 0.5, scope: ['soulstones'] },
  // Soulstones: attacker's offensive stat halved vs these types (onSourceModifyAtk/SpA ×0.5)
  { abilities: ['astralmajesty'], moveTypes: ['Light', 'Dragon'], multiplier: 0.5, scope: ['soulstones'] },
  { abilities: ['irredeemable'], moveTypes: ['Light', 'Fairy'], multiplier: 0.5, scope: ['soulstones'] },
  { abilities: ['realism'], moveTypes: ['Ghost', 'Fairy'], multiplier: 0.5, scope: ['soulstones'] },
  { abilities: ['tropicalhide'], moveTypes: ['Grass', 'Water'], multiplier: 0.5, scope: ['soulstones'] },

  // custom type-immunity abilities (multiplier 0 = the move deals no damage). @smogon/calc doesn't
  // know these, so it'd otherwise calc full damage against an immune holder.
  { abilities: ['disenchant'], moveTypes: ['Fairy'], multiplier: 0, scope: ['uranium'] }, // Uranium
  { abilities: ['leadskin'], moveTypes: ['Nuclear'], multiplier: 0, scope: ['uranium'] }, // Uranium
  { abilities: ['windywall'], moveTypes: ['Flying'], multiplier: 0, scope: ['chaos'] }, // Chaos
  // Infinity: Crystalline takes halved damage from Ground & Water (breakable; Mold Breaker nuance not modeled)
  { abilities: ['crystalline'], moveTypes: ['Ground', 'Water'], multiplier: 0.5, scope: ['infinity'] },
];

/**
 * Computes the damage multiplier a **defender's** custom type-resist ability applies to an incoming
 * move of `moveType` (e.g. Soulstones' Light Bulb taking 0.5x from Dark). Returns `1` if none.
 *
 * @since 1.0.7
 */
export const getPokeathlonAbilityIncomingMoveMod = (
  defenderAbility: string,
  moveType: string,
  context: { modId?: string } = {},
): number => {
  const id = formatId(defenderAbility);

  if (!id || !moveType) {
    return 1;
  }

  const activeModSlug = context.modId ? context.modId.replace(/^gen\d+/, '') : null;

  return PokeathlonAbilityIncomingMoveMods.reduce((mult, rule) => {
    if (!rule.abilities.includes(id) || !rule.moveTypes.includes(moveType)) {
      return mult;
    }

    if (rule.scope?.length && (!activeModSlug || !rule.scope.includes(activeModSlug))) {
      return mult;
    }

    return mult * rule.multiplier;
  }, 1);
};

/**
 * Hydra formes for Lernean, ordered by ascending head count (5 -> 9 hits).
 *
 * * Index in this list == `nhits - 5`, mirroring the server's `formes.indexOf()` (see
 *   `gen9chaos/abilities.ts` `onBasePower`/`onModifyMove`).
 * * The base name (no suffix) is the 5-hit forme; `-Six`..`-Nine` add one hit each.
 *
 * @since 1.0.8
 */
const LerneanForme = ['Hydreigon-Mega', 'Hydroupa'];
const LerneanSuffixes = ['', '-Six', '-Seven', '-Eight', '-Nine'];

/**
 * Computes the net base-power multiplier for a Pokéathlon custom **base-power** ability the
 * `@smogon/calc` doesn't know — keyed off the move's category & the holder's forme/fusion.
 *
 * * **Dual Mastery** (`dualmastery`, Chaos): 1.3x to whichever category is currently primed. The
 *   server alternates Physical<->Special after each damaging hit; a static calc has no move history,
 *   so we model it as "primed for the move being evaluated" (i.e. always 1.3x on the current move).
 * * **Lernean** (`lernean`, Chaos/Insurgence): turns the move into a `5 + index` multihit at reduced
 *   per-hit BP; the net output multiplier is `1.15 + 0.075 * (nhits - 5)` (5 hits -> 1.15x, 9 hits
 *   -> 1.45x). `nhits` is derived from the HP-tier forme suffix (`-Six`..`-Nine`) or `fusion` name.
 *   Modeled as net damage, not literal multihit (the calc's per-hit interactions aren't reproduced).
 * * Returns `1` when the ability doesn't apply.
 *
 * @since 1.0.8
 */
export const getPokeathlonAbilityBasePowerMod = (
  ability: string,
  context: { moveCategory?: string; speciesForme?: string; fusion?: string } = {},
): number => {
  const id = formatId(ability);

  if (!id) {
    return 1;
  }

  // ponytail: alternation state isn't tracked (no move history in a static calc), so the boost is
  // shown as active for the current move -- matches how Protosynthesis & co. are always shown active.
  if (id === 'dualmastery') {
    return context.moveCategory && context.moveCategory !== 'Status' ? 1.3 : 1;
  }

  if (id === 'lernean') {
    const { speciesForme, fusion } = context;

    for (const name of LerneanForme) {
      const formes = LerneanSuffixes.map((suffix) => name + suffix);

      let index = speciesForme ? formes.indexOf(speciesForme) : -1;

      if (index < 0 && fusion) {
        index = formes.indexOf(fusion);
      }

      if (index >= 0) {
        const nhits = 5 + index;

        return 1.15 + (0.075 * (nhits - 5));
      }
    }
  }

  return 1;
};

/**
 * `-ate`-style custom-type changer abilities (Soulstones): rewrite a move's type before the calc
 * resolves type-effectiveness & the `typeChangerBoosted` +20% BP bump (that bump rides the existing
 * `MoveBoost` table keyed on the *new* type).
 *
 * * Mirrors the four servers' `onModifyType` in `gen9soulstones/abilities.ts` exactly: same
 *   `fromType -> toType` map, same `noModifyType` exclusion list, same Z/Tera/Max guards.
 * * `blacklight` Light->Dark, `darkmatter` Normal->Cosmic, `whiteout` Dark->Light,
 *   `illuminate` Normal->Light.
 *
 * @since 1.0.8
 */
const PokeathlonTypeChangers: Record<string, { from: string; to: string }> = {
  blacklight: { from: 'Light', to: 'Dark' },
  darkmatter: { from: 'Normal', to: 'Cosmic' },
  whiteout: { from: 'Dark', to: 'Light' },
  illuminate: { from: 'Normal', to: 'Light' },
};

// mirrors the server `noModifyType` list shared by all four onModifyType handlers
const PokeathlonNoModifyType = [
  'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
];

/**
 * Resolves the post-`onModifyType` move type for a Soulstones `-ate`-style changer ability, or `null`
 * when no change applies (wrong original type, excluded move, or a non-changer ability).
 *
 * @since 1.0.8
 */
export const getPokeathlonAbilityMoveType = (
  attackerAbility: string,
  moveType: string,
  move: { id?: string; isZ?: boolean; isMax?: boolean; isStatus?: boolean; isTeraBlast?: boolean; terastallized?: boolean },
  context: { modId?: string } = {},
): string => {
  const id = formatId(attackerAbility);

  if (!id || !moveType) {
    return null;
  }

  // these abilities only exist in Soulstones; guard by mod scope like the boost rules do
  const activeModSlug = context.modId ? context.modId.replace(/^gen\d+/, '') : null;

  if (activeModSlug !== 'soulstones') {
    return null;
  }

  const changer = PokeathlonTypeChangers[id];

  if (!changer || moveType !== changer.from) {
    return null;
  }

  // server guards: skip fixed-type moves (unless Max), non-status Z-moves, and Tera Blast while Tera'd
  const moveId = move?.id ? formatId(move.id) : null;

  if (moveId && PokeathlonNoModifyType.includes(moveId) && !move.isMax) {
    return null;
  }

  if (move?.isZ && !move.isStatus) {
    return null;
  }

  if (move?.isTeraBlast && move.terastallized) {
    return null;
  }

  return changer.to;
};
