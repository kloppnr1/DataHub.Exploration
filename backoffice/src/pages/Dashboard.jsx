import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const [signups, setSignups] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getSignups().catch(() => []),
      api.getCustomers().catch(() => []),
      api.getProducts().catch(() => []),
    ]).then(([s, c, p]) => {
      setSignups(s);
      setCustomers(c);
      setProducts(p);
      setLoading(false);
    });
  }, []);

  const pending = signups.filter((s) => s.status === 'registered' || s.status === 'processing').length;
  const active = customers.filter((c) => c.status === 'active').length;
  const rejected = signups.filter((s) => s.status === 'rejected').length;
  const recent = [...signups].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  const stats = [
    {
      label: 'Pending signups',
      value: pending,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      link: '/signups?status=processing',
    },
    {
      label: 'Active customers',
      value: active,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      ),
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      link: '/customers',
    },
    {
      label: 'Rejected',
      value: rejected,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      ),
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      link: '/signups?status=rejected',
    },
    {
      label: 'Products',
      value: products.length,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
        </svg>
      ),
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      link: '/products',
    },
  ];

  const statusDot = {
    registered: 'bg-slate-400',
    processing: 'bg-amber-400',
    active: 'bg-emerald-400',
    rejected: 'bg-red-400',
    cancelled: 'bg-slate-500',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-slate-700 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Overview of your electricity supplier operations.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.link}
            className="group bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/80 hover:border-slate-600/50 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center ${s.color}`}>
                {s.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent signups */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Recent Signups</h2>
          <Link to="/signups" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-10 text-center">
            <svg className="w-8 h-8 text-slate-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <p className="text-sm text-slate-500">No signups yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/40">
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-2.5">Signup</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-2.5">Customer</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-2.5">GSRN</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-2.5">Status</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-2.5">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {recent.map((s) => (
                <tr key={s.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-3">
                    <Link to={`/signups/${s.id}`} className="text-sm font-medium text-amber-400 hover:text-amber-300">
                      {s.signupNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-300">{s.customerName}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{s.gsrn}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot[s.status] || 'bg-slate-500'}`} />
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {new Date(s.createdAt).toLocaleDateString('da-DK')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
