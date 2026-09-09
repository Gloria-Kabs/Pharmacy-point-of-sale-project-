import {
    UserAccount,
    USER_ROLES
} from "../models/UserAccount.js";
import { StorageService } from "./StorageService.js";
import { STORAGE_KEYS } from "../utils/StorageKeys.js";
import { Sale } from "../models/Sale.js";
import { SalesLineItem } from "../models/SalesLineItem.js";
import {
    Payment,
    PAYMENT_METHODS
} from "../models/Payment.js";


export class DataInitializer {

    constructor(storageService = new StorageService()) {

        if (!storageService) {
            throw new Error(
                "DataInitializer requires a StorageService."
            );
        }

        this.storage = storageService;
    }


    /**
     * Initialize the default administrator account.
     *
     * Safe to call more than once.
     * An existing admin account is never overwritten.
     */
    initializeDefaultUser() {

        const existingUser =
            this.storage.findUserByUsername("admin");


        if (existingUser) {
            return false;
        }


        const user = new UserAccount({

            userId: "USER-ADMIN",

            username: "admin",

            password: "admin123",

            role: USER_ROLES.ADMIN,

            active: true
        });


        this.storage.saveUser(
            user.toObject()
        );


        return true;
    }


    /**
     * Create one realistic prescription for demonstration.
     *
     * Safe to call more than once.
     */
    initializeDemoPrescription() {

        const prescriptionId = "RX-1001";

        const existingPrescription =
            this.storage.findById(
                STORAGE_KEYS.PRESCRIPTIONS,
                prescriptionId,
                "prescriptionId"
            );

        if (existingPrescription) {
            return false;
        }

        const expiryDate = new Date();

        expiryDate.setDate(
            expiryDate.getDate() + 30
        );

        const prescription = {

            prescriptionId,

            customerId: "CUST-1001",

            prescriberName: "Dr. Smith",

            dateIssued:
                new Date().toISOString(),

            expiryDate:
                expiryDate.toISOString(),

            status: "ACTIVE",

            items: [

                {
                    prescriptionItemId:
                        "RX-1001-ITEM-1",

                    prescriptionId,

                    medicineId: "MED-002",

                    quantityPrescribed: 10,

                    quantityDispensed: 0
                }
            ]
        };

        this.storage.save(
            STORAGE_KEYS.PRESCRIPTIONS,
            prescription,
            "prescriptionId"
        );

        return true;
    }


    /**
     * Initialize application data from the
     * legacy JSON files.
     *
     * Safe to call more than once.
     * Existing application data is not overwritten.
     */
    async initialize() {

        /*
         * Always initialize the default administrator
         * independently of the legacy data migration.
         */
        this.initializeDefaultUser();

        /*
         * Always initialize the demo prescription
         * independently of the legacy data migration.
         */
        this.initializeDemoPrescription();


        const results = {

            medicines: 0,

            batches: 0,

            customers: 0,

            sales: 0,

            salesLineItems: 0,

            payments: 0,

            prescriptions: 1,

            skipped: false
        };


        /*
         * If medicines already exist in the new
         * storage structure, assume initialization
         * has already taken place.
         */
        if (
            this.storage.findAll(
                STORAGE_KEYS.MEDICINES
            ).length > 0
        ) {

            results.skipped = true;

            return results;
        }


        /*
         * Load the legacy JSON files.
         */
        const [
            inventoryData,
            customerData,
            salesData
        ] = await Promise.all([

            this.loadJSON(
                "../data/inventory.json"
            ),

            this.loadJSON(
                "../data/customer.json"
            ),

            this.loadJSON(
                "../data/sales.json"
            )

        ]);


        /*
         * Migrate inventory.
         */
        const inventoryResult =
            this.migrateInventory(
                inventoryData
            );


        results.medicines =
            inventoryResult.medicines;

        results.batches =
            inventoryResult.batches;


        /*
         * Migrate customers.
         */
        results.customers =
            this.migrateCustomers(
                customerData
            );


        /*
         * Migrate historical sales.
         */
        const salesResult =
            this.migrateSales(
                salesData
            );


        results.sales =
            salesResult.sales;

        results.salesLineItems =
            salesResult.salesLineItems;

        results.payments =
            salesResult.payments;


        return results;
    }


    /**
     * Load a JSON file.
     */
    async loadJSON(path) {

        const response =
            await fetch(path);


        if (!response.ok) {

            throw new Error(
                `Failed to load ${path}: ` +
                `${response.status} ${response.statusText}`
            );
        }


        return response.json();
    }


    /**
     * Migrate legacy inventory.json.
     */
    migrateInventory(inventoryData) {

        if (!Array.isArray(inventoryData)) {

            throw new Error(
                "Inventory data must be an array."
            );
        }


        let medicineCount = 0;
        let batchCount = 0;


        inventoryData.forEach(
            item => {

                if (!item) {
                    return;
                }


                const medicineId =
                    this.normalizeMedicineId(
                        item.id
                    );


                if (!medicineId) {
                    return;
                }


                const existingMedicine =
                    this.storage.findById(
                        STORAGE_KEYS.MEDICINES,
                        medicineId,
                        "medicineId"
                    );


                if (!existingMedicine) {

                    const medicine = {

                        medicineId,

                        name:
                            String(
                                item.name || ""
                            ).trim(),

                        description: "",

                        category:
                            String(
                                item.category || ""
                            ).trim(),

                        unitPrice:
                            Number(
                                item.price
                            ) || 0,

                        reorderLevel: 0
                    };


                    this.storage.save(
                        STORAGE_KEYS.MEDICINES,
                        medicine,
                        "medicineId"
                    );


                    medicineCount++;
                }


                const stock =
                    Number(item.stock) || 0;


                if (stock <= 0) {
                    return;
                }


                const batchId =
                    `BATCH-MIG-${medicineId}`;


                const existingBatch =
                    this.storage.findById(
                        STORAGE_KEYS.MEDICINE_BATCHES,
                        batchId,
                        "batchId"
                    );


                if (existingBatch) {
                    return;
                }


                const batch = {

                    batchId,

                    batchNumber:
                        `MIG-${medicineId}`,

                    medicineId,

                    expiryDate:
                        this.getFutureExpiryDate(),

                    quantityOnHand:
                        stock,

                    receivedDate:
                        new Date().toISOString()
                };


                this.storage.save(
                    STORAGE_KEYS.MEDICINE_BATCHES,
                    batch,
                    "batchId"
                );


                batchCount++;
            }
        );


        return {

            medicines:
                medicineCount,

            batches:
                batchCount
        };
    }


    /**
     * Migrate legacy customer.json.
     */
    migrateCustomers(customerData) {

        if (!Array.isArray(customerData)) {

            throw new Error(
                "Customer data must be an array."
            );
        }


        let count = 0;


        customerData.forEach(
            customer => {

                if (
                    !customer ||
                    !customer.customerId
                ) {
                    return;
                }


                const existing =
                    this.storage.findById(
                        STORAGE_KEYS.CUSTOMERS,
                        customer.customerId,
                        "customerId"
                    );


                if (existing) {
                    return;
                }


                const migratedCustomer = {

                    customerId:
                        customer.customerId,

                    name:
                        String(
                            customer.name || ""
                        ).trim(),

                    phone:
                        String(
                            customer.phone || ""
                        ).trim(),

                    address:
                        String(
                            customer.address || ""
                        ).trim()
                };


                if (
                    customer.email !== undefined
                ) {

                    migratedCustomer.email =
                        customer.email;
                }


                if (
                    Array.isArray(
                        customer.allergies
                    )
                ) {

                    migratedCustomer.allergies =
                        customer.allergies;
                }


                if (
                    customer.notes !== undefined
                ) {

                    migratedCustomer.notes =
                        customer.notes;
                }


                if (
                    customer.totalSpent !== undefined
                ) {

                    migratedCustomer.totalSpent =
                        Number(
                            customer.totalSpent
                        ) || 0;
                }


                if (
                    customer.loyaltyPoints !== undefined
                ) {

                    migratedCustomer.loyaltyPoints =
                        Number(
                            customer.loyaltyPoints
                        ) || 0;
                }


                this.storage.save(
                    STORAGE_KEYS.CUSTOMERS,
                    migratedCustomer,
                    "customerId"
                );


                count++;
            }
        );


        return count;
    }


    /**
     * Migrate legacy sales.json.
     */
    migrateSales(salesData) {

        if (!Array.isArray(salesData)) {

            throw new Error(
                "Sales data must be an array."
            );
        }


        let sales = 0;
        let salesLineItems = 0;
        let payments = 0;


        salesData.forEach(
            transaction => {

                if (!transaction) {
                    return;
                }


                const saleId =
                    transaction.transactionId;


                if (!saleId) {
                    return;
                }


                const existingSale =
                    this.storage.findById(
                        STORAGE_KEYS.SALES,
                        saleId,
                        "saleId"
                    );


                if (existingSale) {
                    return;
                }


                const legacyItems =
                    Array.isArray(
                        transaction.items
                    )
                        ? transaction.items
                        : [];


                const sale =
                    new Sale({

                        saleId,

                        customerId:
                            transaction.customerId ||
                            null,

                        dateTime:
                            transaction.timestamp ||
                            new Date().toISOString(),

                        status: "OPEN"
                    });


                legacyItems.forEach(
                    (legacyItem, index) => {

                        const medicineId =
                            this.normalizeMedicineId(
                                legacyItem.id
                            );


                        const lineItem =
                            new SalesLineItem({

                                salesLineItemId:
                                    `${saleId}-ITEM-${index + 1}`,

                                medicineId,

                                description:
                                    String(
                                        legacyItem.name ||
                                        ""
                                    ).trim(),

                                quantity:
                                    Number(
                                        legacyItem.quantity
                                    ) || 0,

                                unitPrice:
                                    Number(
                                        legacyItem.price
                                    ) || 0
                            });


                        const validation =
                            lineItem.validate();


                        if (!validation.valid) {

                            throw new Error(
                                `Invalid migrated sales item in ${saleId}: ` +
                                `${validation.errors.join(" ")}`
                            );
                        }


                        sale.addLineItem(
                            lineItem
                        );


                        salesLineItems++;
                    }
                );


                sale.calculateTotal();


                const payment =
                    new Payment({

                        paymentId:
                            `PAY-MIG-${saleId}`,

                        saleId,

                        method:
                            PAYMENT_METHODS.CASH,

                        amountTendered:
                            sale.total,

                        change: 0
                    });


                const paymentValidation =
                    payment.validate(
                        sale.total
                    );


                if (
                    !paymentValidation.valid
                ) {

                    throw new Error(
                        `Invalid migrated payment in ${saleId}: ` +
                        `${paymentValidation.errors.join(" ")}`
                    );
                }


                sale.recordPayment(
                    payment
                );


                sale.complete();


                this.storage.save(
                    STORAGE_KEYS.SALES,
                    sale.toObject(),
                    "saleId"
                );


                sales++;


                sale.items.forEach(
                    item => {

                        this.storage.save(

                            STORAGE_KEYS.SALES_LINE_ITEMS,

                            item.toObject(),

                            "salesLineItemId"
                        );
                    }
                );


                this.storage.save(

                    STORAGE_KEYS.PAYMENTS,

                    payment.toObject(),

                    "paymentId"
                );


                payments++;


                legacyItems.forEach(
                    item => {

                        const medicineId =
                            this.normalizeMedicineId(
                                item.id
                            );


                        if (!medicineId) {
                            return;
                        }


                        const medicine =
                            this.storage.findById(

                                STORAGE_KEYS.MEDICINES,

                                medicineId,

                                "medicineId"
                            );


                        if (!medicine) {

                            console.warn(

                                `Migrated sale ${saleId} ` +
                                `references medicine ${medicineId}, ` +
                                `but that medicine does not exist ` +
                                `in inventory.`
                            );
                        }
                    }
                );
            }
        );


        return {

            sales,

            salesLineItems,

            payments
        };
    }


    /**
     * Normalize legacy medicine IDs.
     */
    normalizeMedicineId(id) {

        if (
            id === undefined ||
            id === null
        ) {

            return null;
        }


        const value =
            String(id)
                .trim()
                .toUpperCase();


        if (!value) {
            return null;
        }


        const match =
            value.match(
                /^MED-?(\d+)$/
            );


        if (match) {

            return (
                `MED-${match[1].padStart(3, "0")}`
            );
        }


        return value;
    }


    /**
     * Legacy inventory has no expiry dates.
     */
    getFutureExpiryDate() {

        const date =
            new Date();


        date.setFullYear(
            date.getFullYear() + 2
        );


        return date.toISOString();
    }
}