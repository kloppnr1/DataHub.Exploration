import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const STATUS_OPTIONS = ['all', 'registered', 'processing', 'active', 'rejected', 'cancelled'];

const statusColors = {
  registered: 'bg-gray-100 text-gray-700',
  processing: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Signups</h2>
        <Link
          to="/signups/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
        >
          New Signup
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 mb-4">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 text-xs font-medium rounded ${
              filter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : signups.length === 0 ? (
        <p className="text-gray-500 text-sm">No signups found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
              <th className="py-2 pr-4">Signup #</th>
              <th className="py-2 pr-4">Customer</th>
              <th className="py-2 pr-4">GSRN</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Effective</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {signups.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 pr-4">
                  <Link to={`/signups/${s.id}`} className="text-blue-600 hover:underline">
                    {s.signupNumber}
                  </Link>
                </td>
                <td className="py-2 pr-4">{s.customerName}</td>
                <td className="py-2 pr-4 font-mono text-xs">{s.gsrn}</td>
                <td className="py-2 pr-4">{s.type === 'move_in' ? 'Move-in' : 'Switch'}</td>
                <td className="py-2 pr-4">{s.effectiveDate}</td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[s.status] || ''}`}>
                    {s.status}
                  </span>
                </td>
                <td className="py-2 text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
