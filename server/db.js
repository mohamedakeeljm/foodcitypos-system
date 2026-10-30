import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path in the project root/data folder (or /tmp/data on Vercel)
const dataDir = process.env.VERCEL
  ? path.join('/tmp', 'data')
  : path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'pos_database.sqlite');
const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for high performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#10b981'
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category_id INTEGER,
      unit TEXT DEFAULT 'pcs',
      purchase_price REAL DEFAULT 0,
      mrp REAL NOT NULL,
      selling_price REAL NOT NULL,
      tax_percent REAL DEFAULT 0,
      stock_qty REAL DEFAULT 0,
      min_stock_alert REAL DEFAULT 10,
      expiry_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      credit_balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE NOT NULL,
      subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      grand_total REAL NOT NULL,
      payment_method TEXT NOT NULL, -- CASH, CARD, UPI, CREDIT
      cash_tendered REAL DEFAULT 0,
      change_returned REAL DEFAULT 0,
      customer_id INTEGER,
      customer_name TEXT,
      customer_phone TEXT,
      cashier_name TEXT DEFAULT 'Admin Cashier',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'COMPLETED'
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER,
      barcode TEXT,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      tax_amount REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total_price REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS held_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      held_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      customer_name TEXT,
      cart_json TEXT NOT NULL
    );
  `);

  // Default store settings
  const checkSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');

  const defaultSettings = [
    ['store_name', 'FOOD CITY'],
    ['store_address', 'Main Street, Sri Lanka'],
    ['store_phone', '+94 77 123 4567'],
    ['store_gstin', 'VAT-123456789'],
    ['currency_symbol', 'Rs.'],
    ['receipt_footer', 'Thank You! Visit Again.'],
    ['receipt_printer_width', '80mm']
  ];

  for (const [key, val] of defaultSettings) {
    const existing = checkSetting.get(key);
    if (!existing) {
      insertSetting.run(key, val);
    }
  }

  // Seed initial categories if empty
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (catCount === 0) {
    const insertCat = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)');
    insertCat.run('Groceries & Staples', '#10b981');
    insertCat.run('Dairy & Eggs', '#3b82f6');
    insertCat.run('Snacks & Biscuits', '#f59e0b');
    insertCat.run('Beverages & Drinks', '#ec4899');
    insertCat.run('Household & Cleaning', '#8b5cf6');
    insertCat.run('Personal Care', '#06b6d4');
  }

  // Seed initial sample products if empty
  const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (prodCount === 0) {
    const insertProd = db.prepare(`
      INSERT INTO products (barcode, name, category_id, unit, purchase_price, mrp, selling_price, tax_percent, stock_qty, min_stock_alert, expiry_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedProducts = [
      ['890103001', 'Basmati Rice (Classic 5kg)', 1, 'pkt', 420, 550, 499, 5, 45, 10, '2027-12-31'],
      ['890103002', 'Aashirvaad Whole Wheat Atta 5kg', 1, 'pkt', 210, 260, 245, 0, 30, 8, '2027-06-30'],
      ['890103003', 'Amul Butter 500g', 2, 'pkt', 230, 275, 265, 12, 18, 5, '2026-11-20'],
      ['890103004', 'Nandini GoodLife Milk 1L', 2, 'pkt', 45, 55, 52, 0, 24, 6, '2026-11-15'],
      ['890103005', 'Tata Salt Iodized 1kg', 1, 'pkt', 20, 28, 25, 0, 80, 15, '2028-01-01'],
      ['890103006', 'Fortune Sunflower Oil 1L', 1, 'ltr', 110, 145, 135, 5, 40, 10, '2027-05-15'],
      ['890103007', 'Parle-G Gold Biscuits 1kg', 3, 'pkt', 95, 120, 110, 18, 50, 12, '2027-04-10'],
      ['890103008', 'Lay\'s India\'s Magic Masala 50g', 3, 'pkt', 16, 20, 20, 18, 60, 10, '2027-02-28'],
      ['890103009', 'Coca Cola 750ml Pet Bottle', 4, 'btl', 32, 45, 42, 28, 35, 10, '2027-01-15'],
      ['890103010', 'Surf Excel Easy Wash Detergent 1kg', 5, 'pkt', 115, 145, 138, 18, 25, 5, '2028-01-01'],
      ['890103011', 'Colgate Total Toothpaste 150g', 6, 'pcs', 90, 125, 115, 18, 30, 8, '2027-08-30'],
      ['890103012', 'Tata Tea Premium 500g', 4, 'pkt', 170, 220, 205, 5, 20, 5, '2027-10-10']
    ];

    for (const p of seedProducts) {
      insertProd.run(...p);
    }
  }
}

export default db;
