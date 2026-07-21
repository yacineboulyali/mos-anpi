import sharp from 'sharp';

const markSvg = 'scripts/ofppt-mark.svg';

const targets = [
  { file: 'public/favicon.png', size: 48, padding: 0.06 },
  { file: 'public/apple-touch-icon.png', size: 180, padding: 0.06 },
  { file: 'public/icon-192.png', size: 192, padding: 0.06 },
  { file: 'public/icon-512.png', size: 512, padding: 0.06 },
];

for (const { file, size, padding } of targets) {
  const inner = Math.round(size * (1 - padding * 2));
  const markBuf = await sharp(markSvg).resize(inner, inner).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 3, background: '#ffffff' },
  })
    .composite([{ input: markBuf, gravity: 'center' }])
    .png()
    .toFile(file);
  console.log('wrote', file);
}

// Maskable: safe zone is inner 80% of the canvas per the maskable-icon spec.
{
  const size = 512;
  const inner = Math.round(size * 0.6);
  const markBuf = await sharp(markSvg).resize(inner, inner).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: '#ffffff' },
  })
    .composite([{ input: markBuf, gravity: 'center' }])
    .png()
    .toFile('public/icon-maskable-512.png');
  console.log('wrote public/icon-maskable-512.png');
}
