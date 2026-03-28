const fs = require('fs');
const path = require('path');

// 1. Update server.js
let serverJs = fs.readFileSync('server.js', 'utf8');
if (!serverJs.includes("app.get('/admin'")) {
    const routeAddition = `
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
`;
    // Insert just before app.listen
    serverJs = serverJs.replace('app.listen(PORT', routeAddition + '\napp.listen(PORT');
    fs.writeFileSync('server.js', serverJs);
}

// 2. Update admin-login.html logic
let adminLogin = fs.readFileSync('public/admin-login.html', 'utf8');
adminLogin = adminLogin.replace(/if \(identifier === 'admin' && accessCode === 'admin'\) {[\s\S]*?\} else {/, 
    "if (identifier === 'admin123' && accessCode === 'Admin@123') {\n                sessionStorage.setItem('tp-admin-auth', 'true');\n                window.location.href = '/admin';\n            } else {");
fs.writeFileSync('public/admin-login.html', adminLogin);

// 3. Create public/admin.html
const adminHtml = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TrendPulse | Admin Control</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: { fontFamily: { sans: ['Inter', 'sans-serif'] } }
            }
        }
        // Access Protection
        if (sessionStorage.getItem('tp-admin-auth') !== 'true') {
            window.location.href = '/';
        }
    </script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #0f172a; }
        .bg-glass {
            background: linear-gradient(135deg, rgba(30,30,40,0.8) 0%, rgba(20,20,30,0.9) 100%);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.05);
        }
        .bg-dot-grid::after {
            content: ""; position: absolute; inset: 0;
            background-image: radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 32px 32px; z-index: -1; opacity: 0.5; pointer-events: none;
        }
    </style>
</head>
<body class="text-slate-200 min-h-screen relative overflow-x-hidden bg-dot-grid">
    
    <!-- Top Nav Health Banner -->
    <header class="bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 p-4 sticky top-0 z-50 shadow-md">
        <div class="max-w-7xl mx-auto flex justify-between items-center px-4">
            <h1 class="font-bold text-xl text-white flex items-center gap-3">
                <div class="w-8 h-8 rounded bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg"><svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg></div>
                Admin Core
            </h1>
            <div id="healthBanner" class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-sm font-medium transition-colors">
                <div class="w-2 h-2 rounded-full bg-slate-500 animate-pulse" id="healthDot"></div>
                <span id="healthText" class="text-slate-400">Verifying System...</span>
            </div>
            <div class="flex gap-4">
                <button onclick="window.location.href='/dashboard.html'" class="text-sm font-medium text-slate-300 hover:text-white transition-colors">Back to Dashboard</button>
                <button id="adminLogoutBtn" class="text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg transition-colors border border-red-500/20">Admin Logout</button>
            </div>
        </div>
    </header>

    <main class="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        <div class="flex justify-between items-end">
            <div>
                <h2 class="text-3xl font-bold text-white tracking-tight">System Overview</h2>
                <p class="text-slate-400 mt-1">Live metrics and access control.</p>
            </div>
            <button id="refreshDataBtn" class="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all hover:scale-105 active:scale-95"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> <span>Refresh Data</span></button>
        </div>

        <!-- KPI Row -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="bg-glass p-6 rounded-2xl shadow-xl border-t-4 border-blue-500">
                <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Active Sessions</p>
                <h3 id="kpiSessions" class="text-4xl font-extrabold text-white">0</h3>
            </div>
            <div class="bg-glass p-6 rounded-2xl shadow-xl border-t-4 border-emerald-500">
                <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Users Online</p>
                <h3 id="kpiUsers" class="text-4xl font-extrabold text-white">0</h3>
            </div>
            <div class="bg-glass p-6 rounded-2xl shadow-xl border-t-4 border-amber-500">
                <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Alert Queue</p>
                <h3 id="kpiQueue" class="text-4xl font-extrabold text-white">0</h3>
            </div>
            <div class="bg-glass p-6 rounded-2xl shadow-xl border-t-4 border-red-500">
                <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Critical Incidents</p>
                <h3 id="kpiIncidents" class="text-4xl font-extrabold text-red-500 animate-pulse">0</h3>
            </div>
        </div>

        <!-- Panels Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Team Access Panel -->
            <div class="bg-glass rounded-2xl overflow-hidden shadow-xl border border-slate-700/50 flex flex-col h-96">
                <div class="p-5 border-b border-slate-800 bg-slate-900/60 font-bold text-white text-lg">Team Access Control</div>
                <div class="overflow-y-auto flex-1 p-0">
                    <table class="w-full text-left text-sm text-slate-400">
                        <thead class="bg-slate-800/50 text-xs uppercase text-slate-500 sticky top-0">
                            <tr><th class="px-6 py-3 font-semibold">Agent</th><th class="px-6 py-3 font-semibold">Role</th><th class="px-6 py-3 font-semibold">Status</th></tr>
                        </thead>
                        <tbody id="teamAccessBody" class="divide-y divide-slate-800">
                            <!-- Populated by JS -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Audit Log Panel -->
            <div class="bg-glass rounded-2xl overflow-hidden shadow-xl border border-slate-700/50 flex flex-col h-96">
                <div class="p-5 border-b border-slate-800 bg-slate-900/60 font-bold text-white text-lg flex justify-between items-center">
                    Security Audit Log <span class="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse border border-red-500/30">Live</span>
                </div>
                <div id="auditLogContainer" class="p-5 space-y-4 overflow-y-auto flex-1 font-mono text-xs">
                    <!-- Populated by JS -->
                </div>
            </div>
        </div>
    </main>

    <script src="/admin.js"></script>
</body>
</html>
`;
fs.writeFileSync('public/admin.html', adminHtml);

// 4. Create public/admin.js
const adminJs = `// Admin Logic

document.addEventListener('DOMContentLoaded', () => {
    checkHealth();
    refreshData();

    document.getElementById('refreshDataBtn').addEventListener('click', () => {
        const btn = document.getElementById('refreshDataBtn');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> <span>Syncing...</span>';
        setTimeout(() => {
            refreshData();
            btn.innerHTML = originalHtml;
        }, 800);
    });

    document.getElementById('adminLogoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('tp-admin-auth');
        window.location.href = '/';
    });
});

async function checkHealth() {
    const healthText = document.getElementById('healthText');
    const healthDot = document.getElementById('healthDot');
    const banner = document.getElementById('healthBanner');
    try {
        const res = await fetch('/api/health');
        const data = await res.json();
        if(data.status === 'ok') {
            healthText.textContent = 'System Healthy';
            healthText.className = 'text-emerald-400 font-bold';
            healthDot.className = 'w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]';
            banner.className = 'flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-sm font-medium transition-colors';
        }
    } catch(e) {
        healthText.textContent = 'API Offline';
        healthText.className = 'text-red-400 font-bold';
        healthDot.className = 'w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]';
        banner.className = 'flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-sm font-medium transition-colors';
    }
}

function refreshData() {
    // Randomize KPIs
    document.getElementById('kpiSessions').textContent = Math.floor(Math.random() * 50) + 120;
    document.getElementById('kpiUsers').textContent = Math.floor(Math.random() * 200) + 800;
    document.getElementById('kpiQueue').textContent = Math.floor(Math.random() * 15);
    document.getElementById('kpiIncidents').textContent = Math.floor(Math.random() * 3);

    populateTeamPanel();
    populateAuditLog();
}

function populateTeamPanel() {
    const rawData = [
        {name: 'Sarah Connor', role: 'Security Ops', status: 'Active'},
        {name: 'John Smith', role: 'Analyst', status: 'Offline'},
        {name: 'Marcus Wright', role: 'System Admin', status: 'Active'},
        {name: 'Kyle Reese', role: 'Moderator', status: 'Busy'},
        {name: 'Miles Dyson', role: 'AI Engineer', status: 'Active'},
    ];
    
    // Shuffle
    const agents = rawData.sort(() => 0.5 - Math.random());
    const tbody = document.getElementById('teamAccessBody');
    tbody.innerHTML = '';
    
    agents.forEach(a => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/40 transition-colors';
        const color = a.status === 'Active' ? 'text-emerald-400' : (a.status === 'Busy' ? 'text-amber-400' : 'text-slate-500');
        tr.innerHTML = \`
            <td class="px-6 py-4 flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">\${a.name.charAt(0)}</div>
                <span class="font-medium text-slate-200">\${a.name}</span>
            </td>
            <td class="px-6 py-4 text-slate-300">\${a.role}</td>
            <td class="px-6 py-4 flex items-center gap-2 \${color}"><span class="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_5px_currentColor]"></span> \${a.status}</td>
        \`;
        tbody.appendChild(tr);
    });
}

function populateAuditLog() {
    const logs = [
        'AUTH-001: Failed admin login from IP 192.168.1.45',
        'SYS-992: Database daily backup completed successfully',
        'USR-451: Session token revoked for John Smith',
        'API-204: High latency detected on /api/stats route (450ms)',
        'SEC-881: Firewall rule updated by System Admin',
        'DAT-110: Sentiment analysis model weights resynced',
        'SYS-005: Memory usage spiked to 85% on Instance A',
        'AUTH-104: New JWT issued for User ID #884A2'
    ];
    
    const container = document.getElementById('auditLogContainer');
    container.innerHTML = '';
    
    for(let i=0; i<6; i++) {
        const randomLog = logs[Math.floor(Math.random() * logs.length)];
        const time = new Date(Date.now() - Math.floor(Math.random() * 3600000)).toLocaleTimeString();
        
        const div = document.createElement('div');
        div.className = 'flex gap-3 border-l-2 border-slate-700 pl-3 py-1 hover:border-blue-500 transition-colors cursor-pointer group';
        div.innerHTML = \`
            <span class="text-blue-400 font-semibold w-20 shrink-0 group-hover:text-blue-300 transition-colors">[\${time}]</span>
            <span class="text-slate-300 group-hover:text-white transition-colors">\${randomLog}</span>
        \`;
        container.appendChild(div);
    }
}
`;
fs.writeFileSync('public/admin.js', adminJs);

console.log('Successfully Architected Dedicated Admin Console.');
