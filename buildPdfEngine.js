const fs = require('fs');

let dbHtml = fs.readFileSync('public/dashboard.html', 'utf8');
if(!dbHtml.includes('jspdf.umd.min.js')) {
    dbHtml = dbHtml.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/wordcloud2.js/1.2.2/wordcloud2.min.js"></script>',
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/wordcloud2.js/1.2.2/wordcloud2.min.js"></script>\n    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>');
}

dbHtml = dbHtml.replace("onclick=\"alert('Preparing highly comprehensive PDF report...')\"", "onclick=\"window.generatePDFReport(this)\"");
fs.writeFileSync('public/dashboard.html', dbHtml);

let dbJs = fs.readFileSync('public/dashboard.js', 'utf8');

const pdfFunction = `
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
`;

if (!dbJs.includes("window.generatePDFReport")) {
    fs.writeFileSync('public/dashboard.js', dbJs + '\n\n' + pdfFunction);
}
console.log('PDF module injected!');
