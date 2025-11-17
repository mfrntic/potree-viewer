# PotreeViewer - Brzi vodič za korištenje

## Pokretanje demo primjera

```bash
cd viewer-lib
npm install
npm run dev
```

Demo stranica će se otvoriti na `http://localhost:3000/demo.html`

## Osnovno korištenje

### 1. Minimalni primjer

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    #viewer { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="viewer"></div>

  <script type="module">
    import { PotreeViewer } from './viewer-lib/src/index.js';

    const viewer = new PotreeViewer({
      container: document.getElementById('viewer'),
      pointCloudUrl: 'path/to/metadata.json',
    });
  </script>
</body>
</html>
```

### 2. S toolbarom i svim opcijama

```javascript
import { PotreeViewer, Toolbar } from './viewer-lib/src/index.js';

const viewer = new PotreeViewer({
  container: document.getElementById('viewer-container'),
  pointCloudUrl: '7_1/metadata.json',
  pointCloudName: '7_1',
  description: 'Hrvatski šumarski institut',
  language: 'hr',
  pointBudget: 1_000_000,
  fov: 80,
  initialView: 'right',
  material: {
    size: 0.6,
    minSize: 0.4,
    pointSizeType: 'FIXED',
    shape: 'SQUARE',
  },
  background: 'black',
  autoFitOnLoad: true,

  onReady: (viewer) => console.log('Ready!'),
  onPointCloudLoaded: (pc) => console.log('Loaded:', pc),
  onError: (err) => console.error('Error:', err),
});

const toolbar = new Toolbar(viewer, {
  position: 'top',
  showMeasurements: true,
  showViews: true,
  showControls: true,
});
```

### 3. Programatsko upravljanje

```javascript
// Kamera i pogledi
viewer.setNamedView('top');
viewer.setView({ x: 10, y: 10, z: 10 }, { x: 0, y: 0, z: 0 });
viewer.fitToScreen();

// Mjerenja
viewer.setMeasurementMode('distance');
viewer.setMeasurementMode('height');
viewer.setMeasurementMode('none');

const measurements = viewer.getMeasurements();
viewer.clearMeasurements();

// Point cloud
viewer.setPointBudget(2_000_000);
viewer.setBackground('white');

// Eventi
viewer.on('measurement-finished', (m) => {
  console.log('Measurement:', m.result);
});

// Čišćenje
viewer.dispose();
toolbar.dispose();
```

## Struktura projekta

```
viewer-lib/
├── src/
│   ├── index.js                  # Glavni export
│   ├── PotreeViewer.js           # Glavna klasa
│   ├── utils/
│   │   ├── EventEmitter.js       # Event sistem
│   │   └── config.js             # Konfiguracija
│   ├── measurements/
│   │   ├── Measurement.js        # Bazna klasa
│   │   ├── DistanceMeasurement.js
│   │   ├── HeightMeasurement.js
│   │   └── MeasurementManager.js
│   └── ui/
│       └── Toolbar.js            # UI toolbar
├── demo.html                     # Demo stranica
├── package.json
├── vite.config.js
├── README.md                     # Puna dokumentacija
└── USAGE.md                      # Ovaj file
```

## Tipovi mjerenja

### Distance (Udaljenost)
- Klikaj na točke da dodaš segmente
- Pritisnite **Enter** da završiš mjerenje
- Pritisnite **ESC** da otkažeš
- Rezultat: ukupna duljina u metrima

### Height (Visina)
- Klikni na 2 točke
- Automatski završava nakon 2. točke
- Rezultat: vertikalna razlika (ΔZ) i 3D udaljenost

## Tipične greške

### "Cannot find module 'three'"
```bash
cd viewer-lib
npm install three potree-core
```

### Point cloud se ne učitava
- Provjeri putanju do `metadata.json`
- Otvori konzolu za detalje greške
- Provjeri da server servira point cloud fileove

### Webpack/Bundler problemi
Dodaj u konfiguraciju:
```javascript
resolve: {
  extensions: ['.js', '.json'],
  alias: {
    'three': path.resolve(__dirname, 'node_modules/three'),
  }
}
```

## Integracija s frameworkovima

### React

```jsx
import { useEffect, useRef } from 'react';
import { PotreeViewer, Toolbar } from 'viewer-lib/src/index.js';

function PointCloudViewer({ url }) {
  const containerRef = useRef();
  const viewerRef = useRef();
  const toolbarRef = useRef();

  useEffect(() => {
    viewerRef.current = new PotreeViewer({
      container: containerRef.current,
      pointCloudUrl: url,
    });

    toolbarRef.current = new Toolbar(viewerRef.current);

    return () => {
      toolbarRef.current?.dispose();
      viewerRef.current?.dispose();
    };
  }, [url]);

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />;
}
```

### Vue 3

```vue
<template>
  <div ref="container" style="width: 100%; height: 100vh"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { PotreeViewer, Toolbar } from 'viewer-lib/src/index.js';

const container = ref(null);
let viewer = null;
let toolbar = null;

onMounted(() => {
  viewer = new PotreeViewer({
    container: container.value,
    pointCloudUrl: 'path/to/metadata.json',
  });

  toolbar = new Toolbar(viewer);
});

onUnmounted(() => {
  toolbar?.dispose();
  viewer?.dispose();
});
</script>
```

## Napredna upotreba

### Direktan pristup Three.js sceni

```javascript
const scene = viewer.getScene();
const camera = viewer.getCamera();
const renderer = viewer.getRenderer();

// Dodaj custom objekte
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
```

### Vlastiti UI umjesto toolbara

```javascript
const viewer = new PotreeViewer({
  container: document.getElementById('viewer'),
  pointCloudUrl: 'cloud/metadata.json',
});

// Vlastiti buttoni
document.getElementById('measure-distance').onclick = () => {
  viewer.setMeasurementMode('distance');
};

document.getElementById('view-top').onclick = () => {
  viewer.setNamedView('top');
};

viewer.on('measurement-finished', (m) => {
  document.getElementById('result').textContent =
    `Distance: ${m.result.distanceTotal.toFixed(2)} m`;
});
```

## Daljnji koraci

- Prouči [README.md](README.md) za potpunu API dokumentaciju
- Pokreni `npm run build` za production build
- Prilagodi `Toolbar.js` za vlastite potrebe
- Dodaj vlastite measurement tipove (area, volume)

## Podrška

Za probleme i pitanja, otvori issue na GitHub repozitoriju.
