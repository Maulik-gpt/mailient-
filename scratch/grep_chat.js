import fs from 'fs';
import path from 'path';

const filePath = path.resolve('app/dashboard/agent-talk/ChatInterface.tsx');
if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const keywords = ['messages.map', 'role', 'text-white', 'connect', 'tools', 'ConnectorBanner'];

keywords.forEach(kw => {
  console.log(`=== Matches for "${kw}" ===`);
  let count = 0;
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes(kw.toLowerCase())) {
      count++;
      if (count <= 25) {
        console.log(`${idx + 1}: ${line.trim()}`);
      }
    }
  });
  console.log(`Total matches: ${count}\n`);
});
