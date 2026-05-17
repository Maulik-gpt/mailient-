import fs from 'fs';
import path from 'path';

const filePath = path.resolve('app/share/[id]/page.tsx');
if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const keywords = ['text-white/', 'text-neutral-', 'text-gray-', 'text-white/80', 'text-white/90', 'text-white/70'];

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
