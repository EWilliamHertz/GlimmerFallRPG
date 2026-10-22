#!/usr/bin/env python3
"""
Uploads the complete Glimmerfall Production Bible & 322-Card Codex
as a native Google Doc into Google Drive folder: 1kFsoKVLbeciS148KbxcZZFb_ksqPyudh
"""

import json
import subprocess
import urllib.request
import os

FOLDER_ID = "1kFsoKVLbeciS148KbxcZZFb_ksqPyudh"
DOC_TITLE = "Glimmerfall — Universe Bible, Google Flow Production Guide & 322-Card Codex"

# 1. Load 200 new cards and existing cards
with open("canon/cards/tcg_cards_expanded.json", "r") as f:
    all_cards = json.load(f)

with open("canon/cards/tcg_cards_200_new.json", "r") as f:
    new_cards = json.load(f)

# Read the Google Flow Productions markdown
with open("canon/GOOGLE_FLOW_PRODUCTIONS.md", "r") as f:
    productions_md = f.read()

# Build HTML with rich Google Docs styling
html_parts = []
html_parts.append("""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {
    font-family: 'Arial', sans-serif;
    color: #1e293b;
    line-height: 1.6;
    padding: 30px;
  }
  h1 {
    color: #0f172a;
    font-size: 28pt;
    border-bottom: 3px solid #3b82f6;
    padding-bottom: 8px;
    margin-top: 24pt;
  }
  h2 {
    color: #1e3a8a;
    font-size: 20pt;
    border-bottom: 2px solid #93c5fd;
    padding-bottom: 6px;
    margin-top: 20pt;
  }
  h3 {
    color: #1d4ed8;
    font-size: 15pt;
    margin-top: 16pt;
  }
  h4 {
    color: #334155;
    font-size: 12pt;
    margin-top: 12pt;
  }
  p, li {
    font-size: 11pt;
  }
  .tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 9pt;
    font-weight: bold;
    color: #ffffff;
  }
  .tag-solari { background-color: #f59e0b; }
  .tag-terra { background-color: #10b981; }
  .tag-umbri { background-color: #8b5cf6; }
  .tag-aether { background-color: #06b6d4; }
  .tag-type { background-color: #64748b; }
  .prompt-box {
    background-color: #f8fafc;
    border-left: 4px solid #3b82f6;
    padding: 12px;
    font-family: 'Courier New', monospace;
    font-size: 10pt;
    margin: 10px 0;
    color: #0f172a;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
    font-size: 10pt;
  }
  th {
    background-color: #1e293b;
    color: #ffffff;
    padding: 8px;
    text-align: left;
    border: 1px solid #cbd5e1;
  }
  td {
    padding: 7px 8px;
    border: 1px solid #cbd5e1;
    vertical-align: top;
  }
  tr:nth-child(even) {
    background-color: #f1f5f9;
  }
  .card-card {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
    background-color: #ffffff;
  }
  .callout {
    background-color: #eff6ff;
    border: 1px solid #bfdbfe;
    border-left: 5px solid #2563eb;
    padding: 12px 16px;
    margin: 15px 0;
    border-radius: 4px;
  }
</style>
</head>
<body>
""")

# Title & Executive Summary
html_parts.append(f"""
<h1>🌌 Glimmerfall — Universe Bible, Google Flow Production Guide & 322-Card Codex</h1>
<div class="callout">
  <p><strong>Universal Single Source of Truth (SSOT)</strong> for Glimmerfall TCG (<a href="https://GlimmerFallTCG.com">GlimmerFallTCG.com</a>), the 3D MMORPG, and the Animated TV Series.<br>
  <strong>Total Card Pool:</strong> 322 Cards (122 Canonical Set + 200 Expansion I Cards)<br>
  <strong>Factions:</strong> Solari (81) • Terra (80) • Umbri (81) • Aether (80)<br>
  <strong>Target Generative Video Pipeline:</strong> Google Flow & Google Veo (60 FPS, Studio Fortiche / Arcane Aesthetic)
  </p>
</div>

<h2>📊 Faction & Card Pool Overview</h2>
<table>
  <tr>
    <th>Faction</th>
    <th>Original Cards</th>
    <th>New Expansion Cards</th>
    <th>Total Cards</th>
    <th>Theme & Mechanical Identity</th>
  </tr>
  <tr>
    <td><strong>☀️ Solari</strong></td>
    <td>31</td>
    <td>50</td>
    <td><strong>81</strong></td>
    <td>Radiant solar flares, holy shields, healing, dawn paladins, winged seraphs, board clears.</td>
  </tr>
  <tr>
    <td><strong>🌿 Terra</strong></td>
    <td>30</td>
    <td>50</td>
    <td><strong>80</strong></td>
    <td>Ancient world-trees, tectonic golems, thornbark reflect, primeval beasts, high-health tanks.</td>
  </tr>
  <tr>
    <td><strong>🔮 Umbri</strong></td>
    <td>31</td>
    <td>50</td>
    <td><strong>81</strong></td>
    <td>Shadow assassins, stealth, lifesteal, blood rites, void horrors, execution mechanics.</td>
  </tr>
  <tr>
    <td><strong>⚡ Aether</strong></td>
    <td>30</td>
    <td>50</td>
    <td><strong>80</strong></td>
    <td>Chronosavants, time-dilation, phase shifting, arcane missiles, celestial drakes, singularity titans.</td>
  </tr>
  <tr>
    <td><strong>Total</strong></td>
    <td><strong>122</strong></td>
    <td><strong>200</strong></td>
    <td><strong>322</strong></td>
    <td><strong>Complete Unified Cross-Media Lore & Combat Codex</strong></td>
  </tr>
</table>
""")

# Part I: Creature Character Sheets (Original 122 Cards Only)
html_parts.append("""
<h1>🧬 Part I: Canonical Character & Creature Sheets for Google Flow</h1>
<div class="callout">
  <p><strong>Strict Canon Rule:</strong> Every character and creature in this production guide is derived <strong>100% strictly from the Original 122 Canonical Cards</strong> of Glimmerfall TCG (<a href="https://GlimmerFallTCG.com">GlimmerFallTCG.com</a>). No unreleased cards are used, guaranteeing visual and mechanical consistency across the TCG, 3D MMORPG, and animated TV series.</p>
</div>

<div class="card-card">
  <h3>🪨 Stone Golem (Canonical Card: Terra Entity #168 • 4 Cost • 3/7 [ATK/HP] • Guard)</h3>
  <p><strong>Faction:</strong> Terra | <strong>Role:</strong> Primeval Bedrock Monolith | <strong>Biome:</strong> Rootdeep Primeval Grove<br>
  <strong>Card Text:</strong> <em>"Cannot attack. Immovable living fortress absorbing titanic blows for adjacent allies."</em><br>
  <strong>Scale & Materials:</strong> 4.8m tall, 3.2m shoulder breadth, weight approx. 14 tons. Weathered grey emerald granite bound by pulsating jade tree roots (#22c55e). Head is an ancient stone lintel with two glowing amber eye-slits.<br>
  <strong>Motion Dynamics:</strong> Heavy seismic footfalls that displace soil and fracture bedrock. Drives stone fists into the earth to anchor into an impenetrable guard stance.<br>
  <strong>Audio Signature:</strong> Sub-bass grinding granite, deep tectonic rumbles, splintering timber, verdant energy hum.</p>
  <div class="prompt-box">
    <strong>Google Flow Master Prompt:</strong><br>
    Cinematic character design sheet of Stone Golem from Glimmerfall, a towering 4.8-meter living granite monolith held together by glowing emerald tree roots. Weathered grey stone texture with lichen and verdant green moss, glowing amber runic eye slits, broad boulder shoulders, immovable guard stance. Painted 3D anime style, Studio Fortiche Arcane aesthetic, volumetric forest canopy lighting, dust particles, hyper-detailed texture, 8k resolution.
  </div>
</div>

<div class="card-card">
  <h3>🕊️ Blazing Seraph (Canonical Card: Solari Entity #126 • 7 Cost • 7/7 [ATK/HP] • Evasive, Overwhelm)</h3>
  <p><strong>Faction:</strong> Solari | <strong>Role:</strong> Celestial War Avatar | <strong>Biome:</strong> Sunspire Spire Pinnacle<br>
  <strong>Card Text:</strong> <em>"When deployed, deal 3 damage to all enemies."</em><br>
  <strong>Scale & Materials:</strong> 2.3m tall imposing celestial warrior. Four sweeping wings formed of liquid solar plasma (#f59e0b) that flare with heat distortion. Pale porcelain skin radiating soft golden light; eyes burning like supernovas.<br>
  <strong>Weapons & Armor:</strong> Ornate golden filigree plate armor lined with crimson silk tabards. Wields the twin-bladed <em>Sunburst Glaive</em> of concentrated solar radiance.<br>
  <strong>Motion Dynamics:</strong> Effortless aerial maneuvering; supersonic dashes leaving prismatic light trails.<br>
  <strong>Audio Signature:</strong> Radiant solar humming, resonant angelic choir, white-hot plasma crackle.</p>
  <div class="prompt-box">
    <strong>Google Flow Master Prompt:</strong><br>
    Cinematic character turnaround of Blazing Seraph from Glimmerfall, a celestial Solari four-winged war avatar. Glowing golden solar plasma wings with heat distortion, ornate polished gold plate armor with etched sunburst crests, flowing crimson silk fabric, eyes glowing with pure solar radiance, wielding a luminous double-bladed sun glaive. Studio Fortiche Arcane visual style, dramatic volumetric rim lighting, glowing embers, cinematic composition, photorealistic 3D anime render.
  </div>
</div>

<div class="card-card">
  <h3>🦁 Golden Lion (Canonical Card: Solari Entity #106 • 4 Cost • 5/4 [ATK/HP] • Guard)</h3>
  <p><strong>Faction:</strong> Solari | <strong>Role:</strong> Sacred Apex War-Beast | <strong>Biome:</strong> Sunspire Dawn Citadel / Sun-Dunes<br>
  <strong>Card Text:</strong> <em>"When deployed, give another Solari Entity +1/+1."</em><br>
  <strong>Scale & Materials:</strong> 2.4m shoulder height, 4.2m length. Shimmering golden fur with armored dermal plates; mane of waving solar flames and woven auric gold threads.<br>
  <strong>Weapons & Armor:</strong> Sunsteel shoulder and chest barding with inlaid topaz sunstones. Razor claws forged of solid sun-iron.<br>
  <strong>Motion Dynamics:</strong> Predatory stalking transitioning into explosive leaps. Roars unleash expanding circular golden shockwaves buffing nearby allies.<br>
  <strong>Audio Signature:</strong> Thunderous predatory roar layered with cathedral bells and sizzling plasma crackle.</p>
  <div class="prompt-box">
    <strong>Google Flow Master Prompt:</strong><br>
    Character model sheet of Golden Lion from Glimmerfall, a massive Solari celestial war beast. Golden armored barding with sunstone gems, blazing solar mane of living sunlight fire, razor-sharp golden claws, noble predatory amber eyes, desert sun backdrop. Studio Fortiche Arcane art direction, hyper-detailed fur shading, cinematic warm key lighting, heat haze, 4k 60fps anime render.
  </div>
</div>

<div class="card-card">
  <h3>🐉 Void Leviathan (Canonical Card: Umbri Entity #162 • 8 Cost • 9/9 [ATK/HP] • Overwhelm)</h3>
  <p><strong>Faction:</strong> Umbri | <strong>Role:</strong> Abyssal Cosmic Serpent | <strong>Biome:</strong> Duskveil Deep Trench & Sunken Undercroft<br>
  <strong>Card Text:</strong> <em>"When deployed, all other players sacrifice an Entity."</em><br>
  <strong>Scale & Materials:</strong> Over 60 meters long serpentine body phasing through dark matter. Segmented obsidian exoskeleton with bioluminescent violet eye clusters (#581c87).<br>
  <strong>Motion Dynamics:</strong> Glides weightlessly through spacetime folds. Multi-hinged jaw opens into a gravitational singularity core that pulls light, clouds, and matter inward.<br>
  <strong>Audio Signature:</strong> Infrasonic whale drone, gravitational vacuum hum, whispering void voices.</p>
  <div class="prompt-box">
    <strong>Google Flow Master Prompt:</strong><br>
    Cinematic concept art of Void Leviathan from Glimmerfall, colossal cosmic shadow serpent hovering through an abyssal purple rift. Segmented obsidian exoskeleton, glowing violet void tentacles, multiple glowing purple ocular clusters, jaw opening into a swirling black hole vortex. Studio Fortiche Arcane visual style, dark ominous atmospheric lighting, volumetric smoke and purple particulate, cinematic 8k.
  </div>
</div>

<div class="card-card">
  <h3>⚡ Aether Drake (Canonical Card: Aether Entity #186 • 6 Cost • 5/5 [ATK/HP] • Evasive)</h3>
  <p><strong>Faction:</strong> Aether | <strong>Role:</strong> Chronomantic Celestial Wyrm | <strong>Biome:</strong> Astral Rift Fracture<br>
  <strong>Card Text:</strong> <em>"Evasive flying wyrm. Bypasses ground defenses, channeling arcane breath across enemy lines."</em><br>
  <strong>Scale & Materials:</strong> 18 meters wingspan, translucent cyan crystalline scales (#06b6d4). Four membranous wings displaying cosmic starlight nebulae; horns of solid blue mana crystal.<br>
  <strong>Motion Dynamics:</strong> Bends spacetime around its wings, leaving glowing temporal afterimages during supersonic flight.<br>
  <strong>Audio Signature:</strong> High-frequency crystal resonance, cosmic wind, crackling arcane electricity, melodic dragon cry.</p>
  <div class="prompt-box">
    <strong>Google Flow Master Prompt:</strong><br>
    Turnaround model sheet of Aether Drake from Glimmerfall, a sleek celestial dragon with translucent cyan crystalline scales. Four wings displaying glowing cosmic nebula starlight patterns, horns made of glowing blue mana crystals, orbiting brass chronomantic rings, flying through floating astral islands. Studio Fortiche Arcane style, cinematic volumetric cyan lighting, floating crystal shards, 8k resolution.
  </div>
</div>

<div class="card-card">
  <h3>⚔️ Dawnbreaker Paladin (Canonical Card: Solari Entity #119 • 3 Cost • 4/3 [ATK/HP] • None)</h3>
  <p><strong>Faction:</strong> Solari | <strong>Role:</strong> Frontline Sunspire Champion | <strong>Biome:</strong> Contested Crossroad Valley<br>
  <strong>Card Text:</strong> <em>"The frontline champion of the Sunspire. Swings a two-handed dawn-blade infused with Radiant Blessing."</em><br>
  <strong>Scale & Costume:</strong> 1.95m tall knight in polished white ceramic-and-gold plate armor adorned with sunburst heraldry. Wields the 1.6m two-handed <em>Dawn Greatsword</em>.<br>
  <strong>Motion Dynamics:</strong> Grounded combat posture with explosive sweeping cleaves followed by defensive sword parries that create golden barriers.<br>
  <strong>Audio Signature:</strong> Heavy steel footfalls on stone, ringing blade clashes, radiant energy crescendo upon weapon swings.</p>
  <div class="prompt-box">
    <strong>Google Flow Master Prompt:</strong><br>
    Cinematic character design sheet of Dawnbreaker Paladin from Glimmerfall, a valiant knight in heavy white and gold ceremonial armor. Carrying a massive glowing two-handed dawn greatsword with inscribed runes, golden shoulder pauldrons with sun motifs, determined expression, flowing white cape. Studio Fortiche Arcane aesthetic, volumetric sun rays, dust particles, hyper-detailed metal textures, cinematic dramatic anime.
  </div>
</div>
""")

# Part II: 10 Cinematic Video Scripts (Original 122 Cards Only)
html_parts.append("""
<h1>🎥 Part II: 10 Cinematic Video Scripts for Google Flow (10.0s Each)</h1>
<div class="callout">
  <p>Every clip dramatizes narrative and tactical clashes strictly between <strong>the Original 122 Canonical Cards</strong>. Each clip specifies exact card IDs, costs, types, and second-by-second keyframe progression <code>(0-3s)</code>, <code>(3-7s)</code>, and <code>(7-10s)</code>.</p>
</div>
""")

clips_data = [
    (1, "The Solari Vanguard Rises", "Solari Sun-Dunes at Dawn",
     "Solari Charger (1C Entity) • Solari Vanguard (2C Entity) • Radiant Blessing (2C Rite) • Crest of the Sun (2C Relic)",
     "A 10-second continuous cinematic shot. (0-3s): Extreme wide tracking shot across shimmering golden dunes; three Solari Chargers on armored steeds gallop at breakneck speed, banners whipping in the desert wind. (3-7s): Medium tracking shot focusing on the lead Solari Vanguard raising the Crest of the Sun relic; a shockwave of golden Radiant Blessing washes over her unit, igniting lances in sunlight. (7-10s): Low-angle hero shot halting at the ridge overlooking the Nexus Spire; the lead rider points her blazing lance forward, sun lens flare filling the screen. Studio Fortiche Arcane aesthetic, 60fps smooth camera tracking, dramatic lens flare, cinematic sand kick-up --ar 16:9"),
    (2, "Primeval Roots of the Stone Golem", "Rootdeep Primeval Grove",
     "Stone Golem (4C Entity) • Terra Sapling (1C Entity) • Living Vines (2C Rite) • Heart of the Forest (5C Relic)",
     "A 10-second continuous cinematic shot. (0-3s): Low-angle tilt-up from a glowing Terra Sapling in moss; deep earthquake tremors rattle the forest floor as ancient roots twist around massive boulders. (3-7s): The monolithic Stone Golem rises from the bedrock; jade green Living Vines bind its granite shoulders as the Heart of the Forest relic pulses green in its chest. (7-10s): The Golem plants both tree-trunk fists into the ground in its Guard stance; a verdant barrier expands outward, deflecting falling debris in slow motion. Studio Fortiche Arcane style, ground-level cinematic tilt, floating spore particles, volumetric forest rays, 4k 60fps --ar 16:9"),
    (3, "Shadow Strike in the Duskveil", "Duskveil Gothic Ruins",
     "Shadow Assassin (3C Entity) • Voidling (1C Entity) • Shadow Step (2C Flash) • Dark Ritual (1C Rite)",
     "A 10-second continuous cinematic shot. (0-3s): First-person camera moving silently along an ancient gothic aqueduct; a cloaked Shadow Assassin crouches in shadows with glowing purple-etched daggers. (3-7s): The Assassin casts Shadow Step, dissolving into violet smoke and reappearing 20 meters ahead, channeling a Dark Ritual that summons three skittering Voidlings from floor fissures. (7-10s): Close-up whip pan to the Assassin's masked face; amethyst eyes flash as she leaps toward the camera, daggers raised in an execution cross-strike. Studio Fortiche Arcane animation style, dynamic whip-pan camera, dark atmospheric purple rim lighting, 60fps --ar 16:9"),
    (4, "Chronomancy on the Astral Isles", "Aether Astral Rift Fracture",
     "Aether Mage (3C Entity) • Aether Familiar (1C Entity) • Blink (1C Flash) • Mana Crystal (2C Relic)",
     "A 10-second continuous cinematic shot. (0-3s): Wide drone shot soaring between levitating crystalline islands; an Aether Mage floats mid-air with an ethereal Aether Familiar orbiting his shoulders. (3-7s): An incoming projectile approaches; the Mage taps into an orbiting Mana Crystal and triggers Blink, shattering reality like glass and reappearing behind the attack. (7-10s): The Mage gestures forward; spinning concentric chronomantic runes expand from his hand, firing a barrage of crystalline arcane missiles toward the rift. Studio Fortiche Arcane style, sweeping drone camera, cosmic nebula background, 60fps --ar 16:9"),
    (5, "Crossroads Duel: Dawnbreaker vs. Bloodmage", "Contested Crossroad Valley",
     "Dawnbreaker Paladin (3C Entity) • Umbri Bloodmage (3C Entity) • Radiant Strike (1C Rite) • Grasp of the Void (2C Rite)",
     "A 10-second continuous cinematic shot. (0-3s): Fast side-profile tracking shot; Dawnbreaker Paladin charges forward in gleaming white-gold armor, raising his greatsword coated in solar flame. (3-7s): Counter-angle on the Umbri Bloodmage channeling Grasp of the Void; writhing tendrils of dark matter erupt from the earth attempting to snare the Paladin's boots. (7-10s): The Paladin shatters the tendrils with Radiant Strike, clashing sword against the Bloodmage's crimson staff in an explosive burst of gold and violet sparks. Studio Fortiche Arcane aesthetic, dynamic fight choreography, slow-motion impact frame, 60fps --ar 16:9"),
    (6, "The King of the Pride — Golden Lion's Charge", "Sunfire Canyons at High Noon",
     "Golden Lion (4C Entity) • Gilded Griffin (4C Entity) • Solar Flare (3C Rite) • Righteous Fury (2C Rite)",
     "A 10-second continuous cinematic shot. (0-3s): Low-angle dynamic track of the Golden Lion sprinting across a sun-bleached canyon rim, flaming solar mane billowing in the wind. (3-7s): A Gilded Griffin dives overhead, casting Solar Flare from its talons to scorch the battlefield below as the Lion enters Righteous Fury. (7-10s): The Golden Lion leaps off the cliff directly toward the camera, roaring an expanding golden acoustic shockwave in cinematic slow-motion. Studio Fortiche Arcane art style, explosive sunlight lighting, hyper-detailed fur and feathers, 60fps --ar 16:9"),
    (7, "Flight of the Aether Drake", "Cosmic Vortex of the Astral Fracture",
     "Aether Drake (6C Entity) • Aether Weaver (2C Entity) • Arcane Explosion (4C Rite) • Time Warp (7C Rite)",
     "A 10-second continuous cinematic shot. (0-3s): Orbital camera panning around an Aether Weaver conducting spinning clockwork dials in the sky, initiating a grand Time Warp. (3-7s): The clouds rip open as the celestial Aether Drake descends; its four starlight wings leave glowing cyan afterimages as it dives through space. (7-10s): The Drake unleashes a spiraling beam of Arcane Explosion energy from its crystal horns, illuminating the screen in vibrant cosmic turquoise and violet. Studio Fortiche Arcane art direction, breathtaking cosmic scale, volumetric cyan nebula fog, 60fps --ar 16:9"),
    (8, "The Void Leviathan Breaks the Sky", "The Monolithic Void Gate",
     "Void Leviathan (8C Entity) • Umbri Overlord (7C Entity) • Soul Siphon (3C Rite) • Void Gate (4C Relic)",
     "A 10-second continuous cinematic shot. (0-3s): Low-angle shot looking up at the ancient Void Gate; Umbri Overlord stands atop the monolith channeling Soul Siphon as skies turn pitch black. (3-7s): Spacetime tears open with the sound of a black hole; the colossal Void Leviathan breaches through the rift, its segmented obsidian body eclipsing the horizon. (7-10s): Extreme close-up on the Leviathan's glowing violet eye clusters as it opens its gravitational maw, pulling clouds, dust, and light inward. Studio Fortiche Arcane style, cinematic cosmic horror, dark purple volumetric fog, 60fps --ar 16:9"),
    (9, "Awakening of the Terra Ancient", "Heart of Rootdeep Grove",
     "Terra Ancient (7C Entity) • Terra Druid (2C Entity) • Earthquake (6C Rite) • Grove Sanctuary (4C Relic)",
     "A 10-second continuous cinematic shot. (0-3s): Ground splits open along massive chasms as a 6-cost Earthquake tears through the mountain ridge. (3-7s): A Terra Druid stands atop the Grove Sanctuary channeling green life-force; a mountain-sized Terra Ancient rises, towering over the forest canopy like a living hill. (7-10s): The Ancient sweeps a colossal hand covered in oak trees and stone slabs across the battlefield, scattering enemies as golden sunlight pierces the canopy. Studio Fortiche Arcane style, massive sense of scale, photorealistic foliage, 60fps --ar 16:9"),
    (10, "Climax: Descent of the Blazing Seraph", "Pinnacle Above the Nexus Spire",
     "Blazing Seraph (7C Entity) • Void Leviathan (8C Entity) • Divine Verdict (6C Rite) • Aegis of the Sun (4C Relic)",
     "A 10-second continuous cinematic climax shot. (0-3s): The Void Leviathan coils around the central Nexus Spire, choking the sky in dark matter; a single beam of golden sunlight pierces the gloom. (3-7s): The Blazing Seraph descends at orbital velocity, four liquid solar wings igniting the atmosphere, her Aegis of the Sun shield deflecting void lightning. (7-10s): She plunges her twin Sunburst Glaives into the Spire, unleashing Divine Verdict; a blinding golden supernova shockwave incinerates darkness, cutting to black on the impact frame. Studio Fortiche Arcane visual style, peak action cinematography, blinding rim lighting, 60fps masterpiece --ar 16:9")
]

for num, title, setting, cards_used, prompt in clips_data:
    html_parts.append(f"""
<div class="card-card">
  <h3>Clip {num}: {title}</h3>
  <p><strong>Setting:</strong> {setting} | <strong>Duration:</strong> 10.0 Seconds<br>
  <strong>Original 122 Cards Featured:</strong> <code>{cards_used}</code></p>
  <div class="prompt-box">{prompt}</div>
</div>
""")


# Part III: 200 Brand-New Cards Codex
html_parts.append("""
<h1>📜 Part III: The 200 Brand-New Cards Codex (Expansion I)</h1>
<p>Below are all 200 newly created cards, balanced across all four factions (50 Solari, 50 Terra, 50 Umbri, 50 Aether). Each card specifies Cost, Type, Stats, Mechanics, Rarity, and AI Illustration Directive.</p>
""")

factions = ["Solari", "Terra", "Umbri", "Aether"]
faction_badges = {
    "Solari": "tag-solari",
    "Terra": "tag-terra",
    "Umbri": "tag-umbri",
    "Aether": "tag-aether"
}

for fac in factions:
    fac_cards = [c for c in new_cards if c["faction"] == fac]
    badge_cls = faction_badges[fac]
    html_parts.append(f"""
<h2><span class="tag {badge_cls}">{fac} Faction</span> ({len(fac_cards)} New Cards)</h2>
<table>
  <tr>
    <th style="width: 15%;">Name & Type</th>
    <th style="width: 5%;">Cost</th>
    <th style="width: 7%;">Stats</th>
    <th style="width: 10%;">Keywords / Rarity</th>
    <th style="width: 20%;">Rules Text & Ability</th>
    <th style="width: 35%;">Image Prompt</th>
    <th style="width: 8%; text-align: center;">new card 20/10 -26</th>
  </tr>
""")
    for c in fac_cards:
        stats_str = f"{c['power']}/{c['health']}" if c['power'] is not None else "—"
        prompt_val = c.get('image_prompt') or c.get('ai_art_prompt') or ''
        html_parts.append(f"""
  <tr>
    <td><strong>{c['name']}</strong><br><small>{c['card_type']}</small></td>
    <td><strong>{c['cost']}</strong></td>
    <td>{stats_str}</td>
    <td>{c['keywords']}<br><em>{c['rarity']}</em></td>
    <td>{c['description']}</td>
    <td><small>{prompt_val}</small></td>
    <td style="text-align: center; font-size: 14pt; font-weight: bold; color: #f59e0b;">*</td>
  </tr>
""")
    html_parts.append("</table>")

html_parts.append("""
</body>
</html>
""")

full_html = "".join(html_parts)

# Write local HTML file for backup
with open("canon/GOOGLE_FLOW_DOCUMENT.html", "w") as f:
    f.write(full_html)

print(f"Generated HTML document ({len(full_html.encode('utf-8'))} bytes)")

# 2. Upload or Update in Google Drive as a native Google Doc
print(f"Uploading / Updating in Google Drive folder '{FOLDER_ID}' as Google Doc...")
token = subprocess.check_output(['gcloud', 'auth', 'print-access-token']).decode().strip()

# Check for existing document in folder
list_req = urllib.request.Request(
    f"https://www.googleapis.com/drive/v3/files?q='{FOLDER_ID}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)",
    headers={
        'Authorization': f'Bearer {token}',
        'X-Goog-User-Project': 'hatakecardshop',
    }
)

existing_file_id = None
try:
    with urllib.request.urlopen(list_req) as resp:
        files = json.loads(resp.read().decode()).get('files', [])
        for f in files:
            if f.get('name') == DOC_TITLE:
                existing_file_id = f.get('id')
                break
except Exception as e:
    print(f"Note listing files: {e}")

boundary = '===============7330752701453086967=='
delimiter = f'--{boundary}\r\n'
close_delim = f'\r\n--{boundary}--'

metadata = {
    'name': DOC_TITLE,
    'mimeType': 'application/vnd.google-apps.document'
}
if not existing_file_id:
    metadata['parents'] = [FOLDER_ID]

body = (
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    json.dumps(metadata) + '\r\n' +
    delimiter +
    'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
    full_html +
    close_delim
).encode('utf-8')

if existing_file_id:
    print(f"Updating existing Google Doc ID: {existing_file_id}...")
    url = f'https://www.googleapis.com/upload/drive/v3/files/{existing_file_id}?uploadType=multipart&supportsAllDrives=true'
    method = 'PATCH'
else:
    print("Creating new Google Doc in folder...")
    url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true'
    method = 'POST'

req = urllib.request.Request(
    url,
    data=body,
    headers={
        'Authorization': f'Bearer {token}',
        'X-Goog-User-Project': 'hatakecardshop',
        'Content-Type': f'multipart/related; boundary={boundary}'
    },
    method=method
)

with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode())
    print("\n🎉 SUCCESSFULLY SYNCED GOOGLE DOC!")
    print(f"Document ID:   {res.get('id')}")
    print(f"Document Name: {res.get('name')}")
    print(f"Mime Type:     {res.get('mimeType')}")
    print(f"Direct URL:    https://docs.google.com/document/d/{res.get('id')}/edit")

