import { StorageService } from "../storage/StorageService.js";
import { STORAGE_KEYS } from "../utils/StorageKeys.js";

export class ReportController {
    constructor(storageService = StorageService) {
        if (!storageService) {
            throw new Error(
                "ReportController requires a storage service."
            );
        }

        this.storage = storageService;
    }

    generateReport(type = "SUMMARY", criteria = {}) {
        const normalizedType = String(type).toUpperCase();

        switch (normalizedType) {
            case "SUMMARY":
                return this.generateSummary(criteria);

            case "SALES":
                return this.generateSalesReport(criteria);

            case "INVENTORY":
                return this.generateInventoryReport(criteria);

            case "CUSTOMERS":
                return this.generateCustomerReport(criteria);

            case "PRESCRIPTIONS":
                return this.generatePrescriptionReport(criteria);

            case "DISPENSING":
                return this.generateDispensingReport(criteria);

            default:
                throw new Error(
                    `Unsupported report type: ${type}`
                );
        }
    }

    outputReport(format = "JSON", report = null) {
        const normalizedFormat = String(format).toUpperCase();
        const reportData =
            report || this.generateReport("SUMMARY");

        switch (normalizedFormat) {
            case "JSON":
                return JSON.stringify(reportData, null, 2);

            case "CSV":
                return this.toCSV(reportData);

            case "OBJECT":
                return reportData;

            default:
                throw new Error(
                    `Unsupported report format: ${format}`
                );
        }
    }

    getCustomers() {
        return this.storage.findAll(
            STORAGE_KEYS.CUSTOMERS
        ) || [];
    }

    getMedicines() {
        return this.storage.findAll(
            STORAGE_KEYS.MEDICINES
        ) || [];
    }

    getPrescriptions() {
        return this.storage.findAll(
            STORAGE_KEYS.PRESCRIPTIONS
        ) || [];
    }

    getDispensingRecords() {
        return this.storage.findAll(
            STORAGE_KEYS.DISPENSING_RECORDS
        ) || [];
    }

    getSales() {
        return this.storage.findAll(
            STORAGE_KEYS.SALES
        ) || [];
    }

    getPayments() {
        return this.storage.findAll(
            STORAGE_KEYS.PAYMENTS
        ) || [];
    }

    getPendingCharges() {
        return this.storage.findAll(
            STORAGE_KEYS.PENDING_CHARGES
        ) || [];
    }

    getCustomerCount() {
        return this.getCustomers().length;
    }

    getMedicineCount() {
        return this.getMedicines().length;
    }

    getPrescriptionCount() {
        return this.getPrescriptions().length;
    }

    getDispensingCount() {
        return this.getDispensingRecords().length;
    }

    getCompletedSales() {
        return this.getSales().filter(
            sale => sale.status === "COMPLETED"
        );
    }

    getPendingSales() {
        // "PENDING" is not a valid Sale status in the DCD.
        // Pending work is represented by PendingCharge.
        return this.getPendingCharges().filter(
            charge => charge.status === "PENDING"
        );
    }

    getCancelledSales() {
        return this.getSales().filter(
            sale => sale.status === "CANCELLED"
        );
    }

    calculateTotalSales() {
        return this.getCompletedSales().reduce(
            (total, sale) =>
                total + Number(sale.total || 0),
            0
        );
    }

    calculateTotalPayments() {
        return this.getPayments().reduce(
            (total, payment) =>
                total + Number(
                    payment.amountTendered ??
                    payment.amount ??
                    0
                ),
            0
        );
    }

    getSalesByPaymentMethod() {
        const result = {};

        this.getPayments().forEach(payment => {
            const method = payment.method || "UNKNOWN";

            if (!result[method]) {
                result[method] = 0;
            }

            result[method] += Number(
                payment.amountTendered ??
                payment.amount ??
                0
            );
        });

        return result;
    }

    generateSummary() {
        return {
            reportType: "SUMMARY",
            generatedAt: new Date().toISOString(),

            totalCustomers: this.getCustomerCount(),
            totalMedicines: this.getMedicineCount(),
            totalPrescriptions: this.getPrescriptionCount(),
            totalDispensingRecords: this.getDispensingCount(),

            completedSales:
                this.getCompletedSales().length,

            pendingCharges:
                this.getPendingSales().length,

            cancelledSales:
                this.getCancelledSales().length,

            totalSales:
                this.calculateTotalSales(),

            totalPayments:
                this.calculateTotalPayments(),

            salesByPaymentMethod:
                this.getSalesByPaymentMethod()
        };
    }

    generateSalesReport(criteria = {}) {
        let sales = this.getSales();

        if (criteria.status) {
            sales = sales.filter(
                sale =>
                    sale.status ===
                    String(criteria.status).toUpperCase()
            );
        }

        if (criteria.customerId) {
            sales = sales.filter(
                sale =>
                    String(sale.customerId) ===
                    String(criteria.customerId)
            );
        }

        if (criteria.from) {
            const fromDate = new Date(criteria.from);

            sales = sales.filter(
                sale =>
                    new Date(sale.dateTime) >= fromDate
            );
        }

        if (criteria.to) {
            const toDate = new Date(criteria.to);

            sales = sales.filter(
                sale =>
                    new Date(sale.dateTime) <= toDate
            );
        }

        return {
            reportType: "SALES",
            generatedAt: new Date().toISOString(),
            criteria,
            count: sales.length,
            total: sales.reduce(
                (total, sale) =>
                    total + Number(sale.total || 0),
                0
            ),
            sales
        };
    }

    generateInventoryReport() {
        const medicines = this.getMedicines();
        const batches =
            this.storage.findAll(
                STORAGE_KEYS.MEDICINE_BATCHES
            ) || [];

        const inventory = medicines.map(medicine => {
            const medicineBatches = batches.filter(
                batch =>
                    String(batch.medicineId) ===
                    String(medicine.medicineId)
            );

            const stock = medicineBatches.reduce(
                (total, batch) =>
                    total + Number(
                        batch.quantityOnHand || 0
                    ),
                0
            );

            return {
                medicineId: medicine.medicineId,
                name: medicine.name,
                unitPrice: Number(
                    medicine.unitPrice || 0
                ),
                reorderLevel: Number(
                    medicine.reorderLevel || 0
                ),
                stock,
                lowStock:
                    stock <=
                    Number(medicine.reorderLevel || 0),
                batches: medicineBatches
            };
        });

        return {
            reportType: "INVENTORY",
            generatedAt: new Date().toISOString(),
            count: inventory.length,
            inventory
        };
    }

    generateCustomerReport() {
        const customers = this.getCustomers();

        return {
            reportType: "CUSTOMERS",
            generatedAt: new Date().toISOString(),
            count: customers.length,
            totalSpent: customers.reduce(
                (total, customer) =>
                    total + Number(
                        customer.totalSpent || 0
                    ),
                0
            ),
            customers
        };
    }

    generatePrescriptionReport(criteria = {}) {
        let prescriptions = this.getPrescriptions();

        if (criteria.status) {
            prescriptions = prescriptions.filter(
                prescription =>
                    prescription.status ===
                    String(criteria.status).toUpperCase()
            );
        }

        if (criteria.customerId) {
            prescriptions = prescriptions.filter(
                prescription =>
                    String(prescription.customerId) ===
                    String(criteria.customerId)
            );
        }

        return {
            reportType: "PRESCRIPTIONS",
            generatedAt: new Date().toISOString(),
            criteria,
            count: prescriptions.length,
            prescriptions
        };
    }

    generateDispensingReport(criteria = {}) {
        let records = this.getDispensingRecords();

        if (criteria.prescriptionId) {
            records = records.filter(
                record =>
                    String(record.prescriptionId) ===
                    String(criteria.prescriptionId)
            );
        }

        if (criteria.medicineId) {
            records = records.filter(
                record =>
                    String(record.medicineId) ===
                    String(criteria.medicineId)
            );
        }

        return {
            reportType: "DISPENSING",
            generatedAt: new Date().toISOString(),
            criteria,
            count: records.length,
            totalQuantityDispensed: records.reduce(
                (total, record) =>
                    total +
                    Number(
                        record.quantityDispensed || 0
                    ),
                0
            ),
            records
        };
    }

    toCSV(data) {
        if (!data || typeof data !== "object") {
            throw new Error(
                "Report data must be an object."
            );
        }

        const rows = [];

        for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) {
                continue;
            }

            if (
                value !== null &&
                typeof value === "object"
            ) {
                continue;
            }

            rows.push([
                this.escapeCSV(key),
                this.escapeCSV(value)
            ].join(","));
        }

        return rows.join("\n");
    }

    escapeCSV(value) {
        if (value === null || value === undefined) {
            return "";
        }

        const text = String(value);

        if (
            text.includes(",") ||
            text.includes('"') ||
            text.includes("\n")
        ) {
            return `"${text.replace(/"/g, '""')}"`;
        }

        return text;
    }
}