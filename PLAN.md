# Plan: Level-Dependent Character Creation (Spells + ASI/Feats)

## Overview
Add level-aware spellcasting and level features (ASI or Feat) to the D&D 5e Character Creator. Character level auto-fills from campaign `partyLevel`. Two new optional wizard steps appear based on class + level.

## New Steps (conditional)
- **Spells** — appears after Equipment for spellcasting classes (Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard). Shows cantrip picker + leveled spell picker.
- **Level Features** — appears before Details & Review when character level ≥ 4 (first ASI milestone). Shows ASI (+2 to one stat or +1/+1 to two) or Feat picker per milestone.

## Files Changed
| File | Change |
|---|---|
| `web/src/data/spells.ts` | **New** — PHB cantrips + levels 1–9 spells (~200 entries) |
| `web/src/data/dnd5e.ts` | Add ASI_LEVELS, SPELL_SLOTS tables, SPELLCASTING_CLASS_INFO, FEATS, helper fns |
| `web/src/types/index.ts` | Add `AsiChoice` interface; extend `CharacterData` with level/spells/asiChoices |
| `web/src/pages/CharacterCreator.tsx` | Dynamic step list, StepSpells, StepLevelFeatures, level selector in Class step |
| `api/src/routes/characters.ts` | Multi-level HP, spell slot injection, spell item resolution, level on actor |
| `api/src/routes/invite.ts` | Add `partyLevel` to portal response |

## Spellcasting Classes
- **Full casters** (Bard, Cleric, Druid, Sorcerer, Wizard): slots at every level
- **Half casters** (Paladin, Ranger): slots start at level 2
- **Pact magic** (Warlock): separate pact slot progression
- Prepared casters (Cleric, Druid, Paladin, Wizard): no enforced spell count — show "prepare X/day"
- Known-spell casters (Bard, Ranger, Sorcerer, Warlock): enforce exact spells-known count

## ASI Levels by Class
- Most classes: 4, 8, 12, 16, 19
- Fighter: 4, 6, 8, 12, 14, 16, 19 (extra)
- Rogue: 4, 8, 10, 12, 16 (extra)

## Backend Sync Changes
- `system.details.level` set from character level
- HP = (maxHitDie + CON) + (level-1) × (avg hit die + CON)
- Spell slots from `buildSpellSlots(class, level)`
- Selected spells/cantrips resolved from `dnd5e.spells` compendium
