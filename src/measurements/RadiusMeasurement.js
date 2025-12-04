import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { Measurement } from './Measurement.js';
import { TextSprite } from '../utils/TextSprite.js';

/**
 * Radius (Circle) measurement
 * Measures radius defined by center point and edge point
 */
export class RadiusMeasurement extends Measurement {
  constructor(id) {
    super('radius', id);
    this.maxPoints = 2; // Center and edge point
  }

  /**
   * Add a point to the measurement
   * @param {Object} point - Point object {position: Vector3}
   * 
   * NOTE: Radius measurement works in horizontal plane (XZ) only.
   * The second point is automatically projected to the same Y level as the center.
   */
  addPoint(point) {
    if (this.points.length >= this.maxPoints) {
      console.warn('Radius measurement already has 2 points');
      return;
    }

    // If this is the second point, project it to the same Y level as center (horizontal plane)
    if (this.points.length === 1) {
      const centerY = this.points[0].position.y;
      const projectedPosition = point.position.clone();
      projectedPosition.y = centerY; // Project to horizontal plane
      
      // Create a new point object with projected position
      const projectedPoint = { position: projectedPosition };
      super.addPoint(projectedPoint);
    } else {
      // First point (center) - use as-is
      super.addPoint(point);
    }

    // When second point is added, create all geometry ONCE
    if (this.points.length === this.maxPoints) {
      this._createCircleGeometry();
      this.finish();
      
      // Log result to console
      const result = this.getResult();
      this._log(`Radius: ${result.radius.toFixed(2)} m | Circumference: ${result.circumference.toFixed(2)} m | Area: ${result.area.toFixed(2)} m²`, 'info');
    }
  }

  /**
   * Update the measurement visualization (called every frame like Potree)
   */
  update() {
    if (this.points.length === 0) return;

    // Update markers
    this._updateMarkers();

    // Update lines if we have 2 points
    if (this.points.length >= 2) {
      this._updateRadiusLine();
      // Update labels every frame
      this._updateLabels();
    }
  }

  /**
   * Get the measurement result (cached to prevent jitter)
   * NOTE: Radius is calculated in horizontal plane (XZ) only
   */
  getResult() {
    return this._getCachedResult(() => {
      if (this.points.length < 2) {
        return { radius: 0, diameter: 0, circumference: 0, area: 0 };
      }

      const center = this.points[0].position;
      const edge = this.points[1].position;

      // Calculate horizontal radius (XZ plane only, ignoring Y difference)
      const dx = edge.x - center.x;
      const dz = edge.z - center.z;
      const radius = Math.sqrt(dx * dx + dz * dz);
      
      const diameter = radius * 2;
      const circumference = 2 * Math.PI * radius;
      const area = Math.PI * radius * radius;

      return {
        radius,
        diameter,
        circumference,
        area,
        center: center.clone(),
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
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });

    // Center point (larger)
    if (this.points.length >= 1) {
      if (this.markers.length < 1) {
        const centerMarker = new THREE.Mesh(markerGeometry, markerMaterial);
        centerMarker.renderOrder = 2;
        centerMarker.scale.set(1.3, 1.3, 1.3);
        this.scene.add(centerMarker);
        this.markers.push(centerMarker);
      }
      this.markers[0].position.copy(this.points[0].position);
    }

    // Edge point
    if (this.points.length >= 2) {
      if (this.markers.length < 2) {
        const edgeMarker = new THREE.Mesh(markerGeometry, markerMaterial);
        edgeMarker.renderOrder = 2;
        this.scene.add(edgeMarker);
        this.markers.push(edgeMarker);
      }
      this.markers[1].position.copy(this.points[1].position);
    }
  }

  /**
   * Update radius line (reuse existing or create new)
   * IMPORTANT: Radius line must be in the SAME PLANE as the circle (horizontal XY plane)
   * This means we project the edge point onto the horizontal plane at the center's Z level
   * @private
   */
  _updateRadiusLine() {
    if (!this.scene) return;
    const center = this.points[0].position;
    const edge = this.points[1].position;

    // Project edge point onto horizontal plane (XZ) at center's Y level
    // This ensures radius line is in the same plane as the circle
    const edgeProjected = new THREE.Vector3(edge.x, center.y, edge.z);

    if (!this.lines) {
      const lineGeometry = new LineGeometry();
      const lineMaterial = new LineMaterial({
        color: 0xff00ff,
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

    // CRITICAL: Position line at center, use relative coords for projected edge
    this.lines.position.copy(center);
    const positions = [
      0, 0, 0,  // center (origin)
      edgeProjected.x - center.x,
      edgeProjected.y - center.y,
      edgeProjected.z - center.z
    ];
    this.lines.geometry.setPositions(positions);
    this.lines.computeLineDistances();
    this.lines.geometry.computeBoundingSphere();
  }

  /**
   * Create circle geometry and labels (called once when second point is added)
   * @private
   */
  _createCircleGeometry() {
    if (!this.scene) return;
    if (this.points.length < 2) return;

    const center = this.points[0].position;
    const edge = this.points[1].position;
    const result = this.getResult();
    const radius = result.radius; // Use horizontal radius from getResult()

    // Create circle geometry ONCE - using THREE.CircleGeometry like Potree
    // CircleGeometry creates a circle in XY plane by default
    const circleGeometry = new THREE.CircleGeometry(1, 64); // radius 1, will be scaled
    // Convert to line by extracting edge vertices
    const positions = [];
    const posAttr = circleGeometry.getAttribute('position');
    for (let i = 1; i < posAttr.count; i++) { // Skip center vertex (index 0)
      positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
    }
    // Close the circle
    positions.push(posAttr.getX(1), posAttr.getY(1), posAttr.getZ(1));

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const circleMaterial = new THREE.LineBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.7,
    });
    const circle = new THREE.Line(lineGeometry, circleMaterial);
    circle.renderOrder = 1;
    circle.userData.isCircle = true;

    // Position at center and scale by horizontal radius
    circle.position.copy(center);
    circle.scale.set(radius, radius, radius);

    // Orient circle to lie flat on the ground (XZ plane)
    // CircleGeometry is in XY plane, rotate -90° around X to make it horizontal
    // NO additional Y rotation - circle should be perfectly horizontal
    circle.rotation.x = -Math.PI / 2;

    this.scene.add(circle);
    this.labels.push(circle);

    // Create labels ONCE at the same time as circle
    const midpoint = new THREE.Vector3().addVectors(center, edge).multiplyScalar(0.5);

    // Create radius label
    const radiusLabel = new TextSprite(`r: ${result.radius.toFixed(2)} m`);
    radiusLabel.position.copy(midpoint);
    radiusLabel.renderOrder = 3;
    radiusLabel.backgroundColor = 'rgba(255, 0, 255, 0.8)';
    radiusLabel.scale.multiplyScalar(0.3);
    radiusLabel.userData.isRadiusLabel = true;
    this.scene.add(radiusLabel);
    this.labels.push(radiusLabel);

    // Create circumference label
    const circumLabel = new TextSprite(`C: ${result.circumference.toFixed(2)} m`);
    circumLabel.position.set(center.x, center.y + radius * 0.7, center.z + radius * 0.7);
    circumLabel.renderOrder = 3;
    circumLabel.backgroundColor = 'rgba(255, 0, 255, 0.7)';
    circumLabel.scale.multiplyScalar(0.3);
    circumLabel.userData.isCircumLabel = true;
    this.scene.add(circumLabel);
    this.labels.push(circumLabel);

    // Create area label
    const areaLabel = new TextSprite(`A: ${result.area.toFixed(2)} m²`);
    areaLabel.position.set(center.x, center.y + radius * 0.7, center.z - radius * 0.7);
    areaLabel.renderOrder = 3;
    areaLabel.backgroundColor = 'rgba(255, 0, 255, 0.7)';
    areaLabel.scale.multiplyScalar(0.3);
    areaLabel.userData.isAreaLabel = true;
    this.scene.add(areaLabel);
    this.labels.push(areaLabel);
  }

  /**
   * Update labels (called every frame to update text)
   * @private
   */
  _updateLabels() {
    if (!this.scene) return;
    if (this.points.length < 2) return;

    const center = this.points[0].position;
    const edge = this.points[1].position;
    const result = this.getResult();
    const radius = result.radius; // Use horizontal radius
    const midpoint = new THREE.Vector3().addVectors(center, edge).multiplyScalar(0.5);

    // Find or create radius label
    let radiusLabel = this.labels.find(l => l.material && l.material.map && l.userData && l.userData.isRadiusLabel);

    if (!radiusLabel) {
      radiusLabel = new TextSprite(`r: ${result.radius.toFixed(2)} m`);
      radiusLabel.renderOrder = 3;
      radiusLabel.backgroundColor = 'rgba(255, 0, 255, 0.8)';
      radiusLabel.scale.multiplyScalar(0.3);
      radiusLabel.userData.isRadiusLabel = true;
      this.scene.add(radiusLabel);
      this.labels.push(radiusLabel);
    }

    radiusLabel.text = `r: ${result.radius.toFixed(2)} m`;
    radiusLabel.position.copy(midpoint);

    // Find or create circumference label
    let circumLabel = this.labels.find(l => l.material && l.material.map && l.userData && l.userData.isCircumLabel);

    if (!circumLabel) {
      circumLabel = new TextSprite(`C: ${result.circumference.toFixed(2)} m`);
      circumLabel.renderOrder = 3;
      circumLabel.backgroundColor = 'rgba(255, 0, 255, 0.7)';
      circumLabel.scale.multiplyScalar(0.3);
      circumLabel.userData.isCircumLabel = true;
      this.scene.add(circumLabel);
      this.labels.push(circumLabel);
    }

    circumLabel.text = `C: ${result.circumference.toFixed(2)} m`;
    circumLabel.position.set(center.x, center.y + radius * 0.7, center.z + radius * 0.7);

    // Find or create area label
    let areaLabel = this.labels.find(l => l.material && l.material.map && l.userData && l.userData.isAreaLabel);

    if (!areaLabel) {
      areaLabel = new TextSprite(`A: ${result.area.toFixed(2)} m²`);
      areaLabel.renderOrder = 3;
      areaLabel.backgroundColor = 'rgba(255, 0, 255, 0.7)';
      areaLabel.scale.multiplyScalar(0.3);
      areaLabel.userData.isAreaLabel = true;
      this.scene.add(areaLabel);
      this.labels.push(areaLabel);
    }

    areaLabel.text = `A: ${result.area.toFixed(2)} m²`;
    areaLabel.position.set(center.x, center.y + radius * 0.7, center.z - radius * 0.7);
  }
}
