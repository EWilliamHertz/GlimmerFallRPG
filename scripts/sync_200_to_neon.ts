import fs from 'fs';
import path from 'path';
import { dbPool } from '../server/db';

async function main() {
  console.log('🚀 Syncing 200 new cards to Neon PostgreSQL...');

  // 1. Backfill image_prompt for existing cards if null
  const backfillRes = await dbPool.query(`
    UPDATE cards2 
    SET image_prompt = ai_art_prompt 
    WHERE image_prompt IS NULL AND ai_art_prompt IS NOT NULL;
  `);
  console.log(`✅ Backfilled image_prompt for ${backfillRes.rowCount} existing cards.`);

  // 2. Read new cards JSON
  const newCardsPath = path.resolve(__dirname, '../canon/cards/tcg_cards_200_new.json');
  const newCards = JSON.parse(fs.readFileSync(newCardsPath, 'utf-8'));
  console.log(`📖 Read ${newCards.length} cards from ${newCardsPath}`);

  let inserted = 0;
  let updated = 0;

  // Ensure Primary Key on id
  await dbPool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cards2_pkey'
      ) THEN
        ALTER TABLE cards2 ADD CONSTRAINT cards2_pkey PRIMARY KEY (id);
      END IF;
    END
    $$;
  `);
  console.log('✅ Ensured PRIMARY KEY on cards2(id).');

  for (const card of newCards) {
    const promptVal = card.image_prompt || card.ai_art_prompt;
    card.image_prompt = promptVal;
    card['new card 20/10 -26'] = '*';

    // Insert or update on conflict by id
    const res = await dbPool.query(
      `
      INSERT INTO cards2 (
        id, name, card_type, cost, power, health, description, 
        image_url, faction, keywords, rarity, ai_art_prompt, 
        image_prompt, set_name, collector_number, set_code, lore, 
        "new card 20/10 -26"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 
        $8, $9, $10, $11, $12, 
        $13, $14, $15, $16, $17, 
        $18
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        card_type = EXCLUDED.card_type,
        cost = EXCLUDED.cost,
        power = EXCLUDED.power,
        health = EXCLUDED.health,
        description = EXCLUDED.description,
        faction = EXCLUDED.faction,
        keywords = EXCLUDED.keywords,
        rarity = EXCLUDED.rarity,
        ai_art_prompt = EXCLUDED.ai_art_prompt,
        image_prompt = EXCLUDED.image_prompt,
        set_name = EXCLUDED.set_name,
        collector_number = EXCLUDED.collector_number,
        set_code = EXCLUDED.set_code,
        lore = EXCLUDED.lore,
        "new card 20/10 -26" = EXCLUDED."new card 20/10 -26";
    `,
      [
        card.id,
        card.name,
        card.card_type,
        card.cost,
        card.power,
        card.health,
        card.description,
        card.image_url,
        card.faction,
        card.keywords,
        card.rarity,
        promptVal,
        promptVal,
        card.set_name,
        card.collector_number,
        card.set_code,
        card.lore,
        '*',
      ]
    );

    if (res.rowCount && res.rowCount > 0) {
      inserted++;
    }
  }

  console.log(`🎉 Successfully synced ${inserted} new expansion cards into Neon DB cards2!`);

  // Verify counts
  const totalCount = await dbPool.query('SELECT count(*) FROM cards2');
  const asteriskCount = await dbPool.query('SELECT count(*) FROM cards2 WHERE "new card 20/10 -26" = \'*\'');
  const promptCount = await dbPool.query('SELECT count(*) FROM cards2 WHERE image_prompt IS NOT NULL');

  console.log('📊 Verification Summary:');
  console.log('   Total cards in cards2:        ', totalCount.rows[0].count);
  console.log('   Cards with "*" in right col:  ', asteriskCount.rows[0].count);
  console.log('   Cards with image_prompt set:  ', promptCount.rows[0].count);

  // 3. Update local JSON files to include image_prompt and "new card 20/10 -26"
  fs.writeFileSync(newCardsPath, JSON.stringify(newCards, null, 2), 'utf-8');

  const expandedPath = path.resolve(__dirname, '../canon/cards/tcg_cards_expanded.json');
  if (fs.existsSync(expandedPath)) {
    const expanded = JSON.parse(fs.readFileSync(expandedPath, 'utf-8'));
    for (const c of expanded) {
      if (c.ai_art_prompt && !c.image_prompt) {
        c.image_prompt = c.ai_art_prompt;
      }
      if (c.set_code === 'EXP1' || c.collector_number > 122) {
        c['new card 20/10 -26'] = '*';
      }
    }
    fs.writeFileSync(expandedPath, JSON.stringify(expanded, null, 2), 'utf-8');
  }

  console.log('📁 Local JSON files updated.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error syncing to Neon:', err);
  process.exit(1);
});
