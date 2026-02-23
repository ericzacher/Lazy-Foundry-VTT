# Lazy Monster Builder Integration

## Overview

The **Lazy Monster Builder** module is automatically installed in your Foundry VTT instance. It provides quick monster generation based on the Lazy GM's 5e Monster Builder Resource Document.

## What It Does

- Generates D&D 5e monsters on the fly
- Adds a "Generate Monster" button to the Actors sidebar
- Creates statted NPCs without manual calculation
- Perfect for improvised encounters or quickly populating your AI-generated dungeons

## Installation Status

✅ **AUTO-INSTALLED** - The module is automatically installed via the container patch system when Foundry VTT starts.

The module will be available in Foundry after:
1. Restarting the Foundry container: `make restart` or `docker compose restart foundry`
2. Accessing Foundry at http://localhost:30000
3. Enabling the module in your world settings (if not auto-enabled)

## How to Enable the Module

If the module isn't already active:

1. Access Foundry VTT at http://localhost:30000
2. Login as GM
3. Click **Settings** (gear icon)
4. Click **Manage Modules**
5. Find **"Lazy Monster Builder"** and check the box
6. Click **Save Module Settings**
7. The module is now active!

## How to Use

### Quick Monster Generation

1. In Foundry, click the **Actors Directory** tab (person icon)
2. Click the **"Generate Monster"** button at the top
3. The module will create a new monster actor with:
   - Appropriate stats for your selected CR
   - Standard D&D 5e abilities
   - Token image
   - Complete stat block

### Integration with Lazy Foundry VTT

**Combine AI-generated content with on-the-fly monsters:**

1. **Use AI for Named NPCs**: Generate important NPCs (quest-givers, villains, allies) via the Lazy Foundry web UI
   - These have rich personalities, motivations, and backstories
   - Synced to Foundry with custom tokens

2. **Use Lazy Monster Builder for Combat Filler**: Generate generic monsters for encounters
   - Quick goblin squad for an ambush
   - Random bandits on the road
   - Dungeon guardians

3. **Best of Both Worlds**:
   - AI generates the dungeon map and key NPCs
   - Lazy Monster Builder fills in minions and random encounters
   - Minimal prep, maximum flexibility

### Workflow Example

**Scenario: The party enters an AI-generated dungeon**

1. **Pre-session prep** (via Lazy Foundry Web UI):
   - Generate campaign lore
   - Generate dungeon map (AI + procedural)
   - Generate 2-3 key NPCs (boss, lieutenant, quest-giver)
   - Sync everything to Foundry

2. **During the session** (improvised encounter):
   - Party triggers an unexpected encounter
   - Click "Generate Monster" in Foundry
   - Select CR appropriate for the party
   - Instantly have a statted enemy to use
   - No prep required!

## Benefits for DMs

### Minimal Handling Required

- **No manual monster creation**: Both tools handle stat generation
- **No math**: The module calculates everything
- **No searching through books**: Instant access to monsters
- **Seamless integration**: Works alongside your AI-generated content

### Workflow Optimization

| Task | Tool | Time |
|------|------|------|
| Create dungeon map | Lazy Foundry AI | 30 seconds |
| Generate boss NPC | Lazy Foundry AI | 20 seconds |
| Generate random guards | Lazy Monster Builder | 5 seconds each |
| Sync to Foundry | Lazy Foundry API | 10 seconds |
| **Total prep time** | | **~2 minutes** |

### When to Use Each Tool

| Use Lazy Foundry AI | Use Lazy Monster Builder |
|---------------------|--------------------------|
| Named NPCs with personalities | Generic monster stat blocks |
| Important campaign characters | Combat filler enemies |
| Quest-givers, villains, allies | Random encounters |
| NPCs that need backstory | Dungeon guardians |
| Characters players will talk to | Creatures players will fight |

## Advanced Usage

### Combining Both Tools

**Example: Bandit Camp Encounter**

1. **AI-generated** (Lazy Foundry):
   - Bandit leader (personality, motivations, backstory)
   - Custom token
   - Map of the bandit camp

2. **On-the-fly** (Lazy Monster Builder):
   - 6 generic bandit minions (quick generation in Foundry)
   - 2 bandit scouts

3. **Result**: Rich encounter with minimal prep

### API Integration (Future Enhancement)

You could potentially extend the Lazy Foundry API to:
- Trigger monster generation programmatically
- Auto-populate encounters with appropriate CR monsters
- Fill dungeon rooms with level-appropriate enemies

This would require accessing the Lazy Monster Builder module's API via Foundry's socket.io connection.

## Troubleshooting

### Module Not Showing Up?

```bash
# Restart Foundry container
make restart

# Check if module directory exists
docker exec lazy-foundry-vtt ls -la /data/Data/modules/

# Check installation logs
make logs-foundry | grep lazy-monster-builder
```

### Module Installed But Not Active?

1. Login to Foundry as GM
2. Go to Settings → Manage Modules
3. Enable "Lazy Monster Builder"
4. Click Save

### Re-install Module

```bash
# Remove the module directory and restart
docker exec lazy-foundry-vtt rm -rf /data/Data/modules/lazy-monster-builder
make restart
```

The container patch will reinstall it on next startup.

## Module Information

- **Name**: Lazy Monster Builder
- **GitHub**: [SetaSensei/lazy-monster-builder](https://github.com/SetaSensei/lazy-monster-builder)
- **Foundry Package**: `lazy-monster-builder`
- **Compatibility**: Foundry VTT v11+ (tested on v13)
- **System**: D&D 5e
- **Auto-installed via**: `foundry/container_patches/02-install-lazy-monster-builder.sh`

## Summary

The Lazy Monster Builder module is **now automatically installed** in your Foundry VTT instance. Combined with your existing AI-powered content generation, you have a complete toolkit for zero-prep D&D sessions:

✅ AI generates maps, lore, and key NPCs
✅ Lazy Monster Builder generates combat encounters
✅ Everything syncs to Foundry automatically
✅ **DM handles almost nothing manually**

**Run epic campaigns with minimal prep!** 🎲
