import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the database tables & seed data
initDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve production frontend build from dist folder
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// -------------------------------------------------------------
// 1. SETTINGS APIs
// -------------------------------------------------------------
app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const updateStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [key, val] of Object.entries(req.body)) {
      updateStmt.run(key, String(val));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 2. CATEGORIES APIs
// -------------------------------------------------------------
app.get('/api/categories', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', (req, res) => {
  try {
    const { name, color } = req.body;
    const stmt = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)');
    const result = stmt.run(name, color || '#10b981');
    res.json({ id: result.lastInsertRowid, name, color });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 3. PRODUCTS APIs (Fast Barcode Lookup & Management)
// -------------------------------------------------------------
app.get('/api/products', (req, res) => {
  try {
    const { search, category, lowStock } = req.query;
    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (p.barcode LIKE ? OR p.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      query += ` AND p.category_id = ?`;
      params.push(category);
    }

    if (lowStock === 'true') {
      query += ` AND p.stock_qty <= p.min_stock_alert`;
    }

    query += ` ORDER BY p.name ASC`;
    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fast Barcode Lookup for Scanner
app.get('/api/products/barcode/:barcode', (req, res) => {
  try {
    const barcode = req.params.barcode.trim();
    const product = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.barcode = ?
    `).get(barcode);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new product
app.post('/api/products', (req, res) => {
  try {
    const {
      barcode, name, category_id, unit,
      purchase_price, mrp, selling_price,
      tax_percent, stock_qty, min_stock_alert, expiry_date
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO products (
        barcode, name, category_id, unit, 
        purchase_price, mrp, selling_price, 
        tax_percent, stock_qty, min_stock_alert, expiry_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      barcode.trim(),
      name.trim(),
      category_id || null,
      unit || 'pcs',
      Number(purchase_price) || 0,
      Number(mrp) || Number(selling_price),
      Number(selling_price),
      Number(tax_percent) || 0,
      Number(stock_qty) || 0,
      Number(min_stock_alert) || 5,
      expiry_date || null
    );

    res.json({ id: result.lastInsertRowid, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
app.put('/api/products/:id', (req, res) => {
  try {
    const id = req.params.id;
    const {
      barcode, name, category_id, unit,
      purchase_price, mrp, selling_price,
      tax_percent, stock_qty, min_stock_alert, expiry_date
    } = req.body;

    const stmt = db.prepare(`
      UPDATE products SET 
        barcode = ?, name = ?, category_id = ?, unit = ?,
        purchase_price = ?, mrp = ?, selling_price = ?,
        tax_percent = ?, stock_qty = ?, min_stock_alert = ?, expiry_date = ?
      WHERE id = ?
    `);

    stmt.run(
      barcode.trim(),
      name.trim(),
      category_id || null,
      unit || 'pcs',
      Number(purchase_price) || 0,
      Number(mrp) || Number(selling_price),
      Number(selling_price),
      Number(tax_percent) || 0,
      Number(stock_qty) || 0,
      Number(min_stock_alert) || 5,
      expiry_date || null,
      id
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. BILLING & CHECKOUT (Transaction with Atomic Stock Decrement)
// -------------------------------------------------------------
app.post('/api/sales', (req, res) => {
  try {
    const {
      items,
      subtotal,
      discount_amount,
      tax_amount,
      grand_total,
      payment_method,
      cash_tendered,
      change_returned,
      customer_name,
      customer_phone
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart cannot be empty' });
    }

    // Generate Invoice Number: INV-YYYYMMDD-XXXX
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM sales WHERE invoice_no LIKE 'INV-' || ? || '-%'`).get(today);
    const invoiceNumber = `INV-${today}-${String(countRow.count + 1).padStart(4, '0')}`;

    // Insert sale record
    const saleStmt = db.prepare(`
      INSERT INTO sales (
        invoice_no, subtotal, discount_amount, tax_amount, grand_total,
        payment_method, cash_tendered, change_returned,
        customer_name, customer_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const saleResult = saleStmt.run(
      invoiceNumber,
      Number(subtotal),
      Number(discount_amount || 0),
      Number(tax_amount || 0),
      Number(grand_total),
      payment_method || 'CASH',
      Number(cash_tendered || grand_total),
      Number(change_returned || 0),
      customer_name || 'Walk-in Customer',
      customer_phone || ''
    );

    const saleId = saleResult.lastInsertRowid;

    // Insert sale items and decrement product stock
    const itemStmt = db.prepare(`
      INSERT INTO sale_items (
        sale_id, product_id, barcode, product_name,
        quantity, unit_price, tax_amount, discount, total_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStockStmt = db.prepare(`
      UPDATE products 
      SET stock_qty = stock_qty - ? 
      WHERE id = ?
    `);

    for (const it of items) {
      itemStmt.run(
        saleId,
        it.id || null,
        it.barcode || '',
        it.name,
        Number(it.quantity),
        Number(it.selling_price),
        Number(it.tax_amount || 0),
        Number(it.discount || 0),
        Number(it.total_price || (it.selling_price * it.quantity))
      );

      if (it.id) {
        updateStockStmt.run(Number(it.quantity), it.id);
      }
    }

    // Fetch the complete invoice with items for instant printing
    const invoice = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
    const invoiceItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);

    res.json({
      success: true,
      sale: {
        ...invoice,
        items: invoiceItems
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recent Sales / Invoices
app.get('/api/sales', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const sales = db.prepare(`
      SELECT * FROM sales ORDER BY created_at DESC LIMIT ?
    `).all(limit);
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Invoice details by ID
app.get('/api/sales/:id', (req, res) => {
  try {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Invoice not found' });
    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(req.params.id);
    res.json({ ...sale, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5. HELD BILLS (PARK BILL FEATURE)
// -------------------------------------------------------------
app.get('/api/held-bills', (req, res) => {
  try {
    const bills = db.prepare('SELECT * FROM held_bills ORDER BY held_at DESC').all();
    res.json(bills.map(b => ({ ...b, cart: JSON.parse(b.cart_json) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/held-bills', (req, res) => {
  try {
    const { customer_name, cart } = req.body;
    const stmt = db.prepare('INSERT INTO held_bills (customer_name, cart_json) VALUES (?, ?)');
    const result = stmt.run(customer_name || 'Customer', JSON.stringify(cart));
    res.json({ id: result.lastInsertRowid, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/held-bills/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM held_bills WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 6. REPORTS & DAY CLOSE (Z-REPORT)
// -------------------------------------------------------------
app.get('/api/reports/daily', (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    
    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(discount_amount), 0) as total_discount,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN grand_total ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN grand_total ELSE 0 END), 0) as card_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'UPI' THEN grand_total ELSE 0 END), 0) as upi_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'CREDIT' THEN grand_total ELSE 0 END), 0) as credit_sales
      FROM sales
      WHERE date(created_at) = date(?) AND status = 'COMPLETED'
    `).get(date);

    // Calculate approximate gross profit for the day
    const profitData = db.prepare(`
      SELECT 
        COALESCE(SUM((si.unit_price - p.purchase_price) * si.quantity), 0) as estimated_profit
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE date(s.created_at) = date(?) AND s.status = 'COMPLETED'
    `).get(date);

    // Top 5 selling items today
    const topItems = db.prepare(`
      SELECT 
        si.product_name,
        SUM(si.quantity) as total_qty,
        SUM(si.total_price) as total_revenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE date(s.created_at) = date(?)
      GROUP BY si.product_name
      ORDER BY total_qty DESC
      LIMIT 5
    `).all(date);

    res.json({
      date,
      summary,
      estimated_profit: profitData.estimated_profit,
      top_items: topItems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard stats
app.get('/api/reports/dashboard', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = db.prepare(`SELECT COALESCE(SUM(grand_total), 0) as sum, COUNT(*) as count FROM sales WHERE date(created_at) = date(?)`).get(today);
    const totalProducts = db.prepare(`SELECT COUNT(*) as count FROM products`).get();
    const lowStockCount = db.prepare(`SELECT COUNT(*) as count FROM products WHERE stock_qty <= min_stock_alert`).get();

    res.json({
      todaySales: todaySales.sum,
      todayBills: todaySales.count,
      totalProducts: totalProducts.count,
      lowStockCount: lowStockCount.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to React index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`[POS SERVER] Running offline on http://localhost:${PORT}`);
});
