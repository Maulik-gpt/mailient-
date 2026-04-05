const fs = require('fs');

function makeThinkingLayerResponsive(content) {
    // 1. Colors
    // text-white/50 -> text-black/50 dark:text-white/50
    // text-white/95 -> text-black dark:text-white/95
    // text-white/70 -> text-black/70 dark:text-white/70
    // text-white/40 -> text-black/40 dark:text-white/40
    // text-white/30 -> text-black/30 dark:text-white/30
    // text-white/20 -> text-black/20 dark:text-white/20
    // text-white/15 -> text-black/15 dark:text-white/15
    // text-white/10 -> text-black/10 dark:text-white/10
    
    // bg-[#121212] -> bg-white dark:bg-[#121212]
    // bg-[#111111] -> bg-neutral-50 dark:bg-[#111111]
    // bg-[#161616] -> bg-neutral-100 dark:bg-[#161616]
    
    // border-white/5 -> border-neutral-200 dark:border-white/5
    // border-white/10 -> border-neutral-200 dark:border-white/10
    // border-white/15 -> border-neutral-300 dark:border-white/15
    // border-white/20 -> border-neutral-300 dark:border-white/20

    // bg-white/5 -> bg-black/[0.03] dark:bg-white/5
    // bg-white/10 -> bg-black/[0.06] dark:bg-white/10
    // bg-white/[0.02] -> bg-black/[0.01] dark:bg-white/[0.02]
    // bg-white/[0.03] -> bg-black/[0.02] dark:bg-white/[0.03]
    // bg-white/[0.06] -> bg-black/[0.04] dark:bg-white/[0.06]
    
    let res = content;

    // Specifically for ThinkingLayer
    res = res.replace(/text-white\/50/g, 'text-black/50 dark:text-white/50');
    res = res.replace(/text-white\/95/g, 'text-black dark:text-white/95');
    res = res.replace(/text-white\/90/g, 'text-black/90 dark:text-white/90');
    res = res.replace(/text-white\/80/g, 'text-black/80 dark:text-white/80');
    res = res.replace(/text-white\/70/g, 'text-black/70 dark:text-white/70');
    res = res.replace(/text-white\/60/g, 'text-black/60 dark:text-white/60');
    res = res.replace(/text-white\/40/g, 'text-black/40 dark:text-white/40');
    res = res.replace(/text-white\/30/g, 'text-black/30 dark:text-white/30');
    res = res.replace(/text-white\/20/g, 'text-black/20 dark:text-white/20');
    res = res.replace(/text-white\/15/g, 'text-black/15 dark:text-white/15');
    res = res.replace(/text-white\/10/g, 'text-black/10 dark:text-white/10');
    res = res.replace(/text-white/g, 'text-black dark:text-white'); // General text-white
    
    res = res.replace(/bg-\[#121212\]/g, 'bg-white dark:bg-[#121212]');
    res = res.replace(/bg-\[#111111\]/g, 'bg-neutral-50 dark:bg-[#111111]');
    res = res.replace(/bg-\[#161616\]/g, 'bg-neutral-100 dark:bg-[#161616]');
    
    res = res.replace(/border-white\/5/g, 'border-neutral-200 dark:border-white/5');
    res = res.replace(/border-white\/10/g, 'border-neutral-200 dark:border-white/10');
    res = res.replace(/border-white\/15/g, 'border-neutral-300 dark:border-white/15');
    res = res.replace(/border-white\/20/g, 'border-neutral-300 dark:border-white/20');
    res = res.replace(/border-white\/\[0\.05\]/g, 'border-neutral-200 dark:border-white/[0.05]');
    res = res.replace(/border-white\/\[0\.06\]/g, 'border-neutral-200 dark:border-white/[0.06]');

    res = res.replace(/bg-white\/5/g, 'bg-black/[0.03] dark:bg-white/5');
    res = res.replace(/bg-white\/10/g, 'bg-black/[0.06] dark:bg-white/10');
    res = res.replace(/bg-white\/\[0\.02\]/g, 'bg-black/[0.01] dark:bg-white/[0.02]');
    res = res.replace(/bg-white\/\[0\.03\]/g, 'bg-black/[0.02] dark:bg-white/[0.03]');
    res = res.replace(/bg-white\/\[0\.06\]/g, 'bg-black/[0.04] dark:bg-white/[0.06]');

    // Special fixes for logic errors (like text-white resulting in text-black dark:text-black if replaced too many times)
    res = res.replace(/text-black dark:text-black/g, 'text-black dark:text-white');
    
    return res;
}

const file = 'app/dashboard/agent-talk/components/ThinkingLayer.tsx';
const original = fs.readFileSync(file, 'utf8');
const fixed = makeThinkingLayerResponsive(original);
fs.writeFileSync(file, fixed, 'utf8');
console.log('Fixed: ' + file);
