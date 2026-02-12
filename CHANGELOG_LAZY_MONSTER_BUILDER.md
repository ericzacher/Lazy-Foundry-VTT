# Changelog - Lazy Monster Builder Integration

## [2026-02-11] - Lazy Monster Builder Auto-Installation

### Added

#### Container Patches
- **`foundry/container_patches/02-install-lazy-monster-builder.sh`**
  - Auto-installs Lazy Monster Builder Foundry module on container startup
  - Downloads latest release from GitHub
  - Extracts to `/data/Data/modules/lazy-monster-builder`
  - Runs alongside existing D&D 5e system installer
  - Executable permissions set (+x)

#### Documentation
- **`docs/LAZY_MONSTER_BUILDER_INTEGRATION.md`**
  - Complete integration guide
  - Module overview and features
  - How to enable and use in Foundry
  - Integration strategies with AI system
  - Workflow examples and best practices
  - Troubleshooting section

- **`docs/MONSTER_GENERATION_QUICK_REFERENCE.md`**
  - Side-by-side comparison: AI NPCs vs Module monsters
  - Feature comparison table
  - Recommended workflows
  - Full session prep example
  - Tips and best practices
  - Installation verification commands

- **`LAZY_MONSTER_BUILDER_SETUP.md`**
  - Quick setup guide
  - What was added/modified
  - Next steps for activation
  - Benefits summary
  - Verification commands

### Modified

#### Documentation
- **`README.md`**
  - Updated "Foundry VTT Auto-Setup" section to mention Lazy Monster Builder auto-installation
  - Added link to integration docs in "For Dungeon Masters" section

### Technical Details

**Module Information:**
- Name: Lazy Monster Builder
- Source: https://github.com/SetaSensei/lazy-monster-builder
- Package: `lazy-monster-builder`
- Foundry Compatibility: v11+ (tested on v13)
- System: D&D 5e

**Installation Method:**
- Automated via container patch system
- Downloads from latest GitHub release
- Fallback extraction methods (unzip → npx extract-zip → jar)
- Idempotent (safe to run multiple times)

**Integration Benefits:**
- Zero manual installation required
- Complements existing AI NPC generation
- Provides on-the-fly monster stat blocks for improvised encounters
- Reduces DM prep time to near-zero

### Usage

**Two complementary tools:**

1. **AI-Generated NPCs** (existing functionality):
   - Rich personalities, motivations, backstories
   - Campaign lore integration
   - Custom tokens
   - ~20-30 seconds per NPC
   - Best for: Named characters, quest-givers, villains

2. **Lazy Monster Builder** (new):
   - Quick stat blocks
   - CR-appropriate monsters
   - Standard tokens
   - ~5 seconds per monster
   - Best for: Combat filler, minions, improvised encounters

**Combined workflow:**
- Pre-session: Generate key NPCs, maps, lore via AI (5 minutes)
- During session: Generate combat monsters on-the-fly in Foundry (5 seconds each)

### Activation Steps

1. Restart Foundry container: `make restart`
2. Login to Foundry as GM
3. Settings → Manage Modules
4. Enable "Lazy Monster Builder"
5. Save settings

### Verification

```bash
# Check module installation
docker exec lazy-foundry-vtt ls -la /data/Data/modules/lazy-monster-builder

# View installation logs
docker logs lazy-foundry-vtt 2>&1 | grep lazy-monster-builder
```

---

## Impact

This integration completes the zero-prep DM workflow:

**Before:**
- AI generates maps, NPCs, lore ✅
- Manual monster stat creation ❌

**After:**
- AI generates maps, NPCs, lore ✅
- Auto-generated monster stats ✅
- **Total prep time: <5 minutes per session** 🎉

---

**Files Changed Summary:**
- **Added:** 4 files (1 script, 3 docs)
- **Modified:** 1 file (README.md)
- **Total lines:** ~1,500 lines of documentation and automation
