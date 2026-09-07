/**
 * InventoryController - Manages all medicine inventory operations
 * Handles CRUD, search, stock alerts, and statistics
 */
class InventoryController {
    // Get all medicines
    static getAll() {
        try {
            const storage = new StorageService();
            const medicines = storage.findAll('medicines') || [];
            return medicines.map(m => new Medicine(m));
        } catch (e) {
            console.error('Error fetching medicines:', e);
            return [];
        }
    }

    // Get a single medicine by ID
    static getById(id) {
        try {
            const storage = new StorageService();
            const medicine = storage.findById('medicines', id);
            return medicine ? new Medicine(medicine) : null;
        } catch (e) {
            console.error('Error fetching medicine:', e);
            return null;
        }
    }

    // Add a new medicine
    static add(data) {
        try {
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
        } catch (e) {
            console.error('Error adding medicine:', e);
            return {
                success: false,
                errors: ['Failed to add medicine. Please try again.']
            };
        }
    }

    // Update an existing medicine
    static update(id, data) {
        try {
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
        } catch (e) {
            console.error('Error updating medicine:', e);
            return {
                success: false,
                errors: ['Failed to update medicine. Please try again.']
            };
        }
    }

    // Delete a medicine by ID
    static delete(id) {
        try {
            const existing = this.getById(id);
            if (!existing) {
                return {
                    success: false,
                    errors: ['Medicine not found']
                };
            }

            const storage = new StorageService();
            storage.delete('medicines', id);
            return {
                success: true,
                errors: []
            };
        } catch (e) {
            console.error('Error deleting medicine:', e);
            return {
                success: false,
                errors: ['Failed to delete medicine. Please try again.']
            };
        }
    }

    // Search medicines by name, category, or description
    static search(query) {
        try {
            if (!query || query.trim() === '') {
                return this.getAll();
            }
            const q = query.toLowerCase().trim();
            return this.getAll().filter(m => 
                m.name.toLowerCase().includes(q) ||
                m.category.toLowerCase().includes(q) ||
                m.description.toLowerCase().includes(q) ||
                m.batchNumber.toLowerCase().includes(q)
            );
        } catch (e) {
            console.error('Error searching medicines:', e);
            return [];
        }
    }

    // Get all low stock medicines
    static getLowStock() {
        try {
            return this.getAll().filter(m => m.isLowStock());
        } catch (e) {
            console.error('Error getting low stock:', e);
            return [];
        }
    }

    // Get all out of stock medicines
    static getOutOfStock() {
        try {
            return this.getAll().filter(m => m.isOutOfStock());
        } catch (e) {
            console.error('Error getting out of stock:', e);
            return [];
        }
    }

    // Get all expired medicines
    static getExpired() {
        try {
            return this.getAll().filter(m => m.isExpired());
        } catch (e) {
            console.error('Error getting expired medicines:', e);
            return [];
        }
    }

    // Get summary statistics
    static getStats() {
        try {
            const all = this.getAll();
            return {
                total: all.length,
                lowStock: all.filter(m => m.isLowStock()).length,
                outOfStock: all.filter(m => m.isOutOfStock()).length,
                expired: all.filter(m => m.isExpired()).length,
                totalValue: all.reduce((sum, m) => sum + (m.price * m.stock), 0)
            };
        } catch (e) {
            console.error('Error getting stats:', e);
            return {
                total: 0,
                lowStock: 0,
                outOfStock: 0,
                expired: 0,
                totalValue: 0
            };
        }
    }

    // Update stock quantity for a medicine
    static updateStock(id, quantity) {
        try {
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
        } catch (e) {
            console.error('Error updating stock:', e);
            return {
                success: false,
                errors: ['Failed to update stock. Please try again.']
            };
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.InventoryController = InventoryController;
}