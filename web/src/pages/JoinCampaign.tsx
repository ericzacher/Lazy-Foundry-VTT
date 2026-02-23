import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { JoinInfo } from '../types';
import { PlayerStatus } from '../types';

export function JoinCampaign() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<JoinInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!inviteCode) return;
    api.getJoinInfo(inviteCode)
      .then(setInfo)
      .catch(() => setError('Invalid or expired invite link'))
      .finally(() => setLoading(false));
  }, [inviteCode]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode || !playerName.trim()) return;

    setJoining(true);
    setError('');
    try {
      const { player, campaignId } = await api.joinCampaign(inviteCode, playerName.trim());
      navigate(`/character-creator?campaignId=${campaignId}&playerId=${player.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join campaign');
    } finally {
      setJoining(false);
    }
  };

  const getStatusBadge = (status: PlayerStatus) => {
    switch (status) {
      case PlayerStatus.READY:
        return <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">Ready</span>;
      case PlayerStatus.JOINED:
        return <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">Joined</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">Invited</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-gray-400">Loading campaign info...</div>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Invalid Invite</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Join Campaign</h1>
            <h2 className="text-xl text-indigo-400">{info.campaign.name}</h2>
          </div>

          {info.campaign.setting && (
            <p className="text-sm text-gray-400 text-center mb-2">Setting: {info.campaign.setting}</p>
          )}
          {info.campaign.description && (
            <p className="text-gray-300 text-sm mb-6">{info.campaign.description}</p>
          )}

          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-1">
              Party Level {info.campaign.partyLevel} | {info.players.length}/{info.campaign.playerCount} players
            </p>
          </div>

          {info.players.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Current Roster</h3>
              <div className="space-y-2">
                {info.players.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-gray-700/50 rounded px-3 py-2">
                    <div>
                      <span className="text-sm font-medium">{p.playerName}</span>
                      {p.characterName && (
                        <span className="text-xs text-gray-400 ml-2">({p.characterName})</span>
                      )}
                    </div>
                    {getStatusBadge(p.status)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your player name"
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={joining || !playerName.trim()}
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded font-medium disabled:opacity-50 transition-colors"
            >
              {joining ? 'Joining...' : 'Join & Create Character'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
