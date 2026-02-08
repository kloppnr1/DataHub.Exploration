import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useDawaSearch } from '../hooks/useDawaSearch';

const STEPS = [
  { key: 'address', label: 'Address', desc: 'Look up metering point' },
  { key: 'product', label: 'Product', desc: 'Choose energy product' },
  { key: 'customer', label: 'Customer', desc: 'Customer details' },
  { key: 'confirm', label: 'Confirm', desc: 'Review and submit' },
];

export default function SignupNew() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 0: Address
  const [addressMode, setAddressMode] = useState('search');
  const [addressQuery, setAddressQuery] = useState('');
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [darId, setDarId] = useState('');
  const [meteringPoints, setMeteringPoints] = useState(null);
  const [selectedGsrn, setSelectedGsrn] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const suggestionsRef = useRef(null);

  const { results: addressSuggestions, loading: searchingAddress } = useDawaSearch(addressQuery, {
    enabled: addressMode === 'search' && !selectedAddress,
  });

  useEffect(() => {
    function handleClick(e) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectAddress(suggestion) {
    setSelectedAddress(suggestion);
    setAddressQuery(suggestion.text);
    setDarId(suggestion.darId);
    setShowSuggestions(false);
    lookupGsrn(suggestion.darId);
  }

  function clearAddress() {
    setSelectedAddress(null);
    setAddressQuery('');
    setDarId('');
    setMeteringPoints(null);
    setSelectedGsrn(null);
  }

  async function lookupGsrn(id) {
    setLookingUp(true);
    setError(null);
    setMeteringPoints(null);
    setSelectedGsrn(null);
    try {
      const result = await api.lookupAddress(id);
      setMeteringPoints(result);
      if (result.length === 1) setSelectedGsrn(result[0].gsrn);
    } catch (e) {
      setError(e.message);
    } finally {
      setLookingUp(false);
    }
  }

  // Step 1: Product
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Step 2: Customer
  const [customerName, setCustomerName] = useState('');
  const [cprCvr, setCprCvr] = useState('');
  const [contactType, setContactType] = useState('private');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Step 3: Process
  const [type, setType] = useState('switch');
  const [effectiveDate, setEffectiveDate] = useState('');

  useEffect(() => {
    api.getProducts().then(setProducts).catch(() => {});
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.createSignup({
        dar_id: darId,
        customer_name: customerName,
        cpr_cvr: cprCvr,
        contact_type: contactType,
        email,
        phone,
        product_id: selectedProduct,
        type,
        effective_date: effectiveDate,
      });
      navigate('/signups');
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  const selectedProductObj = products.find((p) => p.id === selectedProduct);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <Link to="/signups" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-amber-400 mb-6 transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to signups
      </Link>

      {/* Page header */}
      <h1 className="text-2xl font-bold text-white tracking-tight mb-6">New Signup</h1>

      {/* Step indicator */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-6">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    i < step
                      ? 'bg-emerald-500 text-white'
                      : i === step
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                      : 'bg-slate-700/50 text-slate-500'
                  }`}
                >
                  {i < step ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className={`text-xs font-medium ${i <= step ? 'text-slate-200' : 'text-slate-500'}`}>
                    {s.label}
                  </p>
                  <p className="text-[11px] text-slate-500">{s.desc}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-4 ${i < step ? 'bg-emerald-500/40' : 'bg-slate-700/50'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Step content card */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">

        {/* Step 0: Address */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white mb-1">Address Lookup</h3>
              <p className="text-sm text-slate-400">Search for an address or enter a DAR ID directly.</p>
            </div>

            <div className="inline-flex bg-slate-900/60 rounded-lg p-0.5 border border-slate-700/50">
              <button
                onClick={() => { setAddressMode('search'); clearAddress(); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  addressMode === 'search' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Search address
              </button>
              <button
                onClick={() => { setAddressMode('dar'); clearAddress(); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  addressMode === 'dar' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                DAR ID
              </button>
            </div>

            {addressMode === 'search' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Address</label>
                <div className="relative" ref={suggestionsRef}>
                  {selectedAddress ? (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" />
                      </svg>
                      <span className="text-sm text-slate-200 flex-1">{selectedAddress.text}</span>
                      <button onClick={clearAddress} className="text-slate-500 hover:text-slate-300">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                        <input
                          type="text"
                          value={addressQuery}
                          onChange={(e) => { setAddressQuery(e.target.value); setShowSuggestions(true); }}
                          onFocus={() => setShowSuggestions(true)}
                          placeholder="Start typing an address, e.g. Vestergade 10, 8000 Aarhus"
                          className="w-full rounded-lg border border-slate-600/50 bg-slate-900/60 pl-9 pr-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                        />
                        {searchingAddress && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-600 border-t-amber-400 rounded-full animate-spin" />
                        )}
                      </div>
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-slate-800 rounded-lg shadow-xl border border-slate-700/50 overflow-hidden">
                          {addressSuggestions.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => selectAddress(s)}
                              className="w-full text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-amber-500/10 hover:text-amber-300 flex items-center gap-2 transition-colors"
                            >
                              <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" />
                              </svg>
                              {s.text}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {selectedAddress && (
                  <p className="text-[11px] text-slate-500 mt-1">DAR ID: {selectedAddress.darId}</p>
                )}
              </div>
            )}

            {addressMode === 'dar' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">DAR ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={darId}
                    onChange={(e) => setDarId(e.target.value)}
                    placeholder="0a3f50a0-75eb-32b8-e044-0003ba298018"
                    className="flex-1 rounded-lg border border-slate-600/50 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                  />
                  <button
                    onClick={() => lookupGsrn(darId)}
                    disabled={!darId || lookingUp}
                    className="px-4 py-2.5 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {lookingUp ? 'Searching...' : 'Look up'}
                  </button>
                </div>
              </div>
            )}

            {lookingUp && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-4 h-4 border-2 border-slate-600 border-t-amber-400 rounded-full animate-spin" />
                Looking up metering points...
              </div>
            )}

            {meteringPoints && meteringPoints.length === 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-sm text-amber-400">
                No metering points found for this address.
              </div>
            )}

            {meteringPoints && meteringPoints.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-300 mb-2">
                  {meteringPoints.length === 1
                    ? 'Metering point found:'
                    : `${meteringPoints.length} metering points \u2014 select one:`}
                </p>
                <div className="space-y-2">
                  {meteringPoints.map((mp) => (
                    <label
                      key={mp.gsrn}
                      className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-all ${
                        selectedGsrn === mp.gsrn
                          ? 'border-amber-500/40 bg-amber-500/10'
                          : 'border-slate-700/50 hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gsrn"
                        checked={selectedGsrn === mp.gsrn}
                        onChange={() => setSelectedGsrn(mp.gsrn)}
                        className="accent-amber-500"
                      />
                      <div>
                        <span className="font-mono text-sm text-slate-200">{mp.gsrn}</span>
                        <span className="ml-3 text-xs text-slate-500">{mp.type} / Grid area {mp.grid_area_code}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => { setError(null); setStep(1); }}
                disabled={!selectedGsrn}
                className="px-5 py-2.5 bg-amber-500 text-slate-950 text-sm font-semibold rounded-lg shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Product */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white mb-1">Select Product</h3>
              <p className="text-sm text-slate-400">Choose the energy product for this customer.</p>
            </div>
            <div className="space-y-2">
              {products.map((p) => (
                <label
                  key={p.id}
                  className={`block border rounded-lg px-4 py-3.5 cursor-pointer transition-all ${
                    selectedProduct === p.id
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="product"
                      checked={selectedProduct === p.id}
                      onChange={() => setSelectedProduct(p.id)}
                      className="accent-amber-500 mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200">{p.name}</span>
                        {p.green_energy && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Green
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 mt-1.5 text-xs text-slate-500">
                        <span>{p.energyModel}</span>
                        <span>{p.margin_ore_per_kwh} ore/kWh margin</span>
                        <span>{p.subscription_kr_per_month} kr/mo</span>
                      </div>
                      {p.description && <p className="text-xs text-slate-500 mt-1">{p.description}</p>}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(0)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Back</button>
              <button
                onClick={() => { setError(null); setStep(2); }}
                disabled={!selectedProduct}
                className="px-5 py-2.5 bg-amber-500 text-slate-950 text-sm font-semibold rounded-lg shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Customer */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white mb-1">Customer Details</h3>
              <p className="text-sm text-slate-400">Enter the customer information.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name</label>
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">CPR/CVR</label>
                <input type="text" value={cprCvr} onChange={(e) => setCprCvr(e.target.value)} placeholder="0101901234"
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Contact type</label>
                <select value={contactType} onChange={(e) => setContactType(e.target.value)}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all">
                  <option value="private">Private</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+4512345678"
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all" />
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Back</button>
              <button
                onClick={() => { setError(null); setStep(3); }}
                disabled={!customerName || !cprCvr || !email}
                className="px-5 py-2.5 bg-amber-500 text-slate-950 text-sm font-semibold rounded-lg shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white mb-1">Review & Submit</h3>
              <p className="text-sm text-slate-400">Choose the process type and confirm all details.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Process type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all">
                  <option value="switch">Supplier switch (BRS-001)</option>
                  <option value="move_in">Move-in (BRS-009)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Effective date</label>
                <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all" />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-700/50">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Summary</p>
              </div>
              <div className="divide-y divide-slate-700/30">
                {selectedAddress && <SummaryRow label="Address" value={selectedAddress.text} />}
                <SummaryRow label="GSRN" value={<span className="font-mono">{selectedGsrn}</span>} />
                <SummaryRow label="Product" value={selectedProductObj?.name} />
                <SummaryRow label="Customer" value={`${customerName} (${cprCvr})`} />
                <SummaryRow label="Contact" value={`${contactType} \u00b7 ${email} \u00b7 ${phone || '\u2014'}`} />
                <SummaryRow label="Type" value={type === 'move_in' ? 'Move-in (BRS-009)' : 'Supplier switch (BRS-001)'} />
                <SummaryRow label="Effective" value={effectiveDate || 'Not set'} highlight={!effectiveDate} />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(2)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Back</button>
              <button
                onClick={handleSubmit}
                disabled={!effectiveDate || submitting}
                className="px-6 py-2.5 bg-amber-500 text-slate-950 text-sm font-bold rounded-lg shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'Create Signup'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, highlight }) {
  return (
    <div className="flex px-4 py-2.5">
      <span className="w-24 text-[11px] font-medium text-slate-500 uppercase shrink-0">{label}</span>
      <span className={`text-sm ${highlight ? 'text-amber-400 italic' : 'text-slate-300'}`}>{value}</span>
    </div>
  );
}
