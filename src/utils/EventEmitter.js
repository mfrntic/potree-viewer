/**
 * Simple event emitter implementation for PotreeViewer
 * Provides on, off, and emit methods for event handling
 */
export class EventEmitter {
  constructor() {
    this._events = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  on(event, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('Event handler must be a function');
    }

    if (!this._events.has(event)) {
      this._events.set(event, []);
    }

    this._events.get(event).push(handler);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function to remove
   */
  off(event, handler) {
    if (!this._events.has(event)) {
      return;
    }

    const handlers = this._events.get(event);
    const index = handlers.indexOf(handler);

    if (index !== -1) {
      handlers.splice(index, 1);
    }

    // Clean up empty event arrays
    if (handlers.length === 0) {
      this._events.delete(event);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (!this._events.has(event)) {
      return;
    }

    const handlers = this._events.get(event);
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    this._events.clear();
  }
}
