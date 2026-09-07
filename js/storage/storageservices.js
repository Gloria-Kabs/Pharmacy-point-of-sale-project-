/**
 * StorageService - Handles all localStorage operations
 * This is the data layer for the Pharmacy POS System
 */
class StorageService {
    constructor() {
        this.storeName = 'PharmacyPOS';
        this.initData();
    }

    /**
     * Initialize data if it doesn't exist
     */
    initData() {
        if (!localStorage.getItem(this.storeName)) {
            const seedData = {
                medicines: [
                    { 
                        id: 'med_1', 
                        name: 'Paracetamol 500mg', 
                        category: 'Pain Relief',
                        price: 15.00, 
                        stock: 100, 
                        reorderLevel: 20,
                        expiryDate: '2027-12-31',
                        description: 'For fever and pain relief',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    { 
                        id: 'med_2', 
                        name: 'Amoxicillin 250mg', 
                        category: 'Antibiotics',
                        price: 45.00, 
                        stock: 50, 
                        reorderLevel: 15,
                        expiryDate: '2026-10-15',
                        description: 'Antibiotic for bacterial infections',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    { 
                        id: 'med_3', 
                        name: 'Vitamin C 1000mg', 
                        category: 'Vitamins',
                        price: 25.00, 
                        stock: 75, 
                        reorderLevel: 25,
                        expiryDate: '2028-06-30',
                        description: 'Immune system support',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    { 
                        id: 'med_4', 
                        name: 'Ibuprofen 400mg', 
                        category: 'Pain Relief',
                        price: 30.00, 
                        stock: 60, 
                        reorderLevel: 15,
                        expiryDate: '2027-03-15',
                        description: 'Anti-inflammatory pain relief',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    { 
                        id: 'med_5', 
                        name: 'Cough Syrup', 
                        category: 'Cold & Flu',
                        price: 55.00, 
                        stock: 8, 
                        reorderLevel: 10,
                        expiryDate: '2026-12-01',
                        description: 'Relieves cough and sore throat',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                ],
                customers: [],
                prescriptions: [
                    {
                        id: 'rx_1',
                        customerId: null,
                        dateIssued: '2026-09-01',
                        status: 'ACTIVE',
                        items: [
                            { medicineId: 'med_1', quantity: 10, dispensed: 0 },
                            { medicineId: 'med_3', quantity: 5, dispensed: 0 }
                        ]
                    }
                ],
                sales: [],
                pendingCharges: [],
                users: [
                    { id: 'u1', username: 'admin', password: '123', role: 'ADMIN' },
                    { id: 'u2', username: 'pharmacist', password: '123', role: 'PHARMACIST' },
                    { id: 'u3', username: 'cashier', password: '123', role: 'CASHIER' }
                ]
            };
            localStorage.setItem(this.storeName, JSON.stringify(seedData));
        }
    }

    /**
     * Get all data from storage
     */
    getData() {
        return JSON.parse(localStorage.getItem(this.storeName));
    }

    /**
     * Save all data to storage
     */
    saveData(data) {
        localStorage.setItem(this.storeName, JSON.stringify(data));
    }

    /**
     * Find all items in a collection
     */
    findAll(collection) {
        const data = this.getData();
        return data[collection] || [];
    }

    /**
     * Find one item by ID
     */
    findById(collection, id) {
        const data = this.getData();
        return data[collection]?.find(item => item.id === id) || null;
    }

    /**
     * Save or update an item
     */
    save(collection, item) {
        const data = this.getData();
        
        // Generate ID if not exists
        if (!item.id) {
            item.id = 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        }
        
        // Find and update or push
        const index = data[collection].findIndex(i => i.id === item.id);
        if (index >= 0) {
            data[collection][index] = item;
        } else {
            data[collection].push(item);
        }
        
        this.saveData(data);
        return item;
    }

    /**
     * Delete an item by ID
     */
    delete(collection, id) {
        const data = this.getData();
        data[collection] = data[collection].filter(item => item.id !== id);
        this.saveData(data);
        return true;
    }

    /**
     * Clear all data (for testing)
     */
    clearAll() {
        localStorage.removeItem(this.storeName);
        this.initData();
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.StorageService = StorageService;
}