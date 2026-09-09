import { Sale, SALE_STATUS } from "../models/Sale.js";
import { SalesLineItem } from "../models/SalesLineItem.js";
import {
    Payment,
    PAYMENT_METHODS
} from "../models/Payment.js";
import {
    PendingCharge,
    CHARGE_STATUS
} from "../models/PendingCharge.js";
import { Receipt } from "../models/Receipt.js";
import {
    Medicine,
    MedicineBatch
} from "../models/Medicine.js";
import { InventoryController } from "./InventoryController.js";
import { StorageService } from "../storage/StorageService.js";
import { STORAGE_KEYS } from "../utils/StorageKeys.js";

export class SalesController {
    constructor(storageService = StorageService) {
        if (!storageService) {
            throw new Error(
                "SalesController requires a storage service."
            );
        }

        this.storage = storageService;
        this.inventoryController =
            new InventoryController(this.storage);

        this.currentSale = null;
        this.currentPayment = null;
    }

    startSale(customerId = null) {
        if (this.currentSale) {
            throw new Error(
                "There is already an active sale."
            );
        }

        const saleId =
            this.storage.generateId("SALE");

        this.currentSale = new Sale({
            saleId,
            customerId,
            dateTime: new Date().toISOString(),
            status: SALE_STATUS.OPEN
        });

        this.currentPayment = null;

        return this.currentSale;
    }

    enterItem(itemId, quantity = 1) {
        this.requireCurrentSale();

        const medicineId = String(itemId);
        const requestedQuantity = Number(quantity);

        if (!medicineId) {
            throw new Error(
                "Medicine ID is required."
            );
        }

        if (
            !Number.isInteger(requestedQuantity) ||
            requestedQuantity <= 0
        ) {
            throw new Error(
                "Quantity must be a positive whole number."
            );
        }

        const medicineData =
            this.storage.findMedicineById(medicineId);

        if (!medicineData) {
            throw new Error(
                `Medicine not found: ${medicineId}`
            );
        }

        const medicine =
            new Medicine(medicineData);

        const batchesData =
            this.storage.findAll(
                STORAGE_KEYS.MEDICINE_BATCHES
            ) || [];

        const batches = batchesData
            .filter(
                batch =>
                    String(batch.medicineId) ===
                    medicineId
            )
            .map(
                batch =>
                    new MedicineBatch(batch)
            );

        const availableStock =
            medicine.getTotalStock(batches);

        /*
         * Account for quantities of the same medicine
         * already entered into the current sale.
         */
        const alreadyEntered =
            this.currentSale.items
                .filter(
                    item =>
                        String(item.medicineId) ===
                        medicineId
                )
                .reduce(
                    (total, item) =>
                        total + item.quantity,
                    0
                );

        const remainingAvailable =
            availableStock - alreadyEntered;

        if (
            remainingAvailable <
            requestedQuantity
        ) {
            throw new Error(
                `Insufficient stock for ${medicine.name}. ` +
                `Available: ${remainingAvailable}, ` +
                `requested: ${requestedQuantity}.`
            );
        }

        const lineItem =
            new SalesLineItem({
                salesLineItemId:
                    this.storage.generateId("LINE"),
                medicineId:
                    medicine.medicineId,
                description:
                    medicine.name,
                quantity:
                    requestedQuantity,
                unitPrice:
                    medicine.getPrice()
            });

        this.currentSale.addLineItem(
            lineItem
        );

        /*
         * Changing the sale total invalidates
         * any previously selected payment.
         */
        this.currentPayment = null;

        return lineItem;
    }

    enterPendingCharge(reference) {
        this.requireCurrentSale();

        if (!reference) {
            throw new Error(
                "Pending charge reference is required."
            );
        }

        const chargeData =
            this.storage
                .findPendingChargeByReference(
                    String(reference)
                );

        if (!chargeData) {
            throw new Error(
                `Pending charge not found: ${reference}`
            );
        }

        const charge =
            new PendingCharge(chargeData);

        if (
            charge.status !==
            CHARGE_STATUS.PENDING
        ) {
            throw new Error(
                "This pending charge has already been paid."
            );
        }

        if (
            this.currentSale.pendingChargeId &&
            this.currentSale.pendingChargeId !==
                charge.chargeId
        ) {
            throw new Error(
                "Only one pending charge can be added to a sale."
            );
        }

        this.currentSale.addPendingCharge(
            charge
        );

        this.currentPayment = null;

        return charge;
    }

    selectPayment(method, amount) {
        this.requireCurrentSale();

        if (
            !Object.values(PAYMENT_METHODS)
                .includes(method)
        ) {
            throw new Error(
                `Invalid payment method: ${method}`
            );
        }

        const amountTendered =
            Number(amount);

        if (
            !Number.isFinite(
                amountTendered
            ) ||
            amountTendered < 0
        ) {
            throw new Error(
                "Payment amount must be a valid non-negative number."
            );
        }

        const payment =
            new Payment({
                paymentId:
                    this.storage.generateId(
                        "PAY"
                    ),
                saleId:
                    this.currentSale.saleId,
                method,
                amountTendered
            });

        payment.calculateChange(
            this.currentSale.total
        );

        const validation =
            payment.validate(
                this.currentSale.total
            );

        if (!validation.valid) {
            throw new Error(
                `Invalid payment: ${validation.errors.join(
                    ", "
                )}`
            );
        }

        this.currentPayment =
            payment;

        this.currentSale.recordPayment(
            payment
        );

        return payment;
    }

    confirmSale() {
        this.requireCurrentSale();

        if (!this.currentPayment) {
            throw new Error(
                "Payment must be selected before confirming the sale."
            );
        }

        /*
         * Re-check stock immediately before
         * committing the sale.
         */
        const stockRequirements =
            this.currentSale.items.filter(
                item => item.medicineId
            );

        for (
            const item of stockRequirements
        ) {
            const medicineData =
                this.storage.findMedicineById(
                    item.medicineId
                );

            if (!medicineData) {
                throw new Error(
                    `Medicine no longer exists: ${item.medicineId}`
                );
            }

            const medicine =
                new Medicine(medicineData);

            const batchesData =
                this.storage.findAll(
                    STORAGE_KEYS.MEDICINE_BATCHES
                ) || [];

            const batches = batchesData
                .filter(
                    batch =>
                        String(
                            batch.medicineId
                        ) ===
                        String(
                            item.medicineId
                        )
                )
                .map(
                    batch =>
                        new MedicineBatch(
                            batch
                        )
                );

            const availableStock =
                medicine.getTotalStock(
                    batches
                );

            if (
                availableStock <
                item.quantity
            ) {
                throw new Error(
                    `Insufficient stock for ${medicine.name}. ` +
                    `Available: ${availableStock}, ` +
                    `required: ${item.quantity}.`
                );
            }
        }

        const pendingCharge =
            this.getCurrentPendingCharge();

        /*
         * OTC medicine stock is deducted here.
         * Prescription medicine stock was already
         * deducted during dispensing.
         */
        for (
            const item of stockRequirements
        ) {
            this.inventoryController.reduceStock(
                item.medicineId,
                item.quantity
            );
        }

        /*
         * A pending prescription charge becomes
         * paid only when the complete sale succeeds.
         */
        if (pendingCharge) {
            pendingCharge.markPaid();

            this.storage.savePendingCharge(
                pendingCharge.toObject()
            );
        }

        this.currentSale.recordPayment(
            this.currentPayment
        );

        this.currentSale.complete();

        const saleObject =
            this.currentSale.toObject();

        this.storage.save(
            STORAGE_KEYS.SALES,
            saleObject,
            "saleId"
        );

        /*
         * Save each line item individually.
         */
        for (
            const item of this.currentSale.items
        ) {
            this.storage.saveSalesLineItem(
                item.toObject()
            );
        }

        this.storage.save(
            STORAGE_KEYS.PAYMENTS,
            this.currentPayment.toObject(),
            "paymentId"
        );

        const receipt =
            new Receipt({
                receiptId:
                    this.storage.generateId(
                        "RECEIPT"
                    ),
                saleId:
                    this.currentSale.saleId
            });

        const receiptData =
            receipt.generate(
                this.currentSale,
                this.currentPayment
            );

        this.storage.save(
            STORAGE_KEYS.RECEIPTS,
            receiptData,
            "receiptId"
        );

        const result = {
            sale: saleObject,
            payment:
                this.currentPayment.toObject(),
            receipt: receiptData
        };

        this.currentSale = null;
        this.currentPayment = null;

        return result.receipt;
    }

    cancelSale() {
        this.requireCurrentSale();

        this.currentSale.cancel();

        const cancelledSale =
            this.currentSale.toObject();

        this.storage.save(
            STORAGE_KEYS.SALES,
            cancelledSale,
            "saleId"
        );

        this.currentSale = null;
        this.currentPayment = null;

        return cancelledSale;
    }

    getCurrentSale() {
        return this.currentSale;
    }

    getAll() {
        return (
            this.storage.findAll(
                STORAGE_KEYS.SALES
            ) || []
        );
    }

    getById(saleId) {
        return this.storage.findById(
            STORAGE_KEYS.SALES,
            String(saleId),
            "saleId"
        );
    }

    getCurrentPendingCharge() {
        if (
            !this.currentSale?.pendingChargeId
        ) {
            return null;
        }

        const chargeData =
            this.storage.findById(
                STORAGE_KEYS.PENDING_CHARGES,
                this.currentSale.pendingChargeId,
                "chargeId"
            );

        return chargeData
            ? new PendingCharge(chargeData)
            : null;
    }

    requireCurrentSale() {
        if (!this.currentSale) {
            throw new Error(
                "No active sale. Call startSale() first."
            );
        }

        if (
            this.currentSale.status !==
            SALE_STATUS.OPEN
        ) {
            throw new Error(
                "The current sale is no longer open."
            );
        }
    }
}