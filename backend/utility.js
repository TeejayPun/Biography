// utility.js

// Utility function to get ordinal suffix
export function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return "th"; // Covers 11th-13th
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

// Create the "Add Project" card
export function createCard({ className = "", onClick = null }) {
  const card = document.createElement("div");
  card.className = `add-item ${className}`.trim();
  card.innerHTML = `<i class="fas fa-plus-circle"></i>`;
  
  if (onClick && typeof onClick === "function") {
    card.addEventListener("click", onClick);
  }
  
  return card;
}
  
// Mapping tech names to Font Awesome icon classes
export const techIcons = {
  HTML: "fa-html5",
  PHP: "fa-php",
  JS: "fa-js",
  CSS: "fa-css3-alt",
  Python: "fa-python",
  Java: "fa-java",
  "C#": "fa-microsoft",
  "Visual Basic": "fa-microsoft",
  ".NET": "fa-microsoft",
  "WinForms": "fa-microsoft",
  "WinUI 3": "fa-microsoft",
};

export function handleNoResults(container, messageElement, shouldShowMessage) {
  if (shouldShowMessage) {
    messageElement.hidden = false;
    container.style.display = "none";
  } else {
    messageElement.hidden = true;
    container.style.display = "grid";
  }
}

export function addPlaceholderCards(container, totalCards, minCards = 3) {
  const placeholdersNeeded = Math.max(0, minCards - totalCards);
  for (let i = 0; i < placeholdersNeeded; i++) {
    const placeholderCard = document.createElement("div");
    placeholderCard.className = "invisible-card";
    container.appendChild(placeholderCard);
  }
}