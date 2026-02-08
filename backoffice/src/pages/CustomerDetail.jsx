import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getCustomer(id)
      .then(setCustomer)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-slate-700 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }
  if (error) return <div className="p-8"><div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div></div>;
  if (!customer) return <div className="p-8"><p className="text-sm text-slate-400">Customer not found.</p></div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link to="/customers" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-amber-400 mb-4 transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to customers
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
          <span className="text-sm font-bold text-amber-400">
            {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{customer.name}</h1>
          <p className="text-sm text-slate-400">
            {customer.contactType} &middot; <span className="font-mono text-xs">{customer.cprCvr}</span>
          </p>
        </div>
        <span className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 border border-slate-700/50 ${
          customer.status === 'active' ? 'text-emerald-300' : 'text-slate-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${customer.status === 'active' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          {customer.status}
        </span>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-amber-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contracts</h3>
          </div>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{customer.contracts.length}</span>
        </div>
        {customer.contracts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">No contracts yet.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/40">
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">GSRN</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Billing</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Payment</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Start</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {customer.contracts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-3">
                    <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{c.gsrn}</span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-400 capitalize">{c.billingFrequency}</td>
                  <td className="px-5 py-3 text-sm text-slate-400 capitalize">{c.paymentModel}</td>
                  <td className="px-5 py-3 text-sm text-slate-400">{c.startDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-amber-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Metering Points</h3>
          </div>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{customer.meteringPoints.length}</span>
        </div>
        {customer.meteringPoints.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">No metering points linked.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/40">
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">GSRN</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Type</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Settlement</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Grid Area</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Supply Period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {customer.meteringPoints.map((mp) => (
                <tr key={mp.gsrn} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-3">
                    <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{mp.gsrn}</span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-400">{mp.type}</td>
                  <td className="px-5 py-3 text-sm text-slate-400">{mp.settlementMethod}</td>
                  <td className="px-5 py-3 text-sm text-slate-400">{mp.gridAreaCode} <span className="text-slate-500">({mp.priceArea})</span></td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                      mp.connectionStatus === 'connected' ? 'text-emerald-300' : 'text-slate-500'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${mp.connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      {mp.connectionStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-400">
                    {mp.supplyStart
                      ? `${mp.supplyStart}${mp.supplyEnd ? ` \u2013 ${mp.supplyEnd}` : ' \u2013 ongoing'}`
                      : <span className="text-slate-600">\u2014</span>}
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
