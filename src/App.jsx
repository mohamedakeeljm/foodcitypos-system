import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Package, BarChart3, Settings, 
  Printer, Clock, Sun, Moon
} from 'lucide-react';
import FastBilling from './components/FastBilling.jsx';
import InventoryManager from './components/InventoryManager.jsx';
import DailyReport from './components/DailyReport.jsx';
import StoreSettings from './components/StoreSettings.jsx';
import ThermalReceipt from './components/ThermalReceipt.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('billing'); // 'billing', 'inventory', 'reports', 'settings'
  const [settings, setSettings] = useState(null);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  
  // Dark/Light Theme state (persisted in localStorage)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('pos_theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pos_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pos_theme', 'light');
    }
  }, [darkMode]);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleInvoiceComplete = (sale) => {
    setLastInvoice(sale);
    setReceiptModalOpen(true);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-200 ${
      darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Top Main Navigation Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between flex-shrink-0 z-30 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center font-black text-white shadow-md shadow-rose-600/20 text-lg">
            FC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                {settings?.store_name || 'FOOD CITY'}
              </h1>
              <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-300 dark:border-rose-700">
                POS EXPRESS
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Single Counter • Offline Desktop Edition</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'billing'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <ShoppingCart size={16} />
            <span>Billing Counter</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'inventory'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Package size={16} />
            <span>Stock / Items</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'reports'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 size={16} />
            <span>Daily Report (Z-Report)</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Settings size={16} />
            <span>Store Settings</span>
          </button>
        </div>

        {/* Top Right Controls: Theme Toggle & Live Clock */}
        <div className="flex items-center gap-3 text-xs">
          {/* DARK / LIGHT MODE SWITCH BUTTON */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              darkMode 
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="Toggle Dark / Light Mode"
          >
            {darkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-600" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-mono font-bold shadow-sm">
            <Clock size={15} className="text-rose-600 dark:text-rose-400" />
            <span>{currentTime}</span>
          </div>

          <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 font-bold shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span>Counter 01</span>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 overflow-hidden p-3 bg-slate-100 dark:bg-slate-950">
        {activeTab === 'billing' && (
          <FastBilling settings={settings} onInvoiceComplete={handleInvoiceComplete} />
        )}
        {activeTab === 'inventory' && <InventoryManager settings={settings} />}
        {activeTab === 'reports' && <DailyReport settings={settings} />}
        {activeTab === 'settings' && <StoreSettings settings={settings} onSettingsUpdated={loadSettings} />}
      </main>

      {/* RECEIPT PREVIEW / THERMAL PRINT MODAL */}
      {receiptModalOpen && lastInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Printer size={16} className="text-rose-600 dark:text-rose-400" /> Thermal Receipt Preview
              </span>
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950">
              <ThermalReceipt invoice={lastInvoice} settings={settings} />
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                Close (Esc)
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30 transition-all"
              >
                <Printer size={15} /> Reprint Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print container for thermal printer */}
      <div className="hidden print:block">
        <ThermalReceipt invoice={lastInvoice} settings={settings} />
      </div>
    </div>
  );
}
