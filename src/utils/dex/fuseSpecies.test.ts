import { describe, expect, it } from 'vitest';
import {
  fuseBaseStats,
  fuseStat,
  fuseTypes,
  getFusionBodyStanceFormes,
  getPokeathlonModId,
  orderFusionTypes,
} from './fuseSpecies';

// Pokéathlon Infinite Fusion reference base stats (from the gen9 dex).
const AEGISLASH = { hp: 60, atk: 50, def: 150, spa: 50, spd: 150, spe: 60 } as Showdown.StatsTable;
const DOUBLADE = { hp: 59, atk: 110, def: 150, spa: 45, spd: 49, spe: 35 } as Showdown.StatsTable;

describe('fuseStat', () => {
  it('biases HP/SpA/SpD toward the Head (2/3 head, 1/3 body)', () => {
    expect(fuseStat('hp', 100, 40)).toBe(80); // floor(100*2/3 + 40/3)
    expect(fuseStat('spa', 90, 30)).toBe(70); // floor(90*2/3 + 30/3)
    expect(fuseStat('spd', 150, 49)).toBe(116); // floor(150*2/3 + 49/3)
  });

  it('biases Atk/Def/Spe toward the Body (1/3 head, 2/3 body)', () => {
    expect(fuseStat('atk', 100, 40)).toBe(60); // floor(100/3 + 40*2/3)
    expect(fuseStat('def', 150, 150)).toBe(150);
    expect(fuseStat('spe', 60, 35)).toBe(43); // floor(60/3 + 35*2/3)
  });

  it('floors the weighted sum', () => {
    expect(fuseStat('hp', 60, 59)).toBe(59); // floor(59.666...)
    expect(fuseStat('spa', 50, 45)).toBe(48); // floor(48.333...)
  });
});

describe('fuseBaseStats — Aegislash (Shield) + Doublade', () => {
  it('produces the expected Shield-forme fused table', () => {
    expect(fuseBaseStats(AEGISLASH, DOUBLADE)).toEqual({
      hp: 59,
      atk: 90,
      def: 150,
      spa: 48,
      spd: 116,
      spe: 43,
    });
  });
});

describe('Stance Change (PIF) — Blade swaps the FINAL Atk<->Def & SpA<->SpD stats', () => {
  // Note: PIF fuses from the Shield base stats; the Blade swap is applied to the FINAL computed stats
  // (post EV/IV/nature) in calcPokemonFinalStats (display) & createSmogonPokemon (calc), NOT to the base
  // stats. This illustrates the swap operation (here on the fused Shield table for brevity).
  it('trades the two stat pairs (Def investment effectively becomes Atk)', () => {
    const shield = fuseBaseStats(AEGISLASH, DOUBLADE);
    const blade = {
      ...shield, atk: shield.def, def: shield.atk, spa: shield.spd, spd: shield.spa,
    };

    expect(blade).toEqual({
      hp: 59,
      atk: 150, // was Def 150
      def: 90, // was Atk 90
      spa: 116, // was SpD 116
      spd: 48, // was SpA 48
      spe: 43, // unchanged
    });
  });
});

describe('fuseTypes', () => {
  it('takes the Head primary + Body bonus (last) type', () => {
    expect(fuseTypes(['Fairy', 'Flying'], ['Bug', 'Fire'])).toEqual(['Fairy', 'Fire']);
  });

  it('keeps a shared typing as mono (Set dedupe)', () => {
    expect(fuseTypes(['Steel', 'Ghost'], ['Steel', 'Ghost'])).toEqual(['Steel', 'Ghost']);
  });

  it('normalizes a Normal/Flying pair down to Flying', () => {
    expect(fuseTypes(['Normal', 'Flying'], ['Water'])).toEqual(['Flying', 'Water']);
  });

  it('applies Redundancy Avoidance when the bonus duplicates the primary', () => {
    // Head Fire + Body [Water, Fire]: bonus Fire collides w/ primary -> falls back to Body primary
    expect(fuseTypes(['Fire'], ['Water', 'Fire'])).toEqual(['Fire', 'Water']);
  });

  it('returns the other half when one side is empty', () => {
    expect(fuseTypes([], ['Dragon'])).toEqual(['Dragon']);
    expect(fuseTypes(['Dragon'], [])).toEqual(['Dragon']);
  });
});

describe('orderFusionTypes', () => {
  it('swaps the primary/secondary for the swapped-type species (e.g. Magnemite)', () => {
    expect(orderFusionTypes('Magnemite', ['Electric', 'Steel'])).toEqual(['Steel', 'Electric']);
  });

  it('leaves normal species type order unchanged', () => {
    expect(orderFusionTypes('Togekiss', ['Fairy', 'Flying'])).toEqual(['Fairy', 'Flying']);
  });
});

describe('getPokeathlonModId', () => {
  it('maps full mod keywords to their server mod id', () => {
    expect(getPokeathlonModId('gen9soulstonesou')).toBe('gen9soulstones');
    expect(getPokeathlonModId('gen9insurgenceou')).toBe('gen9insurgence');
    expect(getPokeathlonModId('gen9uraniumou')).toBe('gen9uranium');
    expect(getPokeathlonModId('gen9infinityou')).toBe('gen9infinity');
    expect(getPokeathlonModId('gen9mariomonou')).toBe('gen9mariomon');
    expect(getPokeathlonModId('gen9infinitefusionou')).toBe('gen9infinitefusion');
    expect(getPokeathlonModId('gen9chaosou')).toBe('gen9chaos');
    expect(getPokeathlonModId('gen9chaosfusionou')).toBe('gen9chaosfusion');
  });

  it('maps abbreviations without mis-matching longer keywords', () => {
    expect(getPokeathlonModId('gen9ifdexou')).toBe('gen9infinitefusion'); // if -> infinitefusion
    expect(getPokeathlonModId('gen9newlandsou')).toBe('gen9infinitefusion');
    expect(getPokeathlonModId('gen9insrandombattle')).toBe('gen9insurgence');
    expect(getPokeathlonModId('gen6urarandombattle')).toBe('gen6uranium');
    expect(getPokeathlonModId('gen6infrandombattle')).toBe('gen6infinity');
  });

  it('respects the gen prefix', () => {
    expect(getPokeathlonModId('gen6insurgenceou')).toBe('gen6insurgence');
    expect(getPokeathlonModId('gen7infinitefusionou')).toBe('gen7infinitefusion');
  });

  it('returns null for non-mod / vanilla formats', () => {
    expect(getPokeathlonModId('gen9ou')).toBeNull();
    expect(getPokeathlonModId('gen9randombattle')).toBeNull();
    expect(getPokeathlonModId('gen9championsou')).toBeNull();
    expect(getPokeathlonModId('')).toBeNull();
  });
});

describe('getFusionBodyStanceFormes', () => {
  it('returns both Aegislash stance formes when the Body is Aegislash (either stance)', () => {
    expect(getFusionBodyStanceFormes('Aegislash')).toEqual(['Aegislash', 'Aegislash-Blade']);
    expect(getFusionBodyStanceFormes('Aegislash-Blade')).toEqual(['Aegislash', 'Aegislash-Blade']);
  });

  it('returns [] for non-stance Body species or empty input', () => {
    expect(getFusionBodyStanceFormes('Pikachu')).toEqual([]);
    expect(getFusionBodyStanceFormes('')).toEqual([]);
    expect(getFusionBodyStanceFormes(undefined)).toEqual([]);
  });
});
