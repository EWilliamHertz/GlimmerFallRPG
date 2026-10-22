# GlimmerFallRPG: Master Architecture & Development Prompt
*Based on the Glimmerfall TCG Universe ([www.glimmerfalltcg.com](https://www.glimmerfalltcg.com))*

Copy and paste the master prompt below into your next project session to initialize and architect **Glimmerfall Online**:

```markdown
Act as a Principal MMORPG Systems Architect, Lead Combat Designer (with deep expertise in World of Warcraft-style tab-target combat engines), and Senior Full-Stack TypeScript Engineer. We are building **Glimmerfall Online**, an international, scalable MMORPG set in the rich card-battler fantasy universe of the Glimmerfall TCG (www.glimmerfalltcg.com).

This project will be developed iteratively each week. The system architecture MUST be strictly modular, authoritative on the server side, localized for global release (i18n), and designed to support deep MMO mechanics—including a 24-slot dual action bar, Global Cooldowns (GCD) with spell queueing, complex aura buff/debuff stacks, authoritative threat/aggro tables, 8 fully fleshed-out class kits, and a TCG Card-Relic Deck socket system.

---

### 1. CORE COMBAT ENGINE & WOW-STYLE MECHANICS
Build the foundational combat and state engine around these non-negotiable MMORPG standards:
1. **Tab-Target & Soft-Target Hybrid**:
   - Players can press `Tab` to cycle hostile entities within a 40-yard forward frustum (prioritizing nearest target in front), click unit nameplates, or cast ground-targeted AoE reticles.
   - Target-of-Target frame for raid awareness and tank swaps.
2. **Global Cooldown (GCD) & Spell Queue System**:
   - Standard GCD is **1.5 seconds**, dynamically reduced by Haste rating down to a hard floor of **0.75 seconds**.
   - Specific abilities are flagged `isOffGCD: true` (defensives, interrupts, burst cooldowns, mobility triggers) and can be activated between GCD ticks.
   - Server-side **Spell Queue Window (400ms tolerance)** allowing players with international latency to buffer their next spell seamlessly without clipping GCD.
3. **24-Slot Dual Action Bar Architecture**:
   - **Bar 1 (Primary)**: Bound to keys `1, 2, 3, 4, 5, 6, 7, 8, 9, 0, -, =`.
   - **Bar 2 (Secondary)**: Bound to keys `Shift+1` through `Shift+=` (or customizable `Q, E, R, F, Z, X, C, V`).
   - Every slot displays: Live cooldown radial sweep, out-of-range red indicator, insufficient resource desaturation, and reactive spell-proc glow rings.
4. **Attributes & Scaling Formulas**:
   - **Primary**: Stamina (Health pool: 1 Sta = 15 HP), Intellect (Spell Power & Mana pool), Strength (Melee Attack Power & Shield Block value), Agility (Melee/Ranged Attack Power, Dodge % & Crit %), Spirit (Combat & out-of-combat regeneration).
   - **Secondary**: Critical Strike Rating (150% base damage/healing), Haste Rating (reduces cast time, channel duration & GCD), Mastery (empowers faction-specific passive mechanics), Versatility (flat damage/healing increase & damage reduction).
5. **Trinity & Threat Engine**:
   - Hostile NPCs maintain an authoritative **Threat Table**.
   - Tank stance generates **350% threat multiplier** on all damage dealt.
   - Taunt abilities instantly set the tank's threat to 110% of the highest threat target and lock target focus for 3 seconds.
   - Standardized combat event stream: `SWING_DAMAGE`, `SPELL_CAST_START`, `SPELL_CAST_SUCCESS`, `SPELL_DAMAGE`, `SPELL_HEAL`, `AURA_APPLIED`, `AURA_STACK_CHANGE`, `AURA_REMOVED`, `SPELL_INTERRUPTED`.

---

### 2. THE FOUR FACTIONS, RESOURCES & 8 PLAYABLE CLASSES
Every faction utilizes a distinct primary/secondary resource mechanic and features two specialized classes (8 classes total, 24 specializations across the game). Implement all classes with their complete 9-ability core kits in `/shared/classesRegistry.ts`:

#### FACTION I: SOLARI (The Sunspire Dominion)
*Lore*: Radiant zealots, sun-forged templars, and solar clerics who channel the blinding heart of the Sunspire.
*Unique Resource*: **Mana + Solar Charge (0 to 100)** — Building Solar Charge empowers abilities; reaching 100 triggers **Zenith State** (+20% Haste and radiant burn on all hits for 8s).

- **Class 1: Sunforged Paladin (Tank / Melee Bruiser — Heavy Plate)**
  1. `Strike of Dawn` (Instant, 1.5s GCD, Melee): Slashes with radiant steel dealing 120% Radiant damage. Generates 15 Solar Charge.
  2. `Aegis of the Sunspire` (Instant, Off-GCD, 8s CD, Costs 30 Solar Charge): Slams shield, dealing AoE Radiant damage, generating 400% threat, and increasing Block chance by 40% for 6s.
  3. `Blinding Verdict` (Instant, 15s CD, 10yd Cone): Emits blinding light, disorienting enemies for 3s and interrupting spellcasting.
  4. `Consecrated Ground` (Instant, 12s CD): Scorches the ground beneath the Paladin for 8s; ticks Radiant damage every 1s and heals allies standing in it.
  5. `Judgment of Sol` (Instant, 6s CD, 20yd range): Hurls a holy hammer marking the target for 12s; attacks against the mark restore 1% health to the attacker.
  6. `Solar Tether` (Instant, 20s CD, 30yd range, Taunt): Snags the target in golden light, pulling them to the Paladin and forcing target lock for 4s.
  7. `Wings of the Zenith` (Instant, Off-GCD, 120s Major CD): Erupts in solar wings for 15s, increasing damage, healing, and damage reduction by 25%.
  8. `Radiant Bulwark` (Channeled 3s, 45s CD): Raises a radiant barrier dome absorbing 50% of damage taken by party members within 12 yards.
  9. `Supernova Execution` (Instant, 15s CD, Requires target below 20% HP or Zenith State): Crushes the target with a falling star for 350% Radiant damage.

- **Class 2: Luminary Cleric (Healer / Ranged Radiant Caster — Cloth/Mail)**
  1. `Solar Flare` (1.5s Cast, 40yd range): Blasts an enemy with searing light for 140% Radiant damage and applies *Sunburn* (DoT for 12s).
  2. `Mend of the Dawn` (2.0s Cast, Mana): Large single-target heal that leaves a lingering HoT for 9s.
  3. `Flash of Radiance` (Instant, 2 charges, 8s recharge): Quick burst heal that grants 20 Solar Charge.
  4. `Halo of Solari` (2.5s Cast, 30s CD): Sends a 30-yard expanding ring of light outward, healing all allies and damaging all enemies it touches.
  5. `Prism Barrier` (Instant, 4s CD, Weakened Soul rule): Shields an ally for 15s and grants +15% movement speed.
  6. `Purifying Ray` (Instant, 8s CD): Dispels 2 harmful Magic or Curse effects from an ally.
  7. `Pillar of Noon` (1.5s Cast, 12s CD, Ground Reticle): Summons a pillar of sunlight; enemies inside suffer ticking damage and -30% hit chance.
  8. `Hymn of the Immortal Sun` (Channeled 6s, 180s Major CD): Pulses massive raid-wide heals every 1s and immediately sets Solar Charge to 100.
  9. `Luminous Tether` (Instant, 45s CD, 40yd range): Grips a party member through the light and pulls them to the Cleric's side.

---

#### FACTION II: TERRA (The Rootdeep Compact)
*Lore*: Ancient grove wardens, tectonic geomancers, and primal shapeshifters bound to the living earth and colossal world-trees.
*Unique Resource*: **Primal Fury (0 to 100) + Verdant Seeds (Stacks 1 to 5)** — Consuming Verdant Seeds triggers **Overgrowth** on the terrain.

- **Class 3: Cragwarden Juggernaut (Tank / Melee Crowd-Control — Rockplate Mail)**
  1. `Tectonic Slam` (Instant, 1.5s GCD): Smashes the earth, dealing 130% Physical/Nature damage and applying *Brittle Armor* (-5% armor, stacks 5 times).
  2. `Thornbark Carapace` (Instant, Off-GCD, 15s CD): Encases the Juggernaut in stone and briars, granting 30% damage reduction and reflecting Nature damage.
  3. `Seismic Upheaval` (1.0s Cast, 14s CD): Fractures a 20-yard line forward, launching all enemies airborne for 1.5s.
  4. `Grasping Roots` (Instant, 18s CD, 10yd AoE): Entangles nearby enemies, rooting them in place for 4s with a thorn bleed.
  5. `Boulder Toss` (1.5s Cast, 10s CD, 30yd range): Hurls a colossal boulder, stunning for 2s and generating high threat.
  6. `Earthshaker Roar` (Instant, 30s CD): Disrupts spellcasting within 12 yards and slows enemy attack speed by 20% for 6s.
  7. `Living Monolith` (Instant, 60s CD): Increases size by 50%, grants knockback/stun immunity, and raises max HP by 35% for 12s.
  8. `Verdant Regrowth` (Instant, Costs 50 Primal Fury): Consumes Fury to restore 25% of missing health.
  9. `Worldbreaker Crater` (Instant, 45s CD, 25yd Leap): Leaps to target area, erecting rock walls that trap enemies inside for 5s.

- **Class 4: Sylvan Weaver (Healer / DoT & HoT Specialist — Leather)**
  1. `Wrath of the Bramble` (1.5s Cast): Hurls thorns for 125% Nature damage and seeds 1 Verdant Seed on the nearest wounded ally.
  2. `Bloom of Life` (Instant, GCD): Places a stacking HoT on an ally (up to 3 stacks); upon expiring, it bursts into a direct heal.
  3. `Spore Cloud` (Instant, 10s CD, Ground Reticle): Blankets an 8-yard area in spores, healing allies and poisoning foes every 1s for 10s.
  4. `Parasitic Vine` (Instant, GCD, 30yd range): Drains health from an enemy every 2s for 14s, transferring it to the lowest-HP party member.
  5. `Barkskin Cocoon` (Instant, Off-GCD, 60s CD): Encases an ally in an impenetrable wooden pod for 6s, granting invulnerability and 10% HP regen/sec.
  6. `Germinate` (Instant, 15s CD): Detonates all active *Verdant Seeds* across the party for instant burst AoE healing.
  7. `Stag's Stride` (Instant, 20s CD): Transforms into a spectral stag, purging snares and increasing movement speed by 60% for 6s.
  8. `Heart of Rootdeep` (Channeled 5s, 120s Major CD): Summons an Ancient Tree of Life that pulses rapid AoE healing and grants +20% healing received.
  9. `Nature's Cure` (Instant, 8s CD): Cleanses all Poison and Bleed debuffs from a friendly target.

---

#### FACTION III: UMBRI (The Duskveil Syndicate)
*Lore*: Shadow-weavers, blood-hex assassins, and void-touched stalkers operating in the perpetual twilight of Duskveil.
*Unique Resource*: **Shadow Energy (100 cap, regens 10/sec) + Dusk Combo Points (1 to 5)** — Builders grant Dusk Points; Finishers consume up to 5 points.

- **Class 5: Nightblade Assassin (Melee Burst DPS / Stealth — Leather)**
  1. `Duskveil Cloak` (Instant, Off-GCD, 10s CD out of combat): Enters Stealth (+40% opener damage, 100% movement speed).
  2. `Shadowstrike Opener` (Instant, Requires Stealth, 40 Energy, 20yd range): Shadow-steps behind target, dealing 180% damage, silencing for 2s, and granting 2 Dusk Points.
  3. `Serrated Mutilate` (Instant, 45 Energy): Twin-dagger strike dealing 130% damage and awarding 2 Dusk Points.
  4. `Crimson Rupture` (Finisher, 25 Energy, 1-5 Dusk Points): Slices target for heavy Shadow-Bleed ticking over 4s to 20s.
  5. `Eviscerating Bite` (Finisher, 35 Energy, 1-5 Dusk Points): Massive instant Shadow-Physical burst (scales 80% to 400% based on points).
  6. `Kick of the Syndicate` (Instant, Off-GCD, 12s CD): Melee interrupt locking the target's spell school for 4s.
  7. `Smoke Bomb of Dusk` (Instant, 90s CD): Drops an 8-yard obscurity cloud; allies inside cannot be targeted by ranged spells from outside.
  8. `Shroud of the Void` (Instant, Off-GCD, 60s CD): Removes magical debuffs and grants complete spell immunity for 4s.
  9. `Dance of a Thousand Shadows` (Instant, Off-GCD, 120s Major CD): Enables all Stealth abilities in active combat for 10s and doubles Energy regeneration.

- **Class 6: Hexbinder Warlock (Ranged Affliction & Drain Caster — Cloth)**
  1. `Umbral Bolt` (1.8s Cast): Launches condensed void matter for 145% Shadow damage (25% chance for instant *Nightfall* proc).
  2. `Curse of Withered Blood` (Instant, GCD): Escalating curse over 18s that deals increasing damage and awards 1 Dusk Point every 3s.
  3. `Soul Harvest` (Channeled 4s): Leeching beam dealing Shadow damage every 0.8s, healing the Warlock (+100% damage if target is below 25% HP).
  4. `Unstable Hex` (1.5s Cast, Finisher 1-5 Dusk Points): Volatile curse; if dispelled, it silences the dispeller for 4s and deals heavy backlash damage.
  5. `Plague Contagion` (Instant, 14s CD): Spreads all active Hexes on the target to all enemies within 12 yards.
  6. `Demonic Pact` (Instant, Off-GCD, 30s CD): Sacrifices 15% HP to restore 30% Mana/Energy and gain +20% Spell Power for 10s.
  7. `Dread Howl` (1.5s Cast, 30s CD): Terrifies up to 5 enemies within 10 yards, causing them to flee for 4s.
  8. `Shadow Rift Portal` (2.0s Cast, 45s CD): Places a demonic gate that can be activated to teleport 35 yards back to the portal.
  9. `Avatar of the Abyss` (Instant, 150s Major CD): Summons a colossal Umbri Fiend for 20s that cleaves foes and duplicates the Warlock's DoT ticks.

---

#### FACTION IV: AETHER (The Astral Rift Conclave)
*Lore*: Chronomancers, rift-blades, and cosmic scholars bending space, gravity, and raw ley-lines across fractured celestial skies.
*Unique Resource*: **Arcane Mana + Astral Resonance (1 to 4 Stacks)** — Stacks increase damage by 15% and Mana costs by 35%; Purging stacks refunds Mana.

- **Class 7: Chronosavant Mage (Ranged Burst & Control Caster — Cloth)**
  1. `Astral Barrage` (2.0s Cast): Fires cosmic bolts for 160% Arcane damage and generates 1 Astral Resonance stack.
  2. `Rift Nova` (Instant, 18s CD, 10yd AoE): Freezes space, rooting all enemies in crystal stasis for 5s.
  3. `Arcane Missiles` (Channeled 2.5s, Requires *Clearcasting* proc): Launches 5 waves of homing missiles that ignore line-of-sight once cast.
  4. `Aether Purge` (Instant, 6s CD): Consumes all Astral Resonance stacks, dealing heavy burst damage and restoring 8% max Mana per stack.
  5. `Blink Step` (Instant, Off-GCD, 15s CD, 2 charges): Teleports 20 yards forward in movement direction and breaks stuns.
  6. `Counter-Pulse` (Instant, Off-GCD, 20s CD, 40yd range): Counters an enemy spellcast from range, locking that school for 5s.
  7. `Gravity Well` (Instant, 30s CD, Ground Reticle): Creates a singularity pulling all enemies within 12 yards to its center over 3s.
  8. `Time Warp Rewind` (Instant, Off-GCD, 90s CD): Records current HP, Mana, and position; activating again within 6s rewinds the Mage to that state.
  9. `Celestial Convergence` (Instant, 180s Major CD, Raid Buff): Increases Haste for all party/raid members by 30% for 20s (triggers 5-minute *Temporal Exhaustion*).

- **Class 8: Riftblade Spellweaver (Hybrid Melee/Ranged Battlemage — Medium Mail)**
  1. `Phase Strike` (Instant, GCD, Melee): Slashes with an infused blade for 130% Arcane damage and generates 1 Astral Resonance.
  2. `Warp Lunge` (Instant, 10s CD, 8-25yd range): Blinks forward to strike the target, leaving an unstable rift trail that detonates after 2s.
  3. `Aetherial Blades` (Instant, Finisher at 4 Astral Stacks): Conjures four floating cosmic swords orbiting for 8s that auto-cleave nearby enemies.
  4. `Spell-Reflect Ward` (Instant, Off-GCD, 25s CD): Raises a shimmering runic mirror for 3s that reflects the next hostile spell back to the caster.
  5. `Null-Magic Slash` (Instant, 12s CD): Slashes an enemy, stealing 1 beneficial Magic buff and applying it to the Spellweaver.
  6. `Dimensional Anchor` (Instant, 20s CD): Tethers target to coordinates; moving >8 yards away snaps them back and stuns for 2s.
  7. `Overload Core` (Instant, Off-GCD, 45s CD): Instantly grants 4 Astral stacks and makes spells cost 0 Mana for 8s.
  8. `Singularity Cleave` (1.2s Cast, 15yd Cone): Sweeps a reality tear forward, dealing heavy Arcane damage to all enemies in the cone.
  9. `Cataclysm of the Rift` (Channeled 3s, 120s Major CD): Rains 12 cosmic meteors over a 15-yard target zone.

---

### 3. TALENT TREES, TCG RELICS & PROFESSIONS
1. **3-Branch Talent Matrix (`/shared/talentsRegistry.ts`)**:
   - Each class features 3 distinct talent branches (Specialization / Offensive, Defensive & Utility, Faction Mastery).
   - Players earn 1 Talent Point per level (Level 1 to 60) to unlock passive modifiers and spec capstone abilities.
2. **Glimmerfall TCG Card-Relic Deck Socketing**:
   - In addition to standard gear slots (Head, Shoulders, Chest, Gloves, Legs, Boots, Weapon, Offhand, Relic), players equip a **3-Card Glimmerfall Deck**.
   - Socketing original cards from *www.glimmerfalltcg.com* dynamically alters class abilities (e.g. converting single-target heals into chain heals, or adding a Solari burn to melee strikes).

---

### 4. TECHNICAL STACK & DIRECTORY STRUCTURE
Construct a production-ready, modular TypeScript monorepo configured to run seamlessly in Cloud Shell and bind to `0.0.0.0:8080` for immediate Web Preview:

- `/shared`:
  - `types.ts`: Strongly typed interfaces for Entities, Abilities, Auras, ThreatTables, NetworkPackets, and TalentTrees.
  - `factionsRegistry.ts`: Faction lore, passive perks, and resource formulas.
  - `classesRegistry.ts`: Comprehensive definitions for all **8 Classes and all 72 Abilities** with no placeholder stubs.
  - `talentsRegistry.ts`: 3-branch talent trees for all 8 classes.
- `/server`:
  - `index.ts`: Authoritative server with a deterministic **20Hz (50ms) Server Tick Loop**.
  - `combatEngine.ts`: Authoritative GCD enforcement, Spell Queue buffer (400ms), threat table calculation, range checks, and DoT/HoT tick scheduler.
  - `worldManager.ts`: Spatial partition grid for **The Glimmerfall Nexus** (sanctuary hub) and 4 surrounding Faction Warzones with training dummies, elite bosses, and mobs.
- `/client`:
  - `index.html` & `main.ts`: HTML5 WebGL/Canvas viewport rendering players, spell cast cones, ground reticles, floating combat numbers (crits, absorbs, resists, heals), and target rings.
  - `ui/wowHud.ts`: Full **World of Warcraft-style HUD**:
    - Dual 12-Slot Action Bars (24 slots) with hotkeys `1` to `=`, `Shift+1` to `Shift+=`.
    - Player & Target unit frames with resource bars (Solar Charge, Primal Fury, Dusk Points, Astral Resonance) and aura icons with cooldown sweeps.
    - Centered Cast Bar with spell name, icon, and latency indicator.
    - Tabbed Combat Log with colored event output.
    - Spellbook (`P`), Character Sheet (`C`), and Talent Tree (`N`) windows.
- `/locales`:
  - `en.json` and `sv.json`: Full i18n localization dictionary.
- `WEEKLY_ROADMAP.md`: 24-week step-by-step production roadmap broken down into manageable milestones.

---

### 5. EXECUTION INSTRUCTIONS
Do NOT output placeholder comments or stubbed class kits. Fully populate all 8 classes and 72 abilities in `/shared/classesRegistry.ts` so the dual 24-slot Action Bars, Spellbook (`P`), and combat engine function on first boot.

Execute Step 1 now: generate the project layout, `package.json`, TypeScript configs, shared data registries, server tick engine, and the client HUD, then provide the command to launch on port 8080.
```
