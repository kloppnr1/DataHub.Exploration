import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 border border-slate-700/50 ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

export default function SignupDetail() {
  const { id } = useParams();
  const [signup, setSignup] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getSignup(id), api.getSignupEvents(id)])
      .then(([s, e]) => { setSignup(s); setEvents(e); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCancel() {
    if (!signup || !confirm('Cancel this signup?')) return;
    setCancelling(true);
    try {
      await api.cancelSignup(signup.signupNumber);
      const s = await api.getSignup(id);
      setSignup(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-slate-700 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }
  if (error) return <div className="p-8"><div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div></div>;
  if (!signup) return <div className="p-8"><p className="text-sm text-slate-400">Signup not found.</p></div>;

  const canCancel = signup.status === 'registered' || signup.status === 'processing';

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link to="/signups" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-amber-400 mb-4 transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to signups
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">{signup.signupNumber}</h1>
          <StatusBadge status={signup.status} />
        </div>
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-red-400 text-sm font-medium rounded-lg border border-red-500/20 hover:bg-red-500/10 disabled:opacity-40 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            {cancelling ? 'Cancelling...' : 'Cancel'}
          </button>
        )}
      </div>

      {signup.status === 'rejected' && signup.rejectionReason && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-300">Rejected by DataHub</p>
              <p className="text-sm text-red-400/80 mt-1">{signup.rejectionReason}</p>
              <Link
                to="/signups/new"
                className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
              >
                Create corrected signup
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-slate-700/50 flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-amber-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Details</h3>
        </div>
        <div className="grid grid-cols-2 divide-y divide-slate-700/30">
          <Field label="Type" value={signup.type === 'move_in' ? 'Move-in (BRS-009)' : 'Supplier switch (BRS-001)'} />
          <Field label="Effective Date" value={signup.effectiveDate} />
          <Field label="GSRN" value={<span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">{signup.gsrn}</span>} />
          <Field label="DAR ID" value={<span className="font-mono text-xs text-slate-500">{signup.darId}</span>} />
          <Field label="Product" value={signup.productName} />
          <Field label="Created" value={new Date(signup.createdAt).toLocaleString('da-DK')} />
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-slate-700/50 flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-amber-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Customer</h3>
        </div>
        <div className="grid grid-cols-2 divide-y divide-slate-700/30">
          <Field
            label="Name"
            value={
              <Link to={`/customers/${signup.customerId}`} className="text-amber-400 hover:text-amber-300 transition-colors">
                {signup.customerName}
              </Link>
            }
          />
          <Field label="CPR/CVR" value={<span className="font-mono text-xs text-slate-400">{signup.cprCvr}</span>} />
          <Field label="Contact Type" value={signup.contactType} />
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700/50 flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-amber-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Process Timeline</h3>
        </div>
        {events.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-8 h-8 text-slate-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="text-sm text-slate-500">No events yet</p>
          </div>
        ) : (
          <div className="p-5">
            <div className="relative">
              <div className="absolute left-3 top-2 bottom-2 w-px bg-slate-700/50" />
              <div className="space-y-4">
                {events.map((evt, i) => (
                  <div key={i} className="flex gap-4 relative">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                      i === 0 ? 'bg-amber-500/20 ring-2 ring-amber-500/40' : 'bg-slate-700/50 ring-2 ring-slate-600/40'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-amber-400' : 'bg-slate-500'}`} />
                    </div>
                    <div className="pb-1 -mt-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-slate-200">{evt.eventType}</span>
                        {evt.source && (
                          <span className="text-[11px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{evt.source}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(evt.occurredAt).toLocaleString('da-DK')}
                      </p>
                      {evt.payload && (
                        <pre className="text-xs text-slate-400 bg-slate-900/60 border border-slate-700/40 rounded px-2.5 py-1.5 mt-1.5 overflow-x-auto">{evt.payload}</pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="px-5 py-3">
      <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</dt>
      <dd className="text-sm text-slate-200 mt-1">{value}</dd>
    </div>
  );
}
