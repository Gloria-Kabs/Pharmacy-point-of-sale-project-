export class DispensingRecord {
    constructor({
        dispensingId,
        prescriptionId,
        medicineId,
        batchId,
        quantityDispensed = 0,
        dispensedDateTime = new Date().toISOString(),
        dispensedBy
    } = {}) {
        this.dispensingId = dispensingId;
        this.prescriptionId = prescriptionId;
        this.medicineId = medicineId;
        this.batchId = batchId;
        this.quantityDispensed = Number(quantityDispensed);
        this.dispensedDateTime = dispensedDateTime;
        this.dispensedBy = dispensedBy;
    }

    recordDispensing(quantity = this.quantityDispensed) {
        const amount = Number(quantity);

        if (!Number.isInteger(amount) || amount <= 0) {
            throw new Error(
                "Dispensed quantity must be a positive whole number."
            );
        }

        this.quantityDispensed = amount;
        this.dispensedDateTime = new Date().toISOString();

        return this.quantityDispensed;
    }

    validate() {
        const errors = [];

        if (!this.dispensingId) {
            errors.push("Dispensing ID is required.");
        }

        if (!this.prescriptionId) {
            errors.push("Prescription ID is required.");
        }

        if (!this.medicineId) {
            errors.push("Medicine ID is required.");
        }

        if (!this.batchId) {
            errors.push("Batch ID is required.");
        }

        if (
            !Number.isInteger(this.quantityDispensed) ||
            this.quantityDispensed <= 0
        ) {
            errors.push(
                "Dispensed quantity must be a positive whole number."
            );
        }

        if (!this.dispensedDateTime) {
            errors.push("Dispensing date and time is required.");
        } else if (
            Number.isNaN(Date.parse(this.dispensedDateTime))
        ) {
            errors.push(
                "Dispensing date and time must be a valid date."
            );
        }

        if (!this.dispensedBy) {
            errors.push("Dispensing staff ID is required.");
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    toObject() {
        return {
            dispensingId: this.dispensingId,
            prescriptionId: this.prescriptionId,
            medicineId: this.medicineId,
            batchId: this.batchId,
            quantityDispensed: this.quantityDispensed,
            dispensedDateTime: this.dispensedDateTime,
            dispensedBy: this.dispensedBy
        };
    }
}