import { UserAccountController } from "../controllers/UserAccountController.js";
import { DataInitializer } from "../storage/DataInitializer.js";

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

const dataInitializer = new DataInitializer();
const userAccountController = new UserAccountController();

// Make sure the demo administrator exists.
dataInitializer.initializeDefaultUser();

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value;

    loginError.hidden = true;
    loginError.textContent = "";

    try {
        userAccountController.login(username, password);

        // Login successful — go to the inventory page.
        window.location.href = "page/Inventory.html";

    } catch (error) {
        loginError.textContent =
            error.message || "Login failed.";

        loginError.hidden = false;
    }
});