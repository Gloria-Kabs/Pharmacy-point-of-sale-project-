/**
 * Medicine Model - Represents a medicine in the pharmacy
 * This class handles all medicine data and business rules
 */
class Medicine {
    /**
     * Create a new Medicine
     */
    constructor(data) {
        this.id = data.id || 'med_' + Date.now();
        this.name = data.name || '';
        this.category = data.category || 'General';
        this.price = parseFloat(data.price) || 0;
        this.stock = parseInt(data.stock) || 0;
        this.reorderLevel = parseInt(data.reorderLevel) || 10;
        this.expiryDate = data.expiryDate || '';
        this.description = data.description || '';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Check if medicine is low on stock
     */
    isLowStock() {
        return this.stock <= this.reorderLevel && this.stock > 0;
    }

    /**
     * Check if medicine is out of stock
     */
    isOutOfStock() {
        return this.stock <= 0;
    }

    /**
     * Get stock status for UI
     */
    getStockStatus() {
        if (this.isOutOfStock()) return 'danger';
        if (this.isLowStock()) return 'warning';
        return 'success';
    }

    /**
     * Get stock label for UI
     */
    getStockLabel() {
        if (this.isOutOfStock()) return 'Out of Stock';
        if (this.isLowStock()) return 'Low Stock';
        return 'In Stock';
    }

    /**
     * Validate medicine data
     */
    validate() {
        const errors = [];
        if (!this.name || this.name.trim() === '') {
            errors.push('Medicine name is required');
        }
        if (this.price < 0) {
            errors.push('Price cannot be negative');
        }
        if (this.stock < 0) {
            errors.push('Stock cannot be negative');
        }
        if (this.reorderLevel < 0) {
            errors.push('Reorder level cannot be negative');
        }
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Get formatted price
     */
    getFormattedPrice() {
        return `ZMW ${this.price.toFixed(2)}`;
    }

    /**
     * Update stock quantity
     */
    updateStock(quantity) {
        const newStock = this.stock + quantity;
        if (newStock < 0) return false;
        this.stock = newStock;
        this.updatedAt = new Date().toISOString();
        return true;
    }

    /**
     * Convert to plain object for storage
     */
    toObject() {
        return {
            id: this.id,
            name: this.name,
            category: this.category,
            price: this.price,
            stock: this.stock,
            reorderLevel: this.reorderLevel,
            expiryDate: this.expiryDate,
            description: this.description,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.Medicine = Medicine;
}