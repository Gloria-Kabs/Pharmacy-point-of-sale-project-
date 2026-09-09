import { describe, it, expect, beforeEach } from "vitest";
import { ReportController } from "../js/controllers/ReportController.js";
import { STORAGE_KEYS } from "../js/utils/StorageKeys.js";

function createMockStorage() {
    const data = new Map();

    return {
        findAll(key) {
            return data.get(key) || [];
        },

        save(key, value, idField) {
            const records = data.get(key) || [];

            if (idField) {
                const index = records.findIndex(
                    record =>
                        String(record[idField]) ===
                        String(value[idField])
                );

                if (index >= 0) {
                    records[index] = value;
                } else {
                    records.push(value);
                }
            } else {
                records.push(value);
            }

            data.set(key, records);
            return value;
        }
    };
}

describe("ReportController", () => {
    let storage;
    let controller;

    beforeEach(() => {
        storage = createMockStorage();
        controller = new ReportController(storage);
    });

    describe("generateReport()", () => {
        it("should generate a sales report", () => {
            storage.save(STORAGE_KEYS.SALES, {
                saleId: "SALE-001",
                dateTime: "2026-01-10T10:00:00.000Z",
                total: 100,
                status: "COMPLETED"
            });

            storage.save(STORAGE_KEYS.SALES, {
                saleId: "SALE-002",
                dateTime: "2026-01-11T10:00:00.000Z",
                total: 50,
                status: "COMPLETED"
            });

            const report = controller.generateReport("SALES");

            expect(report).toBeDefined();
            expect(report.count).toBe(2);
            expect(report.total).toBe(150);
            expect(report.sales).toHaveLength(2);
        });

        it("should generate an inventory report using medicine batches", () => {
            storage.save(STORAGE_KEYS.MEDICINES, {
                medicineId: "MED-001",
                name: "Aspirin",
                description: "Pain relief",
                unitPrice: 5,
                reorderLevel: 10
            });

            storage.save(STORAGE_KEYS.MEDICINE_BATCHES, {
                batchId: "BATCH-001",
                medicineId: "MED-001",
                batchNumber: "ASP-001",
                expiryDate: "2027-01-01",
                quantityOnHand: 5
            });

            const report = controller.generateReport("INVENTORY");

            expect(report).toBeDefined();
            expect(report.inventory).toHaveLength(1);
            expect(report.inventory[0].name).toBe("Aspirin");
        });

        it("should generate a customer report", () => {
            storage.save(STORAGE_KEYS.CUSTOMERS, {
                customerId: "CUST-001",
                name: "Alice",
                phone: "555-1111",
                address: "123 Main Street"
            });

            storage.save(STORAGE_KEYS.CUSTOMERS, {
                customerId: "CUST-002",
                name: "Bob",
                phone: "555-2222",
                address: "456 Main Street"
            });

            const report = controller.generateReport("CUSTOMERS");

            expect(report).toBeDefined();
            expect(report.customers).toHaveLength(2);
        });

        it("should reject an unsupported report type", () => {
            expect(() =>
                controller.generateReport("UNKNOWN")
            ).toThrow();
        });
    });
});