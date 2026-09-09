export class PrescriptionItem {
    constructor({
        prescriptionItemId,
        prescriptionId,
        medicineId,
        quantityPrescribed = 0,
        quantityDispensed = 0
    } = {}) {
        this.prescriptionItemId = prescriptionItemId;
        this.prescriptionId = prescriptionId;
        this.medicineId = medicineId;
        this.quantityPrescribed = Number(quantityPrescribed);
        this.quantityDispensed = Number(quantityDispensed);
    }

    getRemainingQuantity() {
        return Math.max(
            0,
            this.quantityPrescribed - this.quantityDispensed
        );
    }

    isFullyDispensed() {
        return this.quantityDispensed >= this.quantityPrescribed;
    }

    recordDispensing(quantity) {
        const amount = Number(quantity);

        if (!Number.isInteger(amount) || amount <= 0) {
            throw new Error(
                "Dispensed quantity must be a positive whole number."
            );
        }

        if (amount > this.getRemainingQuantity()) {
            throw new Error(
                "Dispensed quantity cannot exceed the remaining prescribed quantity."
            );
        }

        this.quantityDispensed += amount;

        return this.quantityDispensed;
    }

    validate() {
        const errors = [];

        if (!this.prescriptionItemId) {
            errors.push("Prescription item ID is required.");
        }

        if (!this.prescriptionId) {
            errors.push("Prescription ID is required.");
        }

        if (!this.medicineId) {
            errors.push("Medicine ID is required.");
        }

        if (
            !Number.isInteger(this.quantityPrescribed) ||
            this.quantityPrescribed <= 0
        ) {
            errors.push(
                "Prescribed quantity must be a positive whole number."
            );
        }

        if (
            !Number.isInteger(this.quantityDispensed) ||
            this.quantityDispensed < 0
        ) {
            errors.push(
                "Dispensed quantity must be a non-negative whole number."
            );
        }

        if (
            Number.isInteger(this.quantityPrescribed) &&
            Number.isInteger(this.quantityDispensed) &&
            this.quantityDispensed > this.quantityPrescribed
        ) {
            errors.push(
                "Dispensed quantity cannot exceed prescribed quantity."
            );
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    toObject() {
        return {
            prescriptionItemId: this.prescriptionItemId,
            prescriptionId: this.prescriptionId,
            medicineId: this.medicineId,
            quantityPrescribed: this.quantityPrescribed,
            quantityDispensed: this.quantityDispensed
        };
    }
}