import express from 'express';
import { randomUUID } from 'node:crypto';
import { readReports, saveReports } from './store.js';

const app = express();
app.use(express.json());

// Remove the private edit key before sending a report to the public.
function publicReport(report) {
  const { editKey, ...reportWithoutKey } = report;
  return reportWithoutKey;
}

function validReport(body) {
  return body
    && ['lost', 'found'].includes(body.type)
    && body.title?.trim()
    && body.description?.trim()
    && body.category?.trim()
    && body.location?.trim();
}

app.get('/', (req, res) => {
  res.json({ message: 'Lost & Found API' });
});

// Get all reports. The query parameters are optional filters.
app.get('/api/reports', (req, res) => {
  let reports = readReports();

  if (req.query.search) {
    const search = req.query.search.toLowerCase();
    reports = reports.filter(report =>
      report.title.toLowerCase().includes(search)
      || report.description.toLowerCase().includes(search),
    );
  }

  for (const field of ['type', 'category', 'location', 'status']) {
    if (req.query[field]) {
      reports = reports.filter(report =>
        report[field].toLowerCase() === req.query[field].toLowerCase(),
      );
    }
  }

  res.json(reports.map(publicReport));
});

// Get one report by its ID.
app.get('/api/reports/:id', (req, res) => {
  const report = readReports().find(report => report.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(publicReport(report));
});

// Create a new lost or found report.
app.post('/api/reports', (req, res) => {
  if (!validReport(req.body)) {
    return res.status(400).json({ error: 'Please provide type, title, description, category and location' });
  }

  const report = {
    id: randomUUID(),
    type: req.body.type,
    title: req.body.title.trim(),
    description: req.body.description.trim(),
    category: req.body.category.trim(),
    location: req.body.location.trim(),
    status: 'open',
    createdAt: new Date().toISOString(),
    editKey: randomUUID(),
  };

  const reports = readReports();
  reports.push(report);
  saveReports(reports);

  // The edit key is returned only when the report is created.
  res.status(201).json({ report: publicReport(report), editKey: report.editKey });
});

// Check that a report exists and that its edit key is correct.
function findOwnedReport(req, res, next) {
  const reports = readReports();
  const report = reports.find(report => report.id === req.params.id);

  if (!report) return res.status(404).json({ error: 'Report not found' });
  if (req.get('X-Edit-Key') !== report.editKey) {
    return res.status(403).json({ error: 'Wrong edit key' });
  }

  req.reports = reports;
  req.report = report;
  next();
}

// Update the details of your report.
app.patch('/api/reports/:id', findOwnedReport, (req, res) => {
  if (req.report.status === 'recovered') {
    return res.status(400).json({ error: 'A recovered report cannot be edited' });
  }

  const fields = ['type', 'title', 'description', 'category', 'location'];
  const sentFields = fields.filter(field => req.body[field] !== undefined);

  if (sentFields.length === 0) {
    return res.status(400).json({ error: 'Send at least one report field' });
  }

  for (const field of sentFields) {
    if (typeof req.body[field] !== 'string' || !req.body[field].trim()) {
      return res.status(400).json({ error: `${field} must contain text` });
    }
  }

  if (req.body.type && !['lost', 'found'].includes(req.body.type)) {
    return res.status(400).json({ error: 'Type must be lost or found' });
  }

  for (const field of fields) {
    if (req.body[field] !== undefined) req.report[field] = req.body[field].trim();
  }

  saveReports(req.reports);
  res.json(publicReport(req.report));
});

// Mark your item as recovered.
app.patch('/api/reports/:id/status', findOwnedReport, (req, res) => {
  req.report.status = 'recovered';
  saveReports(req.reports);
  res.json(publicReport(req.report));
});

export default app;
