import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getProducts()
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Products</h1>
        <p className="text-sm text-slate-400 mt-1">Energy products available for customer signups.</p>
      </div>

      {error && (
        <div className="mb-5 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-slate-700 border-t-amber-400 rounded-full animate-spin" />
            <p className="text-sm text-slate-500 mt-3">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-10 h-10 text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
            <p className="text-sm font-medium text-slate-400">No products configured</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/40">
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Product</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Model</th>
                <th className="text-right text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Margin</th>
                <th className="text-right text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Supplement</th>
                <th className="text-right text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Subscription</th>
                <th className="text-center text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Green</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{p.name}</p>
                      {p.description && <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/30">
                      {p.energyModel}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm font-mono text-slate-300">{p.margin_ore_per_kwh}</span>
                    <span className="text-xs text-slate-500 ml-1">ore/kWh</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {p.supplement_ore_per_kwh != null ? (
                      <>
                        <span className="text-sm font-mono text-slate-300">{p.supplement_ore_per_kwh}</span>
                        <span className="text-xs text-slate-500 ml-1">ore/kWh</span>
                      </>
                    ) : (
                      <span className="text-slate-600">&mdash;</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm font-mono text-slate-300">{p.subscription_kr_per_month}</span>
                    <span className="text-xs text-slate-500 ml-1">kr/mo</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {p.green_energy ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </span>
                    ) : (
                      <span className="text-slate-600">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && products.length > 0 && (
        <p className="text-xs text-slate-500 mt-3 px-1">{products.length} product{products.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
