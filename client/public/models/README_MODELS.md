# Glimmerfall Online — 3D `.glb` / `.gltf` Asset & Animation Pipeline

Drop any rigged `.glb` or `.gltf` (Draco-compressed or standard) model into these folders and **Glimmerfall Online's `ModelLoader` / `AssetLoader` will automatically hot-swap** from the built-in procedural 3D articulated hero rig to your `.glb` file on load!

---

## 1. Directory Structure & Exact File Naming Convention

### `/client/public/models/heroes/` (8 Playable Classes)
| Class | Faction | `.glb` File Path | Bone Weapon Sockets |
| :--- | :--- | :--- | :--- |
| **Sunforged Paladin** | `SOLARI` | `/models/heroes/solari_paladin.glb` | `RightHand` + `LeftHand` (Shield) |
| **Luminary Cleric** | `SOLARI` | `/models/heroes/solari_cleric.glb` | `RightHand` (Radiant Staff) |
| **Cragwarden Juggernaut** | `TERRA` | `/models/heroes/terra_juggernaut.glb` | `RightHand` (Worldmaul) |
| **Sylvan Weaver** | `TERRA` | `/models/heroes/terra_weaver.glb` | `RightHand` (Nature Staff) |
| **Nightblade Assassin** | `UMBRI` | `/models/heroes/umbri_nightblade.glb` | `RightHand` + `LeftHand` (Twin Daggers) |
| **Hexbinder Warlock** | `UMBRI` | `/models/heroes/umbri_warlock.glb` | `RightHand` (Void Staff/Tome) |
| **Chronosavant Mage** | `AETHER` | `/models/heroes/aether_mage.glb` | `RightHand` (Astral Staff) |
| **Riftblade Spellweaver** | `AETHER` | `/models/heroes/aether_spellweaver.glb` | `RightHand` (Rift Glaive) |

### `/client/public/models/weapons/` (Bone Socket Attachments)
- `/models/weapons/solari_sunblade.glb` & `/models/weapons/solari_sunshield.glb`
- `/models/weapons/solari_staff.glb`
- `/models/weapons/terra_worldmaul.glb`
- `/models/weapons/terra_rootstaff.glb`
- `/models/weapons/umbri_dagger_r.glb` & `/models/weapons/umbri_dagger_l.glb`
- `/models/weapons/umbri_hexstaff.glb`
- `/models/weapons/aether_chronostaff.glb`
- `/models/weapons/aether_riftblade.glb`

### `/client/public/models/monsters/` (Bosses & Warzone Creatures)
- `/models/monsters/nexus_colossus.glb` (Grand Nexus Raid Construct)
- `/models/monsters/solari_boss.glb`, `/models/monsters/terra_boss.glb`, `/models/monsters/umbri_boss.glb`, `/models/monsters/aether_boss.glb`
- `/models/monsters/solari_warden.glb`, `/models/monsters/solari_colossus.glb`, `/models/monsters/solari_emperor.glb` (*The Sunspire Vaults* Dungeon Bosses)
- `/models/monsters/umbri_executioner.glb`, `/models/monsters/umbri_matron.glb`, `/models/monsters/umbri_malakor.glb` (*Catacombs of Duskveil* Dungeon Bosses)

---

## 2. Required Animation Clip Names (`THREE.AnimationMixer`)

The animation state machine (`fadeToAction(name, 0.2)`) automatically matches these exact clip names (plus common KayKit / Quaternius / Mixamo aliases):

| Canonical Clip Name | Fallback Aliases Automatically Matched | Trigger Condition |
| :--- | :--- | :--- |
| `Idle` | `Idle_Loop`, `Stand`, `Breathing_Idle` | Standing out of movement |
| `Run` | `Run_Forward`, `Walk`, `Jog_Forward` | Moving with `WASD` |
| `Sprint` | `Run_Fast`, `Dash`, `Roll`, `Dodge` | `Shift` Dodge Roll / Sprint |
| `Jump` | `Jump_Full`, `Jump_Loop`, `Hop` | `Space` 3D Jump |
| `Attack_Melee_1` | `Attack`, `Slash`, `1H_Melee_Attack_Slice_Diagonal` | Melee abilities (`LMB`, `RMB`, `Q`, `E`, `R`, `F`) |
| `Attack_Cast` | `Spellcast_Shoot`, `Cast`, `Magic_Attack` | Ranged / Instant spell casts |
| `Channel_Loop` | `Spellcast_Long`, `Channel`, `Meditate` | Channeled spells & long casts |
| `Hit_React` | `Hit_A`, `Impact`, `Damage` | Taking combat damage |
| `Death` | `Death_A`, `Die`, `Defeat` | Reaching 0 HP |

---

## 3. Best Free Sources for `.glb` / `.gltf` Animated RPG Models

To populate `/client/public/models/` without spending a krona, use these free CC0/royalty-free pipelines that export straight to Three.js-ready `.glb`:

| Resource | Best For | How to Use with Glimmerfall |
| :--- | :--- | :--- |
| **KayKit (Kay Lousberg) & Quaternius** | Stylized RPG Heroes, Skeletons, Dungeons, Weapons (`.glb` CC0) | Download their free Adventurers, Knights, and Dungeon packs. They come pre-rigged in `.glb` with `Idle`, `Run`, `Attack`, and `Hit` animations already embedded. |
| **Mesh2Motion (`mesh2motion.org`)** | Rigging & bundling multiple animations into a single `.glb` (CC0) | Import any static `.glb` hero or monster (humanoid, dragon, spider), apply Quaternius/CC0 animation clips, and click **Export Bundled GLB**. |
| **Mixamo + Blender** | AAA Motion-Cap Animations (Sword Slash, Spell Cast, Dodge) | Grab a character, download animations from Mixamo (*Without Skin*), combine them in Blender's Nonlinear Animation (NLA) editor into tracks (`Idle`, `Run`, `Attack_Melee_1`), and export as a single `.glb`. |
| **Meshy AI / Tripo3D (Free Tiers)** | Generating custom Glimmerfall TCG monsters & relics | Prompt a custom creature from your Glimmerfall TCG art, use the built-in auto-rigging tool, and export directly to `.glb`. |
