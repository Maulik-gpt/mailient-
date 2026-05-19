const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\hp\\Mailent\\app\\dashboard\\agent-talk\\ChatInterface.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('bg-') || line.includes('bg-[#')) {
    if (!line.includes('bg-arcus-') && !line.includes('bg-white/[') && !line.includes('bg-black/[')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
