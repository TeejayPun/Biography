// Import Firebase modules from the CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAl5-ddxEjK7ws-IUtpl1n-PGjWeJgmK8o",
    authDomain: "portfolio-test-2a18f.firebaseapp.com",
    projectId: "portfolio-test-2a18f",
    storageBucket: "portfolio-test-2a18f.firebasestorage.app",
    messagingSenderId: "89687914332",
    appId: "1:89687914332:web:4a5f97b25aecefd99a7399"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);
console.log("Firebase initialized!");

// Initialize Firestore
const db = getFirestore(app);
console.log("Firestore initialized!");

// Export the app and Firestore instance
export { app, db };
