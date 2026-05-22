export interface SelectionResult {
  rect: DOMRect;
  dpr: number;
}

export function startSelectionOverlay(): Promise<SelectionResult | undefined> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    const selection = document.createElement('div');
    overlay.className = 'zpc-selection-overlay';
    selection.className = 'zpc-selection-box';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483646;cursor:crosshair;background:rgba(0,0,0,.52)';
    selection.style.cssText =
      'position:fixed;border:2px solid #ff6f12;background:rgba(255,111,18,.12);box-shadow:0 0 0 9999px rgba(0,0,0,.42)';
    overlay.appendChild(selection);
    document.documentElement.appendChild(overlay);

    let startX = 0;
    let startY = 0;
    let dragging = false;
    let resolved = false;

    const cleanup = (result?: SelectionResult) => {
      if (resolved) return;
      resolved = true;
      overlay.remove();
      document.removeEventListener('keydown', onKeyDown, true);
      resolve(result);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cleanup();
    };

    overlay.addEventListener('pointerdown', (event) => {
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      selection.style.left = `${startX}px`;
      selection.style.top = `${startY}px`;
      selection.style.width = '0px';
      selection.style.height = '0px';
      overlay.setPointerCapture(event.pointerId);
    });

    overlay.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const left = Math.min(startX, event.clientX);
      const top = Math.min(startY, event.clientY);
      const width = Math.abs(event.clientX - startX);
      const height = Math.abs(event.clientY - startY);
      selection.style.left = `${left}px`;
      selection.style.top = `${top}px`;
      selection.style.width = `${width}px`;
      selection.style.height = `${height}px`;
    });

    overlay.addEventListener('pointerup', (event) => {
      if (!dragging) return;
      dragging = false;
      const rect = selection.getBoundingClientRect();
      overlay.releasePointerCapture(event.pointerId);
      if (rect.width < 12 || rect.height < 12) cleanup();
      else cleanup({ rect, dpr: window.devicePixelRatio || 1 });
    });

    document.addEventListener('keydown', onKeyDown, true);
  });
}

export async function cropVisibleScreenshot(screenshotDataUrl: string, rect: DOMRect): Promise<string> {
  const image = await loadImage(screenshotDataUrl);
  const scaleX = image.naturalWidth / window.innerWidth;
  const scaleY = image.naturalHeight / window.innerHeight;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rect.width * scaleX));
  canvas.height = Math.max(1, Math.round(rect.height * scaleY));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable.');
  context.drawImage(
    image,
    Math.round(rect.left * scaleX),
    Math.round(rect.top * scaleY),
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas.toDataURL('image/png');
}

export async function renderVisibleRegionFallback(rect: DOMRect): Promise<string> {
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable.');
  context.scale(dpr, dpr);
  drawPageBackground(context, rect);
  await drawIntersectingImages(context, rect);
  drawVisibleText(context, rect);
  return canvas.toDataURL('image/png');
}

function drawPageBackground(context: CanvasRenderingContext2D, rect: DOMRect): void {
  const bodyStyle = getComputedStyle(document.body);
  const htmlStyle = getComputedStyle(document.documentElement);
  context.fillStyle = bodyStyle.backgroundColor && bodyStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ? bodyStyle.backgroundColor : htmlStyle.backgroundColor || '#ffffff';
  context.fillRect(0, 0, rect.width, rect.height);
}

async function drawIntersectingImages(context: CanvasRenderingContext2D, rect: DOMRect): Promise<void> {
  for (const image of [...document.images]) {
    const imageRect = image.getBoundingClientRect();
    const overlap = intersectRects(rect, imageRect);
    if (!overlap || !image.complete || !image.naturalWidth || !image.naturalHeight) continue;

    try {
      context.drawImage(
        image,
        (overlap.left - imageRect.left) * (image.naturalWidth / imageRect.width),
        (overlap.top - imageRect.top) * (image.naturalHeight / imageRect.height),
        overlap.width * (image.naturalWidth / imageRect.width),
        overlap.height * (image.naturalHeight / imageRect.height),
        overlap.left - rect.left,
        overlap.top - rect.top,
        overlap.width,
        overlap.height
      );
    } catch {
      // Cross-origin images can taint the fallback canvas. The primary capture path handles those.
    }
  }
}

function drawVisibleText(context: CanvasRenderingContext2D, rect: DOMRect): void {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent?.trim();
    if (!text) continue;

    const range = document.createRange();
    range.selectNodeContents(node);
    const textRect = range.getBoundingClientRect();
    range.detach();
    if (!intersectRects(rect, textRect)) continue;

    const parent = node.parentElement;
    if (!parent) continue;
    const style = getComputedStyle(parent);
    context.fillStyle = style.color || '#111111';
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    context.textBaseline = 'top';
    context.fillText(text.slice(0, 140), textRect.left - rect.left, textRect.top - rect.top);
  }
}

function intersectRects(a: DOMRect, b: DOMRect): DOMRect | undefined {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  if (right <= left || bottom <= top) return undefined;
  return new DOMRect(left, top, right - left, bottom - top);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load screenshot.'));
    image.src = src;
  });
}
