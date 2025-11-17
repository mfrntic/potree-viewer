import * as THREE from 'three';
import { Potree } from 'potree-core';
import { DistanceMeasurement } from './DistanceMeasurement.js';
import { HeightMeasurement } from './HeightMeasurement.js';
import { AngleMeasurement } from './AngleMeasurement.js';
import { RadiusMeasurement } from './RadiusMeasurement.js';
import { VolumeMeasurement } from './VolumeMeasurement.js';

/**
 * Manages measurements for PotreeViewer
 */
export class MeasurementManager {
  constructor(viewer) {
    this.viewer = viewer;
    this.measurements = [];
    this.currentMeasurement = null;
    this.mode = 'none'; // 'none' | 'distance' | 'height' | 'area' | 'volume'
    this.mouseDownPos = null; // Track mouse position on mousedown
    this.dragThreshold = 5; // pixels - clicks that move more than this are considered drags
    this.isRightMouseDown = false; // Track right mouse button for camera rotation

    // Bind event handlers
    this._boundMouseDownHandler = this._handleMouseDown.bind(this);
    this._boundMouseUpHandler = this._handleMouseUp.bind(this);
    this._boundMouseMoveHandler = this._handleMouseMove.bind(this);
    this._boundKeyHandler = this._handleKey.bind(this);
  }

  /**
   * Log message to console (if console exists)
   * @private
   */
  _log(message, type = 'debug') {
    if (this.viewer && this.viewer._console) {
      this.viewer._console.log(message, type);
    }
  }

  /**
   * Set measurement mode
   * @param {string} mode - Measurement mode ('none', 'distance', 'height', 'angle', 'radius', 'volume')
   */
  setMode(mode) {
    const validModes = ['none', 'distance', 'height', 'angle', 'radius', 'volume'];
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid measurement mode: ${mode}. Must be one of: ${validModes.join(', ')}`);
    }

    this._log(`Measurement mode: ${mode}`, 'info');

    // Finish current measurement if switching modes
    if (this.currentMeasurement && !this.currentMeasurement.finished) {
      this._log('Finishing current measurement before mode change', 'debug');
      this.finishCurrentMeasurement();
    }

    const oldMode = this.mode;
    this.mode = mode;

    // Add/remove event listeners based on mode
    if (mode === 'none') {
      this._removeEventListeners();
      this._log('Measurement event listeners removed', 'debug');
    } else {
      if (oldMode === 'none') {
        this._addEventListeners();
        this._log('Measurement event listeners added', 'debug');
      }

      this._startMeasurement(mode);
    }

    // Emit mode change event
    this.viewer.emit('measurement-mode-changed', mode);
  }

  /**
   * Get current measurement mode
   * @returns {string} Current mode
   */
  getMode() {
    return this.mode;
  }

  /**
   * Start a new measurement
   * @param {string} type - Measurement type
   * @returns {Measurement} The created measurement
   */
  _startMeasurement(type) {
    let measurement;

    switch (type) {
      case 'distance':
        measurement = new DistanceMeasurement();
        break;
      case 'height':
        measurement = new HeightMeasurement();
        break;
      case 'angle':
        measurement = new AngleMeasurement();
        break;
      case 'radius':
        measurement = new RadiusMeasurement();
        break;
      case 'volume':
        measurement = new VolumeMeasurement();
        break;
      default:
        throw new Error(`Unsupported measurement type: ${type}`);
    }

    this.currentMeasurement = measurement;
    this.measurements.push(measurement);

    this.viewer.emit('measurement-started', measurement.getSummary());

    return measurement;
  }

  /**
   * Manually start a measurement (advanced API)
   * @param {string} type - Measurement type
   * @returns {Measurement} The created measurement
   */
  startMeasurement(type) {
    this.setMode(type);
    return this.currentMeasurement;
  }

  /**
   * Finish current measurement
   */
  finishCurrentMeasurement() {
    if (!this.currentMeasurement) return;

    this.currentMeasurement.finish();
    this.viewer.emit('measurement-finished', this.currentMeasurement.getSummary());

    this.currentMeasurement = null;
  }

  /**
   * Finish a measurement by ID
   * @param {string} id - Measurement ID
   */
  finishMeasurement(id) {
    const measurement = this.measurements.find(m => m.id === id);
    if (measurement) {
      measurement.finish();
      if (this.currentMeasurement === measurement) {
        this.currentMeasurement = null;
      }
      this.viewer.emit('measurement-finished', measurement.getSummary());
    }
  }

  /**
   * Get all measurements
   * @returns {Array} Array of measurement summaries
   */
  getMeasurements() {
    return this.measurements.map(m => m.getSummary());
  }

  /**
   * Clear all measurements
   */
  clearMeasurements() {
    const count = this.measurements.length;
    for (const measurement of this.measurements) {
      measurement.clear(this.viewer.scene);
    }
    this.measurements = [];
    this.currentMeasurement = null;
    this.viewer.emit('measurement-cleared');
    this._log(`Cleared ${count} measurement(s)`, 'info');

    // If we're still in measurement mode, start a new measurement
    if (this.mode !== 'none') {
      this._startMeasurement(this.mode);
    }
  }

  /**
   * Remove a measurement by ID
   * @param {string} id - Measurement ID
   */
  removeMeasurement(id) {
    const index = this.measurements.findIndex(m => m.id === id);
    if (index !== -1) {
      const measurement = this.measurements[index];
      measurement.clear(this.viewer.scene);
      this.measurements.splice(index, 1);

      if (this.currentMeasurement === measurement) {
        this.currentMeasurement = null;
      }
    }
  }

  /**
   * Add event listeners
   * @private
   */
  _addEventListeners() {
    const canvas = this.viewer.renderer.domElement;
    canvas.addEventListener('mousedown', this._boundMouseDownHandler, { capture: true });
    canvas.addEventListener('mouseup', this._boundMouseUpHandler, { capture: true });
    canvas.addEventListener('mousemove', this._boundMouseMoveHandler, { capture: true });
    window.addEventListener('keydown', this._boundKeyHandler);

    // Keep OrbitControls enabled but we'll intercept left clicks
    // Right mouse button will still allow camera rotation
    // This is better UX than disabling controls entirely
  }

  /**
   * Remove event listeners
   * @private
   */
  _removeEventListeners() {
    const canvas = this.viewer.renderer.domElement;
    canvas.removeEventListener('mousedown', this._boundMouseDownHandler, { capture: true });
    canvas.removeEventListener('mouseup', this._boundMouseUpHandler, { capture: true });
    canvas.removeEventListener('mousemove', this._boundMouseMoveHandler, { capture: true });
    window.removeEventListener('keydown', this._boundKeyHandler);

    // Restore default cursor
    const canvasEl = this.viewer.renderer.domElement;
    canvasEl.style.cursor = '';
  }

  /**
   * Handle mouse down events
   * @private
   */
  _handleMouseDown(event) {
    if (this.mode === 'none' || !this.currentMeasurement) return;

    // Track right mouse button for camera rotation
    if (event.button === 2) {
      this.isRightMouseDown = true;
      return; // Let OrbitControls handle it
    }

    // Only handle left mouse button for measurements
    if (event.button !== 0) return;

    // Store mouse position to detect drag vs click
    this.mouseDownPos = { x: event.clientX, y: event.clientY };

    event.stopPropagation();
    event.preventDefault();
  }

  /**
   * Handle mouse move events
   * @private
   */
  _handleMouseMove(event) {
    if (this.mode === 'none') return;

    // Update cursor based on what's happening
    const canvas = this.viewer.renderer.domElement;

    if (this.isRightMouseDown) {
      // Right mouse is down - show grab cursor for rotation
      canvas.style.cursor = 'grabbing';
    } else {
      // Show crosshair for measurement mode
      canvas.style.cursor = 'crosshair';
    }
  }

  /**
   * Handle mouse up events
   * @private
   */
  _handleMouseUp(event) {
    if (this.mode === 'none' || !this.currentMeasurement) return;

    // Track right mouse button release
    if (event.button === 2) {
      this.isRightMouseDown = false;
      const canvas = this.viewer.renderer.domElement;
      canvas.style.cursor = 'crosshair';
      return; // Let OrbitControls handle it
    }

    // Only handle left mouse button for measurements
    if (event.button !== 0) return;

    // Check if this was a drag or a click
    if (this.mouseDownPos) {
      const dx = Math.abs(event.clientX - this.mouseDownPos.x);
      const dy = Math.abs(event.clientY - this.mouseDownPos.y);
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If mouse moved more than threshold, it's a drag - ignore it
      if (distance > this.dragThreshold) {
        this.mouseDownPos = null;
        return;
      }
    }

    this.mouseDownPos = null;

    event.stopPropagation();
    event.preventDefault();

    // Get mouse coordinates
    const canvas = this.viewer.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Create ray
    const mouse = new THREE.Vector2(x, y);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.viewer.camera);
    const ray = raycaster.ray;

    // Pick point on point cloud
    const pickPoint = Potree.pick(
      this.viewer.pointClouds,
      this.viewer.renderer,
      this.viewer.camera,
      ray
    );

    if (pickPoint) {
      // Following Potree's approach: store point object with position property
      // pickPoint.position is the picked position
      const point = {
        position: pickPoint.position
      };

      const coords = point.position.toArray().map(v => v.toFixed(2)).join(', ');
      console.log(`Picked point at: ${coords}`);
      this._log(`Point added: [${coords}]`, 'debug');

      // Store old point count
      const oldPointCount = this.currentMeasurement.points.length;

      // Add point object to measurement (Potree style)
      this.currentMeasurement.addPoint(point);

      // Only update visuals if a new point was actually added
      if (this.currentMeasurement.points.length > oldPointCount) {
        // Add measurements to MAIN scene (not separate scene)
        this.currentMeasurement.createVisuals(this.viewer.scene);

        // Emit update event
        this.viewer.emit('measurement-updated', this.currentMeasurement.getSummary());
      }

      // Check if measurement is finished
      if (this.currentMeasurement.finished) {
        this._log(`${this.mode} measurement complete`, 'info');
        this.finishCurrentMeasurement();

        // Start a new measurement of the same type
        this._startMeasurement(this.mode);
      }
    } else {
      console.log('No point picked - try clicking directly on the point cloud');
      this._log('No point picked - click on point cloud', 'warning');
    }
  }

  /**
   * Handle keyboard events
   * @private
   */
  _handleKey(event) {
    if (this.mode === 'none') return;

    // ESC key - cancel current measurement and exit mode
    if (event.key === 'Escape') {
      if (this.currentMeasurement) {
        this.removeMeasurement(this.currentMeasurement.id);
      }
      this.setMode('none');
    }

    // Enter key - finish current measurement
    if (event.key === 'Enter') {
      if (this.currentMeasurement && this.currentMeasurement.points.length > 0) {
        this.finishCurrentMeasurement();
      }
    }
  }

  /**
   * Dispose and clean up
   */
  dispose() {
    this._removeEventListeners();
    this.clearMeasurements();
  }
}
