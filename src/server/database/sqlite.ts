import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(__dirname, '../../../dist/data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'presale_contributions.db');

let db: sqlite3.Database;

export function getDatabase(): sqlite3.Database {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening SQLite database:', err);
        throw err;
      }
      console.log('✅ Connected to SQLite database');
    });
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      // Users table
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          fullName TEXT NOT NULL,
          staffId TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          involvedAccountNames TEXT,
          involvedSaleNames TEXT,
          involvedSaleEmails TEXT,
          role TEXT NOT NULL DEFAULT 'user',
          status TEXT NOT NULL DEFAULT 'pending',
          canViewOthers INTEGER DEFAULT 0,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Contributions table
      database.run(`
        CREATE TABLE IF NOT EXISTS contributions (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          accountName TEXT NOT NULL,
          saleName TEXT NOT NULL,
          saleEmail TEXT NOT NULL,
          contributionType TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          impact TEXT NOT NULL,
          effort TEXT NOT NULL,
          estimatedImpactValue REAL,
          contributionMonth TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'draft',
          tags TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating SQLite tables:', err);
          reject(err);
        } else {
          console.log('✅ SQLite tables created/verified');
          
          // Create admin user if not exists
          createAdminUser()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  });
}

async function createAdminUser(): Promise<void> {
  const database = getDatabase();
  const bcrypt = require('bcryptjs');
  
  return new Promise((resolve, reject) => {
    database.get('SELECT id FROM users WHERE email = ?', ['admin@presale.com'], async (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (row) {
        console.log('✅ Admin user already exists');
        resolve();
        return;
      }

      try {
        const hashedPassword = await bcrypt.hash('password', 10);
        
        database.run(`
          INSERT INTO users (id, fullName, staffId, email, password, role, status, canViewOthers, involvedAccountNames, involvedSaleNames, involvedSaleEmails)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'admin-001',
          'System Administrator',
          'ADMIN001',
          'admin@presale.com',
          hashedPassword,
          'admin',
          'approved',
          1,
          JSON.stringify(['System']),
          JSON.stringify(['Admin']),
          JSON.stringify(['admin@presale.com'])
        ], (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('✅ Admin user created');
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Helper functions for SQLite
export function dbQuery(query: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

export function dbQueryOne(query: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

export function dbExecute(query: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.run(query, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}
