import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Campaign, Session, NPC, MapData, TimelineEvent } from '../types';
import { SessionStatus } from '../types';
import { ErrorAlert } from '../components/LoadingSpinner';

type SectionKey = 'sessions' | 'npcs' | 'maps' | 'timeline' | 'foundryScenes' | 'foundryActors';

interface FoundryItem {
  _id: string;
  name: string;
}

interface ConfirmState {
  open: boolean;
  message: string;
  onConfirm: () => void;
}

function statusBadge(status: SessionStatus) {
  const colors: Record<SessionStatus, string> = {
    [SessionStatus.PLANNED]: 'bg-gray-700 text-gray-300',
    [SessionStatus.IN_PROGRESS]: 'bg-yellow-800 text-yellow-200',
    [SessionStatus.COMPLETED]: 'bg-green-800 text-green-200',
  };
  const labels: Record<SessionStatus, string> = {
    [SessionStatus.PLANNED]: 'Planned',
    [SessionStatus.IN_PROGRESS]: 'In Progress',
    [SessionStatus.COMPLETED]: 'Completed',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

function syncBadge(syncStatus?: string) {
  if (!syncStatus || syncStatus === 'never') return null;
  const colors: Record<string, string> = {
    synced: 'bg-green-800 text-green-200',
    pending: 'bg-yellow-800 text-yellow-200',
    error: 'bg-red-800 text-red-200',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${colors[syncStatus] ?? 'bg-gray-700 text-gray-300'}`}>
      {syncStatus === 'synced' ? '✓ Foundry' : syncStatus}
    </span>
  );
}

export function ManageCampaign() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [maps, setMaps] = useState<MapData[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [foundryScenes, setFoundryScenes] = useState<FoundryItem[]>([]);
  const [foundryActors, setFoundryActors] = useState<FoundryItem[]>([]);
  const [foundryConnected, setFoundryConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [foundryLoading, setFoundryLoading] = useState(false);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<Record<SectionKey, Set<string>>>({
    sessions: new Set(),
    npcs: new Set(),
    maps: new Set(),
    timeline: new Set(),
    foundryScenes: new Set(),
    foundryActors: new Set(),
  });

  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    message: '',
    onConfirm: () => {},
  });

  const loadAll = useCallback(async () => {
    if (!id) return;
    try {
      const [camp, sess, npcList, mapList, timelineData] = await Promise.all([
        api.getCampaign(id),
        api.getSessions(id),
        api.getCampaignNPCs(id),
        api.getCampaignMaps(id),
        api.getCampaignTimeline(id),
      ]);
      setCampaign(camp);
      setSessions(sess);
      setNpcs(npcList);
      setMaps(mapList);
      setTimeline(timelineData.events);
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const loadFoundryItems = useCallback(async () => {
    setFoundryLoading(true);
    try {
      const [scenesRes, actorsRes] = await Promise.all([
        api.getFoundryScenes(),
        api.getFoundryActors(),
      ]);
      setFoundryScenes(scenesRes.scenes ?? []);
      setFoundryActors(actorsRes.actors ?? []);
      setFoundryConnected(true);
    } catch {
      setFoundryConnected(false);
    } finally {
      setFoundryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    loadFoundryItems();
  }, [loadAll, loadFoundryItems]);

  // ── Selection helpers ───────────────────────────────────────────

  function toggleOne(section: SectionKey, itemId: string) {
    setSelected((prev) => {
      const next = new Set(prev[section]);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return { ...prev, [section]: next };
    });
  }

  function toggleSection(section: SectionKey, allIds: string[]) {
    setSelected((prev) => {
      const allChecked = allIds.every((id) => prev[section].has(id));
      return { ...prev, [section]: allChecked ? new Set() : new Set(allIds) };
    });
  }

  function clearSection(section: SectionKey) {
    setSelected((prev) => ({ ...prev, [section]: new Set() }));
  }

  const totalSelected = (Object.values(selected) as Set<string>[]).reduce(
    (sum, s) => sum + s.size,
    0
  );

  // ── Delete helpers ──────────────────────────────────────────────

  function askConfirm(message: string, onConfirm: () => void) {
    setConfirm({ open: true, message, onConfirm });
  }

  function markDeleting(ids: string[], active: boolean) {
    setDeleting((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (active ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  async function deleteOne(section: SectionKey, itemId: string) {
    markDeleting([itemId], true);
    try {
      if (section === 'sessions') await api.deleteSession(itemId);
      else if (section === 'npcs') await api.deleteNPC(id!, itemId);
      else if (section === 'maps') await api.deleteMap(id!, itemId);
      else if (section === 'timeline') await api.deleteTimelineEvent(id!, itemId);
      else if (section === 'foundryScenes') await api.deleteFoundryScene(itemId);
      else if (section === 'foundryActors') await api.deleteFoundryActor(itemId);

      if (section === 'sessions') setSessions((s) => s.filter((x) => x.id !== itemId));
      else if (section === 'npcs') setNpcs((s) => s.filter((x) => x.id !== itemId));
      else if (section === 'maps') setMaps((s) => s.filter((x) => x.id !== itemId));
      else if (section === 'timeline') setTimeline((s) => s.filter((x) => x.id !== itemId));
      else if (section === 'foundryScenes') setFoundryScenes((s) => s.filter((x) => x._id !== itemId));
      else if (section === 'foundryActors') setFoundryActors((s) => s.filter((x) => x._id !== itemId));

      clearSection(section);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      markDeleting([itemId], false);
    }
  }

  async function deleteSectionSelected(section: SectionKey, ids: string[]) {
    markDeleting(ids, true);
    const failed: string[] = [];
    for (const itemId of ids) {
      try {
        if (section === 'sessions') await api.deleteSession(itemId);
        else if (section === 'npcs') await api.deleteNPC(id!, itemId);
        else if (section === 'maps') await api.deleteMap(id!, itemId);
        else if (section === 'timeline') await api.deleteTimelineEvent(id!, itemId);
        else if (section === 'foundryScenes') await api.deleteFoundryScene(itemId);
        else if (section === 'foundryActors') await api.deleteFoundryActor(itemId);
      } catch {
        failed.push(itemId);
      }
    }
    const deleted = ids.filter((i) => !failed.includes(i));
    if (section === 'sessions') setSessions((s) => s.filter((x) => !deleted.includes(x.id)));
    else if (section === 'npcs') setNpcs((s) => s.filter((x) => !deleted.includes(x.id)));
    else if (section === 'maps') setMaps((s) => s.filter((x) => !deleted.includes(x.id)));
    else if (section === 'timeline') setTimeline((s) => s.filter((x) => !deleted.includes(x.id)));
    else if (section === 'foundryScenes') setFoundryScenes((s) => s.filter((x) => !deleted.includes(x._id)));
    else if (section === 'foundryActors') setFoundryActors((s) => s.filter((x) => !deleted.includes(x._id)));

    clearSection(section);
    if (failed.length > 0) setError(`${failed.length} item(s) could not be deleted.`);
    markDeleting(ids, false);
  }

  async function deleteAllSelected() {
    const tasks: Array<{ section: SectionKey; ids: string[] }> = [
      { section: 'sessions', ids: [...selected.sessions] },
      { section: 'npcs', ids: [...selected.npcs] },
      { section: 'maps', ids: [...selected.maps] },
      { section: 'timeline', ids: [...selected.timeline] },
      { section: 'foundryScenes', ids: [...selected.foundryScenes] },
      { section: 'foundryActors', ids: [...selected.foundryActors] },
    ].filter((t) => t.ids.length > 0);

    for (const task of tasks) {
      await deleteSectionSelected(task.section, task.ids);
    }
  }

  // ── Shared section header component ────────────────────────────

  function SectionHeader({
    label,
    section,
    allIds,
    selectedCount,
    foundry,
  }: {
    label: string;
    section: SectionKey;
    allIds: string[];
    selectedCount: number;
    foundry?: boolean;
  }) {
    const allChecked = allIds.length > 0 && allIds.every((id) => selected[section].has(id));
    const someChecked = selectedCount > 0 && !allChecked;
    return (
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allChecked}
            ref={(el) => { if (el) el.indeterminate = someChecked; }}
            onChange={() => toggleSection(section, allIds)}
            disabled={allIds.length === 0}
            className="w-4 h-4 accent-blue-500 cursor-pointer"
          />
          <div className="flex items-center gap-2">
            {foundry && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-orange-900 text-orange-300 font-medium">
                Foundry
              </span>
            )}
            <h2 className="text-lg font-semibold text-white">
              {label}{' '}
              <span className="text-gray-400 font-normal text-sm">({allIds.length})</span>
            </h2>
          </div>
        </div>
        {selectedCount > 0 && (
          <button
            onClick={() =>
              askConfirm(
                `Delete ${selectedCount} selected ${label.toLowerCase()}? This cannot be undone.`,
                () => deleteSectionSelected(section, [...selected[section]])
              )
            }
            className="px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded text-sm font-medium"
          >
            Delete {selectedCount} selected
          </button>
        )}
      </div>
    );
  }

  // ── Loading / not found ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (!campaign) return null;

  const sessionIds = sessions.map((s) => s.id);
  const npcIds = npcs.map((n) => n.id);
  const mapIds = maps.map((m) => m.id);
  const timelineIds = timeline.map((t) => t.id);
  const foundrySceneIds = foundryScenes.map((s) => s._id);
  const foundryActorIds = foundryActors.map((a) => a._id);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={`/campaigns/${id}`} className="text-gray-400 hover:text-white text-sm">
            &larr; Back to {campaign.name}
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {error && <ErrorAlert error={error} onDismiss={() => setError('')} />}

        {/* Title + bulk action */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Manage Campaign Data</h1>
            <p className="text-gray-400 text-sm">
              Select items to delete individually or in bulk. Synced Foundry items are removed automatically.
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button
              onClick={async () => {
                try {
                  setError('');
                  await api.downloadCampaignBackup(id!);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Export failed');
                }
              }}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded font-medium text-sm whitespace-nowrap"
            >
              Export Campaign
            </button>
            {totalSelected > 0 && (
              <button
                onClick={() =>
                  askConfirm(
                    `Delete all ${totalSelected} selected items? This cannot be undone.`,
                    deleteAllSelected
                  )
                }
                className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded font-medium text-sm whitespace-nowrap"
              >
                Delete {totalSelected} selected
              </button>
            )}
          </div>
        </div>

        {/* ── Sessions ──────────────────────────────────── */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 mb-5">
          <SectionHeader label="Sessions" section="sessions" allIds={sessionIds} selectedCount={selected.sessions.size} />
          {sessions.length === 0 ? (
            <p className="text-gray-500 text-sm">No sessions yet.</p>
          ) : (
            <ul className="divide-y divide-gray-700">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <input type="checkbox" checked={selected.sessions.has(s.id)} onChange={() => toggleOne('sessions', s.id)} className="w-4 h-4 accent-blue-500 cursor-pointer flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">Session {s.sessionNumber}: {s.title}</span>
                  </div>
                  {statusBadge(s.status)}
                  <button onClick={() => askConfirm(`Delete "${s.title}"? This cannot be undone.`, () => deleteOne('sessions', s.id))} disabled={deleting.has(s.id)} className="px-3 py-1 bg-red-900 hover:bg-red-700 rounded text-sm disabled:opacity-40 flex-shrink-0">
                    {deleting.has(s.id) ? '…' : 'Delete'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── NPCs ─────────────────────────────────────── */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 mb-5">
          <SectionHeader label="NPCs" section="npcs" allIds={npcIds} selectedCount={selected.npcs.size} />
          {npcs.length === 0 ? (
            <p className="text-gray-500 text-sm">No NPCs yet.</p>
          ) : (
            <ul className="divide-y divide-gray-700">
              {npcs.map((n) => (
                <li key={n.id} className="flex items-center gap-3 py-3">
                  <input type="checkbox" checked={selected.npcs.has(n.id)} onChange={() => toggleOne('npcs', n.id)} className="w-4 h-4 accent-blue-500 cursor-pointer flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{n.name}</span>
                    {n.role && <span className="text-xs text-gray-400">{n.role}</span>}
                  </div>
                  {syncBadge(n.syncStatus)}
                  <button onClick={() => askConfirm(`Delete "${n.name}"?${n.syncStatus === 'synced' ? ' Their Foundry actor will also be removed.' : ''} This cannot be undone.`, () => deleteOne('npcs', n.id))} disabled={deleting.has(n.id)} className="px-3 py-1 bg-red-900 hover:bg-red-700 rounded text-sm disabled:opacity-40 flex-shrink-0">
                    {deleting.has(n.id) ? '…' : 'Delete'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Maps ─────────────────────────────────────── */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 mb-5">
          <SectionHeader label="Maps" section="maps" allIds={mapIds} selectedCount={selected.maps.size} />
          {maps.length === 0 ? (
            <p className="text-gray-500 text-sm">No maps yet.</p>
          ) : (
            <ul className="divide-y divide-gray-700">
              {maps.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <input type="checkbox" checked={selected.maps.has(m.id)} onChange={() => toggleOne('maps', m.id)} className="w-4 h-4 accent-blue-500 cursor-pointer flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{m.name}</span>
                    <span className="text-xs text-gray-400 capitalize">{m.type}</span>
                  </div>
                  {syncBadge(m.syncStatus)}
                  <button onClick={() => askConfirm(`Delete "${m.name}"?${m.syncStatus === 'synced' ? ' The Foundry scene will also be removed.' : ''} This cannot be undone.`, () => deleteOne('maps', m.id))} disabled={deleting.has(m.id)} className="px-3 py-1 bg-red-900 hover:bg-red-700 rounded text-sm disabled:opacity-40 flex-shrink-0">
                    {deleting.has(m.id) ? '…' : 'Delete'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Timeline Events ───────────────────────────── */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 mb-5">
          <SectionHeader label="Timeline Events" section="timeline" allIds={timelineIds} selectedCount={selected.timeline.size} />
          {timeline.length === 0 ? (
            <p className="text-gray-500 text-sm">No timeline events yet.</p>
          ) : (
            <ul className="divide-y divide-gray-700">
              {timeline.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <input type="checkbox" checked={selected.timeline.has(t.id)} onChange={() => toggleOne('timeline', t.id)} className="w-4 h-4 accent-blue-500 cursor-pointer flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{t.title}</span>
                    <span className="text-xs text-gray-400 capitalize">{t.eventType} &middot; {t.significance} &middot; {t.eventDate}</span>
                  </div>
                  <button onClick={() => askConfirm(`Delete timeline event "${t.title}"? This cannot be undone.`, () => deleteOne('timeline', t.id))} disabled={deleting.has(t.id)} className="px-3 py-1 bg-red-900 hover:bg-red-700 rounded text-sm disabled:opacity-40 flex-shrink-0">
                    {deleting.has(t.id) ? '…' : 'Delete'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Foundry Scenes ────────────────────────────── */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 mb-5">
          <SectionHeader label="Scenes" section="foundryScenes" allIds={foundrySceneIds} selectedCount={selected.foundryScenes.size} foundry />
          {!foundryConnected ? (
            <div className="flex items-center justify-between">
              <p className="text-gray-500 text-sm">Foundry VTT not connected.</p>
              <button onClick={loadFoundryItems} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">
                Retry
              </button>
            </div>
          ) : foundryLoading ? (
            <p className="text-gray-500 text-sm">Loading from Foundry…</p>
          ) : foundryScenes.length === 0 ? (
            <p className="text-gray-500 text-sm">No scenes in Foundry.</p>
          ) : (
            <ul className="divide-y divide-gray-700">
              {foundryScenes.map((s) => (
                <li key={s._id} className="flex items-center gap-3 py-3">
                  <input type="checkbox" checked={selected.foundryScenes.has(s._id)} onChange={() => toggleOne('foundryScenes', s._id)} className="w-4 h-4 accent-blue-500 cursor-pointer flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{s.name}</span>
                    <span className="text-xs text-gray-500 font-mono">{s._id}</span>
                  </div>
                  <button onClick={() => askConfirm(`Delete Foundry scene "${s.name}"? This removes it from Foundry VTT and cannot be undone.`, () => deleteOne('foundryScenes', s._id))} disabled={deleting.has(s._id)} className="px-3 py-1 bg-red-900 hover:bg-red-700 rounded text-sm disabled:opacity-40 flex-shrink-0">
                    {deleting.has(s._id) ? '…' : 'Delete'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Foundry Actors ────────────────────────────── */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 mb-5">
          <SectionHeader label="Actors" section="foundryActors" allIds={foundryActorIds} selectedCount={selected.foundryActors.size} foundry />
          {!foundryConnected ? (
            <div className="flex items-center justify-between">
              <p className="text-gray-500 text-sm">Foundry VTT not connected.</p>
              <button onClick={loadFoundryItems} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">
                Retry
              </button>
            </div>
          ) : foundryLoading ? (
            <p className="text-gray-500 text-sm">Loading from Foundry…</p>
          ) : foundryActors.length === 0 ? (
            <p className="text-gray-500 text-sm">No actors in Foundry.</p>
          ) : (
            <ul className="divide-y divide-gray-700">
              {foundryActors.map((a) => (
                <li key={a._id} className="flex items-center gap-3 py-3">
                  <input type="checkbox" checked={selected.foundryActors.has(a._id)} onChange={() => toggleOne('foundryActors', a._id)} className="w-4 h-4 accent-blue-500 cursor-pointer flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{a.name}</span>
                    <span className="text-xs text-gray-500 font-mono">{a._id}</span>
                  </div>
                  <button onClick={() => askConfirm(`Delete Foundry actor "${a.name}"? This removes it from Foundry VTT and cannot be undone.`, () => deleteOne('foundryActors', a._id))} disabled={deleting.has(a._id)} className="px-3 py-1 bg-red-900 hover:bg-red-700 rounded text-sm disabled:opacity-40 flex-shrink-0">
                    {deleting.has(a._id) ? '…' : 'Delete'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Confirmation modal */}
      {confirm.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold mb-3">Confirm Delete</h3>
            <p className="text-gray-300 mb-6">{confirm.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirm((c) => ({ ...c, open: false }))} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium">
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirm((c) => ({ ...c, open: false }));
                  confirm.onConfirm();
                }}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
