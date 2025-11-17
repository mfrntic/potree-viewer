import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { Measurement } from './Measurement.js';
import { TextSprite } from '../utils/TextSprite.js';

/**
 * Height measurement
 * Measures vertical (Y) difference between two points
 * Y axis is up in our coordinate system (point cloud is rotated -90° around X)
 */
export class HeightMeasurement extends Measurement {
  constructor(id) {
    super('height', id);
    this.maxPoints = 2; // Height measurement requires exactly 2 points
  }

  /**
   * Add a point to the measurement
   * @param {Object} point - Point object {position: Vector3}
   */
  addPoint(point) {
    if (this.points.length >= this.maxPoints) {
      console.warn('Height measurement already has 2 points');
      return;
    }

    // Use base class addPoint which handles wrapping Vector3 in object
    super.addPoint(point);

    // Auto-finish when 2 points are added
    if (this.points.length === this.maxPoints) {
      this.finish();
    }
  }

  /**
   * Update the measurement visualization (called every frame like Potree)
   */
  update() {
    if (this.points.length === 0) return;

    // Update markers
    this._updateMarkers();

    // If we have 2 points, draw vertical line showing height difference
    if (this.points.length === 2) {
      this._updateLines();
      this._updateLabel();
    }
  }

  /**
   * Get the measurement result (cached to prevent jitter)
   */
  getResult() {
    return this._getCachedResult(() => {
      if (this.points.length < 2) {
        return { deltaY: 0, height: 0, distance3D: 0 };
      }

      const p1 = this.points[0].position;
      const p2 = this.points[1].position;

      // Y is up in our coordinate system (ground is XZ plane)
      const deltaY = Math.abs(p2.y - p1.y);
      const distance3D = p1.distanceTo(p2);

      return {
        deltaY,       // Vertical difference (height)
        height: deltaY, // Alias for clarity
        distance3D,   // 3D distance between points
      };
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
   * @private
   */
  _updateMarkers() {
    if (!this.scene) return;
    const markerGeometry = new THREE.SphereGeometry(0.03, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

    for (let i = 0; i < this.points.length; i++) {
      if (i < this.markers.length) {
        // Update existing marker position
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
   * Update lines (reuse existing or create new)
   * Following Potree's EXACT approach: position line at start point, use relative coords
   * @private
   */
  _updateLines() {
    if (!this.scene) return;
    const p1 = this.points[0].position;
    const p2 = this.points[1].position;

    if (!this.lines) {
      const lineGeometry = new LineGeometry();
      const lineMaterial = new LineMaterial({
        color: 0x00ff00,
        linewidth: 3,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
        transparent: true,
        opacity: 0.9,
        depthTest: true,
        depthWrite: true,
      });
      this.lines = new Line2(lineGeometry, lineMaterial);
      this.lines.renderOrder = 1;
      this.scene.add(this.lines);
    }

    // CRITICAL: Position the entire line at p1 (like Potree)
    this.lines.position.copy(p1);

    // Create vertical line using RELATIVE coordinates (Y is up)
    // Start at origin (0,0,0), end at relative position
    const deltaY = p2.y - p1.y;
    const positions = [
      0, 0, 0,           // Start at p1 (which is now the origin)
      0, deltaY, 0       // End at same X,Z but different Y
    ];
    this.lines.geometry.setPositions(positions);
    this.lines.computeLineDistances();
    this.lines.geometry.computeBoundingSphere();

    // Find or create connection line (dashed) - from p1 to p2
    let connectionLine = this.labels.find(l => l.userData && l.userData.isConnectionLine);

    if (!connectionLine) {
      const connectionGeometry = new LineGeometry();
      const connectionMaterial = new LineMaterial({
        color: 0xff0000,
        linewidth: 2,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
        transparent: true,
        opacity: 0.6,
        dashed: true,
        dashSize: 0.3,
        gapSize: 0.15,
        depthTest: true,
        depthWrite: true,
      });
      connectionLine = new Line2(connectionGeometry, connectionMaterial);
      connectionLine.userData.isConnectionLine = true;
      connectionLine.renderOrder = 1;
      this.scene.add(connectionLine);
      this.labels.push(connectionLine);
    }

    // CRITICAL: Position connection line at p1, use relative coords for p2
    connectionLine.position.copy(p1);

    const connectionPositions = [
      0, 0, 0,                           // p1 (origin)
      p2.x - p1.x, p2.y - p1.y, p2.z - p1.z  // p2 relative to p1
    ];
    connectionLine.geometry.setPositions(connectionPositions);
    connectionLine.computeLineDistances();
    connectionLine.geometry.computeBoundingSphere();
  }

  /**
   * Update label (reuse existing or create new)
   * @private
   */
  _updateLabel() {
    if (!this.scene) return;
    const p1 = this.points[0].position;
    const p2 = this.points[1].position;
    const result = this.getResult();

    // Find text label (not the connection line)
    let label = this.labels.find(l => l.material && l.material.map && !l.userData.isConnectionLine);

    const labelPos = new THREE.Vector3(p1.x, (p1.y + p2.y) / 2, p1.z);

    if (!label) {
      label = new TextSprite(`${result.height.toFixed(2)} m`);
      label.scale.multiplyScalar(0.3);
      label.renderOrder = 3; // Render labels on top
      this.scene.add(label);
      this.labels.push(label);
    }

    // Update label text and position
    label.text = `${result.height.toFixed(2)} m`;
    label.position.copy(labelPos);
  }
}
