import { describe, it, expect, beforeEach } from "vitest";
import { StorageService } from "../js/storage/StorageService.js";
import { STORAGE_KEYS } from "../js/utils/StorageKeys.js";

function createMockStorage() {
    const data = new Map();

    return {
        getItem(key) {
            return data.has(key) ? data.get(key) : null;
        },

        setItem(key, value) {
            data.set(key, String(value));
        },

        removeItem(key) {
            data.delete(key);
        },

        clear() {
            data.clear();
        }
    };
}

describe("StorageService", () => {
    let mockStorage;
    let storage;

    beforeEach(() => {
        mockStorage = createMockStorage();
        storage = new StorageService(mockStorage);
    });

    describe("Basic storage operations", () => {
        it("should store and retrieve JSON data", () => {
            const data = {
                medicineId: "MED-001",
                name: "Test Medicine"
            };

            storage.set("test_key", data);

            expect(storage.get("test_key")).toEqual(data);
        });

        it("should return null for a missing key", () => {
            expect(storage.get("missing_key")).toBeNull();
        });

        it("should remove stored data", () => {
            storage.set("test_key", { value: "test" });

            storage.remove("test_key");

            expect(storage.get("test_key")).toBeNull();
        });

        it("should check whether a key exists", () => {
            expect(storage.exists("test_key")).toBe(false);

            storage.set("test_key", { value: "test" });

            expect(storage.exists("test_key")).toBe(true);
        });

        it("should safely handle invalid JSON", () => {
            mockStorage.setItem("broken_key", "{invalid json");

            expect(storage.get("broken_key")).toBeNull();
        });
    });

    describe("Generic CRUD operations", () => {
        it("should return an empty array when no records exist", () => {
            expect(
                storage.findAll(STORAGE_KEYS.MEDICINES)
            ).toEqual([]);
        });

        it("should save and retrieve a record by ID", () => {
            const medicine = {
                medicineId: "MED-001",
                name: "Paracetamol",
                unitPrice: 5.5
            };

            storage.save(
                STORAGE_KEYS.MEDICINES,
                medicine,
                "medicineId"
            );

            expect(
                storage.findById(
                    STORAGE_KEYS.MEDICINES,
                    "MED-001",
                    "medicineId"
                )
            ).toEqual(medicine);
        });

        it("should update an existing record instead of creating a duplicate", () => {
            storage.save(
                STORAGE_KEYS.MEDICINES,
                {
                    medicineId: "MED-001",
                    name: "Old Name"
                },
                "medicineId"
            );

            storage.save(
                STORAGE_KEYS.MEDICINES,
                {
                    medicineId: "MED-001",
                    name: "New Name"
                },
                "medicineId"
            );

            const medicines = storage.findAll(STORAGE_KEYS.MEDICINES);

            expect(medicines).toHaveLength(1);
            expect(medicines[0].name).toBe("New Name");
        });

        it("should reject a record without an ID", () => {
            expect(() => {
                storage.save(
                    STORAGE_KEYS.MEDICINES,
                    { name: "Invalid Medicine" },
                    "medicineId"
                );
            }).toThrow();
        });

        it("should delete a record by ID", () => {
            storage.save(
                STORAGE_KEYS.MEDICINES,
                {
                    medicineId: "MED-001",
                    name: "Paracetamol"
                },
                "medicineId"
            );

            expect(
                storage.delete(
                    STORAGE_KEYS.MEDICINES,
                    "MED-001",
                    "medicineId"
                )
            ).toBe(true);

            expect(
                storage.findById(
                    STORAGE_KEYS.MEDICINES,
                    "MED-001",
                    "medicineId"
                )
            ).toBeNull();
        });

        it("should generate IDs with the requested prefix", () => {
            const id = storage.generateId("MED");

            expect(id).toMatch(/^MED-/);
        });
    });

    describe("Medicine storage", () => {
        it("should save and retrieve medicines", () => {
            const medicine = {
                medicineId: "MED-001",
                name: "Paracetamol",
                description: "Pain relief",
                unitPrice: 3.5,
                reorderLevel: 20
            };

            storage.saveMedicine(medicine);

            expect(
                storage.findMedicineById("MED-001")
            ).toEqual(medicine);
        });

        it("should retrieve all medicines", () => {
            storage.saveMedicine({
                medicineId: "MED-001",
                name: "Paracetamol"
            });

            storage.saveMedicine({
                medicineId: "MED-002",
                name: "Ibuprofen"
            });

            expect(storage.findAllMedicines()).toHaveLength(2);
        });
    });

    describe("Medicine batch storage", () => {
        it("should save and retrieve medicine batches", () => {
            const batch = {
                batchId: "BATCH-001",
                batchNumber: "B-2026-001",
                medicineId: "MED-001",
                expiryDate: "2027-12-31",
                quantityOnHand: 100
            };

            storage.save(
                STORAGE_KEYS.MEDICINE_BATCHES,
                batch,
                "batchId"
            );

            expect(
                storage.findById(
                    STORAGE_KEYS.MEDICINE_BATCHES,
                    "BATCH-001",
                    "batchId"
                )
            ).toEqual(batch);
        });

        it("should retrieve batches belonging to a medicine", () => {
            storage.save(
                STORAGE_KEYS.MEDICINE_BATCHES,
                {
                    batchId: "BATCH-001",
                    medicineId: "MED-001",
                    quantityOnHand: 100
                },
                "batchId"
            );

            storage.save(
                STORAGE_KEYS.MEDICINE_BATCHES,
                {
                    batchId: "BATCH-002",
                    medicineId: "MED-002",
                    quantityOnHand: 50
                },
                "batchId"
            );

            const batches = storage
                .findAll(STORAGE_KEYS.MEDICINE_BATCHES)
                .filter(batch => batch.medicineId === "MED-001");

            expect(batches).toHaveLength(1);
            expect(batches[0].batchId).toBe("BATCH-001");
        });
    });

    describe("Prescription storage", () => {
        it("should save and retrieve prescriptions", () => {
            const prescription = {
                prescriptionId: "RX-001",
                customerId: "CUST-001",
                dateIssued: "2026-09-01",
                expiryDate: "2026-10-01",
                status: "ACTIVE",
                items: []
            };

            storage.savePrescription(prescription);

            expect(
                storage.findPrescriptionById("RX-001")
            ).toEqual(prescription);
        });
    });

    describe("Pending charge storage", () => {
        it("should save and retrieve pending charges", () => {
            const charge = {
                chargeId: "CHARGE-001",
                reference: "RX-001",
                amount: 25,
                status: "PENDING"
            };

            storage.savePendingCharge(charge);

            expect(
                storage.findPendingChargeById("CHARGE-001")
            ).toEqual(charge);
        });
    });

    describe("Sales storage", () => {
        it("should save and retrieve sales", () => {
            const sale = {
                saleId: "SALE-001",
                dateTime: "2026-09-01T10:00:00.000Z",
                total: 25,
                status: "COMPLETED"
            };

            storage.saveSale(sale);

            expect(
                storage.findSaleById("SALE-001")
            ).toEqual(sale);
        });
    });

    describe("Session storage", () => {
        it("should save and retrieve the current session", () => {
            const session = {
                userId: "USR-001",
                username: "cashier",
                role: "CASHIER"
            };

            storage.saveSession(session);

            expect(storage.getSession()).toEqual(session);
        });

        it("should clear the current session", () => {
            storage.saveSession({
                userId: "USR-001",
                username: "cashier",
                role: "CASHIER"
            });

            storage.clearSession();

            expect(storage.getSession()).toBeNull();
        });
    });

    describe("Key clearing", () => {
        it("should clear selected storage keys without clearing unrelated data", () => {
            storage.saveMedicine({
                medicineId: "MED-001",
                name: "Paracetamol"
            });

            storage.set(STORAGE_KEYS.SESSION, {
                userId: "USR-001"
            });

            storage.clearKeys([
                STORAGE_KEYS.MEDICINES
            ]);

            expect(storage.findAllMedicines()).toEqual([]);
            expect(storage.get(STORAGE_KEYS.SESSION)).toEqual({
                userId: "USR-001"
            });
        });
    });
});
