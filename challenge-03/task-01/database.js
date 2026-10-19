import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

const databaseFile = process.env.DATABASE_FILE || 'store.sqlite';
const db = new DatabaseSync(databaseFile);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    stock INTEGER NOT NULL CHECK (stock >= 0)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    total_cents INTEGER NOT NULL,
    idempotency_key TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE (user_id, idempotency_key)
  );
`);

const addProduct = db.prepare(`
  INSERT OR IGNORE INTO products (id, name, price_cents, stock)
  VALUES (?, ?, ?, ?)
`);

addProduct.run(1, 'Mechanical Keyboard', 7500, 5);
addProduct.run(2, 'Wireless Mouse', 3500, 10);
addProduct.run(3, 'Gaming Headset', 6000, 3);

export function getProducts() {
  return db.prepare('SELECT * FROM products ORDER BY id').all();
}

export function getProduct(id) {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
}

export function getOrders(userId) {
  return db.prepare(`
    SELECT orders.*, products.name AS product_name
    FROM orders
    JOIN products ON products.id = orders.product_id
    WHERE orders.user_id = ?
    ORDER BY orders.created_at DESC
  `).all(userId);
}

export function createOrder({ userId, productId, quantity, idempotencyKey }) {
  db.exec('BEGIN IMMEDIATE');

  try {
    const previousOrder = db.prepare(`
      SELECT * FROM orders WHERE user_id = ? AND idempotency_key = ?
    `).get(userId, idempotencyKey);

    if (previousOrder) {
      db.exec('COMMIT');

      if (previousOrder.product_id !== productId || previousOrder.quantity !== quantity) {
        return { error: 'This idempotency key was already used for a different order' };
      }

      return { order: previousOrder, repeated: true };
    }

    const product = getProduct(productId);
    if (!product) {
      db.exec('ROLLBACK');
      return { error: 'Product not found', notFound: true };
    }

    const result = db.prepare(`
      UPDATE products
      SET stock = stock - ?
      WHERE id = ? AND stock >= ?
    `).run(quantity, productId, quantity);

    if (result.changes === 0) {
      db.exec('ROLLBACK');
      return { error: 'Product is sold out or has insufficient stock' };
    }

    const order = {
      id: randomUUID(),
      user_id: userId,
      product_id: productId,
      quantity,
      total_cents: product.price_cents * quantity,
      idempotency_key: idempotencyKey,
      created_at: new Date().toISOString(),
    };

    db.prepare(`
      INSERT INTO orders
        (id, user_id, product_id, quantity, total_cents, idempotency_key, created_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?)
    `).run(
      order.id,
      order.user_id,
      order.product_id,
      order.quantity,
      order.total_cents,
      order.idempotency_key,
      order.created_at,
    );

    db.exec('COMMIT');
    return { order, repeated: false };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
