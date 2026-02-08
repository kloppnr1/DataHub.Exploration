import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function SignupNew() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Address
  const [darId, setDarId] = useState('');
  const [meteringPoints, setMeteringPoints] = useState(null);
  const [selectedGsrn, setSelectedGsrn] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);

  // Step 2: Product
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Step 3: Customer
  const [customerName, setCustomerName] = useState('');
  const [cprCvr, setCprCvr] = useState('');
  const [contactType, setContactType] = useState('private');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Step 4: Process
  const [type, setType] = useState('switch');
  const [effectiveDate, setEffectiveDate] = useState('');

  useEffect(() => {
    api.getProducts().then(setProducts).catch(() => {});
  }, []);

  async function lookupAddress() {
    setLookingUp(true);
    setError(null);
    setMeteringPoints(null);
    try {
      const result = await api.lookupAddress(darId);
      setMeteringPoints(result);
      if (result.length === 1) {
        setSelectedGsrn(result[0].gsrn);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLookingUp(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await api.createSignup({
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
      navigate(`/signups`);
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">New Signup</h2>

      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {['Address', 'Product', 'Customer', 'Process'].map((label, i) => (
          <div
            key={label}
            className={`flex items-center gap-1.5 text-xs font-medium ${
              step === i + 1 ? 'text-blue-600' : step > i + 1 ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${
              step === i + 1 ? 'bg-blue-600' : step > i + 1 ? 'bg-green-500' : 'bg-gray-300'
            }`}>
              {step > i + 1 ? '\u2713' : i + 1}
            </span>
            {label}
          </div>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

      {/* Step 1: Address lookup */}
      {step === 1 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">DAR ID (address identifier)</span>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={darId}
                onChange={(e) => setDarId(e.target.value)}
                placeholder="0a3f50a0-75eb-32b8-e044-0003ba298018"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={lookupAddress}
                disabled={!darId || lookingUp}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {lookingUp ? 'Looking up...' : 'Look up'}
              </button>
            </div>
          </label>

          {meteringPoints && meteringPoints.length === 0 && (
            <p className="text-sm text-red-600">No metering points found for this address.</p>
          )}

          {meteringPoints && meteringPoints.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {meteringPoints.length === 1
                  ? 'Metering point found:'
                  : `${meteringPoints.length} metering points found — select one:`}
              </p>
              <div className="space-y-2">
                {meteringPoints.map((mp) => (
                  <label
                    key={mp.gsrn}
                    className={`flex items-center gap-3 border rounded px-3 py-2 cursor-pointer ${
                      selectedGsrn === mp.gsrn ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gsrn"
                      checked={selectedGsrn === mp.gsrn}
                      onChange={() => setSelectedGsrn(mp.gsrn)}
                    />
                    <span className="font-mono text-sm">{mp.gsrn}</span>
                    <span className="text-xs text-gray-500">{mp.type} / {mp.grid_area_code}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedGsrn}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Product selection */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700">Select a product:</p>
          <div className="space-y-2">
            {products.map((p) => (
              <label
                key={p.id}
                className={`block border rounded px-4 py-3 cursor-pointer ${
                  selectedProduct === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="product"
                    checked={selectedProduct === p.id}
                    onChange={() => setSelectedProduct(p.id)}
                  />
                  <div>
                    <span className="font-medium text-sm">{p.name}</span>
                    {p.green_energy && <span className="ml-2 text-xs text-green-600 font-medium">Green</span>}
                    <div className="text-xs text-gray-500 mt-0.5">
                      {p.energyModel} &middot; margin {p.margin_ore_per_kwh} ore/kWh &middot; {p.subscription_kr_per_month} kr/month
                    </div>
                    {p.description && <p className="text-xs text-gray-400 mt-1">{p.description}</p>}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Back</button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedProduct}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Customer details */}
      {step === 3 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Customer name</span>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">CPR/CVR</span>
            <input
              type="text"
              value={cprCvr}
              onChange={(e) => setCprCvr(e.target.value)}
              placeholder="0101901234"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Contact type</span>
            <select
              value={contactType}
              onChange={(e) => setContactType(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="private">Private</option>
              <option value="business">Business</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+4512345678"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Back</button>
            <button
              onClick={() => setStep(4)}
              disabled={!customerName || !cprCvr || !email}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Process type and effective date */}
      {step === 4 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="switch">Supplier switch (BRS-001, 15 business days notice)</option>
              <option value="move_in">Move-in (BRS-009, immediate)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Effective date</span>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          {/* Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded p-4 text-sm space-y-1">
            <p className="font-medium text-gray-700 mb-2">Summary</p>
            <p>GSRN: <span className="font-mono">{selectedGsrn}</span></p>
            <p>Product: {products.find((p) => p.id === selectedProduct)?.name}</p>
            <p>Customer: {customerName} ({cprCvr})</p>
            <p>Type: {type === 'move_in' ? 'Move-in' : 'Supplier switch'}</p>
            <p>Effective: {effectiveDate || '(not set)'}</p>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Back</button>
            <button
              onClick={handleSubmit}
              disabled={!effectiveDate || submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Create Signup'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
