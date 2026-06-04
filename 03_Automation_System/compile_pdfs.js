import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

const jobs = [
    { html: '01_Design_Brand/OFFICIAL_MENU_CARD_V5.html', pdf: '01_Design_Brand/HOTEL_SKY5_MENU_v26_FINAL.pdf' },
    { html: '01_Design_Brand/OFFICIAL_MENU_CARD_V6_LUXURY.html', pdf: '01_Design_Brand/HOTEL_SKY5_PREMIUM_V6_FINAL.pdf' },
    { html: '01_Design_Brand/OFFICIAL_SERIALIZED_MENU_V20.html', pdf: '01_Design_Brand/HOTEL_SKY5_PREMIUM_SERIAL_MENU_v21_UPDATED.pdf' },
    { html: '04_Digital_Assets/menu.html', pdf: '04_Digital_Assets/menu.pdf' },
    { html: 'public/menu.html', pdf: 'public/menu.pdf' }
];

jobs.forEach(job => {
    const inputPath = path.resolve(job.html);
    const outputPath = path.resolve(job.pdf);
    
    // Ensure output directories exist
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    console.log(`Compiling: ${job.html} -> ${job.pdf}`);
    try {
        execSync(`"${chromePath}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${outputPath}" "file:///${inputPath.replace(/\\/g, '/')}"`);
        console.log(`Successfully compiled: ${job.pdf}`);
    } catch (err) {
        console.error(`Error compiling ${job.html}:`, err);
    }
});
console.log('PDF Compilation completed!');
