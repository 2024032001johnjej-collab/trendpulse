const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

const styleBlock = `
    <!-- Universal Light Mode Override -->
    <style id="light-mode-overrides">
        html:not(.dark) body { background: #f1f5f9 !important; color: #0f172a !important; }
        html:not(.dark) main { background: #f1f5f9 !important; }
        html:not(.dark) .animate-float { opacity: 0.15 !important; mix-blend-mode: multiply; }
        html:not(.dark) .glass-card, html:not(.dark) .glass-panel, html:not(.dark) .bg-glass, html:not(.dark) aside, html:not(.dark) header {
            background: rgba(255,255,255,0.95) !important;
            border-color: rgba(0,0,0,0.1) !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05) !important;
        }
        html:not(.dark) .bg-slate-900 { background: #ffffff !important; }
        html:not(.dark) .bg-slate-800 { background: #e2e8f0 !important; }
        html:not(.dark) .border-slate-800, html:not(.dark) .border-slate-700 { border-color: #cbd5e1 !important; }
        html:not(.dark) .text-white { color: #0f172a !important; text-shadow: none !important; }
        html:not(.dark) .text-slate-200, html:not(.dark) .text-slate-300 { color: #334155 !important; }
        html:not(.dark) .text-slate-400 { color: #64748b !important; }
        html:not(.dark) .text-slate-500 { color: #94a3b8 !important; }
        html:not(.dark) .bg-slate-900\\/50, html:not(.dark) .bg-slate-800\\/80, html:not(.dark) .bg-slate-900\\/60, html:not(.dark) .bg-slate-800\\/50, html:not(.dark) .bg-slate-900\\/40 { background: rgba(255,255,255,0.95) !important; }
        html:not(.dark) .bg-slate-900\\/20, html:not(.dark) .bg-slate-800\\/30 { background: rgba(241,245,249,0.95) !important; text-shadow: none !important; }
        html:not(.dark) input.input-glass, html:not(.dark) select { background: #ffffff !important; color: #0f172a !important; border: 1px solid #cbd5e1 !important; }
        html:not(.dark) .from-white { --tw-gradient-from: #0f172a !important; }
        html:not(.dark) .to-slate-400 { --tw-gradient-to: #475569 !important; }
        html:not(.dark) canvas { filter: none; }
    </style>
</head>`;

const toggleBlock = `
    <!-- Theme Toggle -->
    <button id="themeToggle" onclick="document.documentElement.classList.toggle('dark'); localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light'); if(window.updateChartsTheme) window.updateChartsTheme()" class="fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-white dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700/50 text-amber-500 dark:text-amber-400 hover:scale-110 transition-transform shadow-xl flex items-center justify-center group">
        <svg class="w-6 h-6 dark:hidden group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
        <svg class="w-6 h-6 hidden dark:block group-hover:rotate-45 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
    </button>
    <script>
        if(localStorage.getItem('theme') === 'light') document.documentElement.classList.remove('dark');
    </script>
</body>`;

files.forEach(f => {
    let content = fs.readFileSync(path.join(publicDir, f), 'utf8');
    
    // Clean up extreme old injection blocks securely
    let start1 = content.indexOf('<!-- Universal Light Mode Override -->');
    if (start1 !== -1) {
        let end1 = content.indexOf('</style>', start1) + 8;
        content = content.substring(0, start1) + content.substring(end1);
    }
    
    let start2 = content.indexOf('<!-- Theme Toggle -->');
    if (start2 !== -1) {
        let end2 = content.indexOf('</script>', start2) + 9;
        content = content.substring(0, start2) + content.substring(end2);
    }
    
    // Re-inject pristine new blocks
    content = content.replace('</head>', styleBlock);
    content = content.replace('</body>', toggleBlock);
    
    fs.writeFileSync(path.join(publicDir, f), content);
});

console.log('Successfully re-patched all HTML files with aggressive Light Backgrounds.');
