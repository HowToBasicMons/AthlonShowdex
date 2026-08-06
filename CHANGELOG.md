# Changelog

All notable changes to **Athlon Showdex** (a fork of [doshidak/showdex](https://github.com/doshidak/showdex) for [Pokéathlon](https://play.pokeathlon.com)).

## v1.0.6

Merged **upstream Showdex v1.4.0** into the Pokéathlon fork — all of our work is preserved, with upstream's latest features and fixes layered in.

**From upstream (v1.4.0)**
- **Teledex / Devdex** — a "Dump Bug Report" tool + live log viewer (great for sending us reproducible reports).
- **Preset fixes** — smarter Randoms guessing (don't gate on revealed item, Mega-stone handling), mega/primal forme folding, format-scoped preset pools.
- **Performance** — log ring-buffer, throttled re-renders, hot-path trims.
- A **Mega toggle button** in the moves panel, and an `@smogon/calc` patch sync.

**Fork integrity**
- Verified every Pokéathlon system survived the merge unchanged: fusion engine, custom abilities & items, New Moon, Expert Moves, presets, sprites, types, and the rebrand. The `@smogon/calc` ShowdexCalcMods patch is confirmed applied.

**Full per-mod mechanics support**
- **Per-mod dex routing** — the calc now reads each fangame's own dex, so custom move types resolve everywhere (e.g. Soulstones' Aura Sphere → Light, Hyper Voice/Boomburst → Sound), along with per-mod base stats, learnsets, abilities & items.
- **Custom-type damage abilities** — Soulstones (Virtuoso, Light Bulb, Affection, Maestro, …) & Insurgence (Shadow Synergy/Call, Spirit Call, Psycho Call) boost their type's damage; HP-gated ones included.
- **Type-resist / immunity abilities** — Light Bulb/Terrorize (halve incoming Dark/Bug), Crystalline (halve Ground/Water), and full immunities Disenchant (Fairy), Lead Skin (Nuclear), Windy Wall (Flying).
- **Mod-scoped redefined abilities** — Soulstones' Battle Armor/Shell Armor/Snow Cloak/Sand Veil/Overcoat/Attunement only apply in Soulstones (no leaking into other formats).
- **Custom items** — Soulstones Orion orbs corrected to ×2, Insurgence Delta items (Dragon Fang/Scale, Light Ball → Pikachu-Delta).
- Covers **Soulstones, Insurgence, Uranium, Chaos, Mariomon, Infinity** & Infinite Fusion.

**Authoritative custom-type charts**
- The five custom types (Sound, Light, Cosmic, Nuclear, Crystal) now resolve their immunities/resistances from the **server's own per-mod type charts** (bundled into the extension), instead of the live client chart that could be stale or incomplete. Example: in Soulstones, Cosmic is now correctly immune to Ground & Sound and resists Fire (the client previously reported it immune to Fire).
- Added `scripts/build-pokeathlon-typecharts.mjs` (merges the base chart with each mod's overrides; run via `pnpm build:typecharts`).

**Aegislash Stance Change — fixed**
- Blade forme now swaps the **final computed stats** (Atk↔Def, SpA↔SpD) instead of the base stats, matching Infinite Fusion (your Defense investment effectively becomes Attack). The previous base-stat swap applied EVs to the wrong slot, producing incorrect numbers.
- The manual Shield ⟷ Blade toggle now works when Aegislash is the **body** of a fusion (was head-only), and persists across syncs.

**Frostburn (`frb`)**
- Modeled the special analog of Burn: halves Special-move damage (skipped with Guts), mirroring the server which remaps Freeze to it.

**Internal**
- Added regression tests for the custom item/ability stat-mod resolvers, the bundled type-chart resolution, and the fusion stance/forme helpers (now **138** tests total).
- Consolidated on the upstream Vitest config; fixed an incomplete teledex test mock.

## v1.0.5

Official release consolidating the v1.0.4-hotfix.1 fixes plus custom-ability support, an item/type-chart audit, and the first unit tests.

**Aegislash Stance Change (fusions) — matches Pokémon Infinite Fusion**
- Blade forme keeps the **Shield** fusion and **swaps the fused base Atk↔Def and Sp.Atk↔Sp.Def** (the real PIF mechanic), instead of re-fusing with Aegislash-Blade's own base stats.
- Blade forme **persists across battle updates** (no longer reverts to Shield), the manual Shield ⟷ Blade toggle sticks, and it works whether Aegislash is the **head or the body**.
- A fused Aegislash in Blade forme keeps its **fusion name and sprite**.

**Custom abilities**
- Fangame abilities now apply their stat effects to **both** the displayed stats and the damage calc. Covers always-on ones (Athenian / Pure Focus / Genius ×2 SpA, Sharp Coral, Tormented) and weather/terrain/status-gated ones (Sandy Defense, Ice Cleats, Forest King, Psycho Slider, Attunement, Supercell, Shadow Dance, Absolution). The custom **New Moon** weather is now tracked so its abilities resolve.

**New Moon weather**
- Now manually selectable in the weather dropdown, and its damage modifiers (Ghost/Dark ×1.35, Fairy ×0.75) are applied in the calc (as a base-power approximation).

**Expert (signature) moves**
- Now use the client's **full evolution-line expansion** (both Head & Body lines, both orderings, with per-pairing typing) instead of a simplified Head/Body match — fixing missing/over-eager signature moves.

**Other fixes**
- **Eviolite** applies when *either* the head or the body is not-fully-evolved.

**Builds**
- A **Firefox** build is now produced alongside Chrome/Edge.

**Audited (confirmed correct)**
- All 12 custom stat-multiplier items are wired; the client's old dragonfang/dragonscale stat code is a client bug (type-power / evo items) and is correctly excluded.
- The custom type chart is read live from the client, so custom types & server matchup tweaks can't drift.

**Internal**
- First unit tests (`vitest`) locking down the fusion engine (`fuseStat`, `fuseBaseStats`, `fuseTypes`, `orderFusionTypes`, Aegislash Blade swap) — `pnpm test`.
- README rewritten with a mechanics-accuracy / known-limitations / pros-cons section.

## v1.0.4-hotfix.1

**Stance Change (fusions) — rebuilt to match Pokémon Infinite Fusion**
- Blade forme now uses the correct PIF mechanic: it keeps the **Shield** fusion and **swaps the fused base Atk↔Def and Sp.Atk↔Sp.Def** (previously it incorrectly re-fused using Aegislash-Blade's own base stats, giving the wrong numbers).
- Blade forme now **persists across battle updates** instead of snapping back to Shield every sync. Works whether Aegislash is the **head or the body** of the fusion.
- The manual forme toggle (Shield ⟷ Blade) now **sticks**.
- A fused Aegislash in Blade forme keeps its **fusion name and sprite** (no longer renders as a plain Aegislash-Blade).

**Other fixes**
- **Eviolite** now applies when **either** the head or the body is not-fully-evolved (e.g. a fully-evolved head fused with an NFE body like Doublade) — both in the damage calc and the displayed stats.

## v1.0.4

**Fixes**
- Fused typing no longer reverts to the head's typing when a Pokémon switches out and back in.
- Aegislash's **Stance Change** now works on fusions (Shield ↔ Blade, based on the last move used).
- Sprite fallback no longer pulls a **wrong sprite from another format** — falls back to the head's correct sprite, then half/half icons.
- **Dandelight** now applies to the correct forme.

**Improvements**
- **Authoritative fusion typing** — read directly from the Infinite Fusion mod data, matching the server exactly (replaces the previous approximation table).
- **Expert Moves** — fusions now show their signature tutor moves (Fiery Dance, Light of Ruin, Fleur Cannon, Thousand Arrows, …) when they qualify.
- **Mariomon sample sets** — community teams added as named, selectable presets in non-random Mariomon formats.

**Performance**
- Cached the custom type-chart resolver (was rebuilt on every damage calc).
- Cached the Pokéathlon usage download (no re-fetch per battle).

## v1.0.3 and earlier

- Pokéathlon rebrand (Athlon Showdex), Electrode-Mega icon/mascot, Pokéathlon-only injection.
- Infinite Fusion support: fused stats (head/body bias), fused typing, merged ability & move pools, fusion names & sprites.
- Custom types (Sound, Light, Cosmic, Nuclear, Crystal) wired through typing, move types, the type chart & damage.
- Custom-mod format support (Soulstones, Insurgence, Uranium, Infinity, Mariomon, Chaos).
- Pokéathlon usage presets + Mariomon Random Battle set dump.
- Custom item stat-multiplier effects (Goomba Boots, Sturdy Shell, the Orion orbs, Anchor, Assault/Muscle Armor, Wise Vest, …).
- Fixed usage presets leaking across fusions (matched by exact head + body).
