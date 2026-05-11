import fs from 'fs';
import path from 'path';

const dirPath = 'c:/Users/hp/Mailent/node_modules/d3-array/src';
if (fs.existsSync(dirPath)) {
    console.log('--- CONTENTS OF node_modules/d3-array/src ---');
    const files = fs.readdirSync(dirPath);
    console.log('Total files:', files.length);
    console.log('greatest.js exists:', files.includes('greatest.js'));
    console.log('greatestIndex.js exists:', files.includes('greatestIndex.js'));
    console.log('Sample files:', files.slice(0, 15).join(', '));
} else {
    console.log('❌ Directory does not exist:', dirPath);
}
