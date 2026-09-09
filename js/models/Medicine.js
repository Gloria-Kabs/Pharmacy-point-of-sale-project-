export class MedicineBatch {
    constructor({
        batchId,
        batchNumber,
        medicineId,
        expiryDate,
        quantityOnHand = 0,
        receivedDate = new Date().toISOString()
    } = {}) {
        this.batchId = batchId;
        this.batchNumber = batchNumber;
        this.medicineId = medicineId;
        this.expiryDate = expiryDate;
        this.quantityOnHand = Number(quantityOnHand);
        this.receivedDate = receivedDate;
    }

    isExpired(referenceDate = new Date()) {
        if (!this.expiryDate) {
            return false;
        }

        const expiry = new Date(this.expiryDate);
        const reference = new Date(referenceDate);

        if (
            Number.isNaN(expiry.getTime()) ||
            Number.isNaN(reference.getTime())
        ) {
            return false;
        }

        return expiry < reference;
    }

    hasStock(quantity = 1) {
        const requestedQuantity = Number(quantity);

        return (
            Number.isInteger(requestedQuantity) &&
            requestedQuantity > 0 &&
            Number.isInteger(this.quantityOnHand) &&
            this.quantityOnHand >= requestedQuantity &&
            !this.isExpired()
        );
    }

    reduceQuantity(quantity) {
        const requestedQuantity = Number(quantity);

        if (
            !Number.isInteger(requestedQuantity) ||
            requestedQuantity <= 0
        ) {
            throw new Error(
                "Quantity must be a positive whole number."
            );
        }

        if (this.isExpired()) {
            throw new Error(
                `Batch ${this.batchNumber || this.batchId} has expired.`
            );
        }

        if (this.quantityOnHand < requestedQuantity) {
            throw new Error(
                `Insufficient stock in batch ${this.batchNumber || this.batchId}.`
            );
        }

        this.quantityOnHand -= requestedQuantity;

        return this.quantityOnHand;
    }

    isLowStock(reorderLevel = 0) {
        const level = Number(reorderLevel);

        if (!Number.isFinite(level) || level < 0) {
            return false;
        }

        return this.quantityOnHand <= level;
    }

    validate() {
        const errors = [];

        if (!this.batchId) {
            errors.push("Batch ID is required.");
        }

        if (!this.batchNumber) {
            errors.push("Batch number is required.");
        }

        if (!this.medicineId) {
            errors.push("Medicine ID is required.");
        }

        if (!this.expiryDate) {
            errors.push("Expiry date is required.");
        } else if (
            Number.isNaN(new Date(this.expiryDate).getTime())
        ) {
            errors.push("Expiry date is invalid.");
        }

        if (
            !Number.isInteger(this.quantityOnHand) ||
            this.quantityOnHand < 0
        ) {
            errors.push(
                "Quantity on hand must be a non-negative whole number."
            );
        }

        if (
            this.receivedDate &&
            Number.isNaN(new Date(this.receivedDate).getTime())
        ) {
            errors.push("Received date is invalid.");
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    toObject() {
        return {
            batchId: this.batchId,
            batchNumber: this.batchNumber,
            medicineId: this.medicineId,
            expiryDate: this.expiryDate,
            quantityOnHand: this.quantityOnHand,
            receivedDate: this.receivedDate
        };
    }
}


export class Medicine {
    constructor({
        medicineId,
        name,
        description = "",
        category = "",
        unitPrice = 0,
        reorderLevel = 0
    } = {}) {
        this.medicineId = medicineId;
        this.name = String(name || "").trim();
        this.description = String(description || "").trim();
        this.category = String(category || "").trim();
        this.unitPrice = Number(unitPrice);
        this.reorderLevel = Number(reorderLevel);
    }

    getPrice() {
        return this.unitPrice;
    }

    isLowStock(batches = []) {
        return this.getTotalStock(batches) <= this.reorderLevel;
    }

    getTotalStock(batches = []) {
        const medicineId = String(this.medicineId);

        return batches
            .filter(
                batch =>
                    String(batch.medicineId) === medicineId
            )
            .reduce(
                (total, batch) =>
                    total + Number(batch.quantityOnHand || 0),
                0
            );
    }

    getAvailableBatches(batches = []) {
        const medicineId = String(this.medicineId);

        return batches
            .filter(
                batch =>
                    String(batch.medicineId) === medicineId &&
                    !batch.isExpired() &&
                    batch.hasStock()
            )
            .sort(
                (a, b) =>
                    new Date(a.expiryDate) -
                    new Date(b.expiryDate)
            );
    }

    validate() {
        const errors = [];

        if (!this.medicineId) {
            errors.push("Medicine ID is required.");
        }

        if (!this.name) {
            errors.push("Medicine name is required.");
        }

        if (
            !Number.isFinite(this.unitPrice) ||
            this.unitPrice < 0
        ) {
            errors.push(
                "Unit price must be a non-negative number."
            );
        }

        if (
            !Number.isInteger(this.reorderLevel) ||
            this.reorderLevel < 0
        ) {
            errors.push(
                "Reorder level must be a non-negative whole number."
            );
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    toObject() {
        return {
            medicineId: this.medicineId,
            name: this.name,
            description: this.description,
            category: this.category,
            unitPrice: this.unitPrice,
            reorderLevel: this.reorderLevel
        };
    }
}