import React, { useState, useEffect } from 'react';
import { Store, Save, Check } from 'lucide-react';

export default function StoreSettings({ settings, onSettingsUpdated }) {
  const [formData, setFormData] = useState({
    store_name: '',
    store_address: '',
    store_phone: '',
    store_gstin: '',
    currency_symbol: 'Rs.',
    receipt_footer: 'Thank You! Visit Again.',
    receipt_printer_width: '80mm'
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({ ...prev, ...settings }));
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSaved(true);
        if (onSettingsUpdated) onSettingsUpdated();
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (e) {
      alert('Error updating settings');
    }
  };

  return (
    <div className="max-w-2xl mx-auto h-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-y-auto text-slate-800">
      <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-200">
        <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
          <Store size={26} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Supermarket & Receipt Configuration</h2>
          <p className="text-xs text-slate-500">These details will appear on all printed thermal receipts.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Supermarket / Store Name</label>
          <input
            type="text"
            required
            value={formData.store_name}
            onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-rose-500 focus:bg-white"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Store Address</label>
          <input
            type="text"
            value={formData.store_address}
            onChange={(e) => setFormData({ ...formData, store_address: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
            <input
              type="text"
              value={formData.store_phone}
              onChange={(e) => setFormData({ ...formData, store_phone: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">VAT / Tax Registration No</label>
            <input
              type="text"
              value={formData.store_gstin}
              onChange={(e) => setFormData({ ...formData, store_gstin: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Currency Symbol</label>
            <input
              type="text"
              value={formData.currency_symbol}
              onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-rose-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Thermal Printer Width</label>
            <select
              value={formData.receipt_printer_width}
              onChange={(e) => setFormData({ ...formData, receipt_printer_width: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white"
            >
              <option value="80mm">80mm (Standard Supermarket Printer)</option>
              <option value="58mm">58mm (Small Thermal Printer)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Receipt Footer Message</label>
          <input
            type="text"
            value={formData.receipt_footer}
            onChange={(e) => setFormData({ ...formData, receipt_footer: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-rose-600/30 transition-all"
          >
            {saved ? <Check size={18} /> : <Save size={18} />}
            <span>{saved ? 'Settings Saved Successfully!' : 'Save Store Details'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
