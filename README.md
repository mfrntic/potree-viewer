# PotreeViewer

Modern, framework-agnostic JavaScript library for visualizing large-scale point clouds in web browsers. Built on [potree-core](https://github.com/tentone/potree-core) and [Three.js](https://threejs.org/).

## Features

- 🚀 **Modern ESM architecture** - Clean imports, no global variables
- 🎯 **Framework-agnostic** - Works with vanilla JS, React, Vue, or any framework
- 📏 **5 measurement types** - Distance, Height, Angle, Radius, and Volume measurements
- 🎨 **Modern UI Components** - Toolbar with dropdown menus and Console for measurements
- 🌈 **Multiple color modes** - RGB, Elevation, Classification, Intensity, and more
- 🎥 **Named camera views** - Quick access to Top, Bottom, Left, Right, Front, Back views
- 📦 **Lightweight** - No jQuery or legacy dependencies
- 🔧 **Full API** - Programmatic control over viewer, measurements, and camera
- 🎬 **Event-driven** - Subscribe to viewer events for custom integrations

## Quick Start

### Installation

#### Local Development

This library is currently in development and not yet published to npm.

```bash
# Install dependencies
cd viewer-lib
npm install
```

Dependencies:
- `three` - Three.js 3D library
- `potree-core` - Core Potree point cloud rendering engine

### Minimal Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PotreeViewer Demo</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    #viewer {
      width: 100vw;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="viewer"></div>

  <script type="module">
    import { PotreeViewer } from './viewer-lib/src/index.js';

    const viewer = new PotreeViewer({
      container: document.getElementById('viewer'),
      pointCloudUrl: 'path/to/metadata.json',
      pointCloudName: 'My Point Cloud',
      autoFitOnLoad: true,
    });
  </script>
</body>
</html>
```

### Complete Example with UI

```javascript
import { PotreeViewer, Toolbar, PotreeViewerConsole } from 'potree-viewer';

// Create viewer
const viewer = new PotreeViewer({
  container: document.getElementById('viewer'),
  pointCloudUrl: '/pointcloud/metadata.json',
  pointCloudName: 'Forest Scan',
  description: 'LiDAR scan of forest area',
  language: 'en',
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

  // Callbacks
  onReady: (viewerInstance) => {
    console.log('Viewer ready!', viewerInstance);
  },
  onPointCloudLoaded: (pointCloud) => {
    console.log('Point cloud loaded:', pointCloud);
  },
  onError: (error) => {
    console.error('Viewer error:', error);
  }
});

// Create toolbar with measurement and view controls
const toolbar = new Toolbar(viewer, {
  alignment: 'top-right'
});

// Create console for status messages and measurement results
const console = new PotreeViewerConsole(viewer, {
  position: 'bottom-left',
  width: '360px',
  collapsed: false,
  showTimestamp: true,
  visible: true
});

// Keyboard shortcut to toggle console (Ctrl+`)
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === '`') {
    console.toggleVisibility();
  }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  toolbar.dispose();
  console.dispose();
  viewer.dispose();
});
```

## Configuration

### PotreeViewer Options

```javascript
const viewer = new PotreeViewer({
  // Required
  container: HTMLElement,              // DOM element to render into

  // Point cloud settings
  pointCloudUrl: string,               // Path to metadata.json
  pointCloudName: string,              // Display name (default: 'pointcloud')
  description: string,                 // Description text

  // Viewer settings
  language: 'en' | 'hr',               // UI language (default: 'en')
  pointBudget: number,                 // Max visible points (default: 1,000,000)
  fov: number,                         // Field of view in degrees (default: 80)

  // Initial view
  initialView: 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' |
               { position: {x, y, z}, target: {x, y, z} },

  // Material settings
  material: {
    size: number,                      // Point size (default: 0.6)
    minSize: number,                   // Min point size (default: 0.4)
    pointSizeType: 'FIXED' | 'ATTENUATED' | 'ADAPTIVE',
    shape: 'SQUARE' | 'CIRCLE',
  },

  // Background
  background: 'black' | 'white' | 'gradient' | '#hexcolor',

  // Behavior
  autoFitOnLoad: boolean,              // Auto-fit camera to point cloud
  loadSettingsFromUrl: boolean,        // Load settings from URL params

  // Callbacks
  onReady: (viewer) => void,
  onPointCloudLoaded: (pointCloud) => void,
  onError: (error) => void,
});
```

### Toolbar Options

```javascript
const toolbar = new Toolbar(viewer, {
  alignment: 'top-right',  // Position of toolbar
  // Options: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' |
  //          'left' | 'right' | 'top' | 'bottom'

  buttons: [...],          // Custom button configuration (optional)
});
```

**Default toolbar buttons:**

1. **Fit to Screen** - Automatically fits the point cloud to the viewport
2. **View & Appearance** dropdown with:
   - **Camera Views**: Left, Right, Front, Back, Top, Bottom
   - **Point Color Mode**: RGB, Elevation, Classification, Intensity, Intensity Gradient, Return Number, Source ID, Normal, Level of Detail
   - **Background**: Black, White, Gradient, Skybox
3. **Measurements** dropdown with:
   - Distance, Height, Angle, Radius, Volume
4. **Clear Measurements** (X button) - Clears all measurements and exits measurement mode (disabled when no measurements exist)
5. **Settings** dropdown with:
   - Point Budget slider (100K - 5M points) - Controls maximum number of visible points
   - Field of View slider (30° - 120°) - Controls camera perspective
   - Point Size slider (0.1 - 5.0)
   - Point Shape (Square / Circle)
   - Point Size Type (Fixed / Attenuated / Adaptive)

### PotreeViewerConsole Options

```javascript
const console = new PotreeViewerConsole(viewer, {
  position: 'bottom-left', // Position of console
  // Options: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'

  width: '360px',          // Console width
  collapsed: false,        // Start collapsed
  showTimestamp: true,     // Show timestamp for each message
  visible: true,           // Initially visible
  maxMessages: 50,         // Maximum messages to keep

  // Log level filtering
  logLevel: 'info',        // 'debug' | 'info' | 'warning' | 'error' | 'none'
  // 'debug' - Show all messages including debug info
  // 'info' - Show info, warnings, and errors (default)
  // 'warning' - Show warnings and errors only
  // 'error' - Show errors only
  // 'none' - Disable all logging
});
```

**Log Levels Explained:**
- `debug` - Detailed technical information useful for development and troubleshooting
- `info` - General informational messages about viewer operations (default level)
- `warning` - Warning messages that don't prevent operation but may indicate issues
- `error` - Error messages for failures and critical problems

The viewer automatically logs important operations:
- Point cloud loading and initialization
- Camera view changes
- Measurement operations (adding points, completing measurements)
- Point budget and FOV changes
- Color mode switches

**Examples:**
```javascript
// Set log level at creation
const console = new PotreeViewerConsole(viewer, { logLevel: 'debug' });

// Change log level dynamically
console.setLogLevel('warning'); // Only show warnings and errors
console.setLogLevel('debug');   // Show all messages

// Get current log level
const level = console.getLogLevel(); // returns 'debug', 'info', 'warning', 'error', or 'none'
```

## API Reference

### Complete Method Reference

Below is a complete list of all public methods available on the `PotreeViewer` instance:

**Camera & View**
- `setView(position, target)` - Set camera position and target
- `setNamedView(viewName)` - Set predefined view ('top', 'bottom', 'front', 'back', 'left', 'right')
- `getNamedView()` - Get current named view or 'custom'
- `setFov(fov)` - Set camera field of view in degrees (30 - 120)
- `fitToScreen()` - Fit point cloud to viewport

**Point Cloud Management**
- `loadPointCloud(url, name)` - Load a point cloud (returns Promise)
- `setPointBudget(budget)` - Set maximum visible points (default: 1,000,000)
- `setBackground(background)` - Set background ('black', 'white', 'gradient', 'skybox', or hex color)

**Point Appearance**
- `setPointColorType(colorType)` - Set point coloring mode (use PointColorType enum)
- `getPointColorType()` - Get current color type
- `setPointSize(size)` - Set point size in pixels (0.1 - 5.0)
- `setPointOpacity(opacity)` - Set point opacity (0.0 - 1.0)
- `setPointShape(shape)` - Set point shape ('circle' or 'square')
- `setPointSizeType(type)` - Set size scaling ('fixed', 'attenuated', or 'adaptive')

**Measurements**
- `setMeasurementMode(mode)` - Set measurement mode ('none', 'distance', 'height', 'angle', 'radius', 'volume')
- `getMeasurementMode()` - Get current measurement mode
- `startMeasurement(type)` - Programmatically start a measurement
- `finishMeasurement(id)` - Finish a measurement by ID
- `getMeasurements()` - Get array of all measurement summaries
- `removeMeasurement(id)` - Remove a specific measurement
- `clearMeasurements()` - Clear all measurements

**Advanced Access**
- `getPotree()` - Get underlying Potree instance
- `getScene()` - Get Three.js scene
- `getCamera()` - Get Three.js camera
- `getRenderer()` - Get Three.js WebGL renderer

**Lifecycle**
- `dispose()` - Clean up and free all resources

---

### Detailed Usage Examples

#### Camera & View Control

```javascript
// Set camera position and target
viewer.setView(
  { x: 10, y: 10, z: 10 },  // position
  { x: 0, y: 0, z: 0 }      // target
);

// Set predefined view
viewer.setNamedView('top' | 'bottom' | 'front' | 'back' | 'left' | 'right');

// Get current view name
const viewName = viewer.getNamedView(); // returns view name or 'custom'

// Set field of view (controls camera perspective)
viewer.setFov(60);  // degrees (30 - 120), default: 80

// Fit point cloud to screen
viewer.fitToScreen();
```

#### Point Cloud Management

```javascript
// Load additional point cloud
await viewer.loadPointCloud('path/to/metadata.json', 'cloud-name');

// Set point budget
viewer.setPointBudget(2_000_000);

// Set background
viewer.setBackground('white');
viewer.setBackground('#87CEEB');
```

#### Point Appearance

```javascript
import { PointColorType, PointSizeType, PointShape } from 'potree-core';

// Point Color Mode
viewer.setPointColorType(PointColorType.RGB);           // RGB colors (default)
viewer.setPointColorType(PointColorType.CLASSIFICATION); // LAS classification
viewer.setPointColorType(PointColorType.ELEVATION);     // Height-based gradient
viewer.setPointColorType(PointColorType.INTENSITY);     // Intensity-based
const colorType = viewer.getPointColorType();           // Get current color type

// Point Size
viewer.setPointSize(1.5);  // Set size in pixels (0.1 - 5.0)

// Point Opacity
viewer.setPointOpacity(0.8);  // Set opacity (0.0 - 1.0), default: 1.0

// Point Shape
viewer.setPointShape('circle');  // 'circle' or 'square'

// Point Size Type (how size scales with distance)
viewer.setPointSizeType('adaptive');  // 'fixed', 'attenuated', or 'adaptive'
```

**Available PointColorType values:**
- `RGB` - RGB colors from point cloud data
- `CLASSIFICATION` - LAS classification colors (ground=brown, vegetation=green)
- `ELEVATION` - Height-based gradient
- `INTENSITY` - Intensity-based colors
- `INTENSITY_GRADIENT` - Intensity with gradient colors
- `RETURN_NUMBER` - LiDAR return number
- `SOURCE` - Source ID
- `NORMAL` - Surface normals
- `LOD` - Level of detail
- `DEPTH` - Distance from camera (if available)

#### Measurements

```javascript
// Set measurement mode
viewer.setMeasurementMode('distance');  // Distance measurement
viewer.setMeasurementMode('height');    // Height measurement
viewer.setMeasurementMode('angle');     // Angle measurement
viewer.setMeasurementMode('radius');    // Radius measurement
viewer.setMeasurementMode('volume');    // Volume measurement
viewer.setMeasurementMode('none');      // Return to navigation mode

// Get current mode
const mode = viewer.getMeasurementMode();

// Programmatic measurement control
const measurement = viewer.startMeasurement('distance');
viewer.finishMeasurement(measurement.id);
viewer.removeMeasurement(measurement.id);
viewer.clearMeasurements();

// Get all measurements
const measurements = viewer.getMeasurements();
// Returns array of measurement summaries:
// [{
//   id: 'measurement-123',
//   type: 'distance' | 'height' | 'angle' | 'radius' | 'volume',
//   points: [{ x, y, z }, { x, y, z }, ...],
//   result: { /* measurement-specific results */ }
// }, ...]
```

#### Advanced Access

```javascript
// Get underlying instances (for advanced use)
const potree = viewer.getPotree();      // Potree instance
const scene = viewer.getScene();        // Three.js scene
const camera = viewer.getCamera();      // Three.js camera
const renderer = viewer.getRenderer();  // Three.js renderer
```

#### Cleanup

```javascript
// Dispose viewer and free resources
viewer.dispose();
```

### Toolbar Methods

```javascript
// Create toolbar
const toolbar = new Toolbar(viewer, options);

// Dispose toolbar
toolbar.dispose();
```

### Console Methods

```javascript
// Show/hide console
console.show();
console.hide();
console.toggleVisibility();
console.isVisible(); // returns true/false

// Toggle collapsed state
console.toggle();

// Clear all messages
console.clear();

// Add custom messages (filtered by log level)
console.log('Message', 'info');    // Generic log method
console.debug('Debug info');        // Debug messages (shown only with logLevel='debug')
console.info('Information');        // Info messages
console.warn('Warning message');    // Warning messages
console.error('Error message');     // Error messages

// Legacy log method with type parameter
console.log('Success!', 'success');
console.log('Warning!', 'warning');
console.log('Error!', 'error');

// Manage log level
console.setLogLevel('debug');      // Change log level dynamically
const level = console.getLogLevel(); // Get current log level

// Dispose console
console.dispose();
```

### Events

The viewer uses an event system for notifications. Subscribe to events using `viewer.on(eventName, callback)` and unsubscribe with `viewer.off(eventName, callback)`.

**Available Events:**
- `ready` - Viewer initialized
- `error` - Error occurred
- `pointcloud-loaded` - Point cloud loaded successfully
- `view-changed` - Camera position/target changed
- `measurement-started` - New measurement created
- `measurement-updated` - Point added to current measurement
- `measurement-finished` - Measurement completed
- `measurement-mode-changed` - Measurement mode changed
- `measurements-cleared` - All measurements cleared
- `color-type-changed` - Point color mode changed
- `background-changed` - Background changed

Subscribe to viewer events:

```javascript
// Viewer lifecycle
viewer.on('ready', (viewerInstance) => {
  console.log('Viewer initialized');
});

viewer.on('error', (error) => {
  console.error('Error:', error);
});

// Point cloud events
viewer.on('pointcloud-loaded', (pointCloud) => {
  console.log('Point cloud loaded:', pointCloud.name);
});

// View events
viewer.on('view-changed', ({ namedView, position, target }) => {
  console.log('Camera moved to:', namedView);
});

// Measurement events
viewer.on('measurement-started', (measurement) => {
  console.log('Measurement started:', measurement.type);
  // Payload: { id, type, points: [], result: {} }
  // Note: measurement object is created but has no points yet
});

viewer.on('measurement-updated', (measurement) => {
  console.log('Point added:', measurement.points.length);
  // Payload: { id, type, points: [{ x, y, z }, ...], result: {...} }
  // Fired every time a point is added to the current measurement
});

viewer.on('measurement-finished', (measurement) => {
  console.log('Measurement complete:', measurement.result);
  // Payload: { id, type, points: [{ x, y, z }, ...], result: {...} }
  // Fired when measurement is completed (Enter key or required points reached)
});

viewer.on('measurement-mode-changed', (mode) => {
  console.log('Measurement mode:', mode);
  // Payload: string - 'none' | 'distance' | 'height' | 'angle' | 'radius' | 'volume'
});

viewer.on('measurements-cleared', () => {
  console.log('All measurements cleared');
  // No payload
});

// Appearance events
viewer.on('color-type-changed', (colorType) => {
  console.log('Color type changed:', colorType);
  // Payload: number - PointColorType enum value
});

viewer.on('background-changed', (background) => {
  console.log('Background changed:', background);
  // Payload: string - 'black' | 'white' | 'gradient' | 'skybox' | hex color
});

// Unsubscribe
viewer.off('ready', handler);
```

## Measurements

All measurements are interactive - click on the point cloud to add measurement points. The Clear button (X) becomes enabled as soon as you add the first point and allows you to clear all measurements and exit measurement mode.

### Distance Measurement

Click multiple points to create line segments. Press **Enter** to finish or **ESC** to cancel.

```javascript
// Start measurement
viewer.setMeasurementMode('distance');

// Result format from getMeasurements()
{
  id: 'measurement-123',
  type: 'distance',
  points: [{ x, y, z }, { x, y, z }, ...],
  result: {
    distanceTotal: 45.67  // Total distance in meters
  }
}
// Note: Internal measurement objects also have a 'finished' property
```

### Height Measurement

Click 2 points to measure vertical (Y-axis) difference.

```javascript
// Start measurement
viewer.setMeasurementMode('height');

// Result format from getMeasurements()
{
  id: 'measurement-456',
  type: 'height',
  points: [{ x, y, z }, { x, y, z }],
  result: {
    deltaY: 12.34,        // Vertical difference in meters
    height: 12.34,        // Alias for deltaY
    distance3D: 15.67     // 3D distance in meters
  }
}
// Automatically finishes after 2 points
```

### Angle Measurement

Click 3 points to measure angle formed by the points (vertex is the second point).

```javascript
// Start measurement
viewer.setMeasurementMode('angle');

// Result format from getMeasurements()
{
  id: 'measurement-789',
  type: 'angle',
  points: [{ x, y, z }, { x, y, z }, { x, y, z }],
  result: {
    angle: 45.5  // Angle in degrees (0-180)
  }
}
// Automatically finishes after 3 points
```

### Radius Measurement

Click 3 points to calculate circle radius that passes through all three points.

```javascript
// Start measurement
viewer.setMeasurementMode('radius');

// Result format from getMeasurements()
{
  id: 'measurement-abc',
  type: 'radius',
  points: [{ x, y, z }, { x, y, z }, { x, y, z }],
  result: {
    radius: 5.67  // Radius in meters
  }
}
// Automatically finishes after 3 points
```

### Volume Measurement

Click multiple points to define a polygon base, then add a height point. Press **Enter** to finish or **ESC** to cancel.

```javascript
// Start measurement
viewer.setMeasurementMode('volume');

// Result format from getMeasurements()
{
  id: 'measurement-def',
  type: 'volume',
  points: [{ x, y, z }, ...],
  result: {
    area: 234.56,        // Base area in square meters
    volume: 123.45,      // Volume in cubic meters
    height: 0.53         // Height in meters
  }
}
// Finished when Enter is pressed
```

**Keyboard shortcuts for measurements:**
- **ESC** - Cancel current measurement and exit measurement mode
- **Enter** - Finish current measurement (for distance and volume)
- **Right mouse button** - Rotate camera while in measurement mode

## Framework Integration

### React

```jsx
import { useEffect, useRef } from 'react';
import { PotreeViewer, Toolbar, PotreeViewerConsole } from 'potree-viewer';

function PointCloudViewer({ pointCloudUrl }) {
  const containerRef = useRef();
  const viewerRef = useRef();
  const toolbarRef = useRef();
  const consoleRef = useRef();

  useEffect(() => {
    // Initialize viewer
    viewerRef.current = new PotreeViewer({
      container: containerRef.current,
      pointCloudUrl,
      autoFitOnLoad: true,
    });

    // Create toolbar
    toolbarRef.current = new Toolbar(viewerRef.current);

    // Create console
    consoleRef.current = new PotreeViewerConsole(viewerRef.current, {
      position: 'bottom-left',
    });

    // Cleanup
    return () => {
      consoleRef.current?.dispose();
      toolbarRef.current?.dispose();
      viewerRef.current?.dispose();
    };
  }, [pointCloudUrl]);

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
import { PotreeViewer, Toolbar, PotreeViewerConsole } from 'potree-viewer';

const props = defineProps({
  pointCloudUrl: String
});

const container = ref(null);
let viewer = null;
let toolbar = null;
let viewerConsole = null;

onMounted(() => {
  viewer = new PotreeViewer({
    container: container.value,
    pointCloudUrl: props.pointCloudUrl,
    autoFitOnLoad: true,
  });

  toolbar = new Toolbar(viewer);
  viewerConsole = new PotreeViewerConsole(viewer);
});

onUnmounted(() => {
  viewerConsole?.dispose();
  toolbar?.dispose();
  viewer?.dispose();
});
</script>
```

### Vanilla JavaScript

```javascript
import { PotreeViewer, Toolbar, PotreeViewerConsole } from 'potree-viewer';

const viewer = new PotreeViewer({
  container: document.getElementById('viewer'),
  pointCloudUrl: 'cloud/metadata.json',
  autoFitOnLoad: true,
});

const toolbar = new Toolbar(viewer, {
  alignment: 'top-right'
});

const console = new PotreeViewerConsole(viewer, {
  position: 'bottom-left',
  visible: true
});

// Custom button interactions
document.getElementById('measure-distance').addEventListener('click', () => {
  viewer.setMeasurementMode('distance');
});

document.getElementById('view-top').addEventListener('click', () => {
  viewer.setNamedView('top');
});

// Listen to measurement results
viewer.on('measurement-finished', (measurement) => {
  console.log('Measurement result:', measurement.result);
});
```

## Advanced Usage

### Custom Toolbar Buttons

```javascript
const toolbar = new Toolbar(viewer, {
  alignment: 'top-right',
  buttons: [
    {
      id: 'custom-action',
      group: 'custom',
      label: 'My Custom Action',
      icon: '<svg>...</svg>',
      action: () => {
        console.log('Custom action clicked');
      }
    },
    // ... include default buttons if needed
  ]
});
```

### Direct Three.js Scene Access

```javascript
const scene = viewer.getScene();
const camera = viewer.getCamera();
const renderer = viewer.getRenderer();

// Add custom 3D objects
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
```

### Load Multiple Point Clouds

```javascript
const viewer = new PotreeViewer({
  container: document.getElementById('viewer'),
});

await viewer.loadPointCloud('cloud1/metadata.json', 'Building A');
await viewer.loadPointCloud('cloud2/metadata.json', 'Building B');
```

### Custom View on Load

```javascript
const viewer = new PotreeViewer({
  container: document.getElementById('viewer'),
  pointCloudUrl: 'cloud/metadata.json',
  initialView: {
    position: { x: 100, y: 50, z: 100 },
    target: { x: 0, y: 0, z: 0 }
  }
});
```

## Point Cloud Data Preparation

Use [PotreeConverter](https://github.com/potree/PotreeConverter/releases) to prepare your point cloud data:

```bash
./PotreeConverter input.laz -o output_directory
```

**Supported input formats:** LAS, LAZ, PLY, PTX, XYZ (via TXT2LAS)

The converter will generate:
- `metadata.json` - Point cloud metadata
- `octree.bin` - Octree structure
- `hierarchy.bin` - Hierarchy data
- Individual node files

## Browser Compatibility

- Modern browsers with WebGL support (Chrome, Firefox, Edge, Safari)
- Requires ES module support
- No IE11 support

## Development

### Running the Demo

```bash
cd viewer-lib
npm install
npm run dev
```

Demo will open at `http://localhost:3000/demo.html`

### Building for Production

```bash
npm run build
```

### Project Structure

```
viewer-lib/
├── src/
│   ├── index.js                  # Main exports
│   ├── PotreeViewer.js           # Main viewer class
│   ├── utils/
│   │   ├── EventEmitter.js       # Event system
│   │   ├── config.js             # Configuration
│   │   └── TextSprite.js         # Text labels
│   ├── measurements/
│   │   ├── Measurement.js        # Base class
│   │   ├── DistanceMeasurement.js
│   │   ├── HeightMeasurement.js
│   │   ├── AngleMeasurement.js
│   │   ├── RadiusMeasurement.js
│   │   ├── VolumeMeasurement.js
│   │   └── MeasurementManager.js
│   └── ui/
│       ├── Toolbar.js            # UI toolbar component
│       └── PotreeViewerConsole.js # Console component
├── demo.html                     # Demo page
├── package.json
├── vite.config.js
└── README.md
```

## Troubleshooting

### "Cannot find module 'three'"

```bash
cd viewer-lib
npm install three potree-core
```

### Point cloud not loading

- Check the path to `metadata.json` is correct
- Open browser console for detailed error messages
- Ensure server is serving point cloud files correctly
- Verify CORS headers if loading from different origin

### Webpack/Bundler issues

Add to your bundler configuration:

```javascript
resolve: {
  extensions: ['.js', '.json'],
  alias: {
    'three': path.resolve(__dirname, 'node_modules/three'),
  }
}
```

## Current Status

This library is under active development. Current features:
- ✅ Point cloud loading and rendering
- ✅ 5 measurement types (Distance, Height, Angle, Radius, Volume)
- ✅ Modern toolbar with dropdown menus
- ✅ Console for measurement results
- ✅ Multiple color modes
- ✅ Named camera views
- ✅ Point appearance controls (size, shape, size type)
- ✅ Multiple background options
- ✅ Event system for integrations
- ⏳ Publishing to npm (planned)

## License

MIT

## Credits

- Based on [potree-core](https://github.com/tentone/potree-core) by tentone
- Original [Potree](https://github.com/potree/potree) by Markus Schütz
- Built with [Three.js](https://threejs.org/)
- Icons from [Lucide](https://lucide.dev/) (MIT License)
