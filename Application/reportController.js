import { StorageService }
    from "../persistence/StorageService.js";


export class ReportController {


    // ==========================================
    // GET DATA
    // ==========================================


    getCustomers() {

        return StorageService.load(
            "customers"
        ) || [];
    }


    getMedicines() {

        return StorageService.load(
            "medicines"
        ) || [];
    }


    getPrescriptions() {

        return StorageService.load(
            "prescriptions"
        ) || [];
    }


    getDispensingRecords() {

        return StorageService.load(
            "dispensingRecords"
        ) || [];
    }


    getSales() {

        return StorageService.load(
            "sales"
        ) || [];
    }


    getPayments() {

        return StorageService.load(
            "payments"
        ) || [];
    }


    // ==========================================
    // CUSTOMER REPORT
    // ==========================================


    getCustomerCount() {

        return this.getCustomers().length;
    }


    // ==========================================
    // INVENTORY REPORT
    // ==========================================


    getMedicineCount() {

        return this.getMedicines().length;
    }


    // ==========================================
    // PRESCRIPTION REPORT
    // ==========================================


    getPrescriptionCount() {

        return this.getPrescriptions().length;
    }


    // ==========================================
    // DISPENSING REPORT
    // ==========================================


    getDispensingCount() {

        return this.getDispensingRecords().length;
    }


    // ==========================================
    // SALES REPORT
    // ==========================================


    getCompletedSales() {

        const sales =
            this.getSales();


        return sales.filter(
            sale =>
                sale.status === "COMPLETED"
        );
    }


    getPendingSales() {

        const sales =
            this.getSales();


        return sales.filter(
            sale =>
                sale.status === "PENDING"
        );
    }


    getCancelledSales() {

        const sales =
            this.getSales();


        return sales.filter(
            sale =>
                sale.status === "CANCELLED"
        );
    }


    // ==========================================
    // CALCULATE TOTAL SALES
    // ==========================================


    calculateTotalSales() {

        const sales =
            this.getCompletedSales();


        return sales.reduce(
            (total, sale) => {

                let saleTotal = 0;


                // If total is already stored
                if (
                    sale.total !== undefined
                ) {

                    saleTotal =
                        Number(sale.total);
                }


                // If sale has items
                else if (
                    Array.isArray(sale.items)
                ) {

                    saleTotal =
                        sale.items.reduce(
                            (
                                itemTotal,
                                item
                            ) => {

                                const quantity =
                                    Number(
                                        item.quantity || 0
                                    );


                                const unitPrice =
                                    Number(
                                        item.unitPrice ||
                                        item.price ||
                                        0
                                    );


                                return itemTotal +
                                    quantity *
                                    unitPrice;
                            },
                            0
                        );
                }


                return total + saleTotal;

            },
            0
        );
    }


    // ==========================================
    // TOTAL PAYMENTS
    // ==========================================


    calculateTotalPayments() {

        const payments =
            this.getPayments();


        return payments.reduce(
            (total, payment) => {

                return total +
                    Number(
                        payment.amount || 0
                    );

            },
            0
        );
    }


    // ==========================================
    // SALES BY PAYMENT METHOD
    // ==========================================


    getSalesByPaymentMethod() {

        const payments =
            this.getPayments();


        const result = {};


        payments.forEach(payment => {

            const method =
                payment.method ||
                "UNKNOWN";


            if (!result[method]) {

                result[method] = 0;
            }


            result[method] +=
                Number(
                    payment.amount || 0
                );
        });


        return result;
    }


    // ==========================================
    // GENERATE SUMMARY
    // ==========================================


    generateSummary() {

        return {

            totalCustomers:
                this.getCustomerCount(),

            totalMedicines:
                this.getMedicineCount(),

            totalPrescriptions:
                this.getPrescriptionCount(),

            totalDispensingRecords:
                this.getDispensingCount(),

            completedSales:
                this.getCompletedSales().length,

            pendingSales:
                this.getPendingSales().length,

            cancelledSales:
                this.getCancelledSales().length,

            totalSales:
                this.calculateTotalSales(),

            totalPayments:
                this.calculateTotalPayments()
        };
    }

}