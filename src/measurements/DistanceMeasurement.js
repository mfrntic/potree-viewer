import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { Measurement } from './Measurement.js';
import { TextSprite } from '../utils/TextSprite.js';

/**
 * Distance measurement (polyline)
 * Measures total distance along connected points
 */
export class DistanceMeasurement extends Measurement {
  constructor(id) {
    super('distance', id);
  }

  /**
   * Update the measurement visualization (called every frame like Potree)
   */
  update() {
    if (this.points.length === 0) return;

    // Update markers
    this._updateMarkers();

    // Update lines and labels if we have at least 2 points
    if (this.points.length >= 2) {
      this._updateLines();
      this._updateLabels();
    }
  }

  /**
   * Get the measurement result (cached to prevent jitter)
   */
  getResult() {
    return this._getCachedResult(() => {
      if (this.points.length < 2) {
        return { distanceTotal: 0 };
      }

      let totalDistance = 0;
      for (let i = 0; i < this.points.length - 1; i++) {
        totalDistance += this.points[i].position.distanceTo(this.points[i + 1].position);
      }

      return { distanceTotal: totalDistance };
    });
  }

  /**
   * Create visual representation in the scene (called once when first point is added)
   * @param {THREE.Scene} scene - Three.js scene
   */
  createVisuals(scene) {
    // Store scene reference for later updates
    this.scene = scene;

    // Initial update will create all visuals
    this.update();
  }

  /**
   * Update marker spheres (reuse existing or create new)
   * Following Potree's approach: read from point.position
   * @private
   */
  _updateMarkers() {
    if (!this.scene) return;
    const markerGeometry = new THREE.SphereGeometry(0.03, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    for (let i = 0; i < this.points.length; i++) {
      if (i < this.markers.length) {
        // Update existing marker position from point.position
        this.markers[i].position.copy(this.points[i].position);
      } else {
        // Create new marker
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(this.points[i].position);
        marker.renderOrder = 2; // Render markers on top of lines
        this.scene.add(marker);
        this.markers.push(marker);
      }
    }
  }

  /**
   * Update line geometry (reuse existing or create new)
   * Following Potree's EXACT approach:
   * - Position the line at first point
   * - Use RELATIVE coordinates for all points (first point is 0,0,0)
   * @private
   */
  _updateLines() {
    if (!this.scene) return;

    if (!this.lines) {
      // Create new line only once
      const lineGeometry = new LineGeometry();
      const lineMaterial = new LineMaterial({
        color: 0xff0000,
        linewidth: 3,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
        transparent: true,
        opacity: 0.9,
        depthTest: false,  // Disable depth test - measurements always render on top
        depthWrite: false,
      });

      this.lines = new Line2(lineGeometry, lineMaterial);
      this.lines.renderOrder = 1;
      this.scene.add(this.lines);
    }

    // CRITICAL: Position the entire line at the first point (like Potree)
    this.lines.position.copy(this.points[0].position);

    // Build RELATIVE positions array (first point is origin 0,0,0)
    const positions = [];
    const firstPos = this.points[0].position;

    for (const point of this.points) {
      // Calculate position relative to first point
      positions.push(
        point.position.x - firstPos.x,
        point.position.y - firstPos.y,
        point.position.z - firstPos.z
      );
    }

    // Update geometry with relative positions
    this.lines.geometry.setPositions(positions);
    this.lines.computeLineDistances();
    this.lines.geometry.computeBoundingSphere();
  }

  /**
   * Update labels (reuse existing or create new)
   * @private
   */
  _updateLabels() {
    if (!this.scene) return;
    // Find existing segment labels and total label
    const segmentLabels = this.labels.filter(l => !l.userData.isTotalLabel);
    const totalLabel = this.labels.find(l => l.userData.isTotalLabel);

    // Update/create segment labels
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i].position;
      const p2 = this.points[i + 1].position;
      const distance = p1.distanceTo(p2);
      const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

      if (i < segmentLabels.length) {
        // Update existing label
        segmentLabels[i].text = `${distance.toFixed(2)} m`;
        segmentLabels[i].position.copy(midpoint);
      } else {
        // Create new label
        const label = new TextSprite(`${distance.toFixed(2)} m`);
        label.position.copy(midpoint);
        label.scale.multiplyScalar(0.3);
        label.renderOrder = 3; // Render labels on top
        this.scene.add(label);
        this.labels.push(label);
      }
    }

    // Update or create total label
    if (this.finished && this.points.length > 2) {
      const result = this.getResult();
      const lastPoint = this.points[this.points.length - 1].position;

      if (totalLabel) {
        totalLabel.text = `Total: ${result.distanceTotal.toFixed(2)} m`;
        totalLabel.position.set(lastPoint.x, lastPoint.y + 0.5, lastPoint.z);
      } else {
        const newTotalLabel = new TextSprite(`Total: ${result.distanceTotal.toFixed(2)} m`);
        newTotalLabel.position.set(lastPoint.x, lastPoint.y + 0.5, lastPoint.z);
        newTotalLabel.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        newTotalLabel.scale.multiplyScalar(0.3);
        newTotalLabel.userData.isTotalLabel = true;
        newTotalLabel.renderOrder = 3; // Render labels on top
        this.scene.add(newTotalLabel);
        this.labels.push(newTotalLabel);
      }
    }
  }
}
