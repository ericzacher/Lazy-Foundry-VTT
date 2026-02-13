import { useState } from 'react';

interface CRCalculatorProps {
  partySize: number;
  partyLevel: number;
  onClose: () => void;
  onApply?: (partySize: number, partyLevel: number) => void;
}

// D&D 5e CR to XP mapping
const CR_TO_XP: Record<string, number> = {
  '0': 10,
  '1/8': 25,
  '1/4': 50,
  '1/2': 100,
  '1': 200,
  '2': 450,
  '3': 700,
  '4': 1100,
  '5': 1800,
  '6': 2300,
  '7': 2900,
  '8': 3900,
  '9': 5000,
  '10': 5900,
  '11': 7200,
  '12': 8400,
  '13': 10000,
  '14': 11500,
  '15': 13000,
  '16': 15000,
  '17': 18000,
  '18': 20000,
  '19': 22000,
  '20': 25000,
  '21': 33000,
  '22': 41000,
  '23': 50000,
  '24': 62000,
  '25': 75000,
  '26': 90000,
  '27': 105000,
  '28': 120000,
  '29': 135000,
  '30': 155000,
};

// XP thresholds per character level
const XP_THRESHOLDS_PER_LEVEL: Record<number, { easy: number; medium: number; hard: number; deadly: number }> = {
  1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
  2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
  3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
  4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
  5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
  11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
  16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
  17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
  18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
  19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },
};

export function CRCalculator({ partySize, partyLevel, onClose, onApply }: CRCalculatorProps) {
  const [customPartySize, setCustomPartySize] = useState(partySize);
  const [customPartyLevel, setCustomPartyLevel] = useState(partyLevel);

  const thresholds = XP_THRESHOLDS_PER_LEVEL[customPartyLevel] || XP_THRESHOLDS_PER_LEVEL[1];
  const partyThresholds = {
    easy: thresholds.easy * customPartySize,
    medium: thresholds.medium * customPartySize,
    hard: thresholds.hard * customPartySize,
    deadly: thresholds.deadly * customPartySize,
  };

  // Calculate recommended CR ranges for different difficulties
  const getRecommendedCRRange = (difficulty: 'easy' | 'medium' | 'hard' | 'deadly'): string => {
    const targetXP = partyThresholds[difficulty];

    // Find CR values that are appropriate
    const crValues = Object.entries(CR_TO_XP)
      .filter(([_, xp]) => {
        if (difficulty === 'easy') return xp >= targetXP * 0.5 && xp <= targetXP * 1.2;
        if (difficulty === 'medium') return xp >= targetXP * 0.6 && xp <= targetXP * 1.3;
        if (difficulty === 'hard') return xp >= targetXP * 0.7 && xp <= targetXP * 1.4;
        return xp >= targetXP * 0.8 && xp <= targetXP * 1.5;
      })
      .map(([cr]) => cr);

    if (crValues.length === 0) return 'N/A';
    if (crValues.length === 1) return crValues[0];
    return `${crValues[0]} - ${crValues[crValues.length - 1]}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">CR Calculator</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ×
          </button>
        </div>

        {/* Party Configuration */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3">Party Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Party Size</label>
              <input
                type="number"
                min="1"
                max="10"
                value={customPartySize}
                onChange={(e) => setCustomPartySize(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Party Level</label>
              <input
                type="number"
                min="1"
                max="20"
                value={customPartyLevel}
                onChange={(e) => setCustomPartyLevel(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* XP Thresholds */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3">XP Thresholds (Total Party)</h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-green-900/30 border border-green-700 rounded p-3">
              <div className="text-green-400 text-xs font-medium mb-1">Easy</div>
              <div className="text-xl font-bold">{partyThresholds.easy.toLocaleString()}</div>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3">
              <div className="text-yellow-400 text-xs font-medium mb-1">Medium</div>
              <div className="text-xl font-bold">{partyThresholds.medium.toLocaleString()}</div>
            </div>
            <div className="bg-orange-900/30 border border-orange-700 rounded p-3">
              <div className="text-orange-400 text-xs font-medium mb-1">Hard</div>
              <div className="text-xl font-bold">{partyThresholds.hard.toLocaleString()}</div>
            </div>
            <div className="bg-red-900/30 border border-red-700 rounded p-3">
              <div className="text-red-400 text-xs font-medium mb-1">Deadly</div>
              <div className="text-xl font-bold">{partyThresholds.deadly.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Recommended CR Ranges */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3">Recommended CR Ranges</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-600">
              <span className="text-green-400">Easy Encounter:</span>
              <span className="font-mono font-bold">CR {getRecommendedCRRange('easy')}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-600">
              <span className="text-yellow-400">Medium Encounter:</span>
              <span className="font-mono font-bold">CR {getRecommendedCRRange('medium')}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-600">
              <span className="text-orange-400">Hard Encounter:</span>
              <span className="font-mono font-bold">CR {getRecommendedCRRange('hard')}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-red-400">Deadly Encounter:</span>
              <span className="font-mono font-bold">CR {getRecommendedCRRange('deadly')}</span>
            </div>
          </div>
        </div>

        {/* Understanding CR */}
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-blue-400">📖 Understanding Challenge Rating (CR)</h3>
          <div className="text-sm text-gray-300 space-y-2">
            <p>
              <strong>CR</strong> represents the difficulty of a single monster for a party of 4 characters.
              The values shown above account for your actual party size.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Easy:</strong> Most characters won't be hurt badly (resource drain only)</li>
              <li><strong>Medium:</strong> One or two might get hurt, short rest needed</li>
              <li><strong>Hard:</strong> Dangerous, long rest recommended after</li>
              <li><strong>Deadly:</strong> One or more characters could die</li>
            </ul>
            <p className="mt-3 text-xs text-gray-400">
              <em>Note:</em> Multiple weaker enemies can be more dangerous than a single strong one due to action economy.
              The XP thresholds account for this when building encounters.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {onApply && (
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onApply(customPartySize, customPartyLevel)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
            >
              Apply & Close
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded font-medium"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
