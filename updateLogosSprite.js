const fs = require('fs');

const spriteHtml = `
<div class="w-4/5 h-4/5 dark:hidden bg-no-repeat bg-right relative z-10 drop-shadow-md mix-blend-multiply" style="background-image: url('/light.jpeg'); background-size: 200% 100%;"></div>
<div class="w-4/5 h-4/5 hidden dark:block bg-no-repeat bg-left relative z-10 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] mix-blend-screen" style="background-image: url('/light.jpeg'); background-size: 200% 100%;"></div>
`;

const htmlFiles = fs.readdirSync('public').filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
    let content = fs.readFileSync('public/' + file, 'utf8');
    
    // Replace the two previous img tags with the new sprite divs
    content = content.replace(/<img src="\/logo-light\.png"[\s\S]*?<img src="\/logo-dark\.png"[^>]*>/g, spriteHtml);

    fs.writeFileSync('public/' + file, content);
});
console.log('Sprite logos updated natively into HTML files.');
