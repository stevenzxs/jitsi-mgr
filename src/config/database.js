import sqlite3 from 'sqlite3';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';
import config from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Database {
  constructor() {
    this.db = null;
    this.type = config.database.type;
  }

  async connect() {
    if (this.type === 'sqlite') {
      await this.connectSQLite();
    } else if (this.type === 'postgresql') {
      await this.connectPostgreSQL();
    } else {
      throw new Error(`Unsupported database type: ${this.type}`);
    }
  }

  async connectSQLite() {
    const dbPath = config.database.path;
    const dbDir = dirname(dbPath);
    
    // 确保数据目录存在
    await mkdir(dbDir, { recursive: true });
    
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  async connectPostgreSQL() {
    const pool = new pg.Pool({
      connectionString: config.database.url
    });
    
    this.db = pool;
    
    try {
      await pool.query('SELECT NOW()');
      console.log('Connected to PostgreSQL database');
    } catch (err) {
      throw new Error(`Failed to connect to PostgreSQL: ${err.message}`);
    }
  }

  async query(sql, params = []) {
    if (this.type === 'sqlite') {
      return this.querySQLite(sql, params);
    } else if (this.type === 'postgresql') {
      return this.queryPostgreSQL(sql, params);
    }
  }

  async querySQLite(sql, params) {
    return new Promise((resolve, reject) => {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      } else {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ 
            rows: [], 
            lastID: this.lastID, 
            changes: this.changes 
          });
        });
      }
    });
  }

  async queryPostgreSQL(sql, params) {
    // 转换 SQLite 的 ? 占位符为 PostgreSQL 的 $1, $2...
    let pgSql = sql;
    let pgParams = params;
    
    if (params.length > 0) {
      let index = 1;
      pgSql = sql.replace(/\?/g, () => `$${index++}`);
    }
    
    const result = await this.db.query(pgSql, pgParams);
    return result;
  }

  async run(sql, params = []) {
    return this.query(sql, params);
  }

  async get(sql, params = []) {
    const result = await this.query(sql, params);
    return result.rows[0] || null;
  }

  async all(sql, params = []) {
    const result = await this.query(sql, params);
    return result.rows;
  }

  async close() {
    if (this.type === 'sqlite' && this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else if (this.type === 'postgresql' && this.db) {
      await this.db.end();
    }
  }
}

export default new Database();
