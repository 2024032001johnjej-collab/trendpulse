const userNameEl = document.getElementById('userName');
const userBadge = document.getElementById('userBadge');
const logoutBtn = document.getElementById('logoutBtn');
const triggerSpikeBtn = document.getElementById('triggerSpikeBtn');
const hashtagFilter = document.getElementById('hashtagFilter');

const token = localStorage.getItem('token');
const isAdmin = localStorage.getItem('isAdmin') === 'true';

if (!token && !isAdmin) {
  window.location.href = '/login.html';
}

// Authentication / Profile Load Mock
async function loadProfile() {
    if (isAdmin) {
        userNameEl.textContent = 'Administrator';
        userBadge.classList.remove('hidden');
        return;
    }
    try {
        const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }
        userNameEl.textContent = data.user.name;
    } catch (error) {
        userNameEl.textContent = 'User (Offline)';
    }
}
loadProfile();

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    window.location.href = '/login.html';
});

/* =========================================
   DASHBOARD SIMULATION LOGIC 
   ========================================= */

// State
let state = {
    posts: [],
    counts: { positive: 0, neutral: 0, negative: 0 },
    history: [], // for line chart
    words: {}, // for word cloud
};

let currentFilter = 'all';

// Templates
const positiveTemplates = [
    "Absolutely loving the new {tag} features!", 
    "Best product launch of the year. {tag} is amazing.",
    "Just tried out {tag}. Super impressed so far.",
    "Kudos to the team behind {tag}! Flawless execution. 🚀"
];
const neutralTemplates = [
    "I see a lot of people talking about {tag}.",
    "Testing the new {tag} update. Will post thoughts later.",
    "{tag} is trending today. Hmm.",
    "Anyone else looking into {tag}?"
];
const negativeTemplates = [
    "So disappointed with {tag}. It keeps crashing.",
    "Terrible customer service regarding {tag}. Avoid!",
    "Why did they ruin {tag}? The previous version was better.",
    "Total scam! Do not buy {tag} 😡"
];
const tags = ["#AI", "#Tech", "#Launch", "#Hackathon"];

// Chart Instances
let donutChart, lineChart;

function initCharts() {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = 'Inter, sans-serif';

    // Donut
    const ctxDonut = document.getElementById('donutChart').getContext('2d');
    donutChart = new Chart(ctxDonut, {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#10b981', '#64748b', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            cutout: '75%', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            animation: { animateScale: true, animateRotate: true }
        }
    });

    // Line
    const ctxLine = document.getElementById('lineChart').getContext('2d');
    lineChart = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Positive', data: [], borderColor: '#10b981', backgroundColor: '#10b98122', tension: 0.4, fill: true, borderWidth: 2 },
                { label: 'Negative', data: [], borderColor: '#ef4444',
                fill: true,
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(239,68,68,0.5)');
                    gradient.addColorStop(1, 'rgba(239,68,68,0)');
                    return gradient;
                }, backgroundColor: '#ef444422', tension: 0.4, fill: true, borderWidth: 2 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                x: { grid: { display: false, color: '#334155' } }, 
                y: { grid: { color: '#1e293b' }, beginAtZero: true } 
            }
        }
    });
}

function renderWordCloud() {
    // Only redraw wordcloud occasionally to avoid flickering
    if(state.posts.length % 5 !== 0) return;
    
    const canvas = document.getElementById('wordCloudCanvas');
    // Ensure canvas dimensions match parent
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    const list = Object.entries(state.words)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 30) // top 30 words
        .map(([word, weight]) => [word, weight * 10 + 10]);

    if(list.length === 0) return;

    WordCloud(canvas, { 
        list: list,
        gridSize: Math.round(16 * canvas.width / 1024),
        weightFactor: function (size) { return size; },
        fontFamily: 'Inter',
        color: function (word, weight, fontSize, distance, theta) {
            // Colors from Tailwind blue/indigo/emerald/slate
            const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#94a3b8', '#e2e8f0'];
            return colors[Math.floor(Math.random() * colors.length)];
        },
        rotateRatio: 0,
        backgroundColor: 'transparent'
    });
}

function updateUI() {
    // Filter posts
    const filtered = currentFilter === 'all' ? state.posts : state.posts.filter(p => p.tag === currentFilter);
    const fCounts = { pos: 0, neu: 0, neg: 0 };
    filtered.forEach(p => { fCounts[p.sent]++; });

    // 1. KPI Cards
    const total = filtered.length;
    document.getElementById('totalPosts').textContent = total;
    
    // Average Sentiment Bar
    const posPct = total ? Math.round((fCounts.pos / total) * 100) : 0;
    const negPct = total ? Math.round((fCounts.neg / total) * 100) : 0;
    document.getElementById('donutCenterPct').textContent = posPct + '%';
    
    let avgLabel = 'Neutral';
    let barColor = 'bg-slate-500';
    let w = 50;
    if (posPct > negPct + 10) { avgLabel = 'Positive'; barColor = 'bg-emerald-500'; w = 75; }
    else if (negPct > posPct + 10) { avgLabel = 'Negative'; barColor = 'bg-red-500'; w = 25; }
    
    const bar = document.getElementById('sentimentBar');
    document.getElementById('avgSentimentLabel').textContent = avgLabel;
    bar.className = 'h-1.5 rounded-full transition-all duration-1000 ' + barColor;
    bar.style.width = w + '%';

    // 2. Crisis Score (Exponential based on recent negative velocity)
    // Get last 20 posts for velocity
    const recent = filtered.slice(0, 30);
    const recentNeg = recent.filter(p => p.sent === 'neg').length;
    let crisisScore = total === 0 ? 0 : Math.min(100, Math.round((recentNeg / Math.max(1, recent.length)) * 160));
    
    // Animate score
    const scoreEl = document.getElementById('crisisScoreVal');
    const badge = document.getElementById('crisisBadge');
    const action = document.getElementById('actionRecommendation');
    const banner = document.getElementById('crisisAlertBanner');

    scoreEl.textContent = crisisScore;

    if (crisisScore < 40) {
        badge.textContent = 'SAFE';
        badge.className = 'text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400';
        action.innerHTML = '🟢 Continue monitoring silently.';
        scoreEl.className = 'text-3xl font-bold text-white';
        banner.classList.add('hidden');
    } else if (crisisScore < 70) {
        badge.textContent = 'WATCH';
        badge.className = 'text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400';
        action.innerHTML = '🟡 Monitor hashtag closely. Notify comms team.';
        scoreEl.className = 'text-3xl font-bold text-amber-400';
        banner.classList.add('hidden');
    } else {
        badge.textContent = 'CRISIS';
        badge.className = 'text-xs font-bold px-2 py-0.5 rounded animate-pulse bg-red-500/20 text-red-500';
        action.innerHTML = '🔴 High risk! Issue statement and engage commentators immediately.';
        scoreEl.className = 'text-3xl font-bold text-red-500';
        banner.classList.remove('hidden');
    }

    // 3. Update Charts
    donutChart.data.datasets[0].data = [fCounts.pos, fCounts.neu, fCounts.neg];
    donutChart.update();

    // Time series
    if(state.history.length > 20) state.history.shift();
    lineChart.data.labels = state.history.map(h => h.time);
    lineChart.data.datasets[0].data = state.history.map(h => h.pos);
    lineChart.data.datasets[1].data = state.history.map(h => h.neg);
    lineChart.update();

    renderWordCloud();
}

function processWords(text) {
    const skip = ['the','and','to','of','a','in','is','i','it','with','for','on','this','that','you'];
    const tokens = text.toLowerCase().replace(/[.,!]/g, '').split(/\s+/);
    tokens.forEach(w => {
        if (!skip.includes(w) && w.length > 2) {
            state.words[w] = (state.words[w] || 0) + 1;
        }
    });
}

function createPostNode(post) {
    const feed = document.getElementById('postFeed');
    const colors = {
        pos: 'border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-transparent text-emerald-100',
        neu: 'border-slate-600/30 bg-gradient-to-r from-slate-600/10 to-transparent text-slate-200',
        neg: 'border-red-500/30 bg-gradient-to-r from-red-500/10 to-transparent text-red-100'
    };
    const badges = {
        pos: '<span class="px-2 py-0.5 rounded px-2 text-[10px] bg-emerald-500/20 text-emerald-400 font-bold tracking-widest uppercase border border-emerald-500/20">Positive</span>',
        neu: '<span class="px-2 py-0.5 rounded px-2 text-[10px] bg-slate-500/20 text-slate-400 font-bold tracking-widest uppercase border border-slate-500/20">Neutral</span>',
        neg: '<span class="px-2 py-0.5 rounded px-2 text-[10px] bg-red-500/20 text-red-400 font-bold tracking-widest uppercase border border-red-500/20"><span class="animate-pulse mr-1">⚠️</span>Negative</span>'
    };

    // Generate random avatar gradient colors based on user "id"
    const gradients = ['from-purple-500 to-indigo-500', 'from-cyan-400 to-blue-500', 'from-emerald-400 to-teal-500', 'from-fuchsia-500 to-pink-500', 'from-amber-400 to-orange-500'];
    const rColors = gradients[Math.floor(Math.random() * gradients.length)];

    const el = document.createElement('div');
    el.className = `p-4 rounded-xl border backdrop-blur-md transition-all duration-500 shadow-lg ${colors[post.sent]} animate-fade-in-up`;
    el.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br ${rColors} p-[2px] shadow-sm">
                    <div class="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-inner">
                        U${Math.floor(Math.random()*9)}
                    </div>
                </div>
                <div>
                    <p class="text-xs font-bold text-white tracking-wide">@user_${Math.floor(Math.random()*9000)+1000}</p>
                    <p class="text-[10px] text-slate-400 font-medium">Just now • <span class="text-blue-400">${post.tag}</span></p>
                </div>
            </div>
            ${badges[post.sent]}
        </div>
        <p class="text-sm font-medium pr-2 leading-relaxed opacity-90">${post.text}</p>
    `;
    
    // Clear initial listening text
    if(feed.children.length > 0 && feed.children[0].classList.contains('flex-col')) {
        feed.innerHTML = '';
    }
    
    feed.prepend(el);
    if(feed.children.length > 50) feed.removeChild(feed.lastChild); // keep DOM light
}

function generatePost(forceNegative = false) {
    const tag = tags[Math.floor(Math.random() * tags.length)];
    let sent = 'neu';
    const r = Math.random();
    
    if (forceNegative) {
        sent = 'neg';
    } else {
        if (r < 0.4) sent = 'pos';
        else if (r < 0.7) sent = 'neu';
        else sent = 'neg';
    }

    let arr = sent === 'pos' ? positiveTemplates : sent === 'neg' ? negativeTemplates : neutralTemplates;
    const text = arr[Math.floor(Math.random() * arr.length)].replace('{tag}', tag);

    const post = { text, tag, sent, ts: Date.now() };
    
    state.posts.unshift(post);
    state.counts[sent]++;
    processWords(text);

    // Filter logic
    if (currentFilter === 'all' || currentFilter === tag) {
        createPostNode(post);
    }
}

// History recorder (for line chart)
setInterval(() => {
    const now = new Date();
    const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    
    // Calculate recent velocity for the lines
    const recent = state.posts.slice(0, 15);
    state.history.push({
        time: timeStr,
        pos: recent.filter(p=>p.sent==='pos').length,
        neg: recent.filter(p=>p.sent==='neg').length
    });
}, 5000);

// Main generation loop
let generateInterval;
function startLoop() {
    clearInterval(generateInterval);
    generateInterval = setInterval(() => {
        generatePost();
        updateUI();
    }, 2000);
}

// Live Clock UI logic
function updateClock() {
    const el = document.getElementById('liveClock');
    if(!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-US', { hour12: false });
}
setInterval(updateClock, 1000);

// Event Listeners
hashtagFilter.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    document.getElementById('postFeed').innerHTML = ''; // clear visual feed
    // Re-render valid posts
    const filtered = currentFilter === 'all' ? state.posts : state.posts.filter(p => p.tag === currentFilter);
    [...filtered].reverse().slice(-50).forEach(createPostNode); // render up to 50
    updateUI();
});

let isSpiking = false;
triggerSpikeBtn.addEventListener('click', () => {
    if(isSpiking) return;
    isSpiking = true;
    triggerSpikeBtn.innerHTML = 'Injecting Spike <span class="flex h-2 w-2 relative ml-1"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-red-200"></span></span>';
    triggerSpikeBtn.classList.replace('bg-slate-800/80', 'bg-red-600');
    triggerSpikeBtn.classList.replace('text-slate-300', 'text-white');
    
    let count = 0;
    const spikeInt = setInterval(() => {
        generatePost(true); // force negative
        updateUI();
        count++;
        if(count >= 20) {
            clearInterval(spikeInt);
            isSpiking = false;
            triggerSpikeBtn.innerHTML = '<svg class="w-3.5 h-3.5 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> Simulate Crisis Spike';
            triggerSpikeBtn.classList.replace('bg-red-600', 'bg-slate-800/80');
            triggerSpikeBtn.classList.replace('text-white', 'text-slate-300');
        }
    }, 400); // rapidly fire 20 negatives
});

// Init
window.addEventListener('DOMContentLoaded', () => {
    initCharts();
    updateClock();
    state.history.push({ time: new Date().toLocaleTimeString('en-US',{hour12:false}), pos: 0, neg: 0 });
    
    // Pre-populate 10 items
    for(let i=0; i<10; i++) generatePost();
    updateUI();
    startLoop();

    // Check saved theme at init and update charts if needed
    if(localStorage.getItem('theme') === 'light' && window.updateChartsTheme) {
        setTimeout(window.updateChartsTheme, 200);
    }
});

// Theme update hook for charts called by injected HTML button
window.updateChartsTheme = function() {
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#334155'; // slate-400 vs slate-700
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    
    for (let id in Chart.instances) {
        let chart = Chart.instances[id];
        if (chart.options.scales && chart.options.scales.x) {
            chart.options.scales.x.ticks.color = textColor;
            chart.options.scales.x.grid.color = gridColor;
            chart.options.scales.y.ticks.color = textColor;
            chart.options.scales.y.grid.color = gridColor;
        }
        if (chart.options.plugins && chart.options.plugins.legend) {
            chart.options.plugins.legend.labels.color = textColor;
        }
        chart.update();
    }
}




window.generatePDFReport = function(btn) {
    const originalText = btn.innerHTML;
    // Maintain a loading state with spinner
    btn.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> <span class="whitespace-nowrap">Distilling PDF...</span>';
    
    setTimeout(() => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Header
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text('TrendPulse OS Intelligence', 20, 25);
        
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text('Report Generated: ' + new Date().toLocaleString(), 20, 32);
        
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text('Executive Summary', 20, 60);
        
        doc.setFontSize(12);
        doc.setTextColor(71, 85, 105);
        const splitText = doc.splitTextToSize(
            "Based on the latest live intercept data, overall brand sentiment is currently heavily monitored. Critical alerts remain isolated, and automated NLP screening indicates no immediate cascading PR crises outside of selected hashtag sectors. Recommended action: Standard monitoring protocols.",
            170
        );
        doc.text(splitText, 20, 70);
        
        // Grab live data from DOM
        doc.setFontSize(14);
        doc.setTextColor(59, 130, 246);
        doc.text('Live Analyzed Posts: ' + document.getElementById('totalPosts').innerText, 20, 110);
        doc.setTextColor(16, 185, 129);
        doc.text('Polarity Split Dominance: ' + document.getElementById('avgSentimentLabel').innerText, 20, 120);
        doc.setTextColor(239, 68, 68);
        doc.text('Crisis Velocity: ' + document.getElementById('crisisScoreVal').innerText + ' / 100', 20, 130);

        // Footer
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text('CONFIDENTIAL - INTERNAL USE ONLY. TrendPulse AI Engine Demo.', 20, 280);
        
        doc.save('TrendPulse_Intel_Report.pdf');
        
        // Revert button
        btn.innerHTML = originalText;
    }, 1800); // UI delay for dramatic effect
};
