import { experienceCollection, educationCollection } from "./firestore.js";
import { isAdminMode, setAdminModeChangeHandler } from "./auth.js";
import { openImagePopup } from './popup.js';
import {
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Containers
const experienceContainer = document.querySelector(".stack-container.experience");
const educationContainer = document.querySelector(".stack-container.education");

// Modals and Forms
const experienceModal = document.getElementById("experienceModal");
const educationModal = document.getElementById("educationModal");
const experienceForm = document.getElementById("experienceForm");
const educationForm = document.getElementById("educationForm");

// State Variables
let cachedExperiences = [];
let cachedEducation = [];

// Utility to check if cache is expired
function isCacheExpired(lastFetchKey) {
    const lastFetchTime = localStorage.getItem(lastFetchKey);
    if (!lastFetchTime) return true;

    const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
    const currentTime = Date.now();
    return currentTime - parseInt(lastFetchTime, 10) > oneDayInMilliseconds;
}

// Update last fetch time
function updateLastFetchTime(key) {
    localStorage.setItem(key, Date.now().toString());
}

// Parse year and handle "Present"
function parseYear(year) {
    if (!year) return { start: -Infinity, end: -Infinity };

    const lowercasedYear = year.trim().toLowerCase();
    const match = lowercasedYear.match(/\d{4}/g); // Extract all years in the string

    if (lowercasedYear.includes("present")) {
        const startYear = match ? Math.min(...match.map(Number)) : -Infinity;
        return { start: startYear, end: Infinity }; // "Present" implies the end is infinity
    }

    if (match) {
        const [startYear, endYear] = match.map(Number);
        return { start: startYear, end: endYear || startYear }; // Handle single or range years
    }

    return { start: -Infinity, end: -Infinity };
}

// Sort by date
function sortByDate(items) {
    return items.sort((a, b) => {
        const yearA = parseYear(a.year);
        const yearB = parseYear(b.year);

        // Compare by end year first
        if (yearA.end !== yearB.end) {
            return yearB.end - yearA.end; // Descending order
        }

        // If end years are the same, compare by start year
        return yearB.start - yearA.start; // Descending order
    });
}

// Fetch data
async function fetchData(type, collection, cacheKey, lastFetchKey, container) {
    try {
        if (isCacheExpired(lastFetchKey)) {
            console.log(`Cache Expired. Fetching fresh data from Firestore: ${type}`);
            const querySnapshot = await getDocs(query(collection, orderBy("year", "desc")));
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            localStorage.setItem(cacheKey, JSON.stringify(data));
            updateLastFetchTime(lastFetchKey);
            renderItems(data, container, type);
        } else {
            console.log(`Cache reloaded: $To.Upper{type}`);
            const cachedData = JSON.parse(localStorage.getItem(cacheKey)) || [];
            renderItems(cachedData, container, type);
        }
    } catch (error) {
        console.error(`Error fetching ${type}:`, error);
    }
}

// Render items
function renderItems(items, container, type) {
    container.innerHTML = "";
    items.forEach(item => {
        const card = createCard(item, type);
        container.appendChild(card);
    });
    if (isAdminMode()) {
        const addButton = document.createElement("div");
        addButton.className = `add-item add-${type}`;
        addButton.innerHTML = '<i class="fas fa-plus-circle"></i>';
        addButton.addEventListener("click", () => openModal(`Add ${type.charAt(0).toUpperCase() + type.slice(1)}`, null, type));
        container.appendChild(addButton);
    }
}

// Create card
function createCard(item, type) {
    const card = document.createElement("div");
    card.className = "stack-item";
    card.innerHTML = `
        <div class="stack-wrapper">
            <div class="stack-image">
                <img src="${item.image || 'assets/placeholder.png'}" alt="${type.charAt(0).toUpperCase() + type.slice(1)} Image">
            </div>
            <div class="stack-text">
                <h2>${item.title || "Untitled"}</h2>
                <h3>${(type === "experience" ? item.company : item.institution) || "Not specified"}</h3>
                <h4>${item.year || "Year not specified"}</h4>
                <p class="hidden-description">${item.description || "No description provided."}</p>
            </div>
        </div>
    `;

    // Add click event to the image for the popup
    const imageElement = card.querySelector("img");
    imageElement.addEventListener("click", () => openImagePopup(item.image || 'assets/placeholder.png'));

    if (isAdminMode()) {
        const editButton = document.createElement("i");
        editButton.className = "fas fa-edit";
        editButton.title = `Edit ${type}`;
        editButton.addEventListener("click", () => openModal(`Edit ${type}`, item, type));

        const deleteButton = document.createElement("i");
        deleteButton.className = "fas fa-trash";
        deleteButton.title = `Delete ${type}`;
        deleteButton.addEventListener("click", () => {
            const confirmation = confirm("Are you sure you want to delete this item?");
            if (confirmation) {
                deleteItem(item.id, type);
            }
        });

        const adminControls = document.createElement("div");
        adminControls.className = "card-icons";
        adminControls.appendChild(editButton);
        adminControls.appendChild(deleteButton);
        card.querySelector(".stack-wrapper").appendChild(adminControls);
    }
    return card;
}

// Add item to Firestore
async function addItem(type, itemData, collection, cacheKey, container) {
    try {
        const docRef = await addDoc(collection, itemData);
        const newItem = { id: docRef.id, ...itemData };

        // Update cache and sort
        const cache = JSON.parse(localStorage.getItem(cacheKey)) || [];
        cache.push(newItem);
        const sortedCache = sortByDate(cache);

        // Update local storage
        localStorage.setItem(cacheKey, JSON.stringify(sortedCache));

        // Re-render items
        renderItems(sortedCache, container, type);
    } catch (error) {
        console.error(`Error adding ${type}:`, error);
    }
}

// Update item in Firestore
async function updateItem(type, itemId, updatedData, collection, cacheKey, container) {
    try {
        const itemDoc = doc(collection, itemId);
        await updateDoc(itemDoc, updatedData);

        const cache = JSON.parse(localStorage.getItem(cacheKey)) || [];
        const index = cache.findIndex((item) => item.id === itemId);
        if (index !== -1) {
            cache[index] = { ...cache[index], ...updatedData };
        }

        const sortedCache = sortByDate(cache);
        localStorage.setItem(cacheKey, JSON.stringify(sortedCache));

        // Re-render items
        renderItems(sortedCache, container, type);
    } catch (error) {
        console.error(`Error updating ${type}:`, error);
    }
}

// Delete item from Firestore
async function deleteItem(itemId, type) {
    try {
        const collection = type === "experience" ? experienceCollection : educationCollection;
        const cacheKey = type === "experience" ? "cachedExperiences" : "cachedEducation";
        const container = type === "experience" ? experienceContainer : educationContainer;

        const itemDoc = doc(collection, itemId);
        await deleteDoc(itemDoc);

        const cache = JSON.parse(localStorage.getItem(cacheKey)) || [];
        const updatedCache = cache.filter((item) => item.id !== itemId);
        localStorage.setItem(cacheKey, JSON.stringify(updatedCache));

        renderItems(updatedCache, container, type);
    } catch (error) {
        console.error(`Error deleting ${type}:`, error);
    }
}

// Open modal
function openModal(title, item = null, type) {
    const modal = type === "experience" ? experienceModal : educationModal;
    modal.style.display = "flex";
    document.querySelector(`#${type}Modal h2`).textContent = title;
    document.getElementById(`${type}Id`).value = item?.id || "";
    document.getElementById(`${type}Title`).value = item?.title || "";
    document.getElementById(`${type}SubTitle`).value = type === "experience" ? item?.company || "" : item?.institution || "";
    document.getElementById(`${type}Year`).value = item?.year || "";
    document.getElementById(`${type}Description`).value = item?.description || "";
    document.getElementById(`${type}Image`).value = item?.image || "";
}

// Close modal
document.querySelector(".cancel-btn.experience").addEventListener("click", () => {
    document.getElementById("experienceModal").style.display = "none";
});

// Close modal
document.querySelector(".cancel-btn.education").addEventListener("click", () => {
    document.getElementById("educationModal").style.display = "none";
});

// Handle form submissions dynamically
function handleFormSubmit(form, type, collection, cacheKey, container) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const itemId = document.getElementById(`${type}Id`).value;
        const itemData = {
            title: document.getElementById(`${type}Title`).value,
            [type === "experience" ? "company" : "institution"]: document.getElementById(`${type}SubTitle`).value,
            year: document.getElementById(`${type}Year`).value,
            description: document.getElementById(`${type}Description`).value,
            image: document.getElementById(`${type}Image`).value,
        };

        try {
            if (itemId) {
                await updateItem(type, itemId, itemData, collection, cacheKey, container);
            } else {
                await addItem(type, itemData, collection, cacheKey, container);
            }

            const modal = type === "experience" ? experienceModal : educationModal;
            modal.style.display = "none";
            fetchData(type, collection, cacheKey, `lastFetchTime${type}`, container);
        } catch (error) {
            console.error(`Error saving ${type}:`, error);
        }
    });
}

// Fetch data on load
fetchData("experience", experienceCollection, "cachedExperiences", "lastFetchTimeExperiences", experienceContainer);
fetchData("education", educationCollection, "cachedEducation", "lastFetchTimeEducation", educationContainer);

// Set up form submission handlers
handleFormSubmit(experienceForm, "experience", experienceCollection, "cachedExperiences", experienceContainer);
handleFormSubmit(educationForm, "education", educationCollection, "cachedEducation", educationContainer);
setAdminModeChangeHandler(() => {
    fetchData("experience", experienceCollection, "cachedExperiences", "lastFetchTimeExperiences", experienceContainer);
    fetchData("education", educationCollection, "cachedEducation", "lastFetchTimeEducation", educationContainer);
});