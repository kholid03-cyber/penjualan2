// js/purchases.js - Purchase management module

export class PurchaseManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
    }

    // Note: loadRecentPurchases is now handled by dashboard.loadRecentPurchases for real-time updates

    async handleNewPurchase(e) {
        e.preventDefault();

        const supplierName = document.getElementById('supplierName').value.trim();
        const supplierPhone = document.getElementById('supplierPhone').value;

        const purchaseItems = this.collectPurchaseItems();

        const validationError = this.dashboard.validatePurchaseData(supplierName, purchaseItems);
        if (validationError) {
            this.dashboard.showNotification(validationError, 'error');
            return;
        }

        const totalItems = purchaseItems.reduce((sum, item) => sum + item.qty, 0);
        const totalCost = purchaseItems.reduce((sum, item) => sum + (item.qty * item.costPrice), 0);

        // Generate unique ID
        const id = Date.now().toString();

        const newPurchase = {
            id: id,
            date: new Date().toISOString().split('T')[0],
            supplier: supplierName,
            phone: supplierPhone,
            items: purchaseItems,
            totalItems: totalItems,
            totalCost: totalCost,
            status: 'completed',
            createdAt: new Date().toISOString(),
            createdBy: this.dashboard.user ? this.dashboard.user.username : 'Unknown'
        };

        // Save purchase and update stock via dashboard method
        const success = await this.dashboard.savePurchase(newPurchase);
        if (success) {
            // Reset form
            document.getElementById('purchaseForm').reset();
            this.resetPurchaseItems();
        }
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

    resetPurchaseItems() {
        const container = document.getElementById('purchaseItems');
        if (!container) return;

        container.innerHTML = `
            <div class="purchase-item bg-gray-50 p-4 rounded-md">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select class="product-select border-gray-300 rounded-md">
                        <option value="">Select Product</option>
                    </select>
                    <input type="number" placeholder="Quantity" class="quantity-input border-gray-300 rounded-md" min="1" value="1">
                    <input type="number" placeholder="Cost Price (Rp)" class="cost-price-input border-gray-300 rounded-md" min="0" value="0">
                    <button type="button" class="remove-item bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600">Remove</button>
                </div>
            </div>
        `;
        this.dashboard.productManager.updateProductSelects();
        this.updatePurchaseTotal();
    }

    updateTotals() {
        this.updatePurchaseTotal();
        // If sales manager exists, update sale total too
        if (this.dashboard.salesManager) {
            this.dashboard.salesManager.updateSaleTotal();
        }
    }
}
