import { projectsCollection } from "./firestore.js";
import { isAdminMode, setAdminModeChangeHandler } from "./auth.js";
import { filter, debounce, scroll } from "./filter.js";
import { openImagePopup } from './popup.js';
import { 
  getOrdinalSuffix, 
  createCard, 
  techIcons,
  handleNoResults, 
  addPlaceholderCards,
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
const searchInput = document.querySelector(".search-box.project input");
const sortSelect = document.querySelector(".sort-box.project select");
const projectsContainer = document.querySelector(".card-grid.project");
const toggleBtn = document.querySelector(".toggle-btn.project");
let lastVisibleDoc = null; // Track the last fetched document

// State variables
let cachedProjects = []; // Projects fetched from Firestore
const state = {
  expandedProjects: JSON.parse(localStorage.getItem("expandedProjects")) || false,
  allProjectsFetched: JSON.parse(localStorage.getItem("allProjectsFetched")) || false,
};

// Function to persist state in localStorage
function saveState(key, value) {
  state[key] = value;
  localStorage.setItem(key, JSON.stringify(value));
}

// Function to handle fetching and updating states
async function ensureAllFetched() {
  if (!state.allProjectsFetched) {
    await fetchMoreProjects();
    saveState("allProjectsFetched", true);
  }
}

// Function to re-render based on current filters
function updateRender() {
  const searchTerm = searchInput.value.trim();
  const sortValue = sortSelect.value;
  const filteredProjects = filter(cachedProjects, searchTerm, sortValue);
  renderProjects(filteredProjects);
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

// Fetch projects from Firestore or Local Storage
async function fetchProjects() {
  try {
      // Check if cache is expired
      if (isCacheExpired()) {
          console.log("Cache expired. Fetching fresh data from Firestore: Projects");

          // Fetch fresh data from Firestore
          cachedProjects = [];
          const querySnapshot = await getDocs(
              query(projectsCollection, orderBy("priority", "desc"))
          );

          cachedProjects = querySnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
          }));

          // Save the fetched data to localStorage
          localStorage.setItem("cachedProjects", JSON.stringify(cachedProjects));
          updateLastFetchTime(); // Update the fetch timestamp
      } else {
        console.log("Cache reloaded: Projects")
          // Use cached data if available
          const cachedData = localStorage.getItem("cachedProjects");
          if (cachedData) {
              cachedProjects = JSON.parse(cachedData);
          }
      }

      // Render projects
      renderProjects(cachedProjects);
  } catch (error) {
      console.error("Error fetching projects:", error);
  }
}

async function fetchMoreProjects() {
  console.log("Fetch All: Projects")
  try {
    const querySnapshot = await getDocs(
      query(
        projectsCollection,
        orderBy("priority", "desc"),
        startAfter(lastVisibleDoc),
        // limit(5) * Implementation for future, pagination
      )
    );

    if (!querySnapshot.empty) {
      const newProjects = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      newProjects.forEach((project) => {
        if (!cachedProjects.some((p) => p.id === project.id)) {
          cachedProjects.push(project);
        }
      });

      lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

      // Save updated projects to localStorage
      localStorage.setItem("cachedProjects", JSON.stringify(cachedProjects));
    } else {
      saveState("allProjectsFetched", true);
    }

    renderProjects(cachedProjects);
  } catch (error) {
    console.error("Error fetching more projects:", error);
  }
}

// Render projects
function renderProjects(projects) {
  const searchTerm = searchInput.value.trim();
  const sortBy = sortSelect.value;

  // Determine if search/filter is active
  const isSearchActive = !!searchTerm || sortBy !== "default";

  // Filter and sort projects
  const filteredProjects = filter(projects, searchTerm, sortBy);

  // Determine how many projects to show
  const isMobile = window.innerWidth <= 970;
  const initialVisibleCount = isAdminMode() ? (isMobile ? 3 : 2) : (isMobile ? 4 : 3);
  const visibleProjects = state.expandedProjects ? filteredProjects : filteredProjects.slice(0, initialVisibleCount);

  const noResultsMessage = document.querySelector(".no-results-message.project");
  const totalProjects = filteredProjects.length;

  // Show "No Results Found" message only if search is active and no results
  const shouldShowMessage = isSearchActive && totalProjects === 0;

  // Handle "No Results Found" visibility
  handleNoResults(projectsContainer, noResultsMessage, shouldShowMessage);

  // Clear container regardless of results
  projectsContainer.innerHTML = "";

  if (totalProjects === 0) {
    // Add placeholders and admin card even when no data is fetched
    if (isAdminMode()) {
      const addProjectCard = createCard({
        className: "add-project",
        onClick: () => openModal("Add Project"),
      });
      projectsContainer.appendChild(addProjectCard);
    }

    addPlaceholderCards(projectsContainer, 0); // Ensure minimum placeholders are added
    toggleBtn.style.display = "none";
    return;
  }

  // Render only the current projects
  visibleProjects.forEach((project) => {
    if (!projectsContainer.querySelector(`[data-id="${project.id}"]`)) {
      const card = createProjectCard(project);
      projectsContainer.appendChild(card);
    }
  });

  // Add "Add Project" card in admin mode
  if (isAdminMode()) {
    const addProjectCard = createCard({
      className: "add-project",
      onClick: () => openModal("Add Project"),
    });
    projectsContainer.appendChild(addProjectCard);
  }

  // Add placeholders if needed
  const totalCards = visibleProjects.length + (isAdminMode() ? 1 : 0);
  addPlaceholderCards(projectsContainer, totalCards);

  // Update the toggle button state
  toggleBtn.style.display = totalProjects > initialVisibleCount ? "block" : "none";
  toggleBtn.innerHTML = state.expandedProjects
    ? '<i class="fa-solid fa-chevron-up"></i>'
    : '<i class="fa-solid fa-chevron-down"></i>';
}

// Create a project card
function createProjectCard(project) {
  const card = document.createElement("div");
  card.className = "card-item project";
  
  const projectDate = project.date ? new Date(project.date) : null;
  const formattedDate = projectDate
  ? `${projectDate.getDate()}${getOrdinalSuffix(
    projectDate.getDate()
  )} of ${projectDate.toLocaleString("default", { month: "long" })}, ${projectDate.getFullYear()}`
  : `${new Date().getDate()}${getOrdinalSuffix(
    new Date().getDate()
  )} of ${new Date().toLocaleString("default", { month: "long" })}, ${new Date().getFullYear()}`;

  card.innerHTML = `
    <div class="card-icons" ${isAdminMode() ? "" : 'style="display: none;"'}>
        <i class="fas fa-edit edit-icon" title="Edit Project"></i>
        <i class="fas fa-trash delete-icon" title="Delete Project"></i>
    </div>
    <img src="${project.image || 'assets/placeholder.png'}">
    <h3>${project.title || "Untitled Project"}</h3>
    <p class="project-description">${project.description || "No description provided."}</p>
    <p class="project-date">${formattedDate}</p>
    <div class="tech-stack">
      ${project.tech && project.tech.length > 1
        ? project.tech
            .map(
              (tech) =>
                `<div class="tech-item" data-tech="${tech}"><i class="fab ${
                  techIcons[tech] || "fa-solid fa-code"
                }"></i>${tech}</div>`
            )
            .join("")
        : '<div class="tech-item" data-tech="None"><i class="fa-solid fa-code"></i>None</div>'}
    </div>
    <a href="${project.link}" class="card-link project" target="_blank">View Project</a>
  `;

  // Add click event to the image for the popup
  const imageElement = card.querySelector("img");
  imageElement.addEventListener("click", () => openImagePopup(project.image || 'assets/placeholder.png'));

  // Add click event to each tech stack item
  const techItems = card.querySelectorAll(".tech-item");
  techItems.forEach((techItem) => {
    techItem.addEventListener("click", (e) => {
      const tech = e.currentTarget.dataset.tech;

      // Update search input and re-render projects
      if (searchInput.value === tech) {
        searchInput.value = ""; // Clear the search bar if clicked again
      } else {
        searchInput.value = tech; // Set the search bar to the clicked tech
      }

      renderProjects(cachedProjects); // Trigger project rendering
      scroll("projects"); // Scroll to projects section
    });
  });

  // Admin actions
  if (isAdminMode()) {
    card.querySelector(".edit-icon").addEventListener("click", () => openModal("Edit Project", project));
    card.querySelector(".delete-icon").addEventListener("click", () => {
      if (confirm(`Delete project: ${project.title || "Untitled"}?`)) {
        deleteProject(project.id);
      }
    });
  }

  return card;
}

// Open project modal
function openModal(title, project = null) {
  const modal = document.getElementById("projectModal");
  modal.style.display = "flex";

  document.querySelector("#projectModal h2").textContent = title;
  document.getElementById("projectId").value = project?.id || "";
  document.getElementById("projectTitle").value = project?.title || "";
  document.getElementById("projectDescription").value = project?.description || "";
  document.getElementById("projectDate").value = project?.date || "";
  document.getElementById("projectImage").value = project?.image || "";
  document.getElementById("projectLink").value = project?.link || "";
  document.getElementById("projectTech").value = project?.tech?.join(", ") || "";
  document.getElementById("projectPriority").value = project?.priority || "";
}

// Close modal
document.querySelector(".cancel-btn.project").addEventListener("click", () => {
  document.getElementById("projectModal").style.display = "none";
});

// Add a new project to Firestore
export async function addProject(projectData) {
  try {
    const docRef = await addDoc(projectsCollection, projectData);
    const newProject = { id: docRef.id, ...projectData };

    cachedProjects.push(newProject); // Add to the cache
    localStorage.setItem("cachedProjects", JSON.stringify(cachedProjects)); // Update local storage
    renderProjects(cachedProjects);
  } catch (error) {
    console.error("Error adding project:", error);
    throw error;
  }
}

// Update an existing project in Firestore
export async function updateProject(projectId, updatedData) {
  try {
    const projectDoc = doc(projectsCollection, projectId);
    await updateDoc(projectDoc, updatedData);

    // Update the cached project
    const projectIndex = cachedProjects.findIndex((project) => project.id === projectId);
    if (projectIndex !== -1) {
      cachedProjects[projectIndex] = { ...cachedProjects[projectIndex], ...updatedData };
    }

    localStorage.setItem("cachedProjects", JSON.stringify(cachedProjects)); // Update local storage
    renderProjects(cachedProjects);
  } catch (error) {
    console.error("Error updating project:", error);
    throw error;
  }
}

// Delete a project from Firestore
export async function deleteProject(projectId) {
  try {
    const projectDoc = doc(projectsCollection, projectId);
    await deleteDoc(projectDoc);

    // Remove the project from the cache
    cachedProjects = cachedProjects.filter((project) => project.id !== projectId);

    localStorage.setItem("cachedProjects", JSON.stringify(cachedProjects)); // Update local storage
    renderProjects(cachedProjects);
  } catch (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
}

// Handle form submission
document.getElementById("projectForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const projectId = document.getElementById("projectId").value;
  const projectData = {
    title: document.getElementById("projectTitle").value,
    description: document.getElementById("projectDescription").value,
    date: document.getElementById("projectDate").value,
    image: document.getElementById("projectImage").value,
    link: document.getElementById("projectLink").value,
    tech: document.getElementById("projectTech").value.split(",").map((t) => t.trim()),
    priority: parseInt(document.getElementById("projectPriority").value, 10),
  };

  try {
    if (projectId) {
      await updateProject(projectId, projectData);
    } else {
      await addProject(projectData);
    }

    document.getElementById("projectModal").style.display = "none";
    fetchProjects();
  } catch (error) {
    console.error("Error saving project:", error);
  }
});

// Toggle hidden projects
toggleBtn.addEventListener("click", async () => {
  saveState("expandedProjects", !state.expandedProjects);

  if (state.expandedProjects) {
    await ensureAllFetched();
  }

  renderProjects(cachedProjects);
});

// Trigger search when the user presses Enter
searchInput.addEventListener(
  "input",
  debounce(async () => {
    if (!state.allProjectsFetched) {
      await fetchProjects(false, true);
    }
    updateRender();
  }, 300)
);

// Sort projects
sortSelect.addEventListener("change", async () => {
  await ensureAllFetched();
  updateRender();
});

// Handle resize
window.addEventListener("resize", debounce(() => renderProjects(cachedProjects), 300));

// Listen for admin mode changes
setAdminModeChangeHandler(() => fetchProjects());

// Fetch and render projects on load
fetchProjects();
