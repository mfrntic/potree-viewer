/**
 * PotreeViewer - Modern, framework-agnostic point cloud viewer library
 * Built on potree-core and Three.js
 */

export { PotreeViewer } from './PotreeViewer.js';
export { EventEmitter } from './utils/EventEmitter.js';
export { DEFAULT_CONFIG } from './utils/config.js';
export { Toolbar } from './ui/Toolbar.js';
export { PotreeViewerConsole } from './ui/PotreeViewerConsole.js';

// Re-export potree-core types for convenience
export { PointSizeType, PointShape, PointColorType } from 'potree-core';
