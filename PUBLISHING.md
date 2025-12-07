# Publishing to npm

This guide explains how to publish the **unscoped** `potree-viewer` package to npm.

## Prerequisites

1. **npm account**: Create account at [npmjs.com](https://www.npmjs.com/signup)
2. **npm login**: Run `npm login` in terminal

## Prepare for Publishing

### 1. Update package.json

Edit `package.json` (we publish unscoped):

```json
{
  "name": "potree-viewer",
  "version": "0.1.0",        // Update version following semver
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/potree-viewer.git"  // Update with real repo
  }
}
```

### 2. Verify Files to be Published

Check what will be published:

```bash
cd viewer-lib
npm pack --dry-run
```

This shows all files that will be included. The `files` field in package.json controls this:
- `src/` - Source code
- `README.md` - Documentation
- `LICENSE` - License file

Files excluded via `.npmignore`:
- `demo.html`
- `vite.config.js`
- `node_modules/`
- Development files

### 3. Test the Package Locally

Test installation before publishing:

```bash
# In viewer-lib directory
npm pack

# This creates potree-viewer-0.1.0.tgz
# Install it in another project to test:
cd /path/to/test-project
npm install /path/to/viewer-lib/potree-viewer-0.1.0.tgz
```

## Publishing Steps

### Option 1: Publish to npm Registry (Public)

```bash
cd viewer-lib

# Login to npm (one-time setup)
npm login

# Publish the package
npm publish
```

### Option 2: Publish to GitHub Packages

If you prefer GitHub Packages over npm:

1. Create `.npmrc` in viewer-lib:
```
@YOUR_USERNAME:registry=https://npm.pkg.github.com
```

2. Update package.json:
```json
{
  "name": "@YOUR_USERNAME/potree-viewer",
  "repository": {
    "type": "git",
    "url": "git://github.com/YOUR_USERNAME/potree-viewer.git"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

3. Authenticate and publish:
```bash
npm login --registry=https://npm.pkg.github.com
npm publish
```

## Using Published Package

After publishing, users can install with:

```bash
npm install potree-viewer
```

Then use in code:

```javascript
import { PotreeViewer, Toolbar, PotreeViewerConsole } from 'potree-viewer';

const viewer = new PotreeViewer({
  container: document.getElementById('viewer'),
  pointCloudUrl: 'cloud/metadata.json',
});
```

## Version Management

Follow [Semantic Versioning](https://semver.org/):

- **Patch release** (0.1.0 → 0.1.1): Bug fixes
  ```bash
  npm version patch
  npm publish
  ```

- **Minor release** (0.1.0 → 0.2.0): New features, backward compatible
  ```bash
  npm version minor
  npm publish
  ```

- **Major release** (0.1.0 → 1.0.0): Breaking changes
  ```bash
  npm version major
  npm publish
  ```

## Unpublishing

If you need to unpublish (use with caution):

```bash
# Unpublish specific version
npm unpublish potree-viewer@0.1.0

# Unpublish entire package (only within 72 hours)
npm unpublish potree-viewer --force
```

**Note**: Unpublishing is discouraged. Use `npm deprecate` instead:

```bash
npm deprecate potree-viewer@0.1.0 "This version has bugs, use 0.1.1"
```

## Automation with GitHub Actions

Create `.github/workflows/publish.yml` for automated publishing:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: cd viewer-lib && npm install
      - run: cd viewer-lib && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Add `NPM_TOKEN` to GitHub repository secrets.

## Quick Reference

```bash
# Check current version
npm version

# Login to npm
npm login

# Dry run (see what would be published)
npm pack --dry-run

# Publish
npm publish

# Check published package
npm info potree-viewer

# Update version and publish
npm version patch && npm publish
```

## Troubleshooting

### "You must be logged in to publish packages"
```bash
npm login
```

### "You do not have permission to publish potree-viewer"
- Package name might be taken, choose a different name
- Check with: `npm info potree-viewer`

### "Package name too similar to existing packages"
Choose a more unique name or add prefix/suffix.

### "402 Payment Required"
Unscoped packages are always public and free. This error shouldn't occur for `potree-viewer`.
