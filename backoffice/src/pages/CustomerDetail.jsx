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

  if (loading) return <p className="text-gray-500 text-sm">Loading...</p>;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!customer) return <p className="text-gray-500 text-sm">Customer not found.</p>;

  return (
    <div className="max-w-3xl">
      <Link to="/customers" className="text-sm text-blue-600 hover:underline">&larr; Back to customers</Link>
      <h2 className="text-xl font-semibold text-gray-900 mt-1 mb-6">{customer.name}</h2>

      {/* Customer info */}
      <div className="bg-white border border-gray-200 rounded mb-8">
        <div className="grid grid-cols-2 divide-y divide-gray-100">
          <Field label="CPR/CVR">{customer.cprCvr}</Field>
          <Field label="Contact type">{customer.contactType}</Field>
          <Field label="Status">{customer.status}</Field>
        </div>
      </div>

      {/* Contracts */}
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Contracts</h3>
      {customer.contracts.length === 0 ? (
        <p className="text-sm text-gray-500 mb-8">No contracts.</p>
      ) : (
        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
              <th className="py-2 pr-4">GSRN</th>
              <th className="py-2 pr-4">Billing</th>
              <th className="py-2 pr-4">Payment</th>
              <th className="py-2">Start</th>
            </tr>
          </thead>
          <tbody>
            {customer.contracts.map((c) => (
              <tr key={c.id} className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-xs">{c.gsrn}</td>
                <td className="py-2 pr-4">{c.billingFrequency}</td>
                <td className="py-2 pr-4">{c.paymentModel}</td>
                <td className="py-2">{c.startDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Metering points */}
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Metering Points</h3>
      {customer.meteringPoints.length === 0 ? (
        <p className="text-sm text-gray-500">No metering points.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
              <th className="py-2 pr-4">GSRN</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Settlement</th>
              <th className="py-2 pr-4">Grid Area</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2">Supply</th>
            </tr>
          </thead>
          <tbody>
            {customer.meteringPoints.map((mp) => (
              <tr key={mp.gsrn} className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-xs">{mp.gsrn}</td>
                <td className="py-2 pr-4">{mp.type}</td>
                <td className="py-2 pr-4">{mp.settlementMethod}</td>
                <td className="py-2 pr-4">{mp.gridAreaCode} ({mp.priceArea})</td>
                <td className="py-2 pr-4">{mp.connectionStatus}</td>
                <td className="py-2">
                  {mp.supplyStart
                    ? `${mp.supplyStart}${mp.supplyEnd ? ` \u2013 ${mp.supplyEnd}` : ' \u2013 ongoing'}`
                    : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-xs text-gray-500 uppercase">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5">{children}</dd>
    </div>
  );
}
