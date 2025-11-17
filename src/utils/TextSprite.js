import * as THREE from 'three';

/**
 * Text sprite for displaying labels in 3D space
 * Similar to Potree's TextSprite implementation
 */
export class TextSprite extends THREE.Sprite {
  constructor(text = '') {
    const material = new THREE.SpriteMaterial({
      map: null,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    super(material);

    this._text = text;
    this._fontSize = 32;
    this._fontFace = 'Arial, sans-serif';
    this._textColor = '#ffffff';
    this._backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this._padding = 8;
    this._borderRadius = 6;

    this.updateCanvas();
  }

  get text() {
    return this._text;
  }

  set text(value) {
    if (this._text !== value) {
      this._text = value;
      this.updateCanvas();
    }
  }

  get fontSize() {
    return this._fontSize;
  }

  set fontSize(value) {
    if (this._fontSize !== value) {
      this._fontSize = value;
      this.updateCanvas();
    }
  }

  get textColor() {
    return this._textColor;
  }

  set textColor(value) {
    if (this._textColor !== value) {
      this._textColor = value;
      this.updateCanvas();
    }
  }

  get backgroundColor() {
    return this._backgroundColor;
  }

  set backgroundColor(value) {
    if (this._backgroundColor !== value) {
      this._backgroundColor = value;
      this.updateCanvas();
    }
  }

  /**
   * Update the canvas texture
   */
  updateCanvas() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Set font to measure text
    context.font = `${this._fontSize}px ${this._fontFace}`;
    const metrics = context.measureText(this._text);
    const textWidth = metrics.width;

    // Calculate canvas size with padding
    const width = textWidth + this._padding * 2;
    const height = this._fontSize + this._padding * 2;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Redraw with proper dimensions
    context.font = `${this._fontSize}px ${this._fontFace}`;
    context.textBaseline = 'middle';
    context.textAlign = 'center';

    // Draw background with rounded corners
    if (this._backgroundColor) {
      context.fillStyle = this._backgroundColor;
      this._roundRect(context, 0, 0, width, height, this._borderRadius);
      context.fill();
    }

    // Draw text
    context.fillStyle = this._textColor;
    context.fillText(this._text, width / 2, height / 2);

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Update material
    if (this.material.map) {
      this.material.map.dispose();
    }
    this.material.map = texture;
    this.material.needsUpdate = true;

    // Set sprite scale to maintain aspect ratio
    const aspect = width / height;
    this.scale.set(aspect, 1, 1);
  }

  /**
   * Draw rounded rectangle
   * @private
   */
  _roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Dispose resources
   */
  dispose() {
    if (this.material.map) {
      this.material.map.dispose();
    }
    this.material.dispose();
  }
}
