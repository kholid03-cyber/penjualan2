// js/products.js - Product management module

export class ProductManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
    }

    loadProducts(page = 1, limit = 10) {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const productsToShow = this.dashboard.products.slice(startIndex, endIndex);

        if (page === 1) {
            tbody.innerHTML = '';
        }

        productsToShow.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="font-medium text-gray-900">${product.name}</div>
                    <div class="text-sm text-gray-500">ID: ${product.id}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${this.dashboard.formatCurrency(product.price)}
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

        // Add Load More button if more products exist
        if (endIndex < this.dashboard.products.length) {
            const loadMoreRow = document.createElement('tr');
            loadMoreRow.innerHTML = `
                <td colspan="5" class="px-6 py-4 text-center">
                    <button id="loadMoreProducts" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700" onclick="loadMoreProducts(${page + 1})">
                        Load More Products
                    </button>
                </td>
            `;
            tbody.appendChild(loadMoreRow);
        }

        // Update product selects in sale form
        this.updateProductSelects();
    }

    updateProductSelects() {
        const selects = document.querySelectorAll('.product-select');
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select Product</option>';

            this.dashboard.products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} - ${this.dashboard.formatCurrency(product.price)}`;
                option.dataset.price = product.price;
                select.appendChild(option);
            });

            select.value = currentValue;
        });
    }

    handleAddProduct(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);

        const name = document.getElementById('productName').value.trim();
        const price = parseInt(document.getElementById('productPrice').value);
        const stock = parseInt(document.getElementById('productStock').value);
        const category = document.getElementById('productCategory').value;

        const validationError = this.validateProductData(name, price, stock, category);
        if (validationError) {
            this.dashboard.showNotification(validationError, 'error');
            return;
        }

        const newProduct = {
            id: this.dashboard.products.length + 1,
            name: name,
            price: price,
            costPrice: 0,
            stock: stock,
            category: category,
            minStock: 5,
            supplier: ''
        };

        this.dashboard.products.push(newProduct);
        this.loadProducts(); // Reload with pagination
        this.dashboard.hideAddProductModal();
        form.reset();

        this.dashboard.showNotification('Product added successfully!', 'success');
        this.dashboard.saveDataToStorage();
    }

    validateProductData(name, price, stock, category) {
        if (!name || name.trim().length < 2) return 'Product name must be at least 2 characters';
        if (price <= 0) return 'Price must be greater than 0';
        if (stock < 0) return 'Stock cannot be negative';
        if (!category) return 'Please select a category';
        return null;
    }

    addCategory() {
        const newCategoryName = prompt('Enter new category name:');
        if (!newCategoryName || newCategoryName.trim() === '') {
            this.dashboard.showNotification('Category name cannot be empty', 'error');
            return;
        }
        const trimmedName = newCategoryName.trim();
        if (this.dashboard.categories.includes(trimmedName)) {
            this.dashboard.showNotification('Category already exists', 'error');
            return;
        }
        this.dashboard.categories.push(trimmedName);
        localStorage.setItem('lababil-categories', JSON.stringify(this.dashboard.categories));
        this.dashboard.loadCategories();
        this.dashboard.showNotification('Category added successfully!', 'success');
    }
}
