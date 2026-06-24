const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'assets', 'icon.svg');
const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

(async () => {
  const svgData = fs.readFileSync(svgPath);

  for (const [folder, size] of Object.entries(sizes)) {
    const dir = path.join(resDir, folder);
    fs.mkdirSync(dir, { recursive: true });

    const pngData = await sharp(svgData).resize(size, size).png().toBuffer();

    const files = [
      'ic_launcher.png',
      'ic_launcher_round.png',
      'ic_launcher_background.png',
      'ic_launcher_foreground.png',
    ];
    for (const f of files) {
      fs.writeFileSync(path.join(dir, f), pngData);
    }
    console.log(`${folder}: ${size}x${size} (${files.length} files)`);
  }
  console.log('Done!');
})();
