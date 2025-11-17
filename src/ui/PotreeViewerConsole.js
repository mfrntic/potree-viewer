/**
 * PotreeViewerConsole - Mini console for viewer status and messages
 * Displays viewer events, measurements, errors in a compact format
 */
export class PotreeViewerConsole {
  constructor(viewer, options = {}) {
    this.viewer = viewer;
    this.container = null;
    this.messages = [];
    this.maxMessages = options.maxMessages || 50;

    // Log levels: 'debug' | 'info' | 'warning' | 'error'
    // Each level includes all levels above it (error > warning > info > debug)
    this.LOG_LEVELS = {
      debug: 0,
      info: 1,
      warning: 2,
      error: 3,
      none: 999 // Disable all logging
    };

    this.options = {
      position: options.position || 'bottom-left', // 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
      width: options.width || '320px',
      collapsed: options.collapsed || false,
      showTimestamp: options.showTimestamp !== false,
      visible: options.visible !== false, // Show by default
      logLevel: options.logLevel || 'info', // 'debug' | 'info' | 'warning' | 'error' | 'none'
      ...options
    };

    this._init();
    this._attachEventListeners();

    // Register console with viewer
    if (this.viewer && typeof this.viewer._setConsole === 'function') {
      this.viewer._setConsole(this);
    }

    // Apply initial visibility
    if (!this.options.visible) {
      this.hide();
    }
  }

  /**
   * Initialize InfoBar HTML
   * @private
   */
  _init() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'potree-console';
    this.container.style.cssText = this._getContainerStyles();

    // Create header
    const header = document.createElement('div');
    header.className = 'potree-console-header';
    header.innerHTML = `
      <span class="potree-console-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        Console
      </span>
      <div class="potree-console-actions">
        <select class="potree-console-loglevel" id="loglevel-select" title="Log level">
          <option value="debug">Debug</option>
          <option value="info" selected>Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="none">None</option>
        </select>
        <button class="potree-console-btn" id="clear-btn" title="Clear console">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
        <button class="potree-console-btn" id="toggle-btn" title="Toggle console">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
      </div>
    `;

    // Create messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'potree-console-messages';
    messagesContainer.id = 'console-messages';

    this.container.appendChild(header);
    this.container.appendChild(messagesContainer);

    // Inject styles
    this._injectStyles();

    // Add to viewer container
    this.viewer.container.appendChild(this.container);

    // Attach header events
    header.querySelector('#clear-btn').onclick = () => this.clear();
    header.querySelector('#toggle-btn').onclick = () => this.toggle();

    // Log level dropdown
    const logLevelSelect = header.querySelector('#loglevel-select');
    logLevelSelect.value = this.options.logLevel; // Set initial value
    logLevelSelect.onchange = (e) => {
      this.setLogLevel(e.target.value);
    };

    // Initial collapsed state
    if (this.options.collapsed) {
      this.container.classList.add('collapsed');
    }

    // Add initial message
    this.log('Viewer initialized', 'info');
  }

  /**
   * Get container position styles
   * @private
   */
  _getContainerStyles() {
    const baseStyles = `
      position: absolute;
      width: ${this.options.width};
      z-index: 1000;
      pointer-events: auto;
    `;

    const positionMap = {
      'bottom-left': 'bottom: 12px; left: 12px;',
      'bottom-right': 'bottom: 12px; right: 12px;',
      'top-left': 'top: 12px; left: 12px;',
      'top-right': 'top: 12px; right: 12px;',
    };

    return baseStyles + (positionMap[this.options.position] || positionMap['bottom-left']);
  }

  /**
   * Attach event listeners to viewer
   * @private
   */
  _attachEventListeners() {
    // Viewer events
    this.viewer.on('measurement-started', (measurement) => {
      this.log(`Measuring ${measurement.type}...`, 'info');
    });

    this.viewer.on('measurement-finished', (measurement) => {
      console.log('PotreeViewerConsole: measurement-finished event received:', measurement);
      let message = `✓ ${this._formatMeasurementResult(measurement)}`;
      this.log(message, 'success');
    });

    this.viewer.on('measurement-mode-changed', (mode) => {
      if (mode === 'none') {
        this.log('Measurement mode deactivated', 'info');
      } else {
        this.log(`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode active`, 'info');
      }
    });

    this.viewer.on('measurement-cleared', () => {
      this.log('All measurements cleared', 'warning');
    });

    this.viewer.on('view-changed', (info) => {
      if (info.view) {
        this.log(`View: ${info.view}`, 'info');
      }
    });

    this.viewer.on('error', (error) => {
      this.log(`Error: ${error.message}`, 'error');
    });
  }

  /**
   * Format measurement result for display
   * @private
   */
  _formatMeasurementResult(measurement) {
    if (!measurement || !measurement.result) {
      console.warn('PotreeViewerConsole: Invalid measurement object:', measurement);
      return 'Measurement complete (no result)';
    }

    const result = measurement.result;

    switch (measurement.type) {
      case 'distance':
        return result.distanceTotal
          ? `Distance: ${result.distanceTotal.toFixed(2)} m`
          : 'Distance: 0.00 m';
      case 'height':
        return result.height !== undefined
          ? `Height: ${result.height.toFixed(2)} m`
          : 'Height: 0.00 m';
      case 'angle':
        return result.angleDegrees !== undefined
          ? `Angle: ${result.angleDegrees.toFixed(1)}°`
          : 'Angle: 0.0°';
      case 'radius':
        return result.radius !== undefined
          ? `Radius: ${result.radius.toFixed(2)} m`
          : 'Radius: 0.00 m';
      case 'volume':
        return result.volume !== undefined
          ? `Volume: ${result.volume.toFixed(2)} m³`
          : 'Volume: 0.00 m³';
      default:
        return `Measurement complete`;
    }
  }

  /**
   * Add a log message
   * @param {string} message - The message text
   * @param {string} type - Message type: 'debug' | 'info' | 'success' | 'warning' | 'error'
   */
  log(message, type = 'info') {
    // Map 'success' to 'info' for level filtering
    const logLevel = type === 'success' ? 'info' : type;

    // Filter based on log level
    if (this._shouldLog(logLevel)) {
      this._addMessage(message, type);
    }
  }

  /**
   * Add a debug message (only shown if logLevel is 'debug')
   * @param {string} message - The message text
   */
  debug(message) {
    if (this._shouldLog('debug')) {
      this._addMessage(message, 'debug');
    }
  }

  /**
   * Add an info message
   * @param {string} message - The message text
   */
  info(message) {
    if (this._shouldLog('info')) {
      this._addMessage(message, 'info');
    }
  }

  /**
   * Add a warning message
   * @param {string} message - The message text
   */
  warn(message) {
    if (this._shouldLog('warning')) {
      this._addMessage(message, 'warning');
    }
  }

  /**
   * Add an error message
   * @param {string} message - The message text
   */
  error(message) {
    if (this._shouldLog('error')) {
      this._addMessage(message, 'error');
    }
  }

  /**
   * Check if a message should be logged based on current log level
   * @private
   */
  _shouldLog(messageLevel) {
    // Use ?? instead of || to handle 0 (debug level) correctly
    const currentLevel = this.LOG_LEVELS[this.options.logLevel] ?? this.LOG_LEVELS.info;
    const msgLevel = this.LOG_LEVELS[messageLevel] ?? this.LOG_LEVELS.info;
    const shouldLog = msgLevel >= currentLevel;

    return shouldLog;
  }

  /**
   * Add a message to the console
   * @private
   */
  _addMessage(message, type) {
    const timestamp = new Date().toLocaleTimeString('hr-HR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const messageObj = { message, type, timestamp };
    this.messages.push(messageObj);

    // Limit message history
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }

    // Add to DOM
    const messagesContainer = this.container.querySelector('#console-messages');
    const messageEl = document.createElement('div');
    messageEl.className = `potree-console-message ${type}`;

    if (this.options.showTimestamp) {
      messageEl.innerHTML = `
        <span class="timestamp">${timestamp}</span>
        <span class="text">${message}</span>
      `;
    } else {
      messageEl.innerHTML = `<span class="text">${message}</span>`;
    }

    messagesContainer.appendChild(messageEl);

    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Limit DOM elements (keep only last 20 visible)
    const messageElements = messagesContainer.querySelectorAll('.potree-console-message');
    if (messageElements.length > 20) {
      messageElements[0].remove();
    }

    return messageObj;
  }

  /**
   * Set log level
   * @param {string} level - Log level: 'debug' | 'info' | 'warning' | 'error' | 'none'
   */
  setLogLevel(level) {
    if (this.LOG_LEVELS.hasOwnProperty(level)) {
      this.options.logLevel = level;
      this.log(`Log level set to: ${level}`, 'info');
    } else {
      console.warn(`Invalid log level: ${level}`);
    }
  }

  /**
   * Get current log level
   * @returns {string}
   */
  getLogLevel() {
    return this.options.logLevel;
  }

  /**
   * Clear all messages
   */
  clear() {
    this.messages = [];
    const messagesContainer = this.container.querySelector('#console-messages');
    messagesContainer.innerHTML = '';
    this.log('Console cleared', 'info');
  }

  /**
   * Toggle collapsed state
   */
  toggle() {
    this.container.classList.toggle('collapsed');
    const toggleBtn = this.container.querySelector('#toggle-btn svg');

    if (this.container.classList.contains('collapsed')) {
      toggleBtn.innerHTML = '<polyline points="6 9 12 15 18 9"/>';
    } else {
      toggleBtn.innerHTML = '<polyline points="18 15 12 9 6 15"/>';
    }
  }

  /**
   * Show the info bar
   */
  show() {
    this.container.style.display = 'block';
    this.options.visible = true;
  }

  /**
   * Hide the info bar
   */
  hide() {
    this.container.style.display = 'none';
    this.options.visible = false;
  }

  /**
   * Toggle visibility
   */
  toggleVisibility() {
    if (this.options.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if visible
   */
  isVisible() {
    return this.options.visible;
  }

  /**
   * Inject CSS styles
   * @private
   */
  _injectStyles() {
    if (document.getElementById('potree-console-styles')) return;

    const style = document.createElement('style');
    style.id = 'potree-console-styles';
    style.textContent = `
      .potree-console {
        background: rgba(40, 44, 52, 0.85);
        backdrop-filter: blur(10px);
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.08);
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 12px;
        overflow: hidden;
        transition: all 0.3s ease;
      }

      .potree-console.collapsed .potree-console-messages {
        display: none;
      }

      .potree-console-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 10px;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        cursor: pointer;
        user-select: none;
      }

      .potree-console-title {
        display: flex;
        align-items: center;
        gap: 6px;
        color: rgba(255, 255, 255, 0.9);
        font-weight: 500;
        font-size: 11px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }

      .potree-console-title svg {
        stroke: #3498db;
      }

      .potree-console-actions {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .potree-console-loglevel {
        padding: 2px 6px;
        margin-right: 6px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.8);
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 10px;
        cursor: pointer;
        outline: none;
        transition: all 0.2s;
      }

      .potree-console-loglevel:hover {
        background: rgba(0, 0, 0, 0.5);
        border-color: rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 1);
      }

      .potree-console-loglevel:focus {
        border-color: #3498db;
        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
      }

      .potree-console-loglevel option {
        background: rgba(40, 44, 52, 1);
        color: rgba(255, 255, 255, 0.9);
      }

      .potree-console-btn {
        width: 24px;
        height: 24px;
        padding: 0;
        border: none;
        background: transparent;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .potree-console-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
      }

      .potree-console-btn svg {
        stroke: currentColor;
      }

      .potree-console-messages {
        max-height: 200px;
        overflow-y: auto;
        padding: 6px;
      }

      .potree-console-messages::-webkit-scrollbar {
        width: 6px;
      }

      .potree-console-messages::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 3px;
      }

      .potree-console-messages::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
      }

      .potree-console-messages::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .potree-console-message {
        display: flex;
        gap: 8px;
        padding: 4px 6px;
        margin-bottom: 2px;
        border-radius: 3px;
        line-height: 1.4;
        animation: slideIn 0.2s ease;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .potree-console-message .timestamp {
        color: rgba(255, 255, 255, 0.4);
        font-size: 10px;
        flex-shrink: 0;
      }

      .potree-console-message .text {
        color: rgba(255, 255, 255, 0.85);
        flex: 1;
      }

      .potree-console-message.debug {
        background: rgba(155, 89, 182, 0.1);
      }

      .potree-console-message.debug .text {
        color: #af7ac5;
      }

      .potree-console-message.info {
        background: rgba(52, 152, 219, 0.1);
      }

      .potree-console-message.info .text {
        color: #5dade2;
      }

      .potree-console-message.success {
        background: rgba(46, 204, 113, 0.1);
      }

      .potree-console-message.success .text {
        color: #58d68d;
      }

      .potree-console-message.warning {
        background: rgba(241, 196, 15, 0.1);
      }

      .potree-console-message.warning .text {
        color: #f4d03f;
      }

      .potree-console-message.error {
        background: rgba(231, 76, 60, 0.1);
      }

      .potree-console-message.error .text {
        color: #ec7063;
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
    this.messages = [];
  }
}
