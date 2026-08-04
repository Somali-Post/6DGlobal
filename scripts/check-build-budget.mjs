import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { promisify } from "node:util";

const gzip = promisify(zlib.gzip);
const root = process.cwd();
const distDir = path.join(root, "dist");

const limits = {
  initialJsGzipKb: 260,
  cssGzipKb: 90,
  imageKb: 650,
};

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(full));
    } else {
      files.push(full);
    }
  }

  return files;
}

function kb(bytes) {
  return bytes / 1024;
}

try {
  const files = await walk(distDir);
  let failed = false;

  for (const file of files) {
    const relative = path.relative(distDir, file);
    const raw = await fs.readFile(file);
    const sizeKb = kb(raw.length);

    if (/\.(png|jpe?g|webp|avif)$/i.test(file) && sizeKb > limits.imageKb) {
      console.error(`Image budget exceeded: ${relative} ${sizeKb.toFixed(1)}KB`);
      failed = true;
    }

    if (/\.css$/i.test(file)) {
      const gz = await gzip(raw);
      const gzKb = kb(gz.length);
      if (gzKb > limits.cssGzipKb) {
        console.error(`CSS gzip budget exceeded: ${relative} ${gzKb.toFixed(1)}KB`);
        failed = true;
      }
    }

    if (/\.js$/i.test(file)) {
      const gz = await gzip(raw);
      const gzKb = kb(gz.length);

      if (!relative.includes("vendor-three") && gzKb > limits.initialJsGzipKb) {
        console.warn(`Large JS chunk: ${relative} ${gzKb.toFixed(1)}KB gzip`);
      }
    }
  }

  if (failed) {
    process.exit(1);
  }

  console.log("Build budget check completed.");
} catch (error) {
  console.error("Build budget check failed:", error);
  process.exit(1);
}
