const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\hp\\Mailent\\app\\dashboard\\agent-talk\\ChatInterface.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('bg-white') || line.includes('bg-black') || line.includes('dark:bg-black') || line.includes('dark:bg-white')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
