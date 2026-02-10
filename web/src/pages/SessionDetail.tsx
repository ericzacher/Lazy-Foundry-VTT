import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Session, SessionResult } from '../types';
import { SessionStatus } from '../types';
import { LoadingSpinner, LoadingSkeleton, ErrorAlert } from '../components/LoadingSpinner';

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
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'scenario' | 'results'>('scenario');
  const [showFinalizeForm, setShowFinalizeForm] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);

  const loadSession = useCallback(async () => {
    try {
      const data = await api.getSession(id!);
      setSession(data);
      // Try to load existing results
      try {
        const results = await api.getSessionResults(id!);
        setSessionResult(results);
      } catch {
        // No results yet - that's fine
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (id) {
      loadSession();
    }
  }, [id, loadSession]);

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
    setError('');
    try {
      const { session: updatedSession } = await api.generateScenario(session.id);
      setSession(updatedSession);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate scenario. Make sure your Groq API key is set.';
      setError(errorMsg);
      console.error('Failed to generate scenario:', err);
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
        <LoadingSpinner />
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
        {error && (
          <ErrorAlert error={error} onDismiss={() => setError('')} />
        )}
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

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('scenario')}
            className={`pb-3 px-1 border-b-2 ${
              activeTab === 'scenario'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Scenario
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`pb-3 px-1 border-b-2 ${
              activeTab === 'results'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Session Results {sessionResult ? '✓' : ''}
          </button>
        </div>

        {activeTab === 'scenario' && (
          <>
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
          </>
        )}

        {activeTab === 'results' && (
          <div className="space-y-6">
            {/* Existing Results Display */}
            {sessionResult && !showFinalizeForm && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Session Results</h2>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowFinalizeForm(true)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Edit Results
                    </button>
                    <span className="text-xs text-gray-500">
                      Captured: {new Date(sessionResult.capturedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {sessionResult.summary && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-1">Summary</h3>
                      <p className="text-gray-300 whitespace-pre-line">{sessionResult.summary}</p>
                    </div>
                  )}

                  {sessionResult.events && sessionResult.events.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-1">Key Events</h3>
                      <ul className="space-y-1">
                        {sessionResult.events.map((event, i) => (
                          <li key={i} className="text-gray-300 flex gap-2">
                            <span className="text-blue-400">•</span>
                            {event}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sessionResult.playerDecisions && sessionResult.playerDecisions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-1">Player Decisions</h3>
                      <ul className="space-y-1">
                        {sessionResult.playerDecisions.map((decision, i) => (
                          <li key={i} className="text-gray-300 flex gap-2">
                            <span className="text-green-400">→</span>
                            {decision}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sessionResult.npcInteractions && Object.keys(sessionResult.npcInteractions).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-1">NPC Interactions</h3>
                      <div className="space-y-2">
                        {Object.entries(sessionResult.npcInteractions).map(([npc, interaction], i) => (
                          <div key={i} className="bg-gray-700/50 rounded p-3">
                            <span className="text-purple-400 font-medium">{npc}:</span>{' '}
                            <span className="text-gray-300">{String(interaction)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sessionResult.worldChanges && Object.keys(sessionResult.worldChanges).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-1">World Changes</h3>
                      <div className="space-y-2">
                        {Object.entries(sessionResult.worldChanges).map(([area, change], i) => (
                          <div key={i} className="bg-gray-700/50 rounded p-3">
                            <span className="text-yellow-400 font-medium">{area}:</span>{' '}
                            <span className="text-gray-300">{String(change)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sessionResult.unfinishedThreads && sessionResult.unfinishedThreads.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-1">Unfinished Threads</h3>
                      <ul className="space-y-1">
                        {sessionResult.unfinishedThreads.map((thread, i) => (
                          <li key={i} className="text-gray-300 flex gap-2">
                            <span className="text-orange-400">⟳</span>
                            {thread}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Finalize Form */}
            {(!sessionResult || showFinalizeForm) && (
              <FinalizeSessionForm
                sessionId={session.id}
                existing={sessionResult}
                onFinalized={(result) => {
                  setSessionResult(result);
                  setShowFinalizeForm(false);
                  // Reload session to get updated status
                  loadSession();
                }}
                onCancel={sessionResult ? () => setShowFinalizeForm(false) : undefined}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* --- FinalizeSessionForm Component --- */

interface FinalizeFormProps {
  sessionId: string;
  existing: SessionResult | null;
  onFinalized: (result: SessionResult) => void;
  onCancel?: () => void;
}

function FinalizeSessionForm({ sessionId, existing, onFinalized, onCancel }: FinalizeFormProps) {
  const [summary, setSummary] = useState(existing?.summary || '');
  const [events, setEvents] = useState<string[]>(existing?.events || ['']);
  const [playerDecisions, setPlayerDecisions] = useState<string[]>(existing?.playerDecisions || ['']);
  const [npcInteractionsText, setNpcInteractionsText] = useState(
    existing?.npcInteractions ? JSON.stringify(existing.npcInteractions, null, 2) : '{\n  \n}'
  );
  const [worldChangesText, setWorldChangesText] = useState(
    existing?.worldChanges ? JSON.stringify(existing.worldChanges, null, 2) : '{\n  \n}'
  );
  const [unfinishedThreads, setUnfinishedThreads] = useState<string[]>(existing?.unfinishedThreads || ['']);
  const [submitting, setSubmitting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState('');

  const addListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, '']);
  };

  const updateListItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) => {
    setter(prev => prev.map((item, i) => (i === index ? value : item)));
  };

  const removeListItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const handleAISummarize = async () => {
    const filteredEvents = events.filter(e => e.trim());
    const filteredDecisions = playerDecisions.filter(d => d.trim());

    if (filteredEvents.length === 0) {
      setError('Add at least one event before generating an AI summary.');
      return;
    }

    setSummarizing(true);
    setError('');
    try {
      const { summary: aiSummary } = await api.summarizeSession(
        sessionId,
        filteredEvents,
        filteredDecisions
      );
      setSummary(aiSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI summary');
    } finally {
      setSummarizing(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    let npcInteractions: Record<string, unknown> = {};
    let worldChanges: Record<string, unknown> = {};

    try {
      npcInteractions = JSON.parse(npcInteractionsText);
    } catch {
      setError('NPC Interactions must be valid JSON');
      setSubmitting(false);
      return;
    }

    try {
      worldChanges = JSON.parse(worldChangesText);
    } catch {
      setError('World Changes must be valid JSON');
      setSubmitting(false);
      return;
    }

    try {
      const response = await api.finalizeSession(sessionId, {
        summary: summary.trim() || undefined,
        events: events.filter(e => e.trim()),
        playerDecisions: playerDecisions.filter(d => d.trim()),
        npcInteractions,
        worldChanges,
        unfinishedThreads: unfinishedThreads.filter(t => t.trim()),
      });

      const result = (response as { result: SessionResult }).result;
      onFinalized(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize session');
    } finally {
      setSubmitting(false);
    }
  };

  const renderDynamicList = (
    label: string,
    items: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    placeholder: string
  ) => (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-400">{label}</label>
        <button
          type="button"
          onClick={() => addListItem(setter)}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={e => updateListItem(setter, i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 text-sm"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeListItem(setter, i)}
                className="text-red-400 hover:text-red-300 px-2"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">
          {existing ? 'Edit Session Results' : 'Finalize Session'}
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white text-sm"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Summary */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-400">Summary</label>
            <button
              type="button"
              onClick={handleAISummarize}
              disabled={summarizing}
              className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
            >
              {summarizing ? 'Generating...' : '✨ AI Summarize'}
            </button>
          </div>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="Write or generate a summary of what happened this session..."
            rows={4}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

        {/* Events */}
        {renderDynamicList('Key Events', events, setEvents, 'e.g., Party defeated the goblin ambush')}

        {/* Player Decisions */}
        {renderDynamicList('Player Decisions', playerDecisions, setPlayerDecisions, 'e.g., Spared the goblin leader')}

        {/* NPC Interactions */}
        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">
            NPC Interactions (JSON)
          </label>
          <textarea
            value={npcInteractionsText}
            onChange={e => setNpcInteractionsText(e.target.value)}
            placeholder='{"NPC Name": "Description of interaction"}'
            rows={4}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 text-sm font-mono"
          />
        </div>

        {/* World Changes */}
        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">
            World Changes (JSON)
          </label>
          <textarea
            value={worldChangesText}
            onChange={e => setWorldChangesText(e.target.value)}
            placeholder='{"Location/Faction": "What changed"}'
            rows={4}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 text-sm font-mono"
          />
        </div>

        {/* Unfinished Threads */}
        {renderDynamicList('Unfinished Threads', unfinishedThreads, setUnfinishedThreads, 'e.g., The mysterious letter remains unopened')}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-medium disabled:opacity-50"
          >
            {submitting ? 'Saving...' : existing ? 'Update Results' : 'Finalize Session'}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-2 border border-gray-600 hover:border-gray-500 rounded"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
