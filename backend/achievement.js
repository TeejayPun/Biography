import { achievementsCollection } from "./firestore.js";
import { isAdminMode, setAdminModeChangeHandler } from "./auth.js";
import { filter, debounce, scroll } from "./filter.js";
import { openImagePopup } from './popup.js';
import { 
  createCard, 
  handleNoResults, 
  addPlaceholderCards 
} from "./utility.js";
import {
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  startAfter,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// DOM elements
const searchInput = document.querySelector(".search-box.achievement input");
const sortSelect = document.querySelector(".sort-box.achievement select");
const achievementsContainer = document.querySelector(".card-grid.achievement");
const toggleBtn = document.querySelector(".toggle-btn.achievement");
let lastVisibleDoc = null;

// State variables
let cachedAchievements = [];
const state = {
    expandedAchievements: JSON.parse(localStorage.getItem("expandedAchievements")) || false,
    allAchievementsFetched: JSON.parse(localStorage.getItem("allAchievementsFetched")) || false,
};

// Function to persist state in localStorage
function saveState(key, value) {
  state[key] = value;
  localStorage.setItem(key, JSON.stringify(value));
}

// Function to handle fetching and updating states
async function ensureAllFetched() {
  if (!state.allAchievementsFetched) {
    await fetchMoreAchievements();
    saveState("allAchievementsFetched", true);
  }
}

// Function to re-render based on current filters
function updateRender() {
  const searchTerm = searchInput.value.trim();
  const sortValue = sortSelect.value;
  const filteredAchievements = filter(cachedAchievements, searchTerm, sortValue);
  renderAchievements(filteredAchievements);
}

// Utility to check if cache is expired
function isCacheExpired() {
  const lastFetchTime = localStorage.getItem("lastFetchTime");
  if (!lastFetchTime) return true; // No fetch time stored, fetch data

  const oneDayInMilliseconds = 24 * 60 * 60 * 1000; // 1 day
  const currentTime = Date.now();
  return currentTime - parseInt(lastFetchTime, 10) > oneDayInMilliseconds;
}

// Function to update the last fetch time
function updateLastFetchTime() {
  localStorage.setItem("lastFetchTime", Date.now().toString());
}

// Fetch achievements from Firestore
async function fetchAchievements() {
  try {
      // Check if cache is expired
      if (isCacheExpired()) {
          console.log("Cache expired. Fetching fresh data from Firestore: Achievements");

          // Fetch fresh data from Firestore
          cachedAchievements = [];
          const querySnapshot = await getDocs(
              query(achievementsCollection, orderBy("priority", "desc"))
          );

          cachedAchievements = querySnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
          }));

          // Save the fetched data to localStorage
          localStorage.setItem("cachedAchievements", JSON.stringify(cachedAchievements));
          updateLastFetchTime(); // Update the fetch timestamp
      } else {
          console.log("Cache reloaded: Achievements");
          // Use cached data if available
          const cachedData = localStorage.getItem("cachedAchievements");
          if (cachedData) {
              cachedAchievements = JSON.parse(cachedData);
          }
      }

      // Render achievements
      renderAchievements(cachedAchievements);
  } catch (error) {
      console.error("Error fetching achievements:", error);
  }
}

async function fetchMoreAchievements() {
  console.log("Fetch All: Achievements")
  try {
    const querySnapshot = await getDocs(
      query(
        achievementsCollection,
        orderBy("priority", "desc"),
        startAfter(lastVisibleDoc),
        // limit(5) * Implementation for future, pagination
      )
    );

    if (!querySnapshot.empty) {
      const newAchievements = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      newAchievements.forEach((achievement) => {
        if (!cachedAchievements.some((p) => p.id === achievement.id)) {
          cachedAchievements.push(achievement);
        }
      });

      lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

      // Save updated achievements to localStorage
      localStorage.setItem("cachedAchievements", JSON.stringify(cachedAchievements));
    } else {
      saveState("allAchievementsFetched", true);
    }

    renderAchievements(cachedAchievements);
  } catch (error) {
    console.error("Error fetching more achievements:", error);
  }
}

// Render achievements
function renderAchievements(achievements) {
  const searchTerm = searchInput.value.trim();
  const sortBy = sortSelect.value;

  // Determine if search/filter is active
  const isSearchActive = !!searchTerm || sortBy !== "default";

  // Filter and sort achievements
  const filteredAchievements = filter(achievements, searchTerm, sortBy);

  // Determine how many achievements to show
  const isMobile = window.innerWidth <= 970;
  const initialVisibleCount = isAdminMode() ? (isMobile ? 4 : 3) : (isMobile ? 5 : 4);
  const visibleAchievements = state.expandedAchievements ? filteredAchievements : filteredAchievements.slice(0, initialVisibleCount);

  const noResultsMessage = document.querySelector(".no-results-message.achievement");
  const totalAchievements = filteredAchievements.length;

  // Show "No Results Found" message only if search is active and no results
  const shouldShowMessage = isSearchActive && totalAchievements === 0;

  // Handle "No Results Found" visibility
  handleNoResults(achievementsContainer, noResultsMessage, shouldShowMessage);

  // Clear container regardless of results
  achievementsContainer.innerHTML = "";

  if (totalAchievements === 0) {
    // Add placeholders and admin card even when no data is fetched
    if (isAdminMode()) {
      const addAchievementCard = createCard({
        className: "add-achievement",
        onClick: () => openModal("Add Achievement"),
      });
      achievementsContainer.appendChild(addAchievementCard);
    }

    addPlaceholderCards(achievementsContainer, 0); // Ensure minimum placeholders are added
    toggleBtn.style.display = "none";
    return;
  }

  // Render only the current achievements
  visibleAchievements.forEach((achievement) => {
    if (!achievementsContainer.querySelector(`[data-id="${achievement.id}"]`)) {
      const card = createAchievementCard(achievement);
      achievementsContainer.appendChild(card);
    }
  });

  // Add "Add Achievement" card in admin mode
  if (isAdminMode()) {
    const addAchievementCard = createCard({
      className: "add-achievement",
      onClick: () => openModal("Add Achievement"),
    });
    achievementsContainer.appendChild(addAchievementCard);
  }

  // Add placeholders if needed
  const totalCards = visibleAchievements.length + (isAdminMode() ? 1 : 0);
  addPlaceholderCards(achievementsContainer, totalCards, 4);

  toggleBtn.style.display = totalAchievements > initialVisibleCount ? "block" : "none";
  toggleBtn.innerHTML = state.expandedAchievements
    ? '<i class="fa-solid fa-chevron-up"></i>'
    : '<i class="fa-solid fa-chevron-down"></i>';
}

// Create an achievement card
function createAchievementCard(achievement) {
  const card = document.createElement("div");
  card.className = "card-item achievement";

  card.innerHTML = `
    <div class="card-icons" ${isAdminMode() ? "" : 'style="display: none;"'}>
      <i class="fas fa-edit edit-icon" title="Edit Achievement"></i>
      <i class="fas fa-trash delete-icon" title="Delete Achievement"></i>
    </div>
    <img src="${achievement.image || 'assets/placeholder.png'}">
    <h4>${achievement.title || "Untitled Certification"}</h4>
    <p class="hidden-description">${achievement.description || "No description provided."}</p>
  `;

  // Add click event to the image for the popup
  const imageElement = card.querySelector("img");
  imageElement.addEventListener("click", () => openImagePopup(achievement.image || 'assets/placeholder.png'));

  if (isAdminMode()) {
    card.querySelector(".edit-icon").addEventListener("click", () => openModal("Edit Achievement", achievement));
    card.querySelector(".delete-icon").addEventListener("click", () => {
      if (confirm(`Delete achievement: ${achievement.title || "Untitled"}?`)) {
        deleteAchievement(achievement.id);
      }
    });
  }

  return card;
}

// Open modal
function openModal(title, achievement = null) {
  const modal = document.getElementById("achievementModal");
  modal.style.display = "flex";

  document.querySelector("#achievementModal h2").textContent = title;
  document.getElementById("achievementId").value = achievement?.id || "";
  document.getElementById("achievementTitle").value = achievement?.title || "";
  document.getElementById("achievementDescription").value = achievement?.description || "";
  document.getElementById("achievementDate").value = achievement?.date || "";
  document.getElementById("achievementImage").value = achievement?.image || "";
  document.getElementById("achievementPriority").value = achievement?.priority || "";
}

// Close modal
document.querySelector(".cancel-btn.achievement").addEventListener("click", () => {
  document.getElementById("achievementModal").style.display = "none";
});

// Handle form submission
document.getElementById("achievementForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const achievementId = document.getElementById("achievementId").value;
  const achievementData = {
    title: document.getElementById("achievementTitle").value,
    description: document.getElementById("achievementDescription").value,
    image: document.getElementById("achievementImage").value,
    priority: parseInt(document.getElementById("achievementPriority").value, 10),
    date: document.getElementById("achievementDate").value,
  };

  try {
    if (achievementId) {
      await updateAchievement(achievementId, achievementData);
    } else {
      await addAchievement(achievementData);
    }

    document.getElementById("achievementModal").style.display = "none";
    fetchAchievements();
  } catch (error) {
    console.error("Error saving achievement:", error);
  }
});

// Add a new achievement to Firestore
export async function addAchievement(achievementData) {
  try {
    const docRef = await addDoc(achievementsCollection, achievementData);
    const newAchievement = { id: docRef.id, ...achievementData };
    
    cachedAchievements.push(newAchievement);
    localStorage.setItem("cachedAchievements", JSON.stringify(cachedAchievements)); // Update local storage
    renderAchievements(cachedAchievements);
  } catch (error) {
    console.error("Error adding achievement:", error);
  }
}

// Update an achievement
export async function updateAchievement(achievementId, updatedData) {
  try {
    const achievementDoc = doc(achievementsCollection, achievementId);
    await updateDoc(achievementDoc, updatedData);
    
    // Update the cached achievement
    const index = cachedAchievements.findIndex((ach) => ach.id === achievementId);
    if (index !== -1) cachedAchievements[index] = { 
      ...cachedAchievements[index], ...updatedData 
    };

    localStorage.setItem("cachedAchievements", JSON.stringify(cachedAchievements)); // Update local storage
    renderAchievements(cachedAchievements);
  } catch (error) {
    console.error("Error updating achievement:", error);
  }
}

// Delete an achievement
export async function deleteAchievement(achievementId) {
  try {
    const achievementDoc = doc(achievementsCollection, achievementId);
    await deleteDoc(achievementDoc);

    // Remove the achievement from the cache
    cachedAchievements = cachedAchievements.filter((ach) => ach.id !== achievementId);
    
    localStorage.setItem("cachedAchievements", JSON.stringify(cachedAchievements)); // Update local storage
    renderAchievements(cachedAchievements);
  } catch (error) {
    console.error("Error deleting achievement:", error);
  }
}

// Toggle hidden achievements
toggleBtn.addEventListener("click", async () => {
  saveState("expandedAchievements", !state.expandedAchievements);

  if (state.expandedAchievements) {
    await ensureAllFetched();
  }

  renderAchievements(cachedAchievements);
});

// Trigger search when the user presses Enter
searchInput.addEventListener(
  "input",
  debounce(async () => {
    if (!state.allAchievementsFetched) {
      await fetchAchievements(false, true);
    }
    updateRender();
  }, 300)
);

// Sort achievements
sortSelect.addEventListener("change", async () => {
  await ensureAllFetched();
  updateRender();
});

// Handle resize
window.addEventListener("resize", debounce(() => renderAchievements(cachedAchievements), 300));

// Listen for admin mode changes
setAdminModeChangeHandler(() => fetchAchievements());

// Fetch achievements on load
fetchAchievements();