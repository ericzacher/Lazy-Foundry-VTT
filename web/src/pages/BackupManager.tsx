import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Campaign, RestoreResult } from '../types';

type RestoreMode = 'full' | 'new-campaign' | 'merge';

export function BackupManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);

  // Restore form state
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('full');
  const [mergeCampaignId, setMergeCampaignId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backup campaign picker
  const [exportCampaignId, setExportCampaignId] = useState('');

  useEffect(() => {
    api.getCampaigns().then((c) => {
      setCampaigns(c);
      if (c.length > 0) {
        setExportCampaignId(c[0].id);
        setMergeCampaignId(c[0].id);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const clearMessages = () => { setError(''); setSuccess(''); setRestoreResult(null); };

  const handleFullBackup = async () => {
    clearMessages();
    setBackupLoading(true);
    try {
      await api.downloadFullBackup();
      setSuccess('Full backup downloaded successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleCampaignBackup = async () => {
    if (!exportCampaignId) return;
    clearMessages();
    setBackupLoading(true);
    try {
      await api.downloadCampaignBackup(exportCampaignId);
      setSuccess('Campaign backup downloaded successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) { setError('Please select a backup file.'); return; }
    clearMessages();
    setRestoreLoading(true);
    try {
      let result: RestoreResult;
      if (restoreMode === 'full') {
        result = await api.restoreFullBackup(file);
      } else if (restoreMode === 'merge') {
        result = await api.restoreCampaignBackup(file, mergeCampaignId);
      } else {
        result = await api.restoreCampaignBackup(file);
      }
      setRestoreResult(result);
      setSuccess('Restore completed successfully.');
      // Refresh campaigns list
      api.getCampaigns().then(setCampaigns).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Backup & Restore</h1>
          <Link to="/" className="text-sm text-gray-400 hover:text-white">
            &larr; Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-500/20 text-red-400 p-3 rounded flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 ml-4">Dismiss</button>
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 text-green-400 p-3 rounded flex justify-between items-center">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300 ml-4">Dismiss</button>
          </div>
        )}

        {/* ─── Create Backup ─────────────────────────────── */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Create Backup</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Full System Backup</h3>
                <p className="text-sm text-gray-400">All campaigns, sessions, NPCs, maps, tokens, stores, and assets.</p>
              </div>
              <button
                onClick={handleFullBackup}
                disabled={backupLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 whitespace-nowrap"
              >
                {backupLoading ? 'Preparing...' : 'Download Full Backup'}
              </button>
            </div>

            <hr className="border-gray-700" />

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-medium">Campaign Backup</h3>
                <p className="text-sm text-gray-400 mb-2">Export a single campaign with all its data.</p>
                {loading ? (
                  <p className="text-sm text-gray-500">Loading campaigns...</p>
                ) : campaigns.length === 0 ? (
                  <p className="text-sm text-gray-500">No campaigns to export.</p>
                ) : (
                  <select
                    value={exportCampaignId}
                    onChange={(e) => setExportCampaignId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <button
                onClick={handleCampaignBackup}
                disabled={backupLoading || !exportCampaignId}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 whitespace-nowrap self-end"
              >
                {backupLoading ? 'Preparing...' : 'Export Campaign'}
              </button>
            </div>
          </div>
        </section>

        {/* ─── Restore Backup ────────────────────────────── */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Restore Backup</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Backup File (.zip)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-gray-300 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-600 file:text-gray-200 file:cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Restore Mode</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="restoreMode"
                    checked={restoreMode === 'full'}
                    onChange={() => setRestoreMode('full')}
                    className="accent-blue-500"
                  />
                  <span>Full System Restore</span>
                  <span className="text-xs text-gray-400">— Restore all data (creates new records, never overwrites)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="restoreMode"
                    checked={restoreMode === 'new-campaign'}
                    onChange={() => setRestoreMode('new-campaign')}
                    className="accent-blue-500"
                  />
                  <span>Restore as New Campaign</span>
                  <span className="text-xs text-gray-400">— Import campaign backup as a new campaign</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="restoreMode"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                    className="accent-blue-500"
                  />
                  <span>Merge into Existing Campaign</span>
                  <span className="text-xs text-gray-400">— Append data into an existing campaign</span>
                </label>
              </div>
            </div>

            {restoreMode === 'merge' && (
              <div>
                <label className="block text-sm font-medium mb-1">Target Campaign</label>
                {campaigns.length === 0 ? (
                  <p className="text-sm text-gray-500">No campaigns available.</p>
                ) : (
                  <select
                    value={mergeCampaignId}
                    onChange={(e) => setMergeCampaignId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="bg-yellow-900/30 border border-yellow-700/50 rounded p-3 text-sm text-yellow-300">
              Foundry sync fields will be cleared on restore. You will need to re-sync to Foundry VTT manually after restoring.
            </div>

            <button
              onClick={handleRestore}
              disabled={restoreLoading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium disabled:opacity-50"
            >
              {restoreLoading ? 'Restoring...' : 'Restore Backup'}
            </button>
          </div>
        </section>

        {/* ─── Restore Result ────────────────────────────── */}
        {restoreResult && (
          <section className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4">Restore Summary</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {Object.entries(restoreResult.created).map(([key, count]) => (
                <div key={key} className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{count}</div>
                  <div className="text-xs text-gray-400 capitalize">{key.replace(/_/g, ' ')}</div>
                </div>
              ))}
            </div>

            {restoreResult.errors.length > 0 && (
              <div className="bg-red-900/30 border border-red-700/50 rounded p-3">
                <h3 className="text-sm font-medium text-red-400 mb-1">Warnings ({restoreResult.errors.length})</h3>
                <ul className="text-xs text-red-300 space-y-1">
                  {restoreResult.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                  {restoreResult.errors.length > 10 && (
                    <li>... and {restoreResult.errors.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
