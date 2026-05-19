const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\hp\\Mailent\\components\\ui\\ai-prompt-box.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('bg-') || line.includes('background') || line.includes('style=')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
