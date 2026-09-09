import { Medicine, MedicineBatch } from "../models/Medicine.js";
import { StorageService } from "../storage/StorageService.js";
import { STORAGE_KEYS } from "../utils/StorageKeys.js";

export class InventoryController {

    constructor(storageService = StorageService) {
        if (!storageService) {
            throw new Error(
                "InventoryController requires a StorageService."
            );
        }

        this.storage = storageService;
    }

    // ---------------------------------
    // DCD: openInventory()
    // ---------------------------------

    openInventory() {
        return this.getAll();
    }

    // ---------------------------------
    // Get all medicines
    // ---------------------------------

    getAll() {
        const medicines = this.storage.findAll(
            STORAGE_KEYS.MEDICINES
        );

        const batches = this.storage.findAll(
            STORAGE_KEYS.MEDICINE_BATCHES
        );

        return medicines.map((medicineData) => {
            const medicine = new Medicine(medicineData);

            const medicineBatches = batches
                .filter(
                    (batch) =>
                        batch.medicineId === medicine.medicineId
                )
                .map((batch) => new MedicineBatch(batch));

            return {
                ...medicine.toObject(),
                stock: medicine.getTotalStock(medicineBatches),
                batches: medicineBatches.map(
                    (batch) => batch.toObject()
                )
            };
        });
    }

    // ---------------------------------
    // Find medicine
    // ---------------------------------

    getById(medicineId) {
        const medicineData = this.storage.findById(
            STORAGE_KEYS.MEDICINES,
            medicineId,
            "medicineId"
        );

        if (!medicineData) {
            return null;
        }

        const medicine = new Medicine(medicineData);

        const batches = this.storage
            .findAll(STORAGE_KEYS.MEDICINE_BATCHES)
            .filter(
                (batch) =>
                    batch.medicineId === medicine.medicineId
            )
            .map((batch) => new MedicineBatch(batch));

        return {
            ...medicine.toObject(),
            stock: medicine.getTotalStock(batches),
            batches: batches.map(
                (batch) => batch.toObject()
            )
        };
    }

    // ---------------------------------
    // DCD: searchMedicine(criteria)
    // ---------------------------------

    searchMedicine(criteria = {}) {
        const medicines = this.getAll();

        if (typeof criteria === "string") {
            const searchTerm = criteria.toLowerCase();

            return medicines.filter(
                (medicine) =>
                    medicine.name.toLowerCase().includes(searchTerm) ||
                    medicine.medicineId.toLowerCase().includes(searchTerm) ||
                    medicine.category.toLowerCase().includes(searchTerm)
            );
        }

        return medicines.filter((medicine) => {
            if (
                criteria.name &&
                !medicine.name
                    .toLowerCase()
                    .includes(criteria.name.toLowerCase())
            ) {
                return false;
            }

            if (
                criteria.category &&
                medicine.category !== criteria.category
            ) {
                return false;
            }

            if (
                criteria.medicineId &&
                medicine.medicineId !== criteria.medicineId
            ) {
                return false;
            }

            return true;
        });
    }

    // ---------------------------------
    // DCD: addMedicine(data)
    // ---------------------------------

    addMedicine(data) {
        if (!data) {
            throw new Error("Medicine data is required.");
        }

        const medicineId =
            data.medicineId ||
            this.storage.generateId("MED");

        const medicine = new Medicine({
            medicineId,
            name: data.name,
            description: data.description || "",
            category: data.category || "",
            unitPrice: data.unitPrice ?? data.price ?? 0,
            reorderLevel: data.reorderLevel ?? 0
        });

        const validation = medicine.validate();

        if (!validation.valid) {
            throw new Error(
                `Cannot add medicine: ${validation.errors.join(", ")}`
            );
        }

        const existingMedicine = this.storage.findById(
            STORAGE_KEYS.MEDICINES,
            medicine.medicineId,
            "medicineId"
        );

        if (existingMedicine) {
            throw new Error(
                `Medicine ID "${medicine.medicineId}" already exists.`
            );
        }

        this.storage.save(
            STORAGE_KEYS.MEDICINES,
            medicine.toObject(),
            "medicineId"
        );

        // A medicine can optionally be created with its first batch.
        if (data.batchNumber || data.quantityOnHand !== undefined) {
            this.addBatch({
                batchNumber: data.batchNumber,
                medicineId,
                expiryDate: data.expiryDate,
                quantityOnHand: data.quantityOnHand ?? 0
            });
        }

        return this.getById(medicineId);
    }

    // ---------------------------------
    // DCD: updateMedicine(data)
    // ---------------------------------

    updateMedicine(data) {
        if (!data || !data.medicineId) {
            throw new Error(
                "Medicine ID is required to update medicine."
            );
        }

        const existingMedicine = this.storage.findById(
            STORAGE_KEYS.MEDICINES,
            data.medicineId,
            "medicineId"
        );

        if (!existingMedicine) {
            throw new Error(
                `Medicine not found: ${data.medicineId}`
            );
        }

        const medicine = new Medicine({
            ...existingMedicine,
            ...data,
            unitPrice:
                data.unitPrice ??
                data.price ??
                existingMedicine.unitPrice
        });

        const validation = medicine.validate();

        if (!validation.valid) {
            throw new Error(
                `Cannot update medicine: ${validation.errors.join(", ")}`
            );
        }

        this.storage.save(
            STORAGE_KEYS.MEDICINES,
            medicine.toObject(),
            "medicineId"
        );

        return this.getById(medicine.medicineId);
    }

    // ---------------------------------
    // Add a medicine batch
    // ---------------------------------

    addBatch(data) {
        if (!data || !data.medicineId) {
            throw new Error(
                "Medicine ID is required for a batch."
            );
        }

        const medicine = this.storage.findById(
            STORAGE_KEYS.MEDICINES,
            data.medicineId,
            "medicineId"
        );

        if (!medicine) {
            throw new Error(
                `Medicine not found: ${data.medicineId}`
            );
        }

        const batch = new MedicineBatch({
            batchId:
                data.batchId ||
                this.storage.generateId("BATCH"),

            batchNumber: data.batchNumber,

            medicineId: data.medicineId,

            expiryDate: data.expiryDate,

            quantityOnHand:
                data.quantityOnHand ?? 0,

            receivedDate:
                data.receivedDate ||
                new Date().toISOString()
        });

        const validation = batch.validate();

        if (!validation.valid) {
            throw new Error(
                `Cannot add batch: ${validation.errors.join(", ")}`
            );
        }

        const existingBatch = this.storage.findById(
            STORAGE_KEYS.MEDICINE_BATCHES,
            batch.batchId,
            "batchId"
        );

        if (existingBatch) {
            throw new Error(
                `Batch ID "${batch.batchId}" already exists.`
            );
        }

        this.storage.save(
            STORAGE_KEYS.MEDICINE_BATCHES,
            batch.toObject(),
            "batchId"
        );

        return batch.toObject();
    }

    // ---------------------------------
    // Get batches for medicine
    // ---------------------------------

    getBatches(medicineId) {
        return this.storage
            .findAll(STORAGE_KEYS.MEDICINE_BATCHES)
            .filter(
                (batch) =>
                    batch.medicineId === medicineId
            )
            .map(
                (batch) =>
                    new MedicineBatch(batch)
            );
    }

    // ---------------------------------
    // Get available batches
    // ---------------------------------

    getAvailableBatches(medicineId) {
        const medicine = this.getById(medicineId);

        if (!medicine) {
            return [];
        }

        const medicineModel = new Medicine(medicine);

        return medicineModel.getAvailableBatches(
            this.getBatches(medicineId)
        );
    }

    // ---------------------------------
    // Reduce stock from batches
    // ---------------------------------

    reduceStock(medicineId, quantity) {
        const requestedQuantity = Number(quantity);

        if (
            !Number.isInteger(requestedQuantity) ||
            requestedQuantity <= 0
        ) {
            throw new Error(
                "Quantity must be a positive whole number."
            );
        }

        const batches = this.getAvailableBatches(
            medicineId
        );

        const totalAvailable = batches.reduce(
            (total, batch) =>
                total + batch.quantityOnHand,
            0
        );

        if (totalAvailable < requestedQuantity) {
            throw new Error(
                `Insufficient stock for medicine ${medicineId}.`
            );
        }

        let remaining = requestedQuantity;

        // FEFO: use the batch that expires first.
        for (const batch of batches) {
            if (remaining <= 0) {
                break;
            }

            const quantityToReduce = Math.min(
                remaining,
                batch.quantityOnHand
            );

            batch.reduceQuantity(
                quantityToReduce
            );

            this.storage.save(
                STORAGE_KEYS.MEDICINE_BATCHES,
                batch.toObject(),
                "batchId"
            );

            remaining -= quantityToReduce;
        }

        return this.getById(medicineId);
    }

    // ---------------------------------
    // Low-stock medicines
    // ---------------------------------

    getLowStock() {
        return this.getAll().filter(
            (medicine) =>
                medicine.stock <=
                medicine.reorderLevel
        );
    }

    // ---------------------------------
    // Out-of-stock medicines
    // ---------------------------------

    getOutOfStock() {
        return this.getAll().filter(
            (medicine) =>
                medicine.stock <= 0
        );
    }

    // ---------------------------------
    // Expired batches
    // ---------------------------------

    getExpired() {
        return this.storage
            .findAll(STORAGE_KEYS.MEDICINE_BATCHES)
            .map(
                (batch) =>
                    new MedicineBatch(batch)
            )
            .filter(
                (batch) =>
                    batch.isExpired()
            )
            .map(
                (batch) =>
                    batch.toObject()
            );
    }

    // ---------------------------------
    // Inventory statistics
    // ---------------------------------

    getStats() {
        const medicines = this.getAll();
        const batches = this.storage.findAll(
            STORAGE_KEYS.MEDICINE_BATCHES
        );

        return {
            totalMedicines: medicines.length,

            totalStock: medicines.reduce(
                (total, medicine) =>
                    total + medicine.stock,
                0
            ),

            lowStock: this.getLowStock().length,

            outOfStock: this.getOutOfStock().length,

            expiredBatches: batches
                .map(
                    (batch) =>
                        new MedicineBatch(batch)
                )
                .filter(
                    (batch) =>
                        batch.isExpired()
                ).length
        };
    }
}