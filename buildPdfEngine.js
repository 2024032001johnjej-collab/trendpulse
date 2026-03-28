const fs = require('fs');

let dbHtml = fs.readFileSync('public/dashboard.html', 'utf8');
if(!dbHtml.includes('jspdf.umd.min.js')) {
    dbHtml = dbHtml.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/wordcloud2.js/1.2.2/wordcloud2.min.js"></script>',
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/wordcloud2.js/1.2.2/wordcloud2.min.js"></script>\n    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>\n    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>');
}

dbHtml = dbHtml.replace("onclick=\"alert('Preparing highly comprehensive PDF report...')\"", "onclick=\"window.generatePDFReport(this)\"");
fs.writeFileSync('public/dashboard.html', dbHtml);

console.log('PDF engine configured! Report generation uses inline dashboard.js function.');
