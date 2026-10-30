import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, Search, Plus, Trash2, ShoppingCart, 
  CreditCard, Banknote, QrCode, PauseCircle, PlayCircle, 
  Printer, CheckCircle2, AlertTriangle, Sparkles
} from 'lucide-react';

export default function FastBilling({ settings, onInvoiceComplete }) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [categoryProducts, setCategoryProducts] = useState([]);
  
  // Quantity Prompt Modal
  const [qtyModalOpen, setQtyModalOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [inputQty, setInputQty] = useState('1');
  const [askQtyAlways, setAskQtyAlways] = useState(true);
  const qtyInputRef = useRef(null);

  // Checkout & Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, UPI, CARD
  const [cashTendered, setCashTendered] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  
  // Parked Bills
  const [heldBills, setHeldBills] = useState([]);
  const [heldBillsModalOpen, setHeldBillsModalOpen] = useState(false);
  const [notification, setNotification] = useState({ text: '', type: '' });

  const barcodeInputRef = useRef(null);
  const cashInputRef = useRef(null);
  const currency = settings?.currency_symbol || 'Rs.';

  // Focus barcode input by default
  useEffect(() => {
    if (!paymentModalOpen && !heldBillsModalOpen && !qtyModalOpen) {
      barcodeInputRef.current?.focus();
    }
  }, [paymentModalOpen, heldBillsModalOpen, qtyModalOpen, cart]);

  // Focus quantity input when modal opens
  useEffect(() => {
    if (qtyModalOpen) {
      setTimeout(() => {
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
      }, 50);
    }
  }, [qtyModalOpen]);

  // Focus and select cash received input when payment modal opens
  useEffect(() => {
    if (paymentModalOpen && paymentMethod === 'CASH') {
      setTimeout(() => {
        cashInputRef.current?.focus();
        cashInputRef.current?.select();
      }, 60);
    }
  }, [paymentModalOpen, paymentMethod]);

  // Load initial data
  useEffect(() => {
    loadCategories();
    loadCategoryProducts('ALL');
    fetchHeldBills();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) setCategories(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const loadCategoryProducts = async (catId) => {
    try {
      let url = '/api/products';
      if (catId && catId !== 'ALL') url += `?category=${catId}`;
      const res = await fetch(url);
      if (res.ok) setCategoryProducts(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHeldBills = async () => {
    try {
      const res = await fetch('/api/held-bills');
      if (res.ok) setHeldBills(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (text, type = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification({ text: '', type: '' }), 3000);
  };

  // Keyboard Shortcuts (F1, F2, F3, F4, F12, Escape, Enter)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (qtyModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeQtyModal();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          confirmAddQuantity();
        }
        return;
      }

      if (paymentModalOpen) {
        if (e.key === 'Escape') setPaymentModalOpen(false);
        if (e.key === 'Enter') handleFinalCheckout();
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        setPaymentMethod('CASH');
        openPayment();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setPaymentMethod('UPI');
        openPayment();
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleHoldBill();
      } else if (e.key === 'F4') {
        e.preventDefault();
        setHeldBillsModalOpen(true);
      } else if (e.key === 'F12') {
        e.preventDefault();
        openPayment();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, paymentModalOpen, cashTendered, paymentMethod, discountPercent, customerPhone, customerName, qtyModalOpen, inputQty, pendingProduct]);

  // Handle Product Selection & Quantity Prompt
  const onSelectProduct = (product, explicitQty = null) => {
    if (explicitQty !== null && !isNaN(explicitQty) && explicitQty > 0) {
      addToCart(product, explicitQty);
      showToast(`Added ${explicitQty}x ${product.name}`);
      setTimeout(() => barcodeInputRef.current?.focus(), 50);
      return;
    }

    if (askQtyAlways) {
      setPendingProduct(product);
      setInputQty('1');
      setQtyModalOpen(true);
    } else {
      addToCart(product, 1);
      showToast(`Added: ${product.name}`);
      setTimeout(() => barcodeInputRef.current?.focus(), 50);
    }
  };

  const confirmAddQuantity = () => {
    if (!pendingProduct) return;
    const qtyVal = parseFloat(inputQty);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }
    addToCart(pendingProduct, qtyVal);
    showToast(`Added ${qtyVal}x ${pendingProduct.name}`);
    setQtyModalOpen(false);
    setPendingProduct(null);
    setInputQty('1');
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  const closeQtyModal = () => {
    setQtyModalOpen(false);
    setPendingProduct(null);
    setInputQty('1');
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  // Handle Barcode Scan / Enter (supports "5*BARCODE" syntax)
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    let code = barcodeInput.trim();
    if (!code) return;

    let prefixQty = null;
    if (code.includes('*')) {
      const parts = code.split('*');
      if (parts.length === 2 && !isNaN(parts[0]) && Number(parts[0]) > 0) {
        prefixQty = parseFloat(parts[0]);
        code = parts[1].trim();
      }
    }

    try {
      const res = await fetch(`/api/products/barcode/${encodeURIComponent(code)}`);
      if (res.ok) {
        const prod = await res.json();
        setBarcodeInput('');
        onSelectProduct(prod, prefixQty);
      } else {
        const sRes = await fetch(`/api/products?search=${encodeURIComponent(code)}`);
        const results = await sRes.json();
        if (results.length === 1) {
          setBarcodeInput('');
          onSelectProduct(results[0], prefixQty);
        } else if (results.length > 1) {
          setSearchResults(results);
        } else {
          showToast(`Product not found: "${code}"`, 'error');
        }
      }
    } catch (err) {
      showToast('Error reading barcode', 'error');
    }
  };

  // Live product search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        try {
          const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery.trim())}`);
          setSearchResults(await res.json());
        } catch (e) {
          console.error(e);
        }
      } else {
        setSearchResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addToCart = (product, qty = 1) => {
    const quantityToAdd = parseFloat(qty) || 1;
    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        const newQty = exists.quantity + quantityToAdd;
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: newQty, total_price: newQty * item.selling_price }
            : item
        );
      } else {
        return [
          {
            ...product,
            quantity: quantityToAdd,
            total_price: quantityToAdd * product.selling_price
          },
          ...prev
        ];
      }
    });
  };

  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = Math.max(1, (parseFloat(item.quantity) || 1) + delta);
            return { ...item, quantity: newQty, total_price: newQty * item.selling_price };
          }
          return item;
        })
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    if (cart.length > 0 && window.confirm('Are you sure you want to clear the entire cart?')) {
      setCart([]);
      setDiscountPercent(0);
      setCustomerName('');
      setCustomerPhone('');
    }
  };

  // Calculations
  const subtotal = cart.reduce((acc, it) => acc + it.total_price, 0);
  const totalMrp = cart.reduce((acc, it) => acc + ((it.mrp || it.selling_price) * it.quantity), 0);
  const totalSavings = Math.max(0, totalMrp - subtotal);
  const discountAmount = (subtotal * (Number(discountPercent) || 0)) / 100;
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const totalItemsCount = cart.reduce((sum, it) => sum + it.quantity, 0);

  // Hold / Park Bill
  const handleHoldBill = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty. Nothing to hold!', 'error');
      return;
    }
    try {
      const res = await fetch('/api/held-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName || `Order (${cart.length} items)`,
          cart: { items: cart, customerName, customerPhone, discountPercent }
        })
      });
      if (res.ok) {
        showToast('Bill placed on Hold (Press F4 to Resume)');
        setCart([]);
        fetchHeldBills();
      }
    } catch (e) {
      showToast('Failed to hold bill', 'error');
    }
  };

  const resumeHeldBill = async (heldItem) => {
    if (cart.length > 0 && !window.confirm('Current cart has items. Overwrite with resumed bill?')) return;
    const data = heldItem.cart;
    setCart(data.items || []);
    setCustomerName(data.customerName || '');
    setCustomerPhone(data.customerPhone || '');
    setDiscountPercent(data.discountPercent || 0);

    await fetch(`/api/held-bills/${heldItem.id}`, { method: 'DELETE' });
    fetchHeldBills();
    setHeldBillsModalOpen(false);
    showToast('Held bill resumed successfully!');
  };

  const openPayment = () => {
    if (cart.length === 0) {
      showToast('Please add items to cart first!', 'error');
      return;
    }
    setCashTendered(String(Math.ceil(grandTotal)));
    setPaymentModalOpen(true);
  };

  const handleFinalCheckout = async () => {
    try {
      const tendered = Number(cashTendered) || grandTotal;
      const change = Math.max(0, tendered - grandTotal);

      const payload = {
        items: cart,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: 0,
        grand_total: grandTotal,
        payment_method: paymentMethod,
        cash_tendered: tendered,
        change_returned: change,
        customer_name: customerName || 'Walk-in Customer',
        customer_phone: customerPhone || ''
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setPaymentModalOpen(false);
        setCart([]);
        setDiscountPercent(0);
        setCustomerName('');
        setCustomerPhone('');
        showToast('Transaction Completed! Printing Receipt...', 'success');
        if (onInvoiceComplete) onInvoiceComplete(data.sale);
      } else {
        const err = await res.json();
        showToast(`Failed: ${err.error}`, 'error');
      }
    } catch (err) {
      showToast('Checkout Network Error', 'error');
    }
  };

  return (
    <div className="flex h-full w-full gap-3 overflow-hidden text-slate-800 dark:text-slate-100">
      {/* Toast Alert */}
      {notification.text && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl font-bold flex items-center gap-2 border transition-all animate-bounce ${
          notification.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
            : 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
        }`}>
          {notification.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} className="text-rose-600 dark:text-rose-400" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* LEFT 60%: SCANNER & TOUCH QUICK-SELECT TILES */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm overflow-hidden transition-colors duration-200">
        
        {/* TOP BARCODE SCANNER: Clean Soft rose */}
        <form onSubmit={handleBarcodeSubmit} className="mb-3">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <Barcode size={18} /> Continuous Barcode Scanner
            </span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={askQtyAlways}
                  onChange={(e) => setAskQtyAlways(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer accent-rose-600"
                />
                <span>Ask Quantity on Add</span>
              </label>
              <span className="text-[11px] bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                Ready to Scan ⚡
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan barcode (or type '5*barcode' for qty)..."
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-rose-500 rounded-xl px-4 py-3 text-lg font-mono font-bold text-slate-900 dark:text-rose-300 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-rose-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-rose-600 hover:bg-rose-700 text-white px-5 rounded-xl font-bold text-sm flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95 transition-all"
            >
              <Plus size={18} /> Add
            </button>
          </div>
        </form>

        {/* SEARCH BAR */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-2.5 text-slate-400" size={17} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product by name: Rice, Biscuit, Tea, Milk..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 shadow-inner"
          />

          {/* Search Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border-2 border-blue-400 dark:border-blue-600 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectProduct(p);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="flex items-center justify-between p-3 hover:bg-blue-50/80 dark:hover:bg-slate-700/60 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white text-sm">{p.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">Barcode: {p.barcode} | Stock: {p.stock_qty} {p.unit}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-rose-600 dark:text-rose-400 font-black text-base">{currency} {Number(p.selling_price).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CATEGORY TABS */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-2">
          <button
            onClick={() => { setActiveCategory('ALL'); loadCategoryProducts('ALL'); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              activeCategory === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); loadCategoryProducts(cat.id); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* TOUCH PRODUCT TILES */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-2.5">
            {categoryProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onSelectProduct(p);
                }}
                className="bg-slate-50 dark:bg-slate-950/70 hover:bg-rose-50/50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500/60 p-3 rounded-2xl cursor-pointer active:scale-95 transition-all flex flex-col justify-between shadow-sm group"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-2 group-hover:text-rose-700 dark:group-hover:text-rose-300">
                    {p.name}
                  </h4>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 block truncate">
                    #{p.barcode}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="font-black text-sm text-rose-600 dark:text-rose-400 font-mono">
                    {currency} {Number(p.selling_price).toFixed(2)}
                  </span>
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-mono">
                    {p.stock_qty} {p.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER SHORTCUT BUTTONS */}
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px] font-bold">
              <b className="text-rose-700 dark:text-rose-400">F1</b> Cash
            </span>
            <span className="bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px] font-bold">
              <b className="text-blue-700 dark:text-blue-400">F2</b> UPI
            </span>
            <span className="bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px] font-bold">
              <b className="text-amber-700 dark:text-amber-400">F3</b> Hold
            </span>
            <span className="bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px] font-bold">
              <b className="text-purple-700 dark:text-purple-400">F4</b> Resume ({heldBills.length})
            </span>
          </div>

          <button
            onClick={() => setHeldBillsModalOpen(true)}
            className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-800 transition-all"
          >
            <PauseCircle size={14} className="text-amber-600 dark:text-amber-400" /> Parked Bills ({heldBills.length})
          </button>
        </div>
      </div>

      {/* RIGHT 40%: CART & BIG CLEAR BILLING TOTAL */}
      <div className="w-[450px] flex flex-col bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors duration-200">
        
        {/* Cart Header */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-rose-600 dark:text-rose-400" size={20} />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">BILL CART</h3>
            <span className="bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-xs px-2 py-0.5 rounded-full font-black border border-rose-200 dark:border-rose-800">
              {totalItemsCount} items
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1 hover:underline font-bold"
            >
              <Trash2 size={13} /> Clear
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-600">
              <ShoppingCart size={54} className="stroke-1 mb-2 text-slate-300 dark:text-slate-700" />
              <p className="font-bold text-slate-600 dark:text-slate-400 text-base">Cart is currently empty</p>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-1 max-w-[220px]">
                Scan product barcode or click on any item on the left panel.
              </p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={item.id} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-full">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate block">{item.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1 pl-6">
                    <span className="font-mono text-rose-700 dark:text-rose-400 font-bold">{currency} {Number(item.selling_price).toFixed(2)}</span>
                    {item.mrp > item.selling_price && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 line-through">MRP: {item.mrp}</span>
                    )}
                  </div>
                </div>

                {/* Big +/- Quantity Buttons */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/50 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 font-black rounded-lg text-sm border border-slate-200 dark:border-slate-700 active:scale-90 transition-all shadow-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setCart((prev) =>
                        prev.map((it) =>
                          it.id === item.id
                            ? {
                                ...it,
                                quantity: e.target.value === '' ? '' : (isNaN(val) ? 1 : val),
                                total_price: (parseFloat(e.target.value) || 0) * it.selling_price
                              }
                            : it
                        )
                      );
                    }}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (isNaN(val) || val <= 0) {
                        updateQuantity(item.id, 0);
                      }
                    }}
                    className="w-11 text-center font-mono font-black text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-rose-400 border border-slate-200 dark:border-slate-700 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm"
                  />
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/50 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 font-black rounded-lg text-sm border border-slate-200 dark:border-slate-700 active:scale-90 transition-all shadow-sm"
                  >
                    +
                  </button>
                </div>

                {/* Total & Remove */}
                <div className="text-right w-20">
                  <div className="font-mono font-black text-sm text-slate-900 dark:text-white">
                    {currency} {Number(item.total_price).toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-[11px] text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 font-semibold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* BILL SUMMARY FOOTER */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-2">
          
          {/* Subtotal & Savings badge */}
          <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
            <span>Subtotal ({cart.length} types):</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{currency} {subtotal.toFixed(2)}</span>
          </div>

          {totalSavings > 0 && (
            <div className="flex justify-between items-center bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-xl text-xs font-bold text-rose-800 dark:text-rose-300">
              <span className="flex items-center gap-1">
                <Sparkles size={14} className="text-rose-600 dark:text-rose-400" /> Total Savings (You Save):
              </span>
              <span className="font-mono font-black">{currency} {totalSavings.toFixed(2)}</span>
            </div>
          )}

          {/* Discount input */}
          <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
            <span>Extra Discount %:</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-12 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-xs text-amber-700 dark:text-amber-400 font-bold focus:outline-none"
              />
              <span className="text-amber-700 dark:text-amber-400 font-bold font-mono">- {currency} {discountAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* GRAND TOTAL */}
          <div className="bg-rose-600 dark:bg-rose-700 border-2 border-rose-500 p-3.5 rounded-2xl flex items-center justify-between text-white shadow-lg shadow-rose-600/20">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-rose-100 font-extrabold block">Grand Total</span>
              <span className="text-[10px] text-rose-200 font-semibold">{totalItemsCount} units total</span>
            </div>
            <div className="text-3xl font-black font-mono tracking-tight text-white">
              {currency} {grandTotal.toFixed(2)}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={handleHoldBill}
              disabled={cart.length === 0}
              className="bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-xl py-3 font-bold text-xs flex flex-col items-center justify-center disabled:opacity-40 transition-all active:scale-95 shadow-sm"
            >
              <PauseCircle size={18} className="mb-0.5 text-amber-600 dark:text-amber-400" />
              <span>HOLD (F3)</span>
            </button>

            <button
              onClick={openPayment}
              disabled={cart.length === 0}
              className="col-span-2 bg-gradient-to-r from-rose-600 to-teal-600 hover:from-rose-700 hover:to-teal-700 text-white font-black rounded-xl py-3 shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 text-base disabled:opacity-40 transition-all active:scale-95"
            >
              <CheckCircle2 size={22} />
              <span>CHECKOUT (F12 PAY)</span>
            </button>
          </div>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Payment Method</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Payable: <b className="text-rose-700 dark:text-rose-400 text-sm font-bold">{currency} {grandTotal.toFixed(2)}</b></p>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              
              {/* Payment Methods */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">Select Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center gap-1.5 font-bold text-sm transition-all ${
                      paymentMethod === 'CASH'
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-300 ring-2 ring-rose-500/20'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Banknote size={24} className="text-rose-600 dark:text-rose-400" />
                    <span>CASH</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center gap-1.5 font-bold text-sm transition-all ${
                      paymentMethod === 'UPI'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-800 dark:text-blue-300 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <QrCode size={24} className="text-blue-600 dark:text-blue-400" />
                    <span>QR / BANK APP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center gap-1.5 font-bold text-sm transition-all ${
                      paymentMethod === 'CARD'
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-800 dark:text-purple-300 ring-2 ring-purple-500/20'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <CreditCard size={24} className="text-purple-600 dark:text-purple-400" />
                    <span>CARD</span>
                  </button>
                </div>
              </div>

              {/* CASH CHANGE CALCULATOR */}
              {paymentMethod === 'CASH' && (() => {
                const tenderedNum = parseFloat(cashTendered) || 0;
                const changeAmount = tenderedNum - grandTotal;
                const isSufficient = tenderedNum >= grandTotal;

                // Smart quick suggestions based on grandTotal
                const exactVal = Math.ceil(grandTotal);
                const round50 = Math.ceil(grandTotal / 50) * 50;
                const round100 = Math.ceil(grandTotal / 100) * 100;
                const round500 = Math.ceil(grandTotal / 500) * 500;
                const round1000 = Math.ceil(grandTotal / 1000) * 1000;
                const round2000 = Math.ceil(grandTotal / 2000) * 2000;
                const round5000 = Math.ceil(grandTotal / 5000) * 5000;

                const suggestions = Array.from(new Set([
                  exactVal,
                  round50 > exactVal ? round50 : null,
                  round100 > exactVal ? round100 : null,
                  round500 > exactVal ? round500 : null,
                  round1000 > exactVal ? round1000 : null,
                  round2000 > exactVal ? round2000 : null,
                  round5000 > exactVal ? round5000 : null
                ].filter(Boolean))).slice(0, 4);

                return (
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3.5">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-600 dark:text-slate-400 font-bold block">
                          Cash Received from Customer (வாங்கிய பணம்)
                        </label>
                        <button
                          type="button"
                          onClick={() => { setCashTendered(''); cashInputRef.current?.focus(); }}
                          className="text-[11px] text-rose-600 dark:text-rose-400 hover:text-rose-700 font-bold underline"
                        >
                          Clear
                        </button>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-lg">{currency}</span>
                        <input
                          ref={cashInputRef}
                          type="number"
                          step="any"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          placeholder={String(exactVal)}
                          className="w-full bg-white dark:bg-slate-900 border-2 border-rose-500 rounded-xl pl-12 pr-4 py-2.5 text-2xl font-mono text-slate-900 dark:text-white font-black focus:outline-none focus:ring-4 focus:ring-rose-500/20 shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Quick Smart Cash Suggestions */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                        Quick Pay Presets:
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {suggestions.map((sug, i) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setCashTendered(String(sug))}
                            className={`py-2 px-1 rounded-xl text-xs font-mono font-bold border transition-all ${
                              tenderedNum === sug
                                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {i === 0 ? 'Exact ' : ''}{currency}{sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cash Denominations Add Buttons */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                        Add Notes (+ நோட்டுகள்):
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[100, 500, 1000, 2000].map((note) => (
                          <button
                            key={note}
                            type="button"
                            onClick={() => {
                              const curr = parseFloat(cashTendered) || 0;
                              setCashTendered(String(curr + note));
                            }}
                            className="bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-600 dark:text-slate-300 active:scale-95 transition-all shadow-sm"
                          >
                            +{currency}{note}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* LIVE CALCULATION BREAKDOWN */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                        <span>Total Product Cost (Bill):</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{currency} {grandTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                        <span>Customer Paid (Cash Received):</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{currency} {tenderedNum.toFixed(2)}</span>
                      </div>

                      {/* Prominent Balance / Change Box */}
                      {isSufficient ? (
                        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 p-3.5 rounded-2xl flex items-center justify-between text-emerald-900 dark:text-emerald-300 shadow-sm animate-in fade-in duration-150">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 dark:text-emerald-400 block">
                              Balance / Change to Return
                            </span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                              (மீதி கொடுக்க வேண்டியது)
                            </span>
                          </div>
                          <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-300">
                            {currency} {changeAmount.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <div className="bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-500 p-3.5 rounded-2xl flex items-center justify-between text-amber-900 dark:text-amber-300 shadow-sm animate-in fade-in duration-150">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 dark:text-amber-400 block">
                              Still Due / Short Amount
                            </span>
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                              (இன்னும் தர வேண்டிய பணம்)
                            </span>
                          </div>
                          <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                            {currency} {Math.abs(changeAmount).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-3.5 rounded-2xl font-bold text-sm"
                >
                  Cancel (Esc)
                </button>
                <button
                  type="button"
                  onClick={handleFinalCheckout}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-rose-600/30 active:scale-95 transition-all"
                >
                  <Printer size={18} />
                  <span>Print & Finish (Enter)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HELD BILLS MODAL */}
      {heldBillsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <PauseCircle className="text-amber-600 dark:text-amber-400" /> Parked (Held) Bills
              </h3>
              <button onClick={() => setHeldBillsModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold">✕</button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto space-y-2">
              {heldBills.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-600">
                  <p>No parked bills available.</p>
                </div>
              ) : (
                heldBills.map((b) => (
                  <div key={b.id} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{b.customer_name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{b.cart?.items?.length || 0} items | Time: {new Date(b.held_at).toLocaleTimeString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => resumeHeldBill(b)}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Resume Bill
                      </button>
                      <button
                        onClick={async () => {
                          await fetch(`/api/held-bills/${b.id}`, { method: 'DELETE' });
                          fetchHeldBills();
                        }}
                        className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-1.5"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUICK QUANTITY MODAL */}
      {qtyModalOpen && pendingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 dark:bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-500 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-rose-50 to-slate-50 dark:from-rose-950/40 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                  Select Quantity
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1 leading-snug">
                  {pendingProduct.name}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    {currency} {Number(pendingProduct.selling_price).toFixed(2)} / {pendingProduct.unit || 'pcs'}
                  </span>
                  <span>•</span>
                  <span>Stock: <b>{pendingProduct.stock_qty}</b></span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeQtyModal}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Quantity Input with - / + buttons */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2 text-center">
                  How many units to add?
                </label>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setInputQty((q) => String(Math.max(1, (parseFloat(q) || 1) - 1)))}
                    className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 text-2xl font-black rounded-2xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all shadow-sm"
                  >
                    -
                  </button>
                  <input
                    ref={qtyInputRef}
                    type="number"
                    min="0.01"
                    step="any"
                    value={inputQty}
                    onChange={(e) => setInputQty(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        confirmAddQuantity();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        closeQtyModal();
                      }
                    }}
                    className="w-36 text-center text-4xl font-mono font-black py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-rose-500 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-rose-500/20 shadow-inner"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setInputQty((q) => String((parseFloat(q) || 0) + 1))}
                    className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 text-2xl font-black rounded-2xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Fast Quick-Pick Quantity Buttons */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 block mb-1.5 text-center">
                  Quick Select:
                </span>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 5, 10, 12].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setInputQty(String(num))}
                      className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                        String(inputQty) === String(num)
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculated Total Box */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Total Item Cost:</span>
                <span className="text-xl font-mono font-black text-rose-600 dark:text-rose-400">
                  {currency} {(Math.max(0, parseFloat(inputQty) || 0) * pendingProduct.selling_price).toFixed(2)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={closeQtyModal}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-2xl font-bold text-xs"
                >
                  Cancel (Esc)
                </button>
                <button
                  type="button"
                  onClick={confirmAddQuantity}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30 active:scale-95 transition-all"
                >
                  <Plus size={16} />
                  <span>Add to Cart (Enter)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
