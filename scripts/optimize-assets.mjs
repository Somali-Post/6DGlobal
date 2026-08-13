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

async function optimizeTeamImage(input, output) {
  if (!(await exists(input))) {
    console.warn(`Skipping missing team source: ${input}`);
    return;
  }

  await ensureDir(path.dirname(output));

  await sharp(path.join(root, input))
    .resize({ width: 360, height: 360, fit: "cover", position: "center" })
    .webp({ quality: 80, effort: 6 })
    .toFile(path.join(root, output));

  console.log(`Created ${output}`);
}

async function optimizeLogo() {
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

  for (const job of logoJobs) {
    if (!(await exists(job.input))) continue;

    await ensureDir(path.dirname(job.output));

    await sharp(path.join(root, job.input))
      .resize({ width: job.width, withoutEnlargement: true })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(path.join(root, job.output));

    console.log(`Created ${job.output}`);
    return;
  }

  console.warn("No logo source found for compact logo generation.");
}

await optimizeTeamImage(
  "source-assets/team/GL.jpeg",
  "public/images/team/gl-360.webp",
);
await optimizeTeamImage(
  "source-assets/team/AG.jpeg",
  "public/images/team/ag-360.webp",
);
await optimizeTeamImage(
  "source-assets/team/SH.jpeg",
  "public/images/team/sh-360.webp",
);

await optimizeLogo();

console.log("Asset optimization complete.");
