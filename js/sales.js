// js/sales.js - Sales management module

export class SalesManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
    }

    // Note: loadRecentSales is now handled by dashboard.loadRecentSales for real-time updates

    async handleNewSale(e) {
        e.preventDefault();

        const customerName = document.getElementById('customerName').value.trim();
        const customerPhone = document.getElementById('customerPhone').value;

        const validationError = this.dashboard.validateSaleData(customerName, this.collectSaleItems());
        if (validationError) {
            this.dashboard.showNotification(validationError, 'error');
            return;
        }

        const saleItems = this.collectSaleItems();
        const total = saleItems.reduce((sum, item) => sum + (item.qty * item.price), 0);

        // Generate unique ID
        const id = Date.now().toString();

        const newSale = {
            id: id,
            date: new Date().toISOString().split('T')[0],
            customer: customerName,
            phone: customerPhone,
            items: saleItems,
            total: total,
            status: 'completed',
            createdAt: new Date().toISOString(),
            createdBy: this.dashboard.user ? this.dashboard.user.username : 'Unknown'
        };

        // Save sale and update stock via dashboard method
        const success = await this.dashboard.saveSale(newSale);
        if (success) {
            // Reset form
            document.getElementById('saleForm').reset();
            this.resetSaleItems();

            // Ask if user wants to print receipt
            if (confirm('Sale completed! Do you want to print the receipt?')) {
                this.dashboard.printReceipt(id);
            }
        }
    }

    collectSaleItems() {
        const items = [];
        const saleItemDivs = document.querySelectorAll('.sale-item');

        saleItemDivs.forEach(div => {
            const select = div.querySelector('.product-select');
            const qtyInput = div.querySelector('.quantity-input');
            const priceInput = div.querySelector('.price-input');

            if (select.value && qtyInput.value && priceInput.value) {
                const product = this.dashboard.products.find(p => p.id === parseInt(select.value));
                items.push({
                    productId: parseInt(select.value),
                    name: product.name,
                    qty: parseInt(qtyInput.value),
                    price: parseInt(priceInput.value)
                });
            }
        });

        return items;
    }

    updateProductPrice(select) {
        const saleItem = select.closest('.sale-item');
        const priceInput = saleItem.querySelector('.price-input');

        if (select.value) {
            const product = this.dashboard.products.find(p => p.id === parseInt(select.value));
            if (product) {
                // Set default price but allow manual editing
                priceInput.value = product.price;
            }
        } else {
            // Keep current value when no product selected, allowing manual entry
            // priceInput.value = '';
        }

        this.updateSaleTotal();
    }

    updateSaleTotal() {
        const saleItems = this.collectSaleItems();
        const total = saleItems.reduce((sum, item) => sum + (item.qty * item.price), 0);

        const totalElement = document.getElementById('saleTotal');
        if (totalElement) {
            totalElement.textContent = this.dashboard.formatNumber(total);
        }
    }

    addSaleItem() {
        const saleItemsContainer = document.getElementById('saleItems');
        if (!saleItemsContainer) return;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'sale-item bg-gray-50 p-4 rounded-md';
        itemDiv.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select class="product-select border-gray-300 rounded-md">
                    <option value="">Select Product</option>
                </select>
                <input type="number" placeholder="Quantity" class="quantity-input border-gray-300 rounded-md" min="1" value="1">
                <input type="number" placeholder="Price (Rp)" class="price-input border-gray-300 rounded-md" min="0">
                <button type="button" class="remove-item bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600">Remove</button>
            </div>
        `;

        saleItemsContainer.appendChild(itemDiv);
        this.dashboard.productManager.updateProductSelects();

        // Add event listeners for dynamic total updates
        this.addDynamicUpdateListeners(itemDiv);
    }

    addDynamicUpdateListeners(itemDiv) {
        const priceInput = itemDiv.querySelector('.price-input');
        const qtyInput = itemDiv.querySelector('.quantity-input');

        if (priceInput) {
            priceInput.addEventListener('input', () => this.updateSaleTotal());
        }
        if (qtyInput) {
            qtyInput.addEventListener('input', () => this.updateSaleTotal());
        }
    }

    removeSaleItem(button) {
        const saleItem = button.closest('.sale-item');
        saleItem.remove();
        this.updateTotals();
    }

    resetSaleItems() {
        const container = document.getElementById('saleItems');
        if (!container) return;

        container.innerHTML = `
            <div class="sale-item bg-gray-50 p-4 rounded-md">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select class="product-select border-gray-300 rounded-md">
                        <option value="">Select Product</option>
                    </select>
                    <input type="number" placeholder="Quantity" class="quantity-input border-gray-300 rounded-md" min="1" value="1">
                    <input type="number" placeholder="Price (Rp)" class="price-input border-gray-300 rounded-md" min="0">
                    <button type="button" class="remove-item bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600">Remove</button>
                </div>
            </div>
        `;
        this.dashboard.productManager.updateProductSelects();
        this.updateSaleTotal();
    }

    updateTotals() {
        this.updateSaleTotal();
        // If purchase manager exists, update purchase total too
        if (this.dashboard.purchaseManager) {
            this.dashboard.purchaseManager.updatePurchaseTotal();
        }
    }

    printReceipt(saleId) {
        const sale = this.dashboard.sales.find(s => s.id === saleId);
        if (!sale) return;

        const receiptWindow = window.open('', '_blank');
        const receiptContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - ${sale.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
                    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                    .item { display: flex; justify-content: space-between; margin: 5px 0; }
                    .total { border-top: 1px solid #000; padding-top: 10px; margin-top: 15px; font-weight: bold; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>${this.dashboard.settings.companyName}</h2>
                    <p>Sales Receipt</p>
                    <p>Date: ${sale.date}</p>
                    <p>Receipt #: ${sale.id}</p>
                </div>

                <div class="customer">
                    <p><strong>Customer:</strong> ${sale.customer}</p>
                    <p><strong>Phone:</strong> ${sale.phone}</p>
                </div>

                <div class="items">
                    <h3>Items:</h3>
                    ${sale.items.map(item => `
                        <div class="item">
                            <span>${item.name} x${item.qty}</span>
                            <span>${this.dashboard.formatCurrency(item.qty * item.price)}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="total">
                    <div class="item">
                        <span>Subtotal:</span>
                        <span>${this.dashboard.formatCurrency(sale.total)}</span>
                    </div>
                    <div class="item">
                        <span>Tax (${this.dashboard.settings.taxRate}%):</span>
                        <span>${this.dashboard.formatCurrency(sale.total * this.dashboard.settings.taxRate / 100)}</span>
                    </div>
                    <div class="item">
                        <span><strong>Total:</strong></span>
                        <span><strong>${this.dashboard.formatCurrency(sale.total + (sale.total * this.dashboard.settings.taxRate / 100))}</strong></span>
                    </div>
                </div>

                <div class="footer">
                    <p>Thank you for your business!</p>
                    <p>Powered by Lababil Sales System v2.0</p>
                </div>
            </body>
            </html>
        `;

        receiptWindow.document.write(receiptContent);
        receiptWindow.document.close();
        receiptWindow.print();
    }
}
