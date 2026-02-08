import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const STATUS_OPTIONS = ['all', 'registered', 'processing', 'active', 'rejected', 'cancelled'];

const statusConfig = {
  registered: { dot: 'bg-slate-400', text: 'text-slate-300' },
  processing: { dot: 'bg-amber-400', text: 'text-amber-300' },
  active:     { dot: 'bg-emerald-400', text: 'text-emerald-300' },
  rejected:   { dot: 'bg-red-400', text: 'text-red-300' },
  cancelled:  { dot: 'bg-slate-500', text: 'text-slate-400' },
};

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig.registered;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

export default function SignupList() {
  const [signups, setSignups] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getSignups(filter === 'all' ? null : filter)
      .then(setSignups)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Signups</h1>
          <p className="text-sm text-slate-400 mt-1">Manage customer onboarding requests.</p>
        </div>
        <Link
          to="/signups/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-slate-950 text-sm font-semibold rounded-lg shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Signup
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1 mb-5 bg-slate-800/50 rounded-lg p-1 w-fit border border-slate-700/50">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              filter === s
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-5 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-slate-700 border-t-amber-400 rounded-full animate-spin" />
            <p className="text-sm text-slate-500 mt-3">Loading signups...</p>
          </div>
        ) : signups.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-10 h-10 text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <p className="text-sm font-medium text-slate-400">No signups found</p>
            <p className="text-xs text-slate-500 mt-1">
              {filter !== 'all' ? 'Try a different filter.' : 'Create one to get started.'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/40">
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Signup</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Customer</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">GSRN</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Type</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Effective</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Created</th>
                <th className="px-5 py-3"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {signups.map((s) => (
                <tr key={s.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link to={`/signups/${s.id}`} className="text-sm font-medium text-amber-400 hover:text-amber-300">
                      {s.signupNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-300">{s.customerName}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {s.gsrn}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-400">
                    {s.type === 'move_in' ? 'Move-in' : 'Switch'}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-400">{s.effectiveDate}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {new Date(s.createdAt).toLocaleDateString('da-DK')}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link to={`/signups/${s.id}`} className="text-slate-600 hover:text-amber-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && signups.length > 0 && (
        <p className="text-xs text-slate-500 mt-3 px-1">
          {signups.length} signup{signups.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
