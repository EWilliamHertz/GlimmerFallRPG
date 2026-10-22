import fs from 'fs';
import path from 'path';
import { dbPool, getAllTcgCards, TcgCardRecord } from '../server/db';

async function syncFromNeon() {
  console.log('🔄 Connecting to Neon PostgreSQL (GlimmerFallTCG)...');
  
  try {
    const cards = await getAllTcgCards();
    console.log(`✅ Fetched ${cards.length} cards from Neon DB cards2 table!`);

    const canonDir = path.resolve(__dirname, '../canon');
    const cardsDir = path.join(canonDir, 'cards');
    if (!fs.existsSync(canonDir)) fs.mkdirSync(canonDir, { recursive: true });
    if (!fs.existsSync(cardsDir)) fs.mkdirSync(cardsDir, { recursive: true });

    // 1. Write Structured JSON Canon
    const jsonPath = path.join(cardsDir, 'tcg_cards.json');
    fs.writeFileSync(jsonPath, JSON.stringify(cards, null, 2), 'utf-8');
    console.log(`📁 Wrote ${cards.length} cards to ${jsonPath}`);

    // Group cards by faction and type
    const byFaction: Record<string, TcgCardRecord[]> = {};
    const byType: Record<string, TcgCardRecord[]> = {};

    for (const card of cards) {
      const fac = card.faction || 'Neutral';
      const type = card.card_type || 'Unknown';
      if (!byFaction[fac]) byFaction[fac] = [];
      if (!byType[type]) byType[type] = [];
      byFaction[fac].push(card);
      byType[type].push(card);
    }

    // 2. Generate Rich Markdown Lore & Mechanics Bible (Antigravity & Human SSOT)
    let loreMd = `# 📜 Glimmerfall Universe Compendium & Canon Bible\n\n`;
    loreMd += `> **Single Source of Truth (SSOT)** for Glimmerfall TCG ([GlimmerFallTCG.com](https://GlimmerFallTCG.com)), the 3D MMORPG, and the Animated TV Series.\n`;
    loreMd += `> Connected to live Neon PostgreSQL database (\`cards2\` table: **${cards.length} Total Cards**).\n\n`;

    loreMd += `## 🌟 Executive Summary & Faction Breakdown\n\n`;
    loreMd += `| Faction | Total Cards | Entities (Units) | Rites (Spells) | Flash (Instants) | Relics (Artifacts) |\n`;
    loreMd += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    for (const [fac, fCards] of Object.entries(byFaction)) {
      const entities = fCards.filter((c) => c.card_type === 'Entity').length;
      const rites = fCards.filter((c) => c.card_type === 'Rite').length;
      const flash = fCards.filter((c) => c.card_type === 'Flash').length;
      const relics = fCards.filter((c) => c.card_type === 'Relic').length;
      loreMd += `| **${fac}** | ${fCards.length} | ${entities} | ${rites} | ${flash} | ${relics} |\n`;
    }
    loreMd += `\n---\n\n`;

    loreMd += `## ⚔️ Card-to-RPG Ability & Entity Translation Rules\n\n`;
    loreMd += `1. **Entities (${byType['Entity']?.length || 0})**:\n`;
    loreMd += `   - In the TCG: Units deployed to the battlefield with Power and Health.\n`;
    loreMd += `   - In the MMORPG: 3D NPCs, world mobs, companions, or dungeon bosses with stats scaled to RPG level.\n`;
    loreMd += `   - In the TV Series: Named characters, combatants, soldiers, and creatures.\n\n`;

    loreMd += `2. **Rites (${byType['Rite']?.length || 0})**:\n`;
    loreMd += `   - In the TCG: Main-phase tactical sorceries and grand magic.\n`;
    loreMd += `   - In the MMORPG: Action bar combat abilities (cast-time or channeled high-potency spells).\n`;
    loreMd += `   - In the TV Series: Climax spell sequences and visual VFX spectacles.\n\n`;

    loreMd += `3. **Flash (${byType['Flash']?.length || 0})**:\n`;
    loreMd += `   - In the TCG: Instant-speed counter-spells and reactive tactical maneuvers.\n`;
    loreMd += `   - In the MMORPG: Off-GCD interrupts, defensive shields, panic heals, and mobility blinks.\n`;
    loreMd += `   - In the TV Series: Split-second parries, surprise reversals, and clutch tactical reactions.\n\n`;

    loreMd += `4. **Relics (${byType['Relic']?.length || 0})**:\n`;
    loreMd += `   - In the TCG: Persistent artifacts providing continuous passive advantages.\n`;
    loreMd += `   - In the MMORPG: The 3-card socketed Relic Deck in the \`[C]\` menu modifying stats & traits.\n`;
    loreMd += `   - In the TV Series: Ancient artifacts of power fought over across the biomes.\n\n`;

    loreMd += `---\n\n`;
    loreMd += `## 📚 Complete Card & Ability Codex\n\n`;

    for (const [fac, fCards] of Object.entries(byFaction)) {
      loreMd += `### 🏛️ ${fac} Faction (${fCards.length} Cards)\n\n`;
      for (const card of fCards) {
        const costStr = card.cost !== null ? `${card.cost} Cost` : 'Free';
        const statsStr = card.card_type === 'Entity' ? ` • ${card.power}/${card.health} [ATK/HP]` : '';
        const kwStr = card.keywords && card.keywords !== 'None' ? ` • **Keywords:** \`${card.keywords}\`` : '';
        loreMd += `#### **${card.name}** (${card.card_type} • ${costStr}${statsStr})\n`;
        loreMd += `- **Description**: ${card.description || 'No description'}\n`;
        if (kwStr) loreMd += `- ${kwStr}\n`;
        if (card.ai_art_prompt) loreMd += `- **Visual Prompt**: *"${card.ai_art_prompt}"*\n`;
        loreMd += `\n`;
      }
      loreMd += `---\n\n`;
    }

    const loreBiblePath = path.join(canonDir, 'LORE_BIBLE.md');
    fs.writeFileSync(loreBiblePath, loreMd, 'utf-8');
    console.log(`📖 Wrote Markdown Canon Bible to ${loreBiblePath}`);

    // 3. Generate TV Series Story & Google Flow Prompt Guide
    let tvMd = `# 🎬 Glimmerfall Animated Series — Google Flow Production Bible\n\n`;
    tvMd += `> Designed for scriptwriting, episode storyboarding, and prompt generation using **Google Flow** and modern AI video tools.\n\n`;

    tvMd += `## 🌟 Series Concept & World Lore\n`;
    tvMd += `- **Title**: *Glimmerfall: Chronicles of the Nexus*\n`;
    tvMd += `- **Setting**: The shattered continent of Glimmerfall, where four ancient civilizations struggle to restore the Grand Nexus Spire.\n`;
    tvMd += `- **Format**: 10-episode animated fantasy action series.\n\n`;

    tvMd += `## 🎨 Google Flow Visual Style Guide\n`;
    tvMd += `- **Aesthetic**: Arcane dark-fantasy meets Studio Fortiche (Arcane style) with cinematic lighting, dynamic particle embers, volumetric god rays, and hyper-detailed stylized character designs.\n`;
    tvMd += `- **Camera Language**: Sweeping aerial orbit shots, dramatic rack focus, tight profile parry cuts, high-altitude flight mount chase sequences.\n\n`;

    tvMd += `## 🎞️ Episode 1 Treatment: *"The Glimmerfall Awakens"*\n\n`;
    tvMd += `### Scene 1: The Shattered Spire (Opening Teaser)\n`;
    tvMd += `- **Setting**: Dawn over the Sunspire mountain ridge. The floating Aether islands drift in mist.\n`;
    tvMd += `- **Action**: A Solari Charger rides a golden warhorse across the canyon highway. Above, an Emberwing Hawk swoops down.\n`;
    tvMd += `- **Google Flow Prompt**:\n`;
    tvMd += `  \`\`\`text\n`;
    tvMd += `  Cinematic anime dark fantasy establishing shot, soaring mountain canyon, floating crystalline spire glowing with golden radiant energy, a Solari knight in gilded heavy armor riding through mist, volumetric dawn sunlight, hyper-detailed fantasy art, 4k cinematic render --ar 16:9 --style raw\n`;
    tvMd += `  \`\`\`\n\n`;

    tvMd += `### Scene 2: The Umbri Ambush (Flash Spell Clash)\n`;
    tvMd += `- **Action**: Shadows ripple across the stone floor. An Umbri assassin activates *Blinding Light* / shadow step, lunging forward.\n`;
    tvMd += `- **Google Flow Prompt**:\n`;
    tvMd += `  \`\`\`text\n`;
    tvMd += `  Intense dynamic combat close-up, dark rogue shrouded in purple void smoke dodging with acrobatic precision, dual radiant blade parry creating golden spark burst, motion blur, anime action sequence, cinematic 60fps anime style --ar 16:9\n`;
    tvMd += `  \`\`\`\n\n`;

    tvMd += `### Scene 3: The Rite of Radiant Strike\n`;
    tvMd += `- **Action**: Dawnbreaker Paladin channels *Radiant Strike*, hammering his mace into the earth to repel the void incursion.\n`;
    tvMd += `- **Google Flow Prompt**:\n`;
    tvMd += `  \`\`\`text\n`;
    tvMd += `  Epic fantasy magic climax, armored holy paladin striking ground with incandescent golden warhammer, shockwave of solar fire and glowing runic glyphs exploding outward, floating dust and glowing embers, dramatic low angle shot --ar 16:9\n`;
    tvMd += `  \`\`\`\n\n`;

    const tvPath = path.join(canonDir, 'TV_SERIES_BIBLE.md');
    fs.writeFileSync(tvPath, tvMd, 'utf-8');
    console.log(`🎬 Wrote TV Series & Google Flow Bible to ${tvPath}`);

    // 4. Generate TypeScript In-Memory Registry for MMORPG Server & Client
    let tsCode = `// Autogenerated from Neon PostgreSQL (cards2 table) - DO NOT EDIT DIRECTLY\n`;
    tsCode += `// Generated on ${new Date().toISOString()}\n\n`;
    tsCode += `export interface NeonTcgCard {\n`;
    tsCode += `  id: string;\n`;
    tsCode += `  name: string;\n`;
    tsCode += `  cardType: 'Entity' | 'Rite' | 'Flash' | 'Relic' | string;\n`;
    tsCode += `  cost: number;\n`;
    tsCode += `  power: number | null;\n`;
    tsCode += `  health: number | null;\n`;
    tsCode += `  description: string;\n`;
    tsCode += `  imageUrl: string | null;\n`;
    tsCode += `  faction: 'Solari' | 'Umbri' | 'Terra' | 'Aether' | string;\n`;
    tsCode += `  keywords: string | null;\n`;
    tsCode += `  rarity: string | null;\n`;
    tsCode += `  aiArtPrompt: string | null;\n`;
    tsCode += `}\n\n`;

    tsCode += `export const NEON_TCG_CARDS: NeonTcgCard[] = [\n`;
    for (const c of cards) {
      tsCode += `  {\n`;
      tsCode += `    id: ${JSON.stringify(c.id)},\n`;
      tsCode += `    name: ${JSON.stringify(c.name)},\n`;
      tsCode += `    cardType: ${JSON.stringify(c.card_type)},\n`;
      tsCode += `    cost: ${c.cost ?? 0},\n`;
      tsCode += `    power: ${c.power !== null ? c.power : 'null'},\n`;
      tsCode += `    health: ${c.health !== null ? c.health : 'null'},\n`;
      tsCode += `    description: ${JSON.stringify(c.description || '')},\n`;
      tsCode += `    imageUrl: ${JSON.stringify(c.image_url)},\n`;
      tsCode += `    faction: ${JSON.stringify(c.faction)},\n`;
      tsCode += `    keywords: ${JSON.stringify(c.keywords)},\n`;
      tsCode += `    rarity: ${JSON.stringify(c.rarity)},\n`;
      tsCode += `    aiArtPrompt: ${JSON.stringify(c.ai_art_prompt)},\n`;
      tsCode += `  },\n`;
    }
    tsCode += `];\n\n`;

    tsCode += `export const NEON_CARDS_BY_NAME: Record<string, NeonTcgCard> = Object.fromEntries(\n`;
    tsCode += `  NEON_TCG_CARDS.map((c) => [c.name.toLowerCase(), c])\n`;
    tsCode += `);\n`;

    const tsRegistryPath = path.resolve(__dirname, '../shared/tcgNeonRegistry.ts');
    fs.writeFileSync(tsRegistryPath, tsCode, 'utf-8');
    console.log(`⚡ Wrote TypeScript registry to ${tsRegistryPath}`);

    console.log('\n🎉 Neon Database Sync Completed Successfully!');
  } catch (err) {
    console.error('❌ Error syncing from Neon DB:', err);
  } finally {
    await dbPool.end();
  }
}

syncFromNeon();
