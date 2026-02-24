const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgRaw = fs.readFileSync(path.join(__dirname, '..', 'assets', 'maps', 'japan-47.svg'), 'utf8');

// Change fill to light gray (#D0D0D0) and stroke to dark gray (#444) for a monochrome look
const svgMono = svgRaw
  .replace(/fill="#fff"/g, 'fill="#D0D0D0"')
  .replace(/stroke="#000"/g, 'stroke="#555"')
  .replace(/stroke-width="1"/g, 'stroke-width="1.5"');

// Wrap in a larger SVG with white background, centering the map
const width = 1284;
const height = 2778;
const mapScale = 1.8;
const mapX = (width - 1000 * mapScale) / 2;
const mapY = (height - 1000 * mapScale) / 2 - 100;

const wrappedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#FFFFFF"/>
  <g transform="translate(${mapX}, ${mapY}) scale(${mapScale})">
    ${svgMono.replace(/<\/?svg[^>]*>/g, '')}
  </g>
</svg>`;

const outPath = path.join(__dirname, '..', 'assets', 'images', 'splash-icon.png');

sharp(Buffer.from(wrappedSvg))
  .resize(width, height)
  .png()
  .toFile(outPath)
  .then(() => {
    console.log(`Splash image generated: ${outPath} (${width}x${height})`);
  })
  .catch((err) => {
    console.error('Error generating splash image:', err);
    process.exit(1);
  });
