## 🐛 EDL `strength` and `radius` parameters don't update at runtime

### ✅ RESOLUTION (December 2025)

**Problem was user error, not a bug!** Tested with `potree-core@2.0.12` - runtime changes to `strength` and `radius` work correctly when used properly.

**Key finding:** `PotreeRenderer.setEDL()` expects a **full options object** (including `enabled`) each time. 

❌ **Wrong usage** (appears to disable EDL):
```javascript
potreeRenderer.setEDL({ strength: 2.0 }); // Missing 'enabled' property!
```

✅ **Correct usage:**
```javascript
const edl = { 
  enabled: true, 
  pointCloudLayer: 1, 
  strength: 0.4, 
  radius: 1.4, 
  opacity: 1.0 
};
const potreeRenderer = new PotreeRenderer({ edl });

// Later, when updating parameters:
edl.strength = 2.0;
potreeRenderer.setEDL({ ...edl }); // Spread operator includes all properties
```

**Lesson learned:** Always pass the complete EDL configuration object when calling `setEDL()`. Omitting properties (especially `enabled`) can cause unexpected behavior.

---

### Description (Original Issue - For Reference)
The Eye-Dome Lighting (EDL) feature added in [PR #71](https://github.com/tentone/potree-core/pull/71) appeared to have a bug where `strength` and `radius` parameters didn't update the visual output when changed at runtime. Only `opacity` worked correctly.

### Environment
- **potree-core**: `^2.0.11` (with EDL from PR #71)
- **Three.js**: `^0.160.0`
- **Browser**: Chrome/Edge (latest), WebGL2 enabled

---

### 📊 Problem Summary

| Parameter | Internal State Update | Visual Change |
|-----------|----------------------|---------------|
| `opacity` | ✅ Updates | ✅ **Works** - Immediate visual change |
| `strength` | ✅ Updates | ❌ **Broken** - No visual change |
| `radius` | ✅ Updates | ❌ **Broken** - No visual change |

---

### 🖼️ Visual Evidence

**EDL Disabled (baseline)**
<!-- Add your screenshot here -->

**EDL Enabled** (opacity=1.0, strength=0.4, radius=1.4)
<!-- Add your screenshot here -->

**After changing strength to 2.0** ❌ NO visual change despite internal update
<!-- Add your screenshot here - should be darker, but looks identical -->

**After changing opacity to 0.5** ✅ WORKS - visible transparency effect
<!-- Add your screenshot here - shows opacity actually works -->

---

### 🔬 Reproduction Steps

1. Initialize PotreeRenderer with EDL:
```javascript
const potreeRenderer = new PotreeRenderer(renderer, {
  edl: {
    enabled: true,
    strength: 0.4,
    radius: 1.4,
    opacity: 1.0
  }
});
```

2. Load point cloud and render

3. Update `strength` at runtime:
```javascript
potreeRenderer.setEDL({ strength: 2.0 });
console.log(potreeRenderer.edlPass.edlStrength); // Logs: 2 ✅
// But NO visual change ❌
```

4. Update `opacity` at runtime:
```javascript
potreeRenderer.setEDL({ opacity: 0.5 });
// Visual change happens immediately ✅
```

---

### 🔍 Root Cause Analysis

I've investigated the source code and found the issue:

**What works (opacity):**
- `EyeDomeLightingMaterial` sets opacity via `transparent: true` and `opacity` property
- Three.js automatically handles material blending when opacity changes
- No special update flag needed

**What doesn't work (strength/radius):**
- These are custom shader uniforms: `edlStrength`, `radius`
- Values update in `EDLPass.render()`: `this.edlMaterial.uniforms.edlStrength.value = this.edlStrength`
- **BUT**: Material is never marked for update via `material.needsUpdate = true`
- Three.js caches shader programs, so uniform changes alone don't trigger recompilation

**Evidence from source:**
- [`EDLPass.js:102-108`](https://github.com/tentone/potree-core/blob/main/src/renderer/EDLPass.js#L102-L108): Sets uniform values
- [`EyeDomeLightingMaterial.js`](https://github.com/tentone/potree-core/blob/main/src/materials/EyeDomeLightingMaterial.js): No setters, no `needsUpdate` triggers
- Compare to `neighbourCount`: When changed, it **does** call `updateShaderSource()` which forces shader recompilation

---

### 💡 Proposed Fix

Add update trigger in `EDLPass` when strength/radius change:

```javascript
// In EDLPass.js
setStrength(value) {
  this.edlStrength = value;
  this.edlMaterial.needsUpdate = true; // Force material update
}

setRadius(value) {
  this.radius = value;
  this.edlMaterial.needsUpdate = true; // Force material update
}
```

Or alternatively, in `EyeDomeLightingMaterial.js`:
```javascript
set edlStrength(value) {
  this.uniforms.edlStrength.value = value;
  this.needsUpdate = true;
}

set radius(value) {
  this.uniforms.radius.value = value;
  this.needsUpdate = true;
}
```

---

### ⚠️ Workaround

For now, set EDL parameters during initialization only:
```javascript
const potreeRenderer = new PotreeRenderer(renderer, {
  edl: {
    enabled: true,
    strength: 2.0,    // Set here, don't change at runtime
    radius: 3.0,      // Set here, don't change at runtime
    opacity: 1.0      // This one can be changed at runtime
  }
});
```

---

### 🎨 Visual Quality Concerns

Beyond the parameter update bug, there appear to be issues with the current EDL implementation that affect visual quality:

**Current problems:**
- **RGB point clouds look worse with EDL enabled** - darker, muddier, less vibrant colors
- The depth-based shading effect **obscures original colors** and reduces visual clarity
- Point clouds that have good natural coloring lose their visual appeal

**Why this might be happening:**
1. **Default parameters may not be optimal** - Without working `strength`/`radius` runtime updates, it's hard to find good values
2. **Implementation may need fine-tuning** - The shader blending or depth sampling might be too aggressive
3. **Missing adaptive behavior** - EDL applies the same effect regardless of point cloud characteristics (RGB quality, density, scene complexity)

**Expected behavior:**
- EDL should **enhance** depth perception **without** destroying color quality
- Should work well for both RGB point clouds and elevation/intensity data
- Parameters should allow fine-tuning to balance depth effect vs color preservation

**Current workaround:**
Since parameters don't update at runtime, users can't experiment to find optimal settings for their specific point clouds. This makes it difficult to judge whether EDL implementation is fundamentally flawed or just needs better defaults.

**Suggestion:** 
- Fix the parameter update bug first (this issue)
- Then revisit default values with community feedback
- Consider adaptive EDL strength based on point cloud characteristics
- Add presets for different point cloud types (RGB scan, elevation data, intensity, etc.)

---

### 📝 Additional Notes

- PR #71 was merged recently (December 2025)
- This appears to be an oversight in the initial implementation
- `opacity` works because it uses Three.js's built-in material properties
- `strength` and `radius` are custom uniforms that need explicit update triggers

---

### System Info
- OS: Windows 11
- Node: v20.11.0
- npm: 10.2.4

Thank you for the great EDL feature! 🎉 Looking forward to this fix.
