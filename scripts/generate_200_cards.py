#!/usr/bin/env python3
"""
Glimmerfall 200 New Cards Generator & Google Doc Exporter
Expands Glimmerfall TCG from 122 to 322 canonical cards (50 per faction: Solari, Terra, Umbri, Aether).
Outputs:
- canon/cards/tcg_cards_200_new.json
- canon/cards/tcg_cards_expanded.json (322 total)
- canon/EXPANDED_200_CARDS_CODEX.md
"""

import json
import uuid
import os

# Factions: Solari, Terra, Umbri, Aether
# 50 cards per faction:
# - 25 Entities
# - 12 Rites
# - 7 Flashes
# - 6 Relics

NEW_CARDS = []
card_seq = 223

def add_card(faction, name, card_type, cost, power, health, keywords, rarity, description, prompt, lore=""):
    global card_seq
    card_seq += 1
    NEW_CARDS.append({
        "id": str(uuid.uuid4()),
        "name": name,
        "card_type": card_type,
        "cost": cost,
        "power": power,
        "health": health,
        "description": description,
        "image_url": None,
        "faction": faction,
        "keywords": keywords,
        "rarity": rarity,
        "ai_art_prompt": f"A premium fantasy trading card illustration of {name}, a {faction} {card_type}. {prompt}",
        "set_name": "Expansion I: Fractured Realms",
        "collector_number": card_seq,
        "set_code": "EXP1",
        "lore": lore or f"In the fractured realm of Glimmerfall, {name} commands the sovereign forces of {faction}."
    })

# ==============================================================================
# FACTION 1: SOLARI (50 Cards)
# ==============================================================================
# --- 25 SOLARI ENTITIES ---
add_card("Solari", "Dawn Scout", "Entity", 1, 1, 2, "Evasive", "Common", "When deployed, reveal the top card of your deck.", "A nimble scout in gilded leather overlooking sunrise desert dunes.")
add_card("Solari", "Sunspire Acolyte", "Entity", 1, 2, 1, "None", "Common", "When this deals damage to an enemy, restore 1 Health to your hero.", "A young cleric in white and gold vestments channeling dawn light through a holy prism.")
add_card("Solari", "Solar Initiate", "Entity", 1, 1, 1, "Charge", "Common", "Deals double damage to Void or Umbri entities.", "A courageous young warrior sprinting with a glowing sun-tipped shortspear.")
add_card("Solari", "Daybreak Vanguard", "Entity", 2, 2, 3, "Guard", "Common", "None", "A sturdy armored infantryman with a towering kite shield reflecting morning sunlight.")
add_card("Solari", "Sunforged Blacksmith", "Entity", 2, 1, 4, "None", "Uncommon", "Whenever you play a Relic, give a friendly Entity +1/+1.", "A muscular blacksmith hammering white-hot glowing sunsteel on a stone anvil.")
add_card("Solari", "Pyre Falcon", "Entity", 2, 3, 1, "Evasive", "Common", "Deathrattle: Deal 1 damage to a random enemy.", "A swift bird of prey forged from living golden flames diving through desert thermals.")
add_card("Solari", "Sun Cleric of the Dawn", "Entity", 2, 1, 3, "None", "Uncommon", "When deployed, restore 3 Health to a friendly unit.", "A compassionate priestess holding an incandescent golden sun-chalice.")
add_card("Solari", "Dawnblade Sentinel", "Entity", 3, 3, 3, "None", "Common", "Battlecry: Give a friendly Entity +1 Attack this turn.", "An agile elven swordsman wielding dual glowing crescent sunblades.")
add_card("Solari", "Solarion Charioteer", "Entity", 3, 4, 2, "Charge", "Rare", "Can attack immediately upon deployment.", "A golden chariot drawn by two armored radiant horses charging through enemy lines.")
add_card("Solari", "Sunspire Judicator", "Entity", 3, 2, 4, "Piercing", "Uncommon", "Damage dealt by this entity ignores Armor.", "A stern judge in radiant plate holding the scales of justice and a burning broadsword.")
add_card("Solari", "Sunfire Zealot", "Entity", 3, 3, 2, "None", "Common", "When this entity takes damage, gain +2 Attack.", "A fanatical solar knight whose golden armor glows red-hot with intense faith.")
add_card("Solari", "Radiant Templar", "Entity", 4, 3, 5, "Guard", "Uncommon", "Reduces all incoming spell damage by 1.", "A heavy knight clad in polished golden full-plate bracing against dark magic.")
add_card("Solari", "Solar Eagle", "Entity", 4, 4, 3, "Evasive", "Rare", "Battlecry: Silence target enemy entity for 1 turn.", "A massive eagle of incandescent light whose screech dissipates enemy sorcery.")
add_card("Solari", "Solar Champion", "Entity", 4, 5, 4, "None", "Rare", "Whenever this attacks, gain 1 Solar Energy.", "A decorated paladin champion raising a blazing greatsword in triumph.")
add_card("Solari", "Sunspire Archon", "Entity", 5, 4, 6, "Guard", "Rare", "Adjacent friendly entities have +1/+1.", "A towering armored celestial commander radiating golden defensive auras.")
add_card("Solari", "Solar Phoenix", "Entity", 5, 5, 3, "Evasive", "Epic", "Deathrattle: Revive as an Ash Egg with 0/3. If it survives 1 turn, reborn.", "A magnificent mythical bird of eternal solar fire rising from glowing embers.")
add_card("Solari", "Dawn Sovereign Knight", "Entity", 5, 6, 4, "Overwhelm", "Rare", "Excess damage dealt to units damages the enemy hero.", "A royal commander in engraved mirror armor riding an armored destrier.")
add_card("Solari", "Sunfire Drake", "Entity", 6, 6, 6, "Evasive", "Epic", "When deployed, deal 2 damage to all enemy units.", "A majestic golden dragon breathing swirling torrents of white-hot solar plasma.")
add_card("Solari", "High Inquisitor of Sol", "Entity", 6, 5, 7, "None", "Epic", "Battlecry: Destroy target enemy unit with 3 or less Health.", "An imposing inquisitor surrounded by floating glowing holy scripture rings.")
add_card("Solari", "Solar Chimera", "Entity", 7, 7, 6, "Charge", "Epic", "Can attack entities or the enemy hero immediately upon deployment.", "A terrifying beast with lion, ram, and dragon heads crowned with solar coronas.")
add_card("Solari", "Sunwell Guardian", "Entity", 7, 4, 9, "Guard", "Epic", "At the end of your turn, restore 4 Health to your hero.", "A stone and sunsteel colossus standing vigil over an incandescent liquid sun-fountain.")
add_card("Solari", "Archangel of the Zenith", "Entity", 8, 8, 8, "Evasive", "Mythic", "Battlecry: Fully restore your hero's Health and deal 4 damage to all enemies.", "A transcendent eight-winged archangel descending through shattered golden clouds.")
add_card("Solari", "Solar Titan", "Entity", 8, 9, 8, "Overwhelm", "Mythic", "Attacks cleave adjacent enemy targets for half damage.", "A colossal titan forged from molten starlight walking across mountain ranges.")
add_card("Solari", "Avatar of the Eternal Sun", "Entity", 9, 10, 10, "Spellshield", "Mythic", "Immune to spells and abilities. Destroys any unit it damages.", "A godlike celestial entity composed of an entire living star encased in golden rings.")
add_card("Solari", "Dawnbreaker Behemoth", "Entity", 9, 8, 12, "Guard", "Epic", "Cannot be targeted by enemy Flash cards.", "A mountain-sized siege beast carrying an entire glowing solar citadel on its back.")

# --- 12 SOLARI RITES ---
add_card("Solari", "Blessing of Dawn", "Rite", 1, None, None, "None", "Common", "Give target friendly entity +1/+2 and restore 2 Health to it.", "A beam of morning light bathing an injured soldier in healing warmth.")
add_card("Solari", "Solar Flare Burst", "Rite", 2, None, None, "None", "Common", "Deal 3 Radiant damage to target enemy.", "A focused burst of blinding solar fire exploding on target.")
add_card("Solari", "Consecrated Ground", "Rite", 2, None, None, "None", "Uncommon", "Create holy ground for 3 turns. Friendly entities gain +1 Attack; enemies take 1 damage per turn.", "Glowing golden runes etched permanently into battlefield stones.")
add_card("Solari", "Radiant Cleansing", "Rite", 3, None, None, "None", "Uncommon", "Remove all negative debuffs and curses from friendly units. Draw 1 card.", "Golden rain falling from clear skies washing away dark corruption.")
add_card("Solari", "Judgement of the Sun", "Rite", 3, None, None, "None", "Rare", "Deal 4 damage to target enemy. If it dies, gain 2 Solar Energy.", "A giant pillar of light descending from heaven to vaporize an enemy.")
add_card("Solari", "Sunspire Armory", "Rite", 3, None, None, "None", "Uncommon", "Give all friendly entities +1/+1 and Guard.", "Rows of glowing sunforged shields and swords descending to equip soldiers.")
add_card("Solari", "Wrath of the Daystar", "Rite", 4, None, None, "None", "Rare", "Deal 3 damage to all enemy units.", "A blazing daylight supernova shockwave sweeping across the desert.")
add_card("Solari", "Hymn of the Zenith", "Rite", 4, None, None, "None", "Rare", "Restore 6 Health divided among friendly targets. Gain 2 Energy.", "Choral light beams weaving harmonies that mend shattered armor and flesh.")
add_card("Solari", "Solar Coronation", "Rite", 5, None, None, "None", "Epic", "Give a friendly entity +4/+4, Spellshield, and Charge.", "A divine crown of liquid solar plasma descending upon an anointed champion.")
add_card("Solari", "Dawn's Resurgence", "Rite", 6, None, None, "None", "Epic", "Revive 2 friendly entities that died this battle with full Health.", "Golden spirits rising from the earth to re-inhabit their polished armor.")
add_card("Solari", "Supernova Cataclysm", "Rite", 7, None, None, "None", "Mythic", "Deal 8 damage to all enemy units. Excess damage hits the enemy hero.", "A cataclysmic stellar explosion obliterating an entire enemy legion.")
add_card("Solari", "Ascension of the Sun God", "Rite", 8, None, None, "None", "Mythic", "Transform your hero into the Sun God: gain 20 max Health, new hero power, and +2 Attack.", "A mortal champion transcending into a blinding golden solar deity.")

# --- 7 SOLARI FLASHES ---
add_card("Solari", "Blinding Glare", "Flash", 1, None, None, "None", "Common", "Target attacking enemy has 0 Attack this turn.", "A sudden mirror-like shield deflection blinding an attacker mid-swing.")
add_card("Solari", "Aegis Intervention", "Flash", 1, None, None, "None", "Common", "Give a friendly entity Spellshield until the end of turn.", "A protective golden dome snapping into existence around an ally.")
add_card("Solari", "Solar Reversal", "Flash", 2, None, None, "None", "Uncommon", "When an enemy casts a spell, negate it and deal 2 damage to their hero.", "A golden counter-ward reflecting an incoming dark spell back at its caster.")
add_card("Solari", "Dawn's Reprieve", "Flash", 2, None, None, "None", "Uncommon", "When a friendly unit would die, prevent the damage and restore it to 3 Health.", "A sudden flash of dawn light preventing a lethal blade strike.")
add_card("Solari", "Sunburst Riposte", "Flash", 3, None, None, "None", "Rare", "When a friendly entity is attacked, destroy the attacker if it has 4 or less Health.", "An armored paladin parrying and driving a glowing sunblade into the foe.")
add_card("Solari", "Radiant Bulwark", "Flash", 3, None, None, "None", "Rare", "Prevent all damage to your hero and friendly units this turn.", "A massive golden bastion wall erupting from the ground absorbing an enemy barrage.")
add_card("Solari", "Final Stand of the Light", "Flash", 4, None, None, "None", "Epic", "When your hero would take fatal damage, survive with 1 Health and gain Invulnerable for 1 turn.", "A kneeling warrior radiating incandescent golden light defying mortal death.")

# --- 6 SOLARI RELICS ---
add_card("Solari", "Sunspire Golden Signet", "Relic", 1, None, None, "None", "Common", "At the start of your turn, gain 1 extra Solar Energy.", "An ancient carved golden signet ring bearing the blazing sun crest.")
add_card("Solari", "Censer of the Dawn", "Relic", 2, None, None, "None", "Uncommon", "Whenever you cast a Rite, restore 1 Health to all friendly units.", "A suspended golden censer releasing fragrant incense and glowing dawn embers.")
add_card("Solari", "Aegis of the Zenith", "Relic", 3, None, None, "None", "Rare", "Your hero takes 1 less damage from all attacks and abilities.", "A legendary tower shield of pure white marble rimmed in indestructible sunsteel.")
add_card("Solari", "Sunblade of the First Paladin", "Relic", 4, None, None, "None", "Epic", "Your hero gains +3 Attack. Attacks deal Radiant damage and apply Blind.", "An ancient holy blade whose steel glows like the core of the midday sun.")
add_card("Solari", "Solarium Lens of Truth", "Relic", 5, None, None, "None", "Epic", "Enemy entities cannot have Stealth or Evasive. Reveal all hidden cards.", "A massive crystal lens mounted in brass rings projecting truth-revealing beams.")
add_card("Solari", "Crown of the Sun King", "Relic", 6, None, None, "None", "Mythic", "All friendly entities have +2/+2, Guard, and heal for 2 at end of turn.", "The coronation crown of the ancient solar dynasty pulsating with immortal majesty.")

# ==============================================================================
# FACTION 2: TERRA (50 Cards)
# ==============================================================================
# --- 25 TERRA ENTITIES ---
add_card("Terra", "Moss Sproutling", "Entity", 1, 1, 2, "None", "Common", "Deathrattle: Summon a 1/1 Bramble Sapling.", "A tiny animated creature of fresh moss and glowing green sprouts.")
add_card("Terra", "Bramble Sapling", "Entity", 1, 1, 1, "None", "Common", "Has Thornbark (reflects 1 damage to melee attackers).", "A thorny wooden seedling with sharp prickles.")
add_card("Terra", "Forest Burrower", "Entity", 1, 2, 1, "None", "Common", "Battlecry: Can burrow beneath the earth to ignore the first attack against it.", "A giant armored badger-like beast with stone claws digging through soil.")
add_card("Terra", "Grove Herbalist", "Entity", 2, 1, 4, "None", "Common", "At the end of your turn, restore 2 Health to adjacent allies.", "An elderly druid tending to glowing green medicinal herbs in a hollow tree.")
add_card("Terra", "Ironbark Scout", "Entity", 2, 2, 3, "None", "Common", "Battlecry: Gain +1 Health for each other Terra entity you control.", "A wooden scout crafted from living ironbark bark carrying a wooden longbow.")
add_card("Terra", "Rootbound Sentry", "Entity", 2, 1, 5, "Guard", "Common", "Cannot attack. Has Guard.", "A petrified tree trunk bound with ancient roots acting as a living barricade.")
add_card("Terra", "Thornback Boar", "Entity", 3, 3, 3, "Charge", "Uncommon", "Has Thornbark: deals 2 damage to any entity that attacks it.", "A feral primeval boar with enormous tusks and razor-sharp crystal brambles on its back.")
add_card("Terra", "Sylvan Shaman", "Entity", 3, 2, 4, "None", "Uncommon", "Whenever a friendly entity dies, draw a card.", "A masked shaman channeling green spirit wisps through an antler staff.")
add_card("Terra", "Stonehorn Stag", "Entity", 3, 4, 3, "None", "Common", "Battlecry: Give a friendly entity +2 Health.", "A magnificent stag whose antlers are carved from solid jade granite.")
add_card("Terra", "Cragwarden Recruit", "Entity", 3, 3, 4, "Guard", "Common", "None", "A sturdy rockplate-clad dwarf holding a heavy stone warhammer.")
add_card("Terra", "Spore Spitter", "Entity", 4, 3, 4, "Piercing", "Uncommon", "Attacks poison the target, dealing 2 Nature damage per turn for 2 turns.", "A grotesque giant carnivorous plant spitting fluorescent toxic fungal spores.")
add_card("Terra", "Deepwood Treant", "Entity", 4, 4, 6, "Guard", "Rare", "Takes 1 less damage from all attacks.", "A hulking animated oak tree towering over the forest canopy with glowing amber eyes.")
add_card("Terra", "Rootdeep Weaver", "Entity", 4, 2, 5, "None", "Rare", "Battlecry: Entangle all enemy entities, preventing them from moving or attacking next turn.", "A graceful nature witch whose fingertips extend into living emerald vine tendrils.")
add_card("Terra", "Primeval Direwolf", "Entity", 4, 5, 4, "Overwhelm", "Uncommon", "Gains +1 Attack for each other friendly beast on the board.", "A massive shaggy direwolf with moss-covered fur howling at the moon.")
add_card("Terra", "Tectonic Colossus", "Entity", 5, 5, 7, "Guard", "Rare", "Whenever this takes damage, deal 2 damage to all enemies.", "A humanoid giant made of stacked earthquake boulders bound by glowing magma roots.")
add_card("Terra", "Ancient Moss-Drake", "Entity", 5, 6, 5, "Evasive", "Rare", "Battlecry: Give all friendly Terra entities +1/+2.", "A wingless primeval dragon that glides on forest thermals, covered in ancient lichens.")
add_card("Terra", "Brambleheart Behemoth", "Entity", 6, 6, 7, "Guard", "Rare", "Has Thornbark (reflects 3 damage to attackers).", "A colossal beast encased in an impenetrable shell of razor-sharp living ironwood briars.")
add_card("Terra", "Lithomancer of the Deep", "Entity", 6, 4, 8, "None", "Epic", "At the end of your turn, summon a 2/4 Stone Golem with Guard.", "A powerful earth mage manipulating floating stone slabs with hypnotic gestures.")
add_card("Terra", "Primeval Hydra", "Entity", 7, 7, 7, "None", "Epic", "Whenever this takes damage without dying, it gains +2/+2 and spawns a new head.", "A three-headed swamp serpent regenerating heads in bursts of green nature energy.")
add_card("Terra", "Colossus of Rootdeep", "Entity", 7, 6, 10, "Guard", "Epic", "All damage dealt to your hero is redirected to this entity instead.", "The legendary mountain guardian of the Primeval Grove, ancient roots anchoring it to bedrock.")
add_card("Terra", "Ancient of Lore", "Entity", 7, 5, 8, "None", "Epic", "Choose One: Draw 3 cards, or Restore 8 Health to your hero.", "A wise, millennia-old sentient world-tree whose leaves are written with ancient runes.")
add_card("Terra", "Apex Chimera of the Grove", "Entity", 8, 8, 8, "Overwhelm", "Mythic", "Battlecry: Eat target enemy unit with 4 or less Health to permanently gain its stats.", "A horrifying primeval chimera with the body of a sabertooth, wings of a wyvern, and head of a dragon.")
add_card("Terra", "Earthshaker Titan", "Entity", 8, 9, 9, "None", "Mythic", "Battlecry: Destroy all enemy Relics and deal 4 damage to all enemy units.", "A continent-striding elemental titan whose steps shatter mountain valleys.")
add_card("Terra", "World-Tree Sovereign", "Entity", 9, 10, 12, "Guard", "Mythic", "Friendly entities cannot die while this entity is alive. Restores 5 Health each turn.", "The living spirit of the great World Tree herself, radiating green life energy.")
add_card("Terra", "Primordial Behemoth", "Entity", 9, 12, 10, "Overwhelm", "Mythic", "Can attack twice each turn. Immune to roots and stuns.", "An ancient god-beast from the dawn of creation, covered in primeval forests on its back.")

# --- 12 TERRA RITES ---
add_card("Terra", "Barkskin Infusion", "Rite", 1, None, None, "None", "Common", "Give target entity +0/+3 and Guard.", "A layer of thick living tree bark wrapping over a soldier's body.")
add_card("Terra", "Nourish the Soil", "Rite", 1, None, None, "None", "Common", "Gain 1 extra permanent Primal Energy crystal.", "Green life energy pouring into fertile earth, causing vibrant sprouts to burst.")
add_card("Terra", "Entangling Overgrowth", "Rite", 2, None, None, "None", "Common", "Root target enemy entity in place for 2 turns and deal 2 Nature damage to it.", "Vines shooting out of the ground to wrap around an enemy's legs.")
add_card("Terra", "Primal Roar", "Rite", 2, None, None, "None", "Uncommon", "Give all friendly entities +2 Attack this turn.", "A resonant soundwave echoing through forest trees empowering all beasts.")
add_card("Terra", "Tectonic Slam", "Rite", 3, None, None, "None", "Uncommon", "Deal 4 Nature damage to an enemy and 1 damage to all adjacent enemies.", "A giant stone maul smashing into the ground fracturing stone tiles.")
add_card("Terra", "Verdant Growth", "Rite", 3, None, None, "None", "Uncommon", "Summon two 2/2 Treant seedlings with Guard.", "Two ancient acorns sprouting instantly into fully-grown wooden treants.")
add_card("Terra", "Nature's Reclamation", "Rite", 4, None, None, "None", "Rare", "Destroy target enemy Relic and deal 3 damage to its controller.", "Thick creeping moss and vines devouring an ancient metal artifact until it crumbles.")
add_card("Terra", "Call of the Wild Herd", "Rite", 5, None, None, "None", "Rare", "Summon three 3/3 Direwolves with Charge.", "A stampede of primeval wolves charging through forest fog.")
add_card("Terra", "Earthquake Fissure", "Rite", 5, None, None, "None", "Epic", "Deal 4 damage to all entities. Destroy all damaged enemy units.", "A massive chasm opening in the earth swallowing enemy ranks in dust.")
add_card("Terra", "Avatar of the World-Tree", "Rite", 6, None, None, "None", "Epic", "Double the Health of all friendly entities and restore them to full Health.", "A radiant green canopy expanding over the battlefield showering healing leaves.")
add_card("Terra", "Primeval Rebirth", "Rite", 7, None, None, "None", "Mythic", "Return all friendly entities that died this game to your hand; they cost 2 less.", "Ancient spirits of the forest reincarnating in green ethereal form.")
add_card("Terra", "Wrath of the Earth Mother", "Rite", 8, None, None, "None", "Mythic", "Fill your board with 4/4 Treant Protectors with Guard and give your hero 15 Armor.", "Dozens of giant oak trees tearing free from the earth to defend the grove.")

# --- 7 TERRA FLASHES ---
add_card("Terra", "Briar Snare", "Flash", 1, None, None, "None", "Common", "When an enemy entity attacks, root it and cancel the attack.", "Thorned briars whipping out from the undergrowth to snag an attacker.")
add_card("Terra", "Verdant Escape", "Flash", 1, None, None, "None", "Common", "Target friendly entity teleports into the brush, avoiding the next attack.", "A ranger dissolving into emerald autumn leaves to dodge an incoming blade.")
add_card("Terra", "Stonehide Plating", "Flash", 2, None, None, "None", "Uncommon", "Give target entity +4 Health and damage taken reduced by 2 this turn.", "Living granite forming a protective exoskeleton over an ally.")
add_card("Terra", "Spore Cloud Counter", "Flash", 2, None, None, "None", "Uncommon", "When an enemy casts a spell, poison all enemy units for 2 damage per turn.", "An exploding mushroom releasing a cloud of toxic purple spores on the enemy.")
add_card("Terra", "Tectonic Counter-Upheaval", "Flash", 3, None, None, "None", "Rare", "When an enemy attacks your hero, stun the attacker for 1 turn and deal 3 damage to it.", "A stone pillar shooting out of the ground directly beneath the attacker.")
add_card("Terra", "Canopy Shelter", "Flash", 3, None, None, "None", "Rare", "Friendly entities take 0 damage from enemy spells this turn.", "Giant interwoven leaves forming an impenetrable canopy blocking magical rain.")
add_card("Terra", "Primal Surge", "Flash", 4, None, None, "None", "Epic", "Instantly restore 8 Health to your hero and gain 3 Primal Energy.", "A geyser of pure emerald life-essence erupting from the earth.")

# --- 6 TERRA RELICS ---
add_card("Terra", "Heart of the Ironwood", "Relic", 1, None, None, "None", "Common", "Your entities have +1 Health.", "A glowing petrified wooden core pulsating with ancient green sap.")
add_card("Terra", "Totem of the Earth Mother", "Relic", 2, None, None, "None", "Uncommon", "At the end of your turn, summon a 1/1 Bramble Sapling with Thornbark.", "A carved wooden totem pole crowned with wolf, bear, and eagle heads.")
add_card("Terra", "Worldmaul of the Juggernaut", "Relic", 3, None, None, "None", "Rare", "Your hero gains +2 Attack and attacks deal damage to adjacent enemies.", "A colossal two-handed hammer carved from a fallen mountain peak.")
add_card("Terra", "Horn of the Wild Hunt", "Relic", 4, None, None, "None", "Rare", "Whenever you summon a beast, give it +1/+1 and Charge.", "An ancient curled ram's horn carved with hunting runes.")
add_card("Terra", "Roots of the World Tree", "Relic", 5, None, None, "None", "Epic", "Your hero cannot take more than 4 damage from any single attack or spell.", "Deep ancient roots wrapping protectively around the player's throne.")
add_card("Terra", "Crown of Primeval Thorns", "Relic", 6, None, None, "None", "Mythic", "Whenever any enemy takes damage, deal that much damage to the enemy hero.", "A crown of living briars weeping golden sap worn by the ancient druid kings.")

# ==============================================================================
# FACTION 3: UMBRI (50 Cards)
# ==============================================================================
# --- 25 UMBRI ENTITIES ---
add_card("Umbri", "Shadow Initiate", "Entity", 1, 1, 1, "Stealth", "Common", "When this entity attacks from Stealth, deal +2 damage.", "A robed initiate slipping unseen through dark purple alley mist.")
add_card("Umbri", "Crypt Leech", "Entity", 1, 1, 2, "Lifesteal", "Common", "Damage dealt by this entity heals your hero.", "A grotesque chitinous leech glowing with pale violet necrotic fluid.")
add_card("Umbri", "Dusk Imp", "Entity", 1, 2, 1, "None", "Common", "Deathrattle: Deal 1 damage to a random enemy and draw 1 card.", "A mischievous winged gargoyle demon perched on gothic gravestones.")
add_card("Umbri", "Duskveil Stalker", "Entity", 2, 3, 1, "Stealth", "Common", "None", "A masked assassin creeping across shadowy rooftops with poisoned daggers.")
add_card("Umbri", "Bloodhex Cultist", "Entity", 2, 2, 2, "None", "Uncommon", "Battlecry: Sacrifice 2 hero Health to draw 2 cards.", "A pale cultist carving blood runes into a bone dagger over a dark brazier.")
add_card("Umbri", "Gloom Bat", "Entity", 2, 2, 3, "Evasive", "Common", "Lifesteal. Heals your hero whenever it deals combat damage.", "A giant vampire bat with translucent purple wings and razor fangs.")
add_card("Umbri", "Hexbinder Apprentice", "Entity", 2, 1, 4, "None", "Uncommon", "Whenever you cast a Rite, curse target enemy entity (-1 Attack).", "A young sorceress binding dark threads of purple hex energy between her fingers.")
add_card("Umbri", "Duskveil Executioner", "Entity", 3, 4, 2, "Piercing", "Common", "Deals double damage to damaged enemies.", "A hulking masked executioner carrying a blood-stained executioner's great-axe.")
add_card("Umbri", "Shadow Revenant", "Entity", 3, 3, 3, "Stealth", "Uncommon", "Deathrattle: Return this entity to your hand as a 2/2 Shadow Wisp.", "A spectral warrior clothed in shifting violet smoke.")
add_card("Umbri", "Nightblade Infiltrator", "Entity", 3, 2, 4, "Stealth", "Uncommon", "Cannot be targeted by spells while in Stealth. Destroys any unit with 2 or less Attack.", "A deadly rogue sliding through a stone keyhole as pure shadow smoke.")
add_card("Umbri", "Abyssal Hound", "Entity", 3, 4, 3, "None", "Common", "Lifesteal. Has +2 Attack if an enemy unit died this turn.", "A twin-headed demonic hound with glowing purple maw and dripping venom.")
add_card("Umbri", "Soul Harvester", "Entity", 4, 3, 5, "None", "Rare", "Whenever an entity dies, gain +1/+1 and gain 1 Shadow Energy.", "A grim reaper figure wielding an ethereal scythe that gathers blue soul wisps.")
add_card("Umbri", "Duskveil Shade-Weaver", "Entity", 4, 4, 4, "Stealth", "Rare", "Battlecry: Give all friendly Umbri entities Stealth for 1 turn.", "A dark sorcerer weaving a dome of absolute pitch-black night over allies.")
add_card("Umbri", "Abyssal Brute", "Entity", 4, 5, 5, "Guard", "Uncommon", "Battlecry: Deal 2 damage to your own hero.", "A lumbering musclebound brute stitched together with dark void magic.")
add_card("Umbri", "Crypt Lord Malakor", "Entity", 5, 5, 6, "Lifesteal", "Rare", "Battlecry: Steal 3 Health from all enemy units and give it to your hero.", "An ancient vampire lord in ornate black-gold gothic armor seated on a bone throne.")
add_card("Umbri", "Shadowfiend", "Entity", 5, 6, 4, "Stealth", "Rare", "Attacking from Stealth destroys target enemy unit instantly.", "A towering nightmare demon made of pure swirling void smoke and glowing purple eyes.")
add_card("Umbri", "Dreadsteed Knight", "Entity", 5, 4, 7, "Guard", "Rare", "Whenever this takes damage, summon a 1/1 Dusk Imp.", "A death knight in spiky black plate riding a flaming skeletal horse.")
add_card("Umbri", "Void Siren", "Entity", 6, 5, 6, "None", "Epic", "Battlecry: Take control of an enemy entity with 3 or less Attack for 2 turns.", "A hauntingly beautiful spectral siren singing cursed melodies over dark water.")
add_card("Umbri", "Abyssal Horror", "Entity", 6, 6, 6, "Overwhelm", "Epic", "Whenever this attacks, the defending unit is afflicted with Terrify (cannot counterattack).", "A nightmarish tentacled horror from the oceanic abyss with multiple glowing maws.")
add_card("Umbri", "Nightfall Matron", "Entity", 6, 4, 8, "None", "Epic", "Deathrattle: Destroy all enemy entities with 4 or less Health.", "A terrifying spider-like shadow queen brooding over a clutch of void eggs.")
add_card("Umbri", "Doomcaller of Malakor", "Entity", 7, 7, 6, "None", "Epic", "Battlecry: Destroy target enemy entity. Your hero loses 4 Health.", "A towering warlock in raven feathers pointing a bony finger of death.")
add_card("Umbri", "Void Colossus", "Entity", 7, 7, 9, "Guard", "Epic", "Damage dealt to this entity is reduced to 1.", "A colossal obsidian statue animated by dark souls marching through ruins.")
add_card("Umbri", "Shadowlord Malakor Unleashed", "Entity", 8, 8, 8, "Stealth", "Mythic", "Battlecry: Steal half of the enemy hero's current Health. Gains +1/+1 for each stolen Health.", "The ancient supreme dark lord hovering above the Duskveil fortress in full dread majesty.")
add_card("Umbri", "Abyssal Leviathan Behemoth", "Entity", 8, 9, 8, "Overwhelm", "Mythic", "Destroys any unit it attacks. Immune to spells.", "An oceanic void serpent so vast it swallows entire fleets in deep trenches.")
add_card("Umbri", "Avatar of the Endless Void", "Entity", 9, 10, 10, "Lifesteal", "Mythic", "At the start of your turn, destroy the enemy's highest Health entity.", "A cosmic tear in reality manifesting as a multi-eyed winged deity of pure nothingness.")

# --- 12 UMBRI RITES ---
add_card("Umbri", "Blood Offering", "Rite", 1, None, None, "None", "Common", "Sacrifice 3 hero Health: draw 2 cards.", "A silver chalice catching dark red blood to fuel forbidden knowledge.")
add_card("Umbri", "Shadow Curse", "Rite", 1, None, None, "None", "Common", "Target enemy entity has -2 Attack and takes 1 damage per turn.", "Black smoky tendrils wrapping around a warrior's weapon dulling its edge.")
add_card("Umbri", "Soul Drain", "Rite", 2, None, None, "None", "Common", "Deal 3 damage to target enemy. Restore 3 Health to your hero.", "A stream of purple ethereal life-force being ripped from an enemy.")
add_card("Umbri", "Shroud of Darkness", "Rite", 2, None, None, "None", "Uncommon", "Give all friendly entities Stealth until your next turn.", "A cloud of thick purple smoke rolling over an entire allied army.")
add_card("Umbri", "Death's Embrace", "Rite", 3, None, None, "None", "Uncommon", "Destroy a friendly unit: deal damage equal to its Health to target enemy.", "A willing cultist bursting into necrotic soul flames to incinerate a foe.")
add_card("Umbri", "Grave Call", "Rite", 3, None, None, "None", "Uncommon", "Summon two 2/2 Skeleton Warriors with Guard from the graveyard.", "Skeletal arms clawing their way out of dark marsh mud.")
add_card("Umbri", "Hex of Vulnerability", "Rite", 4, None, None, "None", "Rare", "Target enemy takes double damage from all sources for 2 turns.", "A glowing purple pentagram appearing under an enemy's feet.")
add_card("Umbri", "Abyssal Grasp", "Rite", 4, None, None, "None", "Rare", "Destroy target enemy entity with 5 or more Attack. Gain 2 Shadow Energy.", "Giant shadow tentacles dragging an enemy champion into an abyss pit.")
add_card("Umbri", "Nightfall Plague", "Rite", 5, None, None, "None", "Epic", "Deal 3 damage to all enemy units. If any die, summon a 2/2 Shadow Wisp.", "A swarm of dark bats and disease mist sweeping through an enemy encampment.")
add_card("Umbri", "Siphon Life Force", "Rite", 6, None, None, "None", "Epic", "Steal 6 Health from the enemy hero and give it to your hero.", "Giant purple ethereal tether connecting two heroes draining life.")
add_card("Umbri", "Doom of the Eclipse", "Rite", 7, None, None, "None", "Mythic", "Destroy ALL entities on the board. Summon a 6/6 Void Terror under your control.", "A black solar eclipse casting the world into darkness while all mortal life crumbles.")
add_card("Umbri", "Reign of Shadows", "Rite", 8, None, None, "None", "Mythic", "For the rest of the game, your hero has Stealth on the opponent's turn and your spells cost 2 less.", "The sky turning into an eternal purple void canopy as the shadow realm merges.")

# --- 7 UMBRI FLASHES ---
add_card("Umbri", "Shadow Fade", "Flash", 1, None, None, "None", "Common", "Target entity gains Stealth immediately and avoids the current attack.", "An assassin dissolving into mist a split-second before a blade strikes.")
add_card("Umbri", "Hex Counter", "Flash", 1, None, None, "None", "Common", "When an enemy casts a Rite, increase its cost by 2 or cancel it.", "A dark runic curse interrupting an enemy wizard's hand incantations.")
add_card("Umbri", "Venomous Riposte", "Flash", 2, None, None, "None", "Uncommon", "When a friendly unit is attacked, the attacker is poisoned for 3 damage per turn.", "A poisoned dagger stabbing out from shadows catching the attacker's wrist.")
add_card("Umbri", "Soul Mirror", "Flash", 2, None, None, "None", "Uncommon", "When your hero takes damage, deal that same damage back to the enemy hero.", "A shattered obsidian mirror reflecting a bloody strike across distance.")
add_card("Umbri", "Vanish into Nether", "Flash", 3, None, None, "None", "Rare", "Return target friendly entity to your hand to save it from lethal damage.", "A portal to the void swallowing an ally before an explosion hits.")
add_card("Umbri", "Dark Pact", "Flash", 3, None, None, "None", "Rare", "Counter target spell. Lose 3 Health.", "A blood rune burning on the caster's palm as an enemy spell is snuffed out.")
add_card("Umbri", "Shadow Swap", "Flash", 4, None, None, "None", "Epic", "Swap the positions and health of two target entities on the board.", "Two characters exchanging positions in twin swirling vortexes of shadow.")

# --- 6 UMBRI RELICS ---
add_card("Umbri", "Dagger of the Nightblade", "Relic", 1, None, None, "None", "Common", "Your hero gains +2 Attack while attacking from Stealth.", "A curved obsidian dagger coated in deadly purple belladonna poison.")
add_card("Umbri", "Tome of the Bloodhex", "Relic", 2, None, None, "None", "Uncommon", "Whenever you lose Health on your turn, draw a card.", "A grim grimoire bound in black leather with iron clasps and bleeding pages.")
add_card("Umbri", "Amulet of the Abyssal Void", "Relic", 3, None, None, "None", "Rare", "Whenever an enemy entity dies, restore 2 Health to your hero.", "A dark gemstone necklace that drinks the dying breath of fallen foes.")
add_card("Umbri", "Cloak of the Shadowlord", "Relic", 4, None, None, "None", "Rare", "Your hero has Stealth unless you attacked this turn.", "A billowing cape of pure velvet night that renders the wearer invisible in darkness.")
add_card("Umbri", "Scythe of the Soulreaper", "Relic", 5, None, None, "None", "Epic", "Entities destroyed by your hero cannot be resurrected and summon a 2/2 Shade.", "A massive two-handed scythe carved from bone with a razor void-steel blade.")
add_card("Umbri", "Eye of the Void Leviathan", "Relic", 6, None, None, "None", "Mythic", "At the start of your turn, deal 3 damage to all enemies and heal your hero for 3.", "A pulsating softball-sized obsidian eye staring from a gold claw pedestal.")

# ==============================================================================
# FACTION 4: AETHER (50 Cards)
# ==============================================================================
# --- 25 AETHER ENTITIES ---
add_card("Aether", "Rift Wisp", "Entity", 1, 1, 1, "Evasive", "Common", "When deployed, gain 1 temporary Astral Energy this turn.", "A glowing cyan orb of starlight dancing above crystalline grass.")
add_card("Aether", "Chrono Novice", "Entity", 1, 1, 2, "None", "Common", "When you cast a Flash card, gain +1 Attack this turn.", "A young student in blue robes studying floating hourglass sand.")
add_card("Aether", "Astral Beacon", "Entity", 1, 0, 3, "Guard", "Common", "Your spells cost 1 less Energy (minimum 1).", "A hovering crystal obelisk emitting pulsating blue signal waves into the sky.")
add_card("Aether", "Riftblade Scout", "Entity", 2, 2, 2, "Evasive", "Common", "Can phase through enemy Guard units to attack any target.", "An agile duelist wielding an energy rapier that blinks across meters.")
add_card("Aether", "Starlight Scholar", "Entity", 2, 2, 3, "None", "Common", "Battlecry: Scry the top 3 cards of your deck and reorder them.", "An astrologer reading glowing celestial star-charts hovering in mid-air.")
add_card("Aether", "Chrono-Scout", "Entity", 2, 3, 1, "Charge", "Common", "Deathrattle: Return a random Flash card from graveyard to your hand.", "A mechanical brass clockwork automaton running on miniature star-cores.")
add_card("Aether", "Singularity Sprite", "Entity", 2, 1, 4, "None", "Uncommon", "Whenever an enemy entity is summoned, deal 1 Arcane damage to it.", "A tiny fairy-like entity with wings made of spinning black hole disks.")
add_card("Aether", "Astral Conjuror", "Entity", 3, 2, 4, "None", "Common", "When deployed, add two 1/1 Astral Wisps to your hand.", "A mage conjuring crystalline familiars from open blue rift portals.")
add_card("Aether", "Temporal Duelist", "Entity", 3, 3, 3, "Evasive", "Uncommon", "Whenever this attacks, it blinks backward, taking no counterattack damage.", "A fencer who steps into the future, strikes, and returns to the present.")
add_card("Aether", "Gravity Warden", "Entity", 3, 2, 5, "Guard", "Uncommon", "Enemy entities with Charge lose Charge upon entering the battlefield.", "A heavy guardian manipulating magnetic gravity rings to slow approaching foes.")
add_card("Aether", "Riftblade Spellweaver", "Entity", 3, 4, 2, "None", "Uncommon", "Whenever you cast a spell, this entity attacks a random enemy.", "A spellblade fighter casting arcane bolts simultaneously with sword slashes.")
add_card("Aether", "Chronomancer Sage", "Entity", 4, 3, 5, "None", "Rare", "Battlecry: Choose an enemy entity; reset it to its base stats and remove all buffs.", "An ancient wizard turning a giant brass pocket watch backward in time.")
add_card("Aether", "Astral Drake", "Entity", 4, 4, 4, "Evasive", "Rare", "Battlecry: Deal 2 Arcane damage to 2 different enemy targets.", "A sleek dragon woven from deep-space starlight and blue nebulas.")
add_card("Aether", "Singularity Construct", "Entity", 4, 5, 4, "Piercing", "Uncommon", "Attacks pull target and adjacent enemies toward this entity.", "A floating construct made of magnetic dark-metal orbiting a gravity core.")
add_card("Aether", "Starlight Sovereign", "Entity", 5, 4, 6, "Spellshield", "Rare", "Whenever an enemy casts a spell, draw a card.", "A regal queen draped in flowing starlight robes holding a glowing celestial staff.")
add_card("Aether", "Rift Titan", "Entity", 5, 6, 5, "Overwhelm", "Rare", "Battlecry: Open a rift on target lane that deals 3 damage to any unit entering it.", "A giant armored colossus stepping halfway out of a tear in reality.")
add_card("Aether", "Time-Warp Dragon", "Entity", 5, 5, 5, "Evasive", "Rare", "Can attack twice per turn if you cast 2 or more spells this turn.", "A four-winged dragon leaving glowing afterimages of itself in the air.")
add_card("Aether", "Cosmic Inquisitor", "Entity", 6, 6, 6, "None", "Epic", "Battlecry: Banish target enemy unit from the game for 2 turns.", "An imposing judge holding an open portal to a pocket dimension.")
add_card("Aether", "Astral Leviathan of the Deep Rift", "Entity", 6, 7, 5, "Evasive", "Epic", "Battlecry: Freeze all enemy entities for 1 turn.", "A cosmic whale swimming through space nebulae trailing stardust.")
add_card("Aether", "Arch-Mage of the Conclave", "Entity", 6, 4, 7, "None", "Epic", "Your Rites and Flashes deal +2 additional damage.", "A grand wizard levitating with four floating grimoires casting simultaneous spells.")
add_card("Aether", "Sovereign of the Chrono-Spire", "Entity", 7, 6, 8, "None", "Epic", "At the end of your turn, rewind your hero's Health to whatever it was at the start.", "A towering chronomancer seated on a floating throne of clockwork gears.")
add_card("Aether", "Dimensional Colossus", "Entity", 7, 8, 8, "Guard", "Epic", "Immune to physical damage. Takes damage only from spells.", "A colossal crystal golem that phases out of physical reality when hit by weapons.")
add_card("Aether", "Celestial Singularity Titan", "Entity", 8, 8, 9, "Overwhelm", "Mythic", "Battlecry: Draw cards until your hand is full. All drawn cards cost 2 less.", "A celestial god-construct holding a miniature black hole in its hands.")
add_card("Aether", "Aether Drake Sovereign", "Entity", 8, 9, 8, "Evasive", "Mythic", "Can attack any target on the board directly regardless of Guard.", "An ancient cosmic dragon whose wingspan blots out the stars with glowing auroras.")
add_card("Aether", "Chronos, God of the Continuum", "Entity", 9, 10, 10, "Spellshield", "Mythic", "Battlecry: Take an extra turn after this one.", "The primordial deity of time himself standing outside the river of history.")

# --- 12 AETHER RITES ---
add_card("Aether", "Mana Bolt", "Rite", 1, None, None, "None", "Common", "Deal 2 Arcane damage to target enemy.", "A focused missile of blue arcane energy piercing target.")
add_card("Aether", "Astral Insight", "Rite", 1, None, None, "None", "Common", "Draw 1 card. If you cast another spell this turn, draw 2 cards instead.", "An eye opening in a floating starry constellation revealing the future.")
add_card("Aether", "Rift Portal", "Rite", 2, None, None, "None", "Common", "Summon two 1/1 Rift Wisps with Evasive.", "Two blue oval portals opening in mid-air releasing starlight sprites.")
add_card("Aether", "Chronos Arc", "Rite", 2, None, None, "None", "Uncommon", "Deal 3 damage to an enemy and slow its attack cooldown by 1 turn.", "A curved arc of blue chronocrystal energy freezing target in time.")
add_card("Aether", "Gravity Well", "Rite", 3, None, None, "None", "Uncommon", "Pull all enemy units together and deal 2 Arcane damage to all of them.", "A black vortex opening on the ground sucking all nearby enemies toward the center.")
add_card("Aether", "Arcane Missiles Barrage", "Rite", 3, None, None, "None", "Uncommon", "Shoot 5 missiles that deal 1 damage each to random enemies.", "A volley of five glowing blue missiles tracing spirals toward enemy lines.")
add_card("Aether", "Temporal Stasis Field", "Rite", 4, None, None, "None", "Rare", "Freeze all enemy units for 1 turn. Draw a card.", "A giant blue clock face appearing over the battlefield freezing everything in place.")
add_card("Aether", "Astral Convergence", "Rite", 4, None, None, "None", "Rare", "Deal 5 Arcane damage. If this kills the target, gain 3 Astral Energy.", "Three beams of starlight focusing on a single point in a blinding flash.")
add_card("Aether", "Dimensional Fracture", "Rite", 5, None, None, "None", "Epic", "Banish target enemy unit into a void rift. It takes 3 damage every turn.", "A jagged crack in reality swallowing an enemy soldier whole.")
add_card("Aether", "Time Loop Paradox", "Rite", 6, None, None, "None", "Epic", "Replay the last card you played this turn for 0 Energy cost.", "An hourglass flipping upside down as the same magical explosion repeats.")
add_card("Aether", "Celestial Supernova", "Rite", 7, None, None, "None", "Mythic", "Deal 6 Arcane damage to all enemies and freeze any surviving units.", "A miniature star going supernova in the middle of the battlefield.")
add_card("Aether", "Rewind the Continuum", "Rite", 8, None, None, "None", "Mythic", "Reset the entire battlefield to the exact state it was at the start of your previous turn.", "The entire universe rewinding like a video tape, restoring fallen heroes and towers.")

# --- 7 AETHER FLASHES ---
add_card("Aether", "Blink Step", "Flash", 1, None, None, "None", "Common", "Teleport target friendly entity 10 yards away, evading the current attack.", "A wizard blinking forward into blue sparkles leaving afterimages behind.")
add_card("Aether", "Counter Pulse", "Flash", 1, None, None, "None", "Common", "Counter an enemy Flash card.", "A quick flick of a wand releasing a blue shockwave that cancels a spell.")
add_card("Aether", "Time Stop Parry", "Flash", 2, None, None, "None", "Uncommon", "When an enemy entity attacks, freeze time for 1 second and cancel the attack.", "A rapier blade stopping mid-air an inch from an ally's eye.")
add_card("Aether", "Aether Purge", "Flash", 2, None, None, "None", "Uncommon", "Dispel all positive buffs on target enemy and deal 2 damage to it.", "A burst of blue purifying starlight stripping glowing wards from a paladin.")
add_card("Aether", "Phase Shift", "Flash", 3, None, None, "None", "Rare", "Your hero becomes Invulnerable and untargetable until the start of your next turn.", "The hero turning into a translucent starry hologram that swords pass right through.")
add_card("Aether", "Chrono Reversal", "Flash", 3, None, None, "None", "Rare", "When your hero takes damage, cancel that damage and restore that much Health instead.", "A lethal fireball hitting the hero, then reversing direction and healing them.")
add_card("Aether", "Dimensional Anchor Trap", "Flash", 4, None, None, "None", "Epic", "Tether target enemy unit to its current spot; moving or attacking snaps it back and stuns for 2 turns.", "A glowing cyan astrological anchor locking an enemy to coordinates.")

# --- 6 AETHER RELICS ---
add_card("Aether", "Chronocore Prism", "Relic", 1, None, None, "None", "Common", "Whenever you cast a Flash card, gain 1 Astral Energy.", "A multi-faceted glowing cyan gemstone spinning inside brass gimbals.")
add_card("Aether", "Hourglass of the Continuum", "Relic", 2, None, None, "None", "Uncommon", "Once per turn, you can scry the top card of your deck and put it on bottom if desired.", "A beautiful antique hourglass where sand flows upward into the top bulb.")
add_card("Aether", "Riftblade Conduit", "Relic", 3, None, None, "None", "Rare", "Your hero's basic attacks deal Arcane damage and ignore 50% of armor.", "A forearm bracer that projects a blade of humming plasma starlight.")
add_card("Aether", "Astrolabe of the Conclave", "Relic", 4, None, None, "None", "Rare", "Your Rites and Flashes cost 1 less Energy (minimum 1).", "An intricate celestial astrolabe tracking planetary orbits in real time.")
add_card("Aether", "Singularity Core of Time", "Relic", 5, None, None, "None", "Epic", "Whenever you cast 3 spells in a turn, take an extra turn after this one.", "A miniature black hole contained in a floating magnetic sphere.")
add_card("Aether", "Crown of the Chronosavant", "Relic", 6, None, None, "None", "Mythic", "Draw 2 additional cards at the start of each turn. Maximum hand size increased to 10.", "A crown of floating cyan starlight crystals worn by the ancient Arch-Mage.")

print(f"Generated {len(NEW_CARDS)} brand-new canonical Glimmerfall cards!")
print(f"Solari: {sum(1 for c in NEW_CARDS if c['faction'] == 'Solari')}")
print(f"Terra:  {sum(1 for c in NEW_CARDS if c['faction'] == 'Terra')}")
print(f"Umbri:  {sum(1 for c in NEW_CARDS if c['faction'] == 'Umbri')}")
print(f"Aether: {sum(1 for c in NEW_CARDS if c['faction'] == 'Aether')}")

# Save the 200 new cards
os.makedirs("canon/cards", exist_ok=True)
with open("canon/cards/tcg_cards_200_new.json", "w") as f:
    json.dump(NEW_CARDS, f, indent=2)

# Load existing 122 cards and merge
with open("canon/cards/tcg_cards.json", "r") as f:
    existing = json.load(f)

merged = existing + NEW_CARDS
with open("canon/cards/tcg_cards_expanded.json", "w") as f:
    json.dump(merged, f, indent=2)

print(f"Merged total cards: {len(merged)} (Original {len(existing)} + New {len(NEW_CARDS)})")
