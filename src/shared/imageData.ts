const ANALYSIS_MAX_IMAGE_SIDE = 3072;

export interface ImageDimensions {
  width: number;
  height: number;
}

export async function urlToDataUrl(url: string, signal?: AbortSignal): Promise<string> {
  throwIfAborted(signal);
  if (url.startsWith('data:')) return url;
  const response = await fetch(url, { signal });
  throwIfAborted(signal);
  if (!response.ok) throw new Error(`Image fetch failed: ${response.status} ${response.statusText}`);
  return blobToDataUrl(await response.blob());
}

export async function fileToDataUrl(file: File): Promise<string> {
  if (!isImageFile(file)) throw new Error('Only image files are supported.');
  return resizeDataUrl(await blobToDataUrl(file), ANALYSIS_MAX_IMAGE_SIDE);
}

export function isImageFile(file: File): boolean {
  return isSupportedOrConvertibleImageType(file.type) || /\.(avif|bmp|gif|jpe?g|png|webp)$/i.test(file.name);
}

export async function resizeDataUrl(input: string, maxSide = ANALYSIS_MAX_IMAGE_SIDE, quality = 0.92, signal?: AbortSignal): Promise<string> {
  throwIfAborted(signal);
  const { mime } = dataUrlToMimeAndBase64(input);
  const unsupportedMime = !isApiSupportedImageMime(mime);
  if (typeof createImageBitmap === 'undefined') {
    if (unsupportedMime) throw new Error('This image format cannot be converted by Chrome. Use JPG, PNG, GIF, or WebP.');
    return input;
  }

  const blob = await dataUrlToBlob(input);
  throwIfAborted(signal);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    throw new Error('图片无法被 Chrome 解码。请换成 JPG、PNG、GIF 或 WebP 后再上传。');
  }
  throwIfAborted(signal);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (!unsupportedMime && scale === 1) {
    bitmap.close?.();
    return input;
  }

  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const outputMime = chooseAnalysisOutputMime(mime);
  try {
    const output = await drawBitmapToDataUrl(bitmap, width, height, outputMime, quality);
    return output;
  } finally {
    bitmap.close?.();
  }
}

export async function createThumbnailDataUrl(input: string, maxSide = 220, quality = 0.72, signal?: AbortSignal): Promise<string> {
  throwIfAborted(signal);
  if (typeof createImageBitmap === 'undefined') return input;

  const blob = await dataUrlToBlob(input);
  throwIfAborted(signal);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    throw new Error('图片无法被 Chrome 解码。请换成 JPG、PNG、GIF 或 WebP 后再上传。');
  }

  throwIfAborted(signal);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  try {
    return await drawBitmapToDataUrl(bitmap, width, height, 'image/webp', quality);
  } finally {
    bitmap.close?.();
  }
}

export async function getDataUrlImageDimensions(input: string, signal?: AbortSignal): Promise<ImageDimensions | undefined> {
  throwIfAborted(signal);
  if (typeof createImageBitmap === 'undefined') return undefined;

  const blob = await dataUrlToBlob(input);
  throwIfAborted(signal);
  const bitmap = await createImageBitmap(blob);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close?.();
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Analysis canceled.', 'AbortError');
}

export function dataUrlToMimeAndBase64(dataUrl: string): { mime: string; base64: string } {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.*)$/s);
  if (!match) throw new Error('Invalid image data URL.');
  return { mime: match[1], base64: match[2] };
}

export function isApiSupportedImageMime(mime: string): boolean {
  return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mime.toLowerCase());
}

function isSupportedOrConvertibleImageType(mime: string): boolean {
  return [...['image/avif', 'image/bmp'], 'image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mime.toLowerCase());
}

function chooseAnalysisOutputMime(mime: string): string {
  const normalized = mime.toLowerCase();
  if (normalized === 'image/jpeg' || normalized === 'image/webp') return normalized;
  return 'image/png';
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

async function drawBitmapToDataUrl(bitmap: ImageBitmap, width: number, height: number, type: string, quality?: number): Promise<string> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable.');
    context.drawImage(bitmap, 0, 0, width, height);
    return blobToDataUrl(await canvas.convertToBlob({ type, quality }));
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable.');
    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL(type, quality);
  }

  throw new Error('This image format cannot be converted by Chrome. Use JPG, PNG, GIF, or WebP.');
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`;
}
