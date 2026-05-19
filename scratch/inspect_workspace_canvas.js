const fs = require('fs');
const files = [
  'c:\\Users\\hp\\Mailent\\app\\dashboard\\agent-talk\\components\\ArcusWorkspace.tsx',
  'c:\\Users\\hp\\Mailent\\app\\dashboard\\agent-talk\\components\\CanvasPanel.tsx'
];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  console.log(`\n=== File: ${file} ===`);
  lines.forEach((line, idx) => {
    if (line.includes('bg-') || line.includes('#')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
});
