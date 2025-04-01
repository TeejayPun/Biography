// auth.js
import { adminCollection, messagesCollection } from "./firestore.js";
import {
  query,
  where,
  addDoc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

let adminMode = false;
const adminModeChangeHandlers = []; // Array to store callbacks

// Add a new admin mode change handler
export function setAdminModeChangeHandler(callback) {
  if (typeof callback === "function") {
    adminModeChangeHandlers.push(callback);
  }
}

// Update admin mode and trigger all registered callbacks
export function setAdminMode(isAdmin) {
  adminMode = isAdmin;
  adminModeChangeHandlers.forEach((handler) => handler(adminMode));
}

// Get admin mode status
export function isAdminMode() {
  return adminMode;
}

// Verify admin credentials via Firestore
export async function verifyCredentials(name, email, secret) {
  try {
    const q = query(
      adminCollection,
      where("name", "==", name),
      where("email", "==", email),
      where("message", "==", secret)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      setAdminMode(true); // Enable admin mode if credentials are valid
      alert("Admin mode enabled!");
    } else {
      alert("Invalid admin credentials!");
    }
  } catch (error) {
    console.error("Error verifying admin credentials:", error);
    alert("An error occurred while verifying credentials. Please try again.");
  }
}

// Function to "send" message by saving it to the Firestore database
async function pseudoSendMessage(data) {
  const timestamp = new Date().toISOString();

  const newMessage = {
    ...data,
    timestamp,
  };

  // Save the message to the "messages" collection
  await addDoc(messagesCollection, newMessage);
}

document.addEventListener("DOMContentLoaded", () => {
  const sendMessageBtn = document.getElementById("sendMessageBtn");
  const contactForm = document.getElementById("contactForm");

  sendMessageBtn.addEventListener("click", async () => {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const company = document.getElementById("company").value.trim();
    const subject = document.getElementById("subject").value.trim();
    const message = document.getElementById("message").value.trim();

    // Validate required fields
    if (!name || !email || !message) {
      alert("Please fill out all required fields (Name, Email, Subject, and Message) before sending.");
      return;
    }

    if (message === "enable_admin") {
      verifyCredentials(name, email, message);
      contactForm.reset();
    } else {
      try {
        await pseudoSendMessage({ name, email, company, subject, message });
        alert("Your message has been sent successfully!");
        contactForm.reset();
      } catch (error) {
        console.error("Error sending message:", error);
        alert("There was an issue sending your message. Please try again later.");
      }
    }
  });
});