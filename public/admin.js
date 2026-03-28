// Admin Logic

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
        tr.innerHTML = `
            <td class="px-6 py-4 flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">${a.name.charAt(0)}</div>
                <span class="font-medium text-slate-200">${a.name}</span>
            </td>
            <td class="px-6 py-4 text-slate-300">${a.role}</td>
            <td class="px-6 py-4 flex items-center gap-2 ${color}"><span class="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_5px_currentColor]"></span> ${a.status}</td>
        `;
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
        div.innerHTML = `
            <span class="text-blue-400 font-semibold w-20 shrink-0 group-hover:text-blue-300 transition-colors">[${time}]</span>
            <span class="text-slate-300 group-hover:text-white transition-colors">${randomLog}</span>
        `;
        container.appendChild(div);
    }
}
