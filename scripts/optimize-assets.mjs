import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();

const ensureDir = async (dir) => {
  await fs.mkdir(path.join(root, dir), { recursive: true });
};

const exists = async (file) => {
  try {
    await fs.access(path.join(root, file));
    return true;
  } catch {
    return false;
  }
};

const imageJobs = [
  {
    input: "public/textures/earth-blue-marble-december-5400.jpg",
    outputDir: "public/images/globe",
    name: "earth-day",
    widths: [1024, 1536, 2048],
    quality: 78,
  },
  {
    input: "public/textures/earth-night-lights-2012-3600.jpg",
    outputDir: "public/images/globe",
    name: "earth-night",
    widths: [1024, 1536, 2048],
    quality: 76,
  },
  {
    input: "public/images/hero-globe-fallback.png",
    outputDir: "public/images/globe",
    name: "hero-globe-fallback",
    widths: [720, 1200, 1600],
    quality: 78,
  },
];

const logoJobs = [
  {
    input: "public/logo.png",
    output: "public/images/logo-compact.png",
    width: 256,
  },
  {
    input: "public/images/logo.png",
    output: "public/images/logo-compact.png",
    width: 256,
  },
];

await ensureDir("public/images/globe");

for (const job of imageJobs) {
  if (!(await exists(job.input))) {
    console.warn(`Skipping missing source: ${job.input}`);
    continue;
  }

  await ensureDir(job.outputDir);

  for (const width of job.widths) {
    const out = `${job.outputDir}/${job.name}-${width}.webp`;
    await sharp(path.join(root, job.input))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: job.quality, effort: 6 })
      .toFile(path.join(root, out));

    console.log(`Created ${out}`);
  }
}

for (const job of logoJobs) {
  if (!(await exists(job.input))) continue;

  await ensureDir(path.dirname(job.output));

  await sharp(path.join(root, job.input))
    .resize({ width: job.width, withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(root, job.output));

  console.log(`Created ${job.output}`);
  break;
}
