import { PointColorType } from 'potree-core';

/**
 * Toolbar component for PotreeViewer
 * Provides UI controls for measurements, views, and settings
 */
export class Toolbar {
  constructor(viewer, options = {}) {
    this.viewer = viewer;
    this.container = null;
    this.currentMeasurement = null;
    this.colorModeDropdown = null;

    // Store all dropdowns for mutual exclusion
    this.dropdowns = [];

    // SVG Icons from Lucide (https://lucide.dev) - MIT License
    const ICONS = {
      maximize: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
      x: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
      ruler: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>',
      moveVertical: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="m8 18 4 4 4-4"/><path d="m8 6 4-4 4 4"/></svg>',
      triangle: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>',
      circleDot: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/></svg>',
      box: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
      arrowLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
      arrowRight: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
      arrowDown: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>',
      arrowUp: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>',
      chevronUp: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
      chevronDown: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
      palette: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
      eye: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
      settings: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    };

    // Color modes available (most commonly used from potree-core)
    this.colorModes = [
      { id: PointColorType.RGB, label: 'RGB' },
      { id: PointColorType.ELEVATION, label: 'Elevation' },
      { id: PointColorType.CLASSIFICATION, label: 'Classification' },
      { id: PointColorType.INTENSITY, label: 'Intensity' },
      { id: PointColorType.INTENSITY_GRADIENT, label: 'Intensity Gradient' },
      { id: PointColorType.RETURN_NUMBER, label: 'Return Number' },
      { id: PointColorType.SOURCE, label: 'Source ID' },
      { id: PointColorType.NORMAL, label: 'Normal' },
      { id: PointColorType.LOD, label: 'Level of Detail' },
    ];

    // Background options
    this.backgrounds = [
      { id: 'black', label: 'Black' },
      { id: 'white', label: 'White' },
      { id: 'gradient', label: 'Gradient' },
      { id: 'skybox', label: 'Skybox' },
    ];

    // View options (for dropdown)
    this.viewOptions = [
      { id: 'left', label: 'Left View' },
      { id: 'right', label: 'Right View' },
      { id: 'front', label: 'Front View' },
      { id: 'back', label: 'Back View' },
      { id: 'top', label: 'Top View' },
      { id: 'bottom', label: 'Bottom View' },
    ];

    // Measurement options (for dropdown)
    this.measurementOptions = [
      { id: 'distance', label: 'Distance', icon: ICONS.ruler },
      { id: 'height', label: 'Height', icon: ICONS.moveVertical },
      { id: 'angle', label: 'Angle', icon: ICONS.triangle },
      { id: 'radius', label: 'Radius', icon: ICONS.circleDot, requiresTopView: true },
      { id: 'volume', label: 'Volume', icon: ICONS.box },
    ];

    // Default button groups - reorganized: View → Measurements → Settings
    const defaultButtons = [
      // View controls group
      { id: 'fit', group: 'view', label: 'Fit to Screen', icon: ICONS.maximize, action: () => this.viewer.fitToScreen() },
      { id: 'view-selector', group: 'view', label: 'View & Appearance', icon: ICONS.eye, type: 'view-dropdown', groupEnd: true },

      // Measurements group
      { id: 'measurements', group: 'measurement', label: 'Measurements', icon: ICONS.ruler, type: 'measurements-dropdown' },
      { id: 'clear', group: 'measurement', label: 'Clear Measurements', icon: ICONS.x, action: () => this._clearMeasurements(), groupEnd: true },

      // Settings group (single button)
      { id: 'settings', group: 'settings', label: 'Settings', icon: ICONS.settings, type: 'settings-dropdown', groupEnd: true },
    ];

    this.options = {
      alignment: options.alignment || 'top-right', // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'left' | 'right' | 'top' | 'bottom'
      buttons: options.buttons || defaultButtons,
      ...options
    };

    this._init();
  }

  /**
   * Initialize toolbar
   * @private
   */
  _init() {
    this._injectStyles();

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'potree-toolbar';
    this.container.dataset.alignment = this.options.alignment;

    // Create buttons
    this.options.buttons.forEach(btnConfig => {
      const button = this._createButton(btnConfig);
      this.container.appendChild(button);
    });

    // Add to viewer container
    this.viewer.container.appendChild(this.container);

    // Attach event listeners
    this._attachEventListeners();
  }

  /**
   * Set measurement mode
   * @private
   */
  _setMeasurementMode(mode) {
    this.viewer.setMeasurementMode(mode);
    this._updateButtonStates(mode);
  }

  /**
   * Update measurement button active states
   * @private
   */
  _updateButtonStates(activeMode) {
    const buttons = this.container.querySelectorAll('.potree-toolbar-button[data-mode]');
    buttons.forEach(btn => {
      if (btn.dataset.mode === activeMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /**
   * Close all dropdowns
   * @private
   */
  _closeAllDropdowns() {
    this.dropdowns.forEach(dropdown => {
      if (dropdown && dropdown.menu) {
        dropdown.menu.style.display = 'none';
      }
    });
  }

  /**
   * Position dropdown menu to avoid overflow
   * @private
   */
  _positionDropdown(menu, button) {
    // Reset positioning
    menu.style.left = '0';
    menu.style.right = 'auto';

    // Wait for next frame to get accurate measurements
    requestAnimationFrame(() => {
      const menuRect = menu.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      // Check if menu overflows on the right side
      const overflowRight = menuRect.right > viewportWidth;

      if (overflowRight) {
        // Align to right edge of button
        menu.style.left = 'auto';
        menu.style.right = '0';
      }
    });
  }

  /**
   * Clear all measurements
   * @private
   */
  _clearMeasurements() {
    this.viewer.clearMeasurements();

    // Exit measurement mode completely
    this.viewer.setMeasurementMode('none');

    // Remove active state from all measurement buttons
    const buttons = this.container.querySelectorAll('.potree-toolbar-button[data-mode]');
    buttons.forEach(btn => btn.classList.remove('active'));
  }

  /**
   * Create a button from configuration
   * @private
   */
  _createButton(config) {
    // Handle different dropdown types
    if (config.type === 'view-dropdown') {
      const dropdown = this._createViewDropdown(config);
      if (config.groupEnd) dropdown.classList.add('group-end');
      return dropdown;
    }
    if (config.type === 'measurements-dropdown') {
      const dropdown = this._createMeasurementsDropdown(config);
      if (config.groupEnd) dropdown.classList.add('group-end');
      return dropdown;
    }
    if (config.type === 'settings-dropdown') {
      const dropdown = this._createSettingsDropdown(config);
      if (config.groupEnd) dropdown.classList.add('group-end');
      return dropdown;
    }

    const button = document.createElement('button');
    button.className = 'potree-toolbar-button';
    button.title = config.label; // Tooltip

    // Add group-end class if this is the last button in a group
    if (config.groupEnd) {
      button.classList.add('group-end');
    }

    // Add icon (SVG or text)
    const iconSpan = document.createElement('span');
    iconSpan.className = 'potree-button-icon';
    iconSpan.innerHTML = config.icon;
    button.appendChild(iconSpan);

    // Add data attribute for measurement modes
    if (config.group === 'measurement') {
      button.dataset.mode = config.id;
    }

    button.onclick = (e) => {
      e.stopPropagation();
      if (!button.disabled) {
        config.action();
      }
    };

    // Store reference to clear button
    if (config.id === 'clear') {
      this.clearButton = button;
      // Start disabled (no measurements initially)
      button.disabled = true;
    }

    return button;
  }

  /**
   * Create settings dropdown with sliders and options
   * @private
   */
  _createSettingsDropdown(config) {
    const container = document.createElement('div');
    container.className = 'potree-settings-dropdown';
    container.style.cssText = 'position: relative;';

    // Create dropdown button
    const button = document.createElement('button');
    button.className = 'potree-toolbar-button';
    button.title = config.label;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'potree-button-icon';
    iconSpan.innerHTML = config.icon;
    button.appendChild(iconSpan);

    // Create dropdown menu
    const menu = document.createElement('div');
    menu.className = 'potree-dropdown-menu settings-menu';

    // Helper to create slider control
    const createSlider = (label, min, max, step, defaultValue, onChange) => {
      const sliderContainer = document.createElement('div');
      sliderContainer.style.cssText = 'margin-bottom: 12px;';

      const labelRow = document.createElement('div');
      labelRow.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      `;

      const labelSpan = document.createElement('span');
      labelSpan.textContent = label;
      labelSpan.style.cssText = `
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
      `;

      const valueSpan = document.createElement('span');
      valueSpan.textContent = defaultValue;
      valueSpan.style.cssText = `
        font-size: 12px;
        color: rgba(52, 152, 219, 1);
        font-weight: 600;
      `;

      labelRow.appendChild(labelSpan);
      labelRow.appendChild(valueSpan);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = min;
      slider.max = max;
      slider.step = step;
      slider.value = defaultValue;
      slider.style.cssText = `
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        outline: none;
        border-radius: 2px;
        -webkit-appearance: none;
      `;

      // Custom thumb styles
      const styleSheet = document.styleSheets[0];
      if (!document.getElementById('slider-thumb-styles')) {
        const style = document.createElement('style');
        style.id = 'slider-thumb-styles';
        style.textContent = `
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #3498db;
            cursor: pointer;
            border: 2px solid rgba(255, 255, 255, 0.9);
          }
          input[type="range"]::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #3498db;
            cursor: pointer;
            border: 2px solid rgba(255, 255, 255, 0.9);
          }
        `;
        document.head.appendChild(style);
      }

      slider.oninput = (e) => {
        const value = parseFloat(e.target.value);
        // Use toLocaleString for large numbers (like point budget), toFixed for decimals
        if (step >= 1000) {
          valueSpan.textContent = Math.round(value).toLocaleString();
        } else {
          valueSpan.textContent = value.toFixed(step < 1 ? 2 : 0);
        }
        onChange(value);
      };

      sliderContainer.appendChild(labelRow);
      sliderContainer.appendChild(slider);

      return { container: sliderContainer, slider, valueSpan };
    };

    // Helper to create dropdown select
    const createSelect = (label, options, defaultValue, onChange) => {
      const selectContainer = document.createElement('div');
      selectContainer.style.cssText = 'margin-bottom: 12px;';

      const labelSpan = document.createElement('div');
      labelSpan.textContent = label;
      labelSpan.style.cssText = `
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 6px;
      `;

      const select = document.createElement('select');
      select.style.cssText = `
        width: 100%;
        padding: 6px 8px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.9);
        font-size: 12px;
        cursor: pointer;
        outline: none;
      `;

      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        option.style.cssText = 'background: #2c3e50; color: white;';
        if (opt.value === defaultValue) {
          option.selected = true;
        }
        select.appendChild(option);
      });

      select.onchange = (e) => {
        onChange(e.target.value);
      };

      selectContainer.appendChild(labelSpan);
      selectContainer.appendChild(select);

      return { container: selectContainer, select };
    };

    // Get current material settings
    const getMaterial = () => {
      if (this.viewer.pointClouds && this.viewer.pointClouds.length > 0) {
        return this.viewer.pointClouds[0].material;
      }
      return null;
    };

    // Get initial values (might be null if point cloud not loaded yet)
    const material = getMaterial();
    const defaultSize = material ? material.size : 0.6;

    // Determine current shape (SQUARE=0, CIRCLE=1)
    const currentShape = material && material.shape === 1 ? 'circle' : 'square';

    // Determine current size type (FIXED=0, ATTENUATED=1, ADAPTIVE=2)
    let currentSizeType = 'fixed';
    if (material) {
      if (material.pointSizeType === 1) currentSizeType = 'attenuated';
      else if (material.pointSizeType === 2) currentSizeType = 'adaptive';
    }

    // Point Budget slider - use actual point budget from potree instance
    const currentBudget = this.viewer.getPointBudget();
    const totalPoints = this.viewer.getTotalPoints() || 10_000_000;
    // Round max up to next 100,000 for cleaner slider
    const maxBudget = Math.ceil(Math.max(totalPoints, currentBudget, 1_000_000) / 100_000) * 100_000;
    
    const budgetControl = createSlider('Point Budget', 100000, maxBudget, 100000, currentBudget, (value) => {
      this.viewer.setPointBudget(value);
    });
    menu.appendChild(budgetControl.container);

    // FOV slider
    const fovControl = createSlider('Field of View', 20, 100, 1, this.viewer.config.fov, (value) => {
      this.viewer.setFov(value);
    });
    menu.appendChild(fovControl.container);

    // Point Size slider - will be updated when dropdown opens
    const sizeControl = createSlider('Point Size', 0.1, 5.0, 0.1, defaultSize, (value) => {
      this.viewer.setPointSize(value);
    });
    menu.appendChild(sizeControl.container);

    // Point Shape dropdown
    const shapeControl = createSelect('Point Shape', [
      { value: 'square', label: 'Square' },
      { value: 'circle', label: 'Circle' }
    ], currentShape, (value) => {
      this.viewer.setPointShape(value);
    });
    menu.appendChild(shapeControl.container);

    // Point Size Type dropdown
    // Note: Adaptive mode may not work optimally with potree-core
    const sizeTypeControl = createSelect('Point Size Type', [
      { value: 'fixed', label: 'Fixed' },
      { value: 'attenuated', label: 'Attenuated' },
      { value: 'adaptive', label: 'Adaptive (experimental)' }
    ], currentSizeType, (value) => {
      this.viewer.setPointSizeType(value);
    });
    menu.appendChild(sizeTypeControl.container);

    // Prevent dropdown from closing when clicking inside
    menu.onclick = (e) => {
      e.stopPropagation();
    };

    // Toggle dropdown on button click
    button.onclick = (e) => {
      e.stopPropagation();
      const isVisible = menu.style.display === 'block';

      // Close all other dropdowns first
      this._closeAllDropdowns();

      // Then toggle this one
      menu.style.display = isVisible ? 'none' : 'block';

      // Update all controls with current values when opening
      if (!isVisible) {
        const mat = getMaterial();
        if (mat) {
          // Update size slider
          sizeControl.slider.value = mat.size;
          sizeControl.valueSpan.textContent = mat.size.toFixed(1);

          // Update shape dropdown (SQUARE=0, CIRCLE=1)
          shapeControl.select.value = mat.shape === 1 ? 'circle' : 'square';

          // Update size type dropdown (FIXED=0, ATTENUATED=1, ADAPTIVE=2)
          let sizeTypeValue = 'fixed';
          if (mat.pointSizeType === 1) sizeTypeValue = 'attenuated';
          else if (mat.pointSizeType === 2) sizeTypeValue = 'adaptive';
          sizeTypeControl.select.value = sizeTypeValue;
        }

        // Update budget slider with actual value from potree
        const actualBudget = this.viewer.getPointBudget();
        const totalPts = this.viewer.getTotalPoints() || 10_000_000;
        // Round max up to next 100,000 for cleaner slider
        const maxBudgetValue = Math.ceil(Math.max(totalPts, actualBudget, 1_000_000) / 100_000) * 100_000;
        
        // Update max attribute BEFORE setting value (important for range inputs)
        budgetControl.slider.setAttribute('max', maxBudgetValue);
        budgetControl.slider.max = maxBudgetValue;
        budgetControl.slider.value = actualBudget;
        budgetControl.valueSpan.textContent = actualBudget.toLocaleString();
        
        console.log('[Toolbar] Budget slider updated:', { actualBudget, totalPts, maxBudgetValue });

        // Update FOV slider
        fovControl.slider.value = this.viewer.config.fov;
        fovControl.valueSpan.textContent = this.viewer.config.fov;

        // Position dropdown intelligently
        this._positionDropdown(menu, button);
      }
    };

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      menu.style.display = 'none';
    });

    container.appendChild(button);
    container.appendChild(menu);

    // Store reference
    this.settingsDropdown = { container, menu, button, sizeControl, budgetControl, fovControl };
    this.dropdowns.push(this.settingsDropdown);

    return container;
  }

  /**
   * Create view dropdown
   * @private
   */
  _createViewDropdown(config) {
    const container = document.createElement('div');
    container.className = 'potree-view-dropdown';
    container.style.cssText = 'position: relative;';

    // Create dropdown button
    const button = document.createElement('button');
    button.className = 'potree-toolbar-button';
    button.title = config.label;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'potree-button-icon';
    iconSpan.innerHTML = config.icon;
    button.appendChild(iconSpan);

    // Create dropdown menu
    const menu = document.createElement('div');
    menu.className = 'potree-dropdown-menu view-menu';

    // Add section header for Views
    const viewHeader = document.createElement('div');
    viewHeader.className = 'potree-dropdown-header';
    viewHeader.textContent = 'Camera Views';
    menu.appendChild(viewHeader);

    // Add view options
    this.viewOptions.forEach(view => {
      const option = document.createElement('button');
      option.className = 'potree-dropdown-option';
      option.textContent = view.label;
      option.dataset.view = view.id;

      option.onclick = (e) => {
        e.stopPropagation();
        this.viewer.setNamedView(view.id);
        menu.style.display = 'none';
      };

      menu.appendChild(option);
    });

    // Add divider
    const divider1 = document.createElement('div');
    divider1.className = 'potree-dropdown-divider';
    menu.appendChild(divider1);

    // Add section header for Color Modes
    const colorHeader = document.createElement('div');
    colorHeader.className = 'potree-dropdown-header';
    colorHeader.textContent = 'Point Color Mode';
    menu.appendChild(colorHeader);

    // Add color mode options
    this.colorModes.forEach(mode => {
      const option = document.createElement('button');
      option.className = 'potree-dropdown-option';
      option.textContent = mode.label;
      option.dataset.colorMode = mode.id;

      option.onclick = (e) => {
        e.stopPropagation();
        this.viewer.setPointColorType(mode.id);
        menu.style.display = 'none';

        // Update active state - only for color mode options
        menu.querySelectorAll('[data-color-mode]').forEach(opt => {
          opt.classList.remove('active');
        });
        option.classList.add('active');
      };

      menu.appendChild(option);
    });

    // Add divider
    const divider2 = document.createElement('div');
    divider2.className = 'potree-dropdown-divider';
    menu.appendChild(divider2);

    // Add section header for Backgrounds
    const bgHeader = document.createElement('div');
    bgHeader.className = 'potree-dropdown-header';
    bgHeader.textContent = 'Background';
    menu.appendChild(bgHeader);

    // Add background options
    this.backgrounds.forEach(bg => {
      const option = document.createElement('button');
      option.className = 'potree-dropdown-option';
      option.textContent = bg.label;
      option.dataset.background = bg.id;

      option.onclick = (e) => {
        e.stopPropagation();
        this.viewer.setBackground(bg.id);
        menu.style.display = 'none';

        // Update active state - only for background options
        menu.querySelectorAll('[data-background]').forEach(opt => {
          opt.classList.remove('active');
        });
        option.classList.add('active');
      };

      menu.appendChild(option);
    });

    // Toggle dropdown on button click
    button.onclick = (e) => {
      e.stopPropagation();
      const isVisible = menu.style.display === 'block';

      // Close all other dropdowns first
      this._closeAllDropdowns();

      // Then toggle this one
      menu.style.display = isVisible ? 'none' : 'block';

      // Position dropdown intelligently
      if (!isVisible) {
        this._positionDropdown(menu, button);
      }
    };

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      menu.style.display = 'none';
    });

    container.appendChild(button);
    container.appendChild(menu);

    // Store reference
    this.viewDropdown = { container, menu, button };
    this.dropdowns.push(this.viewDropdown);

    return container;
  }

  /**
   * Create measurements dropdown
   * @private
   */
  _createMeasurementsDropdown(config) {
    const container = document.createElement('div');
    container.className = 'potree-measurements-dropdown';
    container.style.cssText = 'position: relative;';

    // Create dropdown button
    const button = document.createElement('button');
    button.className = 'potree-toolbar-button';
    button.title = config.label;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'potree-button-icon';
    iconSpan.innerHTML = config.icon;
    button.appendChild(iconSpan);

    // Create dropdown menu
    const menu = document.createElement('div');
    menu.className = 'potree-dropdown-menu measurements-menu';

    // Add section header
    const header = document.createElement('div');
    header.className = 'potree-dropdown-header';
    header.textContent = 'Measurements';
    menu.appendChild(header);

    // Add measurement options
    this.measurementOptions.forEach(measurement => {
      const option = document.createElement('button');
      option.className = 'potree-dropdown-option';
      option.textContent = measurement.label;
      option.dataset.measurement = measurement.id;

      option.onclick = (e) => {
        e.stopPropagation();
        this._setMeasurementMode(measurement.id);
        menu.style.display = 'none';

        // Update active state
        menu.querySelectorAll('[data-measurement]').forEach(opt => {
          opt.classList.remove('active');
        });
        option.classList.add('active');
      };

      menu.appendChild(option);
    });

    // Toggle dropdown on button click
    button.onclick = (e) => {
      e.stopPropagation();
      const isVisible = menu.style.display === 'block';

      // Close all other dropdowns first
      this._closeAllDropdowns();

      // Then toggle this one
      menu.style.display = isVisible ? 'none' : 'block';

      // Position dropdown intelligently
      if (!isVisible) {
        this._positionDropdown(menu, button);
      }
    };

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      menu.style.display = 'none';
    });

    container.appendChild(button);
    container.appendChild(menu);

    // Store reference
    this.measurementsDropdown = { container, menu, button };
    this.dropdowns.push(this.measurementsDropdown);

    return container;
  }

  /**
   * Attach event listeners to viewer
   * @private
   */
  _attachEventListeners() {
    // Update button states when measurement mode changes
    this.viewer.on('measurement-started', (measurement) => {
      this._updateButtonStates(measurement.type);
      this._updateMeasurementsDropdown(measurement.type);
      this._updateClearButtonState();
    });

    this.viewer.on('measurement-mode-changed', (mode) => {
      this._updateButtonStates(mode);
      this._updateMeasurementsDropdown(mode);
    });

    // Update clear button state when measurements change
    this.viewer.on('measurement-added', () => {
      this._updateClearButtonState();
    });

    this.viewer.on('measurement-removed', () => {
      this._updateClearButtonState();
    });

    this.viewer.on('measurements-cleared', () => {
      this._updateClearButtonState();
    });

    // Enable clear button as soon as user adds a point to any measurement
    this.viewer.on('measurement-updated', () => {
      this._updateClearButtonState();
    });

    // Update appearance dropdown when color type changes
    this.viewer.on('color-type-changed', (colorType) => {
      this._updateAppearanceDropdown(colorType);
    });

    // Initialize appearance dropdown with current color type
    this.viewer.on('pointcloud-loaded', () => {
      const currentColorType = this.viewer.getPointColorType();
      if (currentColorType !== undefined) {
        this._updateAppearanceDropdown(currentColorType);
      }

      // Also update settings dropdown with actual material values
      this._updateSettingsDropdown();
    });

    // Update appearance dropdown when background changes
    this.viewer.on('background-changed', (background) => {
      this._updateBackgroundSelection(background);
    });

    // Show error message for measurement errors (e.g., radius requires top view)
    this.viewer.on('measurement-error', (error) => {
      this._showTemporaryMessage(error.message, 'error');
    });

    // Show warning message for measurement warnings
    this.viewer.on('measurement-warning', (warning) => {
      this._showTemporaryMessage(warning.message, 'warning');
    });
  }

  /**
   * Show a temporary message to the user
   * @param {string} message - Message to display
   * @param {string} type - 'error' or 'warning'
   * @private
   */
  _showTemporaryMessage(message, type = 'error') {
    const bgColor = type === 'warning' 
      ? 'rgba(255, 180, 50, 0.9)'  // Orange/yellow for warning
      : 'rgba(255, 100, 100, 0.9)'; // Red for error
    
    // Create message element
    const msgEl = document.createElement('div');
    msgEl.textContent = message;
    msgEl.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      pointer-events: none;
      animation: fadeInOut 3s ease-in-out forwards;
    `;

    // Add animation keyframes if not exists
    if (!document.getElementById('temp-message-styles')) {
      const style = document.createElement('style');
      style.id = 'temp-message-styles';
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        }
      `;
      document.head.appendChild(style);
    }

    this.viewer.container.appendChild(msgEl);

    // Remove after animation
    setTimeout(() => {
      msgEl.remove();
    }, 3000);
  }

  /**
   * Update view dropdown to highlight active color type
   * @private
   */
  _updateAppearanceDropdown(colorType) {
    if (!this.viewDropdown || !this.viewDropdown.menu) {
      return;
    }

    const options = this.viewDropdown.menu.querySelectorAll('[data-color-mode]');
    options.forEach(option => {
      if (parseInt(option.dataset.colorMode) === colorType) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
  }

  /**
   * Update view dropdown to highlight active background
   * @private
   */
  _updateBackgroundSelection(background) {
    if (!this.viewDropdown || !this.viewDropdown.menu) {
      return;
    }

    const options = this.viewDropdown.menu.querySelectorAll('[data-background]');
    options.forEach(option => {
      if (option.dataset.background === background) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
  }

  /**
   * Update settings dropdown with current material values
   * @private
   */
  _updateSettingsDropdown() {
    console.log('[Toolbar] _updateSettingsDropdown called, settingsDropdown:', this.settingsDropdown);
    
    if (!this.settingsDropdown) {
      console.log('[Toolbar] settingsDropdown not yet created, skipping update');
      return;
    }

    // Get current material
    const material = this.viewer.pointClouds?.[0]?.material;
    
    // Update size slider display (but not the actual slider value yet - will update when opened)
    if (this.settingsDropdown.sizeControl && material) {
      this.settingsDropdown.sizeControl.valueSpan.textContent = material.size.toFixed(1);
    }

    // Update budget slider with actual values from loaded point cloud
    if (this.settingsDropdown.budgetControl) {
      const actualBudget = this.viewer.getPointBudget();
      const totalPts = this.viewer.getTotalPoints() || 10_000_000;
      // Round max up to next 100,000 for cleaner slider
      const maxBudgetValue = Math.ceil(Math.max(totalPts, actualBudget, 1_000_000) / 100_000) * 100_000;
      
      console.log('[Toolbar] Updating budget slider:', { actualBudget, totalPts, maxBudgetValue, currentSliderValue: this.settingsDropdown.budgetControl.slider.value });
      
      // Update max attribute and value
      this.settingsDropdown.budgetControl.slider.setAttribute('max', maxBudgetValue);
      this.settingsDropdown.budgetControl.slider.max = maxBudgetValue;
      this.settingsDropdown.budgetControl.slider.value = actualBudget;
      this.settingsDropdown.budgetControl.valueSpan.textContent = actualBudget.toLocaleString();
      
      console.log('[Toolbar] Budget slider updated on pointcloud-loaded:', { actualBudget, totalPts, maxBudgetValue });
    } else {
      console.log('[Toolbar] budgetControl not found in settingsDropdown');
    }
  }

  /**
   * Update measurements dropdown to highlight active measurement type
   * @private
   */
  _updateMeasurementsDropdown(measurementType) {
    if (!this.measurementsDropdown || !this.measurementsDropdown.menu) {
      return;
    }

    const options = this.measurementsDropdown.menu.querySelectorAll('[data-measurement]');
    options.forEach(option => {
      if (option.dataset.measurement === measurementType) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
  }

  /**
   * Update clear button disabled state based on measurements
   * @private
   */
  _updateClearButtonState() {
    if (!this.clearButton) {
      return;
    }

    // Check if there are any measurements with at least one point
    const measurements = this.viewer.getMeasurements();
    const hasMeasurements = measurements && measurements.some(m => m.points && m.points.length > 0);
    this.clearButton.disabled = !hasMeasurements;
  }

  /**
   * Inject CSS styles
   * @private
   */
  _injectStyles() {
    if (document.getElementById('potree-toolbar-styles')) return;

    const style = document.createElement('style');
    style.id = 'potree-toolbar-styles';
    style.textContent = `
      .potree-toolbar {
        position: absolute;
        display: flex;
        gap: 0px;
        padding: 10px;
        z-index: 1000;
      }

      /* Alignment positioning */
      .potree-toolbar[data-alignment="top-left"] {
        top: 0;
        left: 0;
        flex-direction: row;
      }

      .potree-toolbar[data-alignment="top-right"] {
        top: 0;
        right: 0;
        flex-direction: row;
      }

      .potree-toolbar[data-alignment="bottom-left"] {
        bottom: 0;
        left: 0;
        flex-direction: row;
      }

      .potree-toolbar[data-alignment="bottom-right"] {
        bottom: 0;
        right: 0;
        flex-direction: row;
      }

      .potree-toolbar[data-alignment="left"] {
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        flex-direction: column;
      }

      .potree-toolbar[data-alignment="right"] {
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        flex-direction: column;
      }

      .potree-toolbar[data-alignment="top"] {
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        flex-direction: row;
      }

      .potree-toolbar[data-alignment="bottom"] {
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        flex-direction: row;
      }

      /* Button styles */
      .potree-toolbar-button {
        width: 42px;
        height: 42px;
        padding: 0;
        border: none;
        background: rgba(40, 44, 52, 0.85);
        backdrop-filter: blur(10px);
        color: rgba(255, 255, 255, 0.85);
        border-radius: 0;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: none;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-right: none;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }

      /* Handle dropdown containers */
      .potree-settings-dropdown,
      .potree-view-dropdown,
      .potree-measurements-dropdown {
        display: inline-block;
      }

      /* First button in toolbar or first in a group after spacing */
      .potree-toolbar > button:first-child,
      .potree-toolbar > div:first-child .potree-toolbar-button,
      .potree-toolbar > .group-end + button,
      .potree-toolbar > .group-end + div .potree-toolbar-button {
        border-top-left-radius: 8px;
        border-bottom-left-radius: 8px;
      }

      /* Last button in a group (has group-end class) */
      .potree-toolbar-button.group-end,
      .potree-settings-dropdown.group-end .potree-toolbar-button,
      .potree-view-dropdown.group-end .potree-toolbar-button,
      .potree-measurements-dropdown.group-end .potree-toolbar-button {
        border-right: 1px solid rgba(255, 255, 255, 0.08);
        border-top-right-radius: 8px;
        border-bottom-right-radius: 8px;
      }

      /* Add spacing after groups */
      .potree-toolbar-button.group-end,
      .potree-settings-dropdown.group-end,
      .potree-view-dropdown.group-end,
      .potree-measurements-dropdown.group-end {
        margin-right: 8px;
      }

      /* Shared shadow for entire group */
      .potree-toolbar > button,
      .potree-toolbar > div {
        filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15));
      }

      .potree-toolbar-button:hover {
        background: rgba(52, 152, 219, 0.9);
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      .potree-toolbar-button.active {
        background: #3498db;
        color: white;
        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.25);
      }

      .potree-toolbar-button.active:hover {
        background: #2980b9;
      }

      .potree-toolbar-button:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        pointer-events: none;
      }

      .potree-button-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      .potree-button-icon svg {
        width: 20px;
        height: 20px;
        stroke: currentColor;
        stroke-width: 1.8;
      }

      /* Dropdown menu styles */
      .potree-dropdown-menu {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        background: rgba(40, 44, 52, 0.95);
        backdrop-filter: blur(8px);
        border-radius: 6px;
        padding: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        min-width: 140px;
        z-index: 10000;
        margin-left: -3px;
        margin-top: 10px;
      }

      .potree-dropdown-menu.settings-menu {
        min-width: 240px;
        padding: 8px;
      }

      .potree-dropdown-menu.measurements-menu {
        min-width: 140px;
        padding: 4px;
      }

      .potree-dropdown-menu.view-menu {
        min-width: 200px;
        padding: 4px;
      }

      /* Dropdown option buttons */
      .potree-dropdown-option {
        display: block;
        width: 100%;
        padding: 8px 12px;
        border: none;
        background: transparent;
        color: rgba(255, 255, 255, 0.85);
        text-align: left;
        cursor: pointer;
        border-radius: 4px;
        font-size: 13px;
        transition: background 0.15s ease;
      }

      .potree-dropdown-option:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .potree-dropdown-option.active {
        background: rgba(52, 152, 219, 0.3);
      }

      /* Dropdown section headers */
      .potree-dropdown-header {
        padding: 6px 12px 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.5);
        letter-spacing: 0.5px;
      }

      /* Dropdown divider */
      .potree-dropdown-divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 6px 0;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Dispose and clean up
   */
  dispose() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }
}
