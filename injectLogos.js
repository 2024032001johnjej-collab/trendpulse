const fs = require('fs');

const pngHtml = `
<img src="/logo-light.png" class="w-4/5 h-4/5 object-contain dark:hidden relative z-10" alt="Logo">
<img src="/logo-dark.png" class="w-4/5 h-4/5 object-contain hidden dark:block relative z-10" alt="Logo">
`;

const htmlFiles = fs.readdirSync('public').filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
    let content = fs.readFileSync('public/' + file, 'utf8');
    
    // Target the lightning bolt SVGs
    content = content.replace(/<svg[^>]*text-white[^>]*>[\s\S]*?<path[^>]*d="M13 10V3L4 14h7v7l9-11h-7z"[\s\S]*?<\/svg>/g, pngHtml);
    
    // Target the Lock / Admin SVGs
    content = content.replace(/<svg[^>]*text-white[^>]*>[\s\S]*?<path[^>]*d="M12 15v2m-6 4h12a2 2 0[\s\S]*?<\/svg>/g, pngHtml);

    // Some containers might have background gradients that clash with a colored PNG. 
    // Let's strip the aggressive bounding colors of the logo wrappers so the transparent PNG looks clean.
    content = content.replace(/bg-gradient-to-br from-blue-400 to-indigo-600/g, 'bg-transparent');
    content = content.replace(/bg-gradient-to-br from-blue-600 to-indigo-600/g, 'bg-transparent');
    content = content.replace(/dark:from-slate-800 dark:to-slate-900/g, 'dark:bg-transparent');
    content = content.replace(/bg-gradient-to-br from-red-500 to-rose-600/g, 'bg-transparent');
    content = content.replace(/from-red-500 to-rose-700/g, 'bg-transparent');

    fs.writeFileSync('public/' + file, content);
});
console.log('User PNG logos successfully injected into all pages.');
