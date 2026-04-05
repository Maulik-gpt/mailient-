const fs = require('fs');
const path = require('path');

const componentsDir = 'app/dashboard/agent-talk/components';
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx') || f.endsWith('.jsx'));

function processFile(content) {
    let res = content;

    // 1. Common BACKGROUNDS
    res = res.replace(/bg-black(?!\/)(?!\s*dark:)/g, 'bg-white dark:bg-black');
    res = res.replace(/bg-neutral-950(?!\s*dark:)/g, 'bg-white dark:bg-neutral-950');
    res = res.replace(/bg-neutral-900(?!\s*dark:)/g, 'bg-neutral-100 dark:bg-neutral-900');
    res = res.replace(/bg-neutral-800(?!\s*dark:)/g, 'bg-neutral-200 dark:bg-neutral-800');
    
    // Hex backgrounds common in this project
    res = res.replace(/bg-\[#0c0c0c\]/g, 'bg-white dark:bg-[#0c0c0c]');
    res = res.replace(/bg-\[#0a0a0a\]/g, 'bg-white dark:bg-[#0a0a0a]');
    res = res.replace(/bg-\[#111111\]/g, 'bg-neutral-50 dark:bg-[#111111]');
    res = res.replace(/bg-\[#121212\]/g, 'bg-white dark:bg-[#111111]');
    res = res.replace(/bg-\[#161616\]/g, 'bg-neutral-100 dark:bg-[#161616]');
    res = res.replace(/bg-\[#070707\]/g, 'bg-neutral-50 dark:bg-[#070707]');

    // 2. Common TEXT COLORS
    // Order matters here to avoid double-prefixing.
    // We only replace text-white/50 etc if they aren't already dark:prefixed.
    const opacityScales = ['5', '10', '20', '30', '40', '50', '60', '70', '80', '90', '95'];
    opacityScales.forEach(op => {
        const regex = new RegExp(`text-white/${op}(?!\\s*dark:)`, 'g');
        res = res.replace(regex, `text-black/${op} dark:text-white/${op}`);
    });
    
    res = res.replace(/text-white(?!\/)(?!\s*dark:)/g, 'text-black dark:text-white');
    res = res.replace(/text-neutral-400(?!\s*dark:)/g, 'text-neutral-600 dark:text-neutral-400');
    res = res.replace(/text-neutral-500(?!\s*dark:)/g, 'text-neutral-500 dark:text-neutral-500'); // Neutral-500 is usually fine for both, but we can be explicit
    
    // 3. Common BORDERS
    res = res.replace(/border-white\/5(?!\s*dark:)/g, 'border-neutral-200 dark:border-white/5');
    res = res.replace(/border-white\/10(?!\s*dark:)/g, 'border-neutral-200 dark:border-white/10');
    res = res.replace(/border-white\/20(?!\s*dark:)/g, 'border-neutral-300 dark:border-white/20');
    res = res.replace(/border-neutral-800(?!\s*dark:)/g, 'border-neutral-200 dark:border-neutral-800');
    res = res.replace(/border-neutral-900(?!\s*dark:)/g, 'border-neutral-100 dark:border-neutral-900');
    
    // 4. Common OPACITY OPACITY (bg-white/10)
    opacityScales.forEach(op => {
        const regex = new RegExp(`bg-white/${op}(?!\\s*dark:)`, 'g');
        res = res.replace(regex, `bg-black/[0.0${op[0] === '0' ? op : Math.round(parseInt(op)/2)}] dark:bg-white/${op}`);
    });
    // Simplified: bg-white/5 -> bg-black/5 dark:bg-white/5 is often enough for subtle overlays
    // But let's be smarter:
    res = res.replace(/bg-white\/5(?!\s*dark:)/g, 'bg-black/[0.03] dark:bg-white/5');
    res = res.replace(/bg-white\/10(?!\s*dark:)/g, 'bg-black/[0.05] dark:bg-white/10');

    // 5. Cleanup recursive replacements
    res = res.replace(/text-black dark:text-black/g, 'text-black dark:text-white');
    res = res.replace(/text-neutral-600 dark:text-neutral-600/g, 'text-neutral-600 dark:text-neutral-400');
    res = res.replace(/bg-white dark:bg-white/g, 'bg-white dark:bg-black');
    
    return res;
}

files.forEach(f => {
    const filePath = path.join(componentsDir, f);
    const content = fs.readFileSync(filePath, 'utf8');
    const fixed = processFile(content);
    if (fixed !== content) {
        fs.writeFileSync(filePath, fixed, 'utf8');
        console.log('Fixed: ' + f);
    } else {
        console.log('Clean: ' + f);
    }
});
