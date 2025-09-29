y# Lababil Sales System Dashboard Fixes - TODO

## Overview
This TODO tracks implementation of fixes for dashboard issues:
- Enable manual price editing in sales.
- Add cost price input in purchases, update product costPrice, calculate monetary totals.
- Add profit calculation in reports (revenue - COGS using costPrice).
- Enable dynamic category addition in add product modal.

## Steps

### 1. Update UI in admin-dashboard.html
- [x] Remove 'readonly' from sales price input.
- [x] Add cost price input to purchase item grid (make 4 columns: product, qty, cost price, remove).
- [x] Update purchase total display to "Total Cost: Rp <span id='purchaseTotal'>0</span>".
- [x] Add profit card in reports section: New div with classes matching others, e.g., <div class="bg-white shadow rounded-lg p-6 profit-card"><h3 class="text-lg font-medium text-gray-900 mb-4">Total Profit</h3><div class="text-3xl font-bold text-green-600 profit-value">Rp 0</div><p class="text-sm text-gray-500">Overall profit (Revenue - COGS)</p></div>.
- [x] In add product modal: Add button after category select: <button type="button" onclick="addCategory()" class="text-sm text-blue-600 hover:text-blue-800">+ Add New Category</button>. Ensure category select is dynamic.

### 2. Update Logic in js/dashboard.js
- [x] Add this.categories = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports']; in constructor.
- [x] Add addCategory() method: Prompt/input for name, validate (non-empty, unique), push to categories, update modal select options, save to localStorage.
- [x] In updateProductSelects(): No change, but for categories, add loadCategories() to populate modal select on init and after add.
- [x] In addPurchaseItem(): Update HTML grid to md:grid-cols-4, add <input type="number" placeholder="Cost Price" class="cost-price-input border-gray-300 rounded-md" min="0" value="0"> before remove button.
- [x] In handleNewPurchase(): For each item, product.costPrice = Math.max(item.costPrice, product.costPrice || 0); // Use new if higher or set if none. totalCost = sum(qty * costPrice), add to newPurchase.totalCost. Update display: document.getElementById('purchaseTotal').textContent = this.formatCurrency(totalCost);
- [x] In updatePurchaseTotal(): Collect items with costPrice, sum(qty * costPrice), formatCurrency.
- [x] In updateProductPrice() for sales: Set initial price but allow edit (already via input).
- [x] In loadReports(): Calculate totalCOGS = 0; this.sales.forEach(sale => sale.items.forEach(item => { const product = this.products.find(p => p.name === item.name); if (product) totalCOGS += item.qty * (product.costPrice || 0); })); const profit = totalRevenue - totalCOGS; Then document.querySelector('.profit-value').textContent = this.formatCurrency(profit);
- [x] In setupRealTimeSync() and saveDataToStorage(): Include categories in data.
- [x] In handleAddProduct(): Set newProduct.category from select.value; if new category added, ensure it's in list.

### 3. Testing
- [ ] Purchases: Add item with cost, process – verify stock += qty, costPrice updated, totalCost correct.
- [ ] Sales: Select product, edit price/qty, process – verify total uses edited values, stock -= qty.
- [ ] Reports: Simulate buy (set costPrice), sell – verify profit = sum(sell prices) - sum(qty * costPrice).
- [ ] Categories: Click add, enter new, select for product – verify saves, appears in future selects.
- [ ] Edges: Negative cost/price (prevent via min=0), insufficient stock (already in validateSaleData), duplicate categories (check uniqueness).

### 4. Verification
- [ ] Use browser_action to launch admin-dashboard.html, login as admin, test each section.
- [ ] Check localStorage for saved data including categories.
- [ ] Update TODO.md as steps complete.

Last updated: Current session
