import { PrescriptionItem } from "./PrescriptionItem.js";

export const PRESCRIPTION_STATUS = Object.freeze({
    ACTIVE: "ACTIVE",
    PARTIALLY_DISPENSED: "PARTIALLY_DISPENSED",
    COMPLETED: "COMPLETED",
    EXPIRED: "EXPIRED"
});

export class Prescription {
    constructor({
        prescriptionId,
        customerId,
        prescriberName = "",
        dateIssued = new Date().toISOString(),
        expiryDate,
        status = PRESCRIPTION_STATUS.ACTIVE,
        items = []
    } = {}) {
        this.prescriptionId = prescriptionId;
        this.customerId = customerId;
        this.prescriberName = String(
            prescriberName
        ).trim();

        this.dateIssued = dateIssued;
        this.expiryDate = expiryDate;
        this.status = status;

        this.items = Array.isArray(items)
            ? items.map(
                  item =>
                      item instanceof PrescriptionItem
                          ? item
                          : new PrescriptionItem({
                                ...item,
                                prescriptionId:
                                    item.prescriptionId ||
                                    prescriptionId
                            })
              )
            : [];
    }

    isExpired(referenceDate = new Date()) {
        if (!this.expiryDate) {
            return false;
        }

        const expiryTime =
            new Date(this.expiryDate).getTime();

        if (Number.isNaN(expiryTime)) {
            return false;
        }

        return (
            expiryTime <
            new Date(referenceDate).getTime()
        );
    }

    isValid(referenceDate = new Date()) {
        if (
            this.status ===
                PRESCRIPTION_STATUS.COMPLETED ||
            this.status ===
                PRESCRIPTION_STATUS.EXPIRED
        ) {
            return false;
        }

        if (this.isExpired(referenceDate)) {
            this.status =
                PRESCRIPTION_STATUS.EXPIRED;

            return false;
        }

        return true;
    }

    getRemainingQuantity(medicineId) {
        const normalizedMedicineId =
            String(medicineId);

        const item = this.items.find(
            prescriptionItem =>
                String(
                    prescriptionItem.medicineId
                ) === normalizedMedicineId
        );

        if (!item) {
            return 0;
        }

        return item.getRemainingQuantity();
    }

    getItem(medicineId) {
        const normalizedMedicineId =
            String(medicineId);

        return (
            this.items.find(
                item =>
                    String(item.medicineId) ===
                    normalizedMedicineId
            ) || null
        );
    }

    recordDispensing(medicineId, quantity) {
        if (!this.isValid()) {
            throw new Error(
                "Prescription is not valid for dispensing."
            );
        }

        const item =
            this.getItem(medicineId);

        if (!item) {
            throw new Error(
                `Medicine ${medicineId} is not included in the prescription.`
            );
        }

        item.recordDispensing(quantity);

        this.updateStatus();

        return item;
    }

    updateStatus(
        referenceDate = new Date()
    ) {
        if (
            this.status ===
            PRESCRIPTION_STATUS.COMPLETED
        ) {
            return this.status;
        }

        if (this.isExpired(referenceDate)) {
            this.status =
                PRESCRIPTION_STATUS.EXPIRED;

            return this.status;
        }

        if (this.items.length === 0) {
            this.status =
                PRESCRIPTION_STATUS.ACTIVE;

            return this.status;
        }

        const allDispensed =
            this.items.every(item =>
                item.isFullyDispensed()
            );

        const anyDispensed =
            this.items.some(
                item =>
                    item.quantityDispensed > 0
            );

        if (allDispensed) {
            this.status =
                PRESCRIPTION_STATUS.COMPLETED;
        } else if (anyDispensed) {
            this.status =
                PRESCRIPTION_STATUS.PARTIALLY_DISPENSED;
        } else {
            this.status =
                PRESCRIPTION_STATUS.ACTIVE;
        }

        return this.status;
    }

    isCompleted() {
        return (
            this.status ===
            PRESCRIPTION_STATUS.COMPLETED
        );
    }

    validate() {
        const errors = [];

        if (!this.prescriptionId) {
            errors.push(
                "Prescription ID is required."
            );
        }

        if (!this.customerId) {
            errors.push(
                "Customer ID is required."
            );
        }

        if (!this.dateIssued) {
            errors.push(
                "Prescription issue date is required."
            );
        } else if (
            Number.isNaN(
                new Date(
                    this.dateIssued
                ).getTime()
            )
        ) {
            errors.push(
                "Prescription issue date is invalid."
            );
        }

        if (!this.expiryDate) {
            errors.push(
                "Prescription expiry date is required."
            );
        } else if (
            Number.isNaN(
                new Date(
                    this.expiryDate
                ).getTime()
            )
        ) {
            errors.push(
                "Prescription expiry date is invalid."
            );
        }

        if (
            !Object.values(
                PRESCRIPTION_STATUS
            ).includes(this.status)
        ) {
            errors.push(
                "Invalid prescription status."
            );
        }

        if (
            !Array.isArray(this.items) ||
            this.items.length === 0
        ) {
            errors.push(
                "Prescription must contain at least one item."
            );
        }

        this.items.forEach(
            (item, index) => {
                const validation =
                    item.validate();

                if (!validation.valid) {
                    validation.errors.forEach(
                        error => {
                            errors.push(
                                `Item ${
                                    index + 1
                                }: ${error}`
                            );
                        }
                    );
                }
            }
        );

        return {
            valid: errors.length === 0,
            errors
        };
    }

    toObject() {
        return {
            prescriptionId:
                this.prescriptionId,

            customerId:
                this.customerId,

            prescriberName:
                this.prescriberName,

            dateIssued:
                this.dateIssued,

            expiryDate:
                this.expiryDate,

            status:
                this.status,

            items: this.items.map(
                item =>
                    item.toObject()
            )
        };
    }
}