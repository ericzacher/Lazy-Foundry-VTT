import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  RACES, CLASSES, BACKGROUNDS, SKILLS, ALIGNMENTS,
  STANDARD_ARRAY, POINT_BUY_COSTS, POINT_BUY_BUDGET,
  ABILITY_KEYS, ABILITY_LABELS,
  calcModifier, modString,
  getRaceData, getClassData, getBackgroundData, getSkillName,
  isSpellcaster, isPreparedCaster, getCantripCount, getSpellsKnown, getMaxSpellLevel,
  getSpellSlots, getAsiLevelsForClass, FEATS,
  type AbilityKey, type SuggestedArray,
} from '../data/dnd5e';
import { getCantripsForClass, getSpellsByLevel, type SpellEntry } from '../data/spells';
import type { CharacterData, AbilityScores, AsiChoice } from '../types';
import { PlayerStatus } from '../types';
import { api } from '../services/api';

// ─── Initial State ─────────────────────────────────────────────────────────

const DEFAULT_CHARACTER: CharacterData = {
  name: '',
  race: '',
  subrace: undefined,
  class: '',
  subclass: undefined,
  background: '',
  abilityScores: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
  chosenSkills: [],
  alignment: 'True Neutral',
  backstory: '',
  personalityTraits: undefined,
  ideals: undefined,
  bonds: undefined,
  flaws: undefined,
  startingEquipment: [],
  startingGold: 0,
  scoreMethod: 'standard',
  hpRoll: undefined,
  foundryUserId: undefined,
  level: 1,
  selectedCantrips: [],
  selectedSpells: [],
  asiChoices: [],
};

function getActiveSteps(className: string, level: number): string[] {
  const steps = ['Race', 'Class', 'Background', 'Ability Scores', 'Skills', 'Equipment'];
  if (className && isSpellcaster(className)) steps.push('Spells');
  if (className && getAsiLevelsForClass(className, level).length > 0) steps.push('Level Features');
  steps.push('Details & Review');
  return steps;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function applyRacialBonuses(base: AbilityScores, race: string, subrace?: string): AbilityScores {
  const raceData = getRaceData(race);
  if (!raceData) return base;

  const result = { ...base };

  // Apply base racial bonuses
  for (const [key, val] of Object.entries(raceData.abilityBonuses)) {
    (result as Record<string, number>)[key] = (result as Record<string, number>)[key] + val;
  }

  // Apply subrace bonuses
  if (subrace) {
    const subraceData = raceData.subraces?.find(s => s.name === subrace);
    if (subraceData) {
      for (const [key, val] of Object.entries(subraceData.abilityBonuses)) {
        (result as Record<string, number>)[key] = (result as Record<string, number>)[key] + val;
      }
    }
  }

  return result;
}


function calcProfBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

// ─── Step Components ───────────────────────────────────────────────────────

function ProgressBar({ step, steps }: { step: number; steps: string[] }) {
  return (
    <div className="mb-8">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-gray-400">Step {step} of {steps.length}</span>
        <span className="text-sm font-medium text-indigo-400">{steps[step - 1]}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${(step / steps.length) * 100}%` }}
        />
      </div>
      <div className="flex justify-between mt-2">
        {steps.map((s, i) => (
          <span
            key={s}
            className={`text-xs ${i + 1 === step ? 'text-indigo-400 font-semibold' : i + 1 < step ? 'text-gray-500' : 'text-gray-600'}`}
          >
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

// Step 1: Race
function StepRace({
  character, setCharacter,
}: {
  character: CharacterData;
  setCharacter: React.Dispatch<React.SetStateAction<CharacterData>>;
}) {
  const selected = getRaceData(character.race);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Choose Your Race</h2>
      <p className="text-gray-400 mb-6">Your race grants ability score increases, traits, and languages.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {RACES.map(race => (
          <button
            key={race.name}
            onClick={() => setCharacter(c => ({ ...c, race: race.name, subrace: undefined }))}
            className={`p-3 rounded-lg border text-left transition-all ${
              character.race === race.name
                ? 'border-indigo-500 bg-indigo-900/40 text-white'
                : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
            }`}
          >
            <div className="font-semibold text-sm">{race.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {Object.entries(race.abilityBonuses)
                .map(([k, v]) => `${ABILITY_LABELS[k]} +${v}`)
                .join(', ')}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">{selected.name}</h3>
            <span className="text-sm text-gray-400">Speed: {selected.speed}ft</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ability Bonuses</div>
              {Object.entries(selected.abilityBonuses).map(([k, v]) => (
                <div key={k} className="text-sm text-green-400">+{v} {ABILITY_LABELS[k]}</div>
              ))}
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Languages</div>
              {selected.languages.map(lang => (
                <div key={lang} className="text-sm text-gray-300">{lang}</div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Racial Traits</div>
            <div className="flex flex-wrap gap-1">
              {selected.traits.map(t => (
                <span key={t} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{t}</span>
              ))}
            </div>
          </div>

          {selected.subraces && selected.subraces.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Subrace</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {selected.subraces.map(sub => (
                  <button
                    key={sub.name}
                    onClick={() => setCharacter(c => ({ ...c, subrace: sub.name }))}
                    className={`p-2 rounded border text-left transition-all ${
                      character.subrace === sub.name
                        ? 'border-indigo-500 bg-indigo-900/40'
                        : 'border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-sm font-medium">{sub.name}</div>
                    <div className="text-xs text-gray-400">
                      {Object.entries(sub.abilityBonuses).map(([k, v]) => `+${v} ${ABILITY_LABELS[k]}`).join(', ')}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{sub.traits.join(' · ')}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Step 2: Class
function StepClass({
  character, setCharacter,
}: {
  character: CharacterData;
  setCharacter: React.Dispatch<React.SetStateAction<CharacterData>>;
}) {
  const selected = getClassData(character.class);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Choose Your Class</h2>
      <p className="text-gray-400 mb-6">Your class determines your hit die, saving throws, and proficiencies.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {CLASSES.map(cls => (
          <button
            key={cls.name}
            onClick={() => setCharacter(c => ({ ...c, class: cls.name, subclass: undefined, chosenSkills: [] }))}
            className={`p-3 rounded-lg border text-left transition-all ${
              character.class === cls.name
                ? 'border-indigo-500 bg-indigo-900/40 text-white'
                : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
            }`}
          >
            <div className="font-semibold text-sm">{cls.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">d{cls.hitDie} Hit Die{cls.source ? ` · ${cls.source}` : ''}</div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <h3 className="text-lg font-semibold mb-3">{selected.name}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Hit Die</div>
              <div className="text-2xl font-bold text-indigo-400">d{selected.hitDie}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Saving Throws</div>
              <div className="text-sm text-gray-300">{selected.savingThrows.map(s => ABILITY_LABELS[s]).join(', ')}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Armor Proficiencies</div>
              <div className="text-sm text-gray-300">{selected.armorProf.length > 0 ? selected.armorProf.join(', ') : 'None'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Weapon Proficiencies</div>
              <div className="text-sm text-gray-300">{selected.weaponProf.join(', ')}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Skill Choices ({selected.skillChoiceCount} from list)
              </div>
              <div className="flex flex-wrap gap-1">
                {selected.skillOptions.map(k => (
                  <span key={k} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{getSkillName(k)}</span>
                ))}
              </div>
            </div>

            {selected.subclasses.length > 0 && (
              <div className="col-span-2">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Subclass {selected.level1Subclass ? <span className="text-red-400">* required at level 1</span> : '(chosen at level 3 — pick now for reference)'}
                </div>
                <select
                  value={character.subclass ?? ''}
                  onChange={e => setCharacter(c => ({ ...c, subclass: e.target.value || undefined }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="">{selected.level1Subclass ? 'Select subclass (required)...' : 'Select subclass (optional)...'}</option>
                  {selected.subclasses.map(sc => (
                    <option key={sc} value={sc}>{sc}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Level Selector */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Character Level</div>
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setCharacter(c => {
              const newLevel = Math.max(1, (c.level ?? 1) - 1);
              const newAsiMilestones = getAsiLevelsForClass(c.class, newLevel);
              return {
                ...c,
                level: newLevel,
                asiChoices: (c.asiChoices ?? []).slice(0, newAsiMilestones.length),
              };
            })}
            className="w-8 h-8 rounded bg-gray-700 text-white hover:bg-gray-600 font-bold text-lg"
          >−</button>
          <span className="text-2xl font-bold text-white w-8 text-center">{character.level ?? 1}</span>
          <button
            onClick={() => setCharacter(c => ({ ...c, level: Math.min(20, (c.level ?? 1) + 1) }))}
            className="w-8 h-8 rounded bg-gray-700 text-white hover:bg-gray-600 font-bold text-lg"
          >+</button>
          <span className="text-sm text-gray-500 ml-2">
            Proficiency Bonus: +{Math.ceil((character.level ?? 1) / 4) + 1}
          </span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {[1, 3, 5, 8, 10, 12, 15, 17, 20].map(lvl => (
            <button
              key={lvl}
              onClick={() => setCharacter(c => {
                const newAsiMilestones = getAsiLevelsForClass(c.class, lvl);
                return {
                  ...c,
                  level: lvl,
                  asiChoices: (c.asiChoices ?? []).slice(0, newAsiMilestones.length),
                };
              })}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                (character.level ?? 1) === lvl
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 3: Background
function StepBackground({
  character, setCharacter,
}: {
  character: CharacterData;
  setCharacter: React.Dispatch<React.SetStateAction<CharacterData>>;
}) {
  const selected = getBackgroundData(character.background);

  const handleSelect = (bgName: string) => {
    const bg = getBackgroundData(bgName);
    setCharacter(c => {
      // Remove old background skills from chosenSkills, add new ones
      const oldBg = getBackgroundData(c.background);
      const oldBgSkills = oldBg?.skills ?? [];
      const newBgSkills = bg?.skills ?? [];
      const filtered = c.chosenSkills.filter(s => !oldBgSkills.includes(s));
      const merged = [...new Set([...filtered, ...newBgSkills])];
      return {
        ...c,
        background: bgName,
        chosenSkills: merged,
        startingEquipment: bg?.startingEquipment ?? [],
        startingGold: bg?.startingGold ?? 0,
      };
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Choose Your Background</h2>
      <p className="text-gray-400 mb-6">Your background provides skills, tools, languages, and equipment.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {BACKGROUNDS.map(bg => (
          <button
            key={bg.name}
            onClick={() => handleSelect(bg.name)}
            className={`p-3 rounded-lg border text-left transition-all ${
              character.background === bg.name
                ? 'border-indigo-500 bg-indigo-900/40 text-white'
                : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
            }`}
          >
            <div className="font-semibold text-sm">{bg.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{bg.skills.map(getSkillName).join(', ')}</div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <h3 className="text-lg font-semibold mb-3">{selected.name}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Skill Proficiencies</div>
              <div className="text-sm text-gray-300">{selected.skills.map(getSkillName).join(', ')}</div>
            </div>
            {selected.toolProf.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tool Proficiencies</div>
                <div className="text-sm text-gray-300">{selected.toolProf.join(', ')}</div>
              </div>
            )}
            {selected.languages > 0 && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Languages</div>
                <div className="text-sm text-gray-300">{selected.languages} of your choice</div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Starting Gold</div>
              <div className="text-sm text-yellow-400">{selected.startingGold} gp</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Feature</div>
              <div className="text-sm text-indigo-300 font-medium">{selected.feature}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Starting Equipment</div>
              <div className="flex flex-wrap gap-1">
                {selected.startingEquipment.map(item => (
                  <span key={item} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{item}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Suggestion chip component used inside StepAbilityScores
function SuggestionChips({
  suggestions,
  activeLabel,
  onApply,
}: {
  suggestions: SuggestedArray[];
  activeLabel: string | null;
  onApply: (s: SuggestedArray) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      <span className="text-xs text-gray-500 uppercase tracking-wide shrink-0">Suggested:</span>
      {suggestions.map(s => (
        <button
          key={s.label}
          onClick={() => onApply(s)}
          className={`px-3 py-1 rounded-full border text-xs font-medium transition-all ${
            activeLabel === s.label
              ? 'border-amber-500 bg-amber-900/40 text-amber-300'
              : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-amber-600 hover:text-amber-300'
          }`}
        >
          ★ {s.label}
          <span className="ml-1 text-gray-500 font-normal">
            {ABILITY_KEYS.map(k => s.scores[k]).join(' / ')}
          </span>
        </button>
      ))}
    </div>
  );
}

// Step 4: Ability Scores
function StepAbilityScores({
  character, setCharacter,
}: {
  character: CharacterData;
  setCharacter: React.Dispatch<React.SetStateAction<CharacterData>>;
}) {
  // For standard array: track assignments { abilityKey -> arrayValue }
  const [assignments, setAssignments] = useState<Partial<Record<AbilityKey, number>>>(
    () => {
      // Initialize from existing scores if they look like standard array values
      const initial: Partial<Record<AbilityKey, number>> = {};
      for (const key of ABILITY_KEYS) {
        const score = character.abilityScores[key];
        if (STANDARD_ARRAY.includes(score)) initial[key] = score;
      }
      return initial;
    }
  );
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const classData = getClassData(character.class);
  const suggestions = classData?.suggestedArrays ?? [];

  const applySuggestion = (s: SuggestedArray) => {
    const newScores = { ...character.abilityScores };
    const newAssignments: Partial<Record<AbilityKey, number>> = {};
    for (const key of ABILITY_KEYS) {
      const val = s.scores[key];
      if (val !== undefined) {
        newScores[key] = val;
        newAssignments[key] = val;
      }
    }
    setAssignments(newAssignments);
    setCharacter(c => ({ ...c, abilityScores: newScores }));
    setActiveLabel(s.label);
  };

  const usedValues = Object.values(assignments);
  const availableValues = STANDARD_ARRAY.filter(v => !usedValues.includes(v));

  const handleStandardAssign = (ability: AbilityKey, value: number) => {
    setActiveLabel(null); // manual edit clears suggestion highlight
    const newAssignments = { ...assignments };
    // If another ability already has this value, clear it
    for (const k of ABILITY_KEYS) {
      if (newAssignments[k] === value && k !== ability) delete newAssignments[k];
    }
    if (value === 0) {
      delete newAssignments[ability];
    } else {
      newAssignments[ability] = value;
    }
    setAssignments(newAssignments);

    // Update character scores
    const newScores = { ...character.abilityScores };
    for (const key of ABILITY_KEYS) {
      newScores[key] = newAssignments[key] ?? 8;
    }
    setCharacter(c => ({ ...c, abilityScores: newScores }));
  };

  // Point buy
  const pointsSpent = ABILITY_KEYS.reduce((sum, k) => {
    const score = character.abilityScores[k];
    return sum + (POINT_BUY_COSTS[score] ?? 0);
  }, 0);
  const pointsRemaining = POINT_BUY_BUDGET - pointsSpent;

  const handlePointBuyChange = (ability: AbilityKey, delta: number) => {
    setActiveLabel(null);
    const current = character.abilityScores[ability];
    const next = current + delta;
    if (next < 8 || next > 15) return;
    const costDelta = (POINT_BUY_COSTS[next] ?? 0) - (POINT_BUY_COSTS[current] ?? 0);
    if (pointsRemaining - costDelta < 0) return;
    setCharacter(c => ({
      ...c,
      abilityScores: { ...c.abilityScores, [ability]: next },
    }));
  };

  const raceData = getRaceData(character.race);
  const subraceData = raceData?.subraces?.find(s => s.name === character.subrace);
  const bonuses: Partial<Record<string, number>> = { ...raceData?.abilityBonuses };
  if (subraceData) {
    for (const [k, v] of Object.entries(subraceData.abilityBonuses)) {
      bonuses[k] = (bonuses[k] ?? 0) + v;
    }
  }

  const finalScores = applyRacialBonuses(character.abilityScores, character.race, character.subrace);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Assign Ability Scores</h2>
      <p className="text-gray-400 mb-4">Racial bonuses will be applied automatically.</p>

      {/* Method selector */}
      <div className="flex gap-3 mb-5">
        {(['standard', 'pointbuy'] as const).map(method => (
          <button
            key={method}
            onClick={() => {
              setCharacter(c => ({
                ...c,
                scoreMethod: method,
                abilityScores: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
              }));
              setAssignments({});
              setActiveLabel(null);
            }}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              character.scoreMethod === method
                ? 'border-indigo-500 bg-indigo-900/40 text-indigo-300'
                : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
            }`}
          >
            {method === 'standard' ? 'Standard Array' : 'Point Buy'}
          </button>
        ))}
      </div>

      {/* Suggested builds — shown for both methods */}
      <SuggestionChips
        suggestions={suggestions}
        activeLabel={activeLabel}
        onApply={applySuggestion}
      />

      {character.scoreMethod === 'standard' ? (
        <>
          <p className="text-sm text-gray-400 mb-4">
            Assign each value from the standard array [{STANDARD_ARRAY.join(', ')}] to an ability score.
            {availableValues.length > 0 && (
              <span className="ml-2 text-yellow-400">Remaining: [{availableValues.join(', ')}]</span>
            )}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ABILITY_KEYS.map(key => (
              <div key={key} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{ABILITY_LABELS[key]}</div>
                <select
                  value={assignments[key] ?? 0}
                  onChange={e => handleStandardAssign(key, parseInt(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-lg font-bold mb-1"
                >
                  <option value={0}>—</option>
                  {STANDARD_ARRAY.map(v => (
                    <option key={v} value={v} disabled={usedValues.includes(v) && assignments[key] !== v}>
                      {v}
                    </option>
                  ))}
                </select>
                {bonuses[key] && (
                  <div className="text-xs text-green-400">+{bonuses[key]} racial</div>
                )}
                {assignments[key] && (
                  <div className="text-sm font-bold text-indigo-300">
                    Final: {(assignments[key] ?? 8) + (bonuses[key] ?? 0)} ({modString(finalScores[key])})
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-4">
            <div className={`text-sm font-medium px-3 py-1 rounded-full ${pointsRemaining === 0 ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-300'}`}>
              {pointsRemaining} points remaining
            </div>
            <span className="text-xs text-gray-500">(Budget: 27 points, scores 8–15)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ABILITY_KEYS.map(key => {
              const score = character.abilityScores[key];
              const canIncrease = score < 15 && (pointsRemaining - ((POINT_BUY_COSTS[score + 1] ?? 0) - (POINT_BUY_COSTS[score] ?? 0))) >= 0;
              const canDecrease = score > 8;
              return (
                <div key={key} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">{ABILITY_LABELS[key]}</div>
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => handlePointBuyChange(key, -1)}
                      disabled={!canDecrease}
                      className="w-7 h-7 rounded bg-gray-700 text-white disabled:opacity-30 hover:bg-gray-600 font-bold"
                    >−</button>
                    <span className="text-2xl font-bold text-white w-8 text-center">{score}</span>
                    <button
                      onClick={() => handlePointBuyChange(key, 1)}
                      disabled={!canIncrease}
                      className="w-7 h-7 rounded bg-gray-700 text-white disabled:opacity-30 hover:bg-gray-600 font-bold"
                    >+</button>
                  </div>
                  {bonuses[key] && (
                    <div className="text-xs text-green-400">+{bonuses[key]} racial</div>
                  )}
                  <div className="text-sm font-bold text-indigo-300">
                    Final: {score + (bonuses[key] ?? 0)} ({modString(finalScores[key])})
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Step 5: Skills
function StepSkills({
  character, setCharacter,
}: {
  character: CharacterData;
  setCharacter: React.Dispatch<React.SetStateAction<CharacterData>>;
}) {
  const classData = getClassData(character.class);
  const bgData = getBackgroundData(character.background);

  const bgSkills = bgData?.skills ?? [];
  const classSkills = classData?.skillOptions ?? [];
  const choiceCount = classData?.skillChoiceCount ?? 2;

  // Class skill selections (not including background)
  const classChoices = character.chosenSkills.filter(s => !bgSkills.includes(s));
  const canSelectMore = classChoices.length < choiceCount;

  const toggleSkill = (key: string) => {
    if (bgSkills.includes(key)) return; // background skills are fixed

    if (character.chosenSkills.includes(key)) {
      setCharacter(c => ({ ...c, chosenSkills: c.chosenSkills.filter(s => s !== key) }));
    } else {
      if (!canSelectMore) return;
      setCharacter(c => ({ ...c, chosenSkills: [...c.chosenSkills, key] }));
    }
  };

  const finalScores = applyRacialBonuses(character.abilityScores, character.race, character.subrace);
  const profBonus = calcProfBonus(character.level ?? 1);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Choose Skills</h2>
      <p className="text-gray-400 mb-2">
        Your background grants <span className="text-indigo-300">{bgSkills.map(getSkillName).join(' & ')}</span> automatically.
        Choose <span className="text-indigo-300">{choiceCount}</span> more from your class list.
      </p>
      <div className="text-sm text-gray-400 mb-6">
        {classChoices.length}/{choiceCount} class skills chosen
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SKILLS.map(skill => {
          const isBg = bgSkills.includes(skill.key);
          const isChosen = character.chosenSkills.includes(skill.key);
          const isClassOption = classSkills.includes(skill.key);
          const isAvailable = isClassOption && !isBg;
          const abilityScore = finalScores[skill.ability as keyof AbilityScores];
          const abilityMod = calcModifier(abilityScore);
          const totalBonus = abilityMod + (isChosen ? profBonus : 0);

          return (
            <button
              key={skill.key}
              onClick={() => toggleSkill(skill.key)}
              disabled={isBg || (!isChosen && !canSelectMore) || (!isAvailable && !isBg)}
              className={`p-3 rounded-lg border text-left transition-all ${
                isBg
                  ? 'border-green-700 bg-green-900/20 cursor-default'
                  : isChosen
                  ? 'border-indigo-500 bg-indigo-900/30'
                  : isAvailable && canSelectMore
                  ? 'border-gray-700 bg-gray-800 hover:border-gray-500 cursor-pointer'
                  : 'border-gray-800 bg-gray-900 opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{skill.name}</span>
                <span className={`text-sm font-bold ${isChosen || isBg ? 'text-indigo-300' : 'text-gray-500'}`}>
                  {totalBonus >= 0 ? '+' : ''}{totalBonus}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500 uppercase">{skill.ability}</span>
                {isBg && <span className="text-xs text-green-400">Background</span>}
                {!isBg && isChosen && <span className="text-xs text-indigo-400">Proficient</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Step 6: Equipment
function StepEquipment({
  character, setCharacter,
}: {
  character: CharacterData;
  setCharacter: React.Dispatch<React.SetStateAction<CharacterData>>;
}) {
  const classData = getClassData(character.class);
  const bgData = getBackgroundData(character.background);
  const [useGold, setUseGold] = useState(false);
  const [selectedPack, setSelectedPack] = useState(0);

  const equipOptions = classData?.equipmentOptions ?? [];
  const bgEquipment = bgData?.startingEquipment ?? [];
  const bgGold = bgData?.startingGold ?? 0;

  // Gold option: startingGoldD6s × 10 gp (using average)
  const goldAmount = (classData?.startingGoldD6s ?? 1) * 10 * 2; // average of d6×startingGoldD6s×10

  const handlePackSelect = (idx: number) => {
    setSelectedPack(idx);
    const pack = equipOptions[idx];
    if (pack) {
      setCharacter(c => ({
        ...c,
        startingEquipment: [...pack.items, ...bgEquipment],
        startingGold: bgGold,
      }));
    }
  };

  const handleUseGold = (value: boolean) => {
    setUseGold(value);
    if (value) {
      setCharacter(c => ({
        ...c,
        startingEquipment: [...bgEquipment],
        startingGold: bgGold + goldAmount,
      }));
    } else {
      handlePackSelect(selectedPack);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Starting Equipment</h2>
      <p className="text-gray-400 mb-6">Choose a starting equipment pack or start with gold.</p>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => handleUseGold(false)}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
            !useGold ? 'border-indigo-500 bg-indigo-900/40 text-indigo-300' : 'border-gray-700 bg-gray-800 text-gray-400'
          }`}
        >
          Equipment Pack
        </button>
        <button
          onClick={() => handleUseGold(true)}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
            useGold ? 'border-yellow-600 bg-yellow-900/30 text-yellow-300' : 'border-gray-700 bg-gray-800 text-gray-400'
          }`}
        >
          Start with {goldAmount} gp
        </button>
      </div>

      {!useGold && (
        <div className="space-y-3 mb-6">
          {equipOptions.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handlePackSelect(idx)}
              className={`w-full p-4 rounded-lg border text-left transition-all ${
                selectedPack === idx
                  ? 'border-indigo-500 bg-indigo-900/30'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-500'
              }`}
            >
              <div className="text-sm font-medium text-gray-300 mb-2">{opt.label}</div>
              <div className="flex flex-wrap gap-1">
                {opt.items.map(item => (
                  <span key={item} className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">{item}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Background equipment (always shown) */}
      {bgEquipment.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            Background Equipment ({bgData?.name}) — always included
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {bgEquipment.map(item => (
              <span key={item} className="text-xs bg-green-900/30 text-green-400 border border-green-800 px-2 py-0.5 rounded">{item}</span>
            ))}
          </div>
          <div className="text-sm text-yellow-400">+{bgGold} gp from background</div>
        </div>
      )}
    </div>
  );
}

// Step 7: Details & Review
function StepDetails({
  character, setCharacter, onSync, onExport, syncing, syncResult,
}: {
  character: CharacterData;
  setCharacter: React.Dispatch<React.SetStateAction<CharacterData>>;
  onSync: () => void;
  onExport: () => void;
  syncing: boolean;
  syncResult: { success: boolean; foundryActorId?: string; name?: string; error?: string } | null;
}) {
  const [generatingLore, setGeneratingLore] = useState(false);
  const [loreError, setLoreError] = useState('');
  const [rolling, setRolling] = useState(false);
  const [animDie, setAnimDie] = useState(1);
  const [foundryPlayers, setFoundryPlayers] = useState<Array<{ _id: string; name: string; role: number }>>([]);

  // Fetch available Foundry players once on mount
  useEffect(() => {
    api.getFoundryPlayers()
      .then(r => { if (r.success) setFoundryPlayers(r.players); })
      .catch(() => {}); // silently fail — Foundry may not be connected
  }, []);

  const finalScores = applyRacialBonuses(character.abilityScores, character.race, character.subrace);
  const conMod = calcModifier(finalScores.con);
  const dexMod = calcModifier(finalScores.dex);
  const hitDie = getClassData(character.class)?.hitDie ?? 8;
  const charLevel = character.level ?? 1;
  const avgPerLevel = Math.max(1, Math.ceil(hitDie / 2) + 1 + conMod);
  const maxHp = Math.max(charLevel, (hitDie + conMod) + (charLevel - 1) * avgPerLevel);
  const displayHp = character.hpRoll !== undefined ? character.hpRoll : maxHp;
  const profBonus = calcProfBonus(charLevel);

  const handleRollHp = () => {
    if (rolling || !character.class) return;
    setRolling(true);
    // Level 1: always max hit die + CON
    let total = hitDie + conMod;
    // Levels 2+: roll each level separately
    let lastRoll = hitDie;
    for (let l = 2; l <= charLevel; l++) {
      lastRoll = Math.floor(Math.random() * hitDie) + 1;
      total += Math.max(1, lastRoll + conMod);
    }
    const finalHp = Math.max(charLevel, total);
    let ticks = 0;
    const interval = setInterval(() => {
      setAnimDie(Math.floor(Math.random() * hitDie) + 1);
      ticks++;
      if (ticks >= 10) {
        clearInterval(interval);
        setAnimDie(lastRoll);
        setCharacter(c => ({ ...c, hpRoll: finalHp }));
        setRolling(false);
      }
    }, 70);
  };

  // Simple AC calc (unarmored or leather)
  const hasChainMail = character.startingEquipment.some(e => e.toLowerCase().includes('chain mail'));
  const hasScaleMail = character.startingEquipment.some(e => e.toLowerCase().includes('scale mail'));
  const hasLeather = character.startingEquipment.some(e => e.toLowerCase().includes('leather armor'));
  const ac = hasChainMail ? 16 : hasScaleMail ? (14 + Math.min(dexMod, 2)) : hasLeather ? (11 + dexMod) : (10 + dexMod);

  const isComplete = character.name.trim().length > 0 && character.race && character.class && character.background;

  const handleGenerateLore = async () => {
    setGeneratingLore(true);
    setLoreError('');
    try {
      const result = await api.generateCharacterLore({
        name: character.name || undefined,
        race: character.race,
        subrace: character.subrace,
        class: character.class,
        subclass: character.subclass,
        background: character.background,
        alignment: character.alignment,
      });
      if (result.success) {
        setCharacter(c => ({
          ...c,
          backstory: result.backstory || c.backstory,
          personalityTraits: result.personalityTraits,
          ideals: result.ideals,
          bonds: result.bonds,
          flaws: result.flaws,
        }));
      }
    } catch (e) {
      setLoreError((e as Error).message || 'Failed to generate lore');
    } finally {
      setGeneratingLore(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Character Details & Review</h2>
      <p className="text-gray-400 mb-6">Name your character, write a backstory, and sync to Foundry VTT.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Character Name *</label>
          <input
            type="text"
            value={character.name}
            onChange={e => setCharacter(c => ({ ...c, name: e.target.value }))}
            placeholder="Enter character name..."
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Alignment</label>
          <select
            value={character.alignment}
            onChange={e => setCharacter(c => ({ ...c, alignment: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
          >
            {ALIGNMENTS.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {foundryPlayers.length > 0 && (
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1">
              Assign to Foundry Player
              <span className="ml-1 text-gray-600 text-xs">(gives them ownership of this actor)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCharacter(c => ({ ...c, foundryUserId: undefined }))}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                  !character.foundryUserId
                    ? 'border-indigo-500 bg-indigo-900/40 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                }`}
              >
                GM Only
              </button>
              {foundryPlayers.map(p => (
                <button
                  key={p._id}
                  onClick={() => setCharacter(c => ({ ...c, foundryUserId: p._id }))}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                    character.foundryUserId === p._id
                      ? 'border-green-500 bg-green-900/40 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Lore Generation */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-gray-400">Backstory & Personality</label>
            <button
              onClick={handleGenerateLore}
              disabled={generatingLore || !character.race || !character.class || !character.background}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-700 hover:bg-violet-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {generatingLore ? (
                <>
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>✨ Generate Lore</>
              )}
            </button>
          </div>
          {loreError && (
            <div className="text-red-400 text-xs mb-2 bg-red-900/20 border border-red-800 rounded px-2 py-1">{loreError}</div>
          )}
          <textarea
            value={character.backstory}
            onChange={e => setCharacter(c => ({ ...c, backstory: e.target.value }))}
            placeholder="Write your character's backstory, or use ✨ Generate Lore to create one with AI..."
            rows={4}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Personality Traits */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Personality Traits</label>
          <textarea
            value={character.personalityTraits?.join('\n') ?? ''}
            onChange={e => {
              const lines = e.target.value.split('\n').filter(l => l.trim());
              setCharacter(c => ({ ...c, personalityTraits: lines.length ? lines : undefined }));
            }}
            placeholder="One personality trait per line..."
            rows={3}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none text-sm"
          />
        </div>

        <div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ideals</label>
              <input
                type="text"
                value={character.ideals ?? ''}
                onChange={e => setCharacter(c => ({ ...c, ideals: e.target.value || undefined }))}
                placeholder="What drives your character?"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Bonds</label>
              <input
                type="text"
                value={character.bonds ?? ''}
                onChange={e => setCharacter(c => ({ ...c, bonds: e.target.value || undefined }))}
                placeholder="Connection to people, places, or ideals..."
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Flaws</label>
              <input
                type="text"
                value={character.flaws ?? ''}
                onChange={e => setCharacter(c => ({ ...c, flaws: e.target.value || undefined }))}
                placeholder="A vice, fear, or weakness..."
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Preview Card */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">{character.name || 'Unnamed Hero'}</h3>
            <p className="text-gray-400 text-sm">
              {character.subrace ? `${character.subrace} ` : ''}{character.race} {character.class} · {character.background}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Proficiency Bonus</div>
            <div className="text-xl font-bold text-indigo-400">+{profBonus}</div>
          </div>
        </div>

        {/* Combat stats */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="bg-gray-900 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-red-400">{displayHp}</div>
            <div className="text-xs text-gray-500">HP</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-blue-400">{ac}</div>
            <div className="text-xs text-gray-500">AC</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-green-400">30ft</div>
            <div className="text-xs text-gray-500">Speed</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-yellow-400">{charLevel}</div>
            <div className="text-xs text-gray-500">Level</div>
          </div>
        </div>

        {/* HP Calculator */}
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              {charLevel === 1 ? (
                <>
                  <span className="text-gray-500">d{hitDie}</span>
                  {rolling ? (
                    <span className="text-red-400 font-bold mx-1 inline-block w-6 text-center animate-pulse">{animDie}</span>
                  ) : (
                    <span className="text-gray-400 mx-1">{character.hpRoll !== undefined ? animDie : hitDie}</span>
                  )}
                  <span className="text-gray-600">+</span>
                  <span className={`mx-1 ${conMod >= 0 ? 'text-green-400' : 'text-red-400'}`}>{conMod >= 0 ? '+' : ''}{conMod}</span>
                  <span className="text-gray-600 mr-1">CON</span>
                </>
              ) : (
                <>
                  <span className="text-gray-500">Lv{charLevel} {character.class || '—'}</span>
                  <span className="text-gray-600 mx-1">d{hitDie}</span>
                  {rolling && <span className="text-red-400 font-bold mx-1 animate-pulse">{animDie}</span>}
                </>
              )}
              <span className="text-gray-600">=</span>
              <span className="text-red-400 font-bold ml-1">{displayHp} HP</span>
              <span className="ml-2 text-xs text-gray-600">
                {character.hpRoll !== undefined ? '(rolled)' : '(max avg)'}
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              {character.hpRoll !== undefined && (
                <button
                  onClick={() => setCharacter(c => ({ ...c, hpRoll: undefined }))}
                  className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                >
                  Use Max
                </button>
              )}
              <button
                onClick={handleRollHp}
                disabled={rolling || !character.class}
                className="text-xs px-3 py-1 rounded bg-red-900/40 border border-red-800 text-red-300 hover:bg-red-800/40 hover:text-red-200 disabled:opacity-40 transition-colors"
              >
                {rolling ? 'Rolling...' : `🎲 Roll d${hitDie}`}
              </button>
            </div>
          </div>
        </div>

        {/* Abilities */}
        <div className="grid grid-cols-6 gap-2 mb-4">
          {ABILITY_KEYS.map(key => (
            <div key={key} className="bg-gray-900 rounded-lg p-2 text-center border border-gray-800">
              <div className="text-xs text-gray-500 uppercase mb-1">{key}</div>
              <div className="text-lg font-bold text-white">{finalScores[key]}</div>
              <div className="text-sm font-medium text-indigo-300">{modString(finalScores[key])}</div>
            </div>
          ))}
        </div>

        {/* Skills */}
        {character.chosenSkills.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Skill Proficiencies</div>
            <div className="flex flex-wrap gap-1">
              {character.chosenSkills.map(key => (
                <span key={key} className="text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded">
                  {getSkillName(key)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Export button — always available */}
        <button
          onClick={onExport}
          className="w-full py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 text-sm font-medium transition-all flex items-center justify-center gap-2"
        >
          <span>⬇</span> Save Character File (.json)
        </button>

        {/* Sync button */}
        {syncResult?.success ? (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
            <div className="text-green-400 text-lg font-semibold mb-1">✓ Character synced to Foundry VTT!</div>
            <div className="text-gray-400 text-sm">
              <span className="font-medium text-white">{syncResult.name}</span> is now in your Actors tab.
            </div>
            {syncResult.foundryActorId && (
              <div className="text-xs text-gray-500 mt-1">Actor ID: {syncResult.foundryActorId}</div>
            )}
          </div>
        ) : (
          <>
            {syncResult?.error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
                {syncResult.error}
              </div>
            )}
            <button
              onClick={onSync}
              disabled={syncing || !isComplete}
              className={`w-full py-3 rounded-lg font-semibold text-lg transition-all ${
                isComplete && !syncing
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {syncing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Syncing to Foundry...
                </span>
              ) : !isComplete ? (
                'Complete all steps to sync'
              ) : (
                'Sync Character to Foundry VTT'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── AI Generation Modal ───────────────────────────────────────────────────

function AIGenerateModal({
  onGenerate,
  onClose,
}: {
  onGenerate: (character: CharacterData) => void;
  onClose: () => void;
}) {
  const [concept, setConcept] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!concept.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.generateAICharacter(concept);
      if (result.success && result.character) {
        onGenerate(result.character);
      } else {
        setError('Failed to generate character. Try again.');
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to generate character.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-lg w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">AI Character Generation</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        <p className="text-gray-400 text-sm mb-4">
          Describe your character concept and the AI will generate a complete D&D 5e character for you.
          You can edit any step after generation.
        </p>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">Character Concept</label>
          <textarea
            value={concept}
            onChange={e => setConcept(e.target.value)}
            placeholder='e.g. "A mysterious drow rogue who fled the Underdark and seeks redemption among surface folk. Cunning and sarcastic but fiercely loyal to friends."'
            rows={4}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none text-sm"
            disabled={loading}
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {[
            'A gruff hill dwarf fighter who was a decorated soldier',
            'A cheerful halfling bard who travels collecting stories',
            'A brooding tiefling warlock haunted by their patron',
            'A wise elderly gnome wizard obsessed with arcane research',
          ].map(example => (
            <button
              key={example}
              onClick={() => setConcept(example)}
              disabled={loading}
              className="text-xs bg-gray-700 text-gray-400 hover:text-gray-200 px-2 py-1 rounded border border-gray-600 hover:border-gray-400 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>

        {error && (
          <div className="text-red-400 text-sm mb-4 bg-red-900/20 border border-red-800 rounded p-2">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !concept.trim()}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating...
              </span>
            ) : 'Generate Character'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Import Format Adapters ─────────────────────────────────────────────────

// Our native format — just validate required keys exist
function isNativeFormat(data: Record<string, unknown>): boolean {
  return typeof data.race === 'string' && typeof data.class === 'string' && typeof data.background === 'string';
}

// D&D Beyond export format (JSON from character sheet export)
function fromDnDBeyond(data: Record<string, unknown>): Partial<CharacterData> | null {
  try {
    // DDB stats are an array: [{id:1,value:X},...] where id 1=STR, 2=DEX, 3=CON, 4=INT, 5=WIS, 6=CHA
    const stats = data.stats as Array<{ id: number; value: number }> | undefined;
    const abilityScores = stats ? {
      str: stats.find(s => s.id === 1)?.value ?? 8,
      dex: stats.find(s => s.id === 2)?.value ?? 8,
      con: stats.find(s => s.id === 3)?.value ?? 8,
      int: stats.find(s => s.id === 4)?.value ?? 8,
      wis: stats.find(s => s.id === 5)?.value ?? 8,
      cha: stats.find(s => s.id === 6)?.value ?? 8,
    } : undefined;

    const classes = data.classes as Array<{ definition: { name: string; subclassDefinition?: { name: string } } }> | undefined;
    const className = classes?.[0]?.definition?.name;
    const subclassName = classes?.[0]?.definition?.subclassDefinition?.name;

    const race = data.race as { fullName?: string; baseName?: string } | undefined;
    const raceName = race?.baseName ?? race?.fullName;

    const background = data.background as { definition: { name: string } } | undefined;
    const backgroundName = background?.definition?.name;

    const notes = data.notes as { personalityTraits?: string; ideals?: string; bonds?: string; flaws?: string; backstory?: string } | undefined;

    return {
      name: typeof data.name === 'string' ? data.name : '',
      race: raceName ?? '',
      class: className ?? '',
      subclass: subclassName,
      background: backgroundName ?? '',
      abilityScores,
      backstory: notes?.backstory ?? '',
      personalityTraits: notes?.personalityTraits ? [notes.personalityTraits] : undefined,
      ideals: notes?.ideals,
      bonds: notes?.bonds,
      flaws: notes?.flaws,
      scoreMethod: 'standard',
      chosenSkills: [],
      startingEquipment: [],
      startingGold: 0,
      alignment: 'True Neutral',
    };
  } catch {
    return null;
  }
}

function parseImportedCharacter(raw: Record<string, unknown>): CharacterData | null {
  // Native format
  if (isNativeFormat(raw)) {
    return { ...DEFAULT_CHARACTER, ...(raw as Partial<CharacterData>) } as CharacterData;
  }
  // D&D Beyond format
  if (raw.classes || raw.stats || raw.race) {
    const adapted = fromDnDBeyond(raw);
    if (adapted) return { ...DEFAULT_CHARACTER, ...adapted } as CharacterData;
  }
  return null;
}

// ─── Step: Spells ─────────────────────────────────────────────────────────────

// Floating spell tooltip shown on card hover
function SpellTooltip({ spell, x, y }: { spell: SpellEntry; x: number; y: number }) {
  // Keep tooltip inside viewport
  const LEFT_OFFSET = 16;
  const TOP_OFFSET = -8;
  const TOOLTIP_WIDTH = 260;
  const safeX = x + LEFT_OFFSET + TOOLTIP_WIDTH > window.innerWidth
    ? x - TOOLTIP_WIDTH - LEFT_OFFSET
    : x + LEFT_OFFSET;
  const safeY = Math.max(8, y + TOP_OFFSET);

  const ordinal = (n: number) => n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: safeX, top: safeY, width: TOOLTIP_WIDTH }}
    >
      <div className="bg-gray-900 border border-indigo-700 rounded-lg shadow-xl p-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="font-bold text-white text-sm leading-tight">{spell.name}</span>
          <span className="text-xs text-indigo-300 whitespace-nowrap shrink-0">
            {spell.level === 0 ? 'Cantrip' : `${ordinal(spell.level)}-level`}
          </span>
        </div>
        <div className="text-xs text-gray-400 mb-2">{spell.school}</div>
        <div className="flex gap-1 flex-wrap mb-2">
          {spell.concentration && (
            <span className="text-xs bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded">Concentration</span>
          )}
          {spell.ritual && (
            <span className="text-xs bg-teal-900/60 text-teal-300 px-1.5 py-0.5 rounded">Ritual</span>
          )}
        </div>
        {spell.description && (
          <p className="text-xs text-gray-300 leading-relaxed">{spell.description}</p>
        )}
      </div>
    </div>
  );
}

const SLOT_ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

function StepSpells({
  character, setCharacter,
}: {
  character: CharacterData;
  setCharacter: React.Dispatch<React.SetStateAction<CharacterData>>;
}) {
  const [spellLevelFilter, setSpellLevelFilter] = useState(1);
  const [search, setSearch] = useState('');
  const [hoveredSpell, setHoveredSpell] = useState<SpellEntry | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const level = character.level ?? 1;
  const cantripCount = getCantripCount(character.class, level);
  const maxSpellLevel = getMaxSpellLevel(character.class, level);
  const spellsKnown = getSpellsKnown(character.class, level);
  const prepared = isPreparedCaster(character.class);
  const selectedCantrips = character.selectedCantrips ?? [];
  const selectedSpells = character.selectedSpells ?? [];

  // Spell slots available at each level
  const slotTable = getSpellSlots(character.class, level);

  const toggleCantrip = (name: string) => {
    setCharacter(c => {
      const cur = c.selectedCantrips ?? [];
      if (cur.includes(name)) return { ...c, selectedCantrips: cur.filter(x => x !== name) };
      if (cur.length >= cantripCount) return c;
      return { ...c, selectedCantrips: [...cur, name] };
    });
  };

  const toggleSpell = (name: string) => {
    setCharacter(c => {
      const cur = c.selectedSpells ?? [];
      if (cur.includes(name)) return { ...c, selectedSpells: cur.filter(x => x !== name) };
      if (!prepared && spellsKnown >= 0 && cur.length >= spellsKnown) return c;
      return { ...c, selectedSpells: [...cur, name] };
    });
  };

  const handleMouseEnter = (spell: SpellEntry, e: React.MouseEvent) => {
    setHoveredSpell(spell);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (hoveredSpell) setTooltipPos({ x: e.clientX, y: e.clientY });
  };
  const handleMouseLeave = () => setHoveredSpell(null);

  const allCantrips = getCantripsForClass(character.class).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );
  const leveledSpells = getSpellsByLevel(character.class, spellLevelFilter).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  // Slots available at currently-viewed spell level
  const currentLevelSlots = slotTable[`spell${spellLevelFilter}`]?.max ?? 0;

  return (
    <div onMouseMove={handleMouseMove}>
      {hoveredSpell && <SpellTooltip spell={hoveredSpell} x={tooltipPos.x} y={tooltipPos.y} />}

      <h2 className="text-2xl font-bold mb-1">Choose Your Spells</h2>
      <p className="text-gray-400 mb-4">
        {character.class} — Level {level}.{' '}
        {prepared
          ? 'You prepare spells after a long rest (selection here is optional for reference).'
          : spellsKnown > 0 ? `Choose ${spellsKnown} spell${spellsKnown !== 1 ? 's' : ''} known.` : ''}
      </p>

      {/* Spell slot summary bar */}
      {maxSpellLevel > 0 && Object.keys(slotTable).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <span className="text-xs text-gray-500 mr-1 self-center">Slots:</span>
          {Object.entries(slotTable).map(([key, { max }]) => {
            const slotLvl = parseInt(key.replace('spell', ''), 10);
            return (
              <span
                key={key}
                className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded flex items-center gap-1"
              >
                <span className="text-gray-500">{SLOT_ORDINALS[slotLvl]}</span>
                <span className="text-indigo-300 font-semibold">{max}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Search spells..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-4 focus:outline-none focus:border-indigo-500"
      />

      {/* Cantrips */}
      {cantripCount > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Cantrips</h3>
            <span className={`text-xs px-2 py-0.5 rounded ${selectedCantrips.length === cantripCount ? 'bg-green-800 text-green-200' : 'bg-gray-700 text-gray-400'}`}>
              {selectedCantrips.length} / {cantripCount}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {allCantrips.map(spell => {
              const sel = selectedCantrips.includes(spell.name);
              const disabled = !sel && selectedCantrips.length >= cantripCount;
              return (
                <button
                  key={spell.name}
                  onClick={() => !disabled && toggleCantrip(spell.name)}
                  onMouseEnter={e => handleMouseEnter(spell, e)}
                  onMouseLeave={handleMouseLeave}
                  className={`p-2 rounded-lg border text-left text-xs transition-all ${
                    sel
                      ? 'border-indigo-500 bg-indigo-900/40 text-white'
                      : disabled
                        ? 'border-gray-700 bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="font-semibold">{spell.name}</div>
                  <div className="text-gray-500">{spell.school}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Leveled Spells */}
      {maxSpellLevel > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Leveled Spells
            </h3>
            {!prepared && spellsKnown > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded ${selectedSpells.length === spellsKnown ? 'bg-green-800 text-green-200' : 'bg-gray-700 text-gray-400'}`}>
                {selectedSpells.length} / {spellsKnown} known
              </span>
            )}
          </div>

          {/* Spell level tabs with slot counts */}
          <div className="flex gap-1 mb-3 flex-wrap">
            {Array.from({ length: maxSpellLevel }, (_, i) => i + 1).map(lvl => {
              const slots = slotTable[`spell${lvl}`]?.max ?? 0;
              const active = spellLevelFilter === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setSpellLevelFilter(lvl)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    active ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  <span>{SLOT_ORDINALS[lvl]}</span>
                  {slots > 0 && (
                    <span className={`text-xs rounded px-1 ${active ? 'bg-indigo-500/60 text-indigo-100' : 'bg-gray-600 text-gray-300'}`}>
                      {slots}◇
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Info line for current level */}
          {currentLevelSlots > 0 && (
            <p className="text-xs text-gray-500 mb-2">
              You have <span className="text-indigo-400 font-semibold">{currentLevelSlots}</span> {SLOT_ORDINALS[spellLevelFilter]}-level slot{currentLevelSlots !== 1 ? 's' : ''}.
              {!prepared && spellsKnown > 0 && ` (${spellsKnown - selectedSpells.length} spell${spellsKnown - selectedSpells.length !== 1 ? 's' : ''} left to pick)`}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {leveledSpells.map(spell => {
              const sel = selectedSpells.includes(spell.name);
              const disabled = !sel && !prepared && spellsKnown > 0 && selectedSpells.length >= spellsKnown;
              return (
                <button
                  key={spell.name}
                  onClick={() => !disabled && toggleSpell(spell.name)}
                  onMouseEnter={e => handleMouseEnter(spell, e)}
                  onMouseLeave={handleMouseLeave}
                  className={`p-2 rounded-lg border text-left text-xs transition-all ${
                    sel
                      ? 'border-indigo-500 bg-indigo-900/40 text-white'
                      : disabled
                        ? 'border-gray-700 bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="font-semibold">{spell.name}</div>
                  <div className="text-gray-500">
                    {spell.school}
                    {spell.concentration ? ' · Conc' : ''}
                    {spell.ritual ? ' · Ritual' : ''}
                  </div>
                </button>
              );
            })}
            {leveledSpells.length === 0 && (
              <div className="col-span-3 text-sm text-gray-500 py-4 text-center">No spells found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step: Level Features (ASI / Feats) ───────────────────────────────────────

function AsiOrFeatCard({
  milestoneLevel, choice, onChoice,
}: {
  milestoneLevel: number;
  choice: AsiChoice | undefined;
  onChoice: (c: AsiChoice) => void;
}) {
  const [tab, setTab] = useState<'asi' | 'feat'>(choice?.type ?? 'asi');
  const [featSearch, setFeatSearch] = useState('');

  const improvements = choice?.type === 'asi' ? (choice.improvements ?? {}) : {};
  const total = Object.values(improvements).reduce((a, b) => a + (b ?? 0), 0);

  const ABILITY_DISPLAY: Record<string, string> = {
    str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
  };

  const adjustAsi = (key: string, delta: number) => {
    const current = (improvements as Record<string, number>)[key] ?? 0;
    const newVal = Math.max(0, Math.min(2, current + delta));
    const newImps = { ...improvements, [key]: newVal } as Partial<Record<string, number>>;
    if (newVal === 0) delete newImps[key];
    const newTotal = Object.values(newImps).reduce((a: number, b) => a + (b ?? 0), 0);
    if (newTotal > 2) return;
    onChoice({ asiLevel: milestoneLevel, type: 'asi', improvements: newImps as AsiChoice['improvements'] });
  };

  const filteredFeats = FEATS.filter(f =>
    f.name.toLowerCase().includes(featSearch.toLowerCase())
  );

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-300">
          ASI / Feat at Level {milestoneLevel}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => { setTab('asi'); onChoice({ asiLevel: milestoneLevel, type: 'asi', improvements: {} }); }}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${tab === 'asi' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >ASI</button>
          <button
            onClick={() => { setTab('feat'); onChoice({ asiLevel: milestoneLevel, type: 'feat', feat: undefined }); }}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${tab === 'feat' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >Feat</button>
        </div>
      </div>

      {tab === 'asi' && (
        <div>
          <div className="text-xs text-gray-500 mb-3">
            Distribute +2 across any abilities (or +1/+1 to two different abilities). Points remaining: {2 - total}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Object.entries(ABILITY_DISPLAY).map(([key, label]) => {
              const val = (improvements as Record<string, number>)[key] ?? 0;
              return (
                <div key={key} className="flex flex-col items-center gap-1">
                  <div className="text-xs text-gray-400">{label}</div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => adjustAsi(key, -1)}
                      disabled={val === 0}
                      className="w-6 h-6 rounded bg-gray-700 text-white text-sm hover:bg-gray-600 disabled:opacity-30"
                    >−</button>
                    <span className={`text-sm font-bold w-4 text-center ${val > 0 ? 'text-green-400' : 'text-gray-500'}`}>{val > 0 ? `+${val}` : '0'}</span>
                    <button
                      onClick={() => adjustAsi(key, 1)}
                      disabled={total >= 2 || val >= 2}
                      className="w-6 h-6 rounded bg-gray-700 text-white text-sm hover:bg-gray-600 disabled:opacity-30"
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>
          {total === 2 && (
            <div className="mt-2 text-xs text-green-400">✓ +2 distributed</div>
          )}
        </div>
      )}

      {tab === 'feat' && (
        <div>
          <input
            type="text"
            placeholder="Search feats..."
            value={featSearch}
            onChange={e => setFeatSearch(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-xs mb-2 focus:outline-none focus:border-indigo-500"
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredFeats.map(feat => (
              <button
                key={feat.name}
                onClick={() => onChoice({ asiLevel: milestoneLevel, type: 'feat', feat: feat.name })}
                title={feat.description + (feat.prerequisite ? `\nPrereq: ${feat.prerequisite}` : '')}
                className={`w-full text-left p-2 rounded text-xs transition-colors ${
                  choice?.feat === feat.name
                    ? 'bg-indigo-900/40 border border-indigo-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <div className="font-semibold">{feat.name}</div>
                <div className="text-gray-400 truncate">{feat.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepLevelFeatures({
  character, setCharacter,
}: {
  character: CharacterData;
  setCharacter: React.Dispatch<React.SetStateAction<CharacterData>>;
}) {
  const level = character.level ?? 1;
  const milestones = getAsiLevelsForClass(character.class, level);
  const asiChoices = character.asiChoices ?? [];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Level Features</h2>
      <p className="text-gray-400 mb-6">
        {character.class} level {level} grants {milestones.length} Ability Score Improvement{milestones.length !== 1 ? 's' : ''} or Feat{milestones.length !== 1 ? 's' : ''}.
      </p>
      {milestones.map((milestoneLevel, i) => (
        <AsiOrFeatCard
          key={milestoneLevel}
          milestoneLevel={milestoneLevel}
          choice={asiChoices[i]}
          onChoice={choice => {
            const newChoices = [...asiChoices];
            newChoices[i] = choice;
            setCharacter(c => ({ ...c, asiChoices: newChoices }));
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function CharacterCreator() {
  const [searchParams] = useSearchParams();
  const playerId = searchParams.get('playerId') ?? undefined;

  const [step, setStep] = useState(1);
  const [character, setCharacter] = useState<CharacterData>(DEFAULT_CHARACTER);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    foundryActorId?: string;
    name?: string;
    error?: string;
  } | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [importError, setImportError] = useState('');
  const playerLoadedRef = useRef(false);

  // If a playerId is in the URL (invite flow), pre-load their foundryUserId and partyLevel
  useEffect(() => {
    if (!playerId || playerLoadedRef.current) return;
    playerLoadedRef.current = true;
    api.getPlayerPortal(playerId).then(data => {
      setCharacter(c => ({
        ...c,
        ...(data.player.foundryUserId ? { foundryUserId: data.player.foundryUserId } : {}),
        ...(data.campaign.partyLevel ? { level: data.campaign.partyLevel } : {}),
      }));
    }).catch(() => { /* non-critical */ });
  }, [playerId]);

  const activeSteps = getActiveSteps(character.class, character.level ?? 1);
  const currentStepName = activeSteps[step - 1] ?? '';

  const canProceed = (): boolean => {
    switch (currentStepName) {
      case 'Race': return !!character.race && (!getRaceData(character.race)?.subraces?.length || !!character.subrace);
      case 'Class': {
        if (!character.class) return false;
        const cls = getClassData(character.class);
        if (cls?.level1Subclass && !character.subclass) return false;
        return true;
      }
      case 'Background': return !!character.background;
      case 'Ability Scores': {
        if (character.scoreMethod === 'standard') {
          const sorted = [...Object.values(character.abilityScores)].sort((a, b) => b - a);
          const expected = [...STANDARD_ARRAY].sort((a, b) => b - a);
          return sorted.every((v, i) => v === expected[i]);
        }
        return true;
      }
      case 'Skills': {
        const classData = getClassData(character.class);
        const bgData = getBackgroundData(character.background);
        const bgSkills = bgData?.skills ?? [];
        const classChoices = character.chosenSkills.filter(s => !bgSkills.includes(s));
        return classChoices.length === (classData?.skillChoiceCount ?? 2);
      }
      case 'Equipment': return true;
      case 'Spells': {
        const lvl = character.level ?? 1;
        const needed = getCantripCount(character.class, lvl);
        if ((character.selectedCantrips ?? []).length !== needed) return false;
        const spellsKnown = getSpellsKnown(character.class, lvl);
        if (spellsKnown > 0) {
          return (character.selectedSpells ?? []).length === spellsKnown;
        }
        return true; // prepared casters: no enforced count
      }
      case 'Level Features': {
        const milestones = getAsiLevelsForClass(character.class, character.level ?? 1);
        return milestones.every((_, i) => {
          const c = (character.asiChoices ?? [])[i];
          if (!c) return false;
          if (c.type === 'feat') return !!c.feat;
          const total = Object.values(c.improvements ?? {}).reduce((a, b) => a + (b ?? 0), 0);
          return total === 2;
        });
      }
      default: return true;
    }
  };

  const handleAIGenerate = (generated: CharacterData) => {
    const mergedLevel = generated.level ?? character.level ?? 1;
    const steps = getActiveSteps(generated.class ?? '', mergedLevel);
    setCharacter({ ...DEFAULT_CHARACTER, ...generated, level: mergedLevel });
    setShowAIModal(false);
    setStep(steps.length); // jump to review
  };

  const handleExport = () => {
    const filename = `${character.name || 'character'}-lazyfoundry.json`;
    const blob = new Blob(
      [JSON.stringify({ ...character, _format: 'lazy-foundry-character', _version: 1 }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
        const parsed = parseImportedCharacter(raw);
        if (!parsed) {
          setImportError('Unrecognized file format. Supports Lazy Foundry exports and D&D Beyond character JSON.');
          return;
        }
        setCharacter(parsed);
        setSyncResult(null);
        setStep(getActiveSteps(parsed.class ?? '', parsed.level ?? 1).length);
      } catch {
        setImportError('Invalid JSON file. Please check the file and try again.');
      }
    };
    reader.readAsText(file);
    // reset input so same file can be re-imported
    e.target.value = '';
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      // Apply racial bonuses before sending — base scores are stored without them
      const racialScores = applyRacialBonuses(character.abilityScores, character.race, character.subrace);
      // Apply ASI improvements
      const finalScores = { ...racialScores };
      for (const choice of character.asiChoices ?? []) {
        if (choice.type === 'asi' && choice.improvements) {
          for (const [key, val] of Object.entries(choice.improvements)) {
            (finalScores as Record<string, number>)[key] = Math.min(20, (finalScores as Record<string, number>)[key] + (val ?? 0));
          }
        }
      }
      const result = await api.syncCharacterToFoundry({ ...character, abilityScores: finalScores });
      setSyncResult({ success: true, foundryActorId: result.foundryActorId, name: result.name });

      // If coming from invite flow, update the player record and mark as READY
      if (playerId && result.foundryActorId) {
        await api.updateCampaignPlayer(playerId, {
          foundryActorId: result.foundryActorId,
          characterName: result.name,
          characterData: { ...character, abilityScores: finalScores },
          status: PlayerStatus.READY,
        }).catch(() => { /* non-critical */ });
      }
    } catch (e) {
      setSyncResult({ success: false, error: (e as Error).message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">D&D 5e Character Creator</h1>
            <p className="text-xs text-gray-400">Create a character and sync it to Foundry VTT</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Import */}
            <label className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">
              <span>⬆</span>
              Import
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
            {/* Export */}
            <button
              onClick={handleExport}
              title="Save character as JSON file"
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
            >
              <span>⬇</span>
              Export
            </button>
            {/* AI Generate */}
            <button
              onClick={() => setShowAIModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-700 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <span>✨</span>
              AI Generate
            </button>
          </div>
        </div>
        {importError && (
          <div className="max-w-3xl mx-auto mt-2">
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-300 text-sm flex items-center justify-between">
              <span>{importError}</span>
              <button onClick={() => setImportError('')} className="text-red-400 hover:text-red-200 ml-3">&times;</button>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <ProgressBar step={step} steps={activeSteps} />

        {/* Step content */}
        <div className="bg-gray-850 min-h-64">
          {currentStepName === 'Race' && <StepRace character={character} setCharacter={setCharacter} />}
          {currentStepName === 'Class' && <StepClass character={character} setCharacter={setCharacter} />}
          {currentStepName === 'Background' && <StepBackground character={character} setCharacter={setCharacter} />}
          {currentStepName === 'Ability Scores' && <StepAbilityScores character={character} setCharacter={setCharacter} />}
          {currentStepName === 'Skills' && <StepSkills character={character} setCharacter={setCharacter} />}
          {currentStepName === 'Equipment' && <StepEquipment character={character} setCharacter={setCharacter} />}
          {currentStepName === 'Spells' && <StepSpells character={character} setCharacter={setCharacter} />}
          {currentStepName === 'Level Features' && <StepLevelFeatures character={character} setCharacter={setCharacter} />}
          {currentStepName === 'Details & Review' && (
            <StepDetails
              character={character}
              setCharacter={setCharacter}
              onSync={handleSync}
              onExport={handleExport}
              syncing={syncing}
              syncResult={syncResult}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-5 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 disabled:opacity-30 transition-all"
          >
            ← Previous
          </button>

          {step < activeSteps.length ? (
            <button
              onClick={() => setStep(s => Math.min(activeSteps.length, s + 1))}
              disabled={!canProceed()}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                canProceed()
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Next →
            </button>
          ) : null}
        </div>
      </div>

      {showAIModal && (
        <AIGenerateModal
          onGenerate={handleAIGenerate}
          onClose={() => setShowAIModal(false)}
        />
      )}
    </div>
  );
}
