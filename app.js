/**
 * WebAR app: upload photo → extract main object → view in AR
 * Works on iPhone Safari. Uses MediaPipe for segmentation, Three.js for GLB, model-viewer for AR.
 */

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => el.querySelectorAll(sel);

const pageHome = $('#page-home');
const pageProcess = $('#page-process');
const photoInput = $('#photo-input');
const resultCanvas = $('#result-canvas');
const backBtn = $('#back-btn');
const viewArBtn = $('#view-ar-btn');
const arSection = $('#ar-section');
const modelViewer = $('#model-viewer');
const loadingOverlay = $('#loading');
const loadingText = $('#loading-text');
const errorToast = $('#error-toast');
const arFallbackHint = $('#ar-fallback-hint');

let lastUploadedImage = null; // Image element
let extractedBlob = null;   // PNG blob of extracted object
let glbBlobUrl = null;      // Blob URL for generated GLB

// --- Navigation ---
function showPage(pageId) {
  $$('.page').forEach(p => p.classList.remove('active'));
  const page = $(`#${pageId}`);
  if (page) page.classList.add('active');
}

function showLoading(show, text = 'Processing…') {
  loadingOverlay.classList.toggle('hidden', !show);
  if (loadingText) loadingText.textContent = text;
}

function showError(msg) {
  if (!errorToast) return;
  errorToast.textContent = msg;
  errorToast.classList.remove('hidden');
  setTimeout(() => errorToast.classList.add('hidden'), 4000);
}

// --- Photo upload & confirm ---
photoInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;

  showLoading(true, 'Loading image…');
  try {
    const img = await loadImage(file);
    lastUploadedImage = img;
    showLoading(false);
    await processImage(img);
  } catch (err) {
    console.error(err);
    showLoading(false);
    showError(err.message || 'Failed to process image');
    return;
  }
  showPage('page-process');
});

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = URL.createObjectURL(file);
  });
}

// --- Segmentation: MediaPipe ImageSegmenter (DeepLab) ---
async function getImageSegmenter() {
  if (window._imageSegmenter) return window._imageSegmenter;
  const { FilesetResolver, ImageSegmenter } = await import(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm'
  );
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
  );
  const segmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float32/latest/selfie_segmenter_landscape.tflite',
    },
    outputCategoryMask: true,
    outputConfidenceMasks: false,
    runningMode: 'IMAGE',
  });
  window._imageSegmenter = segmenter;
  return segmenter;
}

async function processImage(img) {
  showLoading(true, 'Extracting subject…');

  const segmenter = await getImageSegmenter();
  const result = segmenter.segment(img);

  // result.categoryMask is ImageData (grayscale mask: 0 = background, non-zero = person/class)
  const mask = result.categoryMask;
  if (!mask) {
    showLoading(false);
    throw new Error('No segmentation mask returned');
  }

  // Composite: original image with transparency where mask is 0
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Build RGBA mask: alpha=255 where foreground (mask > 0), else 0
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = mask.width;
  maskCanvas.height = mask.height;
  const mCtx = maskCanvas.getContext('2d');
  const maskData = mCtx.createImageData(mask.width, mask.height);
  const src = mask.data;
  const pixels = mask.width * mask.height;
  const isRgba = src.length >= pixels * 4;
  for (let i = 0; i < pixels; i++) {
    const v = isRgba ? src[i * 4 + 3] || src[i * 4] : src[i];
    const a = (v > 0 ? 255 : 0);
    maskData.data[i * 4] = 255;
    maskData.data[i * 4 + 1] = 255;
    maskData.data[i * 4 + 2] = 255;
    maskData.data[i * 4 + 3] = a;
  }
  mCtx.putImageData(maskData, 0, 0);

  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(maskCanvas, 0, 0, mask.width, mask.height, 0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  // Copy to result canvas and export blob
  resultCanvas.width = w;
  resultCanvas.height = h;
  resultCanvas.getContext('2d').drawImage(canvas, 0, 0);
  extractedBlob = await new Promise((res) => resultCanvas.toBlob(res, 'image/png'));

  showLoading(false);
}

// --- View in AR: create GLB (plane + texture) and show model-viewer ---
viewArBtn.addEventListener('click', async () => {
  if (!extractedBlob) return;
  showLoading(true, 'Preparing AR model…');
  try {
    const url = await createGLBFromImage(extractedBlob);
    if (glbBlobUrl) URL.revokeObjectURL(glbBlobUrl);
    glbBlobUrl = url;
    modelViewer.src = url;
    modelViewer.classList.remove('hidden');
    arSection.classList.remove('hidden');
    setARFallbackHint();
  } catch (err) {
    console.error(err);
    showError('Could not create AR model');
  }
  showLoading(false);
});

function setARFallbackHint() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    arFallbackHint.textContent = 'On iPhone: tap "View in AR" to open AR Quick Look. Place the object in your space.';
  } else {
    arFallbackHint.textContent = 'Use the "View in AR" button on the model to open AR (Quick Look on iOS, Scene Viewer on Android).';
  }
}

async function createGLBFromImage(blob) {
  const { createGLBFromCanvas } = await import('./glb-export.js');
  const objectUrl = URL.createObjectURL(blob);
  try {
    const glbBlob = await createGLBFromCanvas(objectUrl);
    return URL.createObjectURL(glbBlob);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

backBtn.addEventListener('click', () => {
  showPage('page-home');
  if (glbBlobUrl) {
    URL.revokeObjectURL(glbBlobUrl);
    glbBlobUrl = null;
  }
  arSection.classList.add('hidden');
});
