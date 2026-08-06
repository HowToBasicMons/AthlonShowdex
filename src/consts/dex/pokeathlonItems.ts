import { formatId } from '@showdex/utils/core';

/**
 * A Pokéathlon custom-item stat-multiplier rule.
 *
 * * `@smogon/calc` doesn't know about Pokéathlon's custom items, so their stat effects must be
 *   applied by Showdex — both to the displayed final stats (`calcPokemonFinalStats`) & to the
 *   `rawStats` fed into the damage calc (`createSmogonPokemon`).
 *
 * @since 1.0.3
 */
export interface PokeathlonItemStatModRule {
  /** Item ids (via `formatId()`) this rule applies to. */
  items: string[];

  /**
   * Holder species ids (via `formatId()`) required for the rule to apply.
   *
   * * Omit (or leave empty) for items that work on any holder.
   * * For fusions, matched against **either** the Head (`speciesForme`) or Body (`fusion`).
   */
  species?: string[];

  /** Stat -> multiplier map (e.g. `{ spe: 2 }` for ×2 Speed). */
  mods: Partial<Record<Showdown.StatName, number>>;
}

/**
 * Stat-multiplier effects for Pokéathlon's custom items.
 *
 * * Derived from the live client's `BattleItems` descriptions.
 * * Only includes items whose effect is a **base/raw stat multiplier** (the calc-relevant kind);
 *   type-power boosts, SE-damage shields, coverage "swords" & crit items are handled elsewhere.
 *
 * @since 1.0.3
 */
export const PokeathlonItemStatMods: PokeathlonItemStatModRule[] = [
  { items: ['goombaboots'], species: ['goomba', 'goombastack'], mods: { spe: 2 } },
  { items: ['sturdyshell'], species: ['koopatroopa', 'paratroopa', 'drybones', 'hammerbro'], mods: { def: 2 } },
  { items: ['sharpcoral'], species: ['cuboneorion', 'marowakorion'], mods: { atk: 2 } },
  { items: ['arcanespellbook'], species: ['omanyteorion', 'omastarorion'], mods: { spa: 2 } },
  { items: ['focusingorb'], species: ['clamperlorion'], mods: { def: 2, spd: 2 } },
  { items: ['radiantorb'], species: ['illumiseorion'], mods: { spa: 2, spd: 2 } },
  { items: ['voidheart'], species: ['volbeatorion'], mods: { atk: 2, def: 2 } },
  { items: ['dandelight'], species: ['delcattyorion', 'delcattytemporal'], mods: { def: 1.25, spd: 1.25 } },
  // Anchor: holder's Spe is halved (any holder); Dhelmise additionally gets 1.5x Atk
  { items: ['anchor'], mods: { spe: 0.5 } },
  { items: ['anchor'], species: ['dhelmise'], mods: { atk: 1.5 } },
  { items: ['assaultarmor'], mods: { def: 1.5 } },
  { items: ['musclearmor'], mods: { def: 1.1 } },
  { items: ['wisevest'], mods: { spd: 1.1 } },

  // Insurgence: items redefined for Delta-forme holders (species-gated, so effectively Insurgence-only).
  // dragonfang/dragonscale `inherit` their vanilla effect (@smogon/calc still applies the 1.2x Dragon
  // power), so we only add the Clamperl-Delta stat doubling on top. Light Ball is extended to
  // Pikachu-Delta (whose baseSpecies isn't "Pikachu", so @smogon/calc wouldn't catch it).
  { items: ['dragonfang'], species: ['clamperldelta'], mods: { atk: 2 } },
  { items: ['dragonscale'], species: ['clamperldelta'], mods: { def: 2 } },
  { items: ['lightball'], species: ['pikachudelta'], mods: { atk: 2, spa: 2 } },
];

/**
 * Computes the net stat multipliers for a held Pokéathlon custom item on a given holder.
 *
 * * Returns a `{ stat: multiplier }` map (only stats that are actually modified).
 * * `speciesFormes` may include the Head &/or Body (for fusions); a species-conditional rule
 *   applies if **any** of them match.
 *
 * @since 1.0.3
 */
export const getPokeathlonItemStatMods = (
  item: string,
  ...speciesFormes: string[]
): Partial<Record<Showdown.StatName, number>> => {
  const itemId = formatId(item);

  if (!itemId) {
    return {};
  }

  const speciesIds = speciesFormes.filter(Boolean).map((s) => formatId(s));
  const output: Partial<Record<Showdown.StatName, number>> = {};

  PokeathlonItemStatMods.forEach((rule) => {
    if (!rule.items.includes(itemId)) {
      return;
    }

    if (rule.species?.length && !rule.species.some((id) => speciesIds.includes(id))) {
      return;
    }

    (Object.entries(rule.mods) as [Showdown.StatName, number][]).forEach(([stat, mult]) => {
      output[stat] = (output[stat] ?? 1) * mult;
    });
  });

  return output;
};
