# Hotel Sky 5 - Management & Hospitality Ecosystem

A professional, unified hospitality platform designed for **Hotel Sky 5** (Panchkula, Haryana). This system integrates room bookings, digital dining ordering, laundry inventory tracking, shift schedules, and reception checklists into a single, mobile-responsive application.

---

## 🎯 Core Business Goals & Implementation

### 1. 💼 Easier Management
- **Centralized Admin Control Center**: Accessible directly through the UI `/dashboard`. Enables managers to manage bookings, track live orders, inspect staff duty sheets, and audit rooms.
- **Role-Based Workspaces**: Sections dedicated to Front Desk, Kitchen Operations, Housekeeping, and emergency on-call schedules.

### 2. 🌟 Better Guest Experience
- **Interactive Storefront (`SKY5 Shop`)**: Guests browse room options, view ambiance layouts, select food items, and checkout digitally.
- **Flexible Billing & Navigation**: Implements seamless **Charge to Room** payment options, direct WhatsApp order sharing, and Google Maps location routing.
- **5-Star Review QR Integration**: Live QR scanner on printouts linking guests directly to the business's Google Maps review interface to maximize feedback.

### 3. 📈 Strong Profitability
- **Curated Menu Database**: Streamlined database containing **exactly 34 signature food items**, eliminating low-margin strays and beverage overhead.
- **Upsell Promoters**: Front-end showcases premium executive suites and deluxe stays with modern gallery listings.

### 4. ✨ More Premium Positioning
- **Aesthetic Excellence**: "Prestige Dark Navy" and "Signature Gold" design system. Uses elegant typography (Playfair Display, Montserrat, Cinzel) and clean card layouts.
- **Print-Ready Luxury Templates**: Dynamic A4 page-break CSS print layout rules built directly into the React client, plus standalone luxury HTML menus (`OFFICIAL_MENU_CARD_V6_LUXURY.html`).

### 5. 🛠️ Lower Operational Chaos
- **Linen Laundry Tracker**: Electronic input tracking linen units (bedsheets, quilt covers, towels) sent for laundry.
- **Turnover Reception Checklists**: Housekeeping checklists verifying that remotes, cells, mugs, and keys are returned during room turnover.
- **Live Sync**: Automation bridge to maintain ledger logs and data integrity without manual overhead.

---

## 📂 Project Organization

- **`01_Design_Brand/`**: High-end luxury printable templates, menu cards, and PDF assets.
- **`02_Application_Source/`**: Core React/Vite codebase containing components, hooks, styles, and initial databases.
- **`03_Automation_System/`**: Operational audit scripts, syntax checking, parent/child balance helpers, and emergency utilities.
- **`04_Digital_Assets/`**: High-quality SVG logos, category images, and mockup card renders.
- **`05_Production_Builds/`**: Minified, standalone static release folder.

---

## 🚀 Running the App Locally

### Prerequisites
- Node.js installed on your system.

### Steps
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173/](http://localhost:5173/) in your web browser.
4. To build the production bundle:
   ```bash
   npm run build
   ```
