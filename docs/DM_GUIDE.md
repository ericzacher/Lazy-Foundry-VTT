# Lazy Foundry VTT - Dungeon Master's Guide

Welcome, Dungeon Master! This guide will help you leverage Lazy Foundry VTT's AI-powered features to create engaging campaigns with minimal prep time.

## 📚 Table of Contents

1. [Getting Started](#getting-started)
2. [Campaign Management](#campaign-management)
3. [Session Planning](#session-planning)
4. [AI-Powered Content Generation](#ai-powered-content-generation)
5. [Foundry VTT Integration](#foundry-vtt-integration)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Getting Started

### First Time Setup

1. **Access the Dashboard**
   - Navigate to http://localhost:3000
   - Register for an account using your email

2. **Understand the Interface**
   - **Dashboard**: Overview of all campaigns and quick stats
   - **Campaigns**: Create and manage campaigns
   - **Sessions**: Plan and track game sessions
   - **Generate**: AI content generation tools

3. **Foundry VTT Access**
   - Access Foundry at http://localhost:30000
   - Use admin password from your `.env` file (`FOUNDRY_ADMIN_KEY`)

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

### Encounter Generation

**Inputs:**
- Party level
- Party composition
- Terrain type
- Difficulty preference

**Outputs:**
- Balanced encounter
- Enemy stats
- Tactical suggestions
- Terrain features
- Victory/defeat conditions

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
