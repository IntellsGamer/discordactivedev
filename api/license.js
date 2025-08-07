import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const licensePath = path.join(process.cwd(), 'LICENSE');
  fs.readFile(licensePath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('License file not found');
      return;
    }
    res.setHeader('Content-Type', 'text/plain');
    res.send(data);
  });
}
