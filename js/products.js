import { getAllDocs, addDocWithId } from './firebase.js';

// js/products.js - Product management module

export class ProductManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
    }

    // Note: loadProducts is now handled by dashboard.renderProductsTable for real-time updates
    // This method is kept for backward compatibility but uses dashboard methods

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

    async handleAddProduct(e) {
        e.preventDefault();

        const form = e.target;

        const name = document.getElementById('productName').value.trim();
        const price = parseFloat(document.getElementById('productPrice').value);
        const costPrice = parseFloat(document.getElementById('productCostPrice')?.value || 0);
        const stock = parseInt(document.getElementById('productStock').value);
        const category = document.getElementById('productCategory').value;
        const minStock = parseInt(document.getElementById('productMinStock')?.value || 5);
        const supplier = document.getElementById('productSupplier')?.value || '';

        const validationError = this.dashboard.validateProductData(name, price, stock, category, costPrice);
        if (validationError) {
            this.dashboard.showNotification(validationError, 'error');
            return;
        }

        // Generate unique ID
        const id = Date.now().toString();

        const newProduct = {
            id: id,
            name: name,
            price: price,
            costPrice: costPrice,
            stock: stock,
            category: category,
            minStock: minStock,
            supplier: supplier,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const success = await this.dashboard.saveProduct(newProduct);
        if (success) {
            this.dashboard.hideAddProductModal();
            form.reset();
        }
    }

    async addCategory() {
        const newCategoryName = prompt('Enter new category name:');
        if (!newCategoryName || newCategoryName.trim() === '') {
            this.dashboard.showNotification('Category name cannot be empty', 'error');
            return;
        }
        const trimmedName = newCategoryName.trim();

        try {
            // Fetch existing categories from Firestore for uniqueness check
            const { success, data: existingCategories } = await getAllDocs('categories');
            if (!success) {
                throw new Error('Failed to fetch categories');
            }

            const categoryNames = existingCategories.map(cat => cat.name.toLowerCase());
            if (categoryNames.includes(trimmedName.toLowerCase())) {
                this.dashboard.showNotification('Category already exists', 'error');
                return;
            }

            // Generate unique ID for new category
            const categoryId = Date.now().toString();

            // Add new category to Firestore
            const addResult = await addDocWithId('categories', categoryId, { name: trimmedName });
            if (!addResult.success) {
                throw new Error('Failed to add category');
            }

            // Update local categories array
            this.dashboard.categories.push({ id: categoryId, name: trimmedName });
            this.dashboard.localCache.categories = [...this.dashboard.categories];

            // Update UI
            this.dashboard.updateCategorySelect();
            this.dashboard.showNotification('Category added successfully!', 'success');
        } catch (error) {
            console.error('Error adding category:', error);
            this.dashboard.showNotification('Error adding category', 'error');
        }
    }

    async saveCategoriesToFirestore() {
        try {
            // Save categories as documents in categories collection
            const batch = [];
            this.dashboard.categories.forEach((category, index) => {
                batch.push(addDocWithId('categories', `cat_${index}`, { name: category }));
            });

            // Execute batch
            await Promise.all(batch);
            this.dashboard.localCache.categories = [...this.dashboard.categories];
            localStorage.setItem('lababil-categories', JSON.stringify(this.dashboard.categories));
        } catch (error) {
            console.error('Error saving categories:', error);
            this.dashboard.showNotification('Error saving category to database', 'error');
        }
    }

    async editProduct(productId) {
        const product = this.dashboard.products.find(p => p.id === productId);
        if (!product) {
            this.dashboard.showNotification('Product not found', 'error');
            return;
        }

        // Populate edit form (assuming there's an edit modal)
        const editModal = document.getElementById('editProductModal');
        if (!editModal) {
            this.dashboard.showNotification('Edit functionality not implemented yet', 'warning');
            return;
        }

        // Populate form fields
        document.getElementById('editProductId').value = product.id;
        document.getElementById('editProductName').value = product.name;
        document.getElementById('editProductPrice').value = product.price;
        document.getElementById('editProductCostPrice').value = product.costPrice || 0;
        document.getElementById('editProductStock').value = product.stock;
        document.getElementById('editProductCategory').value = product.category;
        document.getElementById('editProductMinStock').value = product.minStock || 5;
        document.getElementById('editProductSupplier').value = product.supplier || '';

        // Show modal
        editModal.classList.remove('hidden');
        editModal.classList.add('flex');
    }

    async handleEditProduct(e) {
        e.preventDefault();

        const id = document.getElementById('editProductId').value;
        const name = document.getElementById('editProductName').value.trim();
        const price = parseFloat(document.getElementById('editProductPrice').value);
        const costPrice = parseFloat(document.getElementById('editProductCostPrice').value || 0);
        const stock = parseInt(document.getElementById('editProductStock').value);
        const category = document.getElementById('editProductCategory').value;
        const minStock = parseInt(document.getElementById('editProductMinStock').value || 5);
        const supplier = document.getElementById('editProductSupplier').value || '';

        const validationError = this.dashboard.validateProductData(name, price, stock, category, costPrice);
        if (validationError) {
            this.dashboard.showNotification(validationError, 'error');
            return;
        }

        const updatedProduct = {
            id: id,
            name: name,
            price: price,
            costPrice: costPrice,
            stock: stock,
            category: category,
            minStock: minStock,
            supplier: supplier,
            updatedAt: new Date().toISOString()
        };

        const success = await this.dashboard.updateProduct(id, updatedProduct);
        if (success) {
            document.getElementById('editProductModal').classList.add('hidden');
            document.getElementById('editProductModal').classList.remove('flex');
            e.target.reset();
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        const success = await this.dashboard.deleteProduct(productId);
        if (success) {
            // Product deletion is handled by the real-time listener in dashboard
        }
    }
}
