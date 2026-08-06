import { describe, expect, it } from 'vitest';
import { getTypesDex } from './getTypesDex';

// effectiveness is keyed by DEFENDER proper-name; value is the multiplier the move (attacker type)
// deals to that defender. e.g. getTypesDex(9, 'gen9soulstones').get('ground').effectiveness.Cosmic
// = how much damage a Ground move deals to a Cosmic-type defender.

describe('getTypesDex (bundled Pokéathlon charts)', () => {
  it('uses the authoritative Soulstones chart for custom-type matchups', () => {
    const types = getTypesDex(9, 'gen9soulstones');

    const ground = types.get('ground' as never) as unknown as { effectiveness: Record<string, number> };
    const sound = types.get('sound' as never) as unknown as { effectiveness: Record<string, number> };
    const fire = types.get('fire' as never) as unknown as { effectiveness: Record<string, number> };

    // Soulstones overrides: Cosmic is immune to Ground & Sound (code 3), resists Fire (code 2)
    expect(ground.effectiveness.Cosmic).toBe(0);
    expect(sound.effectiveness.Cosmic).toBe(0);
    expect(fire.effectiveness.Cosmic).toBe(0.5);
  });

  it('uses the comprehensive base chart for mods without overrides (pokeathlon)', () => {
    const types = getTypesDex(9, 'gen9pokeathlon');

    const fire = types.get('fire' as never) as unknown as { effectiveness: Record<string, number> };

    // base chart: Cosmic is immune to Fire (code 3)
    expect(fire.effectiveness.Cosmic).toBe(0);
  });

  it('caches per (mod, gen) & returns a stable resolver', () => {
    expect(getTypesDex(9, 'gen9soulstones')).toBe(getTypesDex(9, 'gen9soulstones'));
    expect(getTypesDex(9, 'gen9soulstones')).not.toBe(getTypesDex(9, 'gen9pokeathlon'));
  });

  it('falls back to the stock Types when no mod & no client chart', () => {
    const types = getTypesDex(9);

    // standard matchup still resolves (Water super effective vs Fire)
    const water = types.get('water' as never) as unknown as { effectiveness: Record<string, number> };

    expect(water.effectiveness.Fire).toBeGreaterThan(1);
  });
});
