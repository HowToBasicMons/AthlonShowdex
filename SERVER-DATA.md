# Pokéathlon Server Data — reference & extraction plan

The authoritative source for **every** Pokéathlon fangame/mod is the server repo:
[`pokeathlon/pokemon-showdown`](https://github.com/pokeathlon/pokemon-showdown), under `data/`.

Cloned locally (shallow, read-only, ~30 MB) at the workspace root:
`../pokeathlon-server/` (sibling to `pokeathlon-client/`). Not tracked by this repo.

## What's in `data/mods/`

Each mod ships a full dataset (`pokedex.ts`, `moves.ts`, `abilities.ts`, `items.ts`, `typechart.ts`,
`learnsets.ts`, `conditions.ts`, `scripts.ts`):

- `gen9infinitefusion`, `gen9infinity`, `gen9insurgence`, `gen9uranium`, `gen9mariomon`,
  `gen9soulstones`, `gen9chaos`, `gen9chaosfusion`, `gen9pokeathlon`
- plus gen6/gen7 versions (`gen6insurgence`, `gen6uranium`, `gen6infinity`, `gen7infinitefusion`, …)

## What Showdex already gets for free (live, per-mod)

At runtime the client loads each mod's data into `BattlePokedex` / `BattleMovedex` /
`BattleAbilities` / `BattleItems` / `BattleTypeChart`, and Showdex reads those live. So these are
**already correct for every mod** with no bundling on our part:

- **Type charts & custom types** (Sound/Light/Cosmic/Nuclear/Crystal + per-mod tweaks) — via
  `getTypesDex()` reading `window.BattleTypeChart`.
- **Base stats, formes, movepools/learnsets, move data, item descriptions, abilities lists** — read
  live from the active mod's dex.
- **Fusion typing/stats** — read from `Dex.mod('gen9infinitefusion')`.

This is why the calc already "just works" across mods for the dex-level stuff.

## The real gap: calc-relevant *effects*

`@smogon/calc` can't execute the server's `onModify*` / `onBasePower` hooks, and the live
`BattleAbilities`/`BattleItems` only carry descriptions — not the effect code. So **stat/damage
modifiers from custom abilities, items & weather** must be hand-ported into Showdex's tables:

- `src/consts/dex/pokeathlonAbilities.ts` (`PokeathlonAbilityStatMods`)
- `src/consts/dex/pokeathlonItems.ts` (`PokeathlonItemStatMods`)
- weather mods (e.g. New Moon) in `createSmogonMove.ts` + `consts/dex/weather.ts`

Today these cover the Pokéathlon battle-tooltip subset. The server data lets us extend them to **all**
mods authoritatively.

### Scope (stat/BP-modifying ability hooks per mod)

Counted via `onModify{Atk,Def,SpA,SpD,Spe,Damage}|onBasePower`:

| Mod | hooks |
| --- | --- |
| gen9soulstones | ~110 |
| gen9insurgence | ~35 |
| gen9chaos | ~24 |
| gen9uranium | ~16 |
| gen9mariomon | ~4 |
| gen9infinity | ~3 |
| gen9infinitefusion | 0 |

(Items add more on top, e.g. `gen9soulstones/items.ts` is ~117 KB.)

## Recommended approach (incremental, low-risk)

Do this **mod-by-mod**, never in one big drop — each batch is a small table addition + tests, so
nothing destabilizes:

1. Pick a mod (suggest **Soulstones** first — biggest payoff, and we already support its New Moon).
2. In `../pokeathlon-server/data/mods/<mod>/abilities.ts` & `items.ts`, grep for the *simple,
   calc-relevant* effects: flat stat multipliers (`this.chainModify`, `onModifyAtk` returning a
   mult), weather/terrain/status-gated ones, and base-power mults.
3. Skip anything that isn't a clean stat/damage multiplier (complex conditional logic, secondary
   effects, etc.) — those aren't worth approximating and risk wrong numbers.
4. Add entries to `PokeathlonAbilityStatMods` / `PokeathlonItemStatMods` with the right condition
   (weather/terrain/status), mirroring the existing pattern.
5. Add a couple of unit tests to `pokeathlonMods.test.ts`, `pnpm test`, `pnpm build`, smoke-test live.

This keeps every release safe while steadily widening accurate cross-fangame support.

## Handy commands

```bash
# list a mod's data files
ls ../pokeathlon-server/data/mods/gen9soulstones

# find stat-modifying abilities in a mod
grep -nE "onModify(Atk|Def|SpA|SpD|Spe|Damage)|onBasePower" ../pokeathlon-server/data/mods/gen9soulstones/abilities.ts
```

## Per-mod porting status (v1.0.6 line)

| Mod | Status | Notes |
| --- | --- | --- |
| **Soulstones** | ✅ done | redefined-vanilla abilities (Battle/Shell Armor, Snow Cloak, Sand Veil, Overcoat), Attunement (SpA), 13 custom-type offensive boosters, Light Bulb/Terrorize defender resist, Orion orbs ×2. Skipped: Superconductive (frostbite-specific status), Stakeout (turn-state). |
| **Insurgence** | ✅ done | custom-type "call" boosters (Shadow Synergy/Call, Spirit Call, Psycho Call); Delta items (Dragon Fang/Scale, Light Ball→Pikachu-Delta). Shared abilities reuse Soulstones rules. |
| **Chaos** | ✅ done | sandydefense/psychoslider/anchor reuse existing rules; Windy Wall (Flying immunity) added; onBasePower abilities are vanilla (@smogon/calc). Skipped: Bushido (turn-order), Natural Anomaly (conditional), Light Ball on Pikachu *fusions* (niche). |
| **Uranium** | ✅ done | Sharp Coral reused; custom type-immunity abilities Disenchant (Fairy) & Lead Skin (Nuclear) added (×0). No custom stat items. |
| **Mariomon** | ✅ done | Goomba Boots / Sturdy Shell already covered; Defeatist is vanilla (@smogon/calc). No new code. |
| **Infinity** | ✅ done | Pure Focus reused; Crystalline (halves incoming Ground/Water) added. No custom stat items. |
| **Infinite Fusion** | ✅ engine done | fusion stats/typing/sprites/expert moves; 0 stat-hook abilities. |

**Cross-cutting (works for all mods):** per-mod dex routing (types/stats/learnsets/items), live type chart, mod-scoped ability stat-mods, custom-type offensive boosters, defender type-resists.

**General unmodelable patterns (skipped across mods):** turn-order conditions (moves first / foe's first turn), specific custom-status gates we don't track (frostbite), and ally-dependent effects.
