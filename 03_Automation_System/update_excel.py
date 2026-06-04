import json
import openpyxl
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill

# Load combos from JSON
combos_json_path = '03_Automation_System/combos.json'
with open(combos_json_path, 'r', encoding='utf-8') as f:
    combos = json.load(f)

# Load Excel workbook
excel_path = 'Hotel_Sky5_Market_Pricing_Audit.xlsx'
wb = openpyxl.load_workbook(excel_path)
sheet = wb.active

# Category mapping
cat_map = {
    'Breakfast': 'Breakfast',
    'Snacks': 'Snacks',
    'Salad': 'Salads',
    'Chinese': 'Chinese',
    'Rice': 'Rice',
    'Breads': 'Breads',
    'Thalis': 'Combos & Thalis',
    'Sweet Dish': 'Desserts',
    'Beverages': 'Beverages'
}

def get_main_course_category(item):
    if item['category'] == 'Main Course':
        if '🔴' in item['description']:
            return 'Non-Veg Main Course'
        else:
            return 'Veg Main Course'
    return cat_map.get(item['category'], item['category'])

# 1. Locate Average row and save styles
avg_row_idx = None
for r in range(2, sheet.max_row + 1):
    val = sheet.cell(row=r, column=1).value
    if val == 'Average':
        avg_row_idx = r
        break

# If average row is not found, default to row 48
if avg_row_idx is None:
    avg_row_idx = 48

# Save styles from row 2 (standard data) and average row
data_style_row = 2
ref_data_cells = [sheet.cell(row=data_style_row, column=c) for c in range(1, 9)]
ref_avg_cells = [sheet.cell(row=avg_row_idx, column=c) for c in range(1, 9)]

class SavedStyle:
    def __init__(self, cell):
        self.font = Font(name=cell.font.name, size=cell.font.size, bold=cell.font.bold, italic=cell.font.italic, color=cell.font.color) if cell.font else None
        self.alignment = Alignment(horizontal=cell.alignment.horizontal, vertical=cell.alignment.vertical, wrap_text=cell.alignment.wrap_text) if cell.alignment else None
        self.border = Border(left=cell.border.left, right=cell.border.right, top=cell.border.top, bottom=cell.border.bottom) if cell.border else None
        self.fill = PatternFill(fill_type=cell.fill.fill_type, start_color=cell.fill.start_color, end_color=cell.fill.end_color) if cell.fill and cell.fill.fill_type else None
        self.number_format = cell.number_format

saved_data_styles = [SavedStyle(c) for c in ref_data_cells]
saved_avg_styles = [SavedStyle(c) for c in ref_avg_cells]

def apply_saved_style(saved_style, dest_cell):
    if saved_style.font:
        dest_cell.font = saved_style.font
    if saved_style.alignment:
        dest_cell.alignment = saved_style.alignment
    if saved_style.border:
        dest_cell.border = saved_style.border
    if saved_style.fill:
        dest_cell.fill = saved_style.fill
    dest_cell.number_format = saved_style.number_format

# 2. Clear all rows from row 2 onwards
max_row = sheet.max_row
sheet.delete_rows(2, max_row)

# 3. Write active menu items
next_row = 2
for item in combos:
    cat = get_main_course_category(item)
    name = item['name']
    sky5_price = item['price']
    market_price = sky5_price + 5
    
    # Decide Strategy
    strategy = 'Competitive Entry'
    if cat == 'Beverages':
        strategy = 'High Frequency Item'
    elif cat == 'Desserts':
        strategy = 'Sweet Upsell'
    elif 'Thali' in name or 'Combo' in name:
        strategy = 'High Value Combo'
        
    # Formulas for Diff and Savings
    diff_formula = f"=D{next_row}-C{next_row}"
    savings_formula = f"=E{next_row}/D{next_row}" # Store as fraction, let format convert to %
    
    row_data = [cat, name, sky5_price, market_price, diff_formula, savings_formula, strategy]
    
    for c, val in enumerate(row_data, 1):
        cell = sheet.cell(row=next_row, column=c, value=val)
        apply_saved_style(saved_data_styles[c - 1], cell)
        
        # Apply standard formats
        if c in [3, 4, 5]:
            cell.number_format = '₹#,##0'
        elif c == 6:
            cell.number_format = '0.00%' # Standard Excel percentage format
            
    print(f"Row {next_row} written: '{name}' -> Sky5: {sky5_price}")
    next_row += 1

# 4. Write Average row at the end
avg_row_num = next_row
end_item_row = avg_row_num - 1

avg_row_data = [
    'Average',
    None,
    f"=AVERAGE(C2:C{end_item_row})",
    f"=AVERAGE(D2:D{end_item_row})",
    f"=AVERAGE(E2:E{end_item_row})",
    f"=AVERAGE(F2:F{end_item_row})",
    None
]

for c, val in enumerate(avg_row_data, 1):
    cell = sheet.cell(row=avg_row_num, column=c, value=val)
    apply_saved_style(saved_avg_styles[c - 1], cell)
    
    # Make sure formatting is correct
    if c in [3, 4, 5]:
        cell.number_format = '₹#,##0'
    elif c == 6:
        cell.number_format = '0.00%'

print(f"Row {avg_row_num} (Average) written: C2:C{end_item_row}")

# Save the workbook
wb.save(excel_path)
print("Excel sheet rebuilt, synchronized, and saved successfully!")
