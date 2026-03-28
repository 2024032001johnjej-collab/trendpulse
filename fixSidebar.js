const fs = require('fs');

let html = fs.readFileSync('public/dashboard.html', 'utf8');

const brokenPartStart = html.indexOf('<select id="hashtagFilter"');
const brokenPartEnd = html.indexOf('<!-- Top Nav (Mobile mostly) -->');

const replacement = `<select id="hashtagFilter" class="w-full bg-slate-800/80 border border-slate-700 text-sm rounded-lg px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-200 transition-all appearance-none cursor-pointer hover:border-slate-500 p-0 m-0">
                            <option value="all">🌐 All Global Hashtags</option>
                            <option value="#AI">🤖 #AI</option>
                            <option value="#Tech">💻 #Tech</option>
                            <option value="#Launch">🚀 #Launch</option>
                            <option value="#Hackathon">⚡ #Hackathon</option>
                        </select>
                        <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400 group-hover:text-blue-400 transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-auto p-6 border-t border-slate-800">
            <!-- Download Report Stretch Feature -->
            <button onclick="alert('Preparing highly comprehensive PDF report...')" class="w-full mb-6 flex items-center justify-center gap-2 text-sm bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg transition-all duration-300 shadow-lg hover:-translate-y-0.5 font-bold border border-blue-500 group">
                <svg class="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Export Report
            </button>

            <div class="flex items-center gap-3 mb-5 p-2 rounded-xl bg-slate-800/30 border border-slate-700/50">
                <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-sm font-bold text-white shadow-inner border-2 border-slate-800">AM</div>
                <div class="overflow-hidden">
                    <p id="userName" class="text-sm font-medium text-white truncate">Admin User</p>
                    <span id="userBadge" class="text-[10px] uppercase font-bold text-indigo-300">Operations</span>
                </div>
            </div>
            
            <button id="triggerSpikeBtn" class="w-full mb-3 text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg transition-colors border border-slate-700 shadow-sm flex justify-center items-center gap-2 group">
                <svg class="w-3.5 h-3.5 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                Simulate Crisis Spike
            </button>
            <button id="logoutBtn" class="w-full text-xs text-slate-500 hover:text-white py-2 transition-colors">Sign Out securely →</button>
        </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col h-screen overflow-y-auto relative" style="background: radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 40%, #000000 100%);">
        
        <!-- Ambient Background Glows -->
        <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div class="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        `;

html = html.substring(0, brokenPartStart) + replacement + html.substring(brokenPartEnd);

fs.writeFileSync('public/dashboard.html', html);
console.log('Restoration and Sidebar Refinements applied successfully.');
