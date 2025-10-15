import { db } from './init.js';

async function migrateAntiCheatFields() {
  try {
    console.log('🔄 Starting anti-cheat fields migration...');

    // Check if columns already exist (PostgreSQL)
    const tableInfo = await db.allAsync(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'participants' AND table_schema = 'public'
    `);
    const existingColumns = tableInfo.map(col => col.column_name);

    const newColumns = [
      {
        name: 'cheat_score',
        type: 'INTEGER DEFAULT 0',
        description: 'Cumulative cheat detection score'
      },
      {
        name: 'cheat_events',
        type: 'JSONB',
        description: 'JSON array of cheat detection events'
      },
      {
        name: 'is_flagged',
        type: 'BOOLEAN DEFAULT FALSE',
        description: 'Whether participant is flagged for suspicious activity'
      },
      {
        name: 'last_cheat_detection',
        type: 'TIMESTAMP',
        description: 'Timestamp of last cheat detection'
      },
      {
        name: 'game_status',
        type: 'TEXT DEFAULT \'active\'',
        description: 'Current game status (active, flagged, eliminated)'
      }
    ];

    // Add new columns if they don't exist
    for (const column of newColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`➕ Adding column: ${column.name}`);
        await db.runAsync(`ALTER TABLE participants ADD COLUMN ${column.name} ${column.type}`);
      } else {
        console.log(`✅ Column already exists: ${column.name}`);
      }
    }

    // Add indexes for better performance
    console.log('📊 Adding indexes for anti-cheat fields...');
    
    try {
      await db.runAsync('CREATE INDEX IF NOT EXISTS idx_participants_cheat_score ON participants(cheat_score)');
      await db.runAsync('CREATE INDEX IF NOT EXISTS idx_participants_is_flagged ON participants(is_flagged)');
      await db.runAsync('CREATE INDEX IF NOT EXISTS idx_participants_game_status ON participants(game_status)');
    } catch (indexError) {
      console.log('ℹ️ Indexes may already exist:', indexError.message);
    }

    console.log('✅ Anti-cheat migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Anti-cheat migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateAntiCheatFields()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export default migrateAntiCheatFields;
