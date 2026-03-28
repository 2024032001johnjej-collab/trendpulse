const fs = require('fs');

// 1. Index
let idxHtml = fs.readFileSync('public/index.html', 'utf8');
idxHtml = idxHtml.replace(/<div class="inline-flex items-center justify-center w-20 h-20[\s\S]*?<\/h1>/g,
    `<img src="/light.jpeg" class="h-32 w-auto mx-auto mb-4 dark:hidden drop-shadow-md relative z-10" alt="TrendPulse">
            <img src="/dark.jpeg" class="h-32 w-auto mx-auto mb-4 hidden dark:block drop-shadow-xl relative z-10" alt="TrendPulse">
            <h1 class="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 dark:from-blue-300 dark:to-cyan-300 mb-6 relative z-10">TrendPulse</h1>`);
fs.writeFileSync('public/index.html', idxHtml);

// 2. Dashboard
let dbHtml = fs.readFileSync('public/dashboard.html', 'utf8');
dbHtml = dbHtml.replace(/<div class="relative">\s*<div class="absolute inset-0 bg-blue-500 rounded-lg blur-md opacity-50 animate-pulse"><\/div>[\s\S]*?<\/h1>/g,
    `<div class="flex flex-col items-center gap-2">
            <img src="/light.jpeg" class="h-10 md:h-12 w-auto dark:hidden" alt="TrendPulse">
            <img src="/dark.jpeg" class="h-10 md:h-12 w-auto hidden dark:block drop-shadow-md" alt="TrendPulse">
            <span class="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">TrendPulse</span>
        </div>`);
fs.writeFileSync('public/dashboard.html', dbHtml);

// 3. Admin
let adHtml = fs.readFileSync('public/admin.html', 'utf8');
adHtml = adHtml.replace(/<h1 class="font-bold text-xl text-white flex items-center gap-3">[\s\S]*?<\/h1>/g,
    `<div class="flex items-center gap-3">
                <div class="flex flex-col items-center">
                    <img src="/light.jpeg" class="h-10 w-auto dark:hidden drop-shadow-sm" alt="TrendPulse">
                    <img src="/dark.jpeg" class="h-10 w-auto hidden dark:block drop-shadow-lg" alt="TrendPulse">
                    <span class="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mt-0.5">TrendPulse</span>
                </div>
                <span class="text-xl font-bold text-red-500 tracking-tight mt-1 border-l-2 border-red-500/30 pl-4">Admin Core</span>
            </div>`);
fs.writeFileSync('public/admin.html', adHtml);

// 4. Auth Logins
const authFiles = ['login.html', 'signup.html', 'admin-login.html'];
authFiles.forEach(file => {
    let content = fs.readFileSync('public/' + file, 'utf8');
    content = content.replace(/<div class="relative w-14 h-14 mb-3">[\s\S]*?<\/h1>/g,
    `<img src="/light.jpeg" class="h-24 w-auto mx-auto mb-3 dark:hidden drop-shadow-md" alt="TrendPulse">
            <img src="/dark.jpeg" class="h-24 w-auto mx-auto mb-3 hidden dark:block drop-shadow-lg" alt="TrendPulse">
            <h1 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-1">TrendPulse</h1>`);
    fs.writeFileSync('public/' + file, content);
});

console.log('Massive PNGs fully deployed!');
