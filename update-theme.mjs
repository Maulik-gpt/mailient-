import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function transformFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Update wrapper classes
  content = content.replace(
    /className="min-h-screen bg-\[#fafafa\] dark:bg-\[#030303\] text-black dark:text-white flex flex-col items-center justify-start overflow-x-hidden font-satoshi strichpunkt-theme relative selection:bg-white selection:text-black"/g,
    'className="min-h-screen bg-white dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#fafafa] flex flex-col items-center justify-start overflow-x-hidden font-satoshi strichpunkt-theme relative selection:bg-neutral-200 dark:selection:bg-neutral-800 transition-colors duration-500"'
  );

  // Update theme toggler import
  if (content.includes('import { ThemeToggle } from "@/components/ui/theme-toggle";')) {
    content = content.replace(
      'import { ThemeToggle } from "@/components/ui/theme-toggle";',
      'import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";'
    );
  }

  // Update theme toggler usage
  const oldToggler = '<div className="absolute top-24 right-6 md:right-12 z-[60]">\n        <ThemeToggle />\n      </div>';
  const newToggler = '<div className="fixed top-8 right-8 z-50">\n        <AnimatedThemeToggler className="bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-sm border border-neutral-200 dark:border-neutral-800" />\n      </div>';
  
  if (content.includes(oldToggler)) {
    content = content.replace(oldToggler, newToggler);
  }

  if (file.includes('BlogLayout.tsx')) {
    // Override Typography styles to use the exact colors of Privacy Policy
    content = content.replace(/color: var\(--foreground\);/g, 'color: #1a1a1a;');
    content = content.replace(/color: var\(--muted-foreground\);/g, 'color: #525252;'); // text-neutral-600
    
    // Inject dark mode variants into the style block
    const cssDarkAdditions = `
        .dark .blog-article-content h2, 
        .dark .blog-article-content h3, 
        .dark .blog-article-content strong, 
        .dark .blog-article-content a,
        .dark .blog-article-content code {
          color: #fafafa;
        }
        .dark .blog-article-content p, 
        .dark .blog-article-content li, 
        .dark .blog-article-content em,
        .dark .blog-article-content blockquote {
          color: #d4d4d4;
        }
        .dark .blog-article-content li::marker {
          color: #d4d4d4;
        }
      `;
    
    if (!content.includes('.dark .blog-article-content h2')) {
      content = content.replace('</style>', cssDarkAdditions + '\n      </style>');
    }
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Processed ${file}`);
}

const files = [
  path.join(__dirname, 'components/BlogLayout.tsx'),
  path.join(__dirname, 'app/blogs/page.tsx')
];

files.forEach(transformFile);
