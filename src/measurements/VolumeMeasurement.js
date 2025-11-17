import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { Measurement } from './Measurement.js';
import { TextSprite } from '../utils/TextSprite.js';

/**
 * Volume measurement (Sphere/Ellipsoid)
 * Measures volume of a sphere defined by center and radius points
 * Based on Potree's SphereVolume implementation
 */
export class VolumeMeasurement extends Measurement {
  constructor(id) {
    super('volume', id);
    this.maxPoints = 2; // Center and radius point
    this.scale = new THREE.Vector3(1, 1, 1); // Ellipsoid radii (rx, ry, rz)
  }

  /**
   * Add a point to the measurement
   * @param {Object} point - Point object {position: Vector3}
   */
  addPoint(point) {
    if (this.points.length >= this.maxPoints) {
      console.warn('Volume measurement already has 2 points');
      return;
    }

    // Use base class addPoint which handles wrapping Vector3 in object
    super.addPoint(point);

    // When second point is added, calculate initial radius and create geometry ONCE
    if (this.points.length === 2) {
      const center = this.points[0].position;
      const radiusPoint = this.points[1].position;
      const radius = center.distanceTo(radiusPoint);

      // Set uniform scale (sphere)
      this.scale.set(radius, radius, radius);

      // Create sphere wireframe ONCE
      this._createSphereGeometry();

      // Auto-finish
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

    // Update radius line if we have 2 points
    if (this.points.length >= 2) {
      this._updateRadiusLine();
      // Update labels every frame
      this._updateLabels();
    }
  }

  /**
   * Get the measurement result (cached to prevent jitter)
   * Calculates volume of point cloud within the sphere using voxel grid method
   */
  getResult() {
    return this._getCachedResult(() => {
      if (this.points.length < 2) {
        return { volume: 0, radius: 0, surfaceArea: 0, pointCount: 0 };
      }

      const rx = this.scale.x;
      const ry = this.scale.y;
      const rz = this.scale.z;

      // Calculate average radius
      const avgRadius = (rx + ry + rz) / 3;

      // Calculate volume of points within sphere using voxel grid
      const pointCloudVolume = this._calculatePointCloudVolume();

      return {
        volume: pointCloudVolume.volume,
        radius: avgRadius,
        radii: { rx, ry, rz },
        surfaceArea: 4 * Math.PI * avgRadius * avgRadius,
        center: this.points[0].position.clone(),
        pointCount: pointCloudVolume.pointCount,
        voxelSize: pointCloudVolume.voxelSize,
      };
    });
  }

  /**
   * Calculate volume of point cloud within the sphere using voxel grid method
   * Similar to Potree's volume calculation
   * @private
   */
  _calculatePointCloudVolume() {
    // Get viewer reference to access point cloud
    const viewer = this._getViewer();
    if (!viewer || !viewer.pointClouds || viewer.pointClouds.length === 0) {
      console.warn('[VolumeMeasurement] No point cloud available for volume calculation');
      return { volume: 0, pointCount: 0, voxelSize: 0 };
    }

    const center = this.points[0].position;
    const rx = this.scale.x;
    const ry = this.scale.y;
    const rz = this.scale.z;

    const pointCloud = viewer.pointClouds[0];

    // Determine voxel size based on point cloud spacing
    const spacing = pointCloud.pcoGeometry?.spacing || 0.1;
    const voxelSize = spacing * 2; // Use 2x spacing for voxel size

    console.log('[VolumeMeasurement] Calculating volume with:', {
      center: center.toArray(),
      radius: [rx, ry, rz],
      voxelSize,
      spacing
    });

    // Create voxel grid to count occupied voxels
    const voxelGrid = new Map();
    let pointCount = 0;

    // Get all loaded nodes from point cloud
    const nodes = pointCloud.visibleNodes || [];
    console.log(`[VolumeMeasurement] Processing ${nodes.length} visible nodes`);

    for (const node of nodes) {
      if (!node.sceneNode || !node.sceneNode.geometry) continue;

      const geometry = node.sceneNode.geometry;
      if (!geometry.attributes || !geometry.attributes.position) continue;

      const positions = geometry.attributes.position.array;
      const numPoints = positions.length / 3;

      // Get node's world transformation matrix
      const nodeWorldMatrix = node.sceneNode.matrixWorld;

      // Process each point in this node
      for (let i = 0; i < positions.length; i += 3) {
        // Get point position in node's local space
        const localPos = new THREE.Vector3(
          positions[i],
          positions[i + 1],
          positions[i + 2]
        );

        // Transform to world space using node's matrix
        const worldPos = localPos.clone().applyMatrix4(nodeWorldMatrix);

        // Check if point is inside the ellipsoid
        const dx = (worldPos.x - center.x) / rx;
        const dy = (worldPos.y - center.y) / ry;
        const dz = (worldPos.z - center.z) / rz;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq <= 1.0) {
          // Point is inside sphere
          pointCount++;

          // Calculate voxel index
          const vx = Math.floor(worldPos.x / voxelSize);
          const vy = Math.floor(worldPos.y / voxelSize);
          const vz = Math.floor(worldPos.z / voxelSize);
          const voxelKey = `${vx},${vy},${vz}`;

          // Mark voxel as occupied
          voxelGrid.set(voxelKey, true);
        }
      }
    }

    // Calculate volume: number of occupied voxels × voxel volume
    const occupiedVoxels = voxelGrid.size;
    const voxelVolume = voxelSize * voxelSize * voxelSize;
    const totalVolume = occupiedVoxels * voxelVolume;

    console.log('[VolumeMeasurement] Volume calculation result:', {
      pointCount,
      occupiedVoxels,
      voxelVolume,
      totalVolume
    });

    return {
      volume: totalVolume,
      pointCount,
      voxelSize,
    };
  }

  /**
   * Get viewer instance from scene hierarchy
   * @private
   */
  _getViewer() {
    // Try to find viewer through scene traversal
    let current = this.scene;
    while (current) {
      if (current.userData && current.userData.viewer) {
        return current.userData.viewer;
      }
      if (current.parent) {
        current = current.parent;
      } else {
        break;
      }
    }

    // Fallback: search for viewer in window/global scope
    if (typeof window !== 'undefined' && window.viewer) {
      return window.viewer;
    }

    return null;
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
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });

    // Center point (larger)
    if (this.points.length >= 1) {
      if (this.markers.length < 1) {
        const centerMarker = new THREE.Mesh(markerGeometry, markerMaterial);
        centerMarker.renderOrder = 2;
        centerMarker.scale.set(1.5, 1.5, 1.5);
        this.scene.add(centerMarker);
        this.markers.push(centerMarker);
      }
      this.markers[0].position.copy(this.points[0].position);
    }

    // Radius point
    if (this.points.length >= 2) {
      if (this.markers.length < 2) {
        const radiusMarker = new THREE.Mesh(markerGeometry, markerMaterial);
        radiusMarker.renderOrder = 2;
        this.scene.add(radiusMarker);
        this.markers.push(radiusMarker);
      }
      this.markers[1].position.copy(this.points[1].position);
    }
  }

  /**
   * Update radius line (reuse existing or create new)
   * Following Potree's EXACT approach: position line at start point, use relative coords
   * @private
   */
  _updateRadiusLine() {
    if (!this.scene) return;
    const p1 = this.points[0].position;
    const p2 = this.points[1].position;

    if (!this.lines) {
      const lineGeometry = new LineGeometry();
      const lineMaterial = new LineMaterial({
        color: 0x00ffff,
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

    // CRITICAL: Position line at p1, use relative coords for p2
    this.lines.position.copy(p1);
    const positions = [
      0, 0, 0,                           // p1 (origin)
      p2.x - p1.x, p2.y - p1.y, p2.z - p1.z  // p2 relative to p1
    ];
    this.lines.geometry.setPositions(positions);
    this.lines.computeLineDistances();
    this.lines.geometry.computeBoundingSphere();
  }

  /**
   * Create sphere geometry and wireframe ONCE (called when second point is added)
   * @private
   */
  _createSphereGeometry() {
    if (!this.scene) return;
    if (this.points.length < 2) return;

    const center = this.points[0].position;
    const rx = this.scale.x;
    const ry = this.scale.y;
    const rz = this.scale.z;

    // Create wireframe using THREE.SphereGeometry ONCE
    const wireframeGeometry = new THREE.SphereGeometry(1, 16, 16);
    const wireframeEdges = new THREE.EdgesGeometry(wireframeGeometry);

    const frameMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5,
    });

    const frame = new THREE.LineSegments(wireframeEdges, frameMaterial);
    frame.position.copy(center);
    frame.scale.set(rx, ry, rz);
    frame.renderOrder = 1;
    frame.userData.isWireframe = true;
    this.scene.add(frame);
    this.labels.push(frame);

    // Create transparent sphere mesh ONCE
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });

    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(center);
    sphere.scale.set(rx, ry, rz);
    sphere.renderOrder = 2;
    sphere.userData.isSphereMesh = true;
    this.scene.add(sphere);
    this.labels.push(sphere);

    // Create labels ONCE
    const result = this.getResult();

    // Create volume label
    const volumeText = result.pointCount > 0
      ? `V: ${result.volume.toFixed(2)} m³ (${result.pointCount} pts)`
      : `V: ${result.volume.toFixed(2)} m³`;
    const volumeLabel = new TextSprite(volumeText);
    volumeLabel.position.set(center.x, center.y + ry + 0.5, center.z);
    volumeLabel.renderOrder = 3;
    volumeLabel.backgroundColor = 'rgba(0, 255, 255, 0.8)';
    volumeLabel.scale.multiplyScalar(0.3);
    volumeLabel.userData.isVolumeLabel = true;
    this.scene.add(volumeLabel);
    this.labels.push(volumeLabel);

    // Create radius label
    const radiusPos = new THREE.Vector3().addVectors(center, this.points[1].position).multiplyScalar(0.5);
    const actualRadius = center.distanceTo(this.points[1].position);
    const radiusLabel = new TextSprite(`r: ${actualRadius.toFixed(2)} m`);
    radiusLabel.position.copy(radiusPos);
    radiusLabel.renderOrder = 3;
    radiusLabel.backgroundColor = 'rgba(0, 255, 255, 0.7)';
    radiusLabel.scale.multiplyScalar(0.3);
    radiusLabel.userData.isRadiusLabel = true;
    this.scene.add(radiusLabel);
    this.labels.push(radiusLabel);
  }

  /**
   * Update labels (called every frame to update text)
   * @private
   */
  _updateLabels() {
    if (!this.scene) return;
    if (this.points.length < 2) return;

    const center = this.points[0].position;
    const ry = this.scale.y;
    const result = this.getResult();

    // Find and update volume label
    const volumeLabel = this.labels.find(l => l.material && l.material.map && l.userData && l.userData.isVolumeLabel);
    if (volumeLabel) {
      const volumeText = result.pointCount > 0
        ? `V: ${result.volume.toFixed(2)} m³ (${result.pointCount} pts)`
        : `V: ${result.volume.toFixed(2)} m³`;
      volumeLabel.text = volumeText;
      volumeLabel.position.set(center.x, center.y + ry + 0.5, center.z);
    }

    // Find and update radius label
    const radiusLabel = this.labels.find(l => l.material && l.material.map && l.userData && l.userData.isRadiusLabel);
    if (radiusLabel) {
      const radiusPos = new THREE.Vector3().addVectors(center, this.points[1].position).multiplyScalar(0.5);
      const actualRadius = center.distanceTo(this.points[1].position);
      radiusLabel.text = `r: ${actualRadius.toFixed(2)} m`;
      radiusLabel.position.copy(radiusPos);
    }
  }
}
