#!/usr/bin/env node
/**
 * Copies MediaPipe WASM runtime from node_modules and downloads the face
 * landmarker model into public/mediapipe/ so neither is fetched from external
 * CDNs at runtime.
 *
 * Runs automatically on `pnpm install` (postinstall) and before builds.
 */

import { copyFile, mkdir, readdir, access, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const WASM_SRC = join(ROOT, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const WASM_DEST = join(ROOT, "public", "mediapipe", "wasm");
const MODEL_DEST = join(ROOT, "public", "mediapipe", "models");
const MODEL_PATH = join(MODEL_DEST, "face_landmarker.task");
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyWasm() {
  await mkdir(WASM_DEST, { recursive: true });
  const files = await readdir(WASM_SRC);
  await Promise.all(files.map((f) => copyFile(join(WASM_SRC, f), join(WASM_DEST, f))));
  console.log(`[setup-mediapipe] Copied ${files.length} WASM files → public/mediapipe/wasm/`);
}

async function downloadModel() {
  if (await exists(MODEL_PATH)) {
    console.log("[setup-mediapipe] face_landmarker.task already present — skipping download");
    return;
  }
  await mkdir(MODEL_DEST, { recursive: true });
  console.log("[setup-mediapipe] Downloading face_landmarker.task from Google Storage…");
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  await writeFile(MODEL_PATH, Buffer.from(buf));
  const mb = (buf.byteLength / 1024 / 1024).toFixed(1);
  console.log(`[setup-mediapipe] Downloaded face_landmarker.task (${mb} MB) → public/mediapipe/models/`);
}

try {
  await copyWasm();
  await downloadModel();
} catch (err) {
  console.error("[setup-mediapipe] Setup failed:", err.message);
  process.exit(1);
}
