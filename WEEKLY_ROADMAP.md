# Glimmerfall Online — 24-Week Production Roadmap
*Set in the Glimmerfall TCG Universe ([www.glimmerfalltcg.com](https://www.glimmerfalltcg.com))*

## Phase I: Core Combat Engine & Authoritative Networking (Weeks 1–6)
- **Week 1**: Monorepo initialization, deterministic 20Hz (`50ms`) authoritative server tick loop, and WebSocket state synchronization.
- **Week 2**: Tab-target frustum selection (`40-yard` cone), soft-targeting, click-to-target, and Target-of-Target (ToT) raid awareness frames.
- **Week 3**: Global Cooldown (`1.5s` base scaling down to `0.75s` with Haste), off-GCD weaves, and `400ms` server-side Spell Queue buffer.
- **Week 4**: Dual 12-Slot Action Bar (`24 slots` bound to `1`–`=` and `Shift+1`–`Shift+=`) with radial cooldown sweeps, range indicators, and proc glow rings.
- **Week 5**: Primary & Secondary Attribute scaling engine (Stamina, Intellect, Strength, Agility, Spirit, Crit, Haste, Faction Mastery, Versatility).
- **Week 6**: Trinity Threat Table engine (`350%` Tank Stance multiplier, `110%` Taunt threat snap + target lock, real-time threat meter).

## Phase II: Factions, Resources & 8 Playable Classes (Weeks 7–12)
- **Week 7**: **Solari (The Sunspire Dominion)** — Mana + Solar Charge (`0–100`) & Zenith State (`+20% Haste` + radiant burn).
- **Week 8**: **Sunforged Paladin** (Tank/Bruiser) & **Luminary Cleric** (Radiant Healer) full 9-ability kits and aura interactions.
- **Week 9**: **Terra (The Rootdeep Compact)** — Primal Fury + Verdant Seeds (`1–5`) & Overgrowth terrain blossoms.
- **Week 10**: **Cragwarden Juggernaut** (CC Tank) & **Sylvan Weaver** (HoT/DoT Specialist) full 9-ability kits and seed detonation mechanics.
- **Week 11**: **Umbri (The Duskveil Syndicate)** — Shadow Energy (`10/sec` regen) + Dusk Combo Points (`1–5`) for **Nightblade Assassin** & **Hexbinder Warlock**.
- **Week 12**: **Aether (The Astral Rift Conclave)** — Arcane Mana + Astral Resonance (`1–4` stacks) for **Chronosavant Mage** & **Riftblade Spellweaver**.

## Phase III: Progression, Talent Matrices & TCG Card-Relic Deck (Weeks 13–18)
- **Week 13**: 3-Branch Talent Matrix (`Offensive`, `Defensive/Utility`, `Faction Mastery`) across all 8 classes (Level 1–60 point allocation).
- **Week 14**: **Glimmerfall TCG 3-Card Relic Deck** socketing system dynamically altering class abilities with authentic TCG card passives.
- **Week 15**: Equipment slots (Head, Shoulders, Chest, Gloves, Legs, Boots, Weapon, Offhand, Relic) & itemization loot tables.
- **Week 16**: Crafting & Gathering professions (Sun-Forging, Root-Alchemy, Dusk-Inscription, Astral Enchanting).
- **Week 17**: Persistent character database storage, account authentication, and cross-realm party finder.
- **Week 18**: Guild charters, faction banners, and sanctuary social hubs in **The Glimmerfall Nexus**.

## Phase IV: Dungeons, Open-World Warzones & Live Launch (Weeks 19–24)
- **Week 19**: **The Four Faction Warzones** — dynamic control points, patrol elites, and world boss telegraph encounters.
- **Week 20**: 5-Player Dungeon I: *The Sunken Sunspire* (multi-phase boss encounters, interrupt/dispel mechanics).
- **Week 21**: 10-Player Raid: *Sanctum of the Fractured Rift* (tank-swap mechanics, raid-wide healing checks, enrage timers).
- **Week 22**: Instanced PvP Arenas (2v2 / 3v3) & Faction Battlegrounds with Diminishing Returns (DR) on crowd control.
- **Week 23**: Full i18n localization pass, accessibility options, custom keybind profiles, and WebGL shader optimization.
- **Week 24**: Global load testing, anti-cheat packet validation, and **Glimmerfall Online v1.0 Launch**.
