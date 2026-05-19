const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('c:\\Users\\hp\\Mailent\\app\\dashboard\\agent-talk');
console.log(`Found ${files.length} files. Scanning...`);

const patterns = [
  /bg-black/i,
  /bg-white/i,
  /dark:bg-black/i,
  /dark:bg-white/i,
  /#000000\b/i,
  /#ffffff\b/i,
  /\bblack\b/i,
  /\bwhite\b/i
];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const fileMatches = [];
  lines.forEach((line, idx) => {
    patterns.forEach(pattern => {
      if (pattern.test(line)) {
        fileMatches.push({ lineNum: idx + 1, text: line.trim() });
      }
    });
  });
  
  if (fileMatches.length > 0) {
    console.log(`\n=== File: ${path.relative('c:\\Users\\hp\\Mailent', file)} ===`);
    // Print first 5 matches to keep it readable, or group them
    fileMatches.slice(0, 10).forEach(m => {
      console.log(`  Line ${m.lineNum}: ${m.text}`);
    });
    if (fileMatches.length > 10) {
      console.log(`  ... and ${fileMatches.length - 10} more matches`);
    }
  }
});
