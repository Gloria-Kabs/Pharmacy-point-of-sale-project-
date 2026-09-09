import { STORAGE_KEYS } from "../utils/StorageKeys.js";

export class StorageService {
    constructor(storage = globalThis.localStorage) {
        if (!storage) {
            throw new Error(
                "StorageService requires a localStorage-compatible storage object."
            );
        }

        this.storage = storage;
    }

    // ==================================================
    // STATIC API
    // ==================================================

    static getStorage() {
        if (!globalThis.localStorage) {
            throw new Error(
                "localStorage is not available in this environment."
            );
        }

        return globalThis.localStorage;
    }

    static get(key, defaultValue = null) {
        const storage = this.getStorage();
        const rawValue = storage.getItem(key);

        if (rawValue === null) {
            return defaultValue;
        }

        try {
            return JSON.parse(rawValue);
        } catch (error) {
            console.error(
                `Failed to parse localStorage key "${key}".`,
                error
            );

            return defaultValue;
        }
    }

    static set(key, data) {
        const storage = this.getStorage();
        storage.setItem(key, JSON.stringify(data));

        return data;
    }

    static remove(key) {
        const storage = this.getStorage();
        storage.removeItem(key);

        return true;
    }

    static exists(key) {
        const storage = this.getStorage();

        return storage.getItem(key) !== null;
    }

    static clearKeys(keys = Object.values(STORAGE_KEYS)) {
        if (!Array.isArray(keys)) {
            throw new Error(
                "clearKeys requires an array of storage keys."
            );
        }

        const storage = this.getStorage();

        keys.forEach(key => {
            storage.removeItem(key);
        });

        return true;
    }

    static findAll(key) {
        const data = this.get(key, []);

        return Array.isArray(data) ? data : [];
    }

    static findById(key, id, idField = "id") {
        const records = this.findAll(key);
        const targetId = String(id);

        return (
            records.find(
                record =>
                    record &&
                    String(record[idField]) === targetId
            ) || null
        );
    }

    static save(key, item, idField = "id") {
        if (!item || typeof item !== "object") {
            throw new Error(
                "StorageService.save requires an object."
            );
        }

        const records = this.findAll(key);
        const itemId = item[idField];

        if (
            itemId === undefined ||
            itemId === null ||
            String(itemId).trim() === ""
        ) {
            throw new Error(
                `Cannot save item without "${idField}".`
            );
        }

        const index = records.findIndex(
            record =>
                record &&
                String(record[idField]) === String(itemId)
        );

        if (index >= 0) {
            records[index] = item;
        } else {
            records.push(item);
        }

        this.set(key, records);

        return item;
    }

    static delete(key, id, idField = "id") {
        const records = this.findAll(key);
        const targetId = String(id);

        const filtered = records.filter(
            record =>
                !record ||
                String(record[idField]) !== targetId
        );

        this.set(key, filtered);

        return filtered.length !== records.length;
    }

    static generateId(prefix = "ID") {
        return `${prefix}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase()}`;
    }

    // --------------------------------------------------
    // Static user account operations
    // --------------------------------------------------

    static findUserById(userId) {
        return this.findById(
            STORAGE_KEYS.USERS,
            userId,
            "userId"
        );
    }

    static findUserByUsername(username) {
        const normalizedUsername = String(username || "")
            .trim()
            .toLowerCase();

        return (
            this.findAll(STORAGE_KEYS.USERS).find(
                user =>
                    String(user?.username || "")
                        .trim()
                        .toLowerCase() === normalizedUsername
            ) || null
        );
    }

    static saveUser(user) {
        return this.save(
            STORAGE_KEYS.USERS,
            user,
            "userId"
        );
    }

    // --------------------------------------------------
    // Static session operations
    // --------------------------------------------------

    static getSession() {
        return this.get(
            STORAGE_KEYS.SESSION,
            null
        );
    }

    static saveSession(session) {
        if (!session || !session.userId) {
            throw new Error(
                "A valid user session is required."
            );
        }

        return this.set(
            STORAGE_KEYS.SESSION,
            session
        );
    }

    static clearSession() {
        return this.remove(
            STORAGE_KEYS.SESSION
        );
    }

    // --------------------------------------------------
    // Static medicine operations
    // --------------------------------------------------

    static findMedicineById(medicineId) {
        return this.findById(
            STORAGE_KEYS.MEDICINES,
            medicineId,
            "medicineId"
        );
    }

    static findAllMedicines() {
        return this.findAll(
            STORAGE_KEYS.MEDICINES
        );
    }

    static saveMedicine(medicine) {
        return this.save(
            STORAGE_KEYS.MEDICINES,
            medicine,
            "medicineId"
        );
    }

    static deleteMedicine(medicineId) {
        return this.delete(
            STORAGE_KEYS.MEDICINES,
            medicineId,
            "medicineId"
        );
    }

    // --------------------------------------------------
    // Static medicine batch operations
    // --------------------------------------------------

    static findBatchesByMedicineId(medicineId) {
        return this.findAll(
            STORAGE_KEYS.MEDICINE_BATCHES
        ).filter(
            batch =>
                String(batch?.medicineId) ===
                String(medicineId)
        );
    }

    static findBatchById(batchId) {
        return this.findById(
            STORAGE_KEYS.MEDICINE_BATCHES,
            batchId,
            "batchId"
        );
    }

    static findAllBatches() {
        return this.findAll(
            STORAGE_KEYS.MEDICINE_BATCHES
        );
    }

    static saveBatch(batch) {
        return this.save(
            STORAGE_KEYS.MEDICINE_BATCHES,
            batch,
            "batchId"
        );
    }

    static deleteBatch(batchId) {
        return this.delete(
            STORAGE_KEYS.MEDICINE_BATCHES,
            batchId,
            "batchId"
        );
    }

    // --------------------------------------------------
    // Static prescription operations
    // --------------------------------------------------

    static findPrescriptionById(prescriptionId) {
        return this.findById(
            STORAGE_KEYS.PRESCRIPTIONS,
            prescriptionId,
            "prescriptionId"
        );
    }

    static findAllPrescriptions() {
        return this.findAll(
            STORAGE_KEYS.PRESCRIPTIONS
        );
    }

    static savePrescription(prescription) {
        return this.save(
            STORAGE_KEYS.PRESCRIPTIONS,
            prescription,
            "prescriptionId"
        );
    }

    static deletePrescription(prescriptionId) {
        return this.delete(
            STORAGE_KEYS.PRESCRIPTIONS,
            prescriptionId,
            "prescriptionId"
        );
    }

    // --------------------------------------------------
    // Static prescription item operations
    // --------------------------------------------------

    static findPrescriptionItems(prescriptionId) {
        return this.findAll(
            STORAGE_KEYS.PRESCRIPTION_ITEMS
        ).filter(
            item =>
                String(item?.prescriptionId) ===
                String(prescriptionId)
        );
    }

    static savePrescriptionItem(item) {
        return this.save(
            STORAGE_KEYS.PRESCRIPTION_ITEMS,
            item,
            "prescriptionItemId"
        );
    }

    static deletePrescriptionItem(
        prescriptionItemId
    ) {
        return this.delete(
            STORAGE_KEYS.PRESCRIPTION_ITEMS,
            prescriptionItemId,
            "prescriptionItemId"
        );
    }

    // --------------------------------------------------
    // Static dispensing operations
    // --------------------------------------------------

    static findAllDispensingRecords() {
        return this.findAll(
            STORAGE_KEYS.DISPENSING_RECORDS
        );
    }

    static saveDispensingRecord(record) {
        return this.save(
            STORAGE_KEYS.DISPENSING_RECORDS,
            record,
            "dispensingId"
        );
    }

    // --------------------------------------------------
    // Static pending charge operations
    // --------------------------------------------------

    static findPendingChargeByReference(reference) {
        return (
            this.findAll(
                STORAGE_KEYS.PENDING_CHARGES
            ).find(
                charge =>
                    String(charge?.reference) ===
                    String(reference)
            ) || null
        );
    }

    static findPendingChargeById(chargeId) {
        return this.findById(
            STORAGE_KEYS.PENDING_CHARGES,
            chargeId,
            "chargeId"
        );
    }

    static findAllPendingCharges() {
        return this.findAll(
            STORAGE_KEYS.PENDING_CHARGES
        );
    }

    static savePendingCharge(charge) {
        return this.save(
            STORAGE_KEYS.PENDING_CHARGES,
            charge,
            "chargeId"
        );
    }

    // --------------------------------------------------
    // Static sales operations
    // --------------------------------------------------

    static findSaleById(saleId) {
        return this.findById(
            STORAGE_KEYS.SALES,
            saleId,
            "saleId"
        );
    }

    static findAllSales() {
        return this.findAll(
            STORAGE_KEYS.SALES
        );
    }

    static saveSale(sale) {
        return this.save(
            STORAGE_KEYS.SALES,
            sale,
            "saleId"
        );
    }

    // --------------------------------------------------
    // Static sales line item operations
    // --------------------------------------------------

    static findSalesLineItemsBySaleId(saleId) {
        return this.findAll(
            STORAGE_KEYS.SALES_LINE_ITEMS
        ).filter(
            item =>
                String(item?.saleId) ===
                String(saleId)
        );
    }

    static saveSalesLineItem(lineItem) {
        return this.save(
            STORAGE_KEYS.SALES_LINE_ITEMS,
            lineItem,
            "salesLineItemId"
        );
    }

    // --------------------------------------------------
    // Static payment operations
    // --------------------------------------------------

    static findPaymentById(paymentId) {
        return this.findById(
            STORAGE_KEYS.PAYMENTS,
            paymentId,
            "paymentId"
        );
    }

    static findPaymentsBySaleId(saleId) {
        return this.findAll(
            STORAGE_KEYS.PAYMENTS
        ).filter(
            payment =>
                String(payment?.saleId) ===
                String(saleId)
        );
    }

    static savePayment(payment) {
        return this.save(
            STORAGE_KEYS.PAYMENTS,
            payment,
            "paymentId"
        );
    }

    // --------------------------------------------------
    // Static receipt operations
    // --------------------------------------------------

    static findReceiptById(receiptId) {
        return this.findById(
            STORAGE_KEYS.RECEIPTS,
            receiptId,
            "receiptId"
        );
    }

    static findReceiptBySaleId(saleId) {
        return (
            this.findAll(
                STORAGE_KEYS.RECEIPTS
            ).find(
                receipt =>
                    String(receipt?.saleId) ===
                    String(saleId)
            ) || null
        );
    }

    static saveReceipt(receipt) {
        return this.save(
            STORAGE_KEYS.RECEIPTS,
            receipt,
            "receiptId"
        );
    }

    // ==================================================
    // INSTANCE API
    // ==================================================

    // --------------------------------------------------
    // Basic storage operations
    // --------------------------------------------------

    get(key, defaultValue = null) {
        const rawValue = this.storage.getItem(key);

        if (rawValue === null) {
            return defaultValue;
        }

        try {
            return JSON.parse(rawValue);
        } catch (error) {
            console.error(
                `Failed to parse storage key "${key}".`,
                error
            );

            return defaultValue;
        }
    }

    set(key, data) {
        this.storage.setItem(
            key,
            JSON.stringify(data)
        );

        return data;
    }

    remove(key) {
        this.storage.removeItem(key);

        return true;
    }

    exists(key) {
        return this.storage.getItem(key) !== null;
    }

    clearKeys(keys = Object.values(STORAGE_KEYS)) {
        if (!Array.isArray(keys)) {
            throw new Error(
                "clearKeys requires an array of storage keys."
            );
        }

        keys.forEach(key => {
            this.storage.removeItem(key);
        });

        return true;
    }

    findAll(key) {
        const data = this.get(key, []);

        return Array.isArray(data) ? data : [];
    }

    findById(key, id, idField = "id") {
        const records = this.findAll(key);
        const targetId = String(id);

        return (
            records.find(
                record =>
                    record &&
                    String(record[idField]) === targetId
            ) || null
        );
    }

    save(key, item, idField = "id") {
        if (!item || typeof item !== "object") {
            throw new Error(
                "StorageService.save requires an object."
            );
        }

        const records = this.findAll(key);
        const itemId = item[idField];

        if (
            itemId === undefined ||
            itemId === null ||
            String(itemId).trim() === ""
        ) {
            throw new Error(
                `Cannot save item without "${idField}".`
            );
        }

        const index = records.findIndex(
            record =>
                record &&
                String(record[idField]) ===
                    String(itemId)
        );

        if (index >= 0) {
            records[index] = item;
        } else {
            records.push(item);
        }

        this.set(key, records);

        return item;
    }

    delete(key, id, idField = "id") {
        const records = this.findAll(key);
        const targetId = String(id);

        const filtered = records.filter(
            record =>
                !record ||
                String(record[idField]) !== targetId
        );

        this.set(key, filtered);

        return filtered.length !== records.length;
    }

    generateId(prefix = "ID") {
        return StorageService.generateId(prefix);
    }

    // --------------------------------------------------
    // User
    // --------------------------------------------------

    findUserById(userId) {
        return this.findById(
            STORAGE_KEYS.USERS,
            userId,
            "userId"
        );
    }

    findUserByUsername(username) {
        const normalizedUsername = String(username || "")
            .trim()
            .toLowerCase();

        return (
            this.findAll(STORAGE_KEYS.USERS).find(
                user =>
                    String(user?.username || "")
                        .trim()
                        .toLowerCase() ===
                    normalizedUsername
            ) || null
        );
    }

    saveUser(user) {
        return this.save(
            STORAGE_KEYS.USERS,
            user,
            "userId"
        );
    }

    // --------------------------------------------------
    // Session
    // --------------------------------------------------

    getSession() {
        return this.get(
            STORAGE_KEYS.SESSION,
            null
        );
    }

    saveSession(session) {
        if (!session || !session.userId) {
            throw new Error(
                "A valid user session is required."
            );
        }

        return this.set(
            STORAGE_KEYS.SESSION,
            session
        );
    }

    clearSession() {
        return this.remove(
            STORAGE_KEYS.SESSION
        );
    }

    // --------------------------------------------------
    // Medicine
    // --------------------------------------------------

    findMedicineById(medicineId) {
        return this.findById(
            STORAGE_KEYS.MEDICINES,
            medicineId,
            "medicineId"
        );
    }

    findAllMedicines() {
        return this.findAll(
            STORAGE_KEYS.MEDICINES
        );
    }

    saveMedicine(medicine) {
        return this.save(
            STORAGE_KEYS.MEDICINES,
            medicine,
            "medicineId"
        );
    }

    deleteMedicine(medicineId) {
        return this.delete(
            STORAGE_KEYS.MEDICINES,
            medicineId,
            "medicineId"
        );
    }

    // --------------------------------------------------
    // Batches
    // --------------------------------------------------

    findBatchesByMedicineId(medicineId) {
        return this.findAll(
            STORAGE_KEYS.MEDICINE_BATCHES
        ).filter(
            batch =>
                String(batch?.medicineId) ===
                String(medicineId)
        );
    }

    findBatchById(batchId) {
        return this.findById(
            STORAGE_KEYS.MEDICINE_BATCHES,
            batchId,
            "batchId"
        );
    }

    findAllBatches() {
        return this.findAll(
            STORAGE_KEYS.MEDICINE_BATCHES
        );
    }

    saveBatch(batch) {
        return this.save(
            STORAGE_KEYS.MEDICINE_BATCHES,
            batch,
            "batchId"
        );
    }

    deleteBatch(batchId) {
        return this.delete(
            STORAGE_KEYS.MEDICINE_BATCHES,
            batchId,
            "batchId"
        );
    }

    // --------------------------------------------------
    // Prescription
    // --------------------------------------------------

    findPrescriptionById(prescriptionId) {
        return this.findById(
            STORAGE_KEYS.PRESCRIPTIONS,
            prescriptionId,
            "prescriptionId"
        );
    }

    findAllPrescriptions() {
        return this.findAll(
            STORAGE_KEYS.PRESCRIPTIONS
        );
    }

    findPrescriptionItems(prescriptionId) {
        return this.findAll(
            STORAGE_KEYS.PRESCRIPTION_ITEMS
        ).filter(
            item =>
                String(item?.prescriptionId) ===
                String(prescriptionId)
        );
    }

    savePrescription(prescription) {
        return this.save(
            STORAGE_KEYS.PRESCRIPTIONS,
            prescription,
            "prescriptionId"
        );
    }

    savePrescriptionItem(item) {
        return this.save(
            STORAGE_KEYS.PRESCRIPTION_ITEMS,
            item,
            "prescriptionItemId"
        );
    }

    // --------------------------------------------------
    // Dispensing
    // --------------------------------------------------

    saveDispensingRecord(record) {
        return this.save(
            STORAGE_KEYS.DISPENSING_RECORDS,
            record,
            "dispensingId"
        );
    }

    // --------------------------------------------------
    // Pending charges
    // --------------------------------------------------

    findPendingChargeByReference(reference) {
        return (
            this.findAll(
                STORAGE_KEYS.PENDING_CHARGES
            ).find(
                charge =>
                    String(charge?.reference) ===
                    String(reference)
            ) || null
        );
    }

    findPendingChargeById(chargeId) {
        return this.findById(
            STORAGE_KEYS.PENDING_CHARGES,
            chargeId,
            "chargeId"
        );
    }

    savePendingCharge(charge) {
        return this.save(
            STORAGE_KEYS.PENDING_CHARGES,
            charge,
            "chargeId"
        );
    }

    // --------------------------------------------------
    // Sales
    // --------------------------------------------------

    findSaleById(saleId) {
        return this.findById(
            STORAGE_KEYS.SALES,
            saleId,
            "saleId"
        );
    }

    findAllSales() {
        return this.findAll(
            STORAGE_KEYS.SALES
        );
    }

    saveSale(sale) {
        return this.save(
            STORAGE_KEYS.SALES,
            sale,
            "saleId"
        );
    }

    findSalesLineItemsBySaleId(saleId) {
        return this.findAll(
            STORAGE_KEYS.SALES_LINE_ITEMS
        ).filter(
            item =>
                String(item?.saleId) ===
                String(saleId)
        );
    }

    saveSalesLineItem(lineItem) {
        return this.save(
            STORAGE_KEYS.SALES_LINE_ITEMS,
            lineItem,
            "salesLineItemId"
        );
    }

    // --------------------------------------------------
    // Payments
    // --------------------------------------------------

    findPaymentById(paymentId) {
        return this.findById(
            STORAGE_KEYS.PAYMENTS,
            paymentId,
            "paymentId"
        );
    }

    findPaymentsBySaleId(saleId) {
        return this.findAll(
            STORAGE_KEYS.PAYMENTS
        ).filter(
            payment =>
                String(payment?.saleId) ===
                String(saleId)
        );
    }

    savePayment(payment) {
        return this.save(
            STORAGE_KEYS.PAYMENTS,
            payment,
            "paymentId"
        );
    }

    // --------------------------------------------------
    // Receipts
    // --------------------------------------------------

    findReceiptById(receiptId) {
        return this.findById(
            STORAGE_KEYS.RECEIPTS,
            receiptId,
            "receiptId"
        );
    }

    findReceiptBySaleId(saleId) {
        return (
            this.findAll(
                STORAGE_KEYS.RECEIPTS
            ).find(
                receipt =>
                    String(receipt?.saleId) ===
                    String(saleId)
            ) || null
        );
    }

    saveReceipt(receipt) {
        return this.save(
            STORAGE_KEYS.RECEIPTS,
            receipt,
            "receiptId"
        );
    }
}