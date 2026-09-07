/**
 * InventoryController - Manages all medicine inventory operations
 * This is the business logic layer for inventory management
 */
class InventoryController {
    /**
     * Get all medicines
     */
    static getAll() {
        const storage = new StorageService();
        const medicines = storage.findAll('medicines') || [];
        return medicines.map(m => new Medicine(m));
    }

    /**
     * Get a single medicine by ID
     */
    static getById(id) {
        const storage = new StorageService();
        const medicine = storage.findById('medicines', id);
        return medicine ? new Medicine(medicine) : null;
    }

    /**
     * Add a new medicine
     */
    static add(data) {
        const medicine = new Medicine(data);
        const validation = medicine.validate();
        
        if (!validation.valid) {
            return { 
                success: false, 
                errors: validation.errors 
            };
        }

        // Check for duplicate name
        const existing = this.getAll().find(m => 
            m.name.toLowerCase() === medicine.name.toLowerCase()
        );
        if (existing) {
            return {
                success: false,
                errors: [`Medicine "${medicine.name}" already exists`]
            };
        }

        const storage = new StorageService();
        const saved = storage.save('medicines', medicine.toObject());
        
        return {
            success: true,
            medicine: new Medicine(saved),
            errors: []
        };
    }

    /**
     * Update an existing medicine
     */
    static update(id, data) {
        const existing = this.getById(id);
        if (!existing) {
            return {
                success: false,
                errors: ['Medicine not found']
            };
        }

        const updated = new Medicine({
            ...existing.toObject(),
            ...data,
            id: id,
            updatedAt: new Date().toISOString()
        });

        const validation = updated.validate();
        if (!validation.valid) {
            return {
                success: false,
                errors: validation.errors
            };
        }

        // Check for duplicate name (excluding self)
        const duplicate = this.getAll().find(m => 
            m.name.toLowerCase() === updated.name.toLowerCase() && 
            m.id !== id
        );
        if (duplicate) {
            return {
                success: false,
                errors: [`Medicine "${updated.name}" already exists`]
            };
        }

        const storage = new StorageService();
        const saved = storage.save('medicines', updated.toObject());
        
        return {
            success: true,
            medicine: new Medicine(saved),
            errors: []
        };
    }

    /**
     * Delete a medicine by ID
     */
    static delete(id) {
        const existing = this.getById(id);
        if (!existing) {
            return {
                success: false,
                errors: ['Medicine not found']
            };
        }

        // Check if medicine is used in active prescriptions
        const storage = new StorageService();
        const prescriptions = storage.findAll('prescriptions') || [];
        const inUse = prescriptions.some(p => 
            p.status === 'ACTIVE' && 
            p.items.some(i => i.medicineId === id)
        );
        if (inUse) {
            return {
                success: false,
                errors: ['Cannot delete medicine used in active prescriptions']
            };
        }

        storage.delete('medicines', id);
        return {
            success: true,
            errors: []
        };
    }

    /**
     * Search medicines by name or category
     */
    static search(query) {
        if (!query || query.trim() === '') {
            return this.getAll();
        }
        const q = query.toLowerCase().trim();
        return this.getAll().filter(m => 
            m.name.toLowerCase().includes(q) ||
            m.category.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q)
        );
    }

    /**
     * Get all low stock medicines
     */
    static getLowStock() {
        return this.getAll().filter(m => m.isLowStock());
    }

    /**
     * Get all out of stock medicines
     */
    static getOutOfStock() {
        return this.getAll().filter(m => m.isOutOfStock());
    }

    /**
     * Get summary statistics
     */
    static getStats() {
        const all = this.getAll();
        return {
            total: all.length,
            lowStock: all.filter(m => m.isLowStock()).length,
            outOfStock: all.filter(m => m.isOutOfStock()).length,
            totalValue: all.reduce((sum, m) => sum + (m.price * m.stock), 0)
        };
    }

    /**
     * Update stock quantity
     */
    static updateStock(id, quantity) {
        const medicine = this.getById(id);
        if (!medicine) {
            return {
                success: false,
                errors: ['Medicine not found']
            };
        }

        if (!medicine.updateStock(quantity)) {
            return {
                success: false,
                errors: ['Insufficient stock for reduction']
            };
        }

        const storage = new StorageService();
        const saved = storage.save('medicines', medicine.toObject());
        
        return {
            success: true,
            medicine: new Medicine(saved),
            errors: []
        };
    }

    /**
     * Get expired medicines
     */
    static getExpired() {
        const today = new Date().toISOString().split('T')[0];
        return this.getAll().filter(m => 
            m.expiryDate && m.expiryDate < today
        );
    }

    /**
     * Get expiring soon (within 30 days)
     */
    static getExpiringSoon() {
        const today = new Date();
        const thirtyDaysLater = new Date(today);
        thirtyDaysLater.setDate(today.getDate() + 30);
        const todayStr = today.toISOString().split('T')[0];
        const laterStr = thirtyDaysLater.toISOString().split('T')[0];
        
        return this.getAll().filter(m => 
            m.expiryDate && 
            m.expiryDate > todayStr && 
            m.expiryDate <= laterStr
        );
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.InventoryController = InventoryController;
}