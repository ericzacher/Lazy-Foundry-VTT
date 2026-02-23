import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { PlayerPortalData } from '../types';

export function PlayerPortal() {
  const { playerId } = useParams<{ playerId: string }>();
  const [data, setData] = useState<PlayerPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!playerId) return;
    api.getPlayerPortal(playerId)
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load portal'))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-gray-400">Loading player portal...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Portal Unavailable</h1>
          <p className="text-gray-400">{error || 'Player not found'}</p>
        </div>
      </div>
    );
  }

  const cd = data.player.characterData as Record<string, unknown> | undefined;
  const lore = data.campaign.worldLore as Record<string, unknown> | undefined;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">{data.campaign.name}</h1>
          {data.campaign.setting && (
            <p className="text-sm text-gray-400 mt-1">{data.campaign.setting}</p>
          )}
          <p className="text-sm text-indigo-400 mt-1">
            Welcome, {data.player.playerName}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Character Card */}
        {cd && (
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">Your Character</h2>
            <div className="flex flex-wrap gap-6">
              <div>
                <h3 className="text-xl font-semibold text-indigo-400">
                  {data.player.characterName || 'Unnamed'}
                </h3>
                <p className="text-sm text-gray-400">
                  {cd.race as string}{cd.subrace ? ` (${cd.subrace})` : ''} {cd.class as string}
                  {cd.subclass ? ` - ${cd.subclass}` : ''}
                </p>
                {cd.background && (
                  <p className="text-sm text-gray-500">Background: {cd.background as string}</p>
                )}
                {cd.alignment && (
                  <p className="text-sm text-gray-500">{cd.alignment as string}</p>
                )}
              </div>
              {cd.abilityScores && (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {Object.entries(cd.abilityScores as Record<string, number>).map(([key, val]) => (
                    <div key={key} className="bg-gray-700/50 rounded px-3 py-1 text-center">
                      <span className="text-gray-400 uppercase text-xs">{key}</span>
                      <span className="block font-bold">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cd.backstory && (
              <p className="text-gray-300 text-sm mt-4 whitespace-pre-line">{cd.backstory as string}</p>
            )}
          </section>
        )}

        {/* Upcoming Session */}
        {data.upcomingSession && (
          <section className="bg-indigo-900/20 rounded-lg p-6 border border-indigo-800/50">
            <h2 className="text-lg font-bold mb-2">Upcoming Session</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">Session {data.upcomingSession.sessionNumber}</span>
              <h3 className="text-lg font-semibold">{data.upcomingSession.title}</h3>
            </div>
            {data.upcomingSession.scheduledDate && (
              <p className="text-sm text-indigo-400 mt-1">
                {new Date(data.upcomingSession.scheduledDate).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </section>
        )}

        {/* Session Recaps */}
        {data.sessions.length > 0 && (
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">Session Recaps</h2>
            <div className="space-y-4">
              {data.sessions.map(session => (
                <div key={session.sessionNumber} className="bg-gray-700/50 rounded p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-gray-500">Session {session.sessionNumber}</span>
                    <h3 className="font-medium">{session.title}</h3>
                  </div>
                  {session.summary && (
                    <p className="text-gray-300 text-sm whitespace-pre-line">{session.summary}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* NPCs Met */}
        {data.npcs.length > 0 && (
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">NPCs Met</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.npcs.map(npc => (
                <div key={npc.name} className="bg-gray-700/50 rounded p-3">
                  <h3 className="font-medium text-indigo-400">{npc.name}</h3>
                  {npc.role && <span className="text-xs text-purple-400">{npc.role}</span>}
                  {npc.description && (
                    <p className="text-gray-400 text-xs mt-1">{npc.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Timeline */}
        {data.timeline.length > 0 && (
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">Campaign Timeline</h2>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />
              <div className="space-y-4">
                {data.timeline.map(event => (
                  <div key={event.id} className="relative pl-10">
                    <div className={`absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 ${
                      event.significance === 'critical' ? 'bg-red-500 border-red-400' :
                      event.significance === 'major' ? 'bg-yellow-500 border-yellow-400' :
                      'bg-gray-500 border-gray-400'
                    }`} />
                    <div className="bg-gray-700/50 rounded p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{event.title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          event.eventType === 'combat' ? 'bg-red-500/20 text-red-400' :
                          event.eventType === 'dialogue' ? 'bg-blue-500/20 text-blue-400' :
                          event.eventType === 'discovery' ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>{event.eventType}</span>
                      </div>
                      {event.description && (
                        <p className="text-gray-400 text-xs">{event.description}</p>
                      )}
                      <span className="text-xs text-gray-500 mt-1 block">{event.eventDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* World Lore */}
        {lore && (
          <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">World Lore</h2>
            {data.campaign.description && (
              <p className="text-gray-300 text-sm mb-4">{data.campaign.description}</p>
            )}
            {lore.worldDescription && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400 mb-1">The World</h3>
                <p className="text-gray-300 text-sm whitespace-pre-line">{lore.worldDescription as string}</p>
              </div>
            )}
            {(lore.factions as Array<{ name: string; description: string }> | undefined)?.length ? (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Factions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(lore.factions as Array<{ name: string; description: string }>).map((f, i) => (
                    <div key={i} className="bg-gray-700/50 rounded p-3">
                      <h4 className="font-medium text-blue-400 text-sm">{f.name}</h4>
                      <p className="text-gray-400 text-xs mt-1">{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}
