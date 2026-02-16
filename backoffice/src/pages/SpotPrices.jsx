import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useTranslation } from '../i18n/LanguageContext';
import WattzonLoader from '../components/WattzonLoader';

function StatusIndicator({ status, t, lang }) {
  if (!status || !status.latestDate) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-500">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        {t('spotPrices.monitor.noData')}
      </div>
    );
  }

  const statusConfig = {
    ok: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    warning: { dot: 'bg-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    alert: { dot: 'bg-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
  };

  const cfg = statusConfig[status.status] || statusConfig.warning;
  const lastFetch = status.lastFetchedAt
    ? new Date(status.lastFetchedAt).toLocaleString(lang === 'da' ? 'da-DK' : 'en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className={`flex items-center gap-4 px-4 py-2.5 ${cfg.bg} rounded-lg border ${cfg.border} text-sm`}>
      <span className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${cfg.dot} ${status.status !== 'ok' ? 'animate-pulse' : ''}`} />
        <span className={`font-medium ${cfg.text}`}>
          {t(`spotPrices.monitor.dataThrough`, { date: status.latestDate })}
        </span>
      </span>
      {status.status !== 'ok' && (
        <>
          <span className="text-slate-400">|</span>
          <span className={cfg.text}>
            {status.hasTomorrow
              ? t('spotPrices.monitor.tomorrowAvailable')
              : t('spotPrices.monitor.tomorrowMissing')}
          </span>
        </>
      )}
      <span className="text-slate-400">|</span>
      <span className="text-slate-500">
        {t('spotPrices.monitor.lastFetch')}: {lastFetch}
      </span>
    </div>
  );
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function SpotPrices() {
  const { t, lang } = useTranslation();
  const [date, setDate] = useState(null); // null = let backend pick latest
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(() => {
    setError(null);
    setLoading(true);
    Promise.all([
      api.getSpotPrices({ date: date ?? undefined }),
      api.getSpotPriceStatus(),
    ])
      .then(([prices, st]) => {
        setData(prices);
        setStatus(st);
        // If we loaded without a date, store what the backend returned
        if (!date && prices.date) setDate(prices.date);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const goDay = (offset) => {
    if (date) setDate(addDays(date, offset));
  };

  const goToday = () => setDate(null);

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;

  const displayDate = data?.date ?? date;
  const formattedDate = displayDate
    ? new Date(displayDate + 'T00:00:00').toLocaleDateString(lang === 'da' ? 'da-DK' : 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  if (loading && !data) {
    return <WattzonLoader message={t('spotPrices.loading')} />;
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto relative">
      {/* Loading progress bar */}
      {loading && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-teal-100 overflow-hidden rounded-full z-10">
          <div className="h-full bg-teal-500 rounded-full animate-progress-bar" />
        </div>
      )}

      {/* Page header */}
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{t('spotPrices.title')}</h1>
        <p className="text-base text-slate-500 mt-1">{t('spotPrices.subtitle')}</p>
      </div>

      {/* Status indicator */}
      <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '40ms' }}>
        <StatusIndicator status={status} t={t} lang={lang} />
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
        <button
          onClick={() => goDay(-1)}
          className="px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          &larr; {t('common.previous')}
        </button>
        <div className="text-lg font-semibold text-slate-900">{formattedDate}</div>
        <button
          onClick={() => goDay(1)}
          className="px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          {t('common.next')} &rarr;
        </button>
        <button
          onClick={goToday}
          className="px-3 py-2 text-sm font-medium text-teal-600 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
        >
          {t('spotPrices.latest')}
        </button>
      </div>

      {/* Stats cards — DK1 and DK2 side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-in-up" style={{ animationDelay: '90ms' }}>
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="text-sm font-medium text-slate-500 mb-1">{t('spotPrices.totalPrices')}</div>
          <div className="text-3xl font-bold text-slate-900">{totalCount.toLocaleString(lang === 'da' ? 'da-DK' : 'en')}</div>
        </div>
        <div className="bg-gradient-to-br from-white to-teal-50/30 rounded-xl p-5 shadow-sm border border-teal-100/50">
          <div className="text-sm font-medium text-teal-600 mb-1">{t('spotPrices.avgPrice')}</div>
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-bold text-teal-700">DK1: {(data?.avgPriceDk1 ?? 0).toFixed(2)}</span>
            <span className="text-xl font-bold text-teal-600">DK2: {(data?.avgPriceDk2 ?? 0).toFixed(2)}</span>
          </div>
          <div className="text-xs text-teal-500 mt-0.5">{t('spotPrices.unit')}</div>
        </div>
        <div className="bg-gradient-to-br from-white to-emerald-50/30 rounded-xl p-5 shadow-sm border border-emerald-100/50">
          <div className="text-sm font-medium text-emerald-600 mb-1">{t('spotPrices.minPrice')}</div>
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-bold text-emerald-700">DK1: {(data?.minPriceDk1 ?? 0).toFixed(2)}</span>
            <span className="text-xl font-bold text-emerald-600">DK2: {(data?.minPriceDk2 ?? 0).toFixed(2)}</span>
          </div>
          <div className="text-xs text-emerald-500 mt-0.5">{t('spotPrices.unit')}</div>
        </div>
        <div className="bg-gradient-to-br from-white to-rose-50/30 rounded-xl p-5 shadow-sm border border-rose-100/50">
          <div className="text-sm font-medium text-rose-600 mb-1">{t('spotPrices.maxPrice')}</div>
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-bold text-rose-700">DK1: {(data?.maxPriceDk1 ?? 0).toFixed(2)}</span>
            <span className="text-xl font-bold text-rose-600">DK2: {(data?.maxPriceDk2 ?? 0).toFixed(2)}</span>
          </div>
          <div className="text-xs text-rose-500 mt-0.5">{t('spotPrices.unit')}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '150ms' }}>
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 text-rose-700 text-sm">
            {t('common.error')}: {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{t('spotPrices.colTimestamp')}</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{t('spotPrices.colHour')}</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-600 uppercase tracking-wider">DK1 ({t('spotPrices.unit')})</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-600 uppercase tracking-wider">DK2 ({t('spotPrices.unit')})</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{t('spotPrices.colResolution')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr className="bg-slate-50 border-b border-slate-200">
                  <td colSpan="5" className="px-4 py-12 text-center text-slate-500">
                    {t('spotPrices.noPrices')}
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const ts = new Date(item.timestamp);
                  const timeStr = ts.toLocaleTimeString(lang === 'da' ? 'da-DK' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <tr key={item.timestamp} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm font-mono text-slate-600">
                        {ts.toISOString().slice(0, 16).replace('T', ' ')}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-slate-700">{timeStr}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-right font-semibold text-slate-900">
                        {item.priceDk1 != null ? item.priceDk1.toFixed(4) : '—'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-right font-semibold text-slate-900">
                        {item.priceDk2 != null ? item.priceDk2.toFixed(4) : '—'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full ${
                          item.resolution === 'PT15M'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.resolution === 'PT15M' ? '15 min' : '1 hour'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              {t('common.totalItems', { count: totalCount, label: t('spotPrices.showingPrices') })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
