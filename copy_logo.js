const fs = require('fs');
const src = String.raw`C:\Users\prade\.gemini\antigravity\brain\487ce7b9-2047-4189-a7db-776a5b97c011\logo_hero_final_1781337398429.png`;
const dest = String.raw`C:\Users\prade\Desktop\Smart Resume Shortlisting System\frontend\public\logo-hero.png`;
try {
  fs.copyFileSync(src, dest);
  console.log('SUCCESS: Logo copied to', dest);
} catch (err) {
  console.error('ERROR:', err.message);
}
