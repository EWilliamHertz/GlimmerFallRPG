import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_fegOqQaL5Wr9@ep-round-lab-atbehctx-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require';

export const dbPool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

export interface TcgCardRecord {
  id: string;
  name: string;
  card_type: 'Entity' | 'Rite' | 'Flash' | 'Relic' | string;
  cost: number;
  power: number | null;
  health: number | null;
  description: string;
  image_url: string | null;
  faction: 'Solari' | 'Umbri' | 'Terra' | 'Aether' | string;
  keywords: string | null;
  rarity: string | null;
  ai_art_prompt: string | null;
  image_prompt: string | null;
  set_name: string | null;
  collector_number: number | null;
  set_code: string | null;
  lore: string | null;
  'new card 20/10 -26'?: string | null;
}

export async function getAllTcgCards(): Promise<TcgCardRecord[]> {
  const result = await dbPool.query<TcgCardRecord>(`
    SELECT 
      id, name, card_type, cost, power, health, description, 
      image_url, faction, keywords, rarity, ai_art_prompt, 
      image_prompt, set_name, collector_number, set_code, lore,
      "new card 20/10 -26"
    FROM cards2
    ORDER BY faction, card_type, cost, name;
  `);
  return result.rows;
}
