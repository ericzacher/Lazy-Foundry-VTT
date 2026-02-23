import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Campaign, StoreData, StoreItem } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const SETTLEMENT_SIZES = [
  { value: 'hamlet',     label: 'Hamlet',     sub: 'Common only' },
  { value: 'village',    label: 'Village',    sub: 'Uncommon' },
  { value: 'town',       label: 'Town',       sub: 'Rare' },
  { value: 'city',       label: 'City',       sub: 'Very Rare' },
  { value: 'metropolis', label: 'Metropolis', sub: 'Legendary' },
];

const STORE_TYPES = [
  { value: 'general',     label: 'General Store',  icon: '🏪' },
  { value: 'blacksmith',  label: 'Blacksmith',      icon: '⚒️' },
  { value: 'armorer',     label: 'Armorer',         icon: '🛡️' },
  { value: 'alchemist',   label: 'Alchemist',       icon: '⚗️' },
  { value: 'magic',       label: 'Magic Shop',      icon: '🔮' },
  { value: 'herbalist',   label: 'Herbalist',       icon: '🌿' },
  { value: 'tailor',      label: 'Tailor',          icon: '🧵' },
  { value: 'jeweler',     label: 'Jeweler',         icon: '💎' },
  { value: 'fence',       label: 'Fence',           icon: '🗡️' },
  { value: 'shipwright',  label: 'Shipwright',      icon: '⚓' },
];

const RACES = [
  'Mixed', 'Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome',
  'Half-Elf', 'Tiefling', 'Dragonborn', 'Half-Orc',
];

const BIOMES = [
  'Urban', 'Forest', 'Mountain', 'Coastal', 'Underground', 'Desert', 'Arctic',
];

const RARITY_COLORS: Record<string, string> = {
  common:      'text-gray-300',
  uncommon:    'text-green-400',
  rare:        'text-blue-400',
  'very rare': 'text-purple-400',
  legendary:   'text-orange-400',
};

const RARITY_BG: Record<string, string> = {
  common:      'bg-gray-800',
  uncommon:    'bg-green-900/20',
  rare:        'bg-blue-900/20',
  'very rare': 'bg-purple-900/20',
  legendary:   'bg-orange-900/20',
};

const CATEGORY_ICONS: Record<string, string> = {
  weapon: '⚔️', armor: '🛡️', potion: '🧪', gear: '🎒',
  tool: '🔧', magic: '✨', trade: '💰', clothing: '👘',
};

// ─── Config Form ──────────────────────────────────────────────────────────────

interface StoreConfig {
  settlementSize: string;
  storeType: string;
  racialInfluence: string;
  biome: string;
  stockSize: string;
  magicItems: boolean;
  campaignId?: string;
  locationName?: string;
}

const DEFAULT_CONFIG: StoreConfig = {
  settlementSize: 'town',
  storeType: 'general',
  racialInfluence: 'mixed',
  biome: 'urban',
  stockSize: 'medium',
  magicItems: true,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PillSelect({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; sub?: string; icon?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
            value === opt.value
              ? 'border-indigo-500 bg-indigo-900/40 text-white'
              : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-200'
          }`}
        >
          {opt.icon && <span className="mr-1">{opt.icon}</span>}
          {opt.label}
          {opt.sub && <span className="ml-1 text-xs text-gray-500">({opt.sub})</span>}
        </button>
      ))}
    </div>
  );
}

function InventoryTable({ items }: { items: StoreItem[] }) {
  const [sortKey, setSortKey] = useState<'name' | 'rarity' | 'priceGp' | 'category'>('category');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const rarityRank = (r: string) => ['common','uncommon','rare','very rare','legendary'].indexOf(r);

  const sorted = [...items]
    .filter(i => !filter || i.name.toLowerCase().includes(filter.toLowerCase()) || i.category.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name')     cmp = a.name.localeCompare(b.name);
      if (sortKey === 'rarity')   cmp = rarityRank(a.rarity) - rarityRank(b.rarity);
      if (sortKey === 'priceGp')  cmp = a.priceGp - b.priceGp;
      if (sortKey === 'category') cmp = a.category.localeCompare(b.category);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const SortBtn = ({ col, label }: { col: typeof sortKey; label: string }) => (
    <button
      onClick={() => toggleSort(col)}
      className={`text-left text-xs uppercase tracking-wide font-semibold transition-colors ${
        sortKey === col ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {label} {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </button>
  );

  return (
    <div>
      <div className="mb-3">
        <input
          type="text"
          placeholder="Filter items..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="pb-2 pr-3 text-left"><SortBtn col="name" label="Item" /></th>
              <th className="pb-2 pr-3 text-left"><SortBtn col="category" label="Type" /></th>
              <th className="pb-2 pr-3 text-left"><SortBtn col="rarity" label="Rarity" /></th>
              <th className="pb-2 pr-3 text-center text-xs uppercase tracking-wide text-gray-500 font-semibold">Qty</th>
              <th className="pb-2 text-right"><SortBtn col="priceGp" label="Price" /></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, i) => (
              <tr key={i} className={`border-b border-gray-800 ${RARITY_BG[item.rarity]} hover:bg-gray-700/30 transition-colors`}>
                <td className="py-2 pr-3">
                  <div className="flex items-start gap-1.5">
                    <span className="text-base leading-tight">{CATEGORY_ICONS[item.category] ?? '•'}</span>
                    <div>
                      <div className="text-white font-medium leading-tight">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-gray-400 mt-0.5 italic">{item.description}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2 pr-3 text-gray-400 text-xs capitalize">{item.category}</td>
                <td className={`py-2 pr-3 text-xs font-medium capitalize ${RARITY_COLORS[item.rarity]}`}>
                  {item.rarity}
                </td>
                <td className="py-2 pr-3 text-center text-gray-300">{item.quantity}</td>
                <td className="py-2 text-right font-medium text-yellow-400">
                  {item.priceGp >= 1000
                    ? `${(item.priceGp / 1000).toFixed(1)}k gp`
                    : `${item.priceGp} gp`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="text-center text-gray-500 py-6">No items match filter.</div>
        )}
      </div>
    </div>
  );
}

function StoreCard({
  store,
  onDelete,
  onExport,
  exporting,
}: {
  store: StoreData;
  onDelete: () => void;
  onExport: () => void;
  exporting: boolean;
}) {
  const storeTypeData = STORE_TYPES.find(s => s.value === store.storeType);
  const icon = storeTypeData?.icon ?? '🏪';

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      {/* Header */}
      <div className="p-5 border-b border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{icon}</span>
              <h2 className="text-2xl font-bold text-white">{store.name}</h2>
            </div>
            <p className="text-sm text-gray-400">
              {storeTypeData?.label} · {store.settlementSize.charAt(0).toUpperCase() + store.settlementSize.slice(1)} · {store.biome.charAt(0).toUpperCase() + store.biome.slice(1)}
              {store.racialInfluence !== 'mixed' && ` · ${store.racialInfluence.charAt(0).toUpperCase() + store.racialInfluence.slice(1)} influence`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-gray-500">Total value</div>
            <div className="text-xl font-bold text-yellow-400">
              {store.totalValue >= 1000
                ? `${Math.round(store.totalValue / 100) / 10}k gp`
                : `${Math.round(store.totalValue)} gp`}
            </div>
          </div>
        </div>

        {/* Atmosphere */}
        {store.description && (
          <p className="text-gray-300 text-sm mt-3 italic border-l-2 border-indigo-800 pl-3">
            {store.description}
          </p>
        )}
      </div>

      {/* Shopkeeper */}
      <div className="px-5 py-3 border-b border-gray-700 bg-gray-850/50">
        <div className="flex items-start gap-2">
          <span className="text-lg">🧑‍💼</span>
          <div>
            <span className="font-semibold text-white">{store.shopkeeperName}</span>
            <span className="text-gray-400 text-sm ml-2">({store.shopkeeperRace})</span>
            {store.shopkeeperPersonality && (
              <p className="text-gray-400 text-sm mt-0.5">{store.shopkeeperPersonality}</p>
            )}
          </div>
        </div>
      </div>

      {/* Inventory */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Inventory — {store.inventory?.length ?? 0} items
          </h3>
          <div className="flex gap-2">
            {store.foundryJournalId ? (
              <span className="text-xs text-green-400 flex items-center gap-1">✓ In Foundry</span>
            ) : (
              <button
                onClick={onExport}
                disabled={exporting}
                className="text-xs px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Exporting...
                  </>
                ) : '📖 Export to Foundry'}
              </button>
            )}
            <button
              onClick={onDelete}
              className="text-xs px-2.5 py-1.5 border border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-800 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
        <InventoryTable items={store.inventory ?? []} />
      </div>
    </div>
  );
}

// ─── Saved Stores Sidebar ─────────────────────────────────────────────────────

function SavedStoresList({
  campaignId,
  onLoad,
  refreshTrigger,
}: {
  campaignId?: string;
  onLoad: (store: StoreData) => void;
  refreshTrigger: number;
}) {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getStores(campaignId)
      .then(r => setStores(r.stores))
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  }, [campaignId, refreshTrigger]);

  const storeIcon = (type: string) => STORE_TYPES.find(s => s.value === type)?.icon ?? '🏪';

  if (loading) return <div className="text-gray-500 text-sm py-4 text-center">Loading...</div>;
  if (stores.length === 0) return (
    <div className="text-gray-500 text-sm py-4 text-center">No saved stores yet.</div>
  );

  return (
    <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
      {stores.map(s => (
        <button
          key={s.id}
          onClick={() => onLoad(s as StoreData)}
          className="w-full text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span>{storeIcon(s.storeType)}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{s.name}</div>
              <div className="text-xs text-gray-500">
                {s.storeType} · {s.itemCount ?? '?'} items
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function StoreGenerator() {
  const [searchParams] = useSearchParams();
  const urlCampaignId = searchParams.get('campaignId') ?? undefined;

  const [config, setConfig] = useState<StoreConfig>({ ...DEFAULT_CONFIG, campaignId: urlCampaignId });
  const [generating, setGenerating] = useState(false);
  const [store, setStore] = useState<StoreData | null>(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSaved, setShowSaved] = useState(false);

  // Campaign list for selector
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    api.getCampaigns()
      .then(list => {
        setCampaigns(list);
        if (urlCampaignId) {
          const match = list.find(c => c.id === urlCampaignId) ?? null;
          setSelectedCampaign(match);
        }
      })
      .catch(() => {});
  }, [urlCampaignId]);

  // Keep config.campaignId in sync when campaign selection changes
  const handleCampaignChange = (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId) ?? null;
    setSelectedCampaign(campaign);
    setConfig(c => ({ ...c, campaignId: campaignId || undefined }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setStore(null);
    setExportSuccess(false);
    try {
      // Build campaign context from selected campaign data
      const campaignContext = selectedCampaign ? {
        setting: selectedCampaign.setting,
        theme: selectedCampaign.theme,
        tone: selectedCampaign.tone,
        worldSummary: (selectedCampaign.worldLore as any)?.summary as string | undefined,
      } : undefined;

      const result = await api.generateStore({
        ...config,
        campaignContext,
      });
      if (result.success) {
        setStore(result.store);
        setRefreshTrigger(t => t + 1);
      } else {
        setError('Generation failed. Try again.');
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to generate store');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    if (!store) return;
    setExporting(true);
    try {
      const result = await api.exportStoreToFoundry(store.id);
      if (result.success) {
        setStore(s => s ? { ...s, foundryJournalId: result.foundryJournalId } : s);
        setExportSuccess(true);
      } else {
        setError('Export to Foundry failed.');
      }
    } catch (e) {
      setError((e as Error).message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!store) return;
    try {
      await api.deleteStore(store.id);
      setStore(null);
      setRefreshTrigger(t => t + 1);
    } catch (e) {
      setError((e as Error).message || 'Delete failed');
    }
  };

  const set = <K extends keyof StoreConfig>(key: K, value: StoreConfig[K]) => {
    setConfig(c => ({ ...c, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={selectedCampaign ? `/campaigns/${selectedCampaign.id}` : '/'}
              className="text-gray-400 hover:text-white text-sm"
            >
              &larr; {selectedCampaign ? `Back to ${selectedCampaign.name}` : 'Back to Dashboard'}
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Store Generator</h1>
              <p className="text-xs text-gray-400">Procedural D&D 5e shops with AI-generated flavor</p>
            </div>
          </div>
          <button
            onClick={() => setShowSaved(s => !s)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              showSaved
                ? 'border-indigo-500 bg-indigo-900/40 text-white'
                : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
            }`}
          >
            📋 Saved Stores
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Saved Stores Panel */}
        {showSaved && (
          <div className="w-56 shrink-0">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                Saved Stores
              </h3>
              <SavedStoresList
                campaignId={config.campaignId}
                onLoad={loaded => { setStore(loaded); setShowSaved(false); }}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Configuration Panel */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Configure Shop</h2>

            <div className="space-y-4">
              {/* Campaign + Location context */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-gray-700">
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
                    Campaign <span className="text-gray-600 normal-case">(optional — adds world context to AI)</span>
                  </label>
                  <select
                    value={config.campaignId ?? ''}
                    onChange={e => handleCampaignChange(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">No campaign (manual)</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {selectedCampaign && (
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {selectedCampaign.setting && (
                        <span className="text-xs px-2 py-0.5 bg-indigo-900/40 border border-indigo-800 rounded text-indigo-300">
                          {selectedCampaign.setting}
                        </span>
                      )}
                      {selectedCampaign.theme && (
                        <span className="text-xs px-2 py-0.5 bg-purple-900/40 border border-purple-800 rounded text-purple-300">
                          {selectedCampaign.theme}
                        </span>
                      )}
                      {selectedCampaign.tone && (
                        <span className="text-xs px-2 py-0.5 bg-gray-700 border border-gray-600 rounded text-gray-300">
                          {selectedCampaign.tone}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
                    Location Name <span className="text-gray-600 normal-case">(optional — e.g. "Ironhaven", "The Sunken Quarter")</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ironhaven, The Docks..."
                    value={config.locationName ?? ''}
                    onChange={e => set('locationName', e.target.value || undefined)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Settlement Size</label>
                <PillSelect
                  options={SETTLEMENT_SIZES}
                  value={config.settlementSize}
                  onChange={v => set('settlementSize', v)}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Store Type</label>
                <PillSelect
                  options={STORE_TYPES}
                  value={config.storeType}
                  onChange={v => set('storeType', v)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Racial Influence</label>
                  <select
                    value={config.racialInfluence}
                    onChange={e => set('racialInfluence', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    {RACES.map(r => (
                      <option key={r} value={r.toLowerCase()}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Biome</label>
                  <select
                    value={config.biome}
                    onChange={e => set('biome', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    {BIOMES.map(b => (
                      <option key={b} value={b.toLowerCase()}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Stock Size</label>
                  <select
                    value={config.stockSize}
                    onChange={e => set('stockSize', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="small">Small (4–7 items)</option>
                    <option value="medium">Medium (9–14 items)</option>
                    <option value="large">Large (18–28 items)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => set('magicItems', !config.magicItems)}
                    className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${
                      config.magicItems ? 'bg-indigo-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                      config.magicItems ? 'left-5' : 'left-0.5'
                    }`} />
                  </div>
                  <span className="text-sm text-gray-300">
                    Magic Items
                    <span className="ml-1 text-xs text-gray-500">
                      (potions, scrolls, wands, etc.)
                    </span>
                  </span>
                </label>

                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className={`px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                    generating
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {generating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Generating...
                    </>
                  ) : '✨ Generate Store'}
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 mb-4 text-red-300 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-200 ml-3">&times;</button>
            </div>
          )}

          {/* Export success toast */}
          {exportSuccess && (
            <div className="bg-green-900/30 border border-green-700 rounded-lg px-4 py-3 mb-4 text-green-300 text-sm flex items-center justify-between">
              <span>✓ Journal entry created in Foundry VTT!</span>
              <button onClick={() => setExportSuccess(false)} className="ml-3">&times;</button>
            </div>
          )}

          {/* Generated Store */}
          {store && (
            <StoreCard
              store={store}
              onDelete={handleDelete}
              onExport={handleExport}
              exporting={exporting}
            />
          )}

          {/* Empty state */}
          {!store && !generating && (
            <div className="text-center py-20 text-gray-600">
              <div className="text-5xl mb-4">🏪</div>
              <div className="text-lg font-medium text-gray-500">Configure and generate a shop above</div>
              <div className="text-sm text-gray-600 mt-1">
                The AI will name it, create a shopkeeper, and stock the shelves
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {generating && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 animate-pulse">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-700 rounded" />
                <div className="flex-1">
                  <div className="h-6 bg-gray-700 rounded w-48 mb-2" />
                  <div className="h-4 bg-gray-700 rounded w-64" />
                </div>
              </div>
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-700 rounded" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
