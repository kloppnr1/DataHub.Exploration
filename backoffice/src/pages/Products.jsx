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
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Products</h2>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-gray-500 text-sm">No products found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Model</th>
              <th className="py-2 pr-4 text-right">Margin (ore/kWh)</th>
              <th className="py-2 pr-4 text-right">Supplement (ore/kWh)</th>
              <th className="py-2 pr-4 text-right">Subscription (kr/mo)</th>
              <th className="py-2 pr-4">Green</th>
              <th className="py-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-gray-100">
                <td className="py-2 pr-4 font-medium">{p.name}</td>
                <td className="py-2 pr-4">{p.energyModel}</td>
                <td className="py-2 pr-4 text-right font-mono">{p.margin_ore_per_kwh}</td>
                <td className="py-2 pr-4 text-right font-mono">{p.supplement_ore_per_kwh ?? '\u2014'}</td>
                <td className="py-2 pr-4 text-right font-mono">{p.subscription_kr_per_month}</td>
                <td className="py-2 pr-4">{p.green_energy ? 'Yes' : 'No'}</td>
                <td className="py-2 text-gray-500">{p.description || '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
