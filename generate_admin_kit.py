import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from datetime import datetime

# Creates a new workbook
wb = openpyxl.Workbook()

# --- Sheet 1: Master Menu Catalog ---
ws_menu = wb.active
ws_menu.title = "Master Menu"

# Headers
headers = ["ID", "Category", "Dish Name", "Description", "Sale Price (INR)", "MRP (INR)", "Is Best Seller", "Image"]
ws_menu.append(headers)

# Data (replicating data/combos.js)
menu_data = [
    [1, "Combos", "Dal Tadka Combo", "Dal Tadka + Jeera Rice + 2 Butter Roti.", 799, 899, "Yes", "dal_tadka_roti_rice_combo_1770013924380.png"],
    [2, "Combos", "Rajma Chawal Combo", "Home-style Rajma + Steamed Rice.", 649, 749, "No", "rajma_chawal_combo_1770013948564.png"],
    [4, "Combos", "Paneer Butter Masala Combo", "Paneer Butter Masala + Steamed Rice.", 849, 949, "Yes", "paneer_butter_masala_combo_bowl_1770012612956.png"],
    [11, "Soups", "Veg Soup", "Fresh vegetable soup (350 ml).", 149, 199, "No", "Placeholder"],
    [12, "Soups", "Veg Sweet Corn Soup", "Sweet corn vegetable soup (300 ml).", 169, 219, "No", "Placeholder"],
    [13, "Starters", "Tandoori Malai Broccoli", "Creamy tandoori-style broccoli.", 349, 399, "No", "paneer_tikka_skewer_1770013745197.png"],
    [14, "Starters", "Paneer Tikka", "Grilled paneer with spices.", 329, 389, "Yes", "paneer_tikka_skewer_1770013745197.png"],
    [15, "Starters", "Chilli Paneer", "Paneer tossed in spicy sauce.", 349, 399, "Yes", "chilli_paneer_fried_rice_combo_1770012631322.png"],
    [16, "Starters", "Veg Spring Roll", "Crispy vegetable rolls.", 249, 299, "No", "hakka_noodles_veg_1770013764042.png"],
    [17, "Rice & Noodles", "Veg Fried Rice", "Classic fried rice.", 249, 299, "No", "chilli_paneer_fried_rice_combo_1770012631322.png"],
    [18, "Rice & Noodles", "Veg Hakka Noodles", "Stir-fried noodles.", 249, 299, "Yes", "hakka_noodles_veg_1770013764042.png"],
    [19, "Rice & Noodles", "Veg Chilli Garlic Noodles", "Spicy noodles.", 269, 319, "No", "hakka_noodles_veg_1770013764042.png"],
    [20, "Indian Mains", "Yellow Dal Tadka", "Lentils tempered with spices.", 299, 349, "No", "dal_tadka_roti_rice_combo_1770013924380.png"],
    [21, "Indian Mains", "Dal Makhani", "Slow-cooked creamy dal.", 349, 399, "Yes", "dal_tadka_combo_thali_1770012594484.png"],
    [22, "Indian Mains", "Paneer Butter Masala", "Rich tomato butter gravy.", 399, 449, "Yes", "paneer_butter_masala_combo_bowl_1770012612956.png"],
    [23, "Breads", "Butter Roti", "Whole wheat roti.", 45, 60, "No", "breakfast_paratha_combo_1770012647403.png"],
    [24, "Breads", "Aloo Paratha", "Stuffed potato paratha.", 129, 159, "Yes", "breakfast_paratha_combo_1770012647403.png"],
    [30, "Desserts", "Gajar Ka Halwa", "Carrot halwa.", 199, 249, "Yes", "gajar_halwa_bowl_1770013800745.png"],
    [31, "Desserts", "Rice Kheer", "Rice pudding.", 149, 199, "No", "gajar_halwa_bowl_1770013800745.png"],
    [32, "Juices", "Fresh Fruit Juice", "Orange / Watermelon / Pineapple.", 149, 199, "No", "fresh_fruit_juices_assorted_1770013780221.png"]
]

for row in menu_data:
    ws_menu.append(row)

# Styling Header
header_font = Font(bold=True, color="FFFFFF")
header_fill = PatternFill(start_color="EF4F5F", end_color="EF4F5F", fill_type="solid") # Zomato Red
for cell in ws_menu[1]:
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = Alignment(horizontal="center")

# --- Sheet 2: Daily SOP Checklist ---
ws_sop = wb.create_sheet("Daily SOP Checklist")
ws_sop.append(["ID", "Category", "Task", "Frequency", "Assigned To", "Status (Checked)"])

sop_data = [
    [1, "Ops Control", "Accepting Orders Promptly", "Daily", "Manager", ""],
    [2, "Shift Prep", "Morning Breakfast Prep (7-10 AM)", "Daily", "Chef", ""],
    [3, "Packaging", "Soup: Sealed Container + Outer Cover", "Per Order", "Packer", ""],
    [4, "Packaging", "Rice/Noodles: Rectangular Box", "Per Order", "Packer", ""],
    [5, "Packaging", "Biryani: Wide Cont. + Raita Separate", "Per Order", "Packer", ""],
    [6, "Packaging", "Soup Lids Taped Securely", "Per Order", "Packer", ""],
    [7, "Profit Control", "Portion Spoon Fixed (Cost Control)", "Continuous", "Chef", ""],
    [8, "Profit Control", "Oil Usage Controlled", "Continuous", "Chef", ""],
    [9, "Quality", "Every Order Checked Before Seal", "Per Order", "Manager", ""],
    [10, "Quality", "Raita Always with Biryani", "Per Order", "Packer", ""],
    [11, "Provisions", "Check Flour Stock", "Daily", "Store Keeper", ""],
    [12, "Provisions", "Check Salt Stock", "Daily", "Store Keeper", ""],
    [13, "Provisions", "Check Pepper Stock", "Daily", "Store Keeper", ""],
    [14, "Provisions", "Check Cheese Stock", "Daily", "Store Keeper", ""]
]

for row in sop_data:
    ws_sop.append(row)

# Style SOP Header
for cell in ws_sop[1]:
    cell.font = header_font
    cell.fill = PatternFill(start_color="333333", end_color="333333", fill_type="solid") # Dark Grey
    cell.alignment = Alignment(horizontal="center")


# --- Sheet 3: Sales Register (Template) ---
ws_sales = wb.create_sheet("Sales Register")
ws_sales.append(["Date", "Order ID", "Customer Name", "Items Ordered", "Total Amount (INR)", "Payment Mode", "Status"])
# Add a sample row
ws_sales.append([datetime.now().strftime("%Y-%m-%d"), "#ORD-001", "Rahul Sharma", "Dal Tadka Combo (x2)", 1598, "UPI", "Delivered"])

# Style Sales Header
for cell in ws_sales[1]:
    cell.font = header_font
    cell.fill = PatternFill(start_color="24963F", end_color="24963F", fill_type="solid") # Veg Green

# --- Sheet 4: Staff Attendance ---
ws_staff = wb.create_sheet("Staff Attendance")
staff_headers = ["Date", "Employee ID", "Employee Name", "Role", "Check-In Time", "Check-Out Time", "Total Hours", "Daily Wage (INR)", "Total Pay (INR)"]
ws_staff.append(staff_headers)

# Create 15 Employee placeholders
current_date = datetime.now().strftime("%Y-%m-%d")
for i in range(1, 16):
    r = i + 1 # Row number (headers are row 1)
    # Using formulas for automatic calculation
    # Assuming standard 9 hour shift for calculation example
    row_data = [
        current_date,
        f"EMP-{i:03d}",
        f"Staff Member {i}",
        "Staff",
        "09:00",
        "18:00",
        f"=(F{r}-E{r})*24", # Total Hours: (CheckOut - CheckIn) * 24
        500,               # Daily/Hourly Wage placeholder
        f"=G{r}*H{r}"      # Total Pay: Hours * Rate (assuming Hourly Rate here for formula, or adjust logic)
    ]
    ws_staff.append(row_data)

# Style Staff Header
for cell in ws_staff[1]:
    cell.font = header_font
    cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid") # Blue
    cell.alignment = Alignment(horizontal="center")

# Adjust Column Widths
for ws in [ws_menu, ws_sop, ws_sales, ws_staff]:
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter # Get the column name
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = (max_length + 2)
        ws.column_dimensions[column].width = adjusted_width

# Save
file_path = "Sky5_Kitchen_Admin_Kit.xlsx"
wb.save(file_path)
print(f"Excel file created at {file_path}")
