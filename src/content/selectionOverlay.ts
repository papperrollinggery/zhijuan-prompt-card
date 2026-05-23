export interface SelectionResult {
  rect: DOMRect;
  dpr: number;
}

export interface PickedImageResult {
  srcUrl: string;
  title?: string;
}

export interface ImagePickerCopy {
  prompt: string;
  selected: string;
}

export interface SelectionOverlayCopy {
  prompt: string;
  selected: string;
}

const defaultImagePickerCopy: ImagePickerCopy = {
  prompt: 'Click any image to analyze. Press Esc to cancel.',
  selected: 'Image selected'
};

const defaultSelectionOverlayCopy: SelectionOverlayCopy = {
  prompt: 'Drag to capture a region. Press Esc to cancel.',
  selected: 'Region selected'
};

export function startSelectionOverlay(copy: SelectionOverlayCopy = defaultSelectionOverlayCopy): Promise<SelectionResult | undefined> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    const selection = document.createElement('div');
    const label = document.createElement('div');
    overlay.className = 'zpc-selection-overlay';
    selection.className = 'zpc-selection-box';
    label.className = 'zpc-selection-label';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483602;cursor:crosshair;background:rgba(0,0,0,.22);backdrop-filter:saturate(135%) blur(.8px)';
    selection.style.cssText =
      'position:fixed;border:1.5px solid rgba(111,241,255,.94);border-radius:16px;background:rgba(111,241,255,.08);box-shadow:0 0 0 9999px rgba(0,0,0,.32),0 18px 72px rgba(46,220,255,.24),inset 0 1px 0 rgba(255,255,255,.18);opacity:0;transition:opacity 120ms cubic-bezier(.16,1,.3,1)';
    label.style.cssText =
      'position:fixed;left:50%;top:18px;z-index:2147483603;transform:translateX(-50%);pointer-events:none;padding:9px 13px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(7,10,18,.68);color:#f7fbff;font:750 12px/1.2 ui-sans-serif,system-ui,sans-serif;box-shadow:0 18px 58px rgba(0,0,0,.34),0 0 20px rgba(111,241,255,.1);backdrop-filter:blur(18px) saturate(160%)';
    label.textContent = copy.prompt;
    overlay.append(selection, label);
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
      selection.style.opacity = '1';
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
      label.textContent = width > 12 && height > 12 ? `${copy.selected} · ${Math.round(width)} × ${Math.round(height)}` : copy.prompt;
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

export function startImagePicker(copy: ImagePickerCopy = defaultImagePickerCopy): Promise<PickedImageResult | undefined> {
  return new Promise((resolve) => {
    const veil = document.createElement('div');
    const frame = document.createElement('div');
    const label = document.createElement('div');
    const stamp = document.createElement('div');
    veil.className = 'zpc-image-pick-overlay';
    frame.className = 'zpc-image-pick-frame';
    label.className = 'zpc-image-pick-label';
    stamp.className = 'zpc-image-pick-stamp';
    veil.style.cssText =
      'position:fixed;inset:0;z-index:2147483602;pointer-events:none;background:rgba(4,6,12,.10);backdrop-filter:saturate(140%) blur(.8px)';
    frame.style.cssText =
      'position:fixed;z-index:2147483603;pointer-events:none;border:1.5px solid rgba(111,241,255,.95);border-radius:16px;box-shadow:0 0 0 9999px rgba(0,0,0,.34),0 18px 70px rgba(46,220,255,.24),inset 0 1px 0 rgba(255,255,255,.18);opacity:0;transition:transform 220ms cubic-bezier(.16,1,.3,1),opacity 160ms cubic-bezier(.16,1,.3,1)';
    label.style.cssText =
      'position:fixed;left:50%;top:18px;z-index:2147483604;transform:translateX(-50%);pointer-events:none;padding:9px 13px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(8,10,18,.68);color:#f7fbff;font:700 12px/1.2 ui-sans-serif,system-ui,sans-serif;box-shadow:0 18px 58px rgba(0,0,0,.34),0 0 20px rgba(111,241,255,.1);backdrop-filter:blur(18px) saturate(160%)';
    stamp.style.cssText =
      'position:fixed;z-index:2147483604;pointer-events:none;opacity:0;transform:translate3d(-50%,-50%,0) scale(.86);padding:9px 13px;border:1px solid rgba(255,255,255,.24);border-radius:999px;background:linear-gradient(135deg,rgba(111,241,255,.88),rgba(245,161,74,.88));color:#061016;font:850 12px/1 ui-sans-serif,system-ui,sans-serif;box-shadow:0 18px 68px rgba(111,241,255,.3),0 0 0 8px rgba(255,255,255,.07);backdrop-filter:blur(18px) saturate(160%)';
    label.textContent = copy.prompt;
    stamp.textContent = copy.selected;
    document.documentElement.append(veil, frame, label, stamp);

    let resolved = false;
    let locked = false;
    const clickArmedAt = performance.now() + 180;

    const cleanup = (result?: PickedImageResult) => {
      if (resolved) return;
      resolved = true;
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      veil.remove();
      frame.remove();
      label.remove();
      stamp.remove();
      resolve(result);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (locked) return;
      const image = findImageAtPoint(event.clientX, event.clientY);
      if (!image) {
        frame.style.opacity = '0';
        return;
      }
      positionFrame(frame, image);
    };

    const onClick = (event: MouseEvent) => {
      if (locked) return;
      if (performance.now() < clickArmedAt) return;
      const image = findImageAtPoint(event.clientX, event.clientY);
      if (!image) return;
      event.preventDefault();
      event.stopPropagation();
      const srcUrl = image.currentSrc || image.src;
      if (!srcUrl) {
        cleanup();
        return;
      }
      locked = true;
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('click', onClick, true);
      label.textContent = copy.selected;
      positionStamp(stamp, image);
      playSelectedImageAnimation(frame, image);
      window.setTimeout(() => {
        cleanup({ srcUrl, title: image.alt || image.title || document.title || 'Selected image' });
      }, 560);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cleanup();
    };

    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
  });
}

function positionFrame(frame: HTMLDivElement, image: HTMLImageElement): void {
  const rect = image.getBoundingClientRect();
  frame.style.opacity = '1';
  frame.style.transform = `translate3d(${Math.round(rect.left)}px, ${Math.round(rect.top)}px, 0)`;
  frame.style.width = `${Math.round(rect.width)}px`;
  frame.style.height = `${Math.round(rect.height)}px`;
}

function positionStamp(stamp: HTMLDivElement, image: HTMLImageElement): void {
  const rect = image.getBoundingClientRect();
  stamp.style.left = `${Math.round(rect.left + rect.width / 2)}px`;
  stamp.style.top = `${Math.round(rect.top + rect.height / 2)}px`;
  stamp.animate(
    [
      { opacity: 0, transform: 'translate3d(-50%,-50%,0) scale(.82)' },
      { opacity: 1, transform: 'translate3d(-50%,-50%,0) scale(1.08)' },
      { opacity: 1, transform: 'translate3d(-50%,-50%,0) scale(1)' }
    ],
    { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }
  );
}

function playSelectedImageAnimation(frame: HTMLDivElement, image: HTMLImageElement): void {
  positionFrame(frame, image);
  frame.style.borderColor = 'rgba(255,138,42,.98)';
  frame.style.background = 'rgba(111,241,255,.1)';
  frame.style.borderWidth = '3px';
  frame.animate(
    [
      {
        transform: frame.style.transform,
        boxShadow: '0 0 0 0 rgba(111,241,255,.34),0 0 0 9999px rgba(0,0,0,.38),0 18px 70px rgba(46,220,255,.28)'
      },
      {
        transform: `${frame.style.transform} scale(1.035)`,
        boxShadow: '0 0 0 10px rgba(111,241,255,.22),0 0 0 9999px rgba(0,0,0,.44),0 0 88px rgba(255,138,42,.5)'
      },
      {
        transform: frame.style.transform,
        boxShadow: '0 0 0 4px rgba(255,138,42,.24),0 0 0 9999px rgba(0,0,0,.38),0 18px 70px rgba(46,220,255,.28)'
      }
    ],
    { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' }
  );
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

function findImageAtPoint(clientX: number, clientY: number): HTMLImageElement | undefined {
  const elements = document.elementsFromPoint(clientX, clientY);
  for (const element of elements) {
    if (element instanceof HTMLImageElement && (element.currentSrc || element.src)) return element;
    const nested = element.querySelector?.('img');
    if (nested instanceof HTMLImageElement && (nested.currentSrc || nested.src)) return nested;
  }
  return undefined;
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
