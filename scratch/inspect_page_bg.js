const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\hp\\Mailent\\app\\dashboard\\agent-talk\\[[...id]]\\page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('bg-') || line.includes('#')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
