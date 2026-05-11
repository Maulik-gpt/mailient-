import fs from 'fs';

const content = fs.readFileSync('./lib/openrouter-ai.js', 'utf8');
const lines = content.split('\n');
console.log("Listing methods/functions in openrouter-ai.js:");
lines.forEach((line, i) => {
  if (line.includes('async ') || line.includes('generate') || line.includes('enhance') || line.includes('Note')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
