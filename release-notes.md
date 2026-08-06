# 🐢 Athlon Showdex v1.0.6 — "Every Format"

The big one: Athlon Showdex now understands **all** of Pokéathlon's fangame mods, pulls custom-type matchups straight from the server, and is caught up to upstream Showdex v1.4.0.

## 🌐 Every fangame mod, in the calc
The calculator now reads each mod's own dex and mechanics, so things finally line up with the server across the board:

- **Custom move types** resolve everywhere — e.g. in Soulstones, Aura Sphere is **Light** and Hyper Voice/Boomburst are **Sound** (effectiveness + STAB included), plus per-mod base stats, learnsets, abilities & items.
- **Custom-type damage abilities** — Soulstones (Virtuoso, Light Bulb, Affection, Maestro, Starstruck…) and Insurgence (Shadow Synergy/Call, Spirit Call, Psycho Call), including the "at low HP" ones.
- **Type-resist & immunity abilities** — Light Bulb/Terrorize (halve incoming Dark/Bug), Crystalline (halve Ground/Water), and immunities **Disenchant** (Fairy), **Lead Skin** (Nuclear), **Windy Wall** (Flying).
- **Redefined abilities, scoped correctly** — Soulstones' Battle Armor, Shell Armor, Snow Cloak, Sand Veil, Overcoat & Attunement apply **only** in Soulstones.
- **Custom items** — Soulstones Orion orbs (Void Heart/Radiant Orb ×2) and Insurgence Delta items (Dragon Fang/Scale, Light Ball → Pikachu-Delta).

Covers **Soulstones, Insurgence, Uranium, Chaos, Mariomon, Infinity** and Infinite Fusion.

## 🧬 Authoritative custom-type matchups
The five custom types (**Sound, Light, Cosmic, Nuclear, Crystal**) now get their immunities and resistances from the **server's own type charts** (bundled per mod), instead of the live client chart that could be stale or incomplete. So e.g. in Soulstones, a **Cosmic** mon is correctly **immune to Ground & Sound** and **resists Fire** — matching the server, not the old "immune to Fire" client data.

## ⚔️ Aegislash Stance Change — fixed properly
- Blade forme now swaps the **final, on-screen stats** (Atk↔Def, SpA↔SpD), the way Infinite Fusion actually works — so your **Defense investment effectively becomes Attack**. The old build swapped the *base* stats before EVs, which produced the wrong numbers.
- The manual **Shield ⟷ Blade toggle now works when Aegislash is the *body*** of a fusion too (it was head-only before), and it sticks across battle syncs.

## 🔥 Frostburn (`frb`)
The special analog of Burn is now modeled — it **halves Special-move damage** (and is skipped with Guts), mirroring the server (which remaps Freeze to it).

## ⬆️ Upstream Showdex v1.4.0
- **Teledex / Devdex** — a built-in **"Dump Bug Report"** tool + live log viewer (please use it when reporting!).
- Smarter Randoms/preset handling, format-scoped preset pools, performance work, a Mega toggle button, and an `@smogon/calc` patch sync.
- All of our Pokéathlon work was preserved through the merge; the damage patch is verified applied.

## 🧪 Quality
- **138** unit tests pass; typecheck clean; Chrome/Edge **and** Firefox builds shipped.

## 📦 Install

**Chromium browsers (Chrome, Edge, Brave, Opera / Opera GX, Vivaldi, …):** download the `.chrome.zip`, unzip to a permanent folder, open your browser's extensions page (`chrome://extensions`, `edge://extensions`, `brave://extensions`, `opera://extensions`, …) → enable **Developer mode** → **Load unpacked** → pick the folder (or **Reload** if you already have it). Then open a battle on [play.pokeathlon.com](https://play.pokeathlon.com) and hard-refresh (Ctrl+Shift+R).

**Firefox:** download the `.firefox.xpi`, go to `about:debugging` → **This Firefox** → **Load Temporary Add-on** → pick the `.xpi`.

## 📋 Known limitations
Some mechanics can't be modeled exactly in a static calc:

- **New Moon weather damage** is applied as a **base-power approximation** rather than the server's exact damage step, so a roll can be **off by ~1 HP**. (The server boosts Ghost/Dark ×1.35 and weakens Fairy ×0.75 late in the damage formula; we apply it earlier, which rounds slightly differently. The exact fix means patching the shared damage engine, so it's deferred to keep every other format rock-solid.)
- Intentionally skipped: turn-order abilities (Bushido "moves first", Stakeout), the frostbite-specific Superconductive, Chaos' conditional Natural Anomaly, and Light Ball on Pikachu *fusion bodies*.

## 💜 Thank you
**Dunscy** — for announcing the project, a few ideas, and pointing me to the Pokéathlon client & server source (which made this release's server-accurate type charts, abilities and move types possible).

**HUGE thanks to the testers — Jaykio, Tauros Sweep, I Like Porygon2 & Aevilok:**
- **Jaykio** and **I Like Porygon2** — the Aegislash Stance Change work (the Blade/Shield final-stat swap).
- **Tauros Sweep** — confirming & testing the Soulstones abilities, typings & moves.
- **Aevilok** — the initial workaround that got a lot of this going.

Thanks also to **Psychoplasm, NiaDoesDumbStuff & Rowlet** for the bug reports and matchups.

## 🗓️ Heads up
A few more updates ship **tomorrow**. After that I'll likely be quiet for a few months until I come back or get a window of free time (college). Bug reports (now easier with the Dump Bug Report tool) are always welcome on the [Issues](https://github.com/HowToBasicMons/Athlon-Showdex/issues) page.

Until then — **enjoy fusing, battling, and keep on climbing the ladder, Athlonians!** 🐢

## ❤️ Built on Showdex
A fork of [doshidak/showdex](https://github.com/doshidak/showdex) by **Bot Keith & analogcam** — please support them: [Patreon](https://patreon.com/showdex) · [PayPal](https://paypal.com/donate/?hosted_button_id=ZUYJAGAVX6MBN). Licensed under AGPL-3.0.
