import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

const statusColors = {
  registered: 'bg-gray-100 text-gray-700',
  processing: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function SignupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [signup, setSignup] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getSignup(id), api.getSignupEvents(id)])
      .then(([s, e]) => {
        setSignup(s);
        setEvents(e);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCancel() {
    if (!signup || !confirm('Cancel this signup?')) return;
    setCancelling(true);
    try {
      await api.cancelSignup(signup.signupNumber);
      // Reload
      const s = await api.getSignup(id);
      setSignup(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <p className="text-gray-500 text-sm">Loading...</p>;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!signup) return <p className="text-gray-500 text-sm">Signup not found.</p>;

  const canCancel = signup.status === 'registered' || signup.status === 'processing';

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/signups" className="text-sm text-blue-600 hover:underline">&larr; Back to signups</Link>
          <h2 className="text-xl font-semibold text-gray-900 mt-1">{signup.signupNumber}</h2>
        </div>
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Cancel Signup'}
          </button>
        )}
      </div>

      {/* Rejection reason */}
      {signup.status === 'rejected' && signup.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded px-4 py-3 mb-6">
          <p className="text-sm font-medium text-red-800">Rejected by DataHub</p>
          <p className="text-sm text-red-700 mt-1">{signup.rejectionReason}</p>
          <Link
            to="/signups/new"
            className="inline-block mt-2 text-sm text-blue-600 hover:underline"
          >
            Create corrected signup &rarr;
          </Link>
        </div>
      )}

      {/* Details grid */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="grid grid-cols-2 divide-y divide-gray-100">
          <Field label="Status">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[signup.status] || ''}`}>
              {signup.status}
            </span>
          </Field>
          <Field label="Type">{signup.type === 'move_in' ? 'Move-in' : 'Supplier switch'}</Field>
          <Field label="GSRN"><span className="font-mono">{signup.gsrn}</span></Field>
          <Field label="Effective date">{signup.effectiveDate}</Field>
          <Field label="DAR ID"><span className="font-mono text-xs">{signup.darId}</span></Field>
          <Field label="Product">{signup.productName}</Field>
          <Field label="Customer">
            <Link to={`/customers/${signup.customerId}`} className="text-blue-600 hover:underline">
              {signup.customerName}
            </Link>
          </Field>
          <Field label="CPR/CVR">{signup.cprCvr}</Field>
          <Field label="Contact type">{signup.contactType}</Field>
          <Field label="Created">{new Date(signup.createdAt).toLocaleString()}</Field>
        </div>
      </div>

      {/* Event timeline */}
      <h3 className="text-sm font-semibold text-gray-700 mt-8 mb-3">Process Timeline</h3>
      {events.length === 0 ? (
        <p className="text-sm text-gray-500">No events yet.</p>
      ) : (
        <div className="space-y-2">
          {events.map((evt, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <div>
                <span className="font-medium text-gray-700">{evt.eventType}</span>
                <span className="text-gray-400 ml-2">{new Date(evt.occurredAt).toLocaleString()}</span>
                {evt.source && <span className="text-gray-400 ml-2">({evt.source})</span>}
                {evt.payload && <p className="text-xs text-gray-500 mt-0.5 font-mono">{evt.payload}</p>}
              </div>
            </div>
          ))}
        </div>
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
