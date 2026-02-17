import { useState, useEffect } from 'react';
import { api } from '../api';
import { useTranslation } from '../i18n/LanguageContext';

export default function Simulator() {
  const { t } = useTranslation();

  // ── Correction state ──
  const [gsrn, setGsrn] = useState('571313100000012345');
  const [date, setDate] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // ── Offboarding state ──
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedGsrn, setSelectedGsrn] = useState('');
  const [processType, setProcessType] = useState('supplier_switch');
  const [offboardDate, setOffboardDate] = useState('');
  const [offboardSending, setOffboardSending] = useState(false);
  const [offboardResult, setOffboardResult] = useState(null);
  const [offboardError, setOffboardError] = useState(null);

  useEffect(() => {
    api.getSimulatorCustomers().then(setCustomers).catch(() => {});
  }, []);

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
  const meteringPoints = selectedCustomerData?.meteringPoints ?? [];

  // Auto-select first metering point when customer changes
  useEffect(() => {
    if (meteringPoints.length > 0 && !meteringPoints.find(mp => mp.gsrn === selectedGsrn)) {
      setSelectedGsrn(meteringPoints[0].gsrn);
    }
  }, [selectedCustomer, meteringPoints]);

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const res = await api.triggerCorrectionData({ gsrn, date });
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleOffboardSubmit = async (e) => {
    e.preventDefault();
    setOffboardSending(true);
    setOffboardResult(null);
    setOffboardError(null);
    try {
      const res = await api.triggerOffboard({
        gsrn: selectedGsrn,
        processType,
        effectiveDate: offboardDate,
      });
      setOffboardResult(res);
    } catch (err) {
      setOffboardError(err.message);
    } finally {
      setOffboardSending(false);
    }
  };

  const processTypes = [
    { value: 'supplier_switch', labelKey: 'simulator.offboard.typeSupplierSwitch' },
    { value: 'other_supplier', labelKey: 'simulator.offboard.typeOtherSupplier' },
    { value: 'move_out', labelKey: 'simulator.offboard.typeMoveOut' },
    { value: 'end_of_supply', labelKey: 'simulator.offboard.typeEndOfSupply' },
    { value: 'forced_transfer', labelKey: 'simulator.offboard.typeForcedTransfer' },
  ];

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500';
  const btnClass = 'px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t('simulator.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('simulator.subtitle')}</p>
      </div>

      {/* Offboarding Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-6 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">{t('simulator.offboard.title')}</h2>
        <p className="text-sm text-slate-500 mb-5">{t('simulator.offboard.desc')}</p>

        <form onSubmit={handleOffboardSubmit} className="space-y-4">
          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('simulator.offboard.customer')}</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">{t('simulator.offboard.selectCustomer')}</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.meteringPoints.length} {t('simulator.offboard.meteringPoints')})</option>
              ))}
            </select>
          </div>

          {/* Metering Point */}
          {meteringPoints.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('simulator.offboard.meteringPoint')}</label>
              <select
                value={selectedGsrn}
                onChange={(e) => setSelectedGsrn(e.target.value)}
                className={inputClass}
                required
              >
                {meteringPoints.map(mp => (
                  <option key={mp.gsrn} value={mp.gsrn}>{mp.gsrn} ({mp.gridArea})</option>
                ))}
              </select>
            </div>
          )}

          {/* Process Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('simulator.offboard.processType')}</label>
            <select
              value={processType}
              onChange={(e) => setProcessType(e.target.value)}
              className={inputClass}
            >
              {processTypes.map(pt => (
                <option key={pt.value} value={pt.value}>{t(pt.labelKey)}</option>
              ))}
            </select>
          </div>

          {/* Effective Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('simulator.offboard.effectiveDate')}</label>
            <input
              type="date"
              value={offboardDate}
              onChange={(e) => setOffboardDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <button type="submit" disabled={offboardSending || !selectedGsrn} className={btnClass}>
            {offboardSending ? t('simulator.sending') : t('simulator.offboard.sendButton')}
          </button>
        </form>

        {/* Feedback */}
        {offboardResult && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            {t('simulator.offboard.success')} — GSRN: {offboardResult.gsrn}, {t('simulator.offboard.reasonCode')}: {offboardResult.reasonCode}
          </div>
        )}
        {offboardError && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {t('common.error')}: {offboardError}
          </div>
        )}

        <p className="mt-5 text-xs text-slate-400 leading-relaxed">
          {t('simulator.offboard.explanation')}
        </p>
      </div>

      {/* Correction Data Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">{t('simulator.correctionTitle')}</h2>
        <p className="text-sm text-slate-500 mb-5">{t('simulator.correctionDesc')}</p>

        <form onSubmit={handleCorrectionSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('simulator.gsrn')}</label>
            <input
              type="text"
              value={gsrn}
              onChange={(e) => setGsrn(e.target.value)}
              className={inputClass}
              placeholder="571313100000012345"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('simulator.date')}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <button type="submit" disabled={sending} className={btnClass}>
            {sending ? t('simulator.sending') : t('simulator.sendButton')}
          </button>
        </form>

        {result && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
            {t('simulator.success')} — GSRN: {result.gsrn}, {t('simulator.date')}: {result.date}
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {t('common.error')}: {error}
          </div>
        )}

        <p className="mt-5 text-xs text-slate-400 leading-relaxed">
          {t('simulator.explanation')}
        </p>
      </div>
    </div>
  );
}
