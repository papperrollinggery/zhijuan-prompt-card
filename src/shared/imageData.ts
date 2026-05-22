export async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image fetch failed: ${response.status} ${response.statusText}`);
  return blobToDataUrl(await response.blob());
}

export async function resizeDataUrl(input: string, maxSide = 2200, quality = 0.9): Promise<string> {
  if (typeof createImageBitmap === 'undefined' || typeof OffscreenCanvas === 'undefined') return input;

  const blob = await dataUrlToBlob(input);
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale >= 1) {
    bitmap.close?.();
    return input;
  }

  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) return input;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const output = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  return blobToDataUrl(output);
}

export function dataUrlToMimeAndBase64(dataUrl: string): { mime: string; base64: string } {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.*)$/s);
  if (!match) throw new Error('Invalid image data URL.');
  return { mime: match[1], base64: match[2] };
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
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
