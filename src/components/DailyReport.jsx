import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Award, Printer, Banknote, QrCode, CreditCard } from 'lucide-react';

export default function DailyReport({ settings }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const currency = settings?.currency_symbol || 'Rs.';

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/daily?date=${selectedDate}`);
      const data = await res.json();
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedDate]);

  const summary = report?.summary || {};

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-y-auto text-slate-800">
      {/* Top Controls */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="text-rose-600" /> Day-End Settlement (Z-Report)
          </h2>
          <p className="text-xs text-slate-500">Daily sales reconciliation, payment breakdown, and gross profit calculations</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar size={16} className="text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm text-slate-800 font-bold focus:outline-none"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-all shadow-sm"
          >
            <Printer size={15} /> Print Summary
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Daily Revenue</span>
          <div className="text-2xl font-black text-rose-700 font-mono mt-1">
            {currency} {Number(summary.total_sales || 0).toFixed(2)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">{summary.total_bills || 0} Bills Issued</span>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Estimated Gross Profit</span>
          <div className="text-2xl font-black text-blue-700 font-mono mt-1">
            {currency} {Number(report?.estimated_profit || 0).toFixed(2)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Margin over cost</span>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Cash in Drawer</span>
          <div className="text-2xl font-black text-amber-700 font-mono mt-1">
            {currency} {Number(summary.cash_sales || 0).toFixed(2)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Expected physical cash</span>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Discounts Given</span>
          <div className="text-2xl font-black text-rose-700 font-mono mt-1">
            {currency} {Number(summary.total_discount || 0).toFixed(2)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Customer savings</span>
        </div>
      </div>

      {/* Payment Split & Top Selling Items */}
      <div className="grid grid-cols-2 gap-4">
        {/* Payment Methods Breakdown */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm mb-3 pb-2 border-b border-slate-200">
            Payment Mode Settlement
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2">
                <Banknote className="text-rose-600" size={18} />
                <span className="text-sm font-semibold text-slate-800">Cash Payments</span>
              </div>
              <span className="font-mono font-bold text-slate-900 text-base">
                {currency} {Number(summary.cash_sales || 0).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2">
                <QrCode className="text-blue-600" size={18} />
                <span className="text-sm font-semibold text-slate-800">UPI / QR Code</span>
              </div>
              <span className="font-mono font-bold text-slate-900 text-base">
                {currency} {Number(summary.upi_sales || 0).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2">
                <CreditCard className="text-purple-600" size={18} />
                <span className="text-sm font-semibold text-slate-800">Card Payments</span>
              </div>
              <span className="font-mono font-bold text-slate-900 text-base">
                {currency} {Number(summary.card_sales || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Top 5 Best Selling Items */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm mb-3 pb-2 border-b border-slate-200 flex items-center gap-1.5">
            <Award className="text-amber-500" size={16} /> Top Selling Items Today
          </h3>
          <div className="space-y-2">
            {!report?.top_items || report.top_items.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No items sold yet today.</p>
            ) : (
              report.top_items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded-full text-xs font-bold text-slate-600">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800 truncate max-w-[200px]">{item.product_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-700 font-mono">{currency} {Number(item.total_revenue).toFixed(2)}</span>
                    <span className="text-xs text-slate-500 block font-mono">({item.total_qty} units)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
