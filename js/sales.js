// js/sales.js - Sales management module

export class SalesManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
    }

    loadRecentSales(page = 1, limit = 10) {
        const tbody = document.getElementById('recentSalesBody');
        if (!tbody) return;

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const salesToShow = this.dashboard.sales.slice().reverse().slice(startIndex, endIndex);

        if (page === 1) {
            tbody.innerHTML = '';
        }

        salesToShow.forEach(sale => {
            const row = document.createElement('tr');
            const itemsText = sale.items.map(item => `${item.name} (${item.qty})`).join(', ');

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${sale.date}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="font-medium text-gray-900">${sale.customer}</div>
                    <div class="text-sm text-gray-500">${sale.phone}</div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">${itemsText}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    ${this.dashboard.formatCurrency(sale.total)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="printReceipt(${sale.id})" class="text-blue-600 hover:text-blue-900">Print</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add Load More button if more sales exist
        if (endIndex < this.dashboard.sales.length) {
            const loadMoreRow = document.createElement('tr');
            loadMoreRow.innerHTML = `
                <td colspan="5" class="px-6 py-4 text-center">
                    <button id="loadMoreSales" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700" onclick="loadMoreSales(${page + 1})">
                        Load More Sales
                    </button>
                </td>
            `;
            tbody.appendChild(loadMoreRow);
        }
    }

    handleNewSale(e) {
        e.preventDefault();

        const customerName = document.getElementById('customerName').value;
        const customerPhone = document.getElementById('customerPhone').value;

        if (!customerName.trim()) {
            this.dashboard.showNotification('Please enter customer name', 'error');
            return;
        }

        const saleItems = this.collectSaleItems();

        if (saleItems.length === 0) {
            this.dashboard.showNotification('Please add at least one item', 'error');
            return;
        }

        const total = saleItems.reduce((sum, item) => sum + (item.qty * item.price), 0);

        const newSale = {
            id: this.dashboard.sales.length + 1,
            date: new Date().toISOString().split('T')[0],
            customer: customerName,
            phone: customerPhone,
            items: saleItems,
            total: total
        };

        // Update stock
        saleItems.forEach(saleItem => {
            const product = this.dashboard.products.find(p => p.id === saleItem.productId);
            if (product) {
                product.stock -= saleItem.qty;
            }
        });

        this.dashboard.sales.push(newSale);
        this.loadRecentSales(); // Reload with pagination
        this.dashboard.productManager.loadProducts();
        this.dashboard.loadReports();

        // Reset form
        document.getElementById('saleForm').reset();
        this.resetSaleItems();

        this.dashboard.showNotification('Sale processed successfully!', 'success');

        // Ask if user wants to print receipt
        if (confirm('Sale completed! Do you want to print the receipt?')) {
            this.dashboard.printReceipt(newSale.id);
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
                priceInput.value = product.price;
                priceInput.removeAttribute('readonly'); // Allow editing
            }
        } else {
            priceInput.value = '';
            priceInput.setAttribute('readonly', true);
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
