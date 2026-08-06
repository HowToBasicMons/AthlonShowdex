import { describe, expect, it } from 'vitest';
import {
  getPokeathlonAbilityIncomingMoveMod,
  getPokeathlonAbilityMoveBoost,
  getPokeathlonAbilityStatMods,
  isPokeathlonStatAbility,
} from './pokeathlonAbilities';
import { getPokeathlonItemStatMods } from './pokeathlonItems';

describe('getPokeathlonItemStatMods', () => {
  it('applies a species-gated item to a matching holder (Goomba Boots → ×2 Spe)', () => {
    expect(getPokeathlonItemStatMods('Goomba Boots', 'Goomba')).toEqual({ spe: 2 });
  });

  it('matches the species on either the Head or the Body of a fusion', () => {
    // body = Goomba Stack
    expect(getPokeathlonItemStatMods('goombaboots', 'Pikachu', 'Goomba Stack')).toEqual({ spe: 2 });
  });

  it('does not apply a species-gated item to a non-matching holder', () => {
    expect(getPokeathlonItemStatMods('Goomba Boots', 'Pikachu')).toEqual({});
  });

  it('applies an any-holder item (Anchor → ×0.5 Spe) regardless of species', () => {
    expect(getPokeathlonItemStatMods('anchor', 'Snorlax')).toEqual({ spe: 0.5 });
  });

  it('stacks Anchor + Dhelmise (×0.5 Spe and ×1.5 Atk)', () => {
    expect(getPokeathlonItemStatMods('anchor', 'Dhelmise')).toEqual({ spe: 0.5, atk: 1.5 });
  });

  it('returns empty for an unknown / vanilla item', () => {
    expect(getPokeathlonItemStatMods('Choice Band', 'Garchomp')).toEqual({});
    expect(getPokeathlonItemStatMods('', 'Garchomp')).toEqual({});
  });

  it('applies the Orion orbs at their authoritative x2 (Soulstones code, not the stale 1.5x desc)', () => {
    expect(getPokeathlonItemStatMods('Void Heart', 'Volbeat-Orion')).toEqual({ atk: 2, def: 2 });
    expect(getPokeathlonItemStatMods('Radiant Orb', 'Illumise-Orion')).toEqual({ spa: 2, spd: 2 });
  });
});

describe('getPokeathlonAbilityStatMods', () => {
  it('applies always-on abilities (Athenian → ×2 SpA)', () => {
    expect(getPokeathlonAbilityStatMods('Athenian')).toEqual({ spa: 2 });
  });

  it('applies Sharp Coral as both boosts & drops', () => {
    expect(getPokeathlonAbilityStatMods('sharpcoral')).toEqual({
      atk: 2, spa: 2, def: 0.5, spd: 0.5,
    });
  });

  it('gates weather abilities on the active weather', () => {
    expect(getPokeathlonAbilityStatMods('sandydefense', { weather: 'sand' })).toEqual({ def: 1.5, spd: 1.5 });
    expect(getPokeathlonAbilityStatMods('sandydefense', { weather: 'rain' })).toEqual({});
    expect(getPokeathlonAbilityStatMods('sandydefense', {})).toEqual({});
  });

  it('gates terrain abilities on the active terrain', () => {
    expect(getPokeathlonAbilityStatMods('psychoslider', { terrain: 'psychic' })).toEqual({ spe: 2 });
    expect(getPokeathlonAbilityStatMods('psychoslider', { terrain: 'grassy' })).toEqual({});
  });

  it('gates status abilities on a non-volatile status', () => {
    expect(getPokeathlonAbilityStatMods('attunement', { status: true, modId: 'gen9soulstones' })).toEqual({ spa: 1.5 });
    expect(getPokeathlonAbilityStatMods('attunement', { status: false, modId: 'gen9soulstones' })).toEqual({});
  });

  it('resolves New Moon weather abilities', () => {
    expect(getPokeathlonAbilityStatMods('shadowdance', { weather: 'newmoon' })).toEqual({ spe: 2 });
    expect(getPokeathlonAbilityStatMods('supercell', { weather: 'newmoon' })).toEqual({ spa: 1.5 });
    expect(getPokeathlonAbilityStatMods('supercell', { weather: 'rain' })).toEqual({ spa: 1.5 });
  });

  it('skips conditional rules when unconditionalOnly is set (damage-calc path w/o field)', () => {
    // always-on still applies
    expect(getPokeathlonAbilityStatMods('athenian', { weather: 'sand' }, true)).toEqual({ spa: 2 });
    // conditional is skipped even if its condition would otherwise match
    expect(getPokeathlonAbilityStatMods('sandydefense', { weather: 'sand' }, true)).toEqual({});
  });

  it('returns empty for an unknown / vanilla ability', () => {
    expect(getPokeathlonAbilityStatMods('Levitate')).toEqual({});
  });

  it('mod-scoped rules only apply in their mod (Soulstones redefines Battle Armor / Shell Armor)', () => {
    // wrong / no mod context -> vanilla behavior (no stat change)
    expect(getPokeathlonAbilityStatMods('Battle Armor')).toEqual({});
    expect(getPokeathlonAbilityStatMods('Battle Armor', { modId: 'gen9ou' })).toEqual({});
    expect(getPokeathlonAbilityStatMods('Shell Armor', { modId: 'gen9insurgence' })).toEqual({});
    // correct mod -> the redefined stat boost applies
    expect(getPokeathlonAbilityStatMods('Battle Armor', { modId: 'gen9soulstones' })).toEqual({ spd: 1.2 });
    expect(getPokeathlonAbilityStatMods('Shell Armor', { modId: 'gen9soulstones' })).toEqual({ def: 1.2 });
  });

  it('un-scoped custom abilities apply regardless of mod', () => {
    expect(getPokeathlonAbilityStatMods('athenian', { modId: 'gen9ou' })).toEqual({ spa: 2 });
    expect(getPokeathlonAbilityStatMods('athenian', {})).toEqual({ spa: 2 });
  });

  it('isPokeathlonStatAbility flags only known custom stat abilities', () => {
    expect(isPokeathlonStatAbility('athenian')).toBe(true);
    expect(isPokeathlonStatAbility('Sharp Coral')).toBe(true);
    expect(isPokeathlonStatAbility('Levitate')).toBe(false);
  });
});

describe('getPokeathlonAbilityMoveBoost (Soulstones custom-type boosters)', () => {
  const ss = { modId: 'gen9soulstones' };

  it('boosts the matching move type for the ability', () => {
    expect(getPokeathlonAbilityMoveBoost('Virtuoso', 'Sound', ss)).toBe(1.5);
    expect(getPokeathlonAbilityMoveBoost('Affection', 'Fairy', ss)).toBe(1.5);
    expect(getPokeathlonAbilityMoveBoost('Light Bulb', 'Light', ss)).toBe(2);
    expect(getPokeathlonAbilityMoveBoost('Terrorize', 'Psychic', ss)).toBe(2);
  });

  it('does not boost a non-matching move type', () => {
    expect(getPokeathlonAbilityMoveBoost('Virtuoso', 'Normal', ss)).toBe(1);
    expect(getPokeathlonAbilityMoveBoost('Affection', 'Fire', ss)).toBe(1);
  });

  it('only applies in its mod', () => {
    expect(getPokeathlonAbilityMoveBoost('Virtuoso', 'Sound', { modId: 'gen9ou' })).toBe(1);
    expect(getPokeathlonAbilityMoveBoost('Virtuoso', 'Sound', {})).toBe(1);
  });

  it('HP-gated boosters require <= 1/3 HP', () => {
    expect(getPokeathlonAbilityMoveBoost('Maestro', 'Sound', { ...ss, lowHp: true })).toBe(1.5);
    expect(getPokeathlonAbilityMoveBoost('Maestro', 'Sound', { ...ss, lowHp: false })).toBe(1);
    expect(getPokeathlonAbilityMoveBoost('Starstruck', 'Cosmic', { ...ss, lowHp: true })).toBe(1.5);
  });

  it('returns 1 for unknown abilities / empty type', () => {
    expect(getPokeathlonAbilityMoveBoost('Levitate', 'Ghost', ss)).toBe(1);
    expect(getPokeathlonAbilityMoveBoost('Virtuoso', '', ss)).toBe(1);
  });
});

describe('Soulstones redefined weather abilities', () => {
  const ss = (extra = {}) => ({ modId: 'gen9soulstones', ...extra });

  it('Attunement is SpA x1.5 when statused (not Atk), Soulstones-only', () => {
    expect(getPokeathlonAbilityStatMods('Attunement', ss({ status: true }))).toEqual({ spa: 1.5 });
    expect(getPokeathlonAbilityStatMods('Attunement', { status: true })).toEqual({}); // wrong mod
  });

  it('Snow Cloak → Def x1.5 in hail/snow (Soulstones)', () => {
    expect(getPokeathlonAbilityStatMods('Snow Cloak', ss({ weather: 'snow' }))).toEqual({ def: 1.5 });
    expect(getPokeathlonAbilityStatMods('Snow Cloak', ss({ weather: 'sand' }))).toEqual({});
    expect(getPokeathlonAbilityStatMods('Snow Cloak', { weather: 'snow' })).toEqual({}); // wrong mod
  });

  it('Sand Veil → SpD x1.5 in sand; Overcoat → Def/SpD x1.1 in sand/hail/snow (Soulstones)', () => {
    expect(getPokeathlonAbilityStatMods('Sand Veil', ss({ weather: 'sand' }))).toEqual({ spd: 1.5 });
    expect(getPokeathlonAbilityStatMods('Overcoat', ss({ weather: 'hail' }))).toEqual({ def: 1.1, spd: 1.1 });
  });
});

describe('getPokeathlonAbilityIncomingMoveMod (Soulstones defender type-resist)', () => {
  const ss = { modId: 'gen9soulstones' };

  it('halves the resisted incoming type', () => {
    expect(getPokeathlonAbilityIncomingMoveMod('Light Bulb', 'Dark', ss)).toBe(0.5);
    expect(getPokeathlonAbilityIncomingMoveMod('Terrorize', 'Bug', ss)).toBe(0.5);
  });

  it('does nothing for other types / mods / unknowns', () => {
    expect(getPokeathlonAbilityIncomingMoveMod('Light Bulb', 'Fire', ss)).toBe(1);
    expect(getPokeathlonAbilityIncomingMoveMod('Light Bulb', 'Dark', { modId: 'gen9ou' })).toBe(1);
    expect(getPokeathlonAbilityIncomingMoveMod('Levitate', 'Ground', ss)).toBe(1);
  });

  it('custom type-immunity abilities return 0 (Uranium Disenchant/Lead Skin, Chaos Windy Wall)', () => {
    expect(getPokeathlonAbilityIncomingMoveMod('Disenchant', 'Fairy', { modId: 'gen9uranium' })).toBe(0);
    expect(getPokeathlonAbilityIncomingMoveMod('Lead Skin', 'Nuclear', { modId: 'gen9uranium' })).toBe(0);
    expect(getPokeathlonAbilityIncomingMoveMod('Windy Wall', 'Flying', { modId: 'gen9chaos' })).toBe(0);
    // other types / wrong mod unaffected
    expect(getPokeathlonAbilityIncomingMoveMod('Lead Skin', 'Normal', { modId: 'gen9uranium' })).toBe(1);
    expect(getPokeathlonAbilityIncomingMoveMod('Disenchant', 'Fairy', { modId: 'gen9soulstones' })).toBe(1);
  });

  it('Infinity Crystalline halves incoming Ground & Water', () => {
    const inf = { modId: 'gen9infinity' };
    expect(getPokeathlonAbilityIncomingMoveMod('Crystalline', 'Ground', inf)).toBe(0.5);
    expect(getPokeathlonAbilityIncomingMoveMod('Crystalline', 'Water', inf)).toBe(0.5);
    expect(getPokeathlonAbilityIncomingMoveMod('Crystalline', 'Fire', inf)).toBe(1);
  });
});

describe('Insurgence custom-type "call" abilities + Delta items', () => {
  const ins = (extra = {}) => ({ modId: 'gen9insurgence', ...extra });

  it('Shadow Synergy boosts Dark unconditionally; the "call" abilities require <= 1/3 HP', () => {
    expect(getPokeathlonAbilityMoveBoost('Shadow Synergy', 'Dark', ins())).toBe(1.5);
    expect(getPokeathlonAbilityMoveBoost('Shadow Call', 'Dark', ins({ lowHp: true }))).toBe(1.5);
    expect(getPokeathlonAbilityMoveBoost('Shadow Call', 'Dark', ins({ lowHp: false }))).toBe(1);
    expect(getPokeathlonAbilityMoveBoost('Spirit Call', 'Ghost', ins({ lowHp: true }))).toBe(1.5);
    expect(getPokeathlonAbilityMoveBoost('Psycho Call', 'Psychic', ins({ lowHp: true }))).toBe(1.5);
  });

  it('does not apply in other mods', () => {
    expect(getPokeathlonAbilityMoveBoost('Shadow Synergy', 'Dark', { modId: 'gen9soulstones' })).toBe(1);
  });

  it('Insurgence Delta items double the right stat for Delta holders', () => {
    expect(getPokeathlonItemStatMods('Dragon Fang', 'Clamperl-Delta')).toEqual({ atk: 2 });
    expect(getPokeathlonItemStatMods('Dragon Scale', 'Clamperl-Delta')).toEqual({ def: 2 });
    expect(getPokeathlonItemStatMods('Light Ball', 'Pikachu-Delta')).toEqual({ atk: 2, spa: 2 });
    // vanilla Pikachu Light Ball is left to @smogon/calc (not in our table)
    expect(getPokeathlonItemStatMods('Light Ball', 'Pikachu')).toEqual({});
  });
});
