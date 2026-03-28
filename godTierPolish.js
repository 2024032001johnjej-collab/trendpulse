const fs = require('fs');

const gridCSS = `
<style id="god-tier-styles">
/* Vercel-style dotted grid background overlay */
.bg-dot-grid {
    position: relative;
}
.bg-dot-grid::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px);
    background-size: 32px 32px;
    z-index: 0;
    pointer-events: none;
    opacity: 0.6;
}
html:not(.dark) .bg-dot-grid::after {
    background-image: radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px);
}

/* Shimmering Animated Conic Border (Cyberpunk/Web3 Style) */
.shimmer-card {
    position: relative;
    border-radius: 1rem;
    z-index: 1;
}
.shimmer-card::before {
    content: "";
    position: absolute;
    inset: -1.5px;
    border-radius: 1.1rem;
    padding: 1.5px;
    background: conic-gradient(from 0deg, transparent 60%, rgba(59,130,246,0.9), rgba(168,85,247,0.9), transparent 80%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    z-index: -1;
    animation: rotate-shimmer 4s linear infinite;
    opacity: 0.8;
}
@keyframes rotate-shimmer {
    100% { transform: rotate(360deg); }
}

/* Hard glowing text for major data points */
.text-glow {
    text-shadow: 0 0 24px rgba(59,130,246,0.8);
}
.text-glow-red {
    text-shadow: 0 0 24px rgba(239,68,68,0.8);
}
</style>
`;

let dbHtml = fs.readFileSync('public/dashboard.html', 'utf8');

// Add styles safely
if (!dbHtml.includes('id="god-tier-styles"')) {
    dbHtml = dbHtml.replace('</head>', gridCSS + '\n</head>');
}

// Add dot grid to Main Content block safely
dbHtml = dbHtml.replace('<main class="flex-1 flex flex-col h-screen overflow-y-auto relative"', '<main class="flex-1 flex flex-col h-screen overflow-y-auto relative bg-dot-grid"');

// Upgrade the Total Posts title to have a text glow
dbHtml = dbHtml.replace('id="totalPosts" class="text-4xl font-bold text-white tracking-tight"', 'id="totalPosts" class="text-4xl font-bold text-white tracking-tight text-glow"');
dbHtml = dbHtml.replace('id="crisisScoreVal" class="text-5xl font-bold text-white tracking-tighter"', 'id="crisisScoreVal" class="text-5xl font-bold text-white tracking-tighter text-glow-red"');

// Make ALL Top KPI cards (Analyzed Posts, Brand Sentiment) have the rotating cyberpunk shimmer border
dbHtml = dbHtml.replace(/class="bg-glass hover-elevate rounded-2xl p-6 relative overflow-hidden group/g, 'class="bg-glass hover-elevate rounded-2xl p-6 relative overflow-hidden group shimmer-card');
// Catch the slightly different third KPI card layout
dbHtml = dbHtml.replace(/class="bg-glass hover-elevate rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between animate-fade-in-up delay-200 group/g, 'class="bg-glass hover-elevate rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between animate-fade-in-up delay-200 group shimmer-card');


fs.writeFileSync('public/dashboard.html', dbHtml);


// Now, upgrade the Index.html landing page!
let idxHtml = fs.readFileSync('public/index.html', 'utf8');
if (!idxHtml.includes('id="god-tier-styles"')) {
    idxHtml = idxHtml.replace('</head>', gridCSS + '\n</head>');
}
idxHtml = idxHtml.replace('<body class="min-h-screen flex flex-col items-center justify-center text-slate-200 relative overflow-hidden p-6">', '<body class="min-h-screen flex flex-col items-center justify-center text-slate-200 relative overflow-hidden p-6 bg-dot-grid">');
idxHtml = idxHtml.replace('<div class="inline-flex items-center justify-center w-20 h-20', '<div class="inline-flex items-center justify-center w-20 h-20 shimmer-card text-glow');
fs.writeFileSync('public/index.html', idxHtml);


// Finally, upgrade Chart.js to feature glowing gradient fills dynamically!
let dbJs = fs.readFileSync('public/dashboard.js', 'utf8');

const fillGreen = `fill: true,
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(52,211,153,0.5)');
                    gradient.addColorStop(1, 'rgba(52,211,153,0)');
                    return gradient;
                },`;

const fillRed = `fill: true,
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(239,68,68,0.5)');
                    gradient.addColorStop(1, 'rgba(239,68,68,0)');
                    return gradient;
                },`;

if (!dbJs.includes("addColorStop(0, 'rgba(52")) {
    dbJs = dbJs.replace("borderColor: '#34d399',", "borderColor: '#34d399',\n                " + fillGreen);
    dbJs = dbJs.replace("borderColor: '#ef4444',", "borderColor: '#ef4444',\n                " + fillRed);
    // Smooth out line tension for beauty
    dbJs = dbJs.replace(/tension: 0.1/g, 'tension: 0.4');
    
    fs.writeFileSync('public/dashboard.js', dbJs);
}

console.log('Successfully applied God-Tier NextJS style aesthetics to all components.');
