import { SalesController } from "../controllers/SalesController.js";
import { InventoryController } from "../controllers/InventoryController.js";
import { UserAccountController } from "../controllers/UserAccountController.js";
import { DispensingController } from "../controllers/DispensingController.js";

const salesController = new SalesController();
const inventoryController = new InventoryController();
const userAccountController = new UserAccountController();
const dispensingController = new DispensingController();

const medicineSearch = document.getElementById("medicineSearch");
const medicineList = document.getElementById("medicineList");
const saleItems = document.getElementById("saleItems");
const saleSubtotal = document.getElementById("saleSubtotal");
const saleTotal = document.getElementById("saleTotal");
const saleStatus = document.getElementById("saleStatus");
const paymentMethod = document.getElementById("paymentMethod");
const amountTendered = document.getElementById("amountTendered");
const paymentChange = document.getElementById("paymentChange");
const posError = document.getElementById("posError");
const cancelSaleButton = document.getElementById("cancelSaleButton");
const completeSaleButton = document.getElementById("completeSaleButton");
const receiptSection = document.getElementById("receiptSection");
const receiptContent = document.getElementById("receiptContent");
const newSaleButton = document.getElementById("newSaleButton");
const logoutButton = document.getElementById("logoutButton");
const currentUsername = document.getElementById("currentUsername");

/* Prescription elements */
const prescriptionReference =
    document.getElementById("prescriptionReference");

const retrievePrescriptionButton =
    document.getElementById("retrievePrescriptionButton");

const prescriptionStatus =
    document.getElementById("prescriptionStatus");

const prescriptionDetails =
    document.getElementById("prescriptionDetails");

const prescriptionPatient =
    document.getElementById("prescriptionPatient");

const prescriptionPrescriber =
    document.getElementById("prescriptionPrescriber");

const prescriptionCurrentStatus =
    document.getElementById("prescriptionCurrentStatus");

const prescriptionItems =
    document.getElementById("prescriptionItems");

const checkAvailabilityButton =
    document.getElementById("checkAvailabilityButton");

const dispensePrescriptionButton =
    document.getElementById("dispensePrescriptionButton");

const availabilityResult =
    document.getElementById("availabilityResult");

const dispensingError =
    document.getElementById("dispensingError");

let medicines = [];


/* -----------------------------
   Authentication
----------------------------- */

function checkAuthentication() {
    const user = userAccountController.getCurrentUser();

    if (!user) {
        window.location.href = "../index.html";
        return false;
    }

    currentUsername.textContent = user.username;

    return true;
}


/* -----------------------------
   Helpers
----------------------------- */

function formatCurrency(amount) {
    return Number(amount || 0).toFixed(2);
}

function showError(message) {
    posError.textContent = message;
    posError.hidden = false;
}

function clearError() {
    posError.textContent = "";
    posError.hidden = true;
}

function showDispensingError(message) {
    dispensingError.textContent = message;
    dispensingError.hidden = false;
}

function clearDispensingError() {
    dispensingError.textContent = "";
    dispensingError.hidden = true;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* -----------------------------
   Inventory
----------------------------- */

function loadMedicines() {
    medicines = inventoryController.openInventory();

    renderMedicines(medicines);
}

function renderMedicines(list) {
    if (!list.length) {
        medicineList.innerHTML = `
            <div class="empty-state">
                <p>No medicines found.</p>
            </div>
        `;

        return;
    }

    medicineList.innerHTML = list.map(medicine => `
        <div class="medicine-item">

            <div class="medicine-info">

                <strong>
                    ${escapeHtml(medicine.name)}
                </strong>

                <small>
                    ${escapeHtml(medicine.medicineId)}
                    · ${escapeHtml(medicine.category || "General")}
                </small>

            </div>

            <div class="medicine-price">
                ${formatCurrency(medicine.unitPrice)}
            </div>

            <div class="medicine-stock">
                Stock: ${medicine.stock}
            </div>

            <button
                type="button"
                class="add-medicine-button"
                data-medicine-id="${escapeHtml(medicine.medicineId)}"
                ${medicine.stock <= 0 ? "disabled" : ""}
            >
                Add
            </button>

        </div>
    `).join("");
}


/* -----------------------------
   Sale
----------------------------- */

function startNewSale() {
    try {
        salesController.startSale();

        clearError();

        receiptSection.hidden = true;

        renderSale();

    } catch (error) {
        showError(error.message);
    }
}

function addMedicineToSale(medicineId) {
    try {
        if (!salesController.getCurrentSale()) {
            salesController.startSale();
        }

        salesController.enterItem(medicineId, 1);

        clearError();

        renderSale();

    } catch (error) {
        showError(error.message);
    }
}

function renderSale() {
    const sale = salesController.getCurrentSale();

    if (!sale) {
        saleStatus.textContent = "No active sale";

        saleItems.innerHTML = `
            <div class="empty-state">
                <p>No items added to the sale.</p>
                <p>Select a medicine to begin.</p>
            </div>
        `;

        saleSubtotal.textContent = "0.00";
        saleTotal.textContent = "0.00";
        paymentChange.textContent = "0.00";

        return;
    }

    saleStatus.textContent = "Sale Open";

    if (!sale.items.length && !sale.pendingChargeId) {
        saleItems.innerHTML = `
            <div class="empty-state">
                <p>No items added to the sale.</p>
                <p>Select a medicine or dispense a prescription.</p>
            </div>
        `;
    } else {
        saleItems.innerHTML = sale.items.map(item => `
            <div class="sale-item">

                <div>
                    <strong>
                        ${escapeHtml(item.description)}
                    </strong>

                    <small>
                        ${item.quantity} ×
                        ${formatCurrency(item.unitPrice)}
                    </small>
                </div>

                <strong>
                    ${formatCurrency(item.subtotal)}
                </strong>

            </div>
        `).join("");

        if (sale.pendingChargeId) {
            const pendingCharge =
                salesController.getCurrentPendingCharge();

            if (pendingCharge) {
                saleItems.innerHTML += `
                    <div class="sale-item">

                        <div>
                            <strong>
                                Prescription Charge
                            </strong>

                            <small>
                                Pending prescription charge
                            </small>
                        </div>

                        <strong>
                            ${formatCurrency(pendingCharge.amount)}
                        </strong>

                    </div>
                `;
            }
        }
    }

    sale.calculateTotal();

    saleSubtotal.textContent =
        formatCurrency(sale.total);

    saleTotal.textContent =
        formatCurrency(sale.total);

    calculateChange();
}


/* -----------------------------
   Payment
----------------------------- */

function calculateChange() {
    const sale = salesController.getCurrentSale();

    if (!sale) {
        paymentChange.textContent = "0.00";
        return;
    }

    const amount = Number(amountTendered.value);

    if (!Number.isFinite(amount)) {
        paymentChange.textContent = "0.00";
        return;
    }

    const change = amount - Number(sale.total);

    paymentChange.textContent =
        formatCurrency(Math.max(change, 0));
}

function selectPayment() {
    const sale = salesController.getCurrentSale();

    if (!sale || (!sale.items.length && !sale.pendingChargeId)) {
        throw new Error(
            "Add a medicine or dispense a prescription before taking payment."
        );
    }

    const method = paymentMethod.value;
    const amount = Number(amountTendered.value);

    return salesController.selectPayment(
        method,
        amount
    );
}


/* -----------------------------
   Complete Sale
----------------------------- */

function completeSale() {
    try {
        clearError();

        selectPayment();

        const receipt =
            salesController.confirmSale();

        displayReceipt(receipt);

        loadMedicines();

        renderSale();

        amountTendered.value = "";

        paymentChange.textContent = "0.00";

    } catch (error) {
        showError(error.message);
    }
}


/* -----------------------------
   Receipt
----------------------------- */

function displayReceipt(receipt) {
    receiptSection.hidden = false;

    receiptContent.innerHTML = `
        <div class="receipt">

            <h4>Pharmacy POS</h4>

            <p>
                <strong>Receipt:</strong>
                ${escapeHtml(receipt.receiptId || "")}
            </p>

            <p>
                <strong>Sale:</strong>
                ${escapeHtml(receipt.saleId || "")}
            </p>

            <hr>

            <p>
                <strong>Total:</strong>
                ${formatCurrency(receipt.total)}
            </p>

            <p>
                <strong>Payment:</strong>
                ${escapeHtml(
                    receipt.paymentMethod ||
                    paymentMethod.value
                )}
            </p>

            <p>
                <strong>Amount Tendered:</strong>
                ${formatCurrency(receipt.amountTendered)}
            </p>

            <p>
                <strong>Change:</strong>
                ${formatCurrency(receipt.change)}
            </p>

            <hr>

            <p>
                Sale completed successfully.
            </p>

        </div>
    `;
}


/* -----------------------------
   Cancel Sale
----------------------------- */

function cancelSale() {
    try {
        clearError();

        if (salesController.getCurrentSale()) {
            salesController.cancelSale();
        }

        amountTendered.value = "";

        paymentChange.textContent = "0.00";

        renderSale();

    } catch (error) {
        showError(error.message);
    }
}


/* -----------------------------
   Prescription Dispensing
----------------------------- */

function retrievePrescription() {
    try {
        clearDispensingError();

        const reference =
            prescriptionReference.value.trim();

        if (!reference) {
            throw new Error(
                "Prescription reference is required."
            );
        }

        dispensingController.startDispensing();

        const prescription =
            dispensingController.retrievePrescription(
                reference
            );

        const verified =
            dispensingController.verifyPrescription();

        if (!verified) {
            throw new Error(
                "Prescription is not valid for dispensing."
            );
        }

        prescriptionStatus.textContent =
            prescription.status;

        prescriptionPatient.textContent =
            prescription.customerId;

        prescriptionPrescriber.textContent =
            prescription.prescriberName || "Not recorded";

        prescriptionCurrentStatus.textContent =
            prescription.status;

        renderPrescriptionItems(
            prescription
        );

        availabilityResult.textContent =
            "Check availability before dispensing.";

        prescriptionDetails.hidden = false;

    } catch (error) {
        prescriptionDetails.hidden = true;

        prescriptionStatus.textContent =
            "Invalid";

        showDispensingError(error.message);
        dispensingError.hidden = false;
    }
}

function renderPrescriptionItems(prescription) {
    prescriptionItems.innerHTML =
        prescription.items.map(item => `
            <div class="sale-item">

                <div>
                    <strong>
                        ${escapeHtml(item.medicineId)}
                    </strong>

                    <small>
                        Prescribed:
                        ${item.quantityPrescribed}
                        · Dispensed:
                        ${item.quantityDispensed}
                    </small>
                </div>

                <strong>
                    Remaining:
                    ${item.getRemainingQuantity()}
                </strong>

            </div>
        `).join("");
}

function checkPrescriptionAvailability() {
    try {
        clearDispensingError();

        const availability =
            dispensingController.checkAvailability();

        if (!availability.length) {
            throw new Error(
                "No prescription items found."
            );
        }

        availabilityResult.innerHTML =
            availability.map(item => `
                <div class="summary-row">

                    <span>
                        ${escapeHtml(item.medicineId)}
                    </span>

                    <strong>
                        ${
                            item.available
                                ? `Available (${item.quantityAvailable})`
                                : `Insufficient (${item.quantityAvailable}/${item.quantityRequired})`
                        }
                    </strong>

                </div>
            `).join("");

        const allAvailable =
            availability.every(
                item => item.available
            );

        if (!allAvailable) {
            throw new Error(
                "One or more prescription items do not have sufficient stock."
            );
        }

    } catch (error) {
        showDispensingError(error.message);
    }
}

function dispensePrescription() {
    try {
        clearDispensingError();

        const prescription =
            dispensingController.currentPrescription;

        if (!prescription) {
            throw new Error(
                "Retrieve and verify a prescription first."
            );
        }

        const availability =
            dispensingController.checkAvailability();

        const allAvailable =
            availability.every(
                item => item.available
            );

        if (!allAvailable) {
            throw new Error(
                "Prescription cannot be dispensed because stock is insufficient."
            );
        }

        const itemsToDispense =
            prescription.items.map(item => ({
                medicineId: item.medicineId,
                quantity: item.getRemainingQuantity()
            }));

        const user =
            userAccountController.getCurrentUser();

        const result =
            dispensingController.confirmDispensing(
                itemsToDispense,
                user.userId
            );

        /*
         * Attach the prescription's pending charge
         * to the current sale.
         */
        if (!salesController.getCurrentSale()) {
            salesController.startSale(
                prescription.customerId
            );
        }

        salesController.enterPendingCharge(
            result.pendingCharge.reference
        );

        prescriptionStatus.textContent =
            result.prescription.status;

        prescriptionCurrentStatus.textContent =
            result.prescription.status;

        availabilityResult.innerHTML = `
            <div class="summary-row">
                <span>Dispensed</span>
                <strong>Successfully</strong>
            </div>

            <div class="summary-row">
                <span>Pending Charge</span>
                <strong>
                    ${formatCurrency(result.totalCharge)}
                </strong>
            </div>
        `;

        prescriptionItems.innerHTML =
            result.prescription.items.map(item => `
                <div class="sale-item">

                    <div>
                        <strong>
                            ${escapeHtml(item.medicineId)}
                        </strong>

                        <small>
                            Dispensed:
                            ${item.quantityDispensed}
                            /
                            ${item.quantityPrescribed}
                        </small>
                    </div>

                    <strong>
                        Complete
                    </strong>

                </div>
            `).join("");

        renderSale();

        loadMedicines();

    } catch (error) {
        showDispensingError(error.message);
    }
}


/* -----------------------------
   Search
----------------------------- */

function searchMedicines() {
    const searchTerm =
        medicineSearch.value.trim();

    if (!searchTerm) {
        renderMedicines(medicines);
        return;
    }

    const results =
        inventoryController.searchMedicine(
            searchTerm
        );

    renderMedicines(results);
}


/* -----------------------------
   Events
----------------------------- */

medicineSearch.addEventListener(
    "input",
    searchMedicines
);

medicineList.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".add-medicine-button"
            );

        if (!button) {
            return;
        }

        addMedicineToSale(
            button.dataset.medicineId
        );
    }
);

amountTendered.addEventListener(
    "input",
    calculateChange
);

completeSaleButton.addEventListener(
    "click",
    completeSale
);

cancelSaleButton.addEventListener(
    "click",
    cancelSale
);

newSaleButton.addEventListener(
    "click",
    startNewSale
);

retrievePrescriptionButton.addEventListener(
    "click",
    retrievePrescription
);

checkAvailabilityButton.addEventListener(
    "click",
    checkPrescriptionAvailability
);

dispensePrescriptionButton.addEventListener(
    "click",
    dispensePrescription
);

logoutButton.addEventListener(
    "click",
    () => {
        if (salesController.getCurrentSale()) {
            try {
                salesController.cancelSale();
            } catch {
                // Ignore cancellation errors during logout.
            }
        }

        userAccountController.logout();

        window.location.href = "../index.html";
    }
);


/* -----------------------------
   Initialize
----------------------------- */

function initializePage() {
    if (!checkAuthentication()) {
        return;
    }

    loadMedicines();

    startNewSale();
}

initializePage();