// filter.js
// Debounce function to delay execution
export function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

// Filter items (projects or achievements) based on search term and sort criteria
export function filter(items, searchTerm, sortBy) {
  let result = [...items];

  // Filter by search term (in title or tech stack, if available)
  if (searchTerm) {
    result = result.filter((item) => {
      const techStack = Array.isArray(item.tech) ? item.tech.join(" ") : ""; // Handle undefined or non-array tech
      const searchIn = `${item.title} ${item.description} ${techStack}`.toLowerCase();
      return searchIn.includes(searchTerm.toLowerCase());
    });
  }

  // Sort by criteria
  result.sort((a, b) => {
    switch (sortBy) {
      case "nameAsc":
        return a.title.localeCompare(b.title);
      case "nameDesc":
        return b.title.localeCompare(a.title);
      case "dateAsc":
        return new Date(b.date) - new Date(a.date);
      case "dateDesc":
        return new Date(a.date) - new Date(b.date);
      default:
        return 0;
    }
  });

  return result;
}

export function scroll(targetId) {
  const targetElement = document.getElementById(targetId);
  if (targetElement) {
    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}