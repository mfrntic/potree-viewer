import * as THREE from 'three';

/**
 * Base class for all measurements
 */
export class Measurement {
  constructor(type, id) {
    this.id = id || `measurement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.points = []; // Array of point objects: {position: Vector3, ...otherData}
    this.markers = [];
    this.lines = null;
    this.labels = [];
    this.finished = false;
    this._cachedResult = null; // Cache result to prevent jitter from recalculation
    this._pointsHash = null; // Hash of points to detect changes
    this.scene = null; // Reference to the scene (set when first visual is created)
  }

  /**
   * Add a point to the measurement
   * @param {Object} point - Point object {position: Vector3, ...otherData}
   * Based on Potree's approach: stores object with position property
   */
  addPoint(point) {
    // Store point object (like Potree does)
    // If given a Vector3, wrap it in an object
    if (point.x !== undefined) {
      point = {position: point};
    }
    this.points.push(point);
    this._invalidateCache(); // Clear cache when points change
    this.update();
  }

  /**
   * Update the measurement visualization
   * Must be implemented by subclasses
   */
  update() {
    throw new Error('update() must be implemented by subclass');
  }

  /**
   * Get the measurement result
   * Must be implemented by subclasses
   */
  getResult() {
    throw new Error('getResult() must be implemented by subclass');
  }

  /**
   * Get cached result or calculate new one
   * Subclasses should call this to enable caching
   * @protected
   */
  _getCachedResult(calculateFn) {
    // Create hash of current points
    const currentHash = this._hashPoints();

    // If hash matches and we have cached result, return it
    if (this._pointsHash === currentHash && this._cachedResult !== null) {
      return this._cachedResult;
    }

    // Otherwise calculate new result and cache it
    this._pointsHash = currentHash;
    this._cachedResult = calculateFn();
    return this._cachedResult;
  }

  /**
   * Create hash of points for cache comparison
   * @private
   */
  _hashPoints() {
    // Simple hash: concatenate rounded coordinates from position
    return this.points.map(p =>
      `${p.position.x.toFixed(6)},${p.position.y.toFixed(6)},${p.position.z.toFixed(6)}`
    ).join('|');
  }

  /**
   * Invalidate cached result
   * @private
   */
  _invalidateCache() {
    this._cachedResult = null;
    this._pointsHash = null;
  }

  /**
   * Finish the measurement (no more points can be added)
   */
  finish() {
    this.finished = true;
  }

  /**
   * Log message to viewer console (if available)
   * @protected
   */
  _log(message, type = 'info') {
    // Try to get viewer from scene userData
    const viewer = this.scene?.userData?.viewer;
    if (viewer && viewer._console) {
      viewer._console.log(message, type);
    }
  }

  /**
   * Update line positions to follow point positions
   * This ensures lines always connect the marker points correctly
   * Call this in the render loop to keep lines synced with points
   */
  updateLinePositions() {
    // Lines should follow the points array positions
    if (this.lines && this.lines.geometry && this.points.length >= 2) {
      const posAttr = this.lines.geometry.getAttribute('position');
      if (posAttr && posAttr.count === this.points.length) {
        // Update line positions to match current point positions
        for (let i = 0; i < this.points.length; i++) {
          posAttr.setXYZ(i, this.points[i].x, this.points[i].y, this.points[i].z);
        }
        posAttr.needsUpdate = true;
      }
    }
  }

  /**
   * Update marker and label scales based on camera distance
   * Call this in the render loop to keep markers at consistent visual size
   * @param {THREE.Camera} camera - Camera to calculate distance from
   */
  updateMarkerScales(camera) {
    if (!camera) return;

    const referenceDistance = 10; // Distance at which base scale looks good

    // Update marker spheres - scale with distance so they appear consistent size
    for (const marker of this.markers) {
      if (!marker.position) continue;

      const distance = camera.position.distanceTo(marker.position);
      const scale = distance / referenceDistance;
      const clampedScale = Math.max(0.2, Math.min(5.0, scale));

      marker.scale.setScalar(clampedScale);
    }

    // Update text labels (TextSprites)
    // Labels should scale the SAME as markers - proportional to distance
    for (const label of this.labels) {
      // Check if it's a TextSprite (has position and material.map from canvas)
      if (label.position && label.material && label.material.map) {
        const distance = camera.position.distanceTo(label.position);

        // SAME scaling as markers: scale proportional to distance
        const baseLabelScale = 0.3; // Base scale from measurement files
        const scaleFactor = (distance / referenceDistance) * baseLabelScale;
        const clampedScale = Math.max(0.05, Math.min(1.5, scaleFactor));

        // Preserve aspect ratio from original scale
        const aspect = label.scale.x / label.scale.y;
        label.scale.set(clampedScale * aspect, clampedScale, 1);
      }
    }
  }

  /**
   * Clear all visualization objects
   */
  clear(scene) {
    // Remove markers
    for (const marker of this.markers) {
      scene.remove(marker);
      if (marker.geometry) marker.geometry.dispose();
      if (marker.material) marker.material.dispose();
    }
    this.markers = [];

    // Remove lines
    if (this.lines) {
      scene.remove(this.lines);
      if (this.lines.geometry) this.lines.geometry.dispose();
      if (this.lines.material) this.lines.material.dispose();
      this.lines = null;
    }

    // Remove labels
    for (const label of this.labels) {
      scene.remove(label);
      if (label.geometry) label.geometry.dispose();
      if (label.material) label.material.dispose();
    }
    this.labels = [];
  }

  /**
   * Get a summary of this measurement
   */
  getSummary() {
    return {
      id: this.id,
      type: this.type,
      points: this.points.map(p => ({ x: p.position.x, y: p.position.y, z: p.position.z })),
      result: this.getResult(),
    };
  }
}
