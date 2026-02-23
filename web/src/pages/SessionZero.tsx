import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { SessionZeroData, PartyHooks, CampaignPlayer } from '../types';
import { PlayerStatus } from '../types';

export function SessionZero() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SessionZeroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partyHooks, setPartyHooks] = useState<PartyHooks | null>(null);
  const [generatingHooks, setGeneratingHooks] = useState(false);
  const [regeneratingLore, setRegeneratingLore] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const result = await api.getSessionZero(id);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateHooks = async () => {
    if (!id) return;
    setGeneratingHooks(true);
    setError('');
    try {
      const hooks = await api.generatePartyHooks(id);
      setPartyHooks(hooks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate party hooks');
    } finally {
      setGeneratingHooks(false);
    }
  };

  const handleRegenerateLore = async () => {
    if (!id) return;
    setRegeneratingLore(true);
    setError('');
    try {
      await api.regenerateLoreForParty(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate lore');
    } finally {
      setRegeneratingLore(false);
    }
  };

  const handleCreateSessionOne = async () => {
    if (!id) return;
    setCreatingSession(true);
    setError('');
    try {
      await api.createSessionOne(id);
      navigate(`/campaigns/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setCreatingSession(false);
    }
  };

  const copyInviteLink = () => {
    if (!data?.campaign.inviteCode) return;
    const link = `${window.location.origin}/join/${data.campaign.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: PlayerStatus) => {
    switch (status) {
      case PlayerStatus.READY: return 'bg-green-500/20 text-green-400';
      case PlayerStatus.JOINED: return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading Session 0...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">{error || 'Not found'}</div>
      </div>
    );
  }

  const readyCount = data.players.filter(p => p.status === PlayerStatus.READY).length;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <Link to={`/campaigns/${id}`} className="text-gray-400 hover:text-white text-sm">
              &larr; Back to Campaign
            </Link>
            <h1 className="text-2xl font-bold mt-1">Session 0: {data.campaign.name}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {error && (
          <div className="bg-red-500/20 text-red-400 p-3 rounded flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-200">&times;</button>
          </div>
        )}

        {/* Invite Link */}
        <section className="bg-indigo-900/20 rounded-lg p-4 border border-indigo-800/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-indigo-300">Invite Link</h3>
              <p className="text-xs text-gray-400 mt-1">Share this link with your players to join</p>
            </div>
            <button
              onClick={copyInviteLink}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-medium transition-colors"
            >
              {copied ? 'Copied!' : 'Copy Invite Link'}
            </button>
          </div>
        </section>

        {/* Party Roster */}
        <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">
              Party Roster
              <span className="text-sm font-normal text-gray-400 ml-2">
                {readyCount}/{data.players.length} ready
              </span>
            </h2>
          </div>

          {data.players.length === 0 ? (
            <p className="text-gray-400 text-sm">No players have joined yet. Share the invite link above.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.players.map((player: CampaignPlayer) => (
                <div key={player.id} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">{player.playerName}</h3>
                      {player.characterName && (
                        <p className="text-sm text-indigo-400">{player.characterName}</p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(player.status)}`}>
                      {player.status}
                    </span>
                  </div>
                  {player.characterData && (() => {
                    const cd = player.characterData as Record<string, unknown>;
                    return (
                      <p className="text-xs text-gray-400">
                        {cd.race as string}{cd.subrace ? ` (${cd.subrace})` : ''} {cd.class as string}
                        {cd.subclass ? ` - ${cd.subclass}` : ''}
                        {cd.background ? ` | ${cd.background}` : ''}
                      </p>
                    );
                  })()}
                  {player.status === PlayerStatus.READY && (
                    <Link
                      to={`/portal/${player.id}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 inline-block"
                    >
                      View Portal
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Party Composition (when allReady) */}
        {data.allReady && (
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">Party Composition</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Classes */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Classes</h3>
                {Object.entries(data.composition.classes).map(([cls, count]) => (
                  <div key={cls} className="flex justify-between text-sm mb-1">
                    <span>{cls}</span>
                    <span className="text-indigo-400">{count}</span>
                  </div>
                ))}
              </div>

              {/* Roles */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Roles</h3>
                {Object.entries(data.composition.roles).map(([role, count]) => (
                  <div key={role} className="flex justify-between text-sm mb-1">
                    <span>{role}</span>
                    <span className="text-green-400">{count}</span>
                  </div>
                ))}
                {!data.composition.roles['Healer'] && (
                  <p className="text-xs text-yellow-400 mt-1">No healer in party!</p>
                )}
                {!data.composition.roles['Tank'] && (
                  <p className="text-xs text-yellow-400 mt-1">No tank in party!</p>
                )}
              </div>

              {/* Races */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Races</h3>
                {Object.entries(data.composition.races).map(([race, count]) => (
                  <div key={race} className="flex justify-between text-sm mb-1">
                    <span>{race}</span>
                    <span className="text-purple-400">{count}</span>
                  </div>
                ))}
              </div>

              {/* Ability Averages */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Avg Abilities</h3>
                {Object.entries(data.composition.abilitySpread).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-sm mb-1">
                    <span className="uppercase">{key}</span>
                    <span className={val >= 14 ? 'text-green-400' : val <= 10 ? 'text-red-400' : 'text-gray-300'}>
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Actions (when allReady) */}
        {data.allReady && (
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">Session 0 Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleGenerateHooks}
                disabled={generatingHooks}
                className="p-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-700 rounded-lg text-left transition-colors disabled:opacity-50"
              >
                <h3 className="font-medium text-purple-400">Generate Party Hooks</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {generatingHooks ? 'Generating...' : 'AI creates backstory connections between characters'}
                </p>
              </button>

              <button
                onClick={handleRegenerateLore}
                disabled={regeneratingLore}
                className="p-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-700 rounded-lg text-left transition-colors disabled:opacity-50"
              >
                <h3 className="font-medium text-blue-400">Regenerate World Lore</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {regeneratingLore ? 'Regenerating...' : 'Tailor world lore to the party composition'}
                </p>
              </button>

              <button
                onClick={handleCreateSessionOne}
                disabled={creatingSession}
                className="p-4 bg-green-600/20 hover:bg-green-600/30 border border-green-700 rounded-lg text-left transition-colors disabled:opacity-50 md:col-span-2"
              >
                <h3 className="font-medium text-green-400">Create Session 1</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {creatingSession ? 'Creating...' : 'AI generates an opening scenario tailored to your party'}
                </p>
              </button>
            </div>
          </section>
        )}

        {/* Party Hooks Results */}
        {partyHooks && (
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">Party Hooks</h2>

            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Party Hook</h3>
              <p className="text-gray-300 text-sm">{partyHooks.partyHook}</p>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Shared Goal</h3>
              <p className="text-gray-300 text-sm">{partyHooks.sharedGoal}</p>
            </div>

            {partyHooks.connections.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Character Connections</h3>
                <div className="space-y-2">
                  {partyHooks.connections.map((c, i) => (
                    <div key={i} className="bg-gray-700/50 rounded p-3">
                      <span className="text-xs text-indigo-400 font-medium">
                        {c.characters.join(' & ')}
                      </span>
                      <p className="text-gray-300 text-sm mt-1">{c.connection}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {partyHooks.tensions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Potential Tensions</h3>
                <div className="space-y-2">
                  {partyHooks.tensions.map((t, i) => (
                    <div key={i} className="bg-gray-700/50 rounded p-3">
                      <span className="text-xs text-yellow-400 font-medium">
                        {t.characters.join(' & ')}
                      </span>
                      <p className="text-gray-300 text-sm mt-1">{t.tension}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
