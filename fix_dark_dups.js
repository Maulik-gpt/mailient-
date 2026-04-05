const fs = require('fs');

/**
 * In a space-separated class string, if two classes share the same
 * dark:-prefixed CSS property (e.g. dark:text-X and dark:text-Y),
 * keep only the LAST one (which was the original, pre-replacement value).
 */
function deduplicateDarkClasses(content) {
    // Match className="..." or className={`...`} or class="..."
    // We'll process each class-string individually
    return content.replace(
        /(className=["'`{]|class=["'])([\s\S]*?)(["'`}])/g,
        (fullMatch, prefix, classes, suffix) => {
            // Skip template literals with expressions
            if (classes.includes('${')) return fullMatch;
            
            const cleaned = removeDuplicateDarkVariants(classes);
            return prefix + cleaned + suffix;
        }
    );
}

function removeDuplicateDarkVariants(classStr) {
    const classes = classStr.split(/\s+/);
    
    // Track dark: classes by their property type
    // e.g. "dark:text-white" -> property is "dark:text"
    // e.g. "dark:bg-white/5" -> property is "dark:bg"
    // e.g. "dark:border-white/10" -> property is "dark:border"
    // e.g. "dark:hover:text-white" -> property is "dark:hover:text"
    
    const seenDarkProps = new Map(); // property -> last index
    
    classes.forEach((cls, i) => {
        if (!cls.startsWith('dark:')) return;
        
        // Extract the property type
        // dark:text-white -> dark:text
        // dark:bg-white/5 -> dark:bg
        // dark:border-white/10 -> dark:border
        // dark:hover:text-white -> dark:hover:text
        const prop = extractDarkProperty(cls);
        if (prop) {
            if (seenDarkProps.has(prop)) {
                // Mark the earlier one for removal
                seenDarkProps.get(prop).push(i);
            } else {
                seenDarkProps.set(prop, [i]);
            }
        }
    });
    
    // For properties with multiple entries, keep only the LAST one
    const indicesToRemove = new Set();
    for (const [prop, indices] of seenDarkProps) {
        if (indices.length > 1) {
            // Remove all but the last
            for (let i = 0; i < indices.length - 1; i++) {
                indicesToRemove.add(indices[i]);
            }
        }
    }
    
    if (indicesToRemove.size === 0) return classStr;
    
    return classes.filter((_, i) => !indicesToRemove.has(i)).join(' ');
}

function extractDarkProperty(cls) {
    // Remove "dark:" prefix, then find the property name
    // dark:text-white -> text
    // dark:bg-white/5 -> bg
    // dark:border-white/10 -> border
    // dark:hover:text-white -> hover:text
    // dark:hover:bg-white -> hover:bg
    
    const withoutDark = cls.replace(/^dark:/, '');
    
    // Handle chained modifiers like hover:text-X
    const parts = withoutDark.split(':');
    const lastPart = parts[parts.length - 1];
    
    // Extract property name (text, bg, border, etc.)
    const match = lastPart.match(/^(text|bg|border|ring|shadow|outline|divide|placeholder)/);
    if (!match) return null;
    
    // Rebuild with modifiers
    const modifiers = parts.slice(0, -1).join(':');
    const propName = match[1];
    
    return 'dark:' + (modifiers ? modifiers + ':' : '') + propName;
}

// Process files
const files = [
    'components/ui/gmail-interface-fixed.tsx',
    'components/ui/settings-card.tsx',
    'components/ui/help-card.tsx',
    'components/ui/rewards-card.tsx',
    'components/ui/sift-card.tsx',
    'components/ui/feedback-dialog.tsx',
    'components/ui/scheduling-modal.tsx',
    'components/ui/usage-limit-modal.tsx',
    'components/ui/cancellation-flow.tsx',
    'components/ui/verification-card.tsx',
    'components/ui/home-feed-sidebar.tsx',
    'app/dashboard/agent-talk/ChatInterface.tsx',
    'app/home-feed/page.tsx',
];

let totalFixed = 0;
files.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    
    const original = fs.readFileSync(filePath, 'utf8');
    const cleaned = deduplicateDarkClasses(original);
    
    if (cleaned !== original) {
        fs.writeFileSync(filePath, cleaned, 'utf8');
        // Count how many classes were removed
        const diff = original.length - cleaned.length;
        console.log(`Fixed: ${filePath} (removed ~${Math.round(diff/20)} duplicate classes)`);
        totalFixed++;
    } else {
        console.log(`Clean: ${filePath}`);
    }
});

console.log(`\nDone. Fixed ${totalFixed} files.`);
