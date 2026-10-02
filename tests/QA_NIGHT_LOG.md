# Hotel Sky 5 – Raat bhar QA log (1 Oct 2026 → 2 Oct 2026 08:00)

Har round me ye chalta hai: lint, unit tests (vitest), build, aur E2E (Playwright, desktop + mobile, har test 2 baar).
Bug milte hi theek kiya jaata hai, uska test likha jaata hai, aur live deploy hota hai.
Live checks kabhi bhi asli data nahi badalte.

---

## Round 1 – 1 Oct, 18:38 (deployed)

**Result:** lint 0 errors · unit 119/119 · build OK · E2E 236 passed (12 on-demand audit/desktop-only skips) · dist me token nahi mila · live deploy ho gaya.

### Paise / hisaab ke bug (theek kiye)

| # | Bug | Pehle | Ab |
|---|-----|-------|----|
| 1 | Checkout pe bill **planned** check-out date se ban raha tha | Guest 1 din me chala gaya to bhi 4 raat ka bill (₹8,064) | Asli departure ke hisaab se: 1 raat (₹2,016). Overstay bhi poora charge hota hai |
| 2 | EDIT GUEST save karne se room ka food bill purana ho jaata tha | Form khula rehte ₹500 room-charge order aaya → save → ₹500 gayab | Food bill form se kabhi nahi likha jaata. Doosre device ne room badla ho to save rok diya jaata hai |
| 3 | Advance bill se zyada ho to "Balance ₹-656" har jagah alag dikhta tha | Finance me minus jud jaata tha, refund kahin record nahi hota tha | "Refund due to guest ₹656" dikhta hai. Checkout pe refund confirm hota hai aur settlement me `refund` save hota hai. Finance me sirf asli due judta hai |
| 4 | Guest ke jaane ke baad (Dirty room) bill badhta rehta tha | 2 din baad "Balance ₹7,471" laal me | Bill sirf Occupied room pe dikhta hai |
| 5 | Shop cart bar GST ke bina amount dikhata tha | Bar me ₹388, pay me ₹407 | Bar me "₹407 incl. GST" |
| 6 | Attendance WhatsApp report saare dinon ko gin raha tha | "Present 16, Total 18" | Sirf aaj ka record. Total staff ab staff list se aata hai |
| 7 | Rupaye ka format mix tha | ₹123,456 | Har jagah ₹1,23,456 (en-IN) |
| 8 | "Bathroom 3" ko Room 3 samjha jaata tha | Galat room pe charge | Sirf "Room N" maana jaata hai |

### Data loss / sync ke bug (theek kiye)

- **Do device ek hi room badlein** to poora record overwrite ho jaata tha. Ab sirf badla hua field likha jaata hai, isliye food bill aur cleaning status dono bache rehte hain.
- **Menu / staff list** me ek jagah ka badlaav doosri jagah ka badlaav mita deta tha. Ab sirf badli hui key likhi jaati hai.
- **Order ID har ~2.8 ghante me repeat** hota tha, aur repeat hone pe naya kitchen order purane se badal jaata tha. Ab ID time + random hai.
- **Attendance ID** do device pe same ban jaata tha. Ab unique hai.
- **Purana (slow) snapshot naya data mita sakta tha** (kitchen list khaali). Ab sequence guard hai.
- **Save fail hone par kuch nahi dikhta tha.** Ab header me laal "⚠ A change could NOT be saved…" dikhta hai, jab tak OK na dabayein.
- **Screen jaldi band ho jaye to "Saving…" atka reh jaata tha.** Ab theek hai.

### Inventory (theek kiye)

- **Min. Level:** box khaali karke 5 likhne pe **15** ban jaata tha. Ab value Enter ya bahar click karne pe save hoti hai, aur khaali box purani value rakhta hai.
- **Raat bhar khule tablet** pe agle din ki entry kal ki date me jaati thi. Ab date apne aap aaj ki ho jaati hai, jab tak kisi ne khud date na chuni ho.
- **Report / PDF** me MOVE (TRANSFER) entry OUT jaisi naarangi dikhti thi. Ab neeli dikhti hai.
- **Viewer** ab Esc se band hota hai.
- **Location fallback** galti se total stock le leta tha. Ab 0 leta hai.

### Colour coding / accessibility

- **axe audit (WCAG AA), saari screens:** 730 violations → 13. Jo bache hain:
  - cart ke slide-in animation ke beech wale false positive
  - invoice ka decorative watermark
- **Theme colours gehre kiye:** success / warning / muted / destructive, inventory green / amber / red / muted, WhatsApp green, aur status colours.
- **Shop header ka "Home" link** navy pe navy tha (dikhta hi nahi tha). Ab gold hai.
- **Dark cards** (CCTV, invoice header, Finance) me grey text ab padhne layak hai.
- **Labels:** har input / select ka label hai (Min level, condition, price, qty, search, filters).
- **Tabs:** tabs ko asli `role=tab` aur `aria-selected` diya.
- **Scroll tables:** keyboard se scroll hoti hain.

### Phone pe OPS Center

- **Pehle** sidebar 256px leta tha aur content ko ~40px bachta tha.
- **Ab** phone pe nav upar horizontal scroll hota hai, room cards poori width lete hain, aur split layouts stack ho jaate hain.

### Naye tests

**Unit:**
- refund / due
- actual-departure checkout
- local time
- ₹ format
- Bathroom parse
- duplicate ID
- changed-fields

**E2E:**
- doosre device ka room-charge order EDIT GUEST ke baad bhi bacha rehta hai
- early checkout + refund
- attendance WhatsApp sirf aaj ka
- Min Level clear / retype
- menu price khaali box
- Esc se viewer band
- phone-width OPS Center

### Aapke decision ke liye (code me nahi badla)

1. **Room GST 12% hai.** Sept 2025 ke GST badlaav ke baad ₹7,500/raat tak ke room pe **5%** lagta hai (bina ITC). Sky 5 ke saare rate ₹1,200–3,500 hain. **Kripya CA se confirm karein.** Confirm hote hi ek line ka badlaav hai (`ROOM_GST_RATE`).
2. **Firestore security:** koi bhi anonymous sign-in karke data padh / badal sakta hai (guest ke naam / phone). Isse band karne ke liye login ya App Check chahiye. Ye aapka decision hai.

---

## Round 2 – 1 Oct, 18:47 (deployed)

**Result:** lint 0 · unit 121/121 · build OK · E2E 236 passed · dist clean · live deploy ho gaya.

**Theek kiye:**
- **Room Charge invoice:** pehle GST ₹19 dikhata tha aur room bill pe cumulative rounding se ₹1 ka farq aata tha. Room par GST off ho to invoice ₹407 dikhata tha jabki folio ₹388 tha.
  - Ab invoice pe "GST (5%): added on room bill" aur "ADDED TO ROOM BILL ₹388" dikhta hai. WhatsApp me bhi yahi.
  - GST sirf ek baar lagta hai, room bill pe.
- **Shop se room booking:** pehle 5% GST lagta tha, ab room ka rate (`ROOM_GST_RATE`) lagta hai, jaisa folio me. Room booking ko Room Charge pe dalna block kiya; UPI/Card/Cash se pay hoti hai.
- **Inventory:** stock minus me jaye (do phone ek saath OUT karein, ya IN delete ho jaye) to naya baingani status **CHECK COUNT** aata hai: alerts, Reorder KPI, Today, report aur PDF sab me.
- **Inventory save fail:** 1.5 sec ke "saved" ke baad bhi agar save fail ho, to laal "NOT saved…" dikhta hai. Min Level aur Condition save bhi "Saving…" me gine jaate hain.
- **Room board:** anjaan status ab hare "CLEAN" jaisa nahi dikhta (neutral badge + MARK CLEANED). Bina guest wale Occupied room pe "ADD GUEST DETAILS" aata hai, "Available" nahi.

**Note:** laundry EDIT test poore suite me 2 baar fail hua tha (akele 14 baar chalane par ek baar bhi nahi). Test me ab alert ka text pakadne wala diagnostic hai, taaki agli baar asli wajah dikhe.

---

## Round 3 – 1 Oct, 18:55 (rules + hosting deployed)

**Result:** E2E 246 passed (5 naye security-rule tests ke saath) · live smoke OK ("● Live", sync error nahi, 17 rooms available).

**Database rules me data-validation:**
- **Room:** status sirf Clean / Occupied / Dirty ho sakta hai, price number hona chahiye, aur food bill minus nahi ho sakta.
- **Settlement:** total / collected / refund / advance minus nahi ho sakte.
- **Hamesha band:** bina sign-in access nahi, anjaan collection nahi, hard delete nahi.
- **Inventory entry:** edit nahi hoti, sirf soft-delete.

Har rule ka emulator par test hai (`tests/e2e/rules.spec.js`).

**Files check (round 3):**
- `Inventory/Hotel_Sky5_Inventory_Stock.xlsx` ki Stock Register sheet me example row galat thi: "SKY-GA-003 | Hotel Soap" likha tha, jabki GA-003 Napkin hai aur Soap GA-002 hai.
- Theek kiya. Purani copy `Inventory/OLD/Hotel_Sky5_Inventory_Stock_01-10-2026_v4.xlsx` me hai. PDF me ye row thi hi nahi, isliye PDF same hai.
- Naya unit test: Excel me likhe har "CODE | Name" ko item master se milata hai. Purani file par ye test fail hota.

---

## Round 4 – 1 Oct, 19:33 (deployed) · audit area: printed outputs

- **Suite:** lint 0 · unit 122 · build OK · E2E 248 passed · dist clean.
- **Live smoke:** shop 55 items, /inventory 70 items (Reorder 7, Expired/Refill 2), admin "● Live", 17 rooms, console me koi error nahi.
- **Bug:** receipt aur cleaning / checkout / laundry slips me staff ka likha naam ya remark seedha HTML me jaata tha. "<" ya quote se slip tootti thi (security risk bhi). Ab har jagah escape hota hai.
- **Receipt theek kiya:**
  - tareekh "2026-09-29T10:00" ki jagah "29 Sept 2026, 10:00 am" chhapti hai
  - GST off ho to "GST: Not applied" (₹0 wali do lines nahi)
  - zyada advance ho to "REFUND DUE TO GUEST ₹3,200", "NET PAYABLE ₹-…" nahi; "PAID & VERIFIED" stamp sirf balance 0 hone par
- **Guest form ka GST toggle:** ab asli switch hai (keyboard se bhi chalta hai).
- **Naya E2E test:** receipt escaping, date, GST-off aur refund.

---

## Round 5 – 1 Oct, 20:33 (deployed) · audit area: empty / edge states

- **Suite:** lint 0 · unit 123 · build OK · E2E 250 passed · dist clean.
- **Live smoke:** shop 55, inventory 70 (7 reorder, 2 expired/refill), admin "● Live", 17 rooms, console me koi error nahi.
- **Bug (crash):**
  - Staff registry me koi list missing ho (purana data ya manual edit) to Workforce tab poora crash ho jaata tha ("Cannot read … map").
  - Ab `normalizeRegistry` (lib/staff.js) har list ko hamesha array bana deta hai.
- **Naye tests:**
  - **E2E** `empty-states.spec.js`: khaali hotel (sab rooms clean, koi guest / order / log / staff nahi). Har OPS tab me NaN / undefined / Infinity / ₹- nahi aana chahiye, Today = 0% / ₹0, aur attendance share me "No attendance marked yet today."
  - **Unit:** normalizeRegistry.

---

## Round 6 – 1 Oct, 21:32 (deployed) · audit area: offline behaviour

- **Suite:** lint 0 · unit 123 · build OK · E2E 254 passed · dist clean.
- **Live smoke:** shop 55, inventory 70 (7 / 2), admin "● Live", 17 rooms, console me koi error nahi.
- **Bug:** internet band hone par bhi inventory "Live · synced on all devices" dikhata tha aur entry par sirf "saved" aata tha. Staff ko lagta ki sab sync ho gaya.
- **Ab:**
  - Inventory: "Offline · entries are kept on this device and sync when internet returns", aur entry ka notice "saved on this device. It will sync…".
  - OPS header: "Offline · will sync".
- **Naya E2E** `offline.spec.js`: offline me inventory OUT entry aur room check-in kiye, online aane par doosre device pe dono pahunche (Soap 115, guest dikhta hai).

---

## Round 7 – 1 Oct, 22:32 (deployed) · audit area: colour-coding consistency

- **Suite:** lint 0 · unit 127 · build OK · E2E 254 passed · dist clean.
- **Live smoke:** OK, aur live stock pills ke rang shared colours se match karte hain.
- **Bugs:**
  - Printed report me purane halke rang the (OK #15803d, REORDER #b91c1c), app se alag aur kam contrast wale.
  - PDF me CHECK COUNT laal tha (app me baingani).
  - App me MOVE bhi baingani tha, jo CHECK COUNT se takrata tha (report/PDF me MOVE neela).
- **Fix:** naya `lib/statusColors.js` ab app, report aur PDF ke liye ek hi source hai. MOVE har jagah neela, CHECK COUNT sirf baingani.
- **Naya unit test** `status-colors.test.js`:
  - app CSS = shared colours
  - har pair 4.5:1 contrast
  - ek rang = ek matlab
  - report me same CSS

---

## Round 8 – 1 Oct, 23:55 (deployed) · audit area: every-button crawler

- **Suite:** lint 0 · unit 128 · build OK · E2E 278 passed · dist clean.
- **Live smoke:** OK.
- **Naya** `button-crawler.spec.js`: har OPS tab ka har button (~146) ek-ek karke dabata hai aur check karta hai: koi crash nahi, console error nahi, NaN / undefined nahi.
- **Bug (accessibility):** 17 clickable `div` / `span` keyboard se chalte hi nahi the:
  - shop me "+" add-to-cart, category chips, neeche ke tabs, cart bar, payment options
  - admin me staff EDIT, calendar ke din
  - CCTV ke camera tiles
- **Fix:** sab par role=button + tabIndex + Enter/Space handler, aur "+" ka label "Add <item> to cart".
- **Naye tests:**
  - E2E: shop sirf keyboard se (item add karna, cart kholna).
  - Unit: koi bhi clickable div / span bina keyboard support ke wapas nahi aa sakta.

---

## Round 9 – 2 Oct, 00:45 (deployed) · audit area: phone width, every screen

- **Suite:** lint 0 · unit 128 · build OK · E2E 284 passed · dist clean.
- **Live smoke:** OK. Live 375px pe header menu hidden, bottom bar dikhta hai, overflow 0.
  - Deploy ke turant baad ek baar "503 backend read error" (Firebase Hosting, temporary) aaya; baad ki 10 requests sab 200.
- **Bug 1:** shop header ka "Home / Menu Card / Admin" menu aur rating / "GA" phone pe screen ke bahar kat jaate the (inline display:flex ki wajah se).
  - Ab ye menu sirf 1024px+ pe dikhta hai (bottom tab bar ke same breakpoint pe), aur phone pe "GA" circle hidden hai.
- **Bug 2:** shop invoice ka "INVOICE #order" hissa phone pe kat jaata tha (60px padding + negative margin). Ab phone pe padding kam hai aur header wrap hota hai. Desktop aur print same rahe.
- **Naya E2E** `phone-fit.spec.js`: 390px pe shop (home / cart / payment / invoice), staff inventory (entry / stock / basement list / history / viewer) aur saare 11 OPS tabs check hote hain. Kuch bhi screen ke bahar nahi jaana chahiye, sirf scroll-box ke andar.

---

## Round 10 – 2 Oct, 01:39 (deployed) · audit area: calculation fuzz (reports / CSV / dates)

- **Suite:** lint 0 · unit 132 · build OK · E2E 284 passed · dist clean.
- **Live smoke:** OK.
- **Bug (security):** CSV exports (stock, register, attendance) me staff ka likha text agar `=`, `+`, `-` ya `@` se shuru ho (jaise `=HYPERLINK(...)`), to Excel me file kholte hi wo formula chal jaata ("CSV injection").
  - Ab aisa text `'` ke saath plain text banta hai; asli numbers (jaise stock -3) number hi rehte hain.
  - Saare exports ab ek hi `lib/csv.js` use karte hain.
- **Bug:** attendance CSV me BOM nahi tha, isliye Excel me ₹ aur Hindi bigad jaate the. Ab BOM aur Excel line endings hain.
- **Naye fuzz tests** `fuzz-reports.test.js`:
  - 40 random registers (staff ke ajeeb text ke saath): stock CSV = calculation, status dobara nikalne par same, register CSV round-trip, summary counts add up, aur WhatsApp me har alert / item ek baar.
  - 3000 random CSV strings ka round-trip.
  - 2000 stays: dono date formats se same raatein.

---

## Round 11 – 2 Oct, 02:40 · audit area: printed outputs (menu card + inventory PDF content)

- **Suite:** lint 0 · unit 132 · build OK · E2E 286 passed.
- **Live smoke:** OK.
- **Koi naya bug nahi mila.** App code nahi badla, isliye deploy ki zaroorat nahi.
- **Naye checks:**
  - **Menu card** (VIEW CARD / print): Menu Config ka naya price card pe aata hai (Masala Papad ₹77), hidden item (Tea) gayab hota hai, aur baaki saare 54 active items card pe chhapte hain (koi chupke se drop nahi). Saari 11 beverages kisi na kisi group me hain.
  - **Inventory PDF:** pehle sirf "PDF hai aur 20KB+" check hota tha. Ab PDF ka text padh kar check hota hai: saare 70 item codes, dono locations, aur NaN / undefined nahi.

---

## Final check – 2 Oct, 09:20

- Round 12 (03:17) shuru hote hi session band ho gaya. 03:17–08:00 ke rounds aur 07:47 ki final report nahi chali.
- Subah dobara poora suite chalaya: lint 0 · unit 132 · build OK · E2E 286 passed · live site 200.
- **Raat ka total:** 11 rounds, ~30 bugs theek. Unit tests 112 → 132; E2E me naye specs (rules, offline, empty-states, button-crawler, phone-fit) jude.
