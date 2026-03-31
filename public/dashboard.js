const userNameEl = document.getElementById('userName');
const userBadge = document.getElementById('userBadge');
const logoutBtn = document.getElementById('logoutBtn');
const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
const topLogoutBtn = document.getElementById('topLogoutBtn');
const triggerSpikeBtn = document.getElementById('triggerSpikeBtn');
const hashtagFilter = document.getElementById('hashtagFilter');
const compareHashtag1El = document.getElementById('compareHashtag1');
const compareHashtag2El = document.getElementById('compareHashtag2');

const HASHTAG_EMOJI = {
    '#AI': '🤖',
    '#Tech': '💻',
    '#Launch': '🚀',
    '#Hackathon': '⚡',
    '#Startup': '💼',
    '#FinTech': '💳',
    '#EdTech': '🎓',
    '#CyberSecurity': '🛡️',
    '#Cloud': '☁️',
    '#DevOps': '🧪',
    '#Product': '📦',
    '#DataScience': '📊',
    '#ClimateTech': '🌱',
    '#Crisis': '🚨'
};

// Auth lives on Node (same origin), analytics data lives on Flask.
const AUTH_API_BASE = window.location.origin;
const DATA_API_BASE = 'http://localhost:5000';
const DEMO_MODE = true;

const token = localStorage.getItem('token');

if (!token) {
  window.location.href = '/login.html';
}

// Authentication / Profile Load - Connect to Flask Backend
async function loadProfile() {
    try {
        const response = await fetch(`${AUTH_API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }
        userNameEl.textContent = data.user?.name || 'User';
    } catch (error) {
        userNameEl.textContent = 'User (Offline)';
    }
}
loadProfile();

function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);
if (topLogoutBtn) topLogoutBtn.addEventListener('click', handleLogout);

/* =========================================
   DASHBOARD BACKEND POLLING LOGIC 
   ========================================= */

// State - fetched from Flask backend
let state = {
    posts: [],
    counts: { positive: 0, neutral: 0, negative: 0 },
    crisisScore: 0,
    crisisStatus: 'Safe',
    words: {},
    hourly: [],
    dataSource: 'Real-time X API',
    processingEngine: 'Unknown'
};

let currentFilter = 'all';
let demoSpikeUntil = 0;

const DEMO_TOPICS = [
    '#AI',
    '#Tech',
    '#Launch',
    '#Hackathon',
    '#Startup',
    '#FinTech',
    '#EdTech',
    '#CyberSecurity',
    '#Cloud',
    '#DevOps',
    '#Product',
    '#DataScience',
    '#ClimateTech'
];
const DEMO_AUTHORS = ['pulsewire', 'marketlens', 'opsdaily', 'productsignals', 'citytrend', 'futurebrief'];
const DEMO_SNIPPETS = {
    positive: [
        'Community response is strong and adoption is accelerating fast.',
        'Great rollout quality today. Users are reporting smooth performance.',
        'Positive momentum continues with high engagement across threads.'
    ],
    neutral: [
        'Conversation is active, mostly observational with balanced sentiment.',
        'Users are comparing versions and waiting for more updates.',
        'Steady discussion with no clear sentiment skew right now.'
    ],
    negative: [
        'Critical replies are growing around reliability concerns.',
        'Users are frustrated by delays and support response time.',
        'There is visible backlash in comment threads this cycle.'
    ]
};

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
    return arr[randomInt(0, arr.length - 1)];
}

function normalizeHashtag(value) {
    const raw = (value || '').trim();
    if (!raw) return '';
    return raw.startsWith('#') ? raw : `#${raw}`;
}

function buildDemoDashboardState() {
    const posts = [];
    const words = {};
    const counts = { positive: 0, neutral: 0, negative: 0 };
    const spikeActive = Date.now() < demoSpikeUntil;

    const baselineCount = spikeActive ? 8 : 60;
    for (let i = 0; i < baselineCount; i++) {
        const sentimentRoll = Math.random();
        const sentiment = sentimentRoll < 0.42 ? 'positive' : sentimentRoll < 0.72 ? 'neutral' : 'negative';
        const tag = pick(DEMO_TOPICS);
        const text = `${pick(DEMO_SNIPPETS[sentiment])} ${tag}`;
        const createdAt = new Date(Date.now() - randomInt(30, 5 * 3600) * 1000).toISOString();
        const post = {
            id: `demo-${Date.now()}-${i}`,
            text,
            author: pick(DEMO_AUTHORS),
            sentiment,
            confidence: sentiment === 'neutral' ? randomInt(56, 79) / 100 : randomInt(70, 97) / 100,
            likes: randomInt(2, 4000),
            retweets: randomInt(0, 1600),
            createdAt,
            tag,
            hashtags: [tag],
            engine: 'distilbert'
        };
        posts.push(post);
        counts[sentiment] += 1;

        text.toLowerCase().replace(/[^a-z0-9#@\s]/g, ' ').split(/\s+/).forEach((w) => {
            if (w.length > 3 && !['this','that','with','from','about','there','today'].includes(w)) {
                words[w] = (words[w] || 0) + 1;
            }
        });
    }

    if (spikeActive) {
        const nowIso = new Date().toISOString();
        const injected = Array.from({ length: 20 }, (_, idx) => ({
            id: `demo-spike-${Date.now()}-${idx}`,
            text: `${pick(DEMO_SNIPPETS.negative)} #Crisis`,
            author: pick(DEMO_AUTHORS),
            sentiment: 'negative',
            confidence: randomInt(88, 99) / 100,
            likes: randomInt(80, 7000),
            retweets: randomInt(20, 3000),
            createdAt: nowIso,
            tag: '#Crisis',
            hashtags: ['#Crisis'],
            engine: 'distilbert'
        }));
        injected.forEach((post) => {
            posts.push(post);
            counts.negative += 1;
        });
    }

    const hourly = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(Date.now() - (11 - i) * 3600 * 1000);
        const hour = d.toISOString().slice(0, 13) + ':00';
        return {
            hour,
            positive: randomInt(1, 12),
            neutral: randomInt(1, 10),
            negative: randomInt(0, 9)
        };
    });

    const total = counts.positive + counts.neutral + counts.negative;
    const negativeRatio = total ? counts.negative / total : 0;
    const crisisScore = Math.min(100, Math.round(negativeRatio * 100));

    return {
        posts,
        counts,
        words,
        hourly,
        crisisScore,
        crisisStatus: crisisScore >= 70 ? 'Crisis' : crisisScore >= 40 ? 'Watch' : 'Safe',
        dataSource: 'Real-time X API',
        processingEngine: 'DistilBERT'
    };
}

// ⭐ FLASK BACKEND POLLING FUNCTIONS
async function pollFlaskBackend() {
    try {
        if (DEMO_MODE) {
            const demo = buildDemoDashboardState();
            state.posts = demo.posts;
            state.counts = demo.counts;
            state.crisisScore = demo.crisisScore;
            state.crisisStatus = demo.crisisStatus;
            state.words = demo.words;
            state.hourly = demo.hourly;
            state.dataSource = demo.dataSource;
            state.processingEngine = demo.processingEngine;
            renderDataSourceBadge();
            return;
        }

        const [statsRes, crisisRes, postsRes, wordcloudRes] = await Promise.all([
            fetch(`${DATA_API_BASE}/api/stats?hours=24`),
            fetch(`${DATA_API_BASE}/api/crisis-score`),
            fetch(`${DATA_API_BASE}/api/posts?limit=60`),
            fetch(`${DATA_API_BASE}/api/wordcloud?limit=80`)
        ]);

        if (!statsRes.ok || !crisisRes.ok || !postsRes.ok || !wordcloudRes.ok) {
            throw new Error('One or more Flask analytics endpoints failed');
        }

        const statsData = await statsRes.json();
        const crisisData = await crisisRes.json();
        const postsData = await postsRes.json();
        const wordcloudData = await wordcloudRes.json();

        // Clear previous in-memory view before applying fresh API payloads.
        state.posts = [];
        state.words = {};
        state.hourly = [];

        // Update state from Flask backend
        state.counts = {
            positive: statsData.positive || 0,
            neutral: statsData.neutral || 0,
            negative: statsData.negative || 0
        };
        state.crisisScore = crisisData.score || 0;
        state.crisisStatus = crisisData.status || 'Safe';
        state.posts = Array.isArray(postsData.posts)
            ? postsData.posts.map((post, idx) => {
                const sentimentRaw = (
                    post?.sentiment?.label
                    || post?.metadata?.sentiment
                    || post?.sentiment
                    || 'neutral'
                ).toString().toLowerCase();

                const sentiment = sentimentRaw === 'neg' ? 'negative'
                    : sentimentRaw === 'neu' ? 'neutral'
                    : sentimentRaw === 'pos' ? 'positive'
                    : sentimentRaw;

                return {
                    id: post.id || post.externalId || `live-${idx}`,
                    text: post.text || post.content || '',
                    author: post.author || 'anonymous',
                    sentiment,
                    confidence: post?.sentiment?.confidence
                        || post?.sentiment?.confidence_pct
                        || post?.metadata?.confidence
                        || post?.metadata?.confidence_pct
                        || 0.5,
                    likes: post?.engagement?.likes || 0,
                    retweets: post?.engagement?.retweets || 0,
                    createdAt: post.createdAt || post.fetchedAt || new Date().toISOString(),
                    tag: Array.isArray(post.hashtags) && post.hashtags.length ? post.hashtags[0] : '#AI',
                    hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
                    engine: post?.sentiment?.engine || post?.metadata?.engine || 'unknown'
                };
            }).filter((post) => post.text.trim().length > 0)
            : [];
        state.hourly = Array.isArray(statsData.hourly) ? statsData.hourly : [];
        state.dataSource = 'Real-time X API';
        state.processingEngine = state.posts.find((p) => p.engine && p.engine !== 'unknown')?.engine || 'DistilBERT/VADER';
        
        // Convert wordcloud data to word frequency object
        if (Array.isArray(wordcloudData.words)) {
            wordcloudData.words.forEach(item => {
                state.words[item.word] = item.count;
            });
        }

        renderDataSourceBadge();
    } catch (error) {
        console.error('Error polling Flask backend:', error);
        state.posts = [];
        state.hourly = [];
        state.words = {};
    }
}

function renderDataSourceBadge() {
    const sourceBadge = document.getElementById('realtimeSourceBadge');
    const engineBadge = document.getElementById('processingEngineBadge');
    if (!sourceBadge) return;

    sourceBadge.textContent = `Source: ${state.dataSource}`;

    if (engineBadge) {
        engineBadge.textContent = `Processing: ${state.processingEngine}`;
    }
}

// Chart Instances
let donutChart, lineChart, crisisGaugeChart, compareChart1, compareChart2;

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

    const gaugeCanvas = document.getElementById('crisisGaugeChart');
    if (gaugeCanvas) {
        const ctxGauge = gaugeCanvas.getContext('2d');
        crisisGaugeChart = new Chart(ctxGauge, {
            type: 'doughnut',
            data: {
                labels: ['Score', 'Remaining'],
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#10b981', 'rgba(51, 65, 85, 0.35)'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                rotation: -90,
                circumference: 180,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                animation: { duration: 900, easing: 'easeOutCubic' }
            }
        });
    }

    const buildCompareChart = (canvasId, title) => {
        const node = document.getElementById(canvasId);
        if (!node) return null;
        return new Chart(node.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Positive', 'Neutral', 'Negative'],
                datasets: [{
                    label: title,
                    data: [0, 0, 0],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#1e293b' } }
                },
                animation: { duration: 700, easing: 'easeOutQuart' }
            }
        });
    };

    compareChart1 = buildCompareChart('compareChart1', 'Hashtag 1');
    compareChart2 = buildCompareChart('compareChart2', 'Hashtag 2');
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

function getCountsForHashtag(tag) {
    const normalized = normalizeHashtag(tag).toLowerCase();
    const counts = { pos: 0, neu: 0, neg: 0 };
    if (!normalized) return counts;

    state.posts.forEach((post) => {
        const tags = [post.tag, ...(Array.isArray(post.hashtags) ? post.hashtags : [])]
            .filter(Boolean)
            .map((t) => String(t).toLowerCase());

        if (!tags.includes(normalized)) return;

        const sentiment = String(post.sentiment || 'neutral').toLowerCase();
        if (sentiment === 'positive') counts.pos += 1;
        else if (sentiment === 'negative') counts.neg += 1;
        else counts.neu += 1;
    });

    return counts;
}

function getAllAvailableHashtags() {
    const tags = new Set();

    state.posts.forEach((post) => {
        [post.tag, ...(Array.isArray(post.hashtags) ? post.hashtags : [])]
            .filter(Boolean)
            .forEach((tag) => {
                const normalized = normalizeHashtag(String(tag));
                if (normalized) tags.add(normalized);
            });
    });

    if (tags.size === 0) {
        DEMO_TOPICS.forEach((tag) => tags.add(tag));
        tags.add('#iPhone');
        tags.add('#Samsung');
    }

    return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

function formatHashtagOptionLabel(tag) {
    const emoji = HASHTAG_EMOJI[tag] || '🏷️';
    return `${emoji} ${tag}`;
}

function refreshCompareHashtagDropdowns() {
    const selects = [compareHashtag1El, compareHashtag2El].filter(Boolean);
    if (!selects.length) return;

    const tags = getAllAvailableHashtags();
    const firstDefault = tags[0] || '#AI';
    const secondDefault = tags[1] || tags[0] || '#Tech';

    selects.forEach((selectEl, index) => {
        const previous = normalizeHashtag(selectEl.value);
        selectEl.innerHTML = '';

        tags.forEach((tag) => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = formatHashtagOptionLabel(tag);
            selectEl.appendChild(option);
        });

        const fallback = index === 0 ? firstDefault : secondDefault;
        selectEl.value = tags.includes(previous) ? previous : fallback;
    });
}

function refreshMainHashtagFilterOptions() {
    if (!hashtagFilter) return;

    const previous = hashtagFilter.value || 'all';
    hashtagFilter.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = '🌐 All Global Hashtags';
    hashtagFilter.appendChild(allOption);

    getAllAvailableHashtags().forEach((tag) => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = formatHashtagOptionLabel(tag);
        hashtagFilter.appendChild(option);
    });

    hashtagFilter.value = previous === 'all' || Array.from(hashtagFilter.options).some((opt) => opt.value === previous)
        ? previous
        : 'all';
    currentFilter = hashtagFilter.value;
}

function updateComparativeHashtagCharts() {
    if (!compareChart1 || !compareChart2) return;

    const hashtag1 = normalizeHashtag(compareHashtag1El?.value || '#AI') || '#AI';
    const hashtag2 = normalizeHashtag(compareHashtag2El?.value || '#Tech') || '#Tech';

    const counts1 = getCountsForHashtag(hashtag1);
    const counts2 = getCountsForHashtag(hashtag2);

    const label1 = document.getElementById('compareLabel1');
    const label2 = document.getElementById('compareLabel2');
    if (label1) label1.textContent = hashtag1;
    if (label2) label2.textContent = hashtag2;

    compareChart1.data.datasets[0].data = [counts1.pos, counts1.neu, counts1.neg];
    compareChart2.data.datasets[0].data = [counts2.pos, counts2.neu, counts2.neg];
    compareChart1.update();
    compareChart2.update();
}

function updateUI() {
    // Filter posts
    const filtered = currentFilter === 'all' ? state.posts : state.posts.filter(p => p.tag === currentFilter || p.hashtags?.includes(currentFilter));
    const fCounts = { pos: 0, neu: 0, neg: 0 };
    filtered.forEach(p => { 
        const sent = typeof p.sentiment === 'string' ? p.sentiment.toLowerCase() : 'neu';
        if (sent === 'positive') fCounts.pos++;
        else if (sent === 'negative') fCounts.neg++;
        else fCounts.neu++;
    });

    // Use Flask-provided counts if available
    const displayCounts = filtered.length > 0
        ? fCounts
        : { pos: state.counts.positive || 0, neu: state.counts.neutral || 0, neg: state.counts.negative || 0 };

    // 1. KPI Cards
    const total = filtered.length || (state.counts.positive + state.counts.neutral + state.counts.negative);
    document.getElementById('totalPosts').textContent = total;
    
    // Average Sentiment Bar
    const posPct = total ? Math.round((displayCounts.pos / total) * 100) : 0;
    const negPct = total ? Math.round((displayCounts.neg / total) * 100) : 0;
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

    // 2. Crisis Score (negativeCount / totalPosts * 100)
    const crisisScore = total ? Math.round((displayCounts.neg / total) * 100) : 0;
    state.crisisScore = crisisScore;
    state.crisisStatus = crisisScore >= 70 ? 'Crisis' : crisisScore >= 40 ? 'Watch' : 'Safe';
    const scoreEl = document.getElementById('crisisScoreVal');
    const badge = document.getElementById('crisisBadge');
    const action = document.getElementById('actionRecommendation');
    const actionPanelText = document.getElementById('recommendedActionText');
    const banner = document.getElementById('crisisAlertBanner');

    scoreEl.textContent = crisisScore;

    if (crisisScore < 40) {
        badge.textContent = 'SAFE';
        badge.className = 'text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400';
        action.innerHTML = 'Continue monitoring. No action required.';
        if (actionPanelText) actionPanelText.textContent = 'Continue monitoring. No action required.';
        scoreEl.className = 'text-3xl font-bold text-white';
        banner.classList.add('hidden');
    } else if (crisisScore < 70) {
        badge.textContent = 'WATCH';
        badge.className = 'text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400';
        action.innerHTML = 'Escalate to PR team. Prepare holding statement.';
        if (actionPanelText) actionPanelText.textContent = 'Escalate to PR team. Prepare holding statement.';
        scoreEl.className = 'text-3xl font-bold text-amber-400';
        banner.classList.add('hidden');
    } else {
        badge.textContent = 'CRISIS';
        badge.className = 'text-xs font-bold px-2 py-0.5 rounded animate-pulse bg-red-500/20 text-red-500';
        action.innerHTML = 'Issue public statement immediately. Alert leadership.';
        if (actionPanelText) actionPanelText.textContent = 'Issue public statement immediately. Alert leadership.';
        scoreEl.className = 'text-3xl font-bold text-red-500';
        banner.classList.remove('hidden');
    }

    if (crisisGaugeChart) {
        const gaugeColor = crisisScore < 40 ? '#10b981' : crisisScore < 70 ? '#f59e0b' : '#ef4444';
        crisisGaugeChart.data.datasets[0].data = [crisisScore, 100 - crisisScore];
        crisisGaugeChart.data.datasets[0].backgroundColor = [gaugeColor, 'rgba(51, 65, 85, 0.35)'];
        crisisGaugeChart.update();
    }

    // 3. Update Charts
    donutChart.data.datasets[0].data = [displayCounts.pos, displayCounts.neu, displayCounts.neg];
    donutChart.update();

    // Time series from Flask hourly data
    if (Array.isArray(state.hourly) && state.hourly.length > 0) {
        lineChart.data.labels = state.hourly.map(h => h.hour?.slice(11, 16) || h.hour);
        lineChart.data.datasets[0].data = state.hourly.map(h => h.positive || 0);
        lineChart.data.datasets[1].data = state.hourly.map(h => h.negative || 0);
    } else {
        lineChart.data.labels = [];
        lineChart.data.datasets[0].data = [];
        lineChart.data.datasets[1].data = [];
    }
    lineChart.update();

    const feed = document.getElementById('postFeed');
    if (feed) {
        feed.innerHTML = '';
        [...filtered].reverse().slice(-50).forEach(createPostNode);
    }

    renderWordCloud();
    refreshMainHashtagFilterOptions();
    refreshCompareHashtagDropdowns();
    updateComparativeHashtagCharts();
}

function createPostNode(post) {
    const feed = document.getElementById('postFeed');
    const colors = {
        pos: 'border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-transparent',
        neu: 'border-slate-600/30 bg-gradient-to-r from-slate-600/10 to-transparent',
        neg: 'border-red-500/30 bg-gradient-to-r from-red-500/10 to-transparent'
    };
    const badges = {
        pos: '<span class="px-2 py-0.5 rounded px-2 text-[10px] bg-emerald-500/20 text-emerald-400 font-bold tracking-widest uppercase border border-emerald-500/20">Positive</span>',
        neu: '<span class="px-2 py-0.5 rounded px-2 text-[10px] bg-slate-500/20 text-slate-400 font-bold tracking-widest uppercase border border-slate-500/20">Neutral</span>',
        neg: '<span class="px-2 py-0.5 rounded px-2 text-[10px] bg-red-500/20 text-red-400 font-bold tracking-widest uppercase border border-red-500/20"><span class="animate-pulse mr-1">⚠️</span>Negative</span>'
    };

    // Generate random avatar gradient colors based on user "id"
    const gradients = ['from-purple-500 to-indigo-500', 'from-cyan-400 to-blue-500', 'from-emerald-400 to-teal-500', 'from-fuchsia-500 to-pink-500', 'from-amber-400 to-orange-500'];
    const rColors = gradients[Math.floor(Math.random() * gradients.length)];

    const sentimentKey = post.sentiment === 'positive' ? 'pos' : post.sentiment === 'negative' ? 'neg' : 'neu';
    const confidenceRaw = typeof post.confidence === 'number' ? post.confidence : parseFloat(post.confidence || 0);
    const confidencePct = Math.max(0, Math.min(100, Math.round((confidenceRaw <= 1 ? confidenceRaw * 100 : confidenceRaw))));
    const confidenceTone = sentimentKey === 'pos' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/30'
        : sentimentKey === 'neg' ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30'
        : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/30';
    const sentimentWord = sentimentKey === 'pos' ? 'Positive' : sentimentKey === 'neg' ? 'Negative' : 'Neutral';
    const safeAuthor = (post.author || 'anonymous').toString().replace(/^@/, '');
    const postTime = post.createdAt ? new Date(post.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Now';

    const el = document.createElement('div');
    el.className = `p-4 rounded-xl border backdrop-blur-md transition-all duration-500 shadow-lg ${colors[sentimentKey]} animate-fade-in-up`;
    el.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br ${rColors} p-[2px] shadow-sm">
                    <div class="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-inner">
                        ${safeAuthor.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
                <div>
                    <p class="text-xs font-bold text-white tracking-wide">@${safeAuthor}</p>
                    <p class="text-[10px] text-slate-400 font-medium">${postTime} • <span class="text-blue-400">${post.tag || '#AI'}</span></p>
                </div>
            </div>
            ${badges[sentimentKey]}
        </div>
        <p class="text-sm font-medium text-slate-200 pr-2 leading-relaxed opacity-95">${post.text}</p>
        <div class="mt-3">
            <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded border ${confidenceTone}">${sentimentWord} - ${confidencePct}% confident</span>
        </div>
    `;
    
    // Clear initial listening text
    if(feed.children.length > 0 && feed.children[0].classList.contains('flex-col')) {
        feed.innerHTML = '';
    }
    
    feed.prepend(el);
    if(feed.children.length > 50) feed.removeChild(feed.lastChild); // keep DOM light
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
    const filtered = currentFilter === 'all'
        ? state.posts
        : state.posts.filter(p => p.tag === currentFilter || p.hashtags?.includes(currentFilter));
    [...filtered].reverse().slice(-50).forEach(createPostNode); // render up to 50
    updateUI();
});

if (compareHashtag1El) {
    compareHashtag1El.addEventListener('change', updateComparativeHashtagCharts);
}
if (compareHashtag2El) {
    compareHashtag2El.addEventListener('change', updateComparativeHashtagCharts);
}

let isSpiking = false;
triggerSpikeBtn.addEventListener('click', async () => {
    if(isSpiking) return;
    isSpiking = true;
    triggerSpikeBtn.innerHTML = 'Injecting Spike <span class="flex h-2 w-2 relative ml-1"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-red-200"></span></span>';
    triggerSpikeBtn.classList.replace('bg-slate-800/80', 'bg-red-600');
    triggerSpikeBtn.classList.replace('text-slate-300', 'text-white');
    
    try {
        if (DEMO_MODE) {
            demoSpikeUntil = Date.now() + 120000;
            const demo = buildDemoDashboardState();
            state.posts = demo.posts;
            state.counts = demo.counts;
            state.words = demo.words;
            state.hourly = demo.hourly;
            updateUI();
            return;
        }

        // Call Flask spike endpoint
        await fetch(`${DATA_API_BASE}/api/posts/spike`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count: 20 })
        });
        
        // Wait a bit for data to be populated, then refresh
        await new Promise(r => setTimeout(r, 1500));
        await pollFlaskBackend();
        updateUI();
    } catch (error) {
        console.error('Spike injection error:', error);
    } finally {
        isSpiking = false;
        triggerSpikeBtn.innerHTML = '<svg class="w-3.5 h-3.5 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> Inject Spike';
        triggerSpikeBtn.classList.replace('bg-red-600', 'bg-slate-800/80');
        triggerSpikeBtn.classList.replace('text-white', 'text-slate-300');
    }
});

// Init
window.addEventListener('DOMContentLoaded', () => {
    initCharts();
    updateClock();
    renderDataSourceBadge();
    updateComparativeHashtagCharts();
    
    // Initial poll from Flask backend
    pollFlaskBackend().then(() => updateUI());
    
    // Start continuous polling from Flask backend (every 2 seconds)
    setInterval(async () => {
        await pollFlaskBackend();
        updateUI();
    }, 2000);

    // Check saved theme at init and update charts if needed
    if(localStorage.getItem('theme') === 'light' && window.updateChartsTheme) {
        setTimeout(window.updateChartsTheme, 200);
    }
});

window.downloadReport = function() {
    const activeBtn = document.activeElement;
    if (activeBtn && activeBtn.tagName === 'BUTTON') {
        window.generatePDFReport(activeBtn);
        return;
    }

    window.generatePDFReport();
};

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
    const isButtonEl = btn && btn.tagName === 'BUTTON';
    const originalText = isButtonEl ? btn.innerHTML : '';

    if (isButtonEl) {
        btn.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> <span class="whitespace-nowrap">Compiling Report...</span>';
    }

    const reportTimestamp = new Date();
    const reportTimeStr = reportTimestamp.toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
    const reportTimeShort = reportTimestamp.toLocaleTimeString('en-US', { hour12: false });

    // Capture chart images before PDF generation
    const donutCanvas = document.getElementById('donutChart');
    const lineCanvas = document.getElementById('lineChart');
    const wordCloudCanvas = document.getElementById('wordCloudCanvas');

    const donutImg = donutCanvas.toDataURL('image/png', 1.0);
    const lineImg = lineCanvas.toDataURL('image/png', 1.0);
    let wordCloudImg = null;
    try { wordCloudImg = wordCloudCanvas.toDataURL('image/png', 1.0); } catch(e) {}

    setTimeout(() => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const W = 210, H = 297;
        const margin = 18;
        const contentW = W - margin * 2;

        // Current state snapshot
        const total = state.posts.length;
        const counts = { pos: 0, neu: 0, neg: 0 };
        state.posts.forEach((p) => {
            if (p.sentiment === 'positive') counts.pos++;
            else if (p.sentiment === 'negative') counts.neg++;
            else counts.neu++;
        });
        const posPct = total ? Math.round((counts.pos / total) * 100) : 0;
        const neuPct = total ? Math.round((counts.neu / total) * 100) : 0;
        const negPct = total ? Math.round((counts.neg / total) * 100) : 0;
        const crisisScore = parseInt(document.getElementById('crisisScoreVal').innerText) || 0;
        const sentimentLabel = document.getElementById('avgSentimentLabel').innerText;

        // Hashtag breakdown
        const tagCounts = {};
        const tagSentiment = {};
        state.posts.forEach(p => {
            const tag = p.tag || '#AI';
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            if (!tagSentiment[tag]) tagSentiment[tag] = { pos: 0, neu: 0, neg: 0 };
            if (p.sentiment === 'positive') tagSentiment[tag].pos++;
            else if (p.sentiment === 'negative') tagSentiment[tag].neg++;
            else tagSentiment[tag].neu++;
        });

        // Recent trend (last 10 hourly snapshots from backend)
        const recentHistory = (Array.isArray(state.hourly) ? state.hourly : [])
            .slice(-10)
            .map((h) => ({
                time: h.hour?.slice(11, 16) || h.hour || '',
                pos: h.positive || 0,
                neg: h.negative || 0
            }));

        // Top words
        const topWords = Object.entries(state.words).sort((a, b) => b[1] - a[1]).slice(0, 15);

        // Recent negative posts
        const recentNegPosts = state.posts.filter((p) => p.sentiment === 'negative').slice(0, 5);

        // Utility functions
        const setHeaderBg = () => { doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, 45, 'F'); };
        const setFooter = (pageNum, totalPages) => {
            doc.setFillColor(15, 23, 42);
            doc.rect(0, H - 12, W, 12, 'F');
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('CONFIDENTIAL — TrendPulse Intelligence Report', margin, H - 5);
            doc.text(`Page ${pageNum} of ${totalPages}`, W - margin - 20, H - 5, { align: 'right' });
        };
        const sectionTitle = (title, y) => {
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text(title, margin, y);
            doc.setDrawColor(59, 130, 246);
            doc.setLineWidth(0.8);
            doc.line(margin, y + 2, margin + 60, y + 2);
            return y + 10;
        };
        const kpiBox = (x, y, w, h, label, value, color) => {
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(x, y, w, h, 3, 3, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(x, y, w, h, 3, 3, 'S');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(label, x + 5, y + 8);
            doc.setFontSize(18);
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(String(value), x + 5, y + 20);
        };

        // ==================== PAGE 1: COVER ====================
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, W, H, 'F');

        // Accent line
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, W, 4, 'F');

        // Logo area
        doc.setFontSize(36);
        doc.setTextColor(255, 255, 255);
        doc.text('TrendPulse', W / 2, 100, { align: 'center' });

        doc.setFontSize(18);
        doc.setTextColor(148, 163, 184);
        doc.text('Intelligence Report', W / 2, 115, { align: 'center' });

        // Divider
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.5);
        doc.line(W / 2 - 40, 125, W / 2 + 40, 125);

        // Metadata
        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139);
        doc.text('Generated: ' + reportTimeStr, W / 2, 140, { align: 'center' });
        doc.text('Data Window: Last 200 Intercepted Posts', W / 2, 150, { align: 'center' });
        doc.text('Classification: INTERNAL — CONFIDENTIAL', W / 2, 160, { align: 'center' });

        // Summary box
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(margin, 180, contentW, 50, 5, 5, 'F');
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text('OVERVIEW SNAPSHOT', margin + 8, 192);
        doc.setFontSize(12);
        doc.setTextColor(226, 232, 240);
        doc.text(`${total} posts analyzed  |  ${posPct}% positive  |  ${negPct}% negative  |  Crisis: ${crisisScore}/100`, margin + 8, 204);
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Active Hashtags: ${Object.keys(tagCounts).join(', ')}`, margin + 8, 214);
        doc.text(`Sentiment Trend: ${sentimentLabel}`, margin + 8, 222);

        // Bottom accent
        doc.setFillColor(59, 130, 246);
        doc.rect(0, H - 4, W, 4, 'F');

        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('TrendPulse OS v2.0 — Social Media Intelligence Engine', W / 2, H - 15, { align: 'center' });

        // ==================== PAGE 2: EXECUTIVE SUMMARY & KPIs ====================
        doc.addPage();
        setHeaderBg();
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('TrendPulse', margin, 20);
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text('Intelligence Report — ' + reportTimeShort, margin, 28);
        setFooter(2, 4);

        let y = sectionTitle('1. Executive Summary', 58);

        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);

        let riskLevel = 'LOW';
        let riskColor = [16, 185, 129];
        let execSummary = '';
        if (crisisScore < 40) {
            riskLevel = 'LOW';
            riskColor = [16, 185, 129];
            execSummary = `At ${reportTimeShort}, the brand monitoring environment is stable. Out of ${total} analyzed posts, ${posPct}% carry positive sentiment, indicating healthy brand perception. Negative sentiment remains contained at ${negPct}%. No immediate crisis indicators detected. Standard monitoring protocols are sufficient.`;
        } else if (crisisScore < 70) {
            riskLevel = 'MODERATE';
            riskColor = [245, 158, 11];
            execSummary = `At ${reportTimeShort}, elevated negative sentiment has been detected. ${negPct}% of ${total} analyzed posts carry negative polarity. The crisis velocity score of ${crisisScore}/100 indicates a potential escalation pattern. Recommended action: increase monitoring frequency and alert the communications team for standby response.`;
        } else {
            riskLevel = 'HIGH';
            riskColor = [239, 68, 68];
            execSummary = `At ${reportTimeShort}, CRITICAL negative sentiment surge detected. ${negPct}% of ${total} posts are negative with a crisis velocity of ${crisisScore}/100. This pattern suggests a coordinated or viral negative event. Immediate action required: engage crisis response protocol, draft public statement, and identify primary negative influencers.`;
        }

        const summaryLines = doc.splitTextToSize(execSummary, contentW);
        doc.text(summaryLines, margin, y);
        y += summaryLines.length * 5 + 8;

        // Risk badge
        doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
        doc.roundedRect(margin, y, 30, 8, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text('RISK: ' + riskLevel, margin + 3, y + 5.5);
        y += 16;

        // KPI boxes
        y = sectionTitle('2. Key Performance Indicators', y);
        const boxW = (contentW - 10) / 3;
        const boxH = 28;
        kpiBox(margin, y, boxW, boxH, 'Total Posts Analyzed', total, [59, 130, 246]);
        kpiBox(margin + boxW + 5, y, boxW, boxH, 'Positive Sentiment', posPct + '%', [16, 185, 129]);
        kpiBox(margin + (boxW + 5) * 2, y, boxW, boxH, 'Negative Sentiment', negPct + '%', [239, 68, 68]);
        y += boxH + 8;
        kpiBox(margin, y, boxW, boxH, 'Neutral Sentiment', neuPct + '%', [100, 116, 139]);
        kpiBox(margin + boxW + 5, y, boxW, boxH, 'Crisis Velocity', crisisScore + '/100', crisisScore >= 70 ? [239, 68, 68] : crisisScore >= 40 ? [245, 158, 11] : [16, 185, 129]);
        kpiBox(margin + (boxW + 5) * 2, y, boxW, boxH, 'Active Hashtags', Object.keys(tagCounts).length, [139, 92, 246]);
        y += boxH + 12;

        // Sentiment distribution bar
        y = sectionTitle('3. Sentiment Distribution', y);
        const barTotal = contentW;
        const posW = (posPct / 100) * barTotal;
        const neuW = (neuPct / 100) * barTotal;
        const negW = (negPct / 100) * barTotal;

        doc.setFillColor(16, 185, 129);
        doc.roundedRect(margin, y, Math.max(posW, 0.5), 10, 2, 2, 'F');
        doc.setFillColor(100, 116, 139);
        doc.rect(margin + posW, y, Math.max(neuW, 0.5), 10);
        doc.setFillColor(239, 68, 68);
        const negStart = margin + posW + neuW;
        doc.roundedRect(negStart, y, Math.max(negW, 0.5), 10, 2, 2, 'F');

        // Legend
        doc.setFontSize(8);
        doc.setTextColor(16, 185, 129);
        doc.text(`Pos: ${posPct}%`, margin, y + 18);
        doc.setTextColor(100, 116, 139);
        doc.text(`Neu: ${neuPct}%`, margin + 40, y + 18);
        doc.setTextColor(239, 68, 68);
        doc.text(`Neg: ${negPct}%`, margin + 80, y + 18);
        y += 26;

        // ==================== PAGE 3: CHARTS ====================
        doc.addPage();
        setHeaderBg();
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('TrendPulse', margin, 20);
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text('Charts & Visual Analytics — ' + reportTimeShort, margin, 28);
        setFooter(3, 4);

        y = sectionTitle('4. Sentiment Polarity Split', 58);
        try {
            doc.addImage(donutImg, 'PNG', margin + 25, y, 80, 80);
            // Legend next to chart
            doc.setFontSize(10);
            doc.setTextColor(16, 185, 129);
            doc.text(`Positive: ${counts.pos} posts (${posPct}%)`, margin + 115, y + 25);
            doc.setTextColor(100, 116, 139);
            doc.text(`Neutral: ${counts.neu} posts (${neuPct}%)`, margin + 115, y + 38);
            doc.setTextColor(239, 68, 68);
            doc.text(`Negative: ${counts.neg} posts (${negPct}%)`, margin + 115, y + 51);
            doc.setTextColor(51, 65, 85);
            doc.text(`Total: ${total} posts`, margin + 115, y + 68);
        } catch(e) {
            doc.setFontSize(10);
            doc.setTextColor(239, 68, 68);
            doc.text('[Chart capture unavailable]', margin, y + 10);
        }
        y += 90;

        y = sectionTitle('5. Sentiment Trend Over Time', y);
        try {
            doc.addImage(lineImg, 'PNG', margin, y, contentW, 65);
            y += 70;
            // Time axis label
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            if (recentHistory.length > 0) {
                doc.text(`Time range: ${recentHistory[0].time} — ${recentHistory[recentHistory.length - 1].time}  |  Snapshots every 5 seconds`, margin, y);
            }
        } catch(e) {
            doc.setFontSize(10);
            doc.setTextColor(239, 68, 68);
            doc.text('[Chart capture unavailable]', margin, y + 10);
        }
        y += 12;

        // Word Cloud
        if (wordCloudImg && topWords.length > 0) {
            y = sectionTitle('6. Trending Word Cloud', y);
            try {
                doc.addImage(wordCloudImg, 'PNG', margin + 20, y, 120, 60);
                y += 65;
                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                doc.text('Top keywords extracted from intercepted posts via NLP tokenization.', margin, y);
            } catch(e) {}
        }

        // ==================== PAGE 4: DETAILED BREAKDOWNS ====================
        doc.addPage();
        setHeaderBg();
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('TrendPulse', margin, 20);
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text('Detailed Analysis — ' + reportTimeShort, margin, 28);
        setFooter(4, 4);

        y = sectionTitle('7. Hashtag Performance Matrix', 58);

        // Table header
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentW, 8, 'F');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text('Hashtag', margin + 3, y + 5.5);
        doc.text('Total', margin + 45, y + 5.5);
        doc.text('Positive', margin + 65, y + 5.5);
        doc.text('Neutral', margin + 90, y + 5.5);
        doc.text('Negative', margin + 115, y + 5.5);
        doc.text('Health', margin + 145, y + 5.5);
        y += 10;

        Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).forEach(([tag, count]) => {
            const ts = tagSentiment[tag];
            const health = ts.neg > ts.pos ? 'AT RISK' : ts.neg > ts.neu ? 'WATCH' : 'HEALTHY';
            const hColor = health === 'AT RISK' ? [239, 68, 68] : health === 'WATCH' ? [245, 158, 11] : [16, 185, 129];

            doc.setFillColor(255, 255, 255);
            doc.rect(margin, y, contentW, 7, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.line(margin, y + 7, margin + contentW, y + 7);

            doc.setFontSize(9);
            doc.setTextColor(59, 130, 246);
            doc.text(tag, margin + 3, y + 5);
            doc.setTextColor(51, 65, 85);
            doc.text(String(count), margin + 48, y + 5);
            doc.setTextColor(16, 185, 129);
            doc.text(String(ts.pos), margin + 68, y + 5);
            doc.setTextColor(100, 116, 139);
            doc.text(String(ts.neu), margin + 93, y + 5);
            doc.setTextColor(239, 68, 68);
            doc.text(String(ts.neg), margin + 118, y + 5);
            doc.setTextColor(hColor[0], hColor[1], hColor[2]);
            doc.setFontSize(7);
            doc.text(health, margin + 145, y + 5);
            y += 8;
        });
        y += 8;

        // Top Words frequency
        if (topWords.length > 0) {
            y = sectionTitle('8. Top Keywords by Frequency', y);
            doc.setFillColor(241, 245, 249);
            doc.rect(margin, y, contentW, 8, 'F');
            doc.setFontSize(8);
            doc.setTextColor(51, 65, 85);
            doc.text('#', margin + 3, y + 5.5);
            doc.text('Keyword', margin + 12, y + 5.5);
            doc.text('Frequency', margin + 70, y + 5.5);
            doc.text('Weight', margin + 110, y + 5.5);
            y += 10;

            topWords.forEach(([word, freq], i) => {
                const barWidth = Math.min((freq / (topWords[0][1] || 1)) * 60, 60);
                doc.setFillColor(241, 245, 249);
                doc.rect(margin, y, contentW, 6, 'F');
                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                doc.text(String(i + 1), margin + 3, y + 4.5);
                doc.setTextColor(51, 65, 85);
                doc.text(word, margin + 12, y + 4.5);
                doc.setTextColor(59, 130, 246);
                doc.text(String(freq), margin + 73, y + 4.5);
                // Mini bar
                doc.setFillColor(59, 130, 246);
                doc.roundedRect(margin + 100, y + 1, barWidth, 4, 1, 1, 'F');
                y += 7;
            });
            y += 8;
        }

        // Recent Negative Posts
        if (recentNegPosts.length > 0) {
            y = sectionTitle('9. Recent Negative Intercept Feed', y);
            recentNegPosts.forEach((post, i) => {
                const postTime = post.ts ? new Date(post.ts).toLocaleTimeString('en-US', { hour12: false }) : reportTimeShort;
                doc.setFillColor(254, 242, 242);
                doc.roundedRect(margin, y, contentW, 16, 2, 2, 'F');
                doc.setDrawColor(239, 68, 68);
                doc.setLineWidth(0.3);
                doc.line(margin, y, margin, y + 16);

                doc.setFontSize(7);
                doc.setTextColor(239, 68, 68);
                doc.text('NEGATIVE  •  ' + post.tag + '  •  ' + postTime, margin + 4, y + 5);
                doc.setFontSize(8);
                doc.setTextColor(51, 65, 85);
                const postLines = doc.splitTextToSize(post.text, contentW - 10);
                doc.text(postLines[0] || '', margin + 4, y + 12);
                y += 19;
            });
        }

        // ==================== PAGE 5: TIMELINE & RECOMMENDATIONS ====================
        doc.addPage();
        setHeaderBg();
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('TrendPulse', margin, 20);
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text('Timeline & Recommendations — ' + reportTimeShort, margin, 28);
        setFooter(5, 5);

        y = sectionTitle('10. Sentiment Timeline (Recent Snapshots)', 58);

        if (recentHistory.length > 0) {
            // Table
            doc.setFillColor(241, 245, 249);
            doc.rect(margin, y, contentW, 8, 'F');
            doc.setFontSize(8);
            doc.setTextColor(51, 65, 85);
            doc.text('Timestamp', margin + 3, y + 5.5);
            doc.text('Positive', margin + 50, y + 5.5);
            doc.text('Negative', margin + 90, y + 5.5);
            doc.text('Trend', margin + 130, y + 5.5);
            y += 10;

            recentHistory.forEach((h, i) => {
                const trend = h.pos > h.neg ? '▲ Positive' : h.neg > h.pos ? '▼ Negative' : '— Neutral';
                const tColor = h.pos > h.neg ? [16, 185, 129] : h.neg > h.pos ? [239, 68, 68] : [100, 116, 139];

                doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250);
                doc.rect(margin, y, contentW, 7, 'F');

                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                doc.text(h.time, margin + 3, y + 5);
                doc.setTextColor(16, 185, 129);
                doc.text(String(h.pos), margin + 53, y + 5);
                doc.setTextColor(239, 68, 68);
                doc.text(String(h.neg), margin + 93, y + 5);
                doc.setTextColor(tColor[0], tColor[1], tColor[2]);
                doc.text(trend, margin + 130, y + 5);
                y += 8;
            });
            y += 8;
        }

        // Recommendations
        y = sectionTitle('11. Recommended Actions', y);

        let recommendations = [];
        if (crisisScore < 40) {
            recommendations = [
                { icon: 'OK', text: 'Continue standard monitoring at current intervals.' },
                { icon: 'INFO', text: 'Schedule periodic deep-dive sentiment analysis reports.' },
                { icon: 'TIP', text: `Focus engagement efforts on high-performing hashtags: ${Object.keys(tagCounts).join(', ')}.` },
                { icon: 'NOTE', text: 'Maintain automated alert thresholds at current levels.' }
            ];
        } else if (crisisScore < 70) {
            recommendations = [
                { icon: 'WARN', text: 'Increase monitoring frequency to real-time scanning.' },
                { icon: 'ALERT', text: 'Notify communications team for potential response preparation.' },
                { icon: 'INFO', text: 'Identify and track source accounts driving negative sentiment.' },
                { icon: 'TIP', text: 'Prepare holding statement for rapid deployment if escalation occurs.' }
            ];
        } else {
            recommendations = [
                { icon: 'CRIT', text: 'ACTIVATE crisis response protocol immediately.' },
                { icon: 'URGENT', text: 'Draft and issue public statement addressing concerns.' },
                { icon: 'ALERT', text: 'Engage directly with high-influence negative commentators.' },
                { icon: 'WARN', text: 'Monitor for coordinated inauthentic behavior patterns.' }
            ];
        }

        recommendations.forEach(rec => {
            const recColor = rec.icon === 'OK' ? [16, 185, 129] :
                           rec.icon === 'WARN' || rec.icon === 'ALERT' ? [245, 158, 11] :
                           rec.icon === 'CRIT' || rec.icon === 'URGENT' ? [239, 68, 68] : [59, 130, 246];

            doc.setFillColor(recColor[0], recColor[1], recColor[2]);
            doc.roundedRect(margin, y, 18, 7, 2, 2, 'F');
            doc.setFontSize(6);
            doc.setTextColor(255, 255, 255);
            doc.text(rec.icon, margin + 2, y + 5);

            doc.setFontSize(9);
            doc.setTextColor(51, 65, 85);
            const recLines = doc.splitTextToSize(rec.text, contentW - 25);
            doc.text(recLines, margin + 22, y + 5);
            y += Math.max(10, recLines.length * 5 + 4);
        });

        y += 10;

        // Report signature
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin + contentW, y);
        y += 8;
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('This report was automatically generated by the TrendPulse Intelligence Engine.', margin, y);
        y += 5;
        doc.text(`Report ID: TP-${reportTimestamp.getTime().toString(36).toUpperCase()}  |  Engine: TrendPulse OS v2.0  |  Generated: ${reportTimeStr}`, margin, y);

        // Save
        doc.save('TrendPulse_Intel_Report_' + reportTimestamp.toISOString().slice(0, 10) + '.pdf');

        if (isButtonEl) {
            btn.innerHTML = originalText;
        }
    }, 2500);
};
