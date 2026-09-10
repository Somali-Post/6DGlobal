import sharp from 'sharp';

// Reuse the repository's equirectangular source imagery without changing its
// projection: labels and both surface layers share the same longitude/latitude UVs.
for (const [kind, source] of [
  ['day', 'earth-blue-marble-december-5400.jpg'],
  ['night', 'earth-night-lights-2012-3600.jpg'],
]) {
  await sharp(`source-assets/images/${source}`)
    .resize({ width: 3072 })
    .webp({ quality: 88, effort: 6 })
    .toFile(`public/images/globe/earth-${kind}-3072.webp`);
}
