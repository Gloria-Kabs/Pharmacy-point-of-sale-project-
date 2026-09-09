import { describe, it, expect, beforeEach, vi } from "vitest";

import { SalesController } from "../js/controllers/SalesController.js";
import { STORAGE_KEYS } from "../js/utils/StorageKeys.js";
import { PAYMENT_METHODS } from "../js/models/Payment.js";
import { SALE_STATUS } from "../js/models/Sale.js";


function createMockStorage() {
    const data = new Map();

    let idCounters = {};

    return {
        get(key) {
            return data.has(key) ? data.get(key) : null;
        },

        set(key, value) {
            data.set(key, value);
        },

        findAll(key) {
            return data.get(key) || [];
        },

        findById(key, id, idField = "id") {
            const records = data.get(key) || [];

            return (
                records.find(
                    record =>
                        String(record[idField]) === String(id)
                ) || null
            );
        },

        save(key, record, idField = "id") {
            const records = data.get(key) || [];

            const index = records.findIndex(
                existing =>
                    String(existing[idField]) ===
                    String(record[idField])
            );

            if (index >= 0) {
                records[index] = record;
            } else {
                records.push(record);
            }

            data.set(key, records);

            return record;
        },

        generateId(prefix) {
            idCounters[prefix] =
                (idCounters[prefix] || 0) + 1;

            return `${prefix}-000${idCounters[prefix]}`;
        },

        findMedicineById(id) {
            const medicines =
                data.get(STORAGE_KEYS.MEDICINES) || [];

            return (
                medicines.find(
                    medicine =>
                        String(medicine.medicineId) ===
                        String(id)
                ) || null
            );
        },

        findPendingChargeByReference(reference) {
            const charges =
                data.get(STORAGE_KEYS.PENDING_CHARGES) || [];

            return (
                charges.find(
                    charge =>
                        String(charge.reference) ===
                        String(reference)
                ) || null
            );
        },

        savePendingCharge(charge) {
            return this.save(
                STORAGE_KEYS.PENDING_CHARGES,
                charge,
                "chargeId"
            );
        },

        saveSalesLineItem(item) {
            return this.save(
                STORAGE_KEYS.SALES_LINE_ITEMS,
                item,
                "salesLineItemId"
            );
        },

        saveMedicine(medicine) {
            return this.save(
                STORAGE_KEYS.MEDICINES,
                medicine,
                "medicineId"
            );
        },

        saveBatch(batch) {
            return this.save(
                STORAGE_KEYS.MEDICINE_BATCHES,
                batch,
                "batchId"
            );
        }
    };
}


function seedMedicine(storage, {
    medicineId = "MED-001",
    name = "Amoxicillin 500mg",
    unitPrice = 10,
    quantityOnHand = 20
} = {}) {
    storage.saveMedicine({
        medicineId,
        name,
        description: "Antibiotic",
        unitPrice,
        reorderLevel: 5
    });

    storage.saveBatch({
        batchId: `BATCH-${medicineId}`,
        batchNumber: `BN-${medicineId}`,
        medicineId,
        expiryDate: "2030-12-31",
        quantityOnHand,
        receivedDate: "2026-01-01"
    });
}


describe("SalesController", () => {
    let storage;
    let controller;

    beforeEach(() => {
        storage = createMockStorage();
        controller = new SalesController(storage);
    });


    describe("startSale()", () => {
        it("should start an empty sale", () => {
            const sale = controller.startSale();

            expect(sale).toBeDefined();
            expect(sale.saleId).toBe("SALE-0001");
            expect(sale.status).toBe(SALE_STATUS.OPEN);
            expect(sale.items).toHaveLength(0);
            expect(sale.total).toBe(0);
        });

        it("should allow a customer to be associated with the sale", () => {
            const sale =
                controller.startSale("CUST-1001");

            expect(sale.customerId).toBe("CUST-1001");
        });

        it("should not allow a second sale while one is active", () => {
            controller.startSale();

            expect(() =>
                controller.startSale()
            ).toThrow(/already an active sale/i);
        });
    });


    describe("enterItem()", () => {
        beforeEach(() => {
            seedMedicine(storage);
            controller.startSale();
        });

        it("should add a medicine to the current sale", () => {
            const lineItem =
                controller.enterItem("MED-001", 2);

            expect(lineItem.medicineId).toBe("MED-001");
            expect(lineItem.description)
                .toBe("Amoxicillin 500mg");
            expect(lineItem.quantity).toBe(2);
            expect(lineItem.unitPrice).toBe(10);
        });

        it("should calculate the sale total correctly", () => {
            controller.enterItem("MED-001", 3);

            expect(controller.currentSale.total)
                .toBe(30);
        });

        it("should combine repeated entries through the sale", () => {
            controller.enterItem("MED-001", 2);
            controller.enterItem("MED-001", 3);
            
            expect(
                controller.currentSale.items
            ).toHaveLength(1);
            
            expect(
                controller.currentSale.items[0].quantity
            ).toBe(5);
            
            expect(
                controller.currentSale.total
            ).toBe(50);
        });

        it("should reject an unknown medicine", () => {
            expect(() =>
                controller.enterItem("MED-999", 1)
            ).toThrow(/Medicine not found/);
        });

        it("should reject zero quantity", () => {
            expect(() =>
                controller.enterItem("MED-001", 0)
            ).toThrow(/positive whole number/i);
        });

        it("should reject negative quantity", () => {
            expect(() =>
                controller.enterItem("MED-001", -1)
            ).toThrow(/positive whole number/i);
        });

        it("should reject non-integer quantity", () => {
            expect(() =>
                controller.enterItem("MED-001", 1.5)
            ).toThrow(/positive whole number/i);
        });

        it("should reject quantity greater than available stock", () => {
            expect(() =>
                controller.enterItem("MED-001", 25)
            ).toThrow(/Insufficient stock/);
        });

        it("should account for quantities already entered", () => {
            controller.enterItem("MED-001", 15);

            expect(() =>
                controller.enterItem("MED-001", 6)
            ).toThrow(/Insufficient stock/);
        });

        it("should reject adding an item before starting a sale", () => {
            const freshController =
                new SalesController(storage);

            expect(() =>
                freshController.enterItem(
                    "MED-001",
                    1
                )
            ).toThrow(/No active sale/);
        });
    });


    describe("selectPayment()", () => {
        beforeEach(() => {
            seedMedicine(storage);
            controller.startSale();
            controller.enterItem("MED-001", 2);
        });

        it("should accept a valid cash payment", () => {
            const payment =
                controller.selectPayment(
                    PAYMENT_METHODS.CASH,
                    20
                );

            expect(payment.method)
                .toBe(PAYMENT_METHODS.CASH);

            expect(payment.amountTendered)
                .toBe(20);

            expect(payment.change)
                .toBe(0);
        });

        it("should calculate change correctly", () => {
            const payment =
                controller.selectPayment(
                    PAYMENT_METHODS.CASH,
                    25
                );

            expect(payment.change)
                .toBe(5);
        });

        it("should reject insufficient payment", () => {
            expect(() =>
                controller.selectPayment(
                    PAYMENT_METHODS.CASH,
                    15
                )
            ).toThrow(/Amount tendered is insufficient/i);
        });

        it("should reject an invalid payment method", () => {
            expect(() =>
                controller.selectPayment(
                    "BITCOIN",
                    20
                )
            ).toThrow(/Invalid payment method/);
        });

        it("should reject negative payment amounts", () => {
            expect(() =>
                controller.selectPayment(
                    PAYMENT_METHODS.CASH,
                    -1
                )
            ).toThrow(/non-negative number/i);
        });
    });


    describe("confirmSale()", () => {
        beforeEach(() => {
            seedMedicine(storage);
            controller.startSale();
            controller.enterItem("MED-001", 2);
            controller.selectPayment(
                PAYMENT_METHODS.CASH,
                25
            );
        });

        it("should complete the sale", () => {
            const receipt =
                controller.confirmSale();

            expect(receipt).toBeDefined();
            expect(receipt.saleId)
                .toBe("SALE-0001");
        });

        it("should save the completed sale", () => {
            controller.confirmSale();

            const sales =
                storage.findAll(
                    STORAGE_KEYS.SALES
                );

            expect(sales).toHaveLength(1);
            expect(sales[0].saleId)
                .toBe("SALE-0001");
            expect(sales[0].status)
                .toBe(SALE_STATUS.COMPLETED);
            expect(sales[0].total)
                .toBe(20);
        });

        it("should save the payment", () => {
            controller.confirmSale();

            const payments =
                storage.findAll(
                    STORAGE_KEYS.PAYMENTS
                );

            expect(payments).toHaveLength(1);
            expect(payments[0].amountTendered)
                .toBe(25);
        });

        it("should save the receipt", () => {
            const receipt =
                controller.confirmSale();

            const receipts =
                storage.findAll(
                    STORAGE_KEYS.RECEIPTS
                );

            expect(receipts).toHaveLength(1);
            expect(receipts[0].receiptId)
                .toBe(receipt.receiptId);
        });

        it("should save the sales line item", () => {
            controller.confirmSale();

            const items =
                storage.findAll(
                    STORAGE_KEYS.SALES_LINE_ITEMS
                );

            expect(items).toHaveLength(1);
            expect(items[0].medicineId)
                .toBe("MED-001");
            expect(items[0].quantity)
                .toBe(2);
        });

        it("should reduce medicine stock", () => {
            controller.confirmSale();

            const batches =
                storage.findAll(
                    STORAGE_KEYS.MEDICINE_BATCHES
                );

            expect(
                batches[0].quantityOnHand
            ).toBe(18);
        });

        it("should clear the current sale after confirmation", () => {
            controller.confirmSale();

            expect(
                controller.getCurrentSale()
            ).toBeNull();
        });

        it("should require payment before confirmation", () => {
            const freshController =
                new SalesController(storage);

            freshController.startSale();
            freshController.enterItem(
                "MED-001",
                1
            );

            expect(() =>
                freshController.confirmSale()
            ).toThrow(/Payment must be selected/);
        });
    });


    describe("cancelSale()", () => {
        beforeEach(() => {
            seedMedicine(storage);
            controller.startSale();
            controller.enterItem("MED-001", 2);
        });

        it("should cancel the current sale", () => {
            const cancelled =
                controller.cancelSale();

            expect(cancelled.status)
                .toBe(SALE_STATUS.CANCELLED);
        });

        it("should save the cancelled sale", () => {
            controller.cancelSale();

            const sales =
                storage.findAll(
                    STORAGE_KEYS.SALES
                );

            expect(sales).toHaveLength(1);
            expect(sales[0].status)
                .toBe(SALE_STATUS.CANCELLED);
        });

        it("should not reduce stock when a sale is cancelled", () => {
            controller.cancelSale();

            const batches =
                storage.findAll(
                    STORAGE_KEYS.MEDICINE_BATCHES
                );

            expect(
                batches[0].quantityOnHand
            ).toBe(20);
        });

        it("should clear the current sale", () => {
            controller.cancelSale();

            expect(
                controller.getCurrentSale()
            ).toBeNull();
        });
    });
});