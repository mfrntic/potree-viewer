/**
 * Default configuration for PotreeViewer
 */
export const DEFAULT_CONFIG = {
  // Point cloud settings
  pointCloudUrl: null,
  pointCloudName: 'pointcloud',
  description: '',

  // Viewer settings
  pointBudget: 'auto', // 'auto' = use total points from metadata, or set a specific number
  fov: 80,

  // Eye-Dome Lighting (EDL) settings
  edl: {
    enabled: false,
    pointCloudLayer: 1,
    strength: 0.4,
    radius: 1.4,
    opacity: 1.0,
    neighbourCount: 8,
  },

  // Initial view
  initialView: 'right', // 'top' | 'front' | 'right' | 'isometric' | { position, target }

  // Material settings
  material: {
    size: 0.6,
    minSize: 0.4,
    pointSizeType: 'FIXED', // 'FIXED' | 'ATTENUATED' | 'ADAPTIVE'
    shape: 'SQUARE', // 'SQUARE' | 'CIRCLE'
  },

  // Background
  background: 'black', // 'black' | 'white' | 'gradient' | hex color

  // Behavior
  autoFitOnLoad: true,
  loadSettingsFromUrl: false,

  // Callbacks
  onReady: null,
  onPointCloudLoaded: null,
  onError: null,
};

/**
 * Merge user options with default configuration
 * @param {Object} userOptions - User provided options
 * @returns {Object} Merged configuration
 */
export function mergeConfig(userOptions = {}) {
  const config = { ...DEFAULT_CONFIG };

  // Merge top-level properties
  for (const key in userOptions) {
    if (userOptions[key] !== undefined) {
      if (key === 'material' && typeof userOptions[key] === 'object') {
        // Deep merge material config
        config.material = {
          ...DEFAULT_CONFIG.material,
          ...userOptions[key],
        };
      } else if (key === 'edl' && typeof userOptions[key] === 'object') {
        // Deep merge EDL config
        config.edl = {
          ...DEFAULT_CONFIG.edl,
          ...userOptions[key],
        };
      } else {
        config[key] = userOptions[key];
      }
    }
  }

  return config;
}

/**
 * Validate required configuration options
 * @param {Object} config - Configuration object
 * @throws {Error} If validation fails
 */
export function validateConfig(config) {
  if (!config.container) {
    throw new Error('PotreeViewer: "container" is required');
  }

  if (!(config.container instanceof HTMLElement)) {
    throw new Error('PotreeViewer: "container" must be an HTMLElement');
  }

  if (config.pointCloudUrl && typeof config.pointCloudUrl !== 'string') {
    throw new Error('PotreeViewer: "pointCloudUrl" must be a string');
  }

  // pointBudget can be 'auto' or a positive number
  if (config.pointBudget !== 'auto' && (typeof config.pointBudget !== 'number' || config.pointBudget <= 0)) {
    throw new Error('PotreeViewer: "pointBudget" must be "auto" or a positive number');
  }

  if (typeof config.fov !== 'number' || config.fov <= 0 || config.fov >= 180) {
    throw new Error('PotreeViewer: "fov" must be between 0 and 180');
  }
}
