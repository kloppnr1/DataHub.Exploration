import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useTranslation } from '../../i18n/LanguageContext';

export default function LedgerTab({ customerId }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getCustomerLedger(customerId)
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [customerId]);

  const typeBadge = (type) => {
    if (type === 'invoice' || type === 'debit') return 'bg-rose-50 text-rose-700';
    if (type === 'payment' || type === 'credit') return 'bg-emerald-50 text-emerald-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
      {error && <div className="p-4 bg-rose-50 border-b border-rose-100 text-rose-700 text-sm">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{t('customerDetail.ledgerColDate')}</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{t('customerDetail.ledgerColType')}</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{t('customerDetail.ledgerColReference')}</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{t('customerDetail.ledgerColDebit')}</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{t('customerDetail.ledgerColCredit')}</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{t('customerDetail.ledgerColBalance')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && !entries ? (
              <tr><td colSpan="6" className="px-4 py-12 text-center text-slate-500">{t('common.loading')}</td></tr>
            ) : !entries || (Array.isArray(entries) && entries.length === 0) ? (
              <tr><td colSpan="6" className="px-4 py-12 text-center text-slate-500">{t('customerDetail.noLedger')}</td></tr>
            ) : (
              (Array.isArray(entries) ? entries : entries.items || []).map((e, i) => {
                const linkTo = e.entryType === 'invoice' ? `/invoices/${e.referenceId}` :
                               e.entryType === 'payment' ? `/payments/${e.referenceId}` : null;
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-slate-600">
                      {e.date ? new Date(e.date).toLocaleDateString() : e.createdAt ? new Date(e.createdAt).toLocaleDateString() : <span className="text-slate-300">&mdash;</span>}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${typeBadge(e.entryType)}`}>
                        {e.entryType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {linkTo ? (
                        <Link to={linkTo} className="text-sm text-teal-600 font-medium hover:text-teal-700">
                          {e.description || e.referenceId?.slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-600">{e.description || <span className="text-slate-300">&mdash;</span>}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm tabular-nums text-rose-600 font-medium">
                      {e.debit ? e.debit.toFixed(2) : ''}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm tabular-nums text-emerald-600 font-medium">
                      {e.credit ? e.credit.toFixed(2) : ''}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm tabular-nums font-bold text-slate-900">
                      {e.runningBalance != null ? e.runningBalance.toFixed(2) : ''}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
