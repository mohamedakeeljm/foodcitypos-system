# Food City Supermarket POS System 🛒⚡

An offline-first, high-speed Supermarket Point of Sale (POS) and Inventory Management desktop application.

## 🚀 Key Features

- **Continuous Barcode Scanner:** Non-stop scanning with quick keyboard navigation (`F1` Cash, `F2` UPI, `F3` Hold, `F4` Resume, `F12` Pay).
- **Fast Quantity Prompt:** Quick popup for specifying quantities on add, plus inline cart quantity editing and barcode prefix shortcuts (e.g. `5*barcode`).
- **Live Cash Balance Calculator:** 
  - Dynamic change/balance calculation (`Cash Tendered - Grand Total`).
  - Prominent visual display for Change to Return or Remaining Due.
  - Smart currency preset buttons and note increments (`+100`, `+500`, `+1000`, `+2000`).
- **Thermal Receipt Printing:** Prints 80mm/58mm thermal receipts with store details, itemized breakdown, tax/discounts, cash paid, and balance returned.
- **Hold & Park Bills:** Park customer carts and resume them anytime.
- **Inventory Management:** Full stock tracking, low-stock warnings, barcode management, categories, and pricing.
- **Daily Sales Reports (Z-Report):** Day-end settlement summaries, profit estimations, payment method distribution, and top-selling items.
- **Offline SQLite Engine:** Embedded `node:sqlite` database for fast offline data storage without external database server configuration.

---

## 🛠️ Tech Stack

- **Desktop Framework:** Electron
- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express
- **Database:** SQLite (`node:sqlite` WAL mode)

---

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mohamedakeeljm/foodcitypos-system.git
   cd foodcitypos-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the frontend:
   ```bash
   npm run build
   ```

4. Start the application:
   - **One-click Desktop Launcher:** Double click `start-pos.bat`
   - **Or via terminal:**
     ```bash
     # Start Desktop Electron App
     npm run electron:start

     # Or run in local browser
     npm run dev
     ```

---

## 📝 License

ISC License
