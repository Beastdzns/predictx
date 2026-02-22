const sharp = require('sharp');
const fs = require('fs');

const svgBuffer = fs.readFileSync('./public/icon.svg');

// Generate 192x192 icon
sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile('./public/icon-192x192.png')
  .then(() => console.log('✓ Generated icon-192x192.png'))
  .catch(err => console.error('Error generating 192x192:', err));

// Generate 512x512 icon
sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile('./public/icon-512x512.png')
  .then(() => console.log('✓ Generated icon-512x512.png'))
  .catch(err => console.error('Error generating 512x512:', err));
