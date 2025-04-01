document.addEventListener("scroll", function() {
    const sections = document.querySelectorAll("section");
    const navLinks = document.querySelectorAll(".nav-links li");

    let current = "";

    sections.forEach((section) => {
        const sectionTop = section.offsetTop - 70; // Adjust for navbar height
        if (window.pageYOffset >= sectionTop) {
            current = section.getAttribute("id");
        }
    });

    navLinks.forEach((li) => {
        li.classList.remove("active");
        if (li.querySelector("a").getAttribute("href").includes(current)) {
            li.classList.add("active");
        }
    });
});

document.getElementById('subject').addEventListener('change', function() {
    this.style.color = this.value ? '#e0e1dd' : '#aab8c2';
});

document.addEventListener("DOMContentLoaded", () => {
    const hamburgerMenu = document.querySelector(".hamburger-menu");
    const navContainer = document.querySelector(".nav-container");
    const navLinks = document.querySelectorAll(".nav-links a");

    // Function to toggle the menu
    const toggleMenu = () => {
        if (window.innerWidth <= 1080) { // Only for mobile mode
            if (navContainer.classList.contains("active")) {
                navContainer.classList.remove("active");
                setTimeout(() => (navContainer.style.display = "none"), 300); // Wait for fade out
            } else {
                navContainer.style.display = "flex";
                setTimeout(() => navContainer.classList.add("active"), 0); // Start fade in
            }
        }
    };

    // Event listener for hamburger menu click
    hamburgerMenu.addEventListener("click", toggleMenu);

    // Close the menu when a link is clicked (in mobile mode only)
    navLinks.forEach((link) => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 1080) { // Only for mobile mode
                navContainer.classList.remove("active");
                setTimeout(() => (navContainer.style.display = "none"), 300); // Wait for fade out
            }
        });
    });

    // Handle resize events to ensure proper behavior
    window.addEventListener("resize", () => {
        if (window.innerWidth > 1080) {
            // Ensure nav is always visible in desktop mode
            navContainer.style.display = "";
            navContainer.classList.remove("active");
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const descriptions = document.querySelectorAll(".project-description");
    const maxHeight = 72; // Max height in pixels (4.5em with 16px base font-size)
  
    descriptions.forEach((description) => {
      // Temporarily remove max-height to measure full content height
      const originalMaxHeight = getComputedStyle(description).maxHeight;
      description.style.maxHeight = "none";
      const needsGradient = description.scrollHeight > maxHeight;
      description.style.maxHeight = originalMaxHeight; // Reapply original max-height
  
      // Add or remove gradient based on content height
      if (needsGradient) {
        description.classList.add("has-gradient");
      } else {
        description.classList.remove("has-gradient");
      }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const grids = document.querySelectorAll(".showcase-grid");

    grids.forEach((grid) => {
        const items = grid.querySelectorAll(".item");
        const batchSize = 4;
        let currentBatch = 0;

        const cycleItems = () => {
            // Hide all items
            items.forEach((item) => item.classList.remove("active"));

            // Show current batch
            for (let i = currentBatch * batchSize; i < (currentBatch + 1) * batchSize && i < items.length; i++) {
                items[i].classList.add("active");
            }

            // Move to the next batch or loop back to the first
            currentBatch = (currentBatch + 1) % Math.ceil(items.length / batchSize);
        };

        // Initialize and start cycling
        cycleItems(); // Show the first batch initially
        setInterval(cycleItems, 3000); // Cycle every 3 seconds
    });
});