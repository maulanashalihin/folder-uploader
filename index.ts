import fs from "fs";
import path from "path";
import { uploadBuffer } from "./services/S3";

require("dotenv").config();

const uploadDir = process.env.UPLOAD_DIR;
const CONCURRENCY = Number(process.env.CONCURRENCY || 5);

if (!uploadDir) {
  console.error("UPLOAD_DIR tidak diset di .env");
  process.exit(1);
}

async function collectFilesRecursively(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await collectFilesRecursively(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
    // Skip other types (symlinks, sockets, etc.)
  }

  return files;
}

function toS3Key(absFilePath: string): string {
  const rel = path.relative(uploadDir!, absFilePath);
  // Normalize to POSIX-style forward slashes for S3 keys
  return rel.split(path.sep).join("/");
}

function guessContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".mp4":
      return "video/mp4";
    case ".mov":
      return "video/quicktime";
    case ".pdf":
      return "application/pdf";
    case ".txt":
      return "text/plain";
    case ".html":
      return "text/html";
    case ".css":
      return "text/css";
    case ".js":
      return "application/javascript";
    case ".mjs":
      return "application/javascript";
    case ".json":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

async function uploadAll(files: string[]): Promise<void> {
  let index = 0;
  let success = 0;
  let failed = 0;
  const total = files.length;
  const start = Date.now();

  const worker = async () => {
    while (true) {
      const i = index++;
      if (i >= total) break;
      const filePath = files[i];
      const key = toS3Key(filePath);
      try {
        const body = await fs.promises.readFile(filePath);
        const contentType = guessContentType(filePath);
        await uploadBuffer(key, body, contentType);
        success++;
        console.log(`[${success}/${total}] Uploaded: ${key}`);
      } catch (err: any) {
        failed++;
        console.error(`Failed to upload ${key}: ${err?.message || err}`);
      }
    }
  };

  const workers = Array.from({ length: Math.max(1, CONCURRENCY) }, () => worker());
  await Promise.all(workers);

  const durationMs = Date.now() - start;
  console.log(`Selesai. Berhasil: ${success}, Gagal: ${failed}, Durasi: ${durationMs}ms`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

(async function main() {
  try {
    const stat = await fs.promises.stat(uploadDir!);
    if (!stat.isDirectory()) {
      console.error("UPLOAD_DIR bukan sebuah folder");
      process.exit(1);
    }

    console.log(`Scan folder: ${uploadDir}`);
    const files = await collectFilesRecursively(uploadDir!);
    console.log(`Total file ditemukan: ${files.length}`);

    await uploadAll(files);
  } catch (err: any) {
    console.error(`Kesalahan: ${err?.message || err}`);
    process.exit(1);
  }
})();