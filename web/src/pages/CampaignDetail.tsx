import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Campaign, Session, NPC } from '../types';
import { SessionStatus } from '../types';

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingLore, setGeneratingLore] = useState(false);
  const [generatingNPCs, setGeneratingNPCs] = useState(false);
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'sessions' | 'lore' | 'npcs'>('sessions');

  useEffect(() => {
    if (id) {
      loadCampaign();
      loadSessions();
      loadNPCs();
    }
  }, [id]);

  const loadCampaign = async () => {
    try {
      const data = await api.getCampaign(id!);
      setCampaign(data);
    } catch (error) {
      console.error('Failed to load campaign:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const data = await api.getSessions(id!);
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadNPCs = async () => {
    try {
      const data = await api.getCampaignNPCs(id!);
      setNpcs(data);
    } catch (error) {
      console.error('Failed to load NPCs:', error);
    }
  };

  const handleGenerateLore = async () => {
    if (!campaign) return;
    setGeneratingLore(true);
    try {
      const { campaign: updatedCampaign } = await api.generateCampaignLore(campaign.id);
      setCampaign(updatedCampaign);
      setActiveTab('lore');
    } catch (error) {
      console.error('Failed to generate lore:', error);
      alert('Failed to generate lore. Please try again.');
    } finally {
      setGeneratingLore(false);
    }
  };

  const handleGenerateNPCs = async () => {
    if (!campaign) return;
    setGeneratingNPCs(true);
    try {
      const { npcs: newNPCs } = await api.generateNPCs(campaign.id, 3);
      setNpcs([...newNPCs, ...npcs]);
      setActiveTab('npcs');
    } catch (error) {
      console.error('Failed to generate NPCs:', error);
      alert('Failed to generate NPCs. Please try again.');
    } finally {
      setGeneratingNPCs(false);
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

  const worldLore = campaign.worldLore as {
    worldDescription?: string;
    history?: string;
    factions?: Array<{ name: string; description: string }>;
    locations?: Array<{ name: string; description: string }>;
    hooks?: string[];
  } | undefined;

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
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{campaign.name}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                {campaign.setting && <span>Setting: {campaign.setting}</span>}
                {campaign.theme && <span>Theme: {campaign.theme}</span>}
                {campaign.tone && <span>Tone: {campaign.tone}</span>}
                <span>{campaign.playerCount} players</span>
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
            </div>
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
                          <span className="text-yellow-400">*</span>
                          {hook}
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
                    className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold">{npc.name}</h3>
                        {npc.role && (
                          <span className="text-sm text-purple-400">{npc.role}</span>
                        )}
                      </div>
                      {npc.stats && (
                        <div className="text-xs text-gray-500 grid grid-cols-3 gap-1">
                          <span>STR {npc.stats.strength}</span>
                          <span>DEX {npc.stats.dexterity}</span>
                          <span>CON {npc.stats.constitution}</span>
                          <span>INT {npc.stats.intelligence}</span>
                          <span>WIS {npc.stats.wisdom}</span>
                          <span>CHA {npc.stats.charisma}</span>
                        </div>
                      )}
                    </div>
                    {npc.description && (
                      <p className="text-gray-400 text-sm mb-3">{npc.description}</p>
                    )}
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
                  </div>
                ))}
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
