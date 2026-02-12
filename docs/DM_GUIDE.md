# Lazy Foundry VTT - Dungeon Master's Guide

Welcome, Dungeon Master! This guide will help you leverage Lazy Foundry VTT's AI-powered features to create engaging campaigns with minimal prep time.

## 📚 Table of Contents

1. [Essential Make Commands](#-essential-make-commands)
2. [Getting Started](#getting-started)
3. [Campaign Management](#campaign-management)
4. [Session Planning](#session-planning)
5. [AI-Powered Content Generation](#ai-powered-content-generation)
6. [Foundry VTT Integration](#foundry-vtt-integration)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## 🛠️ Essential Make Commands

Quick reference for common commands you'll use regularly. Run these from your terminal in the project directory.

### Starting Your Session

```bash
# Start all services
make up

# Start and follow logs
make dev

# Check everything is running
make health
```

### During Your Game

```bash
# View what's running
make status

# Quick access to URLs
make urls

# Check service health
make health
```

### If Something Goes Wrong

```bash
# Restart everything
make restart

# View logs
make logs-api       # API logs
make logs-foundry   # Foundry logs
make logs-json      # Pretty formatted logs

# Full reset (if things are broken)
make clean
make up
```

### Between Sessions

```bash
# Stop services (saves resources)
make stop

# Start again later
make start

# Backup your data
make backup
```

### Common Tasks

```bash
# Shell access
make shell-api      # API container
make shell-db       # Database

# Database operations
make db-shell       # PostgreSQL prompt
make migrate-up     # Apply migrations

# View help
make help           # See all commands
```

**💡 Tip:** Keep a terminal open with `make dev` running during your session so you can monitor the system in real-time!

**📖 Full Reference:** See [Makefile Reference](MAKEFILE_REFERENCE.md) for all 40+ commands.

---

## 🎯 Getting Started

### First Time Setup

1. **Start the Services**
   ```bash
   make up
   ```

2. **Access the Dashboard**
   - Navigate to http://localhost:3000
   - Register for an account using your email

3. **Understand the Interface**
   - **Dashboard**: Overview of all campaigns and quick stats
   - **Campaigns**: Create and manage campaigns
   - **Sessions**: Plan and track game sessions
   - **Generate**: AI content generation tools

4. **Foundry VTT Access & GM User Setup**
   - Access Foundry at http://localhost:30000
   - Login with admin password from `.env` (`FOUNDRY_ADMIN_KEY`)
   - **First time only - Create your GM user:**
     1. After world launches, click "Return to Setup"
     2. Go to "Configuration" → "Users" → "Create User"
     3. Create user with name "Gamemaster" (or your choice)
     4. Set password (recommend using your `FOUNDRY_ADMIN_KEY`)
     5. Set role to **Gamemaster**
   - Launch world and login with your GM user

---

## 🏰 Campaign Management

### Creating Your First Campaign

1. **Click "New Campaign"** on the dashboard

2. **Fill in Campaign Details:**
   - **Name**: Your campaign title (e.g., "The Dragon's Crown")
   - **Setting**: Brief description (e.g., "High fantasy, war-torn kingdom")
   - **Theme**: Overall vibe (e.g., "Political intrigue", "Dungeon crawl")
   - **Tone**: Mood (e.g., "Dark and gritty", "Light-hearted")
   - **Player Count**: Number of players in your group

3. **Generate World Lore** (Optional but Recommended)
   - Click "Generate Lore"
   - AI creates:
     - Campaign overview
     - Major factions
     - Key locations
     - Historical background
     - Quest hooks
     - Legends and rumors

4. **Review and Customize**
   - Edit any generated content to fit your vision
   - Add your own details
   - Save changes

### Managing Multiple Campaigns

- **Switch Campaigns**: Use the campaign selector in the navbar
- **Archive Old Campaigns**: Mark campaigns as "Completed" 
- **Campaign Notes**: Add DM-only notes for each campaign
- **Search**: Find campaigns by name or setting

---

## 📅 Session Planning

### Creating a Session

1. **Navigate to Campaign** → "New Session"

2. **Session Details:**
   - **Title**: Session name (e.g., "The Goblin Ambush")
   - **Scheduled Date**: When you plan to run it
   - **Description**: Brief overview
   - **Session Number**: Auto-increments

3. **Generate Session Content:**
   - **Scenario**: AI creates encounters, objectives, and plot hooks
   - **Maps**: Generate location-specific maps
   - **NPCs**: Create characters for the session
   - **Encounters**: Generate balanced combat encounters

### Session Continuity (Key Feature!)

**The system remembers what happened:**

1. **After Running a Session:**
   - Click "Finalize Session"
   - Record what happened:
     - Key events
     - Player decisions
     - Unfinished threads
     - NPC interactions
     - Combat outcomes

2. **Next Session:**
   - System automatically references previous session
   - AI generates scenarios that:
     - Follow up on unfinished threads
     - Account for player decisions
     - Reflect consequences
     - Maintain narrative continuity

**Example Flow:**
```
Session 1: Party spares the goblin chief
  ↓
Record: "Party made peace with goblins"
  ↓
Session 2: AI generates scenario where goblins
          become unexpected allies
```

---

## 🤖 AI-Powered Content Generation

### World Lore Generation

**When to Use:**
- New campaign startup
- Expanding campaign world
- Creating new regions

**What You Get:**
- Historical background
- Major factions and their goals
- Key NPCs and their relationships
- Geographical features
- Cultural details
- Quest hooks

**Tips:**
- Be specific in campaign settings
- Include themes you want emphasized
- Review and cherry-pick what fits

### NPC Generation

**Input Options:**
- **Role**: "Tavern keeper", "Quest giver", "Villain"
- **Archetype**: Personality type
- **Count**: Generate multiple at once

**Output:**
- Name and appearance
- Personality traits
- Background story
- Motivations
- Secrets/hooks
- D&D 5e stats (STR, DEX, CON, INT, WIS, CHA)

**Best Practices:**
- Generate 3-5 NPCs per session
- Keep notes on recurring NPCs
- Update NPC status after sessions

### Map Generation

**Map Types Available:**
- **Dungeon**: Rooms, corridors, secret doors
- **Cave**: Natural cavern systems
- **Tavern**: Interior building layout
- **City**: Street-level city block
- **Building**: General building interior
- **Castle**: Fortified structure
- **Wilderness**: Outdoor terrain

**Generation Process:**
1. Select map type
2. Provide description (optional)
3. AI generates layout
4. System creates visual map with:
   - Grid overlay (100px for Foundry)
   - Walls and doors
   - Lighting suggestions
   - Thematic styling

**Customization:**
- Edit description for different results
- Regenerate if not satisfied
- Maps auto-saved to campaign

### Encounter Generation & Combat Enhancement

**NEW: Integrated Combat Workflow**

The system now provides a complete end-to-end solution for combat encounters, from generation to playable Foundry scenes with automatically placed tokens.

#### Party Configuration

**Campaign-Level Defaults:**
- **Player Count**: Set in campaign (1-10 players)
- **Party Level**: Set in campaign (1-20)
- These serve as default values for encounter generation

**Per-Map Custom Configuration (NEW):**
- **Override Defaults**: When generating a specific map with encounters
- **Party Size Input**: Custom party size for this encounter (optional)
- **Party Level Input**: Custom party level for this encounter (optional)
- **Use Cases**:
  - Absent players (generate for 3 instead of usual 4)
  - Different level groups (side quest for level 7 when campaign is level 5)
  - Playtesting different party compositions

**To Set Campaign Defaults:**
1. Create/Edit Campaign
2. Set "Player Count" (e.g., 4)
3. Set "Party Level" (e.g., 5)
4. These become defaults for all encounter generation

**To Override for Specific Map:**
1. In map generation form
2. Enable "Include Combat Encounters"
3. See "Party Size (defaults to X)" input
4. Enter custom value or leave blank for campaign default
5. Use CR Calculator to verify balance

#### CR Calculator (Challenge Rating Helper)

**Access:** Click "🧮 CR Calculator" button in map generation form

**Features:**
- **XP Thresholds**: Shows party-wide XP for Easy/Medium/Hard/Deadly
- **Recommended CR Ranges**: Appropriate CR values for each difficulty
- **Educational Guide**: Explains what each difficulty means
- **Interactive Adjustment**: Change party size/level to preview scenarios
- **Apply & Close (NEW)**: Update form values directly from calculator

**Understanding CR Levels:**
- **Easy**: Resource drain only, minimal danger
- **Medium**: Some PCs hurt, short rest needed
- **Hard**: Dangerous fight, long rest recommended
- **Deadly**: Character death possible

**Example CR Recommendations (Party of 4, Level 5):**
- Easy: CR 1/2 - 1
- Medium: CR 1 - 2
- Hard: CR 2 - 3
- Deadly: CR 3 - 5

**Using Apply & Close:**
1. Open CR Calculator from map generation form
2. Adjust party size/level to see different difficulty breakdowns
3. Find the configuration you want
4. Click "Apply & Close" button
5. Calculator closes and updates the form's party size/level inputs
6. Generate encounters with the new values

**Workflow Example:**
```
1. Campaign defaults: 4 players, Level 5
2. Open CR Calculator (shows 4/Level 5)
3. Change to 3 players, Level 7 in calculator
4. Review new CR recommendations
5. Click "Apply & Close"
6. Form now shows: Party Size: 3, Party Level: 7
7. Generate encounters balanced for this configuration
```

#### Encounter Generation with Maps

**Workflow:**

1. **Navigate to Maps Tab**

2. **Select Map Type** (Dungeon, Cave, etc.)

3. **Enable Combat Encounters:**
   - ✅ Check "Include Combat Encounters"
   - Select number (1-4 encounters)
   - Choose difficulty:
     - 🟢 Easy
     - 🟡 Medium
     - 🟠 Hard
     - 🔴 Deadly

4. **Configure Party (NEW - Optional):**
   - **Party Size Input**: Shows "Party Size (defaults to X)"
   - **Party Level Input**: Shows "Party Level (defaults to Y)"
   - Leave blank to use campaign defaults
   - Enter custom values to override for this map only
   - Click "🧮 CR Calculator" to:
     - Preview difficulty with custom values
     - Adjust values interactively
     - Click "Apply & Close" to update form

5. **Generate**
   - System creates map
   - AI generates detailed encounters balanced for specified party
   - Encounters stored with map

**Example: Custom Party Configuration**
```
Campaign: 4 players, Level 5 (defaults)

Scenario 1 - Use Defaults:
- Leave inputs blank
- Generates for 4 players, Level 5

Scenario 2 - Custom Override:
- Enter Party Size: 3
- Enter Party Level: 7
- Generates for 3 players, Level 7

Scenario 3 - Using CR Calculator:
- Click "🧮 CR Calculator"
- Adjust to 5 players, Level 4
- See CR recommendations update
- Click "Apply & Close"
- Form updates to Party Size: 5, Party Level: 4
- Generate with new values
```

**What Gets Generated:**

Each encounter includes:
- **Name & Description**: Thematic encounter setup
- **Enemy Details**:
  - Name (e.g., "Goblin Warrior")
  - Count (e.g., 4)
  - CR as string (e.g., "1/4")
  - Hit Points (e.g., 7)
  - Armor Class (e.g., 15)
  - Abilities (e.g., ["Nimble Escape", "Pack Tactics"])
  - Tactics (e.g., "Use hit-and-run attacks")
- **Terrain**: Battlefield description
- **Objectives**: Combat goals (array of strings)
- **Rewards**: Loot and XP (e.g., "120 XP", "Magic sword +1")
- **Tactical Notes**: DM tips for running the encounter
- **Alternative Resolutions**: Non-combat solutions

**Example Generated Encounter:**
```json
{
  "name": "Goblin Ambush",
  "difficulty": "medium",
  "challengeRating": "2",
  "enemies": [
    {
      "name": "Goblin Warrior",
      "count": 4,
      "cr": "1/4",
      "hitPoints": 7,
      "armorClass": 15,
      "abilities": ["Nimble Escape", "Pack Tactics"],
      "tactics": "Use hit-and-run, focus fire on weakest PC"
    },
    {
      "name": "Goblin Boss",
      "count": 1,
      "cr": "1",
      "hitPoints": 21,
      "armorClass": 17,
      "abilities": ["Redirect Attack", "Leadership"],
      "tactics": "Stay back, command minions, retreat if alone"
    }
  ],
  "rewards": ["120 XP", "35 gold pieces", "Goblin boss's +1 scimitar"],
  "alternativeResolutions": [
    "Intimidate goblins into fleeing",
    "Negotiate passage in exchange for food"
  ]
}
```

#### Automatic Token Placement

**NEW: Zero-Setup Combat Scenes**

When you sync a session with encounters to Foundry, tokens are automatically placed!

**How It Works:**

1. **Generate Map with Encounters** (as above)

2. **Link to Session** (optional but recommended):
   - Map can auto-link to current session
   - Or manually assign map to session

3. **Click "🎲 Sync" on Session** (NOT regular bulk sync):
   - Finds session on campaign page
   - Look for sessions with scenario + map
   - Click the "🎲 Sync" button next to session

4. **System Automatically:**
   - Creates Foundry scenes (maps)
   - Creates Foundry actors (enemy stat blocks)
   - **Expands enemy counts** (3x Goblin → Goblin 1, 2, 3)
   - **Calculates positions** using room centers
   - **Places tokens** on map
   - **Sizes tokens** correctly (Tiny=0.5x0.5, Large=2x2, etc.)
   - **Sets disposition** to hostile (red border)

**Token Placement Algorithm:**

- **Room Selection**:
  - Skips room[0] (player spawn)
  - Filters rooms ≥4x4 grid units
  - Sorts by distance from origin (furthest first)
  - Distributes encounters across multiple rooms

- **Position Calculation**:
  - **1 Enemy**: Center of room + random jitter (±0.3 units)
  - **2-4 Enemies**: Circular formation around room center
  - **5+ Enemies**: Grid formation with proper spacing

- **Token Properties**:
  - Size based on creature (Tiny=0.5, Medium=1, Large=2, Huge=3)
  - Disposition = -1 (hostile, red border)
  - HP and AC from enemy stats
  - Numbered for duplicates (Goblin 1, Goblin 2, etc.)

**Result:**

You get a **combat-ready scene** in Foundry with:
- ✅ Map with walls, doors, lighting
- ✅ Enemy tokens properly positioned
- ✅ Correct token sizes
- ✅ Enemy stat blocks (actors)
- ✅ HP/AC pre-configured
- ✅ Ready to play immediately

#### Complete Combat Workflow

**Full Process (15 minutes):**

```
1. Set Party Config (one-time, 1 min)
   └─ Campaign settings: 4 players, Level 5

2. Generate Map with Encounters (5 min)
   ├─ Select "Dungeon"
   ├─ Describe: "Ancient dwarven forge"
   ├─ ✅ Include Encounters
   ├─ Select: 2 encounters, Medium difficulty
   ├─ (Optional) Customize party size/level
   │  ├─ Enter custom values (e.g., 3 players, Level 7)
   │  └─ Or use "🧮 CR Calculator" → Adjust → "Apply & Close"
   └─ Generate

3. Review Generated Content (3 min)
   ├─ Check encounter balance
   ├─ Read tactics and rewards
   └─ Note alternative resolutions

4. Sync to Foundry (2 min)
   ├─ Find session with this map
   ├─ Click "🎲 Sync" button
   └─ Wait for confirmation

5. Verify in Foundry (4 min)
   ├─ Open scene in Foundry
   ├─ Check token positions
   ├─ Review enemy stat blocks
   └─ Ready to play!
```

**Sync Results Message:**
```
Sync completed!
Scenes: 1 synced, 0 failed
Actors: 5 synced, 0 failed
Journals: 1 synced, 0 failed
Tokens: 8 placed, 0 failed  ← NEW!
```

#### Best Practices for Combat Encounters

**Before Generation:**
- ✅ Set accurate party level in campaign defaults
- ✅ Update campaign party level as they advance
- ✅ Use CR calculator to understand difficulty
- ✅ Choose difficulty based on session pacing

**When to Use Custom Party Configuration:**
- ✅ Player absence (reduce party size for that session)
- ✅ Split party scenarios (generate for subgroup)
- ✅ Guest players (temporarily increase party size)
- ✅ Side quests with level variance
- ✅ Playtesting different party compositions
- ✅ Creating encounters for future levels

**During Generation:**
- ✅ Provide descriptive map details
- ✅ Match encounter difficulty to session goals
- ✅ Generate 2-3 encounters per map
- ✅ Use CR Calculator "Apply & Close" for quick adjustments
- ✅ Review encounters before syncing

**After Syncing:**
- ✅ Check Foundry scene layout
- ✅ Adjust token positions if needed
- ✅ Review enemy tactics
- ✅ Prepare backup plans (alternative resolutions)
- ✅ Note rewards for post-combat

**Difficulty Guidelines:**

**Easy Encounters:**
- Use for: Random encounters, weak guards
- Party resource cost: Minimal
- Best for: 4-6 encounters per adventuring day

**Medium Encounters:**
- Use for: Standard combat, challenging but fair
- Party resource cost: Some spell slots, HP
- Best for: 2-3 encounters per adventuring day

**Hard Encounters:**
- Use for: Boss minions, elite guards
- Party resource cost: Significant resources
- Best for: 1-2 encounters per adventuring day

**Deadly Encounters:**
- Use for: Major boss fights, climactic battles
- Party resource cost: Everything they have
- Best for: 1 encounter (session finale)

#### Troubleshooting Combat Features

**Problem:** JSON generation error
**Solution:**
- Check API logs: `make logs-api`
- Verify Groq API key is valid
- Try regenerating with simpler description
- System now ensures CR values are properly formatted as strings

**Problem:** Tokens not appearing
**Solution:**
- Ensure you clicked "🎲 Sync" button (NOT bulk sync)
- Verify session has both scenario AND map
- Check sync results message for token count
- View API logs for placement errors

**Problem:** Tokens positioned poorly
**Solution:**
- Map generator tries to use room centers
- If rooms too small, tokens may cluster
- Manually adjust in Foundry as needed
- Report if consistently poor placement

**Problem:** Wrong token sizes
**Solution:**
- System infers size from enemy name/CR
- Edit encounter enemy data if incorrect
- Resync to update

**Problem:** Encounters too easy/hard
**Solution:**
- Use CR calculator to verify difficulty
- Adjust party level if incorrect
- Choose different difficulty level
- Remember: Action economy matters (many weak > one strong)

### Player Backgrounds

**Generate connected backstories:**
- Input: Number of players
- Output: Interwoven character backgrounds
- Benefits: Built-in party connections

---

## 🎲 Foundry VTT Integration

### Syncing Content

**What Can Be Synced:**
- ✅ Maps (as Scenes with walls, lighting, grid)
- ✅ NPCs (as Actors with stats)
- ✅ Campaign Lore (as Journal Entries)
- ✅ Tokens (as token images)

### Sync Workflow

1. **Generate Content** in web interface
2. **Click "Sync to Foundry"** button
3. **Wait for confirmation**
4. **Check Foundry VTT:**
   - Scenes: Scenes tab
   - Actors: Actors tab
   - Journals: Journal Entries tab

### Individual vs Bulk Sync

**Individual Sync:**
```bash
- Sync Map → Creates/updates single scene
- Sync NPC → Creates/updates single actor
- Sync Lore → Creates/updates journal entry
```

**Bulk Sync:**
```bash
Campaign Actions → "Sync All to Foundry"
- Syncs all maps
- Syncs all NPCs
- Syncs campaign lore
- One-click operation
```

### Foundry Best Practices

1. **Before Your Session:**
   - Sync all content 24 hours before
   - Review scenes in Foundry
   - Add any custom touches
   - Test lighting and walls

2. **During Your Session:**
   - Use Foundry normally
   - Take notes in web interface
   - Record session results

3. **After Your Session:**
   - Finalize session in web interface
   - System captures outcomes
   - Ready for next session planning

---

## 💡 Best Practices

### Campaign Preparation

**Week Before Campaign:**
1. Create campaign
2. Generate world lore
3. Review and customize
4. Create first session

**Day Before Session:**
1. Generate session scenario
2. Generate needed NPCs
3. Generate maps
4. Sync to Foundry
5. Review in Foundry

**After Session:**
1. Record session results within 24 hours
2. Note any changes to NPCs
3. Record unfinished threads
4. Plan next session hook

### AI Generation Tips

**Be Descriptive:**
❌ "A dungeon"
✅ "An ancient dwarven forge dungeon, now flooded and occupied by water elementals"

**Provide Context:**
❌ "Generate an NPC"
✅ "Generate a corrupt city guard captain who secretly works for the thieves' guild"

**Iterate:**
- Not happy with result? Regenerate
- Mix AI content with your ideas
- Edit freely to fit your vision

### Session Continuity Tips

**Record Key Information:**
- ✅ Player decisions (not just outcomes)
- ✅ NPC relationships (who they like/hate)
- ✅ Unfinished plot threads
- ✅ Items obtained
- ✅ Locations discovered

**Don't Record:**
- ❌ Every dice roll
- ❌ Minor combat details
- ❌ Tangential jokes/banter

**Focus on:**
- What changed in the world?
- What did players care about?
- What threads should continue?

---

## 🎭 Sample Workflows

### Full Campaign Creation (30 minutes)

```
1. Create Campaign (5 min)
   - Name, setting, theme, tone
   - Generate world lore
   
2. Create NPCs (10 min)
   - Generate 5-10 key NPCs
   - Customize major NPCs
   
3. Create First Session (15 min)
   - Generate opening scenario
   - Generate starter map
   - Assign NPCs to session
   - Sync all to Foundry
```

### Weekly Session Prep (20 minutes)

```
1. Review Previous Session (5 min)
   - Read session notes
   - Check unfinished threads
   
2. Generate New Session (10 min)
   - AI creates scenario (uses previous context)
   - Generate any new NPCs
   - Generate maps if needed
   
3. Sync to Foundry (5 min)
   - Bulk sync new content
   - Quick review in Foundry
```

### Emergency "Zero-Prep" Session (10 minutes)

```
1. Generate Random Scenario (3 min)
   - Use AI with minimal input
   - Accept what it generates
   
2. Generate NPCs (3 min)
   - 2-3 random NPCs
   - Don't overthink it
   
3. Generate Map (2 min)
   - Pick a type
   - Generate
   
4. Sync and Go (2 min)
   - Sync to Foundry
   - Improvise details
```

---

## 🔧 Troubleshooting

### AI Generation Issues

**Problem:** AI generates content that doesn't fit
**Solution:** Be more specific in descriptions, include campaign context

**Problem:** Generation takes too long
**Solution:** Check API logs, ensure Groq API key is valid

**Problem:** Content seems repetitive
**Solution:** Vary your input descriptions, regenerate with different wording

### Foundry Sync Issues

**Problem:** Content not appearing in Foundry
**Solution:** 
1. Check sync status in web interface
2. Check API logs: `make logs-api`
3. Verify Foundry is running
4. Check Foundry connection: `make health`

**Problem:** Maps have wrong grid size
**Solution:** System uses 100px grid for Foundry v13 - check Foundry scene settings

**Problem:** Token images not showing
**Solution:** Check shared volume mount, verify DiceBear API is accessible

### Session Continuity Issues

**Problem:** Next session doesn't reference previous one
**Solution:** Ensure you finalized the previous session with detailed notes

**Problem:** AI ignores important plot points
**Solution:** Be explicit in session recording, highlight key decisions

---

## 📊 Understanding the System

### What AI Can Do Well

✅ Generate creative content quickly
✅ Maintain consistency across sessions
✅ Create balanced encounters
✅ Generate logical NPC motivations
✅ Build on previous events

### What AI Needs Help With

⚠️ Understanding your specific table's humor
⚠️ Knowing your house rules
⚠️ Predicting exact player reactions
⚠️ Balancing CR for your specific party

### Your Role as DM

**The AI is your assistant, not your replacement.**

You should:
- Guide the narrative
- Make final decisions
- Customize AI content
- Handle player interactions
- Improvise when needed

The AI helps with:
- Time-consuming prep
- Content generation
- Consistency tracking
- Inspiration when stuck

---

## 🎓 Advanced Techniques

### Multi-Arc Campaigns

1. Plan major story arcs (3-5 sessions each)
2. Generate arc overview with AI
3. Create sessions within each arc
4. Use session results to evolve arcs

### NPC Relationship Tracking

1. Record NPC interactions in session notes
2. Update NPC status (ally, enemy, neutral)
3. Reference relationships in future generations
4. Let AI evolve NPC motivations based on history

### Dynamic World Building

1. Record world changes in session notes
2. Let AI incorporate changes into future scenarios
3. Build reputation systems through session continuity
4. Create consequences for player actions

---

## 📞 Getting Help

### Resources

- **Makefile Commands**: `make help`
- **API Health**: `make health`
- **View Logs**: `make logs-api`
- **Documentation**: `/docs` folder

### Common Commands

```bash
# Check if everything is working
make health

# View API logs for errors
make logs-api

# Restart if something's stuck
make restart

# Start fresh if needed
make clean && make up
```

### System Status

Check http://localhost:3001/health/ready for API status

---

## 🎉 Quick Tips for Success

1. **Start Small**: Create one campaign, run one session
2. **Embrace Imperfection**: Not every AI generation will be perfect
3. **Customize**: Edit AI content to match your vision
4. **Record Promptly**: Finalize sessions while fresh
5. **Trust the System**: Session continuity works if you feed it good info
6. **Experiment**: Try different generation approaches
7. **Have Fun**: The goal is less prep, more gaming!

---

## 🚀 Next Steps

1. Create your first campaign
2. Generate some NPCs
3. Create a session
4. Generate a map
5. Sync to Foundry
6. Run your game!
7. Record the session
8. Plan the next one!

**Happy Gaming, DM!** 🎲

---

*For technical issues, see the [Troubleshooting section](#troubleshooting) or check the [MAKEFILE_REFERENCE.md](MAKEFILE_REFERENCE.md) for system commands.*
