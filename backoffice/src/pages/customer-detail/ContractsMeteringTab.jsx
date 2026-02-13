import { useTranslation } from '../../i18n/LanguageContext';

export default function ContractsMeteringTab({ customer }) {
  const { t } = useTranslation();

  const productMap = {};
  if (customer.products) {
    customer.products.forEach(p => { productMap[p.id] = p.name; });
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Contracts */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-teal-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('customerDetail.contracts')}</h3>
          </div>
          <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full">{customer.contracts.length}</span>
        </div>
        {customer.contracts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-400 font-medium">{t('customerDetail.noContracts')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[550px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 py-2.5">{t('customerDetail.colGsrn')}</th>
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 py-2.5">{t('customerDetail.colProduct')}</th>
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 py-2.5">{t('customerDetail.colBilling')}</th>
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 py-2.5">{t('customerDetail.colPayment')}</th>
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 py-2.5">{t('customerDetail.colStart')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customer.contracts.map((c, i) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors animate-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="px-4 py-2.5">
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{c.gsrn}</span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-700 font-medium">{productMap[c.productId] || <span className="text-slate-300">&mdash;</span>}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-600 capitalize">{c.billingFrequency}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-600 capitalize">{c.paymentModel}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-500">{c.startDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Metering Points */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-teal-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('customerDetail.meteringPoints')}</h3>
          </div>
          <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full">{customer.meteringPoints.length}</span>
        </div>
        {customer.meteringPoints.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-400 font-medium">{t('customerDetail.noMeteringPoints')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 py-2.5">{t('customerDetail.colGsrn')}</th>
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 py-2.5">{t('customerDetail.colType')}</th>
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 py-2.5">{t('customerDetail.colSettlement')}</th>
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 py-2.5">{t('customerDetail.colGridArea')}</th>
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 py-2.5">{t('customerDetail.colStatus')}</th>
                  <th className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 py-2.5">{t('customerDetail.colSupplyPeriod')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customer.meteringPoints.map((mp, i) => (
                  <tr key={mp.gsrn} className="hover:bg-slate-50 transition-colors animate-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="px-4 py-2.5">
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{mp.gsrn}</span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-600">{mp.type}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-600">{mp.settlementMethod}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-600">{mp.gridAreaCode} <span className="text-slate-400">({mp.priceArea})</span></td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        mp.connectionStatus === 'connected' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${mp.connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                        {t('status.' + mp.connectionStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-500">
                      {mp.supplyStart
                        ? `${mp.supplyStart}${mp.supplyEnd ? ` – ${mp.supplyEnd}` : ` – ${t('customerDetail.ongoing')}`}`
                        : <span className="text-slate-300">&mdash;</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
