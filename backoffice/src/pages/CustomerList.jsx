import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getCustomers()
      .then(setCustomers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Customers</h2>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : customers.length === 0 ? (
        <p className="text-gray-500 text-sm">No customers found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">CPR/CVR</th>
              <th className="py-2 pr-4">Contact Type</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 pr-4">
                  <Link to={`/customers/${c.id}`} className="text-blue-600 hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="py-2 pr-4 font-mono text-xs">{c.cprCvr}</td>
                <td className="py-2 pr-4">{c.contactType}</td>
                <td className="py-2">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
