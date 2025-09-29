// js/dashboard.js - Enhanced dashboard functionality

class Dashboard {
    constructor() {
        this.user = null;
        this.categories = [];
        this.products = [];
        this.sales = [];
        this.purchases = [];
        this.customers = [];
        this.settings = {
            companyName: 'Lababil Solution',
            taxRate: 11,
            darkMode: false,
            lowStockThreshold: 10,
            currency: 'IDR'
        };
        this.notifications = [];
        this.isLoading = false;

        // Cache for offline support
        this.localCache = {
            categories: null,
            products: null,
            sales: null,
            purchases: null,
            customers: null,
            settings: null
        };

        // Managers will be loaded dynamically
        this.productManager = null;
        this.salesManager = null;
        this.purchaseManager = null; // Add for purchases

        // Unsubscribe functions for real-time listeners
        this.unsubscribers = [];
    }

    async runMigrationIfNeeded() {
        // Check if migration has been done
        const migrationDone = localStorage.getItem('lababil-migration-done');
        if (migrationDone) return;

        console.log('Running data migration to Firestore...');
        this.showNotification('Migrating data to cloud storage...', 'info');

        try {
            // Migrate localStorage data to Firestore
            const localProducts = JSON.parse(localStorage.getItem('lababil-products')) || [];
            const localSales = JSON.parse(localStorage.getItem('lababil-sales')) || [];
            const localPurchases = JSON.parse(localStorage.getItem('lababil-purchases')) || [];
            const localCategories = JSON.parse(localStorage.getItem('lababil-categories')) || ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports'];

            // Migrate categories
            for (const category of localCategories) {
                await addDocWithId('categories', category, { name: category });
            }

            // Migrate products
            for (const product of localProducts) {
                await addDocWithId('products', product.id.toString(), product);
            }

            // Migrate sales
            for (const sale of localSales) {
                await addDocWithId('sales', sale.id, sale);
            }

            // Migrate purchases
            for (const purchase of localPurchases) {
                await addDocWithId('purchases', purchase.id, purchase);
            }

            localStorage.setItem('lababil-migration-done', 'true');
            this.showNotification('Data migration completed!', 'success');
        } catch (error) {
            console.error('Migration error:', error);
            this.showNotification('Migration failed, using local data', 'warning');
        }
    }

    loadLocalFallbackData(type) {
        try {
            switch (type) {
                case 'categories':
                    this.categories = JSON.parse(localStorage.getItem('lababil-categories')) || ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports'];
                    break;
                case 'products':
                    this.products = JSON.parse(localStorage.getItem('lababil-products')) || [];
                    break;
                case 'sales':
                    this.sales = JSON.parse(localStorage.getItem('lababil-sales')) || [];
                    break;
                case 'purchases':
                    this.purchases = JSON.parse(localStorage.getItem('lababil-purchases')) || [];
                    break;
                case 'customers':
                    this.customers = JSON.parse(localStorage.getItem('lababil-customers')) || [];
                    break;
                case 'settings':
                    this.settings = { ...this.settings, ...JSON.parse(localStorage.getItem('lababil-settings') || '{}') };
                    break;
                default:
                    // Load all data
                    this.categories = JSON.parse(localStorage.getItem('lababil-categories')) || ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports'];
                    this.products = JSON.parse(localStorage.getItem('lababil-products')) || [];
                    this.sales = JSON.parse(localStorage.getItem('lababil-sales')) || [];
                    this.purchases = JSON.parse(localStorage.getItem('lababil-purchases')) || [];
                    this.customers = JSON.parse(localStorage.getItem('lababil-customers')) || [];
                    this.settings = { ...this.settings, ...JSON.parse(localStorage.getItem('lababil-settings') || '{}') };
                    break;
            }
        } catch (error) {
            console.error('Error loading local fallback data:', error);
        }
    }

    async init() {
        // Check Firebase configuration
        if (!isFirebaseConfigured()) {
            console.error('Firebase not configured properly');
            this.showNotification('Firebase configuration error. Please check js/firebase.js', 'error');
            // Fallback to local data if Firebase not ready
            this.loadLocalFallbackData();
            return;
        }

        this.loadUserData();
        await this.runMigrationIfNeeded();
        await this.applyRoleBasedAccess(); // Apply role restrictions first

        // Load managers dynamically for code splitting
        await this.loadManagers();

        // Load data from Firestore with loading states
        this.showLoading('section-dashboard');
        await Promise.all([
            this.loadCategoriesFromFirestore(),
            this.loadProducts(),
            this.loadSales(),
            this.loadPurchases(),
            this.loadCustomers(),
            this.loadSettings()
        ]);
        this.hideLoading('section-dashboard');

        this.loadRecentSales();
        this.loadRecentPurchases();
        this.loadReports(); // Phase 2: Load enhanced reports
        this.setupRealTimeSync(); // Phase 2: Real-time sync with Firestore listeners
        this.setupEventListeners();
        this.checkLowStock(); // Phase 2: Check for low stock on init
    }

    async loadManagers() {
        try {
            const [{ ProductManager }, { SalesManager }, { PurchaseManager }] = await Promise.all([
                import('./products.js'),
                import('./sales.js'),
                import('./purchases.js')
            ]);

            this.productManager = new ProductManager(this);
            this.salesManager = new SalesManager(this);
            this.purchaseManager = new PurchaseManager(this);
        } catch (error) {
            console.error('Failed to load managers:', error);
            this.showNotification('Failed to load application modules', 'error');
        }
    }


    loadUserData() {
        this.user = window.auth.getUser();
        if (!this.user) {
            window.location.href = '/';
            return;
        }
        this.updateUserInfo();
    }

    loadCategories() {
        const categorySelect = document.getElementById('productCategory');
        if (!categorySelect) return;

        // Keep default option
        categorySelect.innerHTML = '<option value="">Select Category</option>';

        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }

    async loadCategoriesFromFirestore() {
        try {
            const { success, data } = await getAllDocs('categories');
            if (success && Array.isArray(data)) {
                this.categories = data.map(doc => doc.name).sort();
                // Fallback to localStorage if empty
                if (this.categories.length === 0) {
                    const localCategories = JSON.parse(localStorage.getItem('lababil-categories')) || ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports'];
                    this.categories = localCategories;
                }
                this.loadCategories(); // Update the select
                localStorage.setItem('lababil-categories', JSON.stringify(this.categories)); // Cache for offline
            } else {
                console.warn('Failed to load categories from Firestore, using local fallback');
                this.loadLocalFallbackData('categories');
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            this.showNotification('Failed to load categories', 'error');
            this.loadLocalFallbackData('categories');
        }
    }

    updateCategorySelect() {
        this.loadCategories(); // Reuse existing method to update select
    }

    updateUserInfo() {
        const welcomeEl = document.getElementById('userWelcome');
        if (welcomeEl) {
            welcomeEl.textContent = `Welcome, ${this.user.name || this.user.username}`;
        }

        const elements = {
            sessionUsername: this.user.username,
            sessionRole: this.user.role,
            loginTime: this.getLoginTime()
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    getLoginTime() {
        try {
            const token = window.auth.getToken();
            const tokenData = JSON.parse(atob(token));
            return new Date(tokenData.loginTime).toLocaleString();
        } catch (e) {
            return new Date().toLocaleString();
        }
    }

    setupEventListeners() {
        // Add Product Form
        const addProductForm = document.getElementById('addProductForm');
        if (addProductForm) {
            addProductForm.addEventListener('submit', (e) => this.productManager.handleAddProduct(e));
        }

        // Sale Form
        const saleForm = document.getElementById('saleForm');
        if (saleForm) {
            saleForm.addEventListener('submit', (e) => this.salesManager.handleNewSale(e));
        }

        // Add category button
        const addCategoryBtn = document.querySelector('#addProductForm button[onclick="addCategory()"]');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => this.productManager.addCategory());
        }

        // Remove item listeners
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item')) {
                const saleItem = e.target.closest('.sale-item');
                if (saleItem) {
                    this.salesManager.removeSaleItem(e.target);
                }
            }
        });

        // Product select change listeners
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('product-select')) {
                const saleItem = e.target.closest('.sale-item');
                if (saleItem) {
                    this.salesManager.updateProductPrice(e.target);
                }
                // For purchases, no price update needed, but update total
                this.updateTotals();
            }
            if (e.target.classList.contains('quantity-input') || e.target.classList.contains('price-input') || e.target.classList.contains('cost-price-input')) {
                this.updateTotals();
            }
        });

        // Quantity input listeners
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('quantity-input') || e.target.classList.contains('cost-price-input')) {
                this.updateTotals();
            }
        });
    }

    loadProducts() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        this.products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="font-medium text-gray-900">${product.name}</div>
                    <div class="text-sm text-gray-500">ID: ${product.id}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${this.formatCurrency(product.price)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.stock > 10 ? 'bg-green-100 text-green-800' : product.stock > 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                        ${product.stock} units
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${product.category}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="editProduct(${product.id})" class="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                    <button onclick="deleteProduct(${product.id})" class="text-red-600 hover:text-red-900">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Update product selects in sale form
        this.updateProductSelects();
    }

    updateProductSelects() {
        const selects = document.querySelectorAll('.product-select');
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select Product</option>';

            this.products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} - ${this.formatCurrency(product.price)}`;
                option.dataset.price = product.price;
                select.appendChild(option);
            });

            select.value = currentValue;
        });
    }

    async loadSales() {
        try {
            const { success, data } = await getAllDocs('sales');
            if (success && Array.isArray(data)) {
                this.sales = data.sort((a, b) => new Date(b.date) - new Date(a.date));
                // Fallback to localStorage if empty
                if (this.sales.length === 0) {
                    const localSales = JSON.parse(localStorage.getItem('lababil-sales')) || [];
                    this.sales = localSales;
                }
                localStorage.setItem('lababil-sales', JSON.stringify(this.sales)); // Cache for offline
            } else {
                console.warn('Failed to load sales from Firestore, using local fallback');
                this.loadLocalFallbackData('sales');
            }
        } catch (error) {
            console.error('Error loading sales:', error);
            this.showNotification('Failed to load sales', 'error');
            this.loadLocalFallbackData('sales');
        }
    }

    async loadPurchases() {
        try {
            const { success, data } = await getAllDocs('purchases');
            if (success && Array.isArray(data)) {
                this.purchases = data.sort((a, b) => new Date(b.date) - new Date(a.date));
                // Fallback to localStorage if empty
                if (this.purchases.length === 0) {
                    const localPurchases = JSON.parse(localStorage.getItem('lababil-purchases')) || [];
                    this.purchases = localPurchases;
                }
                localStorage.setItem('lababil-purchases', JSON.stringify(this.purchases)); // Cache for offline
            } else {
                console.warn('Failed to load purchases from Firestore, using local fallback');
                this.loadLocalFallbackData('purchases');
            }
        } catch (error) {
            console.error('Error loading purchases:', error);
            this.showNotification('Failed to load purchases', 'error');
            this.loadLocalFallbackData('purchases');
        }
    }

    loadRecentSales() {
        const recentSalesContainer = document.getElementById('recentSalesList');
        if (!recentSalesContainer) return;

        const recentSales = this.sales.slice(0, 5); // Last 5 sales
        recentSalesContainer.innerHTML = '';

        if (recentSales.length === 0) {
            recentSalesContainer.innerHTML = '<p class="text-gray-500">No recent sales</p>';
            return;
        }

        recentSales.forEach(sale => {
            const saleDiv = document.createElement('div');
            saleDiv.className = 'bg-white p-4 rounded-lg shadow-sm border';
            saleDiv.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-gray-900">${sale.customer}</h4>
                        <p class="text-sm text-gray-600">${sale.date}</p>
                        <p class="text-sm text-gray-600">${sale.items.length} item(s)</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-green-600">${this.formatCurrency(sale.total)}</p>
                        <button onclick="printReceipt('${sale.id}')" class="text-xs text-blue-600 hover:text-blue-800">Print</button>
                    </div>
                </div>
            `;
            recentSalesContainer.appendChild(saleDiv);
        });
    }

    loadRecentPurchases() {
        const recentPurchasesContainer = document.getElementById('recentPurchasesList');
        if (!recentPurchasesContainer) return;

        const recentPurchases = this.purchases.slice(0, 5); // Last 5 purchases
        recentPurchasesContainer.innerHTML = '';

        if (recentPurchases.length === 0) {
            recentPurchasesContainer.innerHTML = '<p class="text-gray-500">No recent purchases</p>';
            return;
        }

        recentPurchases.forEach(purchase => {
            const purchaseDiv = document.createElement('div');
            purchaseDiv.className = 'bg-white p-4 rounded-lg shadow-sm border';
            purchaseDiv.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-gray-900">${purchase.supplier}</h4>
                        <p class="text-sm text-gray-600">${purchase.date}</p>
                        <p class="text-sm text-gray-600">${purchase.items.length} item(s)</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-blue-600">${this.formatCurrency(purchase.totalCost)}</p>
                    </div>
                </div>
            `;
            recentPurchasesContainer.appendChild(purchaseDiv);
        });
    }

    async saveSale(sale) {
        try {
            const { success } = await addDocWithId('sales', sale.id, sale);
            if (success) {
                this.sales.unshift(sale); // Add to beginning of array
                // Update product stock
                sale.items.forEach(item => {
                    const product = this.products.find(p => p.id === item.productId);
                    if (product) {
                        product.stock -= item.qty;
                    }
                });
                this.saveDataToStorage();
                this.showNotification('Sale saved successfully!', 'success');
                return true;
            } else {
                throw new Error('Failed to save to Firestore');
            }
        } catch (error) {
            console.error('Error saving sale:', error);
            this.showNotification('Failed to save sale', 'error');
            return false;
        }
    }

    async savePurchase(purchase) {
        try {
            const { success } = await addDocWithId('purchases', purchase.id, purchase);
            if (success) {
                this.purchases.unshift(purchase); // Add to beginning of array
                // Update product stock
                purchase.items.forEach(item => {
                    const product = this.products.find(p => p.id === item.productId);
                    if (product) {
                        product.stock += item.qty;
                    }
                });
                this.saveDataToStorage();
                this.showNotification('Purchase saved successfully!', 'success');
                return true;
            } else {
                throw new Error('Failed to save to Firestore');
            }
        } catch (error) {
            console.error('Error saving purchase:', error);
            this.showNotification('Failed to save purchase', 'error');
            return false;
        }
    }

    validatePurchaseData(supplierName, items) {
        if (!supplierName || supplierName.trim().length < 2) return 'Supplier name must be at least 2 characters';
        if (items.length === 0) return 'Add at least one item';
        for (let item of items) {
            if (item.qty <= 0) return 'Invalid quantity';
            if (item.costPrice <= 0) return 'Invalid cost price';
        }
        return null;
    }

    updateTotals() {
        if (this.salesManager) {
            this.salesManager.updateSaleTotal();
        }
        if (this.purchaseManager) {
            this.purchaseManager.updatePurchaseTotal();
        }
    }

    async loadCustomers() {
        try {
            const { success, data } = await getAllDocs('customers');
            if (success && Array.isArray(data)) {
                this.customers = data.sort((a, b) => a.name.localeCompare(b.name));
                // Fallback to localStorage if empty
                if (this.customers.length === 0) {
                    const localCustomers = JSON.parse(localStorage.getItem('lababil-customers')) || [];
                    this.customers = localCustomers;
                }
                localStorage.setItem('lababil-customers', JSON.stringify(this.customers)); // Cache for offline
            } else {
                console.warn('Failed to load customers from Firestore, using local fallback');
                this.loadLocalFallbackData('customers');
            }
        } catch (error) {
            console.error('Error loading customers:', error);
            this.showNotification('Failed to load customers', 'error');
            this.loadLocalFallbackData('customers');
        }
    }

    async loadSettings() {
        try {
            const { success, data } = await getAllDocs('settings');
            if (success && Array.isArray(data) && data.length > 0) {
                // Assuming settings is stored as a single document, take the first one
                this.settings = { ...this.settings, ...data[0] };
                localStorage.setItem('lababil-settings', JSON.stringify(this.settings)); // Cache for offline
            } else {
                console.warn('Failed to load settings from Firestore, using local fallback');
                this.loadLocalFallbackData('settings');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showNotification('Failed to load settings', 'error');
            this.loadLocalFallbackData('settings');
        }
    }

    printReceipt(saleId) {
        const sale = this.sales.find(s => s.id === saleId);
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
                    <h2>${this.settings.companyName}</h2>
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
                            <span>${this.formatCurrency(item.qty * item.price)}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="total">
                    <div class="item">
                        <span>Subtotal:</span>
                        <span>${this.formatCurrency(sale.total)}</span>
                    </div>
                    <div class="item">
                        <span>Tax (${this.settings.taxRate}%):</span>
                        <span>${this.formatCurrency(sale.total * this.settings.taxRate / 100)}</span>
                    </div>
                    <div class="item">
                        <span><strong>Total:</strong></span>
                        <span><strong>${this.formatCurrency(sale.total + (sale.total * this.settings.taxRate / 100))}</strong></span>
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

    // Phase 2: Enhanced inventory management with low stock alerts
    checkLowStock() {
        this.products.forEach(product => {
            if (product.stock <= product.minStock) {
                this.showNotification(`Low stock alert: ${product.name} (Stock: ${product.stock})`, 'warning');
            }
        });
    }

    // Phase 2: Enhanced reporting with analytics and simple chart
    loadReports() {
        // Calculate analytics
        const totalRevenue = this.sales.reduce((sum, sale) => sum + sale.total, 0);
        const monthlyRevenue = this.sales.filter(sale => {
            const saleDate = new Date(sale.date);
            const now = new Date();
            return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
        }).reduce((sum, sale) => sum + sale.total, 0);
        const topProduct = this.getTopProduct();

        // Calculate total COGS
        let totalCOGS = 0;
        this.sales.forEach(sale => {
            sale.items.forEach(item => {
                const product = this.products.find(p => p.name === item.name);
                if (product && product.costPrice) {
                    totalCOGS += item.qty * product.costPrice;
                }
            });
        });
        const profit = totalRevenue - totalCOGS;

        // Update report cards
        document.querySelector('#section-reports [text-3xl.font-bold.text-blue-600]').textContent = this.formatCurrency(monthlyRevenue);
        document.querySelector('#section-reports [text-3xl.font-bold.text-green-600]').textContent = this.formatCurrency(totalRevenue);
        if (topProduct) {
            document.querySelector('#section-reports [text-lg.font-bold.text-purple-600]').textContent = topProduct.name;
        }
        const profitElement = document.querySelector('.profit-value');
        if (profitElement) {
            profitElement.textContent = this.formatCurrency(profit);
        }

        // Render Chart.js charts
        this.renderProductPerformanceChart();
        this.renderInventoryChart();
    }

    getTopProduct() {
        const productSales = {};
        this.sales.forEach(sale => {
            sale.items.forEach(item => {
                productSales[item.name] = (productSales[item.name] || 0) + item.qty;
            });
        });
        return Object.keys(productSales).reduce((a, b) => productSales[a] > productSales[b] ? a : b, null);
    }

    renderProductPerformanceChart() {
        const canvas = document.getElementById('productPerformanceChart');
        if (!canvas || typeof Chart === 'undefined') return;

        // Calculate sales by product
        const productSales = {};
        this.sales.forEach(sale => {
            sale.items.forEach(item => {
                productSales[item.name] = (productSales[item.name] || 0) + (item.qty * item.price);
            });
        });

        const labels = Object.keys(productSales);
        const data = Object.values(productSales);

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Sales (Rp)',
                    data: data,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    renderInventoryChart() {
        const canvas = document.getElementById('inventoryChart');
        if (!canvas || typeof Chart === 'undefined') return;

        // Calculate stock by category
        const categoryStock = {};
        this.categories.forEach(cat => {
            categoryStock[cat] = 0;
        });
        this.products.forEach(product => {
            categoryStock[product.category] += product.stock;
        });

        const labels = Object.keys(categoryStock).filter(cat => categoryStock[cat] > 0);
        const data = labels.map(cat => categoryStock[cat]);

        new Chart(canvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(99, 102, 241, 0.8)'
                    ],
                    borderWidth: 1,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Phase 2: Real-time updates via localStorage events
    setupRealTimeSync() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'lababil-data') {
                try {
                    const data = JSON.parse(e.newValue);
                    this.products = data.products || this.products;
                    this.sales = data.sales || this.sales;
                    this.purchases = data.purchases || this.purchases;
                    this.categories = data.categories || this.categories;
                    this.loadCategories();
                    this.loadProducts();
                    this.loadRecentSales();
                    this.loadRecentPurchases();
                    this.loadReports();
                    this.showNotification('Data synced from another tab', 'info');
                } catch (error) {
                    console.error('Sync error:', error);
                }
            }
        });

        // Firestore real-time listener for categories
        const categoriesRef = getCollectionRef('categories');
        if (categoriesRef) {
            const unsubscribeCategories = onSnapshot(categoriesRef, (snapshot) => {
                const categories = [];
                snapshot.forEach((doc) => {
                    categories.push(doc.data().name);
                });
                this.categories = categories.sort();
                this.updateCategorySelect();
                localStorage.setItem('lababil-categories', JSON.stringify(this.categories));
            });
            this.unsubscribers.push(unsubscribeCategories);
        }

        // Save data to localStorage on changes
        this.saveDataToStorage = () => {
            localStorage.setItem('lababil-data', JSON.stringify({
                products: this.products,
                sales: this.sales,
                purchases: this.purchases,
                customers: this.customers,
                categories: this.categories,
                settings: this.settings
            }));
        };
    }

    // Phase 3: Enhanced error handling and validation
    validateProductData(name, price, stock, category) {
        if (!name || name.trim().length < 2) return 'Product name must be at least 2 characters';
        if (price <= 0) return 'Price must be greater than 0';
        if (stock < 0) return 'Stock cannot be negative';
        if (!category) return 'Please select a category';
        return null;
    }

    validateSaleData(customerName, items) {
        if (!customerName || customerName.trim().length < 2) return 'Customer name must be at least 2 characters';
        if (items.length === 0) return 'Add at least one item';
        for (let item of items) {
            if (item.qty <= 0 || this.products.find(p => p.id === item.productId)?.stock < item.qty) {
                return 'Invalid quantity or insufficient stock';
            }
        }
        return null;
    }

    // Phase 3: Loading states
    showLoading(elementId) {
        this.isLoading = true;
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '<div class="flex justify-center items-center py-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>';
        }
    }

    hideLoading(elementId) {
        this.isLoading = false;
        // Reload content after hiding loading
    }

    // Phase 3: Enhanced notifications with dismiss
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 max-w-sm ${
            type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
        }`;
        notification.innerHTML = `
            ${message}
            <button onclick="this.parentElement.remove()" class="ml-2 text-current opacity-70 hover:opacity-100">&times;</button>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    // Export and Import methods (fix placement)
    exportData() {
        try {
            this.showNotification('Preparing data export...', 'info');
            const data = {
                products: this.products,
                sales: this.sales,
                purchases: this.purchases,
                customers: this.customers || [],
                settings: this.settings,
                exportDate: new Date().toISOString(),
                version: '2.0.0',
                exportedBy: this.user ? this.user.username : 'Unknown'
            };
            if (!Array.isArray(data.products) || !Array.isArray(data.sales)) {
                throw new Error('Invalid data structure');
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lababil-sales-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showNotification('Data exported successfully!', 'success');
            this.saveDataToStorage();
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Failed to export data: ' + error.message, 'error');
        }
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            this.showLoading('section-settings');
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (!importedData || typeof importedData !== 'object') {
                        throw new Error('Invalid file format');
                    }
                    if (importedData.products && Array.isArray(importedData.products)) {
                        this.products = importedData.products;
                    }
                    if (importedData.sales && Array.isArray(importedData.sales)) {
                        this.sales = importedData.sales;
                    }
                    if (importedData.purchases && Array.isArray(importedData.purchases)) {
                        this.purchases = importedData.purchases;
                    }
                    if (importedData.customers && Array.isArray(importedData.customers)) {
                        this.customers = importedData.customers;
                    }
                    if (importedData.settings && typeof importedData.settings === 'object') {
                        this.settings = { ...this.settings, ...importedData.settings };
                    }
                    this.loadProducts();
                    this.loadRecentSales();
                    this.loadRecentPurchases();
                    this.loadReports();
                    this.hideLoading('section-settings');
                    this.showNotification('Data imported successfully!', 'success');
                    this.saveDataToStorage();
                } catch (error) {
                    console.error('Import error:', error);
                    this.showNotification('Failed to import data: ' + error.message, 'error');
                    this.hideLoading('section-settings');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    formatNumber(number) {
        return new Intl.NumberFormat('id-ID').format(number);
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            window.auth.logout();
        }
    }

    // Apply role-based access control
    applyRoleBasedAccess() {
        if (!this.user) return;

        const role = this.user.role;
        const navItems = {
            dashboard: document.getElementById('nav-dashboard'),
            products: document.getElementById('nav-products'),
            sales: document.getElementById('nav-sales'),
            purchases: document.getElementById('nav-purchases'),
            reports: document.getElementById('nav-reports'),
            settings: document.getElementById('nav-settings')
        };

        const sections = {
            dashboard: document.getElementById('section-dashboard'),
            products: document.getElementById('section-products'),
            sales: document.getElementById('section-sales'),
            purchases: document.getElementById('section-purchases'),
            reports: document.getElementById('section-reports'),
            settings: document.getElementById('section-settings')
        };

        // Hide all navigation items and sections first
        Object.values(navItems).forEach(item => {
            if (item) item.style.display = 'none';
        });

        Object.values(sections).forEach(section => {
            if (section) section.style.display = 'none';
        });

        // Show sections based on role
        if (role === 'kasir') {
            // Kasir can only access sales and dashboard
            if (navItems.sales) navItems.sales.style.display = 'block';
            if (navItems.dashboard) navItems.dashboard.style.display = 'block';
            if (sections.sales) sections.sales.style.display = 'block';
            if (sections.dashboard) sections.dashboard.style.display = 'block';
            // Auto-show sales section for kasir
            this.showSection('sales');
        } else if (role === 'admin1') {
            // Admin1 can only access purchases and dashboard
            if (navItems.purchases) navItems.purchases.style.display = 'block';
            if (navItems.dashboard) navItems.dashboard.style.display = 'block';
            if (sections.purchases) sections.purchases.style.display = 'block';
            if (sections.dashboard) sections.dashboard.style.display = 'block';
            // Auto-show purchases section for admin1
            this.showSection('purchases');
        } else if (role === 'admin') {
            // Admin can access everything
            Object.values(navItems).forEach(item => {
                if (item) item.style.display = 'block';
            });
            Object.values(sections).forEach(section => {
                if (section) section.style.display = 'block';
            });
            // Show dashboard by default
            this.showSection('dashboard');
        } else {
            // Default: show dashboard only
            if (navItems.dashboard) navItems.dashboard.style.display = 'block';
            if (sections.dashboard) sections.dashboard.style.display = 'block';
            this.showSection('dashboard');
        }
    }

    // Role-based showSection method
    showSection(sectionName) {
        if (!this.user) return;

        const role = this.user.role;
        const allowedSections = {
            kasir: ['dashboard', 'sales'],
            admin1: ['dashboard', 'purchases'],
            admin: ['dashboard', 'products', 'sales', 'purchases', 'reports', 'settings'],
            user: ['dashboard'],
            demo: ['dashboard']
        };

        // Check if user is allowed to access this section
        if (!allowedSections[role] || !allowedSections[role].includes(sectionName)) {
            this.showNotification('You do not have permission to access this section', 'error');
            return;
        }

        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(`section-${sectionName}`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            targetSection.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('bg-gray-100', 'text-gray-900');
            item.classList.add('text-gray-600', 'hover:bg-gray-50', 'hover:text-gray-900');
        });

        const activeNav = document.getElementById(`nav-${sectionName}`);
        if (activeNav) {
            activeNav.classList.add('bg-gray-100', 'text-gray-900');
            activeNav.classList.remove('text-gray-600', 'hover:bg-gray-50', 'hover:text-gray-900');
        }
    }
}

// Global functions for HTML onclick handlers
function showSection(sectionName) {
    if (window.dashboard && window.dashboard.user) {
        window.dashboard.showSection(sectionName);
    } else {
        // Fallback if dashboard not ready
        const targetSection = document.getElementById(`section-${sectionName}`);
        if (targetSection) {
            document.querySelectorAll('.section').forEach(section => {
                section.classList.add('hidden');
                section.classList.remove('active');
            });
            targetSection.classList.remove('hidden');
            targetSection.classList.add('active');
        }
    }
}



function showAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function hideAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function addSaleItem() {
    if (window.dashboard && window.dashboard.salesManager) {
        window.dashboard.salesManager.addSaleItem();
    }
}

function addPurchaseItem() {
    if (window.dashboard && window.dashboard.purchaseManager) {
        window.dashboard.purchaseManager.addPurchaseItem();
    }
}

function editProduct(productId) {
    alert(`Edit product functionality for ID: ${productId} - Coming soon!`);
}

function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        if (window.dashboard) {
            window.dashboard.products = window.dashboard.products.filter(p => p.id !== productId);
            window.dashboard.loadProducts();
            window.dashboard.showNotification('Product deleted successfully!', 'success');
        }
    }
}

function printReceipt(saleId) {
    if (window.dashboard) {
        window.dashboard.printReceipt(saleId);
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    
    // Update toggle button
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
        const span = toggle.querySelector('span');
        if (isDark) {
            toggle.classList.remove('bg-gray-200');
            toggle.classList.add('bg-blue-600');
            span.classList.remove('translate-x-0');
            span.classList.add('translate-x-5');
        } else {
            toggle.classList.add('bg-gray-200');
            toggle.classList.remove('bg-blue-600');
            span.classList.add('translate-x-0');
            span.classList.remove('translate-x-5');
        }
    }
    
    localStorage.setItem('darkMode', isDark);
}



function logout() {
    if (window.dashboard) {
        window.dashboard.logout();
    } else {
        window.auth.logout();
    }
}

// Initialize dashboard functionality
function initializeDashboard() {
    window.dashboard = new Dashboard();
    window.dashboard.init();
    
    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        toggleDarkMode();
    }
    
    console.log('Dashboard initialized with full functionality');
}
