import { type AbilityName, type MoveName, Move as SmogonMove } from '@smogon/calc';
import { MOVES } from '@smogon/calc/dist/data/moves';
import { getPokeathlonAbilityBasePowerMod, getPokeathlonAbilityIncomingMoveMod, getPokeathlonAbilityMoveBoost, getPokeathlonAbilityMoveType } from '@showdex/consts/dex';
import { type CalcdexBattleField, type CalcdexMoveOverride, type CalcdexPokemon } from '@showdex/interfaces/calc';
import { clamp, formatId } from '@showdex/utils/core';
import {
  detectGenFromFormat,
  determineCriticalHit,
  determineMoveTargets,
  getGenDexForFormat,
  getPokeathlonModId,
} from '@showdex/utils/dex';
// import { calcMoveBasePower } from './calcMoveBasePower';
import { calcPokemonHpPercentage } from './calcPokemonHp';
import { getMoveOverrideDefaults } from './getMoveOverrideDefaults';
import { shouldBoostTeraStab } from './shouldBoostTeraStab';

/**
 * Overrides for `SmogonMove`.
 *
 * * Note that `SmogonMove` internally uses `bp` for base power, but looks for `basePower` from the `dex` or `overrides`.
 *
 * @see https://github.com/smogon/damage-calc/blob/efa6fe7c9d9f8415ea0d1bab17f95d7bcfbf617f/calc/src/move.ts#L116
 * @since 1.0.6
 */
export type SmogonMoveOverrides = Omit<Partial<InstanceType<typeof SmogonMove>>, 'bp'> & {
  basePower?: number;
};

export const createSmogonMove = (
  format: string,
  pokemon: CalcdexPokemon,
  moveName: MoveName,
  opponentPokemon: CalcdexPokemon,
  field?: CalcdexBattleField,
): [move: SmogonMove, overrides: CalcdexMoveOverride] => {
  // using the Dex global for the gen arg of SmogonMove seems to work here lol
  const dex = getGenDexForFormat(format);
  const gen = detectGenFromFormat(format);

  if (!dex || !gen || !pokemon?.speciesForme || !moveName) {
    return null;
  }

  const {
    speciesForme,
    teraType: revealedTeraType,
    dirtyTeraType,
    terastallized,
    ability: revealedAbility,
    dirtyAbility,
    item: revealedItem,
    dirtyItem,
    stellarMoveMap,
    moveOverrides,
    useZ,
    useMax,
  } = pokemon;

  const teraType = dirtyTeraType || revealedTeraType;
  const ability = dirtyAbility || revealedAbility;
  const item = dirtyItem ?? revealedItem;

  const options: ConstructorParameters<typeof SmogonMove>[2] = {
    species: speciesForme,
    ability,
    item,

    // only apply one of them, not both!
    useZ: useZ && !useMax,
    useMax,
    // isStellarFirstUse: false, // note: populated below

    // for moves that always crit, we need to make sure the crit doesn't apply when Z/Max'd
    isCrit: determineCriticalHit(pokemon, moveName, { format }),
  };

  const defaultOverrides = getMoveOverrideDefaults(format, pokemon, moveName, opponentPokemon, field);
  const overrides: SmogonMoveOverrides = { ...determineMoveTargets(format, pokemon, moveName) };

  // update (2024/07/20): need access to drain[] for result.recovery(), but the Showdown dex doesn't have it :c
  // (tho Showdown's & Smogon's dexes both provide recoil[] in the same format: [numerator: number, denominator: number] to form the damage ratio)
  // fortunately for us, we're already bundling all move data that comes with @smogon/calc, so why not make use of it? LOL
  const smogonMoveData = MOVES[gen][moveName];

  if (Array.isArray(smogonMoveData?.drain)) {
    overrides.drain = [...smogonMoveData.drain];
  }

  // check if the user specified any overrides for this move
  const calcdexOverrides: CalcdexMoveOverride = { ...defaultOverrides, ...moveOverrides?.[moveName] };
  const {
    type: typeOverride,
    category: categoryOverride,
    basePower: basePowerOverride,
    zBasePower: zBasePowerOverride,
    maxBasePower: maxBasePowerOverride,
    alwaysCriticalHits: criticalHitOverride,
    hits: hitsOverride,
    stellar: stellarOverride,
    defensiveStat: defensiveStatOverride,
    offensiveStat: offensiveStatOverride,
  } = calcdexOverrides;

  // pretty much only used for Beat Up (which is typeless in gens 2-4)
  const forceTypeless = moveName === 'Beat Up' as MoveName && gen < 5;

  if (forceTypeless || typeOverride) {
    overrides.type = (forceTypeless ? '???' : typeOverride) as SmogonMoveOverrides['type'];
  }

  // Pokéathlon (Soulstones) -ate-style type changers: Black Light (Light->Dark), Dark Matter
  // (Normal->Cosmic), Whiteout (Dark->Light), Illuminate (Normal->Light). Rewrite the move type
  // BEFORE the SmogonMove is built so the calc computes type-effectiveness on the NEW type, and the
  // +20% typeChangerBoosted BP bump keys off it. Only applies when the user hasn't forced a manual
  // type override (mirrors the server onModifyType running on the base move type).
  if (!forceTypeless && !typeOverride) {
    const dexMove = dex.moves.get(moveName as Parameters<typeof dex.moves.get>[0]);
    const baseMoveType = (overrides.type as string) || dexMove?.type;
    const attackerAbility = dirtyAbility || revealedAbility;

    const retyped = baseMoveType && attackerAbility && getPokeathlonAbilityMoveType(
      attackerAbility,
      baseMoveType,
      {
        id: dexMove?.id,
        isZ: options.useZ,
        isMax: options.useMax,
        isStatus: dexMove?.category === 'Status',
        isTeraBlast: moveName === 'Tera Blast' as MoveName,
        terastallized,
      },
      { modId: getPokeathlonModId(format) },
    );

    if (retyped) {
      overrides.type = retyped as SmogonMoveOverrides['type'];
    }
  }

  if (categoryOverride) {
    overrides.category = categoryOverride;
  }

  const overrodeBasePower = typeof basePowerOverride === 'number';

  overrides.basePower = clamp(0, overrodeBasePower ? basePowerOverride : (defaultOverrides?.basePower || 0));

  // update (2023/01/02): @smogon/calc added an alliesFainted property to their Pokemon class,
  // so no need to manually provide that functionality now; specified in createSmogonPokemon()
  // (also, didn't remove it from calcMoveBasePower() since we still want to show the actual BP in the UI)
  const removeBasePowerOverride = overrides.basePower < 1 || (
    !overrodeBasePower && (
      ability === 'Supreme Overlord' as AbilityName
        || shouldBoostTeraStab(format, pokemon, moveName, overrides.basePower)
    )
  );

  if (removeBasePowerOverride) {
    delete overrides.basePower;
  }

  // only supply this if it's true (otherwise, use the pre-determined value)
  if (criticalHitOverride) {
    options.isCrit = criticalHitOverride;
  }

  if (hitsOverride) {
    options.hits = hitsOverride;

    if (!Array.isArray(calcdexOverrides.hitBasePowers)) {
      calcdexOverrides.hitBasePowers = [...(defaultOverrides.hitBasePowers || [])];
    }

    calcdexOverrides.hitBasePowers = calcdexOverrides.hitBasePowers.slice(0, clamp(0, options.hits));

    if (calcdexOverrides.hitBasePowers.length) {
      delete overrides.basePower;
    }
  }

  if (defensiveStatOverride) {
    overrides.overrideDefensiveStat = defensiveStatOverride;
  }

  if (offensiveStatOverride) {
    overrides.overrideOffensiveStat = offensiveStatOverride;
  }

  // always on for the Terapagos-Stellar, otherwise, one successful move per type only
  if (teraType === 'Stellar' && terastallized) {
    const dexMove = dex.moves.get(moveName as Parameters<typeof dex.moves.get>[0]);
    const { type: typeFromDex } = dexMove || {};
    const moveType = overrides.type || typeFromDex;

    options.isStellarFirstUse = stellarOverride ?? (
      speciesForme === 'Terapagos-Stellar'
        || (!!moveType && !stellarMoveMap?.[moveType])
    );
  }

  const smogonMove = new SmogonMove(dex, moveName, {
    ...options,
    overrides,
  });

  // for Z/Max base powers, SmogonMove performs a lookup with dex.moves.get(),
  // which is too much work to override, so we'll directly update the move's `bp` property
  const overrideUltBp = (move: SmogonMove) => {
    if (options.useZ && typeof zBasePowerOverride === 'number') {
      move.bp = Math.max(zBasePowerOverride, 0);
    } else if (options.useMax && typeof maxBasePowerOverride === 'number') {
      move.bp = Math.max(maxBasePowerOverride, 0);
    }
  };

  // Pokéathlon (Soulstones) New Moon weather: boosts Ghost/Dark-type damage by 1.35x & reduces
  // Fairy-type damage to 0.75x. @smogon/calc doesn't know this custom weather, so we approximate the
  // damage multiplier as a base-power modifier on the move fed into the calc (negated by Air Lock /
  // Cloud Nine on either side, same as vanilla weather).
  const newMoonFactor = (() => {
    if (!field) {
      return 1;
    }

    const weatherId = formatId(field.dirtyWeather ?? (field.autoWeather || field.weather));

    if (weatherId !== 'newmoon') {
      return 1;
    }

    const negators = ['airlock', 'cloudnine'];
    const attackerAbility = formatId(pokemon.dirtyAbility || pokemon.ability);
    const defenderAbility = formatId(opponentPokemon?.dirtyAbility || opponentPokemon?.ability);

    if (negators.includes(attackerAbility) || negators.includes(defenderAbility)) {
      return 1;
    }

    const moveType = (overrides.type as string) || dex.moves.get(moveName as Parameters<typeof dex.moves.get>[0])?.type;

    if (moveType === 'Ghost' || moveType === 'Dark') {
      return 1.35;
    }

    if (moveType === 'Fairy') {
      return 0.75;
    }

    return 1;
  })();

  // resolved move type (override wins, else the mod dex's type) for the ability-boost check below
  const resolvedMoveType = (overrides.type as string)
    || dex.moves.get(moveName as Parameters<typeof dex.moves.get>[0])?.type;

  // Pokéathlon custom-type offensive abilities (Soulstones): e.g. Virtuoso (Sound ×1.5), Light Bulb
  // (Light ×2), Affection (Fairy ×1.5), plus HP-gated ones (Maestro/Starstruck/… at <= 1/3 HP).
  // @smogon/calc doesn't know these, so approximate the offensive multiplier as a base-power mod.
  const abilityMoveBoost = (() => {
    const attackerAbility = pokemon.dirtyAbility || pokemon.ability;

    if (!attackerAbility || !resolvedMoveType) {
      return 1;
    }

    const hpPercentage = calcPokemonHpPercentage(pokemon);

    return getPokeathlonAbilityMoveBoost(attackerAbility, resolvedMoveType, {
      lowHp: hpPercentage > 0 && hpPercentage <= 1 / 3,
      modId: getPokeathlonModId(format),
    });
  })();

  // Pokéathlon defender type-resist abilities (Soulstones): e.g. Light Bulb takes 0.5x from Dark,
  // Terrorize takes 0.5x from Bug — keyed off the OPPONENT (defender) ability + this move's type.
  const abilityIncomingMod = (() => {
    const defenderAbility = opponentPokemon?.dirtyAbility || opponentPokemon?.ability;

    if (!defenderAbility || !resolvedMoveType) {
      return 1;
    }

    return getPokeathlonAbilityIncomingMoveMod(defenderAbility, resolvedMoveType, {
      modId: getPokeathlonModId(format),
    });
  })();

  // Pokéathlon custom base-power abilities keyed off move category / holder forme: Dual Mastery
  // (1.3x, Chaos) & Lernean (net multihit multiplier, Chaos/Insurgence). @smogon/calc doesn't know
  // these, so approximate their net output as a base-power mod.
  const abilityBasePowerMod = (() => {
    const attackerAbility = pokemon.dirtyAbility || pokemon.ability;

    if (!attackerAbility) {
      return 1;
    }

    return getPokeathlonAbilityBasePowerMod(attackerAbility, {
      moveCategory: (overrides.category as string)
        || dex.moves.get(moveName as Parameters<typeof dex.moves.get>[0])?.category,
      speciesForme: pokemon.speciesForme,
      fusion: pokemon.fusion,
    });
  })();

  const bpFactor = newMoonFactor * abilityMoveBoost * abilityIncomingMod * abilityBasePowerMod;

  // applies all our post-construction `bp` mods (calculate() rebuilds the move via clone(), so this
  // must run on both the original & the clone)
  const applyBpMods = (move: SmogonMove) => {
    overrideUltBp(move);

    if (bpFactor !== 1 && move.bp > 0) {
      move.bp = Math.max(0, Math.floor(move.bp * bpFactor));
    }
  };

  // note: this directly modifies the passed-in smogonMove (hence no return value)
  applyBpMods(smogonMove);

  // calculate() from @smogon/calc will clone() the move before it's passed to the mechanics function,
  // which will remove our `bp` overrides since the SmogonMove constructor will recalculate the `bp` value again!
  smogonMove.clone = () => {
    const clonedMove = new SmogonMove(dex, moveName, {
      ...options,

      // not sure if these will change later
      hits: smogonMove.hits,
      timesUsed: smogonMove.timesUsed,
      timesUsedWithMetronome: smogonMove.timesUsedWithMetronome,

      overrides,
    });

    applyBpMods(clonedMove);

    return clonedMove;
  };

  return [smogonMove, calcdexOverrides];
};
