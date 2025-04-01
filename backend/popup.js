//popup.js

// Open the image popup
export function openImagePopup(src) {
    const popup = document.querySelector(".image-popup");
    const popupImage = document.getElementById("popupImage");
    // Load the image first to check dimensions
    const tempImage = new Image();
    tempImage.onload = () => {
      adjustImageRotation(tempImage, popupImage); // Initial adjustment
      popupImage.src = src; // Set the image source
      popup.style.display = "flex"; // Show the popup
    };
  
    tempImage.src = src; // Load the image
}
  
// Close the image popup
function closeImagePopup() {
    const popup = document.querySelector(".image-popup");
    popup.style.display = "none";
}

// Adjust image rotation based on dimensions and window size
function adjustImageRotation(tempImage, popupImage) {
    if (window.innerWidth <= 480 && tempImage.width > tempImage.height) {
      popupImage.classList.add("rotate"); // Add the rotate class
    } else {
      popupImage.classList.remove("rotate"); // Ensure the class is removed otherwise
    }
}

// Event listener for closing the popup
document.querySelector(".image-popup .close").addEventListener("click", closeImagePopup);

// Close popup on clicking outside the image
document.querySelector(".image-popup").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    closeImagePopup();
  }
});

// Recheck image rotation on window resize
window.addEventListener("resize", () => {
    const popupImage = document.getElementById("popupImage");
    if (popupImage && popupImage.src) {
      const tempImage = new Image();
      tempImage.onload = () => {
        adjustImageRotation(tempImage, popupImage);
      };
      tempImage.src = popupImage.src;
    }
});