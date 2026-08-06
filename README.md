<p align="center">
  <img alt="athlon-showdex-icon" width="200px" src="./src/assets/favicons/showdex-1024.png">
</p>

<h1 align="center">
  Athlon Showdex
</h1>

<p align="center">
  A fork of <a href="https://github.com/doshidak/showdex"><code>doshidak/showdex</code></a>, adapted for
  <a href="https://play.pokeathlon.com"><strong>Pokéathlon</strong></a> &mdash; the Infinite Fusion + fangame
  Pokémon&nbsp;Showdown server.
</p>

<p align="center">
  <a href="https://github.com/HowToBasicMons/Athlon-Showdex/releases">Releases</a> ·
  <a href="https://play.pokeathlon.com">Pokéathlon</a> ·
  <a href="https://discord.gg/vsEN6mzuNj">Pokéathlon Discord</a>
</p>

<br>

## What is this?

**Athlon Showdex** is the in-battle damage calculator (Calcdex) from [Showdex](https://github.com/doshidak/showdex),
re-tuned so it actually understands Pokéathlon's mechanics. It injects **only** on
[`play.pokeathlon.com`](https://play.pokeathlon.com) and reads straight from the live client, so it stays in sync with
the server's custom data.

## What's different from upstream Showdex

- **Infinite Fusion support** — fused base stats (head/body bias), fused typing, merged ability & move pools, and the
  proper fusion name (e.g. *Jilucha*, *Sylnite*) in the header.
- **Fusion sprites** — pulls Pokéathlon's custom fusion art, with fallbacks to the head's fangame/vanilla sprite (so
  Chaos fusions & artless pairs still render).
- **Custom types** — Sound, Light, Cosmic, Nuclear & Crystal are wired through typing, move types, the type chart and
  damage effectiveness, with immunities/resistances read from the **server's own per-mod type charts**.
- **Custom-mod formats** — Soulstones, Insurgence, Uranium, Infinity, Mariomon & Chaos are recognized; their custom
  rosters/moves/items/types resolve in the calc.
- **Pokéathlon presets** — opponent sets are predicted from Pokéathlon's own usage data (incl. fusion sets, matched by
  exact head+body), plus a bundled **Mariomon Random Battle** set dump.
- **Custom items** — selectable across the board, with stat-multiplier effects (Goomba Boots, Sturdy Shell, the Orion
  orbs, Anchor, Assault/Muscle Armor, Wise Vest, …) applied to both the shown stats and the damage calc.
- **Pokéathlon branding** — Electrode-Mega mascot/icon, Athlon Showdex naming, and Pokéathlon-only injection.

## Install (beta)

Athlon Showdex ships as an **unpacked extension** while it's in beta. There are two builds on the
[Releases](https://github.com/HowToBasicMons/Athlon-Showdex/releases) page:

- **`.zip`** — for **Chromium-based browsers**: Google Chrome, Microsoft Edge, Brave, Opera, Opera GX, Vivaldi, Arc, etc.
- **`.xpi`** — for **Firefox**.

### Chromium browsers (Chrome, Edge, Brave, Opera / Opera GX, Vivaldi, …)

1. Download the latest **`.zip`** and unzip it to a **permanent** folder (don't delete it after — the browser loads
   the extension from this folder).
2. Open your browser's extensions page:
   - Chrome → `chrome://extensions`
   - Edge → `edge://extensions`
   - Brave → `brave://extensions`
   - Opera / Opera GX → `opera://extensions`
   - Vivaldi → `vivaldi://extensions`
   - (or just find **Manage Extensions** in your browser's menu)
3. Enable **Developer mode** (usually a toggle in the top-right or left sidebar).
4. Click **Load unpacked** and select the unzipped folder.
5. Open [`play.pokeathlon.com`](https://play.pokeathlon.com), start or spectate a battle, and hard-refresh
   (**Ctrl+Shift+R**) — the Calcdex appears.

### Firefox

1. Download the latest **`.xpi`**.
2. Go to `about:debugging` → **This Firefox** → **Load Temporary Add-on** and pick the `.xpi`.
   - Note: temporary add-ons are cleared when Firefox restarts, so you'll need to re-load it next session.

### Updating

Download the new build, replace your unzipped folder's contents, then hit the **reload** icon on the extension card
(Chromium) or re-load the `.xpi` (Firefox), and hard-refresh your battle tab.

## Mechanics accuracy & known limitations

Athlon Showdex mirrors Pokéathlon's own client logic as closely as possible, but it's a fan tool — some
things are exact, some are approximations. Here's the honest state of it.

### Working / verified
- **Fused base stats & typing** — head/body bias matches the server; typing is read straight from the Infinite
  Fusion mod data (can't drift).
- **Custom type chart** — the five custom types (Sound / Light / Cosmic / Nuclear / Crystal) resolve their
  immunities & resistances from the **server's own per-mod type charts** (bundled into the extension), so they match
  the server rather than a stale/incomplete live chart.
- **Custom item stat effects** — all 12 stat-multiplier items are wired (Goomba Boots, Sturdy Shell, the Orion orbs,
  Anchor, Assault/Muscle Armor, Wise Vest, Arcane Spellbook, …), in both the shown stats and the damage calc.
- **Aegislash Stance Change on fusions** — Shield ↔ Blade. Blade keeps the Shield fusion and **swaps the FINAL
  on-screen stats** Atk↔Def & SpA↔SpD (the real PIF mechanic — your Defense investment effectively becomes Attack),
  auto-switches from the last move used, persists across battle updates, and keeps the fusion name + sprite. The
  manual Shield ⟷ Blade toggle works whether Aegislash is the **head or the body**.
- **Frostburn (`frb`)** — the special analog of Burn; halves Special-move damage (skipped with Guts), matching the
  server (which remaps Freeze to it).
- **Eviolite** — applies when *either* half is not-fully-evolved.
- **Custom abilities** — fangame abilities like Athenian / Pure Focus / Genius (×2 SpA), Sharp Coral, Tormented
  (always-on), plus the weather/terrain/status-gated ones (Sandy Defense, Forest King, Ice Cleats, Psycho Slider,
  Attunement, Supercell, Shadow Dance, Absolution) are applied to **both** the displayed stats and the damage calc.
- **New Moon weather** — tracked, manually selectable in the weather dropdown, and its damage modifiers
  (Ghost/Dark ×1.35, Fairy ×0.75) are applied in the calc.
- **Expert (signature) moves** — full evolution-line expansion (both Head & Body lines, both orderings, per-pairing
  typing), matching the client.

### Known limitations (not yet 100%)
- **New Moon damage** — applied as a base-power approximation (a roll may be off by ~1 HP vs. the exact in-game
  damage chain).
- **Presets** — usage-based predictions + sample sets currently cover Mariomon best; other mods (Insurgence,
  Uranium, Infinity, Chaos, Soulstones) lean on usage data only.

### Pros / cons at a glance
- **Pros:** real fusion stats/typing/abilities/items, server-accurate custom type chart, custom abilities & New Moon
  in the damage number, full Expert-Move coverage, Chromium (Chrome/Edge/Brave/Opera/…) + Firefox builds,
  Pokéathlon-only injection, fast in-battle calc, no manual data upkeep (reads the live client).
- **Cons:** beta/unpacked (manual install + updates), New Moon damage is a close approximation, preset depth varies
  by mod.

Found something wrong? File it at [Issues](https://github.com/HowToBasicMons/Athlon-Showdex/issues) with the
fusion (which half is which), item/ability/nature, and the stat shown vs expected.

## Credits

- **Maintained by** [HowToBasicMons](https://github.com/HowToBasicMons).
- **Dunscy** — for announcing the project, helping with a few ideas, and pointing me to the Pokéathlon client &
  server source (which made the server-accurate type charts, abilities and move types possible).
- **HUGE thanks to the testers** — **Jaykio, Tauros Sweep, I Like Porygon2 & Aevilok**:
  - **Jaykio** and **I Like Porygon2** — for the Aegislash Stance Change work (getting the Blade/Shield final-stat
    swap right).
  - **Tauros Sweep** — for confirming and testing the Soulstones abilities, typings & moves.
  - **Aevilok** — for the initial workaround that got a lot of this going.
- Thanks also to **Psychoplasm, NiaDoesDumbStuff & Rowlet** for the bug reports and matchups. 💜

> A few more updates will be pushed out tomorrow. After that I'll likely be quiet for a few months until I come back
> or get a window of free time. Until then — enjoy fusing, battling, and keep on climbing the ladder, Athlonians! 🐢

### Built on Showdex — go show the original devs some love

Athlon Showdex exists only because of the incredible work by **Bot Keith** & **analogcam** on
[Showdex](https://github.com/doshidak/showdex). If you enjoy this, please support the people who built the foundation:

- ❤️ Support on [Patreon](https://patreon.com/showdex) or via [PayPal](https://paypal.com/donate/?hosted_button_id=ZUYJAGAVX6MBN)
- 💬 The original [Showdex Smogon thread](https://smogon.com/forums/threads/showdex-an-auto-updating-damage-calculator-built-into-showdown.3707265) and [Discord](https://discord.gg/2PXVGGCkm2)
- ⭐ Star the [upstream repo](https://github.com/doshidak/showdex)

## License

Licensed under **AGPL-3.0**, the same as upstream Showdex — see [`LICENSE`](./LICENSE). As a network-facing fork, the
full source is published here. All original Showdex copyright and attribution is retained.
