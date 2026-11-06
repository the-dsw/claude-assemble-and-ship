const fs = require('fs');
const path = require('path');
const errors = [];

// Resolve everything from the repo root so the script works from any directory.
const root = path.resolve(__dirname, '..', '..');
const at = (...parts) => path.join(root, ...parts);

// 1. Manifest exists, is valid JSON, and has a name.
const manifestPath = at('.claude-plugin', 'plugin.json');
if (!fs.existsSync(manifestPath)) {
  errors.push('Missing .claude-plugin/plugin.json — create the manifest at that path.');
} else {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    errors.push('.claude-plugin/plugin.json is not valid JSON: ' + e.message);
  }
  if (manifest && (!manifest.name || typeof manifest.name !== 'string')) {
    errors.push('plugin.json must include a non-empty "name".');
  }
}

// 2. Component folders must sit at the root, not inside .claude-plugin/.
for (const dir of ['commands', 'agents', 'skills', 'hooks']) {
  if (fs.existsSync(at('.claude-plugin', dir))) {
    errors.push('"' + dir + '/" is inside .claude-plugin/ — move it to the repo root. Only plugin.json belongs in .claude-plugin/.');
  }
}

// 3. At least one component at the root.
const hasComponent = ['commands', 'agents', 'skills', 'hooks'].some(
  (dir) => fs.existsSync(at(dir)) && fs.readdirSync(at(dir)).length > 0
);
if (!hasComponent) {
  errors.push('No components found — add at least one (commands/ or agents/) at the repo root.');
}

// 4. If the repo is also a marketplace, its manifest must be well formed.
const marketplacePath = at('.claude-plugin', 'marketplace.json');
if (fs.existsSync(marketplacePath)) {
  let market;
  try {
    market = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));
  } catch (e) {
    errors.push('.claude-plugin/marketplace.json is not valid JSON: ' + e.message);
  }
  if (market) {
    if (!market.name || typeof market.name !== 'string') {
      errors.push('marketplace.json must include a non-empty "name".');
    }
    if (!market.owner || !market.owner.name) {
      errors.push('marketplace.json must include "owner.name".');
    }
    if (!Array.isArray(market.plugins) || market.plugins.length === 0) {
      errors.push('marketplace.json must include a non-empty "plugins" array.');
    } else {
      for (const plugin of market.plugins) {
        if (!plugin.name) {
          errors.push('Every marketplace plugin entry needs a "name".');
        }
        if (typeof plugin.source === 'string' && !fs.existsSync(at(plugin.source))) {
          errors.push('Marketplace plugin "' + plugin.name + '" has a source that does not exist: ' + plugin.source);
        }
      }
    }
  }
}

if (errors.length) {
  console.error('Plugin validation failed:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('Plugin looks valid \u2713');
