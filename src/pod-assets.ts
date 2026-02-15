/**
 * POD Asset Loader for Fake Driver Simulator
 *
 * Loads doorstep photos and signature images from the SvelteKit static directory,
 * converts to raw base64 strings for POD submission via the API.
 *
 * Falls back gracefully if images are not found (sim continues without images).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SIGNATURE_NAMES = [
  'John Hancock',
  'Jane Smith',
  'Robert Johnson',
  'Maria Garcia',
  'David Chen',
  'Sarah Williams',
];

const PHOTO_FILES = [
  'doorstep-1.jpg',
  'doorstep-2.jpg',
  'doorstep-3.jpg',
  'doorstep-4.jpg',
  'doorstep-5.jpg',
  'doorstep-6.jpg',
];

const SIGNATURE_FILES = [
  'sig-john-hancock.png',
  'sig-jane-smith.png',
  'sig-robert-johnson.png',
  'sig-maria-garcia.png',
  'sig-david-chen.png',
  'sig-sarah-williams.png',
];

let photos: string[] | null = null;
let signatures: string[] | null = null;
let assetsAvailable = true;

function getAssetsDir(): string {
  const envPath = process.env.POD_ASSETS_PATH;
  if (envPath) return envPath;

  // Default: relative from fake-driver-sim/src/ to svelte app static/
  // At runtime with tsx, __dirname is fake-driver-sim/src/
  // At runtime from compiled JS, __dirname is fake-driver-sim/dist/
  // Either way, go up to fake-driver-sim/, then up to apps/, then into svelte/
  return path.resolve(__dirname, '..', '..', 'svelte', 'svelte-delivery-app', 'static', 'seed', 'pod');
}

function loadAssets(): void {
  if (photos !== null) return;

  const assetsDir = getAssetsDir();
  const photosDir = path.join(assetsDir, 'photos');
  const signaturesDir = path.join(assetsDir, 'signatures');

  if (!fs.existsSync(photosDir) || !fs.existsSync(signaturesDir)) {
    console.warn(`[PodAssets] WARNING: POD assets not found at ${assetsDir}`);
    console.warn('[PodAssets] Simulator will submit PODs without photo/signature data.');
    console.warn('[PodAssets] Set POD_ASSETS_PATH env var to override the assets directory.');
    photos = [];
    signatures = [];
    assetsAvailable = false;
    return;
  }

  try {
    photos = PHOTO_FILES.map((file) => {
      const buffer = fs.readFileSync(path.join(photosDir, file));
      return buffer.toString('base64');
    });

    signatures = SIGNATURE_FILES.map((file) => {
      const buffer = fs.readFileSync(path.join(signaturesDir, file));
      return buffer.toString('base64');
    });

    console.log(`[PodAssets] Loaded ${photos.length} photos and ${signatures.length} signatures from ${assetsDir}`);
  } catch (error) {
    console.warn(`[PodAssets] Failed to load assets: ${error}`);
    console.warn('[PodAssets] Simulator will submit PODs without photo/signature data.');
    photos = [];
    signatures = [];
    assetsAvailable = false;
  }
}

export function getPhoto(index: number): string | undefined {
  loadAssets();
  if (!photos || photos.length === 0) return undefined;
  return photos[index % photos.length];
}

export function getSignature(index: number): string | undefined {
  loadAssets();
  if (!signatures || signatures.length === 0) return undefined;
  return signatures[index % signatures.length];
}

export function getRecipientName(index: number): string {
  return SIGNATURE_NAMES[index % SIGNATURE_NAMES.length];
}

export function hasAssets(): boolean {
  loadAssets();
  return assetsAvailable;
}
