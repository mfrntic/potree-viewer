import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { Measurement } from './Measurement.js';
import { TextSprite } from '../utils/TextSprite.js';

/**
 * Angle measurement
 * Measures angle between three points (vertex at second point)
 */
export class AngleMeasurement extends Measurement {
  constructor(id) {
    super('angle', id);
    this.maxPoints = 3; // Angle measurement requires exactly 3 points
  }

  /**
   * Add a point to the measurement
   * @param {Object} point - Point object {position: Vector3}
   */
  addPoint(point) {
    if (this.points.length >= this.maxPoints) {
      console.warn('Angle measurement already has 3 points');
      return;
    }

    // Use base class addPoint which handles wrapping Vector3 in object
    super.addPoint(point);

    // Auto-finish when 3 points are added
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

    // Update lines if we have at least 2 points
    if (this.points.length >= 2) {
      this._updateLines();
    }

    // Update label if we have all 3 points
    if (this.points.length === 3) {
      this._updateLabel();
    }
  }

  /**
   * Get the measurement result (cached to prevent jitter)
   */
  getResult() {
    return this._getCachedResult(() => {
      if (this.points.length < 3) {
        return { angleDegrees: 0, angleRadians: 0 };
      }

      const p1 = this.points[0].position; // First point
      const p2 = this.points[1].position; // Vertex (middle point)
      const p3 = this.points[2].position; // Third point

      // Create vectors from vertex to the two other points
      const v1 = new THREE.Vector3().subVectors(p1, p2);
      const v2 = new THREE.Vector3().subVectors(p3, p2);

      // Calculate angle using dot product
      const angleRadians = v1.angleTo(v2);
      const angleDegrees = THREE.MathUtils.radToDeg(angleRadians);

      return {
        angleDegrees,
        angleRadians,
        vertex: p2.clone(),
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
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i].position;

      if (i < this.markers.length) {
        // Update existing marker position
        this.markers[i].position.copy(point);
      } else {
        // Create new marker
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.renderOrder = 2;
        marker.position.copy(point);
        this.scene.add(marker);
        this.markers.push(marker);
      }

      // Make the vertex (middle point) slightly larger
      if (i === 1 && this.points.length >= 2) {
        this.markers[i].scale.set(1.5, 1.5, 1.5);
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
    const p2 = this.points[1].position; // Vertex

    // Line from p1 to vertex (p2)
    if (!this.lines) {
      const line1Geometry = new LineGeometry();
      const lineMaterial = new LineMaterial({
        color: 0xffaa00,
        linewidth: 3,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
        transparent: true,
        opacity: 0.9,
        depthTest: true,
        depthWrite: true,
      });
      this.lines = new Line2(line1Geometry, lineMaterial);
      this.lines.renderOrder = 1;
      this.scene.add(this.lines);
    }

    // CRITICAL: Position line at p1, use relative coords for p2
    this.lines.position.copy(p1);
    const positions1 = [
      0, 0, 0,                           // p1 (origin)
      p2.x - p1.x, p2.y - p1.y, p2.z - p1.z  // p2 relative to p1
    ];
    this.lines.geometry.setPositions(positions1);
    this.lines.computeLineDistances();
    this.lines.geometry.computeBoundingSphere();

    if (this.points.length === 3) {
      const p3 = this.points[2].position;

      // Find or create line2 (from vertex p2 to p3)
      let line2 = this.labels.find(obj => obj.isLine2 && obj.userData && obj.userData.isLine2);

      if (!line2) {
        const line2Geometry = new LineGeometry();
        const line2Material = new LineMaterial({
          color: 0xffaa00,
          linewidth: 3,
          resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
          transparent: true,
          opacity: 0.9,
          depthTest: true,
          depthWrite: true,
        });
        line2 = new Line2(line2Geometry, line2Material);
        line2.renderOrder = 1;
        line2.userData.isLine2 = true;
        this.scene.add(line2);
        this.labels.push(line2);
      }

      // CRITICAL: Position line2 at p2 (vertex), use relative coords for p3
      line2.position.copy(p2);
      const positions2 = [
        0, 0, 0,                           // p2 (origin)
        p3.x - p2.x, p3.y - p2.y, p3.z - p2.z  // p3 relative to p2
      ];
      line2.geometry.setPositions(positions2);
      line2.computeLineDistances();
      line2.geometry.computeBoundingSphere();
    }
  }

  /**
   * Update visual arc showing the angle (reuse existing or create new)
   * @private
   */
  _updateAngleArc() {
    if (!this.scene) return;
    if (this.points.length < 3) return;

    const p1 = this.points[0].position;
    const vertex = this.points[1].position;
    const p3 = this.points[2].position;

    // Create vectors from vertex
    const v1 = new THREE.Vector3().subVectors(p1, vertex).normalize();
    const v2 = new THREE.Vector3().subVectors(p3, vertex).normalize();

    // Calculate angle
    const angle = v1.angleTo(v2);

    // Create arc
    const arcRadius = 0.5; // Fixed radius for the arc
    const segments = 32;
    const arcPoints = [];

    // Get rotation axis (perpendicular to both vectors)
    const axis = new THREE.Vector3().crossVectors(v1, v2).normalize();

    // Create arc points by rotating v1 towards v2
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const currentAngle = angle * t;

      const point = v1.clone()
        .applyAxisAngle(axis, currentAngle)
        .multiplyScalar(arcRadius)
        .add(vertex);

      arcPoints.push(point);
    }

    // Create arc positions array
    const arcPositions = [];
    for (const point of arcPoints) {
      arcPositions.push(point.x, point.y, point.z);
    }

    // Find or create arc line
    let arc = this.labels.find(obj => obj.isLine && obj.userData && obj.userData.isArc);

    if (!arc) {
      const arcGeometry = new THREE.BufferGeometry();
      const arcMaterial = new THREE.LineBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.8,
      });
      arc = new THREE.Line(arcGeometry, arcMaterial);
      arc.renderOrder = 1;
      arc.userData.isArc = true; // Mark as arc for identification
      this.scene.add(arc);
      this.labels.push(arc);

      // Initialize with empty positions
      arc.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    }

    // Check if we need to update arc positions (arc always has segments+1 points)
    const arcAttr = arc.geometry.getAttribute('position');
    const arcNeedsUpdate = !arcAttr || arcAttr.count !== (segments + 1);

    if (arcNeedsUpdate) {
      // Update arc positions
      const arcPositionsArray = new Float32Array(arcPositions);
      arc.geometry.setAttribute('position', new THREE.BufferAttribute(arcPositionsArray, 3));
      arc.geometry.computeBoundingSphere();
    }

    // Find or create angle label
    const result = this.getResult();
    let label = this.labels.find(obj => obj.isTextSprite || (obj.material && obj.material.map));

    // Position label along the bisector of the angle
    const bisector = new THREE.Vector3()
      .addVectors(v1, v2)
      .normalize()
      .multiplyScalar(arcRadius * 1.5)
      .add(vertex);

    if (!label) {
      label = new TextSprite(`${result.angleDegrees.toFixed(1)}°`);
      label.renderOrder = 3;
      label.backgroundColor = 'rgba(255, 170, 0, 0.8)';
      label.scale.multiplyScalar(0.5);
      label.userData.isAngleLabel = true;
      this.scene.add(label);
      this.labels.push(label);
    }

    // Update label text and position
    label.position.copy(bisector);
    if (label.text !== undefined) {
      label.text = `${result.angleDegrees.toFixed(1)}°`;
    }
  }

  /**
   * Update label showing the angle in degrees
   * @private
   */
  _updateLabel() {
    if (!this.scene) return;
    if (this.points.length < 3) return;

    const p1 = this.points[0].position;
    const vertex = this.points[1].position;
    const p3 = this.points[2].position;

    // Create vectors from vertex
    const v1 = new THREE.Vector3().subVectors(p1, vertex).normalize();
    const v2 = new THREE.Vector3().subVectors(p3, vertex).normalize();

    // Get the angle result
    const result = this.getResult();

    // Find or create angle label
    let label = this.labels.find(obj => obj.isTextSprite || (obj.material && obj.material.map));

    // Position label along the bisector of the angle
    const bisector = new THREE.Vector3()
      .addVectors(v1, v2)
      .normalize()
      .multiplyScalar(0.75)
      .add(vertex);

    if (!label) {
      label = new TextSprite(`${result.angleDegrees.toFixed(1)}°`);
      label.renderOrder = 3;
      label.backgroundColor = 'rgba(255, 170, 0, 0.8)';
      label.scale.multiplyScalar(0.3);
      label.userData.isAngleLabel = true;
      this.scene.add(label);
      this.labels.push(label);
    }

    // Update label text and position
    label.position.copy(bisector);
    if (label.text !== undefined) {
      label.text = `${result.angleDegrees.toFixed(1)}°`;
    }
  }
}
