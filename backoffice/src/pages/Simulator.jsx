import { useState } from 'react';
import { api } from '../api';
import { useTranslation } from '../i18n/LanguageContext';

export default function Simulator() {
  const { t } = useTranslation();
  const [gsrn, setGsrn] = useState('571313100000012345');
  const [date, setDate] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
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

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t('simulator.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('simulator.subtitle')}</p>
      </div>

      {/* Correction Data Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">{t('simulator.correctionTitle')}</h2>
        <p className="text-sm text-slate-500 mb-5">{t('simulator.correctionDesc')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('simulator.gsrn')}</label>
            <input
              type="text"
              value={gsrn}
              onChange={(e) => setGsrn(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
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
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? t('simulator.sending') : t('simulator.sendButton')}
          </button>
        </form>

        {/* Feedback */}
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

        {/* Explanation */}
        <p className="mt-5 text-xs text-slate-400 leading-relaxed">
          {t('simulator.explanation')}
        </p>
      </div>
    </div>
  );
}
