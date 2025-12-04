import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Potree, PointSizeType, PointShape, PointColorType } from 'potree-core';
import { EventEmitter } from './utils/EventEmitter.js';
import { mergeConfig, validateConfig } from './utils/config.js';
import { MeasurementManager } from './measurements/MeasurementManager.js';

/**
 * PotreeViewer - Modern, framework-agnostic point cloud viewer
 * Built on potree-core and Three.js
 */
export class PotreeViewer extends EventEmitter {
  constructor(options = {}) {
    super();

    // Merge and validate configuration
    this.config = mergeConfig(options);
    validateConfig(this.config);    

    // Internal state
    this.container = this.config.container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.potree = null;
    this.pointClouds = [];
    this.animationId = null;
    this.isDisposed = false;
    this.measurementManager = null;

    // Initialize the viewer
    this._init();
  }

  /**
   * Get console reference for logging (will be set when console is created)
   * @returns {PotreeViewerConsole|null}
   */
  getConsole() {
    return this._console || null;
  }

  /**
   * Set console reference (called by PotreeViewerConsole)
   * @param {PotreeViewerConsole} consoleInstance
   * @private
   */
  _setConsole(consoleInstance) {
    this._console = consoleInstance;
  }

  /**
   * Log message to console (if console exists)
   * @private
   */
  _log(message, type = 'debug') {
    if (this._console) {
      this._console.log(message, type);
    }
  }

  /**
   * Initialize Three.js scene, camera, renderer, and Potree instance
   * @private
   */
  _init() {
    try {
      this._log('Initializing PotreeViewer...', 'debug');

      // Create Three.js scene
      this.scene = new THREE.Scene();

      // Store viewer reference in scene for measurements to access
      this.scene.userData.viewer = this;

      // Create camera
      const aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera = new THREE.PerspectiveCamera(
        this.config.fov,
        aspect,
        0.1,
        10000
      );
      this.camera.position.set(10, 10, 10);
      this._log(`Camera created: FOV=${this.config.fov}°, aspect=${aspect.toFixed(2)}`, 'debug');

      // Create renderer
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.container.appendChild(this.renderer.domElement);
      this._log(`Renderer created: ${this.container.clientWidth}x${this.container.clientHeight}, pixelRatio=${window.devicePixelRatio}`, 'debug');

      // Create controls
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this._log('OrbitControls initialized', 'debug');

      // Allow full rotation around vertical axis
      this.controls.minPolarAngle = 0; // Allow looking straight down
      this.controls.maxPolarAngle = Math.PI; // Allow looking straight up

      // Enable full 360° rotation
      this.controls.enableRotate = true;
      this.controls.rotateSpeed = 1.0;

      // Minimal zoom limits - allow very close and very far
      this.controls.minDistance = 0.1;   // Can zoom very close
      this.controls.maxDistance = 10000; // Can zoom very far

      // Enable pan
      this.controls.enablePan = true;
      this.controls.panSpeed = 0.5;

      // Better mouse button mapping
      this.controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      };

      // Set background
      this._setBackgroundInternal(this.config.background);
      // Emit event for toolbar initialization
      this.emit('background-changed', this.config.background);

      // Create a completely separate scene for measurements (overlay approach)
      // This ensures measurements are never affected by Potree transformations
      this.measurementScene = new THREE.Scene();
      this.measurementScene.name = 'MeasurementScene';

      // Create Potree instance
      this.potree = new Potree();
      // Set initial point budget (will be auto-adjusted when point cloud loads if set to 'auto')
      const initialBudget = this.config.pointBudget === 'auto' ? 1_000_000 : this.config.pointBudget;
      this.potree.pointBudget = initialBudget;
      this._log(`Potree instance created: pointBudget=${initialBudget.toLocaleString()}${this.config.pointBudget === 'auto' ? ' (auto-adjust enabled)' : ''}`, 'debug');

      // Create measurement manager
      this.measurementManager = new MeasurementManager(this);
      this._log('MeasurementManager initialized', 'debug');

      // Handle window resize
      this._boundResizeHandler = this._handleResize.bind(this);
      window.addEventListener('resize', this._boundResizeHandler);

      // Start animation loop
      this._animate();
      this._log('Animation loop started', 'debug');

      // Load point cloud if URL is provided
      if (this.config.pointCloudUrl) {
        this._log(`Loading point cloud: ${this.config.pointCloudUrl}`, 'info');
        this.loadPointCloud(this.config.pointCloudUrl, this.config.pointCloudName)
          .then(() => {
            // Apply initial view
            this._applyInitialView();

            // Emit ready event
            this._log('Viewer ready', 'info');
            this.emit('ready', this);
            if (typeof this.config.onReady === 'function') {
              this.config.onReady(this);
            }
          })
          .catch(error => {
            console.error('Failed to load point cloud in _init:', error);
            this._log(`Failed to load point cloud: ${error.message}`, 'error');
            this._handleError(error);
          });
      } else {
        // No point cloud to load, emit ready immediately
        this._log('Viewer ready (no point cloud specified)', 'info');
        this.emit('ready', this);
        if (typeof this.config.onReady === 'function') {
          this.config.onReady(this);
        }
      }
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Animation loop
   * @private
   */
  _animate() {
    if (this.isDisposed) return;

    this.animationId = requestAnimationFrame(() => this._animate());

    // Update controls
    if (this.controls) {
      this.controls.update();
    }

    // Update point clouds
    if (this.potree && this.pointClouds.length > 0) {
      this.potree.updatePointClouds(this.pointClouds, this.camera, this.renderer);
    }

    // CRITICAL: Update measurements every frame (like Potree does)
    // This keeps lines and labels synchronized with point positions
    if (this.measurementManager) {
      const measurements = this.measurementManager.measurements;
      for (const measurement of measurements) {
        measurement.update();
        // Update marker and label scales to maintain consistent screen size
        measurement.updateMarkerScales(this.camera);
      }
    }

    // CRITICAL: Update Line2 material resolutions before rendering
    // This is required for Line2 shader to correctly calculate line width in screen space
    if (this.scene) {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this._updateMeasurementResolutions(width, height);
    }

    // Render scene (point cloud + measurements)
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Handle window resize
   * @private
   */
  _handleResize() {
    if (this.isDisposed) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);

    // Update Line2 materials resolution for all measurements
    if (this.measurementManager) {
      this._updateMeasurementResolutions(width, height);
    }
  }

  /**
   * Update Line2 material resolutions for measurements
   * @private
   */
  _updateMeasurementResolutions(width, height) {
    // Traverse scene to find all Line2 materials (used by measurements)
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.material && object.material.resolution) {
          object.material.resolution.set(width, height);
        }
      });
    }
  }

  /**
   * Apply initial view from configuration
   * @private
   */
  _applyInitialView() {
    const { initialView } = this.config;

    if (typeof initialView === 'string') {
      // Named view
      this.setNamedView(initialView);
    } else if (typeof initialView === 'object' && initialView.position && initialView.target) {
      // Custom position and target
      this.setView(initialView.position, initialView.target);
    }

    // Auto-fit if enabled
    if (this.config.autoFitOnLoad && this.pointClouds.length > 0) {
      this.fitToScreen();
    }
  }

  /**
   * Set background color or style
   * @private
   */
  _setBackgroundInternal(background) {
    if (!this.scene) return;

    // Clear existing fog
    this.scene.fog = null;

    if (background === 'black') {
      this.scene.background = new THREE.Color(0x000000);
    } else if (background === 'white') {
      this.scene.background = new THREE.Color(0xffffff);
    } else if (background === 'gradient') {
      // Create a proper gradient texture
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Create gradient from dark blue (bottom) to light blue (top)
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, '#1a2332'); // Dark blue-gray bottom
      gradient.addColorStop(0.5, '#4a6fa5'); // Mid blue
      gradient.addColorStop(1, '#87CEEB'); // Sky blue top

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 2, 256);

      const texture = new THREE.CanvasTexture(canvas);
      this.scene.background = texture;
    } else if (background === 'skybox') {
      // Create a simple skybox with procedural sky colors
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      // Create radial gradient for sky effect
      const gradient = ctx.createRadialGradient(256, 400, 50, 256, 256, 512);
      gradient.addColorStop(0, '#ffffff'); // Sun/bright center
      gradient.addColorStop(0.3, '#87CEEB'); // Sky blue
      gradient.addColorStop(0.7, '#4682B4'); // Steel blue
      gradient.addColorStop(1, '#1e3a5f'); // Dark blue horizon

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      const texture = new THREE.CanvasTexture(canvas);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.background = texture;
    } else if (typeof background === 'string') {
      // Assume it's a color string
      this.scene.background = new THREE.Color(background);
    }
  }

  /**
   * Handle errors
   * @private
   */
  _handleError(error) {
    console.error('PotreeViewer Error:', error);
    this.emit('error', error);
    if (typeof this.config.onError === 'function') {
      this.config.onError(error);
    }
  }

  // ===== PUBLIC API =====

  /**
   * Load a point cloud
   * @param {string} url - Point cloud metadata URL (e.g., 'metadata.json')
   * @param {string} name - Point cloud name
   * @returns {Promise<Object>} Promise that resolves with the point cloud object
   */
  async loadPointCloud(url, name = 'pointcloud') {
    if (!this.potree) {
      throw new Error('PotreeViewer: Potree instance not initialized');
    }

    try {
      this._log(`Loading point cloud from: ${url}`, 'debug');

      // Extract base URL and filename
      const lastSlash = url.lastIndexOf('/');
      const baseUrl = lastSlash >= 0 ? url.substring(0, lastSlash + 1) : '';
      const filename = lastSlash >= 0 ? url.substring(lastSlash + 1) : url;

      this._log(`Parsed URL - baseUrl: "${baseUrl}", filename: "${filename}"`, 'debug');

      // Fetch metadata to get total point count and auto-adjust point budget
      try {
        const metadataResponse = await fetch(url);
        const metadata = await metadataResponse.json();
        
        console.log('[PotreeViewer] Metadata loaded:', metadata);
        console.log('[PotreeViewer] config.pointBudget:', this.config.pointBudget);
        
        if (metadata.points) {
          const totalPoints = metadata.points;
          this._log(`Point cloud has ${totalPoints.toLocaleString()} points`, 'info');
          
          // Store metadata for later access
          this._lastLoadedMetadata = metadata;
          
          // Auto-adjust point budget based on config
          console.log('[PotreeViewer] Checking auto mode:', this.config.pointBudget === 'auto', typeof this.config.pointBudget);
          
          if (this.config.pointBudget === 'auto') {
            // Auto mode: set budget to 70% of total points (good balance of quality vs performance)
            const autoBudget = Math.round(totalPoints * 0.7);
            this.potree.pointBudget = autoBudget;
            console.log('[PotreeViewer] AUTO MODE - Set budget to:', autoBudget);
            this._log(`Point budget set to ${autoBudget.toLocaleString()} (70% of ${totalPoints.toLocaleString()} points)`, 'info');
          } else if (this.potree.pointBudget < totalPoints) {
            // Manual mode but budget is lower than total points - keep manual setting
            console.log('[PotreeViewer] MANUAL MODE - Keeping budget at:', this.potree.pointBudget);
            this._log(`Point budget kept at ${this.potree.pointBudget.toLocaleString()} (manual setting)`, 'info');
          }
          
          console.log('[PotreeViewer] Final pointBudget:', this.potree.pointBudget);
        }
      } catch (metadataError) {
        console.error('[PotreeViewer] Metadata fetch error:', metadataError);
        this._log(`Could not pre-fetch metadata: ${metadataError.message}`, 'warning');
      }

      // Load point cloud using potree-core API
      // The second parameter is the base URL string
      const pco = await this.potree.loadPointCloud(filename, baseUrl);

      pco.name = name;
      this._log(`Point cloud loaded: "${name}"`, 'info');

      // Rotate point cloud to make Y-up (ground is XZ plane)
      pco.rotation.x = -Math.PI / 2;

      // Add to scene
      this.scene.add(pco);
      this.pointClouds.push(pco);

      // Update matrix to ensure transformations are applied
      pco.updateMatrixWorld(true);

      // CRITICAL FIX: Potree shader uses world.z for elevation, but after rotation Y is vertical
      // After -90° X rotation: original bbox.z becomes world.y
      // So we need to set heightMin/Max based on the original Z range
      if (pco.boundingBox) {
        // Original Z range (before rotation) becomes Y range (after rotation)
        const bbox = pco.boundingBox;

        // Transform bounding box corners to get world space range
        const corners = [
          new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z),
          new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z),
        ];

        corners.forEach(c => c.applyMatrix4(pco.matrixWorld));

        const worldMinY = Math.min(corners[0].y, corners[1].y);
        const worldMaxY = Math.max(corners[0].y, corners[1].y);

        pco.material.heightMin = worldMinY;
        pco.material.heightMax = worldMaxY;

        console.log('[PotreeViewer] Adjusted height range for Y-up orientation:', {
          originalZ: { min: bbox.min.z, max: bbox.max.z },
          worldY: { min: worldMinY, max: worldMaxY }
        });
      }

      // Set OrbitControls target to the center of the point cloud
      // This ensures rotation happens around the object center
      const { center, size } = this._getPointCloudWorldBounds(pco);
      this.controls.target.copy(center);
      this.controls.update();
      this._log(`Point cloud bounds - center: [${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}], size: [${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}]`, 'debug');

      // Configure material AFTER adding to scene
      this._configureMaterial(pco.material);
      this._log(`Material configured - size: ${pco.material.size}, colorType: ${pco.material.pointColorType}`, 'debug');

      // Debug: Check what attributes are available
      console.log('[PotreeViewer] Point cloud attributes:', {
        attributes: pco.pcoGeometry?.attributes,
        hasRGB: pco.pcoGeometry?.attributes?.includes('rgb'),
        hasClassification: pco.pcoGeometry?.attributes?.includes('classification'),
      });

      // Debug: Log complete material state
      console.log('[PotreeViewer] Material state after config:', {
        pointColorType: pco.material.pointColorType,
        activeAttributeName: pco.material.activeAttributeName,
        attributes: Object.keys(pco.material.attributes || {}),
        pcoAttributes: pco.pcoGeometry?.pointAttributes?.attributes?.map(a => a.name),
        newFormat: pco.pcoGeometry?.loader?.metadata?.newFormat,
        materialNewFormat: pco.material.newFormat,
      });

      // CRITICAL DEBUG: Check if using new_format
      if (pco.material.vertexShader) {
        const hasNewFormat = pco.material.vertexShader.includes('#define new_format');
        const hasColorTypeRgb = pco.material.vertexShader.includes('#define color_type_rgb');
        console.log('[PotreeViewer] Shader defines:', { hasNewFormat, hasColorTypeRgb });

        if (hasNewFormat) {
          console.warn('[PotreeViewer] ⚠️  WARNING: Point cloud uses new_format!');
          console.warn('[PotreeViewer] new_format uses RGBA attribute directly from geometry');
          console.warn('[PotreeViewer] pointColorType will be IGNORED - color modes won\'t work!');
        }

        // Patch shader for Y-up elevation (since we rotated point cloud -90° around X)
        this._patchShaderForYUpElevation(pco.material);
      }

      // Set color encoding for proper color display
      // potree-core will use its default pointColorType (usually RGB if available)
      pco.material.inputColorEncoding = 1;  // sRGB input
      pco.material.outputColorEncoding = 1; // sRGB output

      // Log what potree-core chose as default
      console.log('[PotreeViewer] Point cloud loaded with default pointColorType:', pco.material.pointColorType);

      // DON'T force any specific color type here - let potree-core use its default
      // User can change it later with setPointColorType()

      // Emit event
      this.emit('pointcloud-loaded', pco);
      if (typeof this.config.onPointCloudLoaded === 'function') {
        this.config.onPointCloudLoaded(pco);
      }

      return pco;
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  /**
   * Configure point cloud material from config
   * @private
   */
  _configureMaterial(material) {
    const { material: matConfig } = this.config;

    material.size = matConfig.size;
    material.minSize = matConfig.minSize;

    // Map point size type
    if (matConfig.pointSizeType === 'FIXED') {
      material.pointSizeType = PointSizeType.FIXED;
    } else if (matConfig.pointSizeType === 'ATTENUATED') {
      material.pointSizeType = PointSizeType.ATTENUATED;
    } else if (matConfig.pointSizeType === 'ADAPTIVE') {
      material.pointSizeType = PointSizeType.ADAPTIVE;
    }

    // Map point shape
    if (matConfig.shape === 'SQUARE') {
      material.shape = PointShape.SQUARE;
    } else if (matConfig.shape === 'CIRCLE') {
      material.shape = PointShape.CIRCLE;
    }

    // DON'T explicitly set pointColorType - let potree-core use its default
    // The original Potree build doesn't set it either, and colors work there
    // Setting it to RGB might interfere with the default shader behavior

    // Debug: Log material settings
    console.log('[PotreeViewer] Material configured:', {
      pointColorType: material.pointColorType,
      size: material.size,
      minSize: material.minSize,
    });
  }

  /**
   * Get metadata of the last loaded point cloud
   * @returns {Object|null} Metadata object or null if not loaded
   */
  getPointCloudMetadata() {
    return this._lastLoadedMetadata || null;
  }

  /**
   * Get total number of points in loaded point cloud
   * @returns {number|null} Total points or null if not loaded
   */
  getTotalPoints() {
    if (this._lastLoadedMetadata && this._lastLoadedMetadata.points) {
      return this._lastLoadedMetadata.points;
    }
    return null;
  }

  /**
   * Get current point budget
   * @returns {number} Current point budget
   */
  getPointBudget() {
    return this.potree ? this.potree.pointBudget : this.config.pointBudget;
  }

  /**
   * Set point budget (number of visible points)
   * @param {number} budget - Point budget
   */
  setPointBudget(budget) {
    if (typeof budget !== 'number' || budget <= 0) {
      throw new Error('Point budget must be a positive number');
    }

    if (this.potree) {
      this.potree.pointBudget = budget;
    }

    this.config.pointBudget = budget;
    this._log(`Point budget set: ${budget.toLocaleString()}`, 'info');
  }

  /**
   * Set camera field of view
   * @param {number} fov - Field of view in degrees (must be between 1 and 179)
   */
  setFov(fov) {
    if (typeof fov !== 'number' || fov <= 0 || fov >= 180) {
      throw new Error('FOV must be between 0 and 180 degrees');
    }

    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    this.config.fov = fov;
    this._log(`FOV set: ${fov}°`, 'info');
  }

  /**
   * Set camera view (position and target)
   * @param {Object} position - Camera position {x, y, z}
   * @param {Object} target - Look-at target {x, y, z}
   */
  setView(position, target) {
    if (!position || !target) {
      throw new Error('Position and target are required');
    }

    this.camera.position.set(position.x, position.y, position.z);
    this.controls.target.set(target.x, target.y, target.z);
    this.camera.lookAt(target.x, target.y, target.z);
    this.controls.update();

    this._log(`View set - pos: [${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}], target: [${target.x.toFixed(1)}, ${target.y.toFixed(1)}, ${target.z.toFixed(1)}]`, 'debug');

    this.emit('view-changed', {
      namedView: 'custom',
      position: { ...position },
      target: { ...target },
    });
  }

  /**
   * Get world-space center and size of point cloud
   * @private
   */
  _getPointCloudWorldBounds(pco) {
    // Get local bounding box
    const localBBox = pco.boundingBox;
    const localMin = localBBox.min.clone();
    const localMax = localBBox.max.clone();
    const localSize = localBBox.getSize(new THREE.Vector3());

    // Transform BOTH min and max corners to world coordinates
    localMin.applyMatrix4(pco.matrixWorld);
    localMax.applyMatrix4(pco.matrixWorld);

    // After transformation, min and max might be swapped (due to rotation)
    // Create new bounding box from transformed corners
    const worldBBox = new THREE.Box3();
    worldBBox.expandByPoint(localMin);
    worldBBox.expandByPoint(localMax);

    // Also transform all 8 corners to be safe
    const corners = [
      new THREE.Vector3(localBBox.min.x, localBBox.min.y, localBBox.min.z),
      new THREE.Vector3(localBBox.max.x, localBBox.min.y, localBBox.min.z),
      new THREE.Vector3(localBBox.min.x, localBBox.max.y, localBBox.min.z),
      new THREE.Vector3(localBBox.max.x, localBBox.max.y, localBBox.min.z),
      new THREE.Vector3(localBBox.min.x, localBBox.min.y, localBBox.max.z),
      new THREE.Vector3(localBBox.max.x, localBBox.min.y, localBBox.max.z),
      new THREE.Vector3(localBBox.min.x, localBBox.max.y, localBBox.max.z),
      new THREE.Vector3(localBBox.max.x, localBBox.max.y, localBBox.max.z),
    ];

    corners.forEach(corner => {
      corner.applyMatrix4(pco.matrixWorld);
      worldBBox.expandByPoint(corner);
    });

    // Get center and size from the world-space bounding box
    const worldCenter = worldBBox.getCenter(new THREE.Vector3());
    const worldSize = worldBBox.getSize(new THREE.Vector3());

    return { center: worldCenter, size: worldSize };
  }

  /**
   * Calculate optimal camera distance to fit object in view
   * @private
   * @param {THREE.Vector3} direction - Normalized direction from target to camera
   * @returns {number} Optimal distance
   */
  _calculateFitDistance(direction) {
    const pco = this.pointClouds[0];
    const { center: worldCenter } = this._getPointCloudWorldBounds(pco);

    const fov = this.camera.fov * (Math.PI / 180);
    const aspect = this.container.clientWidth / this.container.clientHeight;

    // Create camera basis vectors (right, up, forward)
    const cameraForward = direction.clone().negate();
    const cameraRight = new THREE.Vector3();
    const worldUp = new THREE.Vector3(0, 1, 0);
    cameraRight.crossVectors(worldUp, cameraForward).normalize();
    const cameraUp = new THREE.Vector3();
    cameraUp.crossVectors(cameraForward, cameraRight).normalize();

    // Get all 8 corners of the bounding box in world space
    const bbox = pco.boundingBox;
    const corners = [
      new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z),
      new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.min.z),
      new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.min.z),
      new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.min.z),
      new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.max.z),
      new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.max.z),
      new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.max.z),
      new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z),
    ];

    // Transform corners to world space
    corners.forEach(corner => corner.applyMatrix4(pco.matrixWorld));

    // Project corners onto camera's up and right axes
    let minHorizontal = Infinity, maxHorizontal = -Infinity;
    let minVertical = Infinity, maxVertical = -Infinity;
    let minDepth = Infinity, maxDepth = -Infinity;

    corners.forEach(corner => {
      const relative = corner.clone().sub(worldCenter);
      const horizontal = relative.dot(cameraRight);
      const vertical = relative.dot(cameraUp);
      const depth = relative.dot(cameraForward);

      minHorizontal = Math.min(minHorizontal, horizontal);
      maxHorizontal = Math.max(maxHorizontal, horizontal);
      minVertical = Math.min(minVertical, vertical);
      maxVertical = Math.max(maxVertical, vertical);
      minDepth = Math.min(minDepth, depth);
      maxDepth = Math.max(maxDepth, depth);
    });

    // Calculate visible width and height from camera's perspective
    const visibleWidth = maxHorizontal - minHorizontal;
    const visibleHeight = maxVertical - minVertical;
    const objectDepth = maxDepth - minDepth;

    // Calculate required distance for vertical and horizontal FOV
    const distanceV = (visibleHeight / 2) / Math.tan(fov / 2);
    const distanceH = (visibleWidth / 2) / (Math.tan(fov / 2) * aspect);

    // Base distance to fit object in view frustum
    let baseDistance = Math.max(distanceV, distanceH);

    // CRITICAL: Account for depth offset
    // If minDepth is negative (point is behind center), we need more distance
    // If minDepth is positive (point is in front of center), we can be closer
    baseDistance = baseDistance - minDepth;

    // Detect if this is a top/bottom view (camera looking straight up/down)
    // Check if direction is mostly vertical (Y-axis in world space)
    // Reuse worldUp defined earlier (line 515)
    const verticalAlignment = Math.abs(direction.dot(worldUp));
    const isTopBottomView = verticalAlignment > 0.95; // ~18 degrees tolerance

    // Apply safety margins
    let depthSafetyMargin, overallMargin;

    if (isTopBottomView) {
      // Extra safety for top/bottom views to prevent entering point cloud
      depthSafetyMargin = objectDepth * 0.5; // 50% of depth
      overallMargin = 1.2; // 20% margin
    } else {
      // Normal margins for horizontal views
      depthSafetyMargin = objectDepth * 0.15; // 15% of depth
      overallMargin = 1.1; // 10% margin
    }

    return baseDistance * overallMargin + depthSafetyMargin;
  }

  /**
   * Set named view (predefined camera positions)
   * NOTE: Y is UP in our coordinate system (point cloud is rotated -90° around X)
   * @param {string} viewName - 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right'
   */
  setNamedView(viewName) {
    if (this.pointClouds.length === 0) {
      console.warn('No point cloud loaded, cannot set view');
      this._log('Cannot set view: No point cloud loaded', 'warning');
      return;
    }

    this._log(`Setting view: ${viewName}`, 'info');

    const pco = this.pointClouds[0];
    const { center } = this._getPointCloudWorldBounds(pco);

    let direction; // Direction from target to camera

    switch (viewName.toLowerCase()) {
      case 'top':
        // Look from above (Y+ is up)
        direction = new THREE.Vector3(0, 1, 0);
        break;

      case 'bottom':
        // Look from below
        direction = new THREE.Vector3(0, -1, 0);
        break;

      case 'front':
        // Look from front (positive Z) - camera looks toward negative Z
        direction = new THREE.Vector3(0, 0, 1);
        break;

      case 'back':
        // Look from back (negative Z) - camera looks toward positive Z
        direction = new THREE.Vector3(0, 0, -1);
        break;

      case 'left':
        // Look from left (negative X)
        direction = new THREE.Vector3(-1, 0, 0);
        break;

      case 'right':
        // Look from right (positive X)
        direction = new THREE.Vector3(1, 0, 0);
        break;

      case 'isometric':
        // Isometric view from corner (for backward compatibility)
        direction = new THREE.Vector3(0.7, 0.7, -0.7).normalize();
        break;

      default:
        console.warn(`Unknown view name: ${viewName}`);
        return;
    }

    // Calculate optimal distance for this view direction
    const distance = this._calculateFitDistance(direction);

    // Position camera at calculated distance
    const position = new THREE.Vector3();
    position.copy(center).add(direction.multiplyScalar(distance));

    this.setView(
      { x: position.x, y: position.y, z: position.z },
      { x: center.x, y: center.y, z: center.z }
    );

    this.emit('view-changed', {
      namedView: viewName,
      position: { x: position.x, y: position.y, z: position.z },
      target: { x: center.x, y: center.y, z: center.z },
    });
  }

  /**
   * Get current named view (or 'custom' if not matching any predefined view)
   * @returns {string} Named view identifier
   */
  getNamedView() {
    // This is a simplified implementation
    // In a full implementation, you would check camera position against predefined views
    return 'custom';
  }

  /**
   * Fit point cloud to screen
   * Adjusts camera distance to fit entire object without changing view direction
   */
  fitToScreen() {
    if (this.pointClouds.length === 0) {
      console.warn('No point cloud loaded, cannot fit to screen');
      return;
    }

    const { center: worldCenter } = this._getPointCloudWorldBounds(this.pointClouds[0]);

    // Get current camera direction (from target to camera)
    const currentDirection = new THREE.Vector3();
    currentDirection.subVectors(this.camera.position, this.controls.target).normalize();

    // Calculate optimal distance (auto-detects top/bottom view for extra safety)
    const distance = this._calculateFitDistance(currentDirection);

    // Position camera at calculated distance along current direction
    const newPosition = new THREE.Vector3();
    newPosition.copy(worldCenter).add(currentDirection.multiplyScalar(distance));

    // Update camera position and target
    this.camera.position.copy(newPosition);
    this.controls.target.copy(worldCenter);
    this.controls.update();

    this.emit('view-changed', {
      namedView: 'custom',
      position: { x: newPosition.x, y: newPosition.y, z: newPosition.z },
      target: { x: worldCenter.x, y: worldCenter.y, z: worldCenter.z },
    });
  }

  /**
   * Recenter camera on point cloud
   * Sets the OrbitControls target to the center of the point cloud
   * without moving the camera position
   */
  recenterOnObject() {
    if (this.pointClouds.length === 0) {
      console.warn('No point cloud loaded, cannot recenter');
      return;
    }

    const pco = this.pointClouds[0];
    const { center } = this._getPointCloudWorldBounds(pco);
    this.controls.target.copy(center);
    this.controls.update();
  }

  /**
   * Set background
   * @param {string} background - Background style ('black', 'white', 'gradient', or hex color)
   */
  setBackground(background) {
    this._setBackgroundInternal(background);
    this.config.background = background;
    this.emit('background-changed', background);
  }

  /**
   * Set point size
   * @param {number} size - Point size (0.1 to 5.0)
   */
  setPointSize(size) {
    for (const pco of this.pointClouds) {
      if (pco.material) {
        pco.material.size = size;
      }
    }
  }

  /**
   * Set point opacity
   * @param {number} opacity - Opacity value (0.0 to 1.0)
   */
  setPointOpacity(opacity) {
    for (const pco of this.pointClouds) {
      if (pco.material) {
        pco.material.opacity = opacity;
      }
    }
  }

  /**
   * Set point shape
   * @param {string} shape - 'square' or 'circle'
   */
  setPointShape(shape) {
    const PointShape = { SQUARE: 0, CIRCLE: 1 };
    const shapeValue = shape === 'circle' ? PointShape.CIRCLE : PointShape.SQUARE;

    for (const pco of this.pointClouds) {
      if (pco.material) {
        pco.material.shape = shapeValue;
      }
    }
  }

  /**
   * Set point size type
   * @param {string} sizeType - 'fixed', 'attenuated', or 'adaptive'
   * 
   * Note: 'adaptive' mode may not work optimally with potree-core as it requires
   * additional LOD texture data that may not be properly initialized.
   * For best results, use 'fixed' or 'attenuated'.
   */
  setPointSizeType(sizeType) {
    const PointSizeType = { FIXED: 0, ATTENUATED: 1, ADAPTIVE: 2 };
    let sizeTypeValue;

    switch (sizeType) {
      case 'fixed':
        sizeTypeValue = PointSizeType.FIXED;
        break;
      case 'attenuated':
        sizeTypeValue = PointSizeType.ATTENUATED;
        break;
      case 'adaptive':
      default:
        sizeTypeValue = PointSizeType.ADAPTIVE;
        break;
    }

    for (const pco of this.pointClouds) {
      if (pco.material) {
        pco.material.pointSizeType = sizeTypeValue;
      }
    }
  }

  /**
   * Patch shader to use world.y instead of world.z for elevation calculations
   * This is necessary because we rotate point clouds -90° around X-axis to make Y-up,
   * but potree-core shaders hardcoded use world.z for elevation.
   * @private
   */
  _patchShaderForYUpElevation(material) {
    if (!material.vertexShader) {
      return;
    }

    const originalShader = material.vertexShader;

    // Pattern 1: Direct world.z usage in elevation calculation
    material.vertexShader = material.vertexShader.replace(
      /(world\.z\s*-\s*heightMin)/g,
      'world.y - heightMin'
    );

    // Pattern 2: Replace world.z in getElevation function if it exists
    const elevationFunctionMatch = material.vertexShader.match(
      /vec3\s+getElevation\s*\([^)]*\)\s*\{[^}]*\}/s
    );

    if (elevationFunctionMatch) {
      const originalFunction = elevationFunctionMatch[0];
      const patchedFunction = originalFunction.replace(/world\.z/g, 'world.y');
      material.vertexShader = material.vertexShader.replace(
        originalFunction,
        patchedFunction
      );
    }

    const wasPatched = originalShader !== material.vertexShader;

    if (wasPatched) {
      console.log('[PotreeViewer] ✓ Patched shader for Y-up elevation:', {
        hasGetElevation: !!elevationFunctionMatch,
        patchedSuccessfully: true
      });
    }
  }

  /**
   * Set point color type (how points are colored)
   * @param {PointColorType} colorType - Color type from PointColorType enum
   * Examples:
   * - PointColorType.RGB - Use RGB colors from point cloud data
   * - PointColorType.CLASSIFICATION - Use LAS classification (ground=brown, vegetation=green)
   * - PointColorType.ELEVATION - Color by height
   * - PointColorType.INTENSITY - Color by intensity values
   */
  setPointColorType(colorType) {
    if (this.pointClouds.length === 0) {
      console.warn('No point cloud loaded');
      this._log('Cannot set color type: No point cloud loaded', 'warning');
      return;
    }

    const colorTypeNames = { 0: 'RGB', 1: 'COLOR', 2: 'DEPTH', 3: 'HEIGHT', 4: 'INTENSITY', 5: 'INTENSITY_GRADIENT', 6: 'LOD', 7: 'POINT_INDEX', 8: 'CLASSIFICATION', 9: 'RETURN_NUMBER', 10: 'SOURCE', 11: 'NORMAL', 12: 'PHONG', 13: 'RGB_HEIGHT' };
    const colorName = colorTypeNames[colorType] || colorType;
    this._log(`Setting color type: ${colorName}`, 'info');
    console.log('[PotreeViewer] Setting point color type to:', colorType);

    for (const pco of this.pointClouds) {
      if (pco.material) {
        const oldType = pco.material.pointColorType;

        // CRITICAL FIX: Must clear WebGL cache BEFORE regenerating shader source!
        // The order is crucial: delete cache → set color type → regenerate shader → render

        // Step 0: Save important material properties before dispose
        const savedProps = {
          heightMin: pco.material.heightMin,
          heightMax: pco.material.heightMax,
          gradient: pco.material.gradient,
          classification: pco.material.classification,
          intensityRange: [...pco.material.intensityRange],
          size: pco.material.size,
          minSize: pco.material.minSize,
          maxSize: pco.material.maxSize,
          opacity: pco.material.opacity,
        };

        // Step 1: Fully dispose material to clear ALL WebGL state
        // This prevents "uniform location not from associated program" errors
        pco.material.dispose();

        // Step 1b: Also clear renderer cache
        if (this.renderer && this.renderer.properties) {
          const materialProps = this.renderer.properties.get(pco.material);
          if (materialProps) {
            // Delete the entire programs array
            if (materialProps.programs) {
              materialProps.programs.forEach(p => {
                if (p && p.destroy) p.destroy();
              });
              delete materialProps.programs;
            }
            // Delete all program references and caches
            delete materialProps.program;
            delete materialProps.currentProgram;
            delete materialProps.shader;
            delete materialProps.__webglShader;

            console.log('[PotreeViewer] ✓ Fully disposed material and cleared WebGL cache');
          }
        }

        // Step 2: Handle new_format flag based on color type
        // new_format uses RGBA from geometry - keep it ONLY for RGB color type
        // For other color types (ELEVATION, CLASSIFICATION, etc.) we must disable it
        const hadNewFormat = pco.material.newFormat;
        const isRGBColorType = (colorType === 0); // PointColorType.RGB = 0

        if (hadNewFormat && !isRGBColorType) {
          console.log('[PotreeViewer] Disabling new_format to use color type:', colorType);
          pco.material.newFormat = false;
        } else if (!hadNewFormat && isRGBColorType) {
          console.log('[PotreeViewer] Enabling new_format for RGB color type');
          pco.material.newFormat = true;
        }

        // Step 3: Set new color type
        pco.material.pointColorType = colorType;

        // Step 4: Regenerate shader source with new #defines
        if (typeof pco.material.updateShaderSource === 'function') {
          pco.material.updateShaderSource();

          // CRITICAL FIX: Patch shader to use world.y instead of world.z for elevation
          this._patchShaderForYUpElevation(pco.material);

          // Verify shader was regenerated correctly
          const hasNewFormat = pco.material.vertexShader?.includes('#define new_format');
          const colorTypeDefine = pco.material.vertexShader?.match(/#define color_type_\w+/)?.[0];

          console.log('[PotreeViewer] ✓ Regenerated shader:', {
            oldColorType: oldType,
            newColorType: colorType,
            colorTypeDefine,
            hasNewFormat,
            shouldHaveNewFormat: isRGBColorType,
            materialNewFormat: pco.material.newFormat
          });

          // Sanity check
          if (isRGBColorType && !hasNewFormat) {
            console.error('[PotreeViewer] ⚠️  RGB color type but new_format not in shader!');
          } else if (!isRGBColorType && hasNewFormat) {
            console.error('[PotreeViewer] ⚠️  Non-RGB color type but new_format still in shader!');
          }
        } else {
          console.error('[PotreeViewer] ⚠️  updateShaderSource() does not exist!');
        }

        // Step 5: Restore important material properties that were lost during dispose
        pco.material.gradient = savedProps.gradient;
        pco.material.classification = savedProps.classification;
        pco.material.intensityRange = savedProps.intensityRange;
        pco.material.size = savedProps.size;
        pco.material.minSize = savedProps.minSize;
        pco.material.maxSize = savedProps.maxSize;
        pco.material.opacity = savedProps.opacity;

        // CRITICAL: Recalculate heightMin/Max for rotated point cloud
        // Don't use saved values - they might be wrong for rotated orientation
        if (pco.boundingBox) {
          const bbox = pco.boundingBox;
          const corners = [
            new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z),
            new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z),
          ];
          corners.forEach(c => c.applyMatrix4(pco.matrixWorld));

          pco.material.heightMin = Math.min(corners[0].y, corners[1].y);
          pco.material.heightMax = Math.max(corners[0].y, corners[1].y);
        }

        console.log('[PotreeViewer] ✓ Restored material properties:', {
          heightMin: pco.material.heightMin,
          heightMax: pco.material.heightMax,
          hasGradient: !!savedProps.gradient
        });

        console.log('[PotreeViewer] ✅ Changed color type from', oldType, 'to', colorType);
        console.log('[PotreeViewer] Shader has color_type:',
          pco.material.vertexShader?.includes(`color_type_${Object.keys({
            0: 'rgb', 3: 'height', 4: 'intensity', 5: 'intensity_gradient',
            8: 'classification', 11: 'normal'
          })[colorType] || colorType}`));
      }
    }

    // Emit event for UI updates
    this.emit('color-type-changed', colorType);

    // CRITICAL: Force multiple renders to ensure shader recompilation
    // Three.js needs to detect missing program and then compile new shader
    if (this.renderer && this.scene && this.camera) {
      // First render - Three.js detects missing program
      this.renderer.render(this.scene, this.camera);

      // Force a second render on next frame to compile and use new shader
      requestAnimationFrame(() => {
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
          console.log('[PotreeViewer] ✓ Forced shader recompilation with second render');
        }
      });
    }
  }

  /**
   * Get current point color type
   * @returns {PointColorType} Current color type
   */
  getPointColorType() {
    if (this.pointClouds.length === 0) {
      return null;
    }
    return this.pointClouds[0].material?.pointColorType;
  }

  // ===== MEASUREMENT API =====

  /**
   * Set measurement mode
   * @param {string} mode - 'none' | 'distance' | 'height' | 'area' | 'volume'
   */
  setMeasurementMode(mode) {
    if (!this.measurementManager) {
      throw new Error('Measurement manager not initialized');
    }
    this.measurementManager.setMode(mode);
  }

  /**
   * Get current measurement mode
   * @returns {string} Current measurement mode
   */
  getMeasurementMode() {
    if (!this.measurementManager) return 'none';
    return this.measurementManager.getMode();
  }

  /**
   * Start a new measurement
   * @param {string} type - Measurement type ('distance', 'height', 'area', 'volume')
   * @returns {Object} Measurement object
   */
  startMeasurement(type) {
    if (!this.measurementManager) {
      throw new Error('Measurement manager not initialized');
    }
    return this.measurementManager.startMeasurement(type);
  }

  /**
   * Finish a measurement by ID
   * @param {string} id - Measurement ID
   */
  finishMeasurement(id) {
    if (!this.measurementManager) return;
    this.measurementManager.finishMeasurement(id);
  }

  /**
   * Get all measurements
   * @returns {Array} Array of measurement summaries
   */
  getMeasurements() {
    if (!this.measurementManager) return [];
    return this.measurementManager.getMeasurements();
  }

  /**
   * Clear all measurements
   */
  clearMeasurements() {
    if (!this.measurementManager) return;
    this.measurementManager.clearMeasurements();
  }

  /**
   * Remove a measurement by ID
   * @param {string} id - Measurement ID
   */
  removeMeasurement(id) {
    if (!this.measurementManager) return;
    this.measurementManager.removeMeasurement(id);
  }

  // ===== ADVANCED API =====

  /**
   * Get Potree instance (advanced use - escape hatch)
   * @returns {Potree} Potree instance
   */
  getPotree() {
    return this.potree;
  }

  /**
   * Get Three.js scene (advanced use)
   * @returns {THREE.Scene} Three.js scene
   */
  getScene() {
    return this.scene;
  }

  /**
   * Get Three.js camera (advanced use)
   * @returns {THREE.Camera} Three.js camera
   */
  getCamera() {
    return this.camera;
  }

  /**
   * Get Three.js renderer (advanced use)
   * @returns {THREE.WebGLRenderer} Three.js renderer
   */
  getRenderer() {
    return this.renderer;
  }

  /**
   * Dispose and clean up all resources
   */
  dispose() {
    if (this.isDisposed) return;

    this.isDisposed = true;

    // Stop animation loop
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Remove event listeners
    window.removeEventListener('resize', this._boundResizeHandler);
    this.removeAllListeners();

    // Dispose measurement manager
    if (this.measurementManager) {
      this.measurementManager.dispose();
      this.measurementManager = null;
    }

    // Dispose controls
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    // Dispose point clouds
    for (const pco of this.pointClouds) {
      if (pco.material) {
        pco.material.dispose();
      }
      if (pco.geometry) {
        pco.geometry.dispose();
      }
      this.scene.remove(pco);
    }
    this.pointClouds = [];

    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }

    // Clear scene
    if (this.scene) {
      this.scene = null;
    }

    this.camera = null;
    this.potree = null;
  }
}
