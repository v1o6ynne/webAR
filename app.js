/**
 * WebAR — load local whole_brain_optimized.glb and view in AR.
 * No photo upload or model fetch; single GLB shown in model-viewer.
 */

// Optional: set device-specific hint if you add an element with id="ar-fallback-hint"
const hint = document.getElementById('ar-fallback-hint');
if (hint) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  hint.textContent = isIOS
    ? 'On iPhone: tap "View in AR" to open AR Quick Look.'
    : 'Use the "View in AR" button on the model to open AR.';
}
