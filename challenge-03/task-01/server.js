import express from 'express';
import { createOrder, getOrders, getProduct, getProducts } from './database.js';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Flash Sale API' });
});

app.get('/api/products', (req, res) => {
  res.json(getProducts());
});

app.get('/api/products/:id', (req, res) => {
  const product = getProduct(Number(req.params.id));

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
});

app.post('/api/orders', (req, res) => {
  const { userId, productId, quantity } = req.body || {};
  const idempotencyKey = req.get('Idempotency-Key');

  if (typeof userId !== 'string' || !userId.trim()) {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'productId and a positive quantity are required' });
  }

  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header is required' });
  }

  try {
    const result = createOrder({
      userId: userId.trim(),
      productId,
      quantity,
      idempotencyKey,
    });

    if (result.error) {
      const status = result.notFound ? 404 : 409;
      return res.status(status).json({ error: result.error });
    }

    const status = result.repeated ? 200 : 201;
    const message = result.repeated ? 'Existing order returned' : 'Order placed';
    res.status(status).json({ message, order: result.order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not place order' });
  }
});

app.get('/api/orders', (req, res) => {
  const userId = req.query.userId;

  if (typeof userId !== 'string' || !userId.trim()) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }

  res.json(getOrders(userId.trim()));
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Flash Sale API running at http://localhost:${port}`);
});
