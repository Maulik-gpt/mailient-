const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const targetDirs = [
    'app/dashboard/agent-talk/components',
    'components/ui',
    'app/i/notes'
];

const files = targetDirs.flatMap(dir => fs.existsSync(dir) ? getAllFiles(dir) : []);

function processFile(content) {
    let res = content;

    // 1. Force Black Text in Light Mode for common "light gray" colors
    // We replace text-X-400/500 with text-neutral-600/500 dark:text-X-400/500
    const colors = ['gray', 'neutral', 'zinc', 'slate'];
    colors.forEach(c => {
        // text-gray-400 -> text-neutral-600 dark:text-gray-400
        const regex400 = new RegExp(`text-${c}-400(?!\\s*dark:)`, 'g');
        res = res.replace(regex400, `text-neutral-600 dark:text-${c}-400`);
        
        // text-gray-500 -> text-neutral-500 dark:text-gray-500
        const regex500 = new RegExp(`text-${c}-500(?!\\s*dark:)`, 'g');
        res = res.replace(regex500, `text-neutral-600 dark:text-${c}-500`);

        // text-gray-300 -> text-neutral-900 dark:text-gray-300 (gray-300 is bright, so it's a "heading" type)
        const regex300 = new RegExp(`text-${c}-300(?!\\s*dark:)`, 'g');
        res = res.replace(regex300, `text-neutral-900 dark:text-${c}-300`);

        // text-gray-200 -> text-neutral-900 dark:text-gray-200
        const regex200 = new RegExp(`text-${c}-200(?!\\s*dark:)`, 'g');
        res = res.replace(regex200, `text-neutral-900 dark:text-${c}-200`);
    });

    // 2. BACKGROUNDS enforcement
    // bg-gray-800 -> bg-neutral-200 dark:bg-gray-800
    res = res.replace(/bg-gray-800(?!\s*dark:)/g, 'bg-neutral-100 dark:bg-gray-800');
    res = res.replace(/bg-gray-900(?!\s*dark:)/g, 'bg-neutral-50 dark:bg-gray-900');
    res = res.replace(/bg-zinc-950(?!\s*dark:)/g, 'bg-white dark:bg-zinc-950');
    
    // 3. BORDERS enforcement
    res = res.replace(/border-gray-800(?!\s*dark:)/g, 'border-neutral-200 dark:border-gray-800');
    res = res.replace(/border-neutral-800(?!\s*dark:)/g, 'border-neutral-200 dark:border-neutral-800');
    res = res.replace(/border-zinc-800(?!\s*dark:)/g, 'border-neutral-200 dark:border-zinc-800');

    // 4. CLEANUP (Double prefixes etc)
    res = res.replace(/text-neutral-600 dark:text-neutral-400 dark:text-neutral-600 dark:text-neutral-400/g, 'text-neutral-600 dark:text-neutral-400');
    res = res.replace(/text-neutral-900 dark:text-neutral-300 dark:text-neutral-900 dark:text-neutral-300/g, 'text-neutral-900 dark:text-neutral-300');
    
    // Make sure we didn't break existing dark: mappings
    res = res.replace(/dark:dark:/g, 'dark:');
    
    return res;
}

let count = 0;
files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const fixed = processFile(content);
    if (fixed !== content) {
        fs.writeFileSync(f, fixed, 'utf8');
        count++;
    }
});

console.log(`Global Theme Enforcement: Fixed ${count} files.`);
