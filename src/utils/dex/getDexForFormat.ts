import { type GenerationNum } from '@smogon/calc';
import { formatId } from '@showdex/utils/core';
import { logger } from '@showdex/utils/debug';
import { detectGenFromFormat } from './detectGenFromFormat';
import { getPokeathlonModId } from './fuseSpecies';

const l = logger('@showdex/utils/dex/getDexForFormat()');

/**
 * Positive cache of resolved Pokéathlon mod `Dex`es, keyed by format id, so the guarded `Dex.mod()`
 * probe runs at most once per mod format (hot path). Only successful resolutions are cached — misses
 * are cheap to recompute (the keyword regex returns null instantly for vanilla formats) & must not be
 * cached, in case the mod's data simply hadn't loaded yet on the first call.
 */
const cachedModDex: Record<string, Showdown.ModdedDex> = {};

/**
 * Returns the appropriate `Dex` object for the passed-in `format`.
 *
 * * For BDSP formats, returns a modded `Dex` containing all the Gen 4 Pokemon normally unavailable in Gen 8.
 * * For other formats, returns a `Dex` for the current gen specified in the `format`.
 *   - Gen value is obtained via `detectGenFromFormat()`.
 * * If no `format` is provided or an invalid gen was returned from the `format`,
 *   the global `Dex` object is returned instead, which should default to the current gen.
 * * Note that `format` can also be a number representing the gen number.
 *
 * @since 1.0.2
 */
export const getDexForFormat = (format?: string | GenerationNum): Showdown.ModdedDex => {
  if (typeof Dex === 'undefined') {
    if (__DEV__) {
      l.warn(
        'Global Dex object is not available.',
        '\n', 'format', format,
        '\n', '(You will only see this warning on development.)',
      );
    }

    return null;
  }

  if (!format) {
    return Dex;
  }

  // note: checking if `format > 0` in the conditional won't guarantee that `format` will
  // be type `string` after this point
  if (typeof format === 'number') {
    return format > 0 ? Dex.forGen(format) : Dex;
  }

  const formatAsId = formatId(format);

  if (formatAsId.includes('letsgo')) {
    return Dex.mod('gen7letsgo');
  }

  if (formatAsId.includes('bdsp')) {
    return Dex.mod('gen8bdsp');
  }

  if (formatAsId.includes('champions')) {
    return Dex.mod('champions');
  }

  const gen = detectGenFromFormat(formatAsId);

  if (typeof gen !== 'number' || gen < 1) {
    return Dex;
  }

  // Pokéathlon custom mods (Soulstones, Insurgence, Uranium, Infinity, Mariomon, Chaos, Infinite
  // Fusion, ...): return the server's modded Dex so per-mod move types (e.g. Soulstones' Aura Sphere
  // → Light, Hyper Voice/Boomburst → Sound), base stats, learnsets, abilities & items resolve — the
  // base gen Dex doesn't have these. Guarded since Dex.mod() throws on an unregistered mod id; only
  // successful resolutions are cached. Falls back to the base gen Dex on any miss (behaves as before).
  if (cachedModDex[formatAsId]) {
    return cachedModDex[formatAsId];
  }

  const modId = getPokeathlonModId(formatAsId);

  if (modId) {
    try {
      const moddedDex = Dex.mod(modId as Parameters<typeof Dex.mod>[0]);

      // probe that the mod is actually usable (Dex.mod() can return a dex whose data isn't loaded yet)
      if (moddedDex?.moves?.get('tackle')?.exists) {
        cachedModDex[formatAsId] = moddedDex;

        return moddedDex;
      }
    } catch {
      // unregistered/unavailable mod — fall through to the base gen Dex below
    }
  }

  return Dex.forGen(gen);
};
