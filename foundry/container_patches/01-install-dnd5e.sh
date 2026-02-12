#!/bin/bash
# Container patch: Install D&D 5e system and create world automatically
# This script runs after Foundry is installed but before it starts.
# See: https://github.com/felddy/foundryvtt-docker#optional-variables (CONTAINER_PATCHES)

set -euo pipefail

DND5E_SYSTEM_DIR="/data/Data/systems/dnd5e"
DND5E_MANIFEST="https://raw.githubusercontent.com/foundryvtt/dnd5e/master/system.json"
WORLD_NAME="${FOUNDRY_WORLD:-test}"
WORLD_DIR="/data/Data/worlds/${WORLD_NAME}"

echo "[lazy-foundry-patch] Starting Foundry VTT auto-setup..."

# --- Install D&D 5e system if not present ---
if [ ! -d "$DND5E_SYSTEM_DIR" ]; then
  echo "[lazy-foundry-patch] D&D 5e system not found. Installing..."

  # Fetch the manifest to get the download URL
  DOWNLOAD_URL=$(node -e "
    const https = require('https');
    const http = require('http');
    const url = '${DND5E_MANIFEST}';
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const manifest = JSON.parse(data);
          console.log(manifest.download);
        } catch(e) {
          console.error('Failed to parse manifest:', e.message);
          process.exit(1);
        }
      });
    }).on('error', (e) => {
      console.error('Failed to fetch manifest:', e.message);
      process.exit(1);
    });
  ")

  if [ -z "$DOWNLOAD_URL" ]; then
    echo "[lazy-foundry-patch] ERROR: Could not determine D&D 5e download URL"
    exit 1
  fi

  echo "[lazy-foundry-patch] Downloading D&D 5e from: $DOWNLOAD_URL"

  # Download and extract
  TEMP_DIR=$(mktemp -d)
  TEMP_ZIP="${TEMP_DIR}/dnd5e.zip"

  node -e "
    const https = require('https');
    const http = require('http');
    const fs = require('fs');
    const url = '${DOWNLOAD_URL}';

    function download(url, dest, redirects) {
      if (redirects > 5) { console.error('Too many redirects'); process.exit(1); }
      const mod = url.startsWith('https') ? https : http;
      mod.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          download(res.headers.location, dest, redirects + 1);
          return;
        }
        if (res.statusCode !== 200) {
          console.error('Download failed with status:', res.statusCode);
          process.exit(1);
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => { file.close(); console.log('Download complete'); });
      }).on('error', (e) => { console.error('Download error:', e.message); process.exit(1); });
    }
    download(url, '${TEMP_ZIP}', 0);
  "

  mkdir -p "$DND5E_SYSTEM_DIR"

  # Extract using Node.js (unzip may not be available in the container)
  node -e "
    const { execSync } = require('child_process');
    try {
      execSync('which unzip', { stdio: 'pipe' });
      execSync('unzip -o ${TEMP_ZIP} -d ${DND5E_SYSTEM_DIR}', { stdio: 'inherit' });
    } catch(e) {
      // Fall back to Node.js extraction
      const fs = require('fs');
      const path = require('path');
      const { createReadStream } = require('fs');
      
      // Use the built-in tar if available, otherwise try npx
      try {
        execSync('npx -y extract-zip ${TEMP_ZIP} ${DND5E_SYSTEM_DIR}', { stdio: 'inherit', timeout: 60000 });
      } catch(e2) {
        console.error('Could not extract zip. Trying jar...');
        try {
          execSync('jar xf ${TEMP_ZIP}', { cwd: '${DND5E_SYSTEM_DIR}', stdio: 'inherit' });
        } catch(e3) {
          console.error('All extraction methods failed. Install unzip in the container.');
          process.exit(1);
        }
      }
    }
  "

  rm -rf "$TEMP_DIR"
  echo "[lazy-foundry-patch] D&D 5e system installed successfully!"
else
  echo "[lazy-foundry-patch] D&D 5e system already installed. Skipping."
fi

# --- Create world if not present ---
if [ ! -d "$WORLD_DIR" ]; then
  echo "[lazy-foundry-patch] World '${WORLD_NAME}' not found. Creating..."

  mkdir -p "${WORLD_DIR}/data"

  # Get Foundry core version from the installed application
  CORE_VERSION=$(node -e "
    try {
      const fs = require('fs');
      // Try common locations for Foundry's version info
      const locations = [
        '/home/foundry/resources/app/package.json',
        '/opt/foundry/resources/app/package.json'
      ];
      for (const loc of locations) {
        if (fs.existsSync(loc)) {
          const pkg = JSON.parse(fs.readFileSync(loc, 'utf8'));
          console.log(pkg.version || '13');
          process.exit(0);
        }
      }
      // Fall back to checking the build info
      const buildLocations = [
        '/home/foundry/resources/app/build.json',
        '/opt/foundry/resources/app/build.json'
      ];
      for (const loc of buildLocations) {
        if (fs.existsSync(loc)) {
          const build = JSON.parse(fs.readFileSync(loc, 'utf8'));
          console.log(build.generation + '.' + build.build || '13');
          process.exit(0);
        }
      }
      console.log('13');
    } catch(e) { console.log('13'); }
  ")

  # Get dnd5e system version
  DND5E_VERSION="5.2.5"
  if [ -f "${DND5E_SYSTEM_DIR}/system.json" ]; then
    DND5E_VERSION=$(node -e "
      const fs = require('fs');
      const sys = JSON.parse(fs.readFileSync('${DND5E_SYSTEM_DIR}/system.json', 'utf8'));
      console.log(sys.version || '5.2.5');
    ")
  fi

  cat > "${WORLD_DIR}/world.json" << WORLDJSON
{
  "title": "${WORLD_NAME}",
  "id": "${WORLD_NAME}",
  "system": "dnd5e",
  "coreVersion": "${CORE_VERSION}",
  "compatibility": {
    "minimum": "13",
    "verified": "13"
  },
  "systemVersion": "${DND5E_VERSION}",
  "description": "Auto-created world for Lazy Foundry VTT",
  "flags": {}
}
WORLDJSON

  echo "[lazy-foundry-patch] World '${WORLD_NAME}' created successfully!"
  echo "[lazy-foundry-patch] "
  echo "[lazy-foundry-patch] FIRST TIME SETUP - Create Your GM User:"
  echo "[lazy-foundry-patch]   1. Access Foundry at http://localhost:30000"
  echo "[lazy-foundry-patch]   2. Login with admin password: ${FOUNDRY_ADMIN_KEY}"
  echo "[lazy-foundry-patch]   3. After world launches, click 'Return to Setup'"
  echo "[lazy-foundry-patch]   4. Go to Configuration -> Users -> Create User"
  echo "[lazy-foundry-patch]   5. Create GM user with name 'Gamemaster' (or any name)"
  echo "[lazy-foundry-patch]   6. Set password (recommend: ${FOUNDRY_ADMIN_KEY})"
  echo "[lazy-foundry-patch]   7. Set role to 'Gamemaster'"
  echo "[lazy-foundry-patch] "
else
  echo "[lazy-foundry-patch] World '${WORLD_NAME}' already exists. Skipping."
fi

echo "[lazy-foundry-patch] Auto-setup complete!"
