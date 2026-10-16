# 🛒 Shop POS — Smart Universal Grocery & Retail POS System

[![React Version](https://img.shields.io/badge/React-19.2.8-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4.3-38bdf8.svg)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff.svg)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-emerald.svg)](https://github.com/jalalakbar47/Shop-pos)

A modern, high-speed, mobile-first Point of Sale (POS), Inventory, and Customer Khata (Credit Ledger) web application built for grocery stores, marts, tuck shops, and retail counters. Operates **100% offline-first** with zero lag and seamlessly synchronizes with a **free Google Sheets cloud database backend**.

---

## ✨ Key Features

### 📱 1. Mobile-First & Ultra Space-Efficient Design
- **2-Column Mobile Catalog Grid**: Clean grocery product cards displaying 4–6 items simultaneously above the fold without endless vertical scrolling.
- **Compact Executive Dashboard**: 6 real-time business KPIs (Today's Revenue, Net Profit, Khata Receivables, Low Stock Alerts, 30-Day Expirations, and Stock Valuation) arranged in a responsive 2-column mobile grid.
- **2×2 Quick Store Actions**: Instant access to POS billing, Khata payments, new product addition, and shop expense logging with smooth `active:scale-95` tap feedback.
- **Sticky Bottom Navigation Bar**: Quick mobile access to Dashboard, POS Terminal (with live badge counter), Inventory, Khata Book, and Store Menu.
- **Slide-Over Management Drawer**: Complete navigation drawer with store brand info, live cloud sync status, user profile, and quick day totals.

### ⚡ 2. Offline-First Architecture & Cloud Hybrid
- **Instant Local Performance**: All billing, cart calculations, stock adjustments, and customer transactions run locally in browser storage with zero latency.
- **Google Sheets Cloud Database Backend**: Connects directly to any Google Sheet via Google Apps Script Web App for free, automatic 2-way cloud synchronization and multi-terminal data sharing.
- **Auto-Sync & Offline Resilience**: Works smoothly without an internet connection and syncs when reconnected.

### 📖 3. Customer Khata Book (Digital Credit Ledger / Udhaar)
- **Automated Ledger Tracking**: Automatically logs customer Udhaar directly during POS checkout with zero manual paperwork.
- **Cash Recovery & Partial Payments**: Instant "Receive Cash" payments with automated balance updates and timestamped transaction logs.
- **Customer Statement History**: Itemized ledger statements showing invoice numbers, transaction dates, billed items, and remaining balances.
- **Quick Customer Registration**: Search by name, phone, or street with quick contact action shortcuts.

### 📦 4. Smart Inventory, Expiry & Loose Weight Grocery Helpers
- **Loose Item Presets**: 1-tap quick buttons for bulk items (`+250g`, `+500g`, `+1kg`, `+5kg`).
- **Rupee-to-Weight Calculator (Rs→Wt)**: Enter any customer rupee amount (e.g., Rs. 50 or Rs. 100) to auto-calculate exact fractional kilogram weight.
- **Critical Stock & 30-Day Expiry Alerts**: Real-time warnings for low stock items and expiring batches with 1-click restock modals.
- **Category Filter Pills**: Fast department filtering across Grains & Flour, Pulses & Spices, Cooking Oil, Dairy & Bakery, Beverages, Snacks, and Household.

### 🧾 5. 80mm Thermal Receipt Printing & Digital Sharing
- **Thermal Slip Printer Ready**: Dedicated `@media print` thermal styling optimized for standard 80mm and 58mm POS receipt printers.
- **Branded Invoices**: Prints store name, address, phone, invoice number, cashier, itemized pricing, discounts, and custom thank-you footer.
- **Digital Sharing**: Share receipt summaries via WhatsApp or view transaction slips directly from invoice history.

### 🏷️ 6. Multi-Store White-Labeling & Store Settings
- Configure store name, tagline, address, phone, currency symbol (`Rs.`, `$`, `€`, `PKR`, `AED`), and receipt footer.
- Set store identity globally via the `.env` configuration file or interactively inside the in-app **Store Settings** tab.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) with Custom Tokens |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Fonts** | Google Fonts ([Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) & [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)) |
| **Cloud Backend** | Google Apps Script (Serverless Web App API) + Google Sheets DB |
| **Local Storage** | Browser `localStorage` + Memory Cache |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn / pnpm

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/jalalakbar47/Shop-pos.git
   cd Shop-pos
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (Optional):**
   Copy `.env.example` to `.env` and customize your store profile:
   ```bash
   cp .env.example .env
   ```

4. **Launch Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173/](http://localhost:5173/) in your mobile or desktop browser.

5. **Build for Production:**
   ```bash
   npm run build
   ```

---

## ☁️ Google Sheets Cloud Database Setup

To use Google Sheets as your free multi-terminal cloud database:

1. Create a new Google Spreadsheet at [sheets.new](https://sheets.new).
2. Go to **Extensions** → **Apps Script**.
3. Copy the Apps Script code available in the application under **Store Settings** → **View Script**.
4. Paste the code into the script editor and click **Deploy** → **New Deployment**.
5. Select **Web App**:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
6. Copy the generated Web App URL and paste it into **Store Settings** in the POS app (or into `VITE_GOOGLE_SHEETS_URL` in `.env`).
7. Click **Connect Google Sheet** to activate 2-way cloud synchronization!

---

## 📁 Project Structure

```
Shop-pos/
├── index.html                 # HTML shell with Google Fonts & viewport meta
├── vite.config.js             # Vite 8 configuration with React & Tailwind plugins
├── package.json               # Dependencies & build scripts
├── .env.example               # Store branding & backend environment template
├── ux-ui-skill.md             # UX/UI principles & component guidelines
├── src/
│   ├── main.jsx               # Application root entry point
│   ├── index.css              # Tailwind v4 theme tokens, thermal receipt print styles
│   ├── App.jsx                # Main POS application, modules & responsive layout
│   ├── components/
│   │   ├── AuthScreen.jsx           # Staff / Manager PIN login portal
│   │   ├── GoogleSheetsModal.jsx    # Cloud database sync setup modal
│   │   └── StoreSettingsTab.jsx     # White-label branding & cloud settings tab
│   ├── services/
│   │   └── googleSheetsService.js   # 2-way sync engine & Google Apps Script API
│   └── config/
│       └── storeConfig.js           # Multi-store profile & defaults
└── dist/                      # Production build bundle
```

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).

---

## 👤 Author

Developed by **[Jalal Akbar](https://github.com/jalalakbar47)**.  
Feedback, issues, and pull requests are welcome!
