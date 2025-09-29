// js/purchases.js - Purchase management module

export class PurchaseManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
    }

    loadRecentPurchases(page = 1, limit = 10) {
        const tbody = document.getElementById('recentPurchasesBody');
        if (!tbody) return;

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const purchasesToShow = this.dashboard.purchases.slice().reverse().slice(startIndex, endIndex);

        if (page === 1) {
            tbody.innerHTML = '';
        }

        purchasesToShow.forEach(purchase => {
            const row = document.createElement('tr');
            const itemsText = purchase.items.map(item => `${item.name} (${item.qty})`).join(', ');

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${purchase.date}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="font-medium text-gray-900">${purchase.supplier}</div>
                    <div class="text-sm text-gray-500">${purchase.phone}</div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">${itemsText}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    ${purchase.totalItems}
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add Load More button if more purchases exist
        if (endIndex < this.dashboard.purchases.length) {
            const loadMoreRow = document.createElement('tr');
            loadMoreRow.innerHTML = `
                <td colspan="4" class="px-6 py-4 text-center">
                    <button id="loadMorePurchases" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700" onclick="loadMorePurchases(${page + 1})">
                        Load More Purchases
                    </button>
                </td>
            `;
            tbody.appendChild(loadMoreRow);
        }
    }

    handleNewPurchase(e) {
        e.preventDefault();

        const supplierName = document.getElementById('supplierName').value.trim();
        const supplierPhone = document.getElementById('supplierPhone').value;

        if (!supplierName) {
            this.dashboard.showNotification('Please enter supplier name', 'error');
            return;
        }

        const purchaseItems = this.collectPurchaseItems();

        if (purchaseItems.length === 0) {
            this.dashboard.showNotification('Please add at least one item', 'error');
            return;
        }

        const totalItems = purchaseItems.reduce((sum, item) => sum + item.qty, 0);
        const totalCost = purchaseItems.reduce((sum, item) => sum + (item.qty * item.costPrice), 0);

        const newPurchase = {
            id: this.dashboard.purchases.length + 1,
            date: new Date().toISOString().split('T')[0],
            supplier: supplierName,
            phone: supplierPhone,
            items: purchaseItems,
            totalItems: totalItems,
            totalCost: totalCost
        };

        // Update stock and costPrice
        purchaseItems.forEach(purchaseItem => {
            const product = this.dashboard.products.find(p => p.id === purchaseItem.productId);
            if (product) {
                product.stock += purchaseItem.qty;
                if (purchaseItem.costPrice > (product.costPrice || 0)) {
                    product.costPrice = purchaseItem.costPrice;
                }
            }
        });

        this.dashboard.purchases.push(newPurchase);
        this.loadRecentPurchases(); // Reload with pagination
        this.dashboard.productManager.loadProducts();
        this.dashboard.loadReports();

        // Reset form
        document.getElementById('purchaseForm').reset();

        this.dashboard.showNotification('Purchase processed successfully!', 'success');
        this.dashboard.saveDataToStorage();
    }

    collectPurchaseItems() {
        const items = [];
        const purchaseItemDivs = document.querySelectorAll('.purchase-item');

        purchaseItemDivs.forEach(div => {
            const select = div.querySelector('.product-select');
            const qtyInput = div.querySelector('.quantity-input');
            const costInput = div.querySelector('.cost-price-input');

            if (select.value && qtyInput.value) {
                const product = this.dashboard.products.find(p => p.id === parseInt(select.value));
                items.push({
                    productId: parseInt(select.value),
                    name: product.name,
                    qty: parseInt(qtyInput.value),
                    costPrice: parseInt(costInput.value) || 0
                });
            }
        });

        return items;
    }

    updatePurchaseTotal() {
        const purchaseItems = this.collectPurchaseItems();
        const totalCost = purchaseItems.reduce((sum, item) => sum + (item.qty * item.costPrice), 0);

        const totalElement = document.getElementById('purchaseTotal');
        if (totalElement) {
            totalElement.textContent = this.dashboard.formatCurrency(totalCost);
        }
    }

    addPurchaseItem() {
        const purchaseItemsContainer = document.getElementById('purchaseItems');
        if (!purchaseItemsContainer) return;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'purchase-item bg-gray-50 p-4 rounded-md';
        itemDiv.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select class="product-select border-gray-300 rounded-md">
                    <option value="">Select Product</option>
                </select>
                <input type="number" placeholder="Quantity" class="quantity-input border-gray-300 rounded-md" min="1" value="1">
                <input type="number" placeholder="Cost Price (Rp)" class="cost-price-input border-gray-300 rounded-md" min="0" value="0">
                <button type="button" class="remove-item bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600">Remove</button>
            </div>
        `;

        purchaseItemsContainer.appendChild(itemDiv);
        this.dashboard.productManager.updateProductSelects();
    }



    updateTotals() {
        this.updatePurchaseTotal();
        // If sales manager exists, update sale total too
        if (this.dashboard.salesManager) {
            this.dashboard.salesManager.updateSaleTotal();
        }
    }
}
