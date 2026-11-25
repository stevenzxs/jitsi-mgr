import db from '../src/config/database.js';

const migrations = [
  {
    version: 1,
    name: 'create_users_table',
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE,
        phone VARCHAR(20),
        display_name VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_at TIMESTAMP,
        approved_by INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `
  },
  {
    version: 2,
    name: 'create_registration_requests_table',
    up: `
      CREATE TABLE IF NOT EXISTS registration_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        reason TEXT,
        additional_info TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        reviewer_id INTEGER,
        review_comment TEXT,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (reviewer_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_registration_status ON registration_requests(status);
      CREATE INDEX IF NOT EXISTS idx_registration_user ON registration_requests(user_id);
    `
  },
  {
    version: 3,
    name: 'create_sessions_table',
    up: `
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        device_type VARCHAR(20),
        device_info TEXT,
        ip_address VARCHAR(45),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    `
  },
  {
    version: 4,
    name: 'create_audit_logs_table',
    up: `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action VARCHAR(50) NOT NULL,
        resource_type VARCHAR(50),
        resource_id INTEGER,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    `
  }
];

async function getCurrentVersion() {
  try {
    const result = await db.get('SELECT MAX(version) as version FROM migrations');
    return result ? result.version || 0 : 0;
  } catch (err) {
    // migrations 表不存在，创建它
    await db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    return 0;
  }
}

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    await db.connect();
    
    const currentVersion = await getCurrentVersion();
    console.log(`Current database version: ${currentVersion}`);
    
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(`Applying migration ${migration.version}: ${migration.name}`);
        
        // 执行迁移
        const statements = migration.up.split(';').filter(s => s.trim());
        for (const statement of statements) {
          if (statement.trim()) {
            await db.run(statement);
          }
        }
        
        // 记录迁移
        await db.run(
          'INSERT INTO migrations (version, name) VALUES (?, ?)',
          [migration.version, migration.name]
        );
        
        console.log(`✓ Migration ${migration.version} applied successfully`);
      }
    }
    
    console.log('All migrations completed!');
    await db.close();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    await db.close();
    process.exit(1);
  }
}

runMigrations();
