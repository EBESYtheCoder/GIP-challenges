import fs from 'node:fs';

const fileName = 'data/reports.json';

export function readReports() {
  if (!fs.existsSync(fileName)) return [];
  return JSON.parse(fs.readFileSync(fileName, 'utf8'));
}

export function saveReports(reports) {
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(fileName, JSON.stringify(reports, null, 2));
}
