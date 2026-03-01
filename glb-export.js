/**
 * Create a GLB file from an image URL (plane with texture) for use in model-viewer AR.
 * Uses Three.js and GLTFExporter.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GLTFExporter } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/exporters/GLTFExporter.js';

/**
 * @param {string} imageUrl - URL of the image (blob or object URL)
 * @returns {Promise<Blob>} GLB blob
 */
export async function createGLBFromCanvas(imageUrl) {
  const texture = await loadTexture(imageUrl);
  const aspect = texture.image
    ? texture.image.width / texture.image.height
    : 1;
  const planeGeom = new THREE.PlaneGeometry(1, 1 / aspect);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    alphaTest: 0.01,
    depthWrite: true,
  });
  const mesh = new THREE.Mesh(planeGeom, material);
  const scene = new THREE.Scene();
  scene.add(mesh);

  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(scene, { binary: true });
  if (!(result instanceof ArrayBuffer)) throw new Error('Expected binary GLB');
  const glbArrayBuffer = result;

  return new Blob([glbArrayBuffer], { type: 'model/gltf-binary' });
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.needsUpdate = true;
        tex.flipY = false;
        resolve(tex);
      },
      undefined,
      reject
    );
  });
}
