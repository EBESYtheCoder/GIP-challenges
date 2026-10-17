import express from 'express';
import { randomUUID, randomBytes, createHash } from 'node:crypto';

// Store a hash of the edit key, not the key itself.
const hash = key => createHash('sha256').update(key).digest('hex');

// Never include the private edit-key hash in a public response.
function publicReport(report) {
  const { editKeyHash, ...details } = report;
  return details;
}

// Return an error message if the submitted fields are invalid.
function validate(body, partial = false) {
  const fields = ['type', 'title', 'description', 'category', 'location'];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Send a JSON object.';
  if (!Object.keys(body).length) return 'Provide at least one field.';
  if (Object.keys(body).some(field => !fields.includes(field))) return 'An unknown field was supplied.';
  for (const field of fields) {
    if (partial && !Object.hasOwn(body, field)) continue;
    if (typeof body[field] !== 'string' || !body[field].trim()) return `${field} is required and must be text.`;
    if (body[field].length > 1000) return `${field} must be at most 1000 characters.`;
  }
  if (body.type !== undefined && !['lost', 'found'].includes(body.type)) return 'type must be lost or found.';
  return null;
}

export function createApp(store) {
  const app = express();
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.use(express.json({ limit: '10kb' }));
  app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  app.get('/', (req, res) => res.json({ message: 'Lost & Found API', reports: '/api/reports' }));

  // 1. Read all reports, optionally searching/filtering them.
  app.get('/api/reports', (req, res) => {
    const allowed = ['search', 'type', 'category', 'location', 'status'];
    for (const [key, value] of Object.entries(req.query)) {
      if (!allowed.includes(key) || typeof value !== 'string' || value.length > 1000) {
        return res.status(400).json({ error: 'Use the supported filters once each, with text values.' });
      }
    }
    if (req.query.type && !['lost', 'found'].includes(req.query.type)) return res.status(400).json({ error: 'type must be lost or found.' });
    if (req.query.status && !['open', 'recovered'].includes(req.query.status)) return res.status(400).json({ error: 'status must be open or recovered.' });
    let reports = store.read();
    if (req.query.search) {
      const search = req.query.search.toLowerCase();
      reports = reports.filter(item => `${item.title} ${item.description}`.toLowerCase().includes(search));
    }
    for (const field of ['type', 'category', 'location', 'status']) {
      if (req.query[field]) reports = reports.filter(item => item[field].toLowerCase() === req.query[field].toLowerCase());
    }
    res.json(reports.map(publicReport));
  });

  // 2. Read one report.
  app.get('/api/reports/:id', (req, res) => {
    const report = store.read().find(item => item.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    res.json(publicReport(report));
  });

  // 3. Create a lost or found report. Save the returned editKey!
  app.post('/api/reports', (req, res) => {
    const error = validate(req.body);
    if (error) return res.status(400).json({ error });
    const editKey = randomBytes(32).toString('hex');
    const report = {
      id: randomUUID(),
      type: req.body.type,
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      category: req.body.category.trim(),
      location: req.body.location.trim(),
      status: 'open',
      createdAt: new Date().toISOString(),
      editKeyHash: hash(editKey),
    };
    const reports = store.read();
    reports.push(report);
    store.save(reports);
    res.status(201).location(`/api/reports/${report.id}`).json({ report: publicReport(report), editKey });
  });

  // Both update routes use the same ownership check.
  function findOwnedReport(req, res, next) {
    const reports = store.read();
    const report = reports.find(item => item.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    const key = req.get('X-Edit-Key');
    if (!key) return res.status(401).json({ error: 'Provide your report’s X-Edit-Key header.' });
    if (hash(key) !== report.editKeyHash) return res.status(403).json({ error: 'This edit key does not own this report.' });
    req.reports = reports;
    req.report = report;
    next();
  }

  // 4. Edit selected fields of your report.
  app.patch('/api/reports/:id', findOwnedReport, (req, res) => {
    const error = validate(req.body, true);
    if (error) return res.status(400).json({ error });
    if (req.report.status === 'recovered') return res.status(409).json({ error: 'Recovered reports cannot be edited.' });
    for (const [field, value] of Object.entries(req.body)) req.report[field] = value.trim();
    store.save(req.reports);
    res.json(publicReport(req.report));
  });

  // 5. Mark your report recovered. Repeating this request is safe.
  app.patch('/api/reports/:id/status', findOwnedReport, (req, res) => {
    if (!req.body || req.body.status !== 'recovered' || Object.keys(req.body).length !== 1) {
      return res.status(400).json({ error: 'Send only { "status": "recovered" }.' });
    }
    req.report.status = 'recovered';
    store.save(req.reports);
    res.json(publicReport(req.report));
  });

  app.use((req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
    console.error(error.message);
    res.status(500).json({ error: 'Could not complete the request.' });
  });
  return app;
}
