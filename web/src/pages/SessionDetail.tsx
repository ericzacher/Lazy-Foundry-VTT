import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Session } from '../types';
import { SessionStatus } from '../types';

interface Scenario {
  title?: string;
  summary?: string;
  objectives?: string[];
  encounters?: Array<{
    name: string;
    description: string;
    difficulty: string;
    enemies?: string[];
  }>;
  rewards?: string[];
  twists?: string[];
}

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [generatingScenario, setGeneratingScenario] = useState(false);

  useEffect(() => {
    if (id) {
      loadSession();
    }
  }, [id]);

  const loadSession = async () => {
    try {
      const data = await api.getSession(id!);
      setSession(data);
    } catch (error) {
      console.error('Failed to load session:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: SessionStatus) => {
    if (!session) return;
    setUpdating(true);
    try {
      const updated = await api.updateSession(session.id, { status });
      setSession(updated);
    } catch (error) {
      console.error('Failed to update session:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleGenerateScenario = async () => {
    if (!session) return;
    setGeneratingScenario(true);
    try {
      const { session: updatedSession } = await api.generateScenario(session.id);
      setSession(updatedSession);
    } catch (error) {
      console.error('Failed to generate scenario:', error);
      alert('Failed to generate scenario. Please try again.');
    } finally {
      setGeneratingScenario(false);
    }
  };

  const getStatusColor = (status: SessionStatus) => {
    switch (status) {
      case SessionStatus.PLANNED:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case SessionStatus.IN_PROGRESS:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case SessionStatus.COMPLETED:
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'hard':
        return 'text-orange-400';
      case 'deadly':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Session not found</div>
      </div>
    );
  }

  const scenario = session.scenario as Scenario | undefined;

  return (
    <div className="min-h-screen">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            to={`/campaigns/${session.campaignId}`}
            className="text-gray-400 hover:text-white text-sm"
          >
            &larr; Back to Campaign
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-gray-500 text-sm">
                Session {session.sessionNumber}
              </span>
              <h1 className="text-2xl font-bold mt-1">{session.title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateScenario}
                disabled={generatingScenario}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-medium disabled:opacity-50"
              >
                {generatingScenario ? 'Generating...' : 'Generate Scenario'}
              </button>
              <span
                className={`px-3 py-1 rounded border ${getStatusColor(
                  session.status
                )}`}
              >
                {session.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {session.description && (
            <p className="text-gray-300 mb-4">{session.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            {session.scheduledDate && (
              <span>
                Scheduled: {new Date(session.scheduledDate).toLocaleString()}
              </span>
            )}
            {session.completedDate && (
              <span>
                Completed: {new Date(session.completedDate).toLocaleString()}
              </span>
            )}
            <span>Created: {new Date(session.createdAt).toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <h2 className="text-lg font-semibold mb-4">Session Status</h2>
          <div className="flex gap-3">
            <button
              onClick={() => updateStatus(SessionStatus.PLANNED)}
              disabled={updating || session.status === SessionStatus.PLANNED}
              className={`px-4 py-2 rounded border ${
                session.status === SessionStatus.PLANNED
                  ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                  : 'border-gray-600 hover:border-gray-500'
              } disabled:opacity-50`}
            >
              Planned
            </button>
            <button
              onClick={() => updateStatus(SessionStatus.IN_PROGRESS)}
              disabled={updating || session.status === SessionStatus.IN_PROGRESS}
              className={`px-4 py-2 rounded border ${
                session.status === SessionStatus.IN_PROGRESS
                  ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                  : 'border-gray-600 hover:border-gray-500'
              } disabled:opacity-50`}
            >
              In Progress
            </button>
            <button
              onClick={() => updateStatus(SessionStatus.COMPLETED)}
              disabled={updating || session.status === SessionStatus.COMPLETED}
              className={`px-4 py-2 rounded border ${
                session.status === SessionStatus.COMPLETED
                  ? 'bg-green-500/20 border-green-500/30 text-green-400'
                  : 'border-gray-600 hover:border-gray-500'
              } disabled:opacity-50`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Scenario Section */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Scenario</h2>
            {scenario && (
              <button
                onClick={handleGenerateScenario}
                disabled={generatingScenario}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                {generatingScenario ? 'Regenerating...' : 'Regenerate'}
              </button>
            )}
          </div>

          {!scenario ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No scenario generated yet</p>
              <button
                onClick={handleGenerateScenario}
                disabled={generatingScenario}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-medium disabled:opacity-50"
              >
                {generatingScenario ? 'Generating...' : 'Generate Scenario'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {scenario.title && (
                <div>
                  <h3 className="text-xl font-medium text-purple-400">{scenario.title}</h3>
                </div>
              )}

              {scenario.summary && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Summary</h4>
                  <p className="text-gray-300 whitespace-pre-line">{scenario.summary}</p>
                </div>
              )}

              {scenario.objectives && scenario.objectives.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Objectives</h4>
                  <ul className="space-y-2">
                    {scenario.objectives.map((obj, i) => (
                      <li key={i} className="flex gap-2 text-gray-300">
                        <span className="text-blue-400">{i + 1}.</span>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {scenario.encounters && scenario.encounters.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Encounters</h4>
                  <div className="space-y-3">
                    {scenario.encounters.map((encounter, i) => (
                      <div key={i} className="bg-gray-700/50 rounded p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium">{encounter.name}</h5>
                          <span className={`text-xs ${getDifficultyColor(encounter.difficulty)}`}>
                            {encounter.difficulty}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm">{encounter.description}</p>
                        {encounter.enemies && encounter.enemies.length > 0 && (
                          <div className="mt-2 text-sm">
                            <span className="text-gray-500">Enemies:</span>{' '}
                            <span className="text-red-400">{encounter.enemies.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {scenario.rewards && scenario.rewards.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Potential Rewards</h4>
                  <ul className="space-y-1">
                    {scenario.rewards.map((reward, i) => (
                      <li key={i} className="text-gray-300 flex gap-2">
                        <span className="text-yellow-400">*</span>
                        {reward}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {scenario.twists && scenario.twists.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Plot Twists</h4>
                  <ul className="space-y-1">
                    {scenario.twists.map((twist, i) => (
                      <li key={i} className="text-gray-300 flex gap-2">
                        <span className="text-orange-400">!</span>
                        {twist}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Session Content</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded p-4 text-center">
              <div className="text-2xl font-bold text-gray-500">
                {scenario?.encounters?.length || 0}
              </div>
              <div className="text-sm text-gray-400">Encounters</div>
            </div>
            <div className="bg-gray-700/50 rounded p-4 text-center">
              <div className="text-2xl font-bold text-gray-500">
                {scenario?.objectives?.length || 0}
              </div>
              <div className="text-sm text-gray-400">Objectives</div>
            </div>
            <div className="bg-gray-700/50 rounded p-4 text-center">
              <div className="text-2xl font-bold text-gray-500">
                {scenario?.rewards?.length || 0}
              </div>
              <div className="text-sm text-gray-400">Rewards</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
