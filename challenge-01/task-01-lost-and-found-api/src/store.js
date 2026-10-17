import fs from 'node:fs';
import path from 'node:path';

// A JSON file is enough for this small, single-server exercise.
export function createStore(filename = 'data/reports.json') {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  if (!fs.existsSync(filename)) fs.writeFileSync(filename, '[]');

  return {
    read() {
      return JSON.parse(fs.readFileSync(filename, 'utf8'));
    },
    save(reports) {
      // Write a temporary file first, then replace the original.
      // If writing fails, we still have the previous complete file.
      fs.writeFileSync(`${filename}.tmp`, JSON.stringify(reports, null, 2));
      fs.renameSync(`${filename}.tmp`, filename);
    },
  };
}
