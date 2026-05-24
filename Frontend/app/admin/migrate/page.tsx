'use client';

import { useState } from 'react';

export default function MigratePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMigrate = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch('/api/inbox/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-6">🔄 Inbox Migration</h1>

          <p className="text-slate-300 mb-8">
            This will migrate all campaigns from your campaigns collection to the new inbox structure.
            Each contact will have their campaign messages pre-loaded in Firestore.
          </p>

          <button
            onClick={handleMigrate}
            disabled={isLoading}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
              isLoading
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
            }`}
          >
            {isLoading ? '⏳ Migrating...' : '▶️ Start Migration'}
          </button>

          {error && (
            <div className="mt-8 p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <h2 className="text-red-400 font-semibold mb-2">❌ Error</h2>
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-8 p-4 bg-green-900/20 border border-green-700 rounded-lg">
              <h2 className="text-green-400 font-semibold mb-4">✅ Migration Successful</h2>
              <div className="space-y-2 text-green-300">
                <p>
                  <span className="font-semibold">Migrated Campaigns:</span> {result.migratedCampaigns}
                </p>
                <p>
                  <span className="font-semibold">Total Contacts:</span> {result.totalContacts}
                </p>
                <p className="text-sm mt-4 text-slate-300">
                  {result.message}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
