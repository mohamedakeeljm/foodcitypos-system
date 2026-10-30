import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, AlertTriangle, Package, RefreshCw } from 'lucide-react';

export default function InventoryManager({ settings }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const currency = settings?.currency_symbol || 'Rs.';

  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    category_id: '',
    unit: 'pcs',
    purchase_price: '',
    mrp: '',
    selling_price: '',
    tax_percent: '0',
    stock_qty: '',
    min_stock_alert: '10',
    expiry_date: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const catRes = await fetch('/api/categories');
      setCategories(await catRes.json());

      let url = `/api/products?search=${encodeURIComponent(search)}`;
      if (filterLowStock) url += '&lowStock=true';
      const prodRes = await fetch(url);
      setProducts(await prodRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, filterLowStock]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      barcode: String(Date.now()).slice(-8),
      name: '',
      category_id: categories[0]?.id || '',
      unit: 'pcs',
      purchase_price: '',
      mrp: '',
      selling_price: '',
      tax_percent: '0',
      stock_qty: '50',
      min_stock_alert: '10',
      expiry_date: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setFormData({
      barcode: p.barcode,
      name: p.name,
      category_id: p.category_id || '',
      unit: p.unit || 'pcs',
      purchase_price: p.purchase_price,
      mrp: p.mrp,
      selling_price: p.selling_price,
      tax_percent: p.tax_percent,
      stock_qty: p.stock_qty,
      min_stock_alert: p.min_stock_alert,
      expiry_date: p.expiry_date || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setModalOpen(false);
        loadData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (e) {
      alert('Error saving product');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      loadData();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-hidden text-slate-800">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative w-80">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by barcode or name..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
            <input
              type="checkbox"
              checked={filterLowStock}
              onChange={(e) => setFilterLowStock(e.target.checked)}
              className="rounded text-rose-600 focus:ring-0"
            />
            <span className="flex items-center gap-1 text-amber-700">
              <AlertTriangle size={14} /> Low Stock Only
            </span>
          </label>

          <button
            onClick={loadData}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <button
          onClick={openAddModal}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all"
        >
          <Plus size={18} />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs font-bold text-slate-600 border-b border-slate-200 sticky top-0">
              <th className="p-3">BARCODE</th>
              <th className="p-3">PRODUCT NAME</th>
              <th className="p-3">CATEGORY</th>
              <th className="p-3 text-right">COST PRICE</th>
              <th className="p-3 text-right">MRP</th>
              <th className="p-3 text-right">SELL PRICE</th>
              <th className="p-3 text-center">STOCK</th>
              <th className="p-3 text-center">EXPIRY</th>
              <th className="p-3 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-12 text-slate-400">
                  <Package size={36} className="mx-auto mb-2 stroke-1 text-slate-300" />
                  No products found. Click "Add New Product" to stock items.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const isLow = p.stock_qty <= p.min_stock_alert;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono text-xs text-slate-700 font-semibold">{p.barcode}</td>
                    <td className="p-3 font-bold text-slate-900">{p.name}</td>
                    <td className="p-3 text-xs text-slate-500">{p.category_name || '-'}</td>
                    <td className="p-3 text-right font-mono text-slate-500">{currency}{Number(p.purchase_price).toFixed(2)}</td>
                    <td className="p-3 text-right font-mono text-slate-400 line-through">{currency}{Number(p.mrp).toFixed(2)}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-700">{currency}{Number(p.selling_price).toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        isLow ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isLow && <AlertTriangle size={12} />}
                        {p.stock_qty} {p.unit}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-xs text-slate-500">
                      {p.expiry_date || '-'}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(p)}
                        className="text-slate-400 hover:text-blue-600 p-1"
                        title="Edit Product"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete Product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Product Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Supermarket Item'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Barcode (EAN/UPC)</label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-rose-800 font-bold focus:outline-none focus:border-rose-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anchor Milk Powder 400g"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Purchase Cost</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">MRP Price</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-rose-800 block mb-1">Selling Price *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-rose-500 rounded-xl px-3 py-2 text-sm font-mono font-bold text-rose-800 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Initial Stock Qty</label>
                  <input
                    type="number"
                    value={formData.stock_qty}
                    onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Low Stock Alert</label>
                  <input
                    type="number"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="pkt">Packet (pkt)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="ltr">Liter (ltr)</option>
                    <option value="btl">Bottle (btl)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md shadow-rose-600/30"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
