const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create a simple SVG icon (music note)
const svgIcon = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#800080"/>
  <circle cx="256" cy="200" r="80" fill="#ffffff"/>
  <path d="M256 280 Q236 300 256 320 Q276 300 256 280" fill="#ffffff"/>
  <text x="256" y="400" font-family="Arial" font-size="48" fill="#ffffff" text-anchor="middle">RB</text>
</svg>
`;

// Sizes to generate
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Ensure icons directory exists
const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icons
async function generateIcons() {
  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}.png`);
    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated ${outputPath}`);
  }

  // Generate shortcut icons
  const shortcutSizes = [96];
  for (const size of shortcutSizes) {
    const playShortcut = path.join(iconsDir, `play-shortcut.png`);
    const playlistShortcut = path.join(iconsDir, `playlist-shortcut.png`);

    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(playShortcut);

    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(playlistShortcut);

    console.log(`Generated shortcut icons`);
  }
}

generateIcons().catch(console.error);