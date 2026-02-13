import { useState, useEffect } from 'react';
import { api } from '../../api';
import { useTranslation } from '../../i18n/LanguageContext';

export default function OverviewTab({ customer, customerId }) {
  const { t } = useTranslation();
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  useEffect(() => {
    api.getCustomerBalance(customerId)
      .then(setBalance)
      .catch(() => {})
      .finally(() => setBalanceLoading(false));
  }, [customerId]);

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Financial snapshot */}
      {balanceLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-24 mb-2" />
              <div className="h-8 bg-slate-100 rounded w-32" />
            </div>
          ))}
        </div>
      ) : balance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-white to-teal-50/30 rounded-xl p-5 shadow-sm border border-teal-100/50">
            <div className="text-sm font-medium text-teal-600 mb-1">{t('customerDetail.totalInvoiced')}</div>
            <div className="text-3xl font-bold text-teal-700">{(balance.totalInvoiced ?? 0).toFixed(2)} <span className="text-base font-medium">DKK</span></div>
            <div className="text-xs text-teal-500 mt-1">{balance.invoiceCount ?? 0} {t('customerDetail.invoicesCount')}</div>
          </div>
          <div className="bg-gradient-to-br from-white to-emerald-50/30 rounded-xl p-5 shadow-sm border border-emerald-100/50">
            <div className="text-sm font-medium text-emerald-600 mb-1">{t('customerDetail.totalPaid')}</div>
            <div className="text-3xl font-bold text-emerald-700">{(balance.totalPaid ?? 0).toFixed(2)} <span className="text-base font-medium">DKK</span></div>
          </div>
          <div className={`bg-gradient-to-br rounded-xl p-5 shadow-sm border ${
            (balance.outstanding ?? 0) > 0
              ? 'from-white to-amber-50/30 border-amber-100/50'
              : 'from-white to-slate-50 border-slate-100'
          }`}>
            <div className={`text-sm font-medium mb-1 ${(balance.outstanding ?? 0) > 0 ? 'text-amber-600' : 'text-slate-500'}`}>{t('customerDetail.outstanding')}</div>
            <div className={`text-3xl font-bold ${(balance.outstanding ?? 0) > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{(balance.outstanding ?? 0).toFixed(2)} <span className="text-base font-medium">DKK</span></div>
          </div>
          <div className={`bg-gradient-to-br rounded-xl p-5 shadow-sm border ${
            (balance.overdue ?? 0) > 0
              ? 'from-white to-rose-50/30 border-rose-100/50'
              : 'from-white to-slate-50 border-slate-100'
          }`}>
            <div className={`text-sm font-medium mb-1 ${(balance.overdue ?? 0) > 0 ? 'text-rose-600' : 'text-slate-500'}`}>{t('customerDetail.overdue')}</div>
            <div className={`text-3xl font-bold ${(balance.overdue ?? 0) > 0 ? 'text-rose-700' : 'text-slate-700'}`}>{(balance.overdue ?? 0).toFixed(2)} <span className="text-base font-medium">DKK</span></div>
            {(balance.overdueCount ?? 0) > 0 && (
              <div className="text-xs text-rose-500 mt-1">{balance.overdueCount} {t('customerDetail.overdueInvoices')}</div>
            )}
          </div>
        </div>
      )}

      {/* Billing address */}
      {customer.billingAddress && (customer.billingAddress.street || customer.billingAddress.postalCode) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-teal-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('customerDetail.billingAddress')}</h3>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-slate-700 font-medium">
              {[customer.billingAddress.street, customer.billingAddress.houseNumber].filter(Boolean).join(' ')}
              {(customer.billingAddress.floor || customer.billingAddress.door) && (
                <span className="text-slate-400">, {[customer.billingAddress.floor && `${customer.billingAddress.floor}.`, customer.billingAddress.door].filter(Boolean).join(' ')}</span>
              )}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              {[customer.billingAddress.postalCode, customer.billingAddress.city].filter(Boolean).join(' ')}
            </p>
          </div>
        </div>
      )}

      {/* Payers */}
      {customer.payers && customer.payers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-teal-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('customerDetail.payers')}</h3>
            </div>
            <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full">{customer.payers.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 py-2.5">{t('customerDetail.colName')}</th>
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 py-2.5">{t('customerDetail.colCprCvr')}</th>
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 py-2.5">{t('customerDetail.colContactType')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customer.payers.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 text-sm text-slate-700 font-medium">{p.name}</td>
                    <td className="px-4 py-2.5"><span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{p.cprCvr}</span></td>
                    <td className="px-4 py-2.5 text-sm text-slate-600 capitalize">{p.contactType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
