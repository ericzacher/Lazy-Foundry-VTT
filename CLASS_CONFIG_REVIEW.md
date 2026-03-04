# Class Configuration Review

## Summary of Findings

### ✅ Verified Correct

| Config | Status | Notes |
|--------|--------|-------|
| Hit Dice | ✅ | All 13 classes match PHB |
| Saving Throws | ✅ | All 13 classes match PHB |
| Spell Slot Tables | ✅ | Full, half, pact, and Artificer tables correct |
| Cantrip Progression | ✅ | All spellcasting classes have correct cantrip counts |
| Prepared vs Known Casters | ✅ | Artificer, Cleric, Druid, Paladin, Wizard are prepared |
| Artificer Spells at L1 | ✅ | Special table handles Artificer getting slots at level 1 |

---

## ⚠️ Potential Issues Found

### 1. Monk Saving Throws - INCORRECT
**Location:** `api/src/routes/characters.ts` line 129

**Current:** `Monk: ['str', 'dex']`
**Should be:** `Monk: ['str', 'dex']` ✅ Actually correct!

Wait, let me verify against PHB... Monk saves are STR and DEX. This is correct.

### 2. Fighter Skill Options - Verify
**Location:** `web/src/data/dnd5e.ts` line 408

**Current:** `skillOptions: ['acr', 'ani', 'ath', 'his', 'ins', 'itm', 'prc', 'sur']`
**PHB Fighter skills:** Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Perception, Survival

✅ Correct (8 skills, choose 2)

### 3. Rogue Expertise - NOT IMPLEMENTED
Rogues get Expertise at level 1 (double proficiency in 2 skills). This is NOT currently tracked.

**Impact:** Rogues won't have expertise in Foundry VTT.

### 4. Bard Jack of All Trades - NOT IMPLEMENTED
Bards at level 2+ get half proficiency to all non-proficient ability checks.

**Impact:** Not reflected in character sheet.

### 5. Monk Martial Arts Die - NOT TRACKED
Monks use a martial arts die that scales with level (d4 → d6 → d8 → d10).

**Impact:** Monk unarmed damage may be incorrect.

### 6. Multiclassing - NOT SUPPORTED
No multiclass support exists.

---

## Equipment Name Mismatches (Likely Compendium Issues)

The following equipment items may not match Foundry compendium names:

| Class | Equipment | Potential Issue |
|-------|-----------|-----------------|
| Artificer | "2 Hand Crossbows" | Should be "Hand Crossbow (2)" or separate items |
| Artificer | "Thieves' Tools" | Check apostrophe format |
| Barbarian | "2 Handaxes" | Should be "Handaxe (2)" |
| Fighter | "2 Handaxes", "2 Shortswords" | Quantity format |
| Rogue | "2 Daggers" | Quantity format |

---

## Spellcasting Gaps

### Classes with Spellcasting Subclasses
These non-caster classes can gain spells via subclass, but this isn't supported:

- **Fighter (Eldritch Knight)**: Gets wizard spells at level 3
- **Rogue (Arcane Trickster)**: Gets wizard spells at level 3

### Third-Caster Progression Missing
Eldritch Knight and Arcane Trickster use "third-caster" progression (spells at level 3, slower advancement).

---

## Race Configuration Issues

### Dragonborn Breath Weapon - NOT CONFIGURED
Dragonborn need ancestry selection for breath weapon type (fire, cold, lightning, etc.).

**Current traits:** `['Breath Weapon', 'Damage Resistance']`
**Missing:** Ancestry/color selection that determines damage type

### Half-Elf Ability Scores - PARTIALLY IMPLEMENTED
Half-Elves get +2 CHA and +1 to two other abilities of choice.

**Current:** Only `abilityBonuses: { cha: 2 }` is set
**Missing:** The +1 to two abilities of choice

### Variant Human - NOT SUPPORTED
PHB Variant Human: +1 to two abilities, one skill, one feat.

**Current:** Standard Human with +1 to all abilities only.

---

## Subclass Issues

### Level 1 Subclass Classes
Only these are marked as requiring subclass at level 1:
- Cleric ✅
- Sorcerer ✅
- Warlock ✅

This is correct per PHB.

### Subclass Names May Not Match Compendium
Subclass names include source in parentheses:
- `'Path of the Berserker (PHB)'`

This may not match Foundry compendium names which likely omit the source:
- `'Path of the Berserker'`

---

## Recommendations

### High Priority Fixes

1. **Equipment quantity format**: Change "2 Handaxes" → "Handaxe, Handaxe" or handle in parseItemName
2. **Rogue Expertise**: Add expertise field to CharacterData
3. **Half-Elf flexible ASI**: Add UI for selecting +1 to two abilities
4. **Dragonborn ancestry**: Add ancestry/color selection

### Medium Priority

5. **Subclass name normalization**: Strip "(PHB)", "(XGtE)", etc. when querying compendium
6. **Third-caster support**: For Eldritch Knight and Arcane Trickster

### Low Priority (Complex Features)

7. **Monk Martial Arts scaling**
8. **Bard Jack of All Trades**
9. **Variant Human support**
10. **Multiclassing**

---

## Files to Check

- `web/src/data/dnd5e.ts` - Main class/race/background data
- `api/src/routes/characters.ts` - Sync logic, spell slots, AC calculation
- `web/src/pages/CharacterCreator.tsx` - UI and validation logic
