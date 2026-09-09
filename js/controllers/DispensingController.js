import { Prescription, PRESCRIPTION_STATUS } from "../models/Prescription.js";
import { Medicine, MedicineBatch } from "../models/Medicine.js";
import { DispensingRecord } from "../models/DispensingRecord.js";
import {
    PendingCharge,
    CHARGE_STATUS
} from "../models/PendingCharge.js";
import { StorageService } from "../storage/StorageService.js";
import { STORAGE_KEYS } from "../utils/StorageKeys.js";

export class DispensingController {
    constructor(storageService = StorageService) {
        if (!storageService) {
            throw new Error(
                "DispensingController requires a StorageService."
            );
        }

        this.storage = storageService;
        this.currentPrescription = null;
        this.verified = false;
    }

    startDispensing() {
        this.currentPrescription = null;
        this.verified = false;

        return true;
    }

    retrievePrescription(reference) {
        if (!reference) {
            throw new Error(
                "Prescription reference is required."
            );
        }

        const prescriptionData =
            this.storage.findPrescriptionById(
                String(reference)
            );

        if (!prescriptionData) {
            throw new Error(
                `Prescription not found: ${reference}`
            );
        }

        this.currentPrescription =
            new Prescription(prescriptionData);

        this.verified = false;

        return this.currentPrescription;
    }

    verifyPrescription() {
        if (!this.currentPrescription) {
            throw new Error(
                "No prescription has been retrieved."
            );
        }

        const prescription =
            this.currentPrescription;

        prescription.updateStatus();

        if (
            prescription.status ===
            PRESCRIPTION_STATUS.EXPIRED
        ) {
            this.storage.savePrescription(
                prescription.toObject()
            );

            this.verified = false;

            return false;
        }

        if (prescription.isCompleted()) {
            this.verified = false;

            return false;
        }

        const validation =
            prescription.validate();

        if (!validation.valid) {
            throw new Error(
                `Invalid prescription: ${validation.errors.join(", ")}`
            );
        }

        this.verified =
            prescription.isValid();

        return this.verified;
    }

    checkAvailability() {
        if (!this.currentPrescription) {
            throw new Error(
                "No prescription has been retrieved."
            );
        }

        if (!this.verified) {
            throw new Error(
                "Prescription must be verified before checking availability."
            );
        }

        const batchesData =
            this.storage.findAll(
                STORAGE_KEYS.MEDICINE_BATCHES
            ) || [];

        const medicinesData =
            this.storage.findAll(
                STORAGE_KEYS.MEDICINES
            ) || [];

        const batches =
            batchesData.map(
                batch =>
                    new MedicineBatch(batch)
            );

        const availability = [];

        for (
            const item of this.currentPrescription.items
        ) {
            const medicineData =
                medicinesData.find(
                    medicine =>
                        String(
                            medicine.medicineId
                        ) ===
                        String(
                            item.medicineId
                        )
                );

            const quantityRequired =
                item.getRemainingQuantity();

            if (!medicineData) {
                availability.push({
                    medicineId:
                        item.medicineId,
                    available: false,
                    quantityAvailable: 0,
                    quantityRequired
                });

                continue;
            }

            const medicine =
                new Medicine(medicineData);

            const medicineBatches =
                batches.filter(
                    batch =>
                        String(
                            batch.medicineId
                        ) ===
                        String(
                            medicine.medicineId
                        )
                );

            const availableBatches =
                medicine.getAvailableBatches(
                    medicineBatches
                );

            const quantityAvailable =
                availableBatches.reduce(
                    (total, batch) =>
                        total +
                        batch.quantityOnHand,
                    0
                );

            availability.push({
                medicineId:
                    item.medicineId,

                available:
                    quantityAvailable >=
                    quantityRequired,

                quantityAvailable,
                quantityRequired
            });
        }

        return availability;
    }

    confirmDispensing(
        itemsToDispense,
        dispensingStaffId
    ) {
        if (!this.currentPrescription) {
            throw new Error(
                "No prescription has been retrieved."
            );
        }

        if (!this.verified) {
            throw new Error(
                "Prescription must be verified before dispensing."
            );
        }

        if (
            !Array.isArray(itemsToDispense) ||
            itemsToDispense.length === 0
        ) {
            throw new Error(
                "At least one item must be dispensed."
            );
        }

        if (!dispensingStaffId) {
            throw new Error(
                "Dispensing staff ID is required."
            );
        }

        const medicinesData =
            this.storage.findAll(
                STORAGE_KEYS.MEDICINES
            ) || [];

        const batches =
            (
                this.storage.findAll(
                    STORAGE_KEYS.MEDICINE_BATCHES
                ) || []
            ).map(
                batch =>
                    new MedicineBatch(batch)
            );

        const plannedDispensing = [];
        let totalCharge = 0;

        /*
         * Validate and plan the entire dispensing
         * operation before modifying storage.
         */
        for (
            const requestedItem
            of itemsToDispense
        ) {
            const medicineId =
                String(
                    requestedItem.medicineId
                );

            const quantity =
                Number(
                    requestedItem.quantity ??
                    requestedItem.quantityDispensed
                );

            if (
                !medicineId ||
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {
                throw new Error(
                    `Invalid quantity for medicine ${medicineId}.`
                );
            }

            const prescriptionItem =
                this.currentPrescription.getItem(
                    medicineId
                );

            if (!prescriptionItem) {
                throw new Error(
                    `Medicine ${medicineId} is not included in the prescription.`
                );
            }

            const remaining =
                prescriptionItem.getRemainingQuantity();

            if (quantity > remaining) {
                throw new Error(
                    `Cannot dispense ${quantity} of medicine ${medicineId}. ` +
                    `Only ${remaining} remains.`
                );
            }

            const medicineData =
                medicinesData.find(
                    medicine =>
                        String(
                            medicine.medicineId
                        ) === medicineId
                );

            if (!medicineData) {
                throw new Error(
                    `Medicine not found: ${medicineId}`
                );
            }

            const medicine =
                new Medicine(medicineData);

            const availableBatches =
                batches
                    .filter(
                        batch =>
                            String(
                                batch.medicineId
                            ) === medicineId &&
                            !batch.isExpired() &&
                            batch.quantityOnHand > 0
                    )
                    .sort(
                        (a, b) =>
                            new Date(
                                a.expiryDate
                            ) -
                            new Date(
                                b.expiryDate
                            )
                    );

            const totalAvailable =
                availableBatches.reduce(
                    (total, batch) =>
                        total +
                        batch.quantityOnHand,
                    0
                );

            if (
                totalAvailable < quantity
            ) {
                throw new Error(
                    `Insufficient stock for ${medicine.name}.`
                );
            }

            let remainingToAllocate =
                quantity;

            const allocations = [];

            for (
                const batch of availableBatches
            ) {
                if (
                    remainingToAllocate <= 0
                ) {
                    break;
                }

                const allocationQuantity =
                    Math.min(
                        remainingToAllocate,
                        batch.quantityOnHand
                    );

                allocations.push({
                    batchId:
                        batch.batchId,
                    quantity:
                        allocationQuantity
                });

                remainingToAllocate -=
                    allocationQuantity;
            }

            const charge =
                quantity *
                medicine.getPrice();

            plannedDispensing.push({
                medicineId,
                quantity,
                allocations,
                charge
            });

            totalCharge += charge;
        }

        /*
         * Apply planned stock reductions.
         */
        for (
            const plan of plannedDispensing
        ) {
            for (
                const allocation
                of plan.allocations
            ) {
                const batch =
                    batches.find(
                        item =>
                            String(
                                item.batchId
                            ) ===
                            String(
                                allocation.batchId
                            )
                    );

                if (!batch) {
                    throw new Error(
                        `Batch not found: ${allocation.batchId}`
                    );
                }

                batch.reduceQuantity(
                    allocation.quantity
                );

                this.storage.save(
                    STORAGE_KEYS.MEDICINE_BATCHES,
                    batch.toObject(),
                    "batchId"
                );
            }
        }

        const dispensingRecords = [];

        /*
         * Record dispensing against the prescription.
         */
        for (
            const plan of plannedDispensing
        ) {
            this.currentPrescription.recordDispensing(
                plan.medicineId,
                plan.quantity
            );

            for (
                const allocation
                of plan.allocations
            ) {
                const record =
                    new DispensingRecord({
                        dispensingId:
                            this.storage.generateId(
                                "DISP"
                            ),

                        prescriptionId:
                            this.currentPrescription
                                .prescriptionId,

                        medicineId:
                            plan.medicineId,

                        batchId:
                            allocation.batchId,

                        quantityDispensed:
                            allocation.quantity,

                        dispensedDateTime:
                            new Date().toISOString(),

                        dispensedBy:
                            dispensingStaffId
                    });

                const validation =
                    record.validate();

                if (!validation.valid) {
                    throw new Error(
                        `Invalid dispensing record: ${validation.errors.join(", ")}`
                    );
                }

                this.storage.save(
                    STORAGE_KEYS.DISPENSING_RECORDS,
                    record.toObject(),
                    "dispensingId"
                );

                dispensingRecords.push(
                    record.toObject()
                );
            }
        }

        this.storage.savePrescription(
            this.currentPrescription.toObject()
        );

        /*
         * DCD relationship:
         * Prescription 1 — 0..1 PendingCharge
         *
         * Reuse an existing pending charge if one
         * already exists for this prescription.
         */
        const existingCharges =
            this.storage.findAll(
                STORAGE_KEYS.PENDING_CHARGES
            ) || [];

        const existingPendingCharge =
            existingCharges.find(
                charge =>
                    String(
                        charge.prescriptionId
                    ) ===
                        String(
                            this.currentPrescription
                                .prescriptionId
                        ) &&
                    charge.status ===
                        CHARGE_STATUS.PENDING
            );

        let charge;

        if (existingPendingCharge) {
            charge =
                new PendingCharge(
                    existingPendingCharge
                );

            charge.amount = Number(
                (
                    Number(charge.amount) +
                    Number(totalCharge)
                ).toFixed(2)
            );
        } else {
            charge =
                new PendingCharge({
                    chargeId:
                        this.storage.generateId(
                            "CHG"
                        ),

                    reference:
                        `RX-${this.currentPrescription.prescriptionId}-${Date.now()}`,

                    prescriptionId:
                        this.currentPrescription
                            .prescriptionId,

                    amount:
                        Number(
                            totalCharge.toFixed(2)
                        ),

                    status:
                        CHARGE_STATUS.PENDING,

                    createdDateTime:
                        new Date().toISOString()
                });
        }

        const chargeValidation =
            charge.validate();

        if (!chargeValidation.valid) {
            throw new Error(
                `Invalid pending charge: ${chargeValidation.errors.join(", ")}`
            );
        }

        this.storage.savePendingCharge(
            charge.toObject()
        );

        const result = {
            success: true,

            prescription:
                this.currentPrescription.toObject(),

            dispensingRecords,

            pendingCharge:
                charge.toObject(),

            totalCharge:
                charge.amount
        };

        this.currentPrescription = null;
        this.verified = false;

        return result;
    }

    cancelDispensing() {
        this.currentPrescription = null;
        this.verified = false;

        return true;
    }
}