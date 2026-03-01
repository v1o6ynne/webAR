# WebAR — Extract & View in AR

A mobile-friendly web app that lets you **upload a photo**, **extract the main subject** (person/object), and **view it in AR** on your phone. Optimized for **iPhone Safari**.

## Features

- **Home**: Upload a photo from your phone’s photo library (or take one).
- **Process**: See the extracted subject with transparent background (powered by MediaPipe selfie segmentation).
- **View in AR**: Open the 3D cutout in AR:
  - **iOS Safari**: Uses model-viewer’s AR button; on supported devices it can open **AR Quick Look** (best with a hosted GLB/USDZ).
  - **Android**: Uses WebXR/Scene Viewer when available.
  - The app generates a **GLB** (3D plane with your extracted image as texture) so the object can be placed in the scene.

## How to run

The app uses ES modules and needs to be served over **HTTPS** (or localhost) for camera and AR to work. Do **not** open `index.html` as `file://`.

### Option 1: Local server (recommended)

From the project folder:

```bash
# Python 3
python3 -m http.server 8080

# or npx (Node)
npx serve -l 8080
```

Then open:

- **Desktop**: `http://localhost:8080`
- **iPhone**: Use your computer’s local IP, e.g. `http://192.168.1.x:8080` (same Wi‑Fi as the phone). For AR and camera, Safari may require HTTPS; see Option 2.

### Option 2: HTTPS (e.g. for real AR on iPhone)

Use a tunnel or deploy to a host with HTTPS:

```bash
npx serve -l 8080
# In another terminal:
npx localtunnel --port 8080
# Open the https://... URL on your iPhone
```

### Deploy to Vercel (public HTTPS link)

1. **Push this project to GitHub**
   - Create a new repo (e.g. `webAR`).
   - Either put the contents of the `webAR` folder in the **root** of the repo, or keep the repo as-is and use step 2b.

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in (GitHub is supported).
   - Click **Add New → Project** and import your GitHub repo.
   - If the app lives in a subfolder (e.g. `webAR`), set **Root Directory** to that folder (e.g. `webAR`) and save.
   - Click **Deploy**. No build command or env vars are needed.

3. **Use the public link**
   - Vercel will give you a URL like `https://your-project.vercel.app`. Open it on your phone for upload + AR over HTTPS.

## Tech stack

- **Segmentation**: MediaPipe Tasks Vision — Image Segmenter (selfie/landscape model).
- **3D/AR**: Three.js (plane + texture → GLB), Google **model-viewer** for in-page 3D and AR.
- **UI**: Vanilla JS, CSS (dark theme, mobile-first).

## Browser support

- **Safari on iOS**: Full support for upload, processing, and 3D view; AR Quick Look depends on device and how the GLB is served.
- **Chrome / Android**: Upload, processing, and 3D/AR (WebXR or Scene Viewer where available).
- **Desktop**: Works for testing; AR is most meaningful on a phone.

## Project structure

```
webAR/
├── index.html    # Single-page app (home + process + AR)
├── styles.css    # Layout and theme
├── app.js        # Upload, segmentation, navigation, AR wiring
├── glb-export.js # Build GLB from extracted image (Three.js)
└── README.md     # This file
```

## Notes

- Segmentation works best with **clear photos of people** (selfie/portrait). Other subjects may work but are not the model’s main focus.
- For the best **AR Quick Look** experience on iPhone, the 3D asset is ideally served as **USDZ** with the correct MIME type; this app generates **GLB** only. You can add a backend step to convert GLB → USDZ if needed.
- First run may be slower while MediaPipe and Three.js assets load from the CDN.
