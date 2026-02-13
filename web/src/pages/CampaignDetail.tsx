import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Campaign, Session, NPC, MapData, TimelineEvent, NPCStatus } from '../types';
import { SessionStatus } from '../types';
import { ErrorAlert } from '../components/LoadingSpinner';
import { CRCalculator } from '../components/CRCalculator';

interface EncounterConfig {
  count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'deadly';
  partyLevel: number;
  partySize: number;
}

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [maps, setMaps] = useState<MapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingLore, setGeneratingLore] = useState(false);
  const [generatingNPCs, setGeneratingNPCs] = useState(false);
  const [generatingMap, setGeneratingMap] = useState(false);
  const [generatingTokens, setGeneratingTokens] = useState<Set<string>>(new Set());
  const [syncingToFoundry, setSyncingToFoundry] = useState<Set<string>>(new Set());
  const [foundryStatus, setFoundryStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [npcStatuses, setNpcStatuses] = useState<Record<string, NPCStatus>>({});
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'sessions' | 'lore' | 'npcs' | 'maps' | 'timeline'>('sessions');
  const [error, setError] = useState<string>('');

  const loadCampaign = useCallback(async () => {
    try {
      const data = await api.getCampaign(id!);
      setCampaign(data);
    } catch (error) {
      console.error('Failed to load campaign:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await api.getSessions(id!);
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }, [id]);

  const loadNPCs = useCallback(async () => {
    try {
      const data = await api.getCampaignNPCs(id!);
      setNpcs(data);
    } catch (error) {
      console.error('Failed to load NPCs:', error);
    }
  }, [id]);

  const loadMaps = useCallback(async () => {
    try {
      const data = await api.getCampaignMaps(id!);
      setMaps(data);
    } catch (error) {
      console.error('Failed to load maps:', error);
    }
  }, [id]);

  const loadTimeline = useCallback(async () => {
    try {
      const { events } = await api.getCampaignTimeline(id!);
      setTimelineEvents(events);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    }
  }, [id]);

  const loadNPCStatuses = useCallback(async () => {
    try {
      const { statuses } = await api.getCampaignNPCStatuses(id!);
      setNpcStatuses(statuses);
    } catch (error) {
      console.error('Failed to load NPC statuses:', error);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadCampaign();
      loadSessions();
      loadNPCs();
      loadMaps();
      loadTimeline();
      loadNPCStatuses();
    }
  }, [id, loadCampaign, loadSessions, loadNPCs, loadMaps, loadTimeline, loadNPCStatuses]);

  useEffect(() => {
    const checkFoundryStatus = async () => {
      try {
        await api.getFoundryStatus();
        setFoundryStatus('connected');
      } catch {
        setFoundryStatus('disconnected');
      }
    };
    checkFoundryStatus();
  }, []);

  const handleGenerateLore = async () => {
    if (!campaign) return;
    setGeneratingLore(true);
    setError('');
    try {
      const { campaign: updatedCampaign } = await api.generateCampaignLore(campaign.id);
      setCampaign(updatedCampaign);
      setActiveTab('lore');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate lore. Make sure your Groq API key is set.';
      setError(errorMsg);
      console.error('Failed to generate lore:', err);
    } finally {
      setGeneratingLore(false);
    }
  };

  const handleGenerateNPCs = async () => {
    if (!campaign) return;
    setGeneratingNPCs(true);
    setError('');
    try {
      const { npcs: newNPCs } = await api.generateNPCs(campaign.id, 3);
      setNpcs([...newNPCs, ...npcs]);
      setActiveTab('npcs');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate NPCs. Make sure your Groq API key is set.';
      setError(errorMsg);
      console.error('Failed to generate NPCs:', err);
    } finally {
      setGeneratingNPCs(false);
    }
  };

  const handleSyncMapToFoundry = async (mapId: string) => {
    setSyncingToFoundry(new Set(syncingToFoundry).add(mapId));
    setError('');
    try {
      await api.syncMapToFoundry(mapId);
      // Reload maps to get updated sync status
      await loadMaps();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sync map to Foundry';
      setError(errorMsg);
      console.error('Failed to sync map:', err);
    } finally {
      const newSyncing = new Set(syncingToFoundry);
      newSyncing.delete(mapId);
      setSyncingToFoundry(newSyncing);
    }
  };

  const handleSyncNPCToFoundry = async (npcId: string) => {
    setSyncingToFoundry(new Set(syncingToFoundry).add(npcId));
    setError('');
    try {
      await api.syncNPCToFoundry(npcId);
      // Reload NPCs to get updated sync status
      await loadNPCs();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sync NPC to Foundry';
      setError(errorMsg);
      console.error('Failed to sync NPC:', err);
    } finally {
      const newSyncing = new Set(syncingToFoundry);
      newSyncing.delete(npcId);
      setSyncingToFoundry(newSyncing);
    }
  };

  const handleBulkSyncCampaign = async (sessionId?: string) => {
    if (!campaign) return;

    const message = sessionId
      ? 'Sync this session to Foundry VTT with automatic token placement?'
      : 'Sync all maps and NPCs to Foundry VTT?';

    if (!confirm(message)) return;

    setSyncingToFoundry(new Set(['bulk']));
    setError('');
    try {
      const result = await api.bulkSyncCampaign(campaign.id, sessionId);
      const tokenMsg = result.results.tokens.success > 0
        ? `\nTokens: ${result.results.tokens.success} placed, ${result.results.tokens.failed} failed`
        : '';
      alert(`Sync completed!\nScenes: ${result.results.scenes.success} synced, ${result.results.scenes.failed} failed\nActors: ${result.results.actors.success} synced, ${result.results.actors.failed} failed\nJournals: ${result.results.journals.success} synced, ${result.results.journals.failed} failed${tokenMsg}`);
      await loadMaps();
      await loadNPCs();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sync campaign to Foundry';
      setError(errorMsg);
      console.error('Failed to bulk sync:', err);
    } finally {
      const newSyncing = new Set(syncingToFoundry);
      newSyncing.delete('bulk');
      setSyncingToFoundry(newSyncing);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      await api.deleteSession(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const getStatusColor = (status: SessionStatus) => {
    switch (status) {
      case SessionStatus.PLANNED:
        return 'bg-yellow-500/20 text-yellow-400';
      case SessionStatus.IN_PROGRESS:
        return 'bg-blue-500/20 text-blue-400';
      case SessionStatus.COMPLETED:
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Campaign not found</div>
      </div>
    );
  }

  const rawLore = campaign.worldLore as Record<string, unknown> | undefined;

  // Normalize worldLore - AI may return different shapes
  const worldLore = rawLore ? {
    worldDescription: [
      rawLore.worldDescription,
      rawLore.worldDescription2,
      rawLore.worldDescription3,
    ].filter(Boolean).join('\n\n') || (rawLore.overview as string) || undefined,
    history: [
      rawLore.history,
      rawLore.history2,
    ].filter(Boolean).join('\n\n') || undefined,
    factions: (rawLore.factions || rawLore.major_factions) as Array<{ name: string; description: string }> | undefined,
    locations: (rawLore.locations || rawLore.notable_locations) as Array<{ name: string; description: string }> | undefined,
    hooks: rawLore.hooks as Array<string | { name: string; description: string }> | undefined,
  } : undefined;

  return (
    <div className="min-h-screen">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link to="/" className="text-gray-400 hover:text-white text-sm">
            &larr; Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <ErrorAlert error={error} onDismiss={() => setError('')} />
        )}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{campaign.name}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                {campaign.setting && <span>Setting: {campaign.setting}</span>}
                {campaign.theme && <span>Theme: {campaign.theme}</span>}
                {campaign.tone && <span>Tone: {campaign.tone}</span>}
                <span>{campaign.playerCount} players, Level {campaign.partyLevel || 3}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGenerateLore}
                disabled={generatingLore}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-medium disabled:opacity-50"
              >
                {generatingLore ? 'Generating...' : 'Generate Lore'}
              </button>
              <button
                onClick={handleGenerateNPCs}
                disabled={generatingNPCs}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium disabled:opacity-50"
              >
                {generatingNPCs ? 'Generating...' : 'Generate NPCs'}
              </button>
              {foundryStatus === 'connected' && (
                <button
                  onClick={() => handleBulkSyncCampaign()}
                  disabled={syncingToFoundry.has('bulk')}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded font-medium disabled:opacity-50 flex items-center gap-2"
                  title="Sync all content to Foundry VTT"
                >
                  <span>🔄</span>
                  {syncingToFoundry.has('bulk') ? 'Syncing to Foundry...' : 'Bulk Sync to Foundry'}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-400">Foundry VTT:</span>
            <span
              className={`text-xs px-2 py-1 rounded ${
                foundryStatus === 'connected'
                  ? 'bg-green-700 text-green-200'
                  : foundryStatus === 'disconnected'
                  ? 'bg-red-700 text-red-200'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {foundryStatus === 'connected' && '✓ Connected'}
              {foundryStatus === 'disconnected' && '✗ Disconnected'}
              {foundryStatus === 'unknown' && '? Checking...'}
            </span>
          </div>
          {campaign.description && (
            <p className="mt-4 text-gray-300">{campaign.description}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`pb-3 px-1 border-b-2 ${
              activeTab === 'sessions'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Sessions ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('lore')}
            className={`pb-3 px-1 border-b-2 ${
              activeTab === 'lore'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            World Lore {worldLore ? '(Generated)' : ''}
          </button>
          <button
            onClick={() => setActiveTab('npcs')}
            className={`pb-3 px-1 border-b-2 ${
              activeTab === 'npcs'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            NPCs ({npcs.length})
          </button>
          <button
            onClick={() => setActiveTab('maps')}
            className={`pb-3 px-1 border-b-2 ${
              activeTab === 'maps'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Maps ({maps.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-3 px-1 border-b-2 ${
              activeTab === 'timeline'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Timeline ({timelineEvents.length})
          </button>
        </div>

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Sessions</h2>
              <button
                onClick={() => setShowCreateSessionModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
              >
                New Session
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-gray-400 mb-4">No sessions yet</p>
                <button
                  onClick={() => setShowCreateSessionModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
                >
                  Create First Session
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-gray-500 text-sm">
                            Session {session.sessionNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${getStatusColor(
                              session.status
                            )}`}
                          >
                            {session.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold">{session.title}</h3>
                        {session.description && (
                          <p className="text-gray-400 text-sm mt-1">
                            {session.description}
                          </p>
                        )}
                        {session.scheduledDate && (
                          <p className="text-gray-500 text-sm mt-2">
                            Scheduled: {new Date(session.scheduledDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link
                          to={`/sessions/${session.id}`}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          View
                        </Link>
                        {foundryStatus === 'connected' && session.scenario && (session.mapIds?.length ?? 0) > 0 && (
                          <button
                            onClick={() => handleBulkSyncCampaign(session.id)}
                            disabled={syncingToFoundry.has('bulk')}
                            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-xs font-medium disabled:opacity-50"
                            title="Sync session to Foundry with automatic token placement"
                          >
                            {syncingToFoundry.has('bulk') ? '⏳' : '🎲 Sync'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Lore Tab */}
        {activeTab === 'lore' && (
          <div className="space-y-6">
            {!worldLore ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-gray-400 mb-4">No world lore generated yet</p>
                <button
                  onClick={handleGenerateLore}
                  disabled={generatingLore}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-medium disabled:opacity-50"
                >
                  {generatingLore ? 'Generating...' : 'Generate World Lore'}
                </button>
              </div>
            ) : (
              <>
                {worldLore.worldDescription && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-3">World Description</h3>
                    <p className="text-gray-300 whitespace-pre-line">{worldLore.worldDescription}</p>
                  </div>
                )}

                {worldLore.history && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-3">History</h3>
                    <p className="text-gray-300 whitespace-pre-line">{worldLore.history}</p>
                  </div>
                )}

                {worldLore.factions && worldLore.factions.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-3">Factions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {worldLore.factions.map((faction, i) => (
                        <div key={i} className="bg-gray-700/50 rounded p-4">
                          <h4 className="font-medium text-blue-400">{faction.name}</h4>
                          <p className="text-gray-400 text-sm mt-1">{faction.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {worldLore.locations && worldLore.locations.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-3">Notable Locations</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {worldLore.locations.map((location, i) => (
                        <div key={i} className="bg-gray-700/50 rounded p-4">
                          <h4 className="font-medium text-green-400">{location.name}</h4>
                          <p className="text-gray-400 text-sm mt-1">{location.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {worldLore.hooks && worldLore.hooks.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-3">Adventure Hooks</h3>
                    <ul className="space-y-2">
                      {worldLore.hooks.map((hook, i) => (
                        <li key={i} className="text-gray-300 flex gap-2">
                          <span className="text-yellow-400">★</span>
                          <div>
                            {typeof hook === 'string' ? (
                              hook
                            ) : (
                              <>
                                <span className="font-medium text-yellow-300">{hook.name}: </span>
                                {hook.description}
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* NPCs Tab */}
        {activeTab === 'npcs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">NPCs</h2>
              <button
                onClick={handleGenerateNPCs}
                disabled={generatingNPCs}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium disabled:opacity-50"
              >
                {generatingNPCs ? 'Generating...' : 'Generate 3 NPCs'}
              </button>
            </div>

            {npcs.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-gray-400 mb-4">No NPCs generated yet</p>
                <button
                  onClick={handleGenerateNPCs}
                  disabled={generatingNPCs}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium disabled:opacity-50"
                >
                  {generatingNPCs ? 'Generating...' : 'Generate NPCs'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {npcs.map((npc) => (
                  <div
                    key={npc.id}
                    className={`bg-gray-800 rounded-lg p-6 border ${npc.role === 'Monster' ? 'border-red-800/50' : 'border-gray-700'}`}
                  >
                    <div className="flex gap-4 mb-3">
                      {/* Token Image */}
                      <div className="flex-shrink-0">
                        {npc.tokenImageUrl ? (
                          <img
                            src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${npc.tokenImageUrl}`}
                            alt={`${npc.name} token`}
                            className="w-24 h-24 rounded-full border-2 border-gray-600 object-cover"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full border-2 border-gray-600 bg-gray-700 flex items-center justify-center">
                            <span className="text-gray-500 text-xs">No Token</span>
                          </div>
                        )}
                        <button
                          onClick={async () => {
                            setGeneratingTokens(prev => new Set(prev).add(npc.id));
                            try {
                              const { token } = await api.generateToken(id!, npc.id);
                              // Update NPC with token URL
                              setNpcs(prevNpcs => 
                                prevNpcs.map(n => 
                                  n.id === npc.id ? { ...n, tokenImageUrl: token.imageUrl } : n
                                )
                              );
                            } catch (err) {
                              console.error('Failed to generate token:', err);
                            } finally {
                              setGeneratingTokens(prev => {
                                const next = new Set(prev);
                                next.delete(npc.id);
                                return next;
                              });
                            }
                          }}
                          disabled={generatingTokens.has(npc.id)}
                          className="mt-2 w-full text-xs bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                        >
                          {generatingTokens.has(npc.id) ? 'Generating...' : (npc.tokenImageUrl ? 'Regenerate' : 'Generate Token')}
                        </button>
                      </div>

                      {/* NPC Info */}
                      <div className="flex-grow">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-lg font-semibold">{npc.name}</h3>
                            {npc.role && (
                              <span className="text-sm text-purple-400">{npc.role}</span>
                            )}
                            {/* NPC Status Badge */}
                            {npcStatuses[npc.name] && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  npcStatuses[npc.name].status === 'alive' ? 'bg-green-500/20 text-green-400' :
                                  npcStatuses[npc.name].status === 'dead' ? 'bg-red-500/20 text-red-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {npcStatuses[npc.name].status}
                                </span>
                                {npcStatuses[npc.name].loyalty && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                    {npcStatuses[npc.name].loyalty}
                                  </span>
                                )}
                                {npcStatuses[npc.name].alignment && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                                    {npcStatuses[npc.name].alignment}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            {/* Foundry Sync Status */}
                            {npc.syncStatus && (
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  npc.syncStatus === 'synced'
                                    ? 'bg-green-700 text-green-200'
                                    : npc.syncStatus === 'error'
                                    ? 'bg-red-700 text-red-200'
                                    : 'bg-gray-700 text-gray-400'
                                }`}
                              >
                                {npc.syncStatus === 'synced' && '✓ Synced'}
                                {npc.syncStatus === 'error' && '✗ Error'}
                                {npc.syncStatus === 'never' && 'Not Synced'}
                              </span>
                            )}
                            {/* Foundry Sync Button */}
                            {foundryStatus === 'connected' && (
                              <button
                                onClick={() => handleSyncNPCToFoundry(npc.id)}
                                disabled={syncingToFoundry.has(npc.id)}
                                className="text-xs bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-2 py-1 rounded transition-colors"
                                title="Sync to Foundry VTT"
                              >
                                {syncingToFoundry.has(npc.id) ? '⏳ Syncing...' : '🔄 Sync'}
                              </button>
                            )}
                            {npc.stats && npc.stats.hitPoints != null ? (
                              <div className="text-xs mt-1 space-y-1">
                                <div className="flex gap-2">
                                  <span className="text-red-400 font-medium">HP {npc.stats.hitPoints}</span>
                                  <span className="text-blue-400 font-medium">AC {npc.stats.armorClass}</span>
                                  <span className="text-yellow-400 font-medium">CR {npc.stats.challengeRating}</span>
                                </div>
                                {npc.stats.size && (
                                  <span className="text-gray-500 capitalize">{npc.stats.size}</span>
                                )}
                              </div>
                            ) : npc.stats && (
                              <div className="text-xs text-gray-500 grid grid-cols-3 gap-1 mt-1">
                                <span>STR {npc.stats.strength}</span>
                                <span>DEX {npc.stats.dexterity}</span>
                                <span>CON {npc.stats.constitution}</span>
                                <span>INT {npc.stats.intelligence}</span>
                                <span>WIS {npc.stats.wisdom}</span>
                                <span>CHA {npc.stats.charisma}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {npc.description && (
                          <p className="text-gray-400 text-sm mb-2">{npc.description}</p>
                        )}
                      </div>
                    </div>

                    {npc.personality && (
                      <div className="text-sm space-y-1 mb-3">
                        {npc.personality.traits && (
                          <p><span className="text-gray-500">Traits:</span> {npc.personality.traits.join(', ')}</p>
                        )}
                        {npc.personality.ideals && (
                          <p><span className="text-gray-500">Ideals:</span> {npc.personality.ideals}</p>
                        )}
                        {npc.personality.bonds && (
                          <p><span className="text-gray-500">Bonds:</span> {npc.personality.bonds}</p>
                        )}
                        {npc.personality.flaws && (
                          <p><span className="text-gray-500">Flaws:</span> {npc.personality.flaws}</p>
                        )}
                      </div>
                    )}
                    {npc.motivations && npc.motivations.length > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-500">Motivations:</span>{' '}
                        {npc.motivations.join(', ')}
                      </div>
                    )}
                    {npc.stats?.abilities && npc.stats.abilities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {npc.stats.abilities.map((ability, i) => (
                          <span key={i} className="text-xs bg-red-500/10 text-red-300 px-2 py-0.5 rounded">
                            {ability}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Maps Tab */}
        {activeTab === 'maps' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Maps</h2>
            </div>

            {/* Map Generation Form */}
            <MapGenerationForm
              campaignId={id!}
              generating={generatingMap}
              partySize={campaign?.playerCount || 4}
              partyLevel={campaign?.partyLevel || 3}
              sessions={sessions}
              onGenerate={async (description, mapType, encounterConfig, sessionId, mapSize) => {
                setGeneratingMap(true);
                setError('');
                try {
                  const { map } = await api.generateMap(id!, description, mapType, sessionId, encounterConfig, mapSize);
                  setMaps([map, ...maps]);
                  // If linked to a session, reload sessions to show updated mapIds
                  if (sessionId) {
                    await loadSessions();
                  }
                } catch (err) {
                  const errorMsg = err instanceof Error ? err.message : 'Failed to generate map';
                  setError(errorMsg);
                } finally {
                  setGeneratingMap(false);
                }
              }}
            />

            {maps.length === 0 && !generatingMap && (
              <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-gray-400">No maps generated yet. Use the form above to generate one.</p>
              </div>
            )}

            {maps.map((map) => (
              <div key={map.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">{map.name}</h3>
                    <span className="text-xs text-purple-400 uppercase">{map.type}</span>
                    {map.dimensions && (
                      <span className="text-xs text-gray-500 ml-2">
                        {map.dimensions.width}×{map.dimensions.height} grid
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Foundry Sync Status */}
                    {map.syncStatus && (
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          map.syncStatus === 'synced'
                            ? 'bg-green-700 text-green-200'
                            : map.syncStatus === 'error'
                            ? 'bg-red-700 text-red-200'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {map.syncStatus === 'synced' && '✓ Synced'}
                        {map.syncStatus === 'error' && '✗ Error'}
                        {map.syncStatus === 'never' && 'Not Synced'}
                      </span>
                    )}
                    {/* Foundry Sync Button */}
                    {foundryStatus === 'connected' && map.foundryData && (
                      <button
                        onClick={() => handleSyncMapToFoundry(map.id)}
                        disabled={syncingToFoundry.has(map.id)}
                        className="text-xs bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-1 rounded transition-colors"
                        title="Sync to Foundry VTT"
                      >
                        {syncingToFoundry.has(map.id) ? '⏳ Syncing...' : '🔄 Sync to Foundry'}
                      </button>
                    )}
                    {map.foundryData && (
                      <button
                        onClick={async () => {
                          try {
                            await api.exportFoundryScene(id!, map.id);
                          } catch (err) {
                            console.error('Export failed:', err);
                          }
                        }}
                        className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors cursor-pointer"
                        title="Download Foundry VTT scene JSON"
                      >
                        ⬇ Export JSON
                      </button>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(map.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Map Image */}
                {map.imageUrl && (
                  <div className="mb-4 rounded-lg overflow-hidden border border-gray-600">
                    <img
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${map.imageUrl}`}
                      alt={map.name}
                      className="w-full h-auto max-h-[500px] object-contain bg-gray-900"
                    />
                  </div>
                )}

                {/* Foundry VTT Stats */}
                {map.foundryData && (
                  <div className="mb-4 flex flex-wrap gap-3 text-xs">
                    <span className="bg-gray-700 px-2 py-1 rounded text-gray-300">
                      🧱 {map.foundryData.walls?.length || 0} walls
                    </span>
                    <span className="bg-gray-700 px-2 py-1 rounded text-gray-300">
                      💡 {map.foundryData.lights?.length || 0} lights
                    </span>
                    <span className="bg-gray-700 px-2 py-1 rounded text-gray-300">
                      🚪 {map.foundryData.walls?.filter(w => w.door > 0).length || 0} doors
                    </span>
                    <span className="bg-gray-700 px-2 py-1 rounded text-green-400">
                      ✅ Foundry VTT Ready
                    </span>
                  </div>
                )}

                {map.description && (
                  <p className="text-gray-400 text-sm mb-4 whitespace-pre-line">{map.description}</p>
                )}

                {map.details && (
                  <div className="space-y-4">
                    {map.details.atmosphere ? (() => {
                      const atmo = map.details!.atmosphere;
                      const text = typeof atmo === 'string'
                        ? atmo
                        : (atmo as { description?: string }).description || JSON.stringify(atmo);
                      return (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-1">Atmosphere</h4>
                          <p className="text-gray-300 text-sm">{String(text)}</p>
                        </div>
                      );
                    })() : null}

                    {map.details.rooms && map.details.rooms.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Rooms / Areas</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {map.details.rooms.map((room, i) => (
                            <div key={i} className="bg-gray-700/50 rounded p-3">
                              <h5 className="font-medium text-blue-400 text-sm">{room.name}</h5>
                              <p className="text-gray-400 text-xs mt-1">{room.description}</p>
                              {room.features && room.features.length > 0 && (
                                <div className="mt-1 text-xs text-gray-500">
                                  Features: {room.features.map((f: unknown) =>
                                    typeof f === 'string' ? f : (f as { name?: string }).name || JSON.stringify(f)
                                  ).join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {map.details.pointsOfInterest && map.details.pointsOfInterest.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Points of Interest</h4>
                        <div className="space-y-2">
                          {map.details.pointsOfInterest.map((poi, i) => (
                            <div key={i} className="flex gap-2 text-sm">
                              <span className="text-yellow-400">★</span>
                              <div>
                                <span className="font-medium text-yellow-300">{poi.name}</span>
                                <span className="text-gray-500"> ({poi.type})</span>
                                <p className="text-gray-400 text-xs">{poi.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {map.details.encounters && map.details.encounters.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Encounters</h4>
                        <div className="space-y-3">
                          {map.details.encounters.map((enc, i) => (
                            <div key={i} className="bg-gray-700/50 rounded p-3 border border-gray-600/50">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-sm font-medium">{enc.name || enc.location}</span>
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                  enc.difficulty === 'deadly' ? 'bg-red-500/20 text-red-400' :
                                  enc.difficulty === 'hard' ? 'bg-orange-500/20 text-orange-400' :
                                  enc.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-green-500/20 text-green-400'
                                }`}>{enc.difficulty}{enc.challengeRating ? ` (CR ${enc.challengeRating})` : ''}</span>
                              </div>
                              {enc.location && enc.name && (
                                <p className="text-gray-500 text-xs mb-1">{enc.location}</p>
                              )}
                              <p className="text-gray-400 text-xs mb-2">{enc.description}</p>
                              {enc.enemies && enc.enemies.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-xs text-gray-500 font-medium">Enemies:</span>
                                  <div className="mt-1 space-y-1">
                                    {enc.enemies.map((enemy, j) => (
                                      <div key={j} className="flex items-center gap-2 text-xs bg-gray-800/50 rounded px-2 py-1">
                                        <span className="text-red-400 font-medium">{enemy.count}x</span>
                                        <span className="text-gray-200">{enemy.name}</span>
                                        <span className="text-gray-500">CR {enemy.cr}</span>
                                        <span className="text-gray-500">|</span>
                                        <span className="text-red-300">HP {enemy.hitPoints}</span>
                                        <span className="text-blue-300">AC {enemy.armorClass}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {enc.tacticalNotes && (
                                <p className="text-gray-500 text-xs mt-2 italic">{enc.tacticalNotes}</p>
                              )}
                              {enc.rewards && enc.rewards.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {enc.rewards.map((reward, j) => (
                                    <span key={j} className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded">{reward}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {map.details.hazards && map.details.hazards.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Hazards</h4>
                        <ul className="space-y-1">
                          {map.details.hazards.map((hazard, i) => (
                            <li key={i} className="text-gray-300 text-sm flex gap-2">
                              <span className="text-red-400">⚠</span>
                              {typeof hazard === 'string' ? hazard : (
                                <span>
                                  <span className="font-medium text-red-300">{(hazard as { name?: string }).name}: </span>
                                  {(hazard as { description?: string }).description}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Campaign Timeline</h2>
            </div>

            {timelineEvents.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-gray-400">No timeline events yet. Finalize sessions to build your campaign timeline.</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />

                <div className="space-y-6">
                  {timelineEvents.map((event) => (
                    <div key={event.id} className="relative pl-12">
                      {/* Timeline dot */}
                      <div className={`absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 ${
                        event.significance === 'critical' ? 'bg-red-500 border-red-400' :
                        event.significance === 'major' ? 'bg-yellow-500 border-yellow-400' :
                        'bg-gray-500 border-gray-400'
                      }`} />

                      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">{event.title}</h3>
                          <div className="flex gap-2 flex-shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              event.significance === 'critical' ? 'bg-red-500/20 text-red-400' :
                              event.significance === 'major' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {event.significance}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              event.eventType === 'combat' ? 'bg-red-500/20 text-red-400' :
                              event.eventType === 'dialogue' ? 'bg-blue-500/20 text-blue-400' :
                              event.eventType === 'discovery' ? 'bg-green-500/20 text-green-400' :
                              event.eventType === 'death' ? 'bg-gray-500/20 text-gray-300' :
                              event.eventType === 'political' ? 'bg-purple-500/20 text-purple-400' :
                              event.eventType === 'travel' ? 'bg-cyan-500/20 text-cyan-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {event.eventType}
                            </span>
                          </div>
                        </div>

                        {event.description && (
                          <p className="text-gray-400 text-sm mb-2">{event.description}</p>
                        )}

                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          <span>{event.eventDate}</span>
                          {event.sessionNumber && (
                            <span>Session {event.sessionNumber}</span>
                          )}
                          {event.peopleInvolved && event.peopleInvolved.length > 0 && (
                            <span>People: {event.peopleInvolved.join(', ')}</span>
                          )}
                          {event.locations && event.locations.length > 0 && (
                            <span>Locations: {event.locations.join(', ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showCreateSessionModal && (
        <CreateSessionModal
          campaignId={id!}
          onClose={() => setShowCreateSessionModal(false)}
          onCreated={(session) => {
            setSessions([...sessions, session]);
            setShowCreateSessionModal(false);
          }}
        />
      )}
    </div>
  );
}

function CreateSessionModal({
  campaignId,
  onClose,
  onCreated,
}: {
  campaignId: string;
  onClose: () => void;
  onCreated: (session: Session) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const session = await api.createSession(campaignId, {
        title,
        description: description || undefined,
        scheduledDate: scheduledDate || undefined,
      });
      onCreated(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Create Session</h2>

        {error && (
          <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., The Dragon's Lair"
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of what this session will cover..."
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Scheduled Date</label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --- MapGenerationForm Component --- */

const MAP_TYPES = [
  { value: 'dungeon', label: 'Dungeon' },
  { value: 'wilderness', label: 'Wilderness' },
  { value: 'city', label: 'City / Town' },
  { value: 'building', label: 'Building' },
  { value: 'cave', label: 'Cave' },
  { value: 'other', label: 'Other' },
];

function MapGenerationForm({
  campaignId,
  generating,
  onGenerate,
  partySize = 4,
  partyLevel = 3,
  sessions = [],
}: {
  campaignId: string;
  generating: boolean;
  onGenerate: (description: string, mapType: string, encounterConfig?: EncounterConfig, sessionId?: string, mapSize?: 'small' | 'medium' | 'large') => Promise<void>;
  partySize?: number;
  partyLevel?: number;
  sessions?: Array<{ id: string; title: string }>;
}) {
  const [description, setDescription] = useState('');
  const [mapType, setMapType] = useState('dungeon');
  const [mapSize, setMapSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [includeEncounters, setIncludeEncounters] = useState(false);
  const [encounterCount, setEncounterCount] = useState(2);
  const [encounterDifficulty, setEncounterDifficulty] = useState<'easy' | 'medium' | 'hard' | 'deadly'>('medium');
  const [customPartySize, setCustomPartySize] = useState(partySize);
  const [customPartyLevel, setCustomPartyLevel] = useState(partyLevel);
  const [showCRCalculator, setShowCRCalculator] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const encounterConfig = includeEncounters
      ? {
          count: encounterCount,
          difficulty: encounterDifficulty,
          partyLevel: customPartyLevel,
          partySize: customPartySize,
        }
      : undefined;

    await onGenerate(description.trim(), mapType, encounterConfig, selectedSessionId || undefined, mapSize);
    setDescription('');
    setIncludeEncounters(false);
    setSelectedSessionId('');
  };

  return (
    <>
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Generate New Map</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Map Configuration */}
          <div className="flex gap-3">
            <select
              value={mapType}
              onChange={(e) => setMapType(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 text-sm"
              title="Map Type"
            >
              {MAP_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={mapSize}
              onChange={(e) => setMapSize(e.target.value as 'small' | 'medium' | 'large')}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 text-sm"
              title="Map Size"
            >
              <option value="small">📏 Small (20x20)</option>
              <option value="medium">📐 Medium (35x35)</option>
              <option value="large">📊 Large (50x50)</option>
            </select>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the location (e.g., An abandoned dwarven forge beneath a volcano)"
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 text-sm"
              required
            />
          </div>

          {/* Session Selector */}
          {sessions.length > 0 && (
            <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-800/50">
              <label className="block text-sm font-medium text-blue-300 mb-2">
                🎲 Link to Session (Optional but Recommended)
              </label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">None - Just generate the map</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-2">
                💡 Link to a session to enable automatic token placement when syncing to Foundry
              </p>
            </div>
          )}

          {/* Encounter Configuration */}
          <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEncounters}
                  onChange={(e) => setIncludeEncounters(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-600 border-gray-500"
                />
                <span className="text-sm font-medium">Include Combat Encounters</span>
              </label>
              <button
                type="button"
                onClick={() => setShowCRCalculator(true)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                🧮 CR Calculator
              </button>
            </div>

            {includeEncounters && (
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Number of Encounters
                    </label>
                    <select
                      value={encounterCount}
                      onChange={(e) => setEncounterCount(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:border-blue-500 text-sm"
                    >
                      <option value="1">1 Encounter</option>
                      <option value="2">2 Encounters</option>
                      <option value="3">3 Encounters</option>
                      <option value="4">4 Encounters</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={encounterDifficulty}
                      onChange={(e) => setEncounterDifficulty(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:border-blue-500 text-sm"
                    >
                      <option value="easy">🟢 Easy</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="hard">🟠 Hard</option>
                      <option value="deadly">🔴 Deadly</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Party Size (defaults to {partySize})
                    </label>
                    <input
                      type="number"
                      value={customPartySize}
                      onChange={(e) => setCustomPartySize(parseInt(e.target.value) || partySize)}
                      min={1}
                      max={10}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Party Level (defaults to {partyLevel})
                    </label>
                    <input
                      type="number"
                      value={customPartyLevel}
                      onChange={(e) => setCustomPartyLevel(parseInt(e.target.value) || partyLevel)}
                      min={1}
                      max={20}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={generating || !description.trim()}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-medium text-sm disabled:opacity-50"
          >
            {generating ? 'Generating...' : includeEncounters ? 'Generate Map with Encounters' : 'Generate Map'}
          </button>
        </form>
      </div>

      {showCRCalculator && (
        <CRCalculator
          partySize={customPartySize}
          partyLevel={customPartyLevel}
          onClose={() => setShowCRCalculator(false)}
          onApply={(size, level) => {
            setCustomPartySize(size);
            setCustomPartyLevel(level);
            setShowCRCalculator(false);
          }}
        />
      )}
    </>
  );
}
