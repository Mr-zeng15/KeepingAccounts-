const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const mascotPath = path.join(root, 'assets', 'mascot', 'mascot-avatar.png');
const assetsDir = path.join(root, 'assets');
const resDir = path.join(root, 'android', 'app', 'src', 'main', 'res');

const androidSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const palette = {
  cream: '#FFF2B8',
  yellow: '#FFD84D',
  gold: '#F9B83B',
  amber: '#F29F24',
  brown: '#8A5318',
};

async function cleanMascotSource() {
  const source = await sharp(mascotPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = source;

  for (let index = 0; index < data.length; index += info.channels) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = data[index + 3];
    const isGreenKey = green > 150 && red < 90 && blue < 90;
    const isGreenFringe = alpha < 245 && green > red + 45 && green > blue + 45;

    if (isGreenKey || isGreenFringe) {
      data[index + 3] = 0;
      continue;
    }

    if (green > red + 35 && green > blue + 35) {
      data[index + 1] = Math.max(red, blue);
    }
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png()
    .toBuffer();
}

async function makeMascot(size) {
  const cleanMascot = await cleanMascotSource();

  return sharp(cleanMascot)
    .resize(Math.round(size * 0.74), Math.round(size * 0.74), {
      fit: 'contain',
      withoutEnlargement: false,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

function svgMonochrome(size) {
  return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.39}" fill="#000"/>
      <circle cx="${size / 2}" cy="${size * 0.47}" r="${size * 0.2}" fill="#fff"/>
      <circle cx="${size * 0.36}" cy="${size * 0.33}" r="${size * 0.09}" fill="#000"/>
      <circle cx="${size * 0.64}" cy="${size * 0.33}" r="${size * 0.09}" fill="#000"/>
      <path d="M ${size * 0.28} ${size * 0.2} L ${size * 0.36} ${size * 0.02} L ${size * 0.43} ${size * 0.22} Z" fill="#000"/>
      <path d="M ${size * 0.72} ${size * 0.2} L ${size * 0.64} ${size * 0.02} L ${size * 0.57} ${size * 0.22} Z" fill="#000"/>
      <circle cx="${size * 0.5}" cy="${size * 0.52}" r="${size * 0.035}" fill="#000"/>
      <path d="M ${size * 0.42} ${size * 0.6} Q ${size * 0.5} ${size * 0.68} ${size * 0.58} ${size * 0.6}" fill="none" stroke="#000" stroke-width="${size * 0.035}" stroke-linecap="round"/>
      <circle cx="${size * 0.7}" cy="${size * 0.72}" r="${size * 0.13}" fill="#000"/>
      <path d="M ${size * 0.64} ${size * 0.72} H ${size * 0.76} M ${size * 0.7} ${size * 0.66} V ${size * 0.78}" stroke="#fff" stroke-width="${size * 0.025}" stroke-linecap="round"/>
    </svg>
  `);
}

function svgBackground(size, options = {}) {
  const { transparent = false, monochrome = false } = options;
  const bg = transparent ? 'none' : palette.cream;
  const main = monochrome ? '#000' : palette.yellow;
  const shadow = monochrome ? '#000' : palette.gold;
  const stroke = monochrome ? '#000' : palette.brown;
  const coin = monochrome ? '#000' : palette.amber;
  const circle = size * 0.43;

  return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${bg}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${circle}" fill="${main}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${circle}" fill="none" stroke="${stroke}" stroke-width="${size * 0.028}" opacity="${monochrome ? 1 : 0.16}"/>
      <circle cx="${size * 0.7}" cy="${size * 0.7}" r="${size * 0.13}" fill="${coin}" opacity="${monochrome ? 1 : 0.96}"/>
      <path d="M ${size * 0.64} ${size * 0.7} H ${size * 0.76} M ${size * 0.7} ${size * 0.64} V ${size * 0.76}" stroke="${stroke}" stroke-width="${size * 0.025}" stroke-linecap="round" opacity="${monochrome ? 1 : 0.72}"/>
      <ellipse cx="${size / 2}" cy="${size * 0.78}" rx="${size * 0.26}" ry="${size * 0.055}" fill="${shadow}" opacity="${monochrome ? 0.18 : 0.28}"/>
    </svg>
  `);
}

async function makeComposedIcon(size, options = {}) {
  const mascot = await makeMascot(size);
  const mascotMeta = await sharp(mascot).metadata();
  const top = Math.round(size * 0.13);
  const left = Math.round((size - (mascotMeta.width || 0)) / 2);

  return sharp(svgBackground(size, options))
    .composite([{ input: mascot, left, top }])
    .png()
    .toBuffer();
}

async function makeForeground(size) {
  const mascot = await makeMascot(size);
  const mascotMeta = await sharp(mascot).metadata();
  const coinSvg = Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size * 0.7}" cy="${size * 0.72}" r="${size * 0.12}" fill="${palette.amber}"/>
      <path d="M ${size * 0.645} ${size * 0.72} H ${size * 0.755} M ${size * 0.7} ${size * 0.665} V ${size * 0.775}" stroke="${palette.brown}" stroke-width="${size * 0.023}" stroke-linecap="round" opacity="0.72"/>
    </svg>
  `);

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: mascot,
        left: Math.round((size - (mascotMeta.width || 0)) / 2),
        top: Math.round(size * 0.12),
      },
      { input: coinSvg, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

async function writePng(filePath, buffer, size) {
  await sharp(buffer).resize(size, size, { fit: 'contain' }).png().toFile(filePath);
}

async function main() {
  const icon1024 = await makeComposedIcon(1024);
  const splash = await makeComposedIcon(1024, { transparent: true });
  const foreground = await makeForeground(512);
  const background = svgBackground(512);
  const monochrome = svgMonochrome(432);

  await writePng(path.join(assetsDir, 'icon.png'), icon1024, 1024);
  await writePng(path.join(assetsDir, 'splash-icon.png'), splash, 1024);
  await writePng(path.join(assetsDir, 'android-icon-foreground.png'), foreground, 512);
  await writePng(path.join(assetsDir, 'android-icon-background.png'), background, 512);
  await writePng(path.join(assetsDir, 'android-icon-monochrome.png'), monochrome, 432);
  await writePng(path.join(assetsDir, 'favicon.png'), icon1024, 48);

  for (const [folder, size] of Object.entries(androidSizes)) {
    const dir = path.join(resDir, folder);
    const icon = await makeComposedIcon(size);
    const iconPath = path.join(dir, 'ic_launcher.png');
    const roundPath = path.join(dir, 'ic_launcher_round.png');
    fs.writeFileSync(iconPath, icon);
    fs.writeFileSync(roundPath, icon);

    const bgPath = path.join(dir, 'ic_launcher_background.png');
    const fgPath = path.join(dir, 'ic_launcher_foreground.png');
    fs.writeFileSync(bgPath, await writeBuffer(svgBackground(size)));
    fs.writeFileSync(fgPath, await makeForeground(size));
    console.log(`Generated ${folder} (${size}x${size})`);
  }

  console.log('Generated app icons from mascot artwork.');
}

async function writeBuffer(input) {
  return sharp(input).png().toBuffer();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
