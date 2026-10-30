import React from 'react';

export default function ThermalReceipt({ invoice, settings }) {
  if (!invoice) return null;

  const currency = settings?.currency_symbol || '₹';
  const widthClass = settings?.receipt_printer_width === '58mm' ? 'max-w-[58mm]' : 'max-w-[80mm]';

  return (
    <div id="thermal-receipt-area" className={`${widthClass} mx-auto bg-white text-black p-3 font-mono text-[11px] leading-tight select-text`}>
      {/* Header */}
      <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
        <h2 className="text-base font-black tracking-wider uppercase">{settings?.store_name || 'SUPER MARKET'}</h2>
        <p className="text-[10px] text-gray-700">{settings?.store_address || 'Main Road, Commercial Center'}</p>
        <p className="text-[10px] text-gray-700">Phone: {settings?.store_phone || '-'}</p>
        {settings?.store_gstin && (
          <p className="text-[10px] font-bold">GSTIN: {settings.store_gstin}</p>
        )}
      </div>

      {/* Bill Meta */}
      <div className="flex justify-between text-[10px] border-b border-dashed border-gray-400 pb-1 mb-2">
        <div>
          <div><span className="font-semibold">Bill No:</span> {invoice.invoice_no}</div>
          <div><span className="font-semibold">Date:</span> {new Date(invoice.created_at || Date.now()).toLocaleString()}</div>
        </div>
        <div className="text-right">
          <div><span className="font-semibold">Cust:</span> {invoice.customer_name || 'Walk-in'}</div>
          <div><span className="font-semibold">Pay:</span> {invoice.payment_method}</div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-left mb-2 border-b border-dashed border-gray-400 pb-1">
        <thead>
          <tr className="border-b border-gray-300 text-[10px]">
            <th className="py-1">ITEM</th>
            <th className="text-center py-1">QTY</th>
            <th className="text-right py-1">RATE</th>
            <th className="text-right py-1">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items?.map((it, idx) => (
            <tr key={idx} className="border-b border-dotted border-gray-200">
              <td className="py-1 pr-1 truncate max-w-[120px] font-semibold">{it.product_name}</td>
              <td className="text-center py-1">{it.quantity}</td>
              <td className="text-right py-1">{Number(it.unit_price).toFixed(2)}</td>
              <td className="text-right py-1 font-bold">{Number(it.total_price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Calculation */}
      <div className="space-y-1 text-right text-[11px] border-b border-dashed border-gray-400 pb-2 mb-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{currency} {Number(invoice.subtotal).toFixed(2)}</span>
        </div>
        {Number(invoice.discount_amount) > 0 && (
          <div className="flex justify-between text-green-700 font-bold">
            <span>Discount:</span>
            <span>- {currency} {Number(invoice.discount_amount).toFixed(2)}</span>
          </div>
        )}
        {Number(invoice.tax_amount) > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>Tax (GST):</span>
            <span>{currency} {Number(invoice.tax_amount).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-sm border-t border-black pt-1">
          <span>GRAND TOTAL:</span>
          <span>{currency} {Number(invoice.grand_total).toFixed(2)}</span>
        </div>
        {invoice.payment_method === 'CASH' && (
          <div className="pt-2 mt-2 border-t border-dashed border-gray-400 text-[11px] text-gray-800 space-y-1">
            <div className="flex justify-between">
              <span className="font-semibold">CASH RECEIVED:</span>
              <span className="font-bold">{currency} {Number(invoice.cash_tendered || invoice.grand_total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600 text-[10px]">
              <span>TOTAL BILL:</span>
              <span>- {currency} {Number(invoice.grand_total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-black text-xs text-black border border-black p-1 rounded bg-gray-100 mt-1">
              <span>BALANCE / CHANGE RETURN:</span>
              <span>{currency} {Number(invoice.change_returned || 0).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] space-y-1 text-gray-700">
        <p className="font-bold">{settings?.receipt_footer || 'Thank You! Visit Again.'}</p>
        <p>Goods once sold can be exchanged within 2 days with original receipt.</p>
        <div className="pt-2 text-[9px] text-gray-500">
          *** POS EXPRESS - SINGLE COUNTER ***
        </div>
      </div>
    </div>
  );
}
