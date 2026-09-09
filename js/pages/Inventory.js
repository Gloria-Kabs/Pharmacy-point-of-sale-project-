// ========================================
// IMPORTS
// ========================================

import {
    InventoryController
} from "../controllers/InventoryController.js";

import {
    UserAccountController
} from "../controllers/UserAccountController.js";

import {
    DataInitializer
} from "../storage/DataInitializer.js";


// ========================================
// CONTROLLERS
// ========================================

const inventoryController =
    new InventoryController();

const userController =
    new UserAccountController();

const dataInitializer =
    new DataInitializer();


// ========================================
// DOM ELEMENTS
// ========================================

const inventoryTableBody =
    document.getElementById(
        "inventoryTableBody"
    );

const medicineCount =
    document.getElementById(
        "medicineCount"
    );

const totalMedicines =
    document.getElementById(
        "totalMedicines"
    );

const totalStock =
    document.getElementById(
        "totalStock"
    );

const lowStock =
    document.getElementById(
        "lowStock"
    );

const outOfStock =
    document.getElementById(
        "outOfStock"
    );

const expiredBatches =
    document.getElementById(
        "expiredBatches"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const categoryFilter =
    document.getElementById(
        "categoryFilter"
    );

const clearFiltersBtn =
    document.getElementById(
        "clearFiltersBtn"
    );

const refreshBtn =
    document.getElementById(
        "refreshBtn"
    );

const addMedicineBtn =
    document.getElementById(
        "addMedicineBtn"
    );

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );

const currentUserName =
    document.getElementById(
        "currentUserName"
    );


// ========================================
// MEDICINE MODAL
// ========================================

const medicineModal =
    document.getElementById(
        "medicineModal"
    );

const medicineForm =
    document.getElementById(
        "medicineForm"
    );

const modalTitle =
    document.getElementById(
        "modalTitle"
    );

const modalDescription =
    document.getElementById(
        "modalDescription"
    );

const medicineId =
    document.getElementById(
        "medicineId"
    );

const medicineName =
    document.getElementById(
        "medicineName"
    );

const medicineCategory =
    document.getElementById(
        "medicineCategory"
    );

const unitPrice =
    document.getElementById(
        "unitPrice"
    );

const reorderLevel =
    document.getElementById(
        "reorderLevel"
    );

const medicineDescription =
    document.getElementById(
        "medicineDescription"
    );

const batchNumber =
    document.getElementById(
        "batchNumber"
    );

const quantityOnHand =
    document.getElementById(
        "quantityOnHand"
    );

const expiryDate =
    document.getElementById(
        "expiryDate"
    );

const initialBatchSection =
    document.getElementById(
        "initialBatchSection"
    );

const saveMedicineBtn =
    document.getElementById(
        "saveMedicineBtn"
    );

const closeModalBtn =
    document.getElementById(
        "closeModalBtn"
    );

const cancelModalBtn =
    document.getElementById(
        "cancelModalBtn"
    );


// ========================================
// BATCH MODAL
// ========================================

const batchModal =
    document.getElementById(
        "batchModal"
    );

const batchModalTitle =
    document.getElementById(
        "batchModalTitle"
    );

const batchModalDescription =
    document.getElementById(
        "batchModalDescription"
    );

const batchTableBody =
    document.getElementById(
        "batchTableBody"
    );

const closeBatchModalBtn =
    document.getElementById(
        "closeBatchModalBtn"
    );


// ========================================
// TOAST
// ========================================

const toast =
    document.getElementById(
        "toast"
    );


// ========================================
// APPLICATION STATE
// ========================================

let medicines = [];

let editingMedicine = false;


// ========================================
// AUTHENTICATION
// ========================================

function checkAuthentication() {

    const user =
        userController.getCurrentUser();

    if (!user) {

        window.location.href =
            "../index.html";

        return null;
    }

    currentUserName.textContent =
        user.username ||
        user.name ||
        "User";

    return user;
}


// ========================================
// TOAST
// ========================================

function showToast(
    message,
    type = "success"
) {

    toast.textContent =
        message;

    toast.className =
        `toast toast-${type}`;

    toast.hidden = false;

    window.setTimeout(
        () => {
            toast.hidden = true;
        },
        3000
    );
}


// ========================================
// FORMATTING
// ========================================

function formatCurrency(value) {

    const amount =
        Number(value || 0);

    return amount.toFixed(2);
}


function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }

    return date.toLocaleDateString();
}


// ========================================
// STOCK STATUS
// ========================================

function getStockStatus(
    medicine
) {

    const stock =
        Number(
            medicine.stock || 0
        );

    const reorder =
        Number(
            medicine.reorderLevel || 0
        );


    if (stock <= 0) {

        return {
            label: "Out of Stock",
            className: "status-danger"
        };
    }


    if (stock <= reorder) {

        return {
            label: "Low Stock",
            className: "status-warning"
        };
    }


    return {
        label: "In Stock",
        className: "status-success"
    };
}


// ========================================
// LOAD INVENTORY
// ========================================

function loadInventory() {

    try {

        medicines =
            inventoryController.openInventory();

        populateCategoryFilter();

        renderInventory();

        updateStats();

    } catch (error) {

        console.error(
            "Failed to load inventory:",
            error
        );

        showToast(
            error.message ||
            "Failed to load inventory.",
            "error"
        );

        inventoryTableBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="empty-state"
                >
                    Failed to load inventory.
                </td>
            </tr>
        `;
    }
}


// ========================================
// UPDATE STATISTICS
// ========================================

function updateStats() {

    const stats =
        inventoryController.getStats();

    totalMedicines.textContent =
        stats.totalMedicines;

    totalStock.textContent =
        stats.totalStock;

    lowStock.textContent =
        stats.lowStock;

    outOfStock.textContent =
        stats.outOfStock;

    expiredBatches.textContent =
        stats.expiredBatches;
}


// ========================================
// CATEGORY FILTER
// ========================================

function populateCategoryFilter() {

    const currentValue =
        categoryFilter.value;

    const categories =
        [
            ...new Set(
                medicines
                    .map(
                        medicine =>
                            medicine.category
                    )
                    .filter(Boolean)
            )
        ].sort(
            (a, b) =>
                a.localeCompare(b)
        );


    categoryFilter.innerHTML = `
        <option value="">
            All Categories
        </option>
    `;


    categories.forEach(
        category => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                category;

            option.textContent =
                category;

            categoryFilter.appendChild(
                option
            );
        }
    );


    if (
        categories.includes(
            currentValue
        )
    ) {

        categoryFilter.value =
            currentValue;
    }
}


// ========================================
// FILTER INVENTORY
// ========================================

function getFilteredMedicines() {

    const searchTerm =
        searchInput.value.trim();

    const category =
        categoryFilter.value;

    let results;


    if (searchTerm) {

        results =
            inventoryController.searchMedicine(
                searchTerm
            );

    } else {

        results =
            inventoryController.openInventory();
    }


    if (category) {

        results =
            results.filter(
                medicine =>
                    medicine.category ===
                    category
            );
    }


    return results;
}


// ========================================
// RENDER INVENTORY
// ========================================

function renderInventory() {

    const filteredMedicines =
        getFilteredMedicines();


    medicineCount.textContent =
        `${filteredMedicines.length} ${
            filteredMedicines.length === 1
                ? "medicine"
                : "medicines"
        }`;


    if (
        !filteredMedicines.length
    ) {

        inventoryTableBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="empty-state"
                >
                    No medicines found.
                </td>
            </tr>
        `;

        return;
    }


    inventoryTableBody.innerHTML =
        "";


    filteredMedicines.forEach(
        medicine => {

            const row =
                document.createElement(
                    "tr"
                );


            const status =
                getStockStatus(
                    medicine
                );


            const batchCount =
                Array.isArray(
                    medicine.batches
                )
                    ? medicine.batches.length
                    : 0;


            row.innerHTML = `

                <td>
                    <span class="medicine-id">
                        ${escapeHtml(
                            medicine.medicineId
                        )}
                    </span>
                </td>


                <td>
                    <strong>
                        ${escapeHtml(
                            medicine.name
                        )}
                    </strong>
                </td>


                <td>
                    ${escapeHtml(
                        medicine.category ||
                        "—"
                    )}
                </td>


                <td>
                    ${formatCurrency(
                        medicine.unitPrice
                    )}
                </td>


                <td>
                    <strong>
                        ${Number(
                            medicine.stock || 0
                        )}
                    </strong>
                </td>


                <td>
                    ${Number(
                        medicine.reorderLevel ||
                        0
                    )}
                </td>


                <td>
                    <span
                        class="status-badge
                        ${status.className}"
                    >
                        ${status.label}
                    </span>
                </td>


                <td>
                    <button
                        type="button"
                        class="btn btn-outline btn-sm batch-btn"
                        data-id="${escapeHtml(
                            medicine.medicineId
                        )}"
                    >
                        ${batchCount}
                    </button>
                </td>


                <td>
                    <button
                        type="button"
                        class="btn btn-outline btn-sm edit-btn"
                        data-id="${escapeHtml(
                            medicine.medicineId
                        )}"
                    >
                        Edit
                    </button>
                </td>

            `;


            inventoryTableBody.appendChild(
                row
            );
        }
    );
}


// ========================================
// OPEN EDIT MEDICINE
// ========================================

function openEditMedicine(id) {

    const medicine =
        inventoryController.getById(
            id
        );


    if (!medicine) {

        showToast(
            "Medicine not found.",
            "error"
        );

        return;
    }


    editingMedicine = true;


    modalTitle.textContent =
        "Edit Medicine";

    modalDescription.textContent =
        "Update the medicine details below.";

    saveMedicineBtn.textContent =
        "Update Medicine";


    medicineId.value =
        medicine.medicineId;

    medicineName.value =
        medicine.name || "";

    medicineCategory.value =
        medicine.category || "";

    unitPrice.value =
        medicine.unitPrice ?? "";

    reorderLevel.value =
        medicine.reorderLevel ?? 0;

    medicineDescription.value =
        medicine.description || "";


    initialBatchSection.hidden =
        true;


    medicineModal.hidden =
        false;

    medicineName.focus();
}


// ========================================
// OPEN ADD MEDICINE
// ========================================

function openAddMedicine() {

    editingMedicine = false;


    modalTitle.textContent =
        "Add Medicine";

    modalDescription.textContent =
        "Enter the medicine details below.";

    saveMedicineBtn.textContent =
        "Save Medicine";


    medicineForm.reset();


    medicineId.value =
        "";

    reorderLevel.value =
        0;

    quantityOnHand.value =
        0;


    initialBatchSection.hidden =
        false;


    medicineModal.hidden =
        false;

    medicineName.focus();
}


// ========================================
// CLOSE MEDICINE MODAL
// ========================================

function closeMedicineModal() {

    medicineModal.hidden =
        true;

    medicineForm.reset();

    medicineId.value =
        "";

    editingMedicine =
        false;

    initialBatchSection.hidden =
        false;
}


// ========================================
// SAVE MEDICINE
// ========================================

function saveMedicine(event) {

    event.preventDefault();


    const data = {

        name:
            medicineName.value.trim(),

        category:
            medicineCategory.value.trim(),

        unitPrice:
            Number(
                unitPrice.value
            ),

        reorderLevel:
            Number(
                reorderLevel.value || 0
            ),

        description:
            medicineDescription.value.trim()
    };


    try {

        // ==================================
        // UPDATE
        // ==================================

        if (editingMedicine) {

            data.medicineId =
                medicineId.value;


            inventoryController.updateMedicine(
                data
            );


            showToast(
                "Medicine updated successfully."
            );
        }


        // ==================================
        // ADD
        // ==================================

        else {

            const suppliedBatchNumber =
                batchNumber.value.trim();

            const suppliedExpiryDate =
                expiryDate.value;

            const suppliedQuantity =
                quantityOnHand.value;


            /*
             * Only send batch information
             * when the user actually supplies
             * batch information.
             */

            if (
                suppliedBatchNumber ||
                suppliedExpiryDate ||
                suppliedQuantity !== ""
            ) {

                data.batchNumber =
                    suppliedBatchNumber;

                data.expiryDate =
                    suppliedExpiryDate ||
                    undefined;

                data.quantityOnHand =
                    Number(
                        suppliedQuantity || 0
                    );
            }


            inventoryController.addMedicine(
                data
            );


            showToast(
                "Medicine added successfully."
            );
        }


        closeMedicineModal();

        loadInventory();

    } catch (error) {

        console.error(
            "Failed to save medicine:",
            error
        );

        showToast(
            error.message ||
            "Failed to save medicine.",
            "error"
        );
    }
}


// ========================================
// OPEN BATCH DETAILS
// ========================================

function openBatchDetails(id) {

    const medicine =
        inventoryController.getById(
            id
        );


    if (!medicine) {

        showToast(
            "Medicine not found.",
            "error"
        );

        return;
    }


    batchModalTitle.textContent =
        `${medicine.name} — Batches`;

    batchModalDescription.textContent =
        `Medicine ID: ${medicine.medicineId}`;


    const batches =
        medicine.batches || [];


    if (!batches.length) {

        batchTableBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-state"
                >
                    No batches found for
                    this medicine.
                </td>
            </tr>
        `;

    } else {

        batchTableBody.innerHTML =
            "";


        batches.forEach(
            batch => {

                const row =
                    document.createElement(
                        "tr"
                    );


                const expired =
                    isBatchExpired(
                        batch
                    );


                const quantity =
                    Number(
                        batch.quantityOnHand ||
                        0
                    );


                let statusLabel;

                let statusClass;


                if (expired) {

                    statusLabel =
                        "Expired";

                    statusClass =
                        "status-danger";

                } else if (
                    quantity <= 0
                ) {

                    statusLabel =
                        "Out of Stock";

                    statusClass =
                        "status-warning";

                } else {

                    statusLabel =
                        "Available";

                    statusClass =
                        "status-success";
                }


                row.innerHTML = `

                    <td>
                        ${escapeHtml(
                            batch.batchNumber ||
                            "—"
                        )}
                    </td>


                    <td>
                        ${formatDate(
                            batch.expiryDate
                        )}
                    </td>


                    <td>
                        ${quantity}
                    </td>


                    <td>
                        ${formatDate(
                            batch.receivedDate
                        )}
                    </td>


                    <td>

                        <span
                            class="status-badge
                            ${statusClass}"
                        >
                            ${statusLabel}
                        </span>

                    </td>

                `;


                batchTableBody.appendChild(
                    row
                );
            }
        );
    }


    batchModal.hidden =
        false;
}


// ========================================
// CHECK BATCH EXPIRY
// ========================================

function isBatchExpired(
    batch
) {

    if (!batch.expiryDate) {
        return false;
    }


    const expiry =
        new Date(
            batch.expiryDate
        );


    if (
        Number.isNaN(
            expiry.getTime()
        )
    ) {
        return false;
    }


    return expiry <
        new Date();
}


// ========================================
// CLOSE BATCH MODAL
// ========================================

function closeBatchModal() {

    batchModal.hidden =
        true;

    batchTableBody.innerHTML =
        "";
}


// ========================================
// HTML ESCAPING
// ========================================

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ========================================
// CLEAR FILTERS
// ========================================

function clearFilters() {

    searchInput.value =
        "";

    categoryFilter.value =
        "";

    renderInventory();
}


// ========================================
// EVENT LISTENERS
// ========================================

searchInput.addEventListener(
    "input",
    renderInventory
);


categoryFilter.addEventListener(
    "change",
    renderInventory
);


clearFiltersBtn.addEventListener(
    "click",
    clearFilters
);


refreshBtn.addEventListener(
    "click",
    loadInventory
);


addMedicineBtn.addEventListener(
    "click",
    openAddMedicine
);


closeModalBtn.addEventListener(
    "click",
    closeMedicineModal
);


cancelModalBtn.addEventListener(
    "click",
    closeMedicineModal
);


medicineForm.addEventListener(
    "submit",
    saveMedicine
);


closeBatchModalBtn.addEventListener(
    "click",
    closeBatchModal
);


// ========================================
// TABLE ACTIONS
// ========================================

inventoryTableBody.addEventListener(
    "click",
    event => {

        const editButton =
            event.target.closest(
                ".edit-btn"
            );


        if (editButton) {

            openEditMedicine(
                editButton.dataset.id
            );

            return;
        }


        const batchButton =
            event.target.closest(
                ".batch-btn"
            );


        if (batchButton) {

            openBatchDetails(
                batchButton.dataset.id
            );
        }
    }
);


// ========================================
// CLOSE MODALS BY CLICKING OUTSIDE
// ========================================

medicineModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            medicineModal
        ) {

            closeMedicineModal();
        }
    }
);


batchModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            batchModal
        ) {

            closeBatchModal();
        }
    }
);


// ========================================
// ESCAPE KEY
// ========================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !== "Escape"
        ) {
            return;
        }


        if (
            !medicineModal.hidden
        ) {

            closeMedicineModal();
        }


        if (
            !batchModal.hidden
        ) {

            closeBatchModal();
        }
    }
);


// ========================================
// LOGOUT
// ========================================

logoutBtn.addEventListener(
    "click",
    () => {

        try {

            userController.logout();

        } catch (error) {

            console.error(
                "Logout failed:",
                error
            );
        }


        window.location.href =
            "../index.html";
    }
);


// ========================================
// INITIALIZE PAGE
// ========================================

async function initializePage() {

    const authenticatedUser =
        checkAuthentication();


    if (!authenticatedUser) {
        return;
    }


    try {

        /*
         * Load the legacy JSON seed data
         * into the new localStorage structure.
         *
         * This must happen BEFORE
         * loadInventory().
         */

        await dataInitializer.initialize();


        /*
         * Now the InventoryController can
         * read the migrated medicines and
         * batches from localStorage.
         */

        loadInventory();

    } catch (error) {

        console.error(
            "Failed to initialize application data:",
            error
        );

        showToast(
            error.message ||
            "Failed to initialize application data.",
            "error"
        );

        inventoryTableBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="empty-state"
                >
                    Failed to initialize
                    application data.
                </td>
            </tr>
        `;
    }
}


// ========================================
// START APPLICATION
// ========================================

initializePage();