let airlines = [];
let airports = [];
let uploadedFiles = new Set();
// Global variables for pagination
let currentPage = 1;
let currentType = "airline";
let searchQuery = "";
let reviewToDelete = null;

// Configure toastr notification settings
toastr.options = {
  closeButton: true,
  debug: false,
  newestOnTop: false,
  progressBar: true,
  positionClass: "toast-top-right",
  preventDuplicates: false,
  onclick: null,
  showDuration: "300",
  hideDuration: "1000",
  timeOut: "5000",
  extendedTimeOut: "1000",
  showEasing: "swing",
  hideEasing: "linear",
  showMethod: "fadeIn",
  hideMethod: "fadeOut",
};

// Authentication check
if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "login.html";
}

function showDeleteModal(reviewId, type) {
  reviewToDelete = { id: reviewId, type: type };
  document.getElementById("deleteModal").style.display = "block";
}

function hideDeleteModal() {
  document.getElementById("deleteModal").style.display = "none";
  reviewToDelete = null;
}

async function deleteReview(reviewId, type) {
  try {
    showLoadingSpinner();
    const response = await axios.post(
      `https://airlinereview-b835007a0bbc.herokuapp.com/api/v1/airline-airport/delete`,
      {
        id: reviewId,
        isAirline: type.toLowerCase() === "airline",
      }
    );

    if (response.data.success) {
      toastr.success("Review deleted successfully");
      fetchReviews(currentPage, currentType, searchQuery);
    } else {
      toastr.error(response.data.message || "Failed to delete review");
    }
  } catch (error) {
    console.error("Error deleting review:", error);
    toastr.error(error.response?.data?.message || "Error deleting review");
  } finally {
    hideLoadingSpinner();
  }
}
// Function to fetch and display reviews
async function fetchReviews(page = 1, airType = "airline", searchQuery = "") {
  try {
    showLoadingSpinner();
    const response = await axios.get(`https://airlinereview-b835007a0bbc.herokuapp.com/api/v2/feed-list`, {
      params: {
        page,
        airType,
        flyerClass: "All",
        searchQuery,
      },
    });

    const { data, hasMore, currentPage: newPage } = response.data;

    // Update pagination controls
    document.getElementById("nextPage").disabled = !hasMore;
    document.getElementById("prevPage").disabled = page === 1;
    document.getElementById("currentPage").textContent = page;
    currentPage = page;

    // Display reviews in table
    const reviewsList = document.getElementById("reviewsList");
    reviewsList.innerHTML = "";

    data.forEach((review) => {
      const row = document.createElement("tr");
      const isAirlineReview = airType.toLowerCase() === "airline";

      if (isAirlineReview) {
        row.innerHTML = `
                  <td>${new Date(review.date).toLocaleDateString()}</td>
                  <td>${review.reviewer?.name || "Unknown"}</td>
                  <td>${review.from?.name || "N/A"}</td>
                  <td>${review.airline?.name || "N/A"}</td>
                  <td>${review.classTravel || "N/A"}</td>
                  <td>${review.comment || "No comment"}</td>
                  <td class="media-cell">
                      ${renderMediaPreview(review.imageUrls || [])}
                  </td>
                  <td>
                      <button onclick="showDeleteModal('${
                        review._id
                      }', 'airline')" class="delete-btn">
                          <i class="fas fa-trash"></i>
                      </button>
                  </td>
              `;
      } else {
        row.innerHTML = `
                  <td>${new Date(review.date).toLocaleDateString()}</td>
                  <td>${review.reviewer?.name || "Unknown"}</td>
                  <td>${review.airport?.name || "N/A"}</td>
                  <td>${review.airline?.name || "N/A"}</td>
                  <td>${review.classTravel || "N/A"}</td>
                  <td>${review.comment || "No comment"}</td>
                  <td class="media-cell">
                      ${renderMediaPreview(review.imageUrls || [])}
                  </td>
                  <td>
                      <button onclick="showDeleteModal('${
                        review._id
                      }', 'airport')" class="delete-btn">
                          <i class="fas fa-trash"></i>
                      </button>
                  </td>
              `;
      }
      reviewsList.appendChild(row);
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    toastr.error("Failed to fetch reviews");
  } finally {
    hideLoadingSpinner();
  }
}

/**
 * Saves information for a given entity type
 * @param {string} type - The type of entity (airline/airport)
 * @returns {Promise<void>}
 */
async function saveInfo(type) {
  const id = document.getElementById(`${type}Select`).value;
  const logoImage = document.getElementById(`${type}LogoPreview`).src;
  const backgroundImage = document.getElementById(
    `${type}BackgroundPreview`
  ).src;
  const description =
    document.getElementById(`${type}Description`).value?.trim() || null;
  const trendingBio =
    document.getElementById(`${type}TrendingBio`).value?.trim() || null;
  const perksBio =
    document.getElementById(`${type}PerksBio`).value?.trim() || null;

  if (!id || !logoImage) {
    toastr.warning("Please fill in required fields (ID, Logo, Description).");
    return;
  }

  try {
    const response = await axios.post("/save-info", {
      id,
      logoImage,
      backgroundImage: backgroundImage || null,
      description,
      trendingBio,
      perksBio,
    });

    if (response.data.success) {
      toastr.success("Information saved successfully!");
    } else {
      toastr.error("Failed to save information. Please try again.");
    }
  } catch (error) {
    console.error("Error saving information:", error);
    toastr.error("Error saving information. Please try again.");
  }
}

/**
 * Fetches airlines and airports data from the API
 * @returns {Promise<void>}
 */
function fetchAirlinesAndAirports() {
  showLoadingSpinner();
  try {
    axios
      .get("https://airlinereview-b835007a0bbc.herokuapp.com/api/v2/airline-airport/lists")
      .then((response) => {
        const { data } = response.data;
        airlines = data.airlines;
        airports = data.airports;

        // Update all select elements with unique IDs
        populateSelect("airlineSelect", airlines);
        populateSelect("airportSelect", airports);
        populateSelect("airportToSelect", airports);
        populateSelect("airportFromSelect", airports);
        populateSelect("airlineTravelSelect", airlines);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        toastr.error(
          "Failed to fetch airlines and airports. Please try again."
        );
      })
      .finally(() => {
        hideLoadingSpinner();
      });
  } catch (error) {
    console.error("Error:", error);
    toastr.error("An error occurred. Please try again.");
    hideLoadingSpinner();
  }
}

/**
 * Populates a select element with items
 * @param {string} selectId - The ID of the select element
 * @param {Array} items - Array of items to populate
 */
function populateSelect(selectId, items) {
  const select = document.getElementById(selectId);
  select.innerHTML = ""; // Clear existing options
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item._id;
    option.textContent = item.name;
    select.appendChild(option);
  });
}

/**
 * Uploads files and related information
 * @param {string} type - The type of entity (airline/airport)
 * @returns {Promise<void>}
 */
async function uploadFiles(type) {
  const select = document.getElementById(`${type}Select`);
  const logo = document.getElementById(`${type}Logo`).files[0];
  const background = document.getElementById(`${type}Background`).files[0];
  const id = select.value;
  const description = document.getElementById(`${type}Description`).value?.trim();
  const trendingBio = document.getElementById(`${type}TrendingBio`).value?.trim();
  const perksBio = document.getElementById(`${type}PerksBio`).value?.trim();

  if (!id) {
      toastr.warning("Please select an ID");
      return;
  }

  let logoImage = null;
  let backgroundImage = null;

  showLoadingSpinner();
  try {
      // Upload logo if provided
      if (logo) {
          if (logo.type !== "image/png") {
              toastr.error("Logo must be a PNG file");
              return;
          }
          const logoKey = `logos/${id}.png`;
          logoImage = await uploadFileToS3(logo, logoKey);
      }

      // Upload background if provided
      if (background) {
          if (background.type !== "image/png") {
              toastr.error("Background must be a PNG file");
              return;
          }
          const backgroundKey = `backgrounds/${id}.png`;
          backgroundImage = await uploadFileToS3(background, backgroundKey);
      }

      // Only include fields that have changed
      const updateData = {
          id,
          ...(logoImage && { logoImage }),
          ...(backgroundImage && { backgroundImage }),
          ...(description && { description }),
          ...(trendingBio && { trendingBio }),
          ...(perksBio && { perksBio })
      };

      const response = await axios.post("/save-info", updateData);

      if (response.data.success) {
          toastr.success("Information updated successfully!");
          resetForm(type);
          updateUploadedList(type, select.options[select.selectedIndex].text);
      } else {
          toastr.error("Failed to save information. Please try again.");
      }
  } catch (error) {
      console.error("Error uploading files:", error);
      toastr.error("Error uploading files. Please try again.");
  } finally {
      hideLoadingSpinner();
  }
}

/**
 * Resets form fields after successful upload
 * @param {string} type - The type of entity (airline/airport)
 */
function resetForm(type) {
  document.getElementById(`${type}Logo`).value = "";
  document.getElementById(`${type}Background`).value = "";
  document.getElementById(`${type}Description`).value = "";
  document.getElementById(`${type}TrendingBio`).value = "";
  document.getElementById(`${type}PerksBio`).value = "";
  document.getElementById(`${type}LogoPreview`).style.display = "none";
  document.getElementById(`${type}BackgroundPreview`).style.display = "none";
}

/**
 * Updates the uploaded items list
 * @param {string} type - The type of entity (airline/airport)
 * @param {string} name - The name of the uploaded item
 */
function updateUploadedList(type, name) {
  const list = document.querySelector(
    `#uploaded${type.charAt(0).toUpperCase() + type.slice(1)}sList ul`
  );
  if (!list) return;

  list.innerHTML = ""; // Clear existing items
  const listItem = document.createElement("li");
  listItem.textContent = name;
  list.appendChild(listItem);
}

const uploadAirlineFiles = () => uploadFiles("airline");
const uploadAirportFiles = () => uploadFiles("airport");

/**
 * Uploads a file to S3
 * @param {File} file - The file to upload
 * @param {string} key - The S3 key for the file
 * @returns {Promise<string>} The URL of the uploaded file
 */
async function uploadFileToS3(file, folderName) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folderName", folderName);

  try {
    const response = await axios.post("/upload-to-s3", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data.url;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw new Error("Failed to upload file");
  }
}

/**
 * Previews an image before upload
 * @param {HTMLInputElement} input - The file input element
 * @param {string} previewId - The ID of the preview element
 */
function previewImage(input, previewId) {
  const preview = document.getElementById(previewId);
  const file = input.files[0];

  if (!file) {
    preview.src = "";
    preview.style.display = "none";
    return;
  }

  if (file.type !== "image/png") {
    toastr.error("Please select a PNG file.");
    input.value = "";
    preview.src = "";
    preview.style.display = "none";
    return;
  }

  const reader = new FileReader();
  reader.onloadend = () => {
    preview.src = reader.result;
    preview.style.display = "block";
  };
  reader.readAsDataURL(file);
}

// Update the media display in fetchReviews function
function renderMediaPreview(mediaUrls) {
  return mediaUrls
    .map((url) => {
      // Check if URL is a video
      const isVideo = url.includes(".mp4");

      // Check if URL is an image
      const isImage =
        url.includes(".jpg") || url.includes(".jpeg") || url.includes(".png");

      if (isVideo) {
        return `
              <div class="media-item video">
                  <video controls>
                      <source src="${url}" type="video/mp4">
                  </video>
              </div>`;
      } else if (isImage) {
        return `
              <div class="media-item">
                  <img src="${url}" alt="Review media">
              </div>`;
      }
      return "";
    })
    .join("");
}

// Debounce function for search input
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Validates file size
 * @param {File} file - The file to validate
 * @returns {boolean} Whether the file size is valid
 */
function validateFileSize(file) {
  const MAX_SIZE = 50 * 1024 * 1024; // 100MB
  if (file.size > MAX_SIZE) {
    toastr.error("File size must be less than 100MB");
    return false;
  }
  return true;
}

/**
 * Previews multiple media files
 * @param {HTMLInputElement} input - The file input element
 * @param {string} previewContainerId - The ID of the preview container
 */
function previewMultipleMedia(input, previewContainerId) {
  const previewContainer = document.getElementById(previewContainerId);
  const existingFiles = Array.from(previewContainer.children);
  const fileArray = [];

  if (!input.files) return;

  Array.from(input.files).forEach((file) => {
    if (!validateFileSize(file)) return;

    fileArray.push(file);
    const reader = new FileReader();
    const mediaElement = document.createElement(
      file.type.startsWith("image/") ? "img" : "video"
    );

    reader.onload = (e) => {
      mediaElement.src = e.target.result;
      mediaElement.className = "preview-media";
      if (file.type.startsWith("video/")) {
        mediaElement.controls = true;
      }

      const mediaWrapper = document.createElement("div");
      mediaWrapper.className = "media-wrapper";

      const removeBtn = document.createElement("button");
      removeBtn.innerHTML = "×";
      removeBtn.className = "remove-media";
      removeBtn.onclick = () => {
        const index = fileArray.indexOf(file);
        if (index > -1) {
          fileArray.splice(index, 1);
        }
        mediaWrapper.remove();
      };

      const fileName = document.createElement("div");
      fileName.className = "file-name";
      fileName.textContent = file.name;

      mediaWrapper.append(mediaElement, removeBtn, fileName);
      previewContainer.appendChild(mediaWrapper);
    };

    reader.readAsDataURL(file);
  });

  existingFiles.forEach((file) => previewContainer.appendChild(file));
  return fileArray;
}

// Event listeners for filters and pagination
document.getElementById("filterReviewType").addEventListener("change", (e) => {
  currentType = e.target.value;
  currentPage = 1;
  fetchReviews(currentPage, currentType, searchQuery);
});

document.getElementById("searchReview").addEventListener(
  "input",
  debounce((e) => {
    searchQuery = e.target.value;
    currentPage = 1;
    fetchReviews(currentPage, currentType, searchQuery);
  }, 500)
);

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  fetchAirlinesAndAirports();

  document.querySelector(".close-modal").onclick = hideDeleteModal;
  document.querySelector(".cancel-btn").onclick = hideDeleteModal;
  document.querySelector(".confirm-delete-btn").onclick = async () => {
    if (reviewToDelete) {
      await deleteReview(reviewToDelete.id, reviewToDelete.type);
      hideDeleteModal();
    }
  };
  window.onclick = (event) => {
    if (event.target === document.getElementById("deleteModal")) {
      hideDeleteModal();
    }
  };
  const reviewManageTab = document.querySelector('[data-tab="review-manage"]');
  reviewManageTab.addEventListener("click", () => {
    fetchReviews(currentPage, currentType, searchQuery);
  });

  // Set default selections
  document.getElementById("airlineReview").checked = true;

  document.getElementById("nextPage").addEventListener("click", () => {
    fetchReviews(currentPage + 1, currentType, searchQuery);
  });

  document.getElementById("prevPage").addEventListener("click", () => {
    if (currentPage > 1) {
      fetchReviews(currentPage - 1, currentType, searchQuery);
    }
  });

  // Initialize sidebar tabs
  document.querySelectorAll(".sidebar-tabs li").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".sidebar-tabs li")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((content) => content.classList.remove("active"));

      tab.classList.add("active");
      const tabId = tab.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");
    });
  });

  document.querySelectorAll('input[name="reviewType"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const airlineForm = document.querySelector(".review-form");
      const airportForm = document.querySelector(".airport-review-form");

      if (e.target.value === "airport") {
        airlineForm.style.display = "none";
        if (!airportForm) {
          const newForm = `
            <div class="airport-review-form review-form">
              <div class="file-input-wrapper">
                <div class="file-input-button">Choose Multiple Media Files (Max 50MB each)</div>
                <input type="file" id="airportReviewMedia" accept="image/*,video/*" multiple onchange="previewMultipleMedia(this, 'airportReviewMediaPreview')">
              </div>
              <div class="form-group">
                <label for="airportReviewAirportSelect" class="form-label">Departure Airport:</label>
                <select id="airportReviewAirportSelect" class="form-select"></select>
              </div>
              <div class="form-group">
                <label for="airportReviewAirlineSelect" class="form-label">Airline:</label>
                <select id="airportReviewAirlineSelect" class="form-select"></select>
              </div>
              <div id="airportReviewMediaPreview" class="media-preview"></div>
              <div class="form-group">
                <label class="form-label">Travel Class:</label>
                <div class="radio-group">
                    <div class="radio-item">
                        <input type="radio" id="airport_business" name="classTravel" value="Business">
                        <label for="airport_business">Business Class</label>
                    </div>
                    <div class="radio-item">
                        <input type="radio" id="airport_premium" name="classTravel" value="Premium Economy">
                        <label for="airport_premium">Premium Economy</label>
                    </div>
                    <div class="radio-item">
                        <input type="radio" id="airport_economy" name="classTravel" value="Economy" checked>
                        <label for="airport_economy">Economy Class</label>
                    </div>
                </div>
              </div>
  
              <div class="form-group">
                <label class="form-label">Accessibility:</label>
                <div class="checkbox-group">
                  <div class="checkbox-item">
                    <input type="checkbox" id="airport_wheelchairAccess" name="accessibility">
                    <label for="airport_wheelchairAccess">Wheelchair Access</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="airport_specialAssistance" name="accessibility">
                    <label for="airport_specialAssistance">Special Assistance</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="airport_elevators" name="accessibility">
                    <label for="airport_elevators">Elevators/Lifts</label>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Wait Times:</label>
                <div class="checkbox-group">
                  <div class="checkbox-item">
                    <input type="checkbox" id="airport_securityWait" name="waitTimes">
                    <label for="airport_securityWait">Security Check</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="airport_immigrationWait" name="waitTimes">
                    <label for="airport_immigrationWait">Immigration</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="airport_baggageWait" name="waitTimes">
                    <label for="airport_baggageWait">Baggage Claim</label>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Staff Helpfulness:</label>
                <div class="checkbox-group">
                  <div class="checkbox-item">
                    <input type="checkbox" id="infoDesk" name="helpfulness">
                    <label for="infoDesk">Information Desk</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="securityStaff" name="helpfulness">
                    <label for="securityStaff">Security Staff</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="gateStaff" name="helpfulness">
                    <label for="gateStaff">Gate Staff</label>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Ambience & Comfort:</label>
                <div class="checkbox-group">
                  <div class="checkbox-item">
                    <input type="checkbox" id="seating" name="ambienceComfort">
                    <label for="seating">Seating Areas</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="cleanliness" name="ambienceComfort">
                    <label for="cleanliness">Cleanliness</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="noise" name="ambienceComfort">
                    <label for="noise">Noise Level</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="lighting" name="ambienceComfort">
                    <label for="lighting">Lighting</label>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Food & Beverage:</label>
                <div class="checkbox-group">
                  <div class="checkbox-item">
                    <input type="checkbox" id="restaurants" name="foodBeverage">
                    <label for="restaurants">Restaurant Variety</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="prices" name="foodBeverage">
                    <label for="prices">Price Levels</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="quality" name="foodBeverage">
                    <label for="quality">Food Quality</label>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Amenities:</label>
                <div class="checkbox-group">
                  <div class="checkbox-item">
                    <input type="checkbox" id="wifi" name="amenities">
                    <label for="wifi">WiFi Service</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="shopping" name="amenities">
                    <label for="shopping">Shopping Options</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="lounges" name="amenities">
                    <label for="lounges">Airport Lounges</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="charging" name="amenities">
                    <label for="charging">Charging Stations</label>
                  </div>
                </div>
              </div>
  
              <textarea id="airportReviewComment" placeholder="Write your comment here..." class="review-comment"></textarea>
  
              <button onclick="submitAirportReview()" class="submit-review-btn">Submit Airport Review</button>
            </div>
          `;
          airlineForm.insertAdjacentHTML("afterend", newForm);
          populateSelect("airportReviewAirportSelect", airports);
          populateSelect("airportReviewAirlineSelect", airlines);
        } else {
          airportForm.style.display = "block";
        }
      } else {
        airlineForm.style.display = "block";
        if (document.querySelector(".airport-review-form")) {
          document.querySelector(".airport-review-form").style.display = "none";
        }
      }
    });
  });
});

function showLoadingSpinner() {
  console.log("showLoadingSpinner called----------------");
  document.querySelector(".loading-spinner").style.display = "block";
  document.querySelector(".loading-overlay").style.display = "block";
}

function hideLoadingSpinner() {
  console.log("showLoadingSpinner called+++++++++++++++++");
  document.querySelector(".loading-spinner").style.display = "none";
  document.querySelector(".loading-overlay").style.display = "none";
}

async function submitReview() {
  const reviewType = document.querySelector(
    'input[name="reviewType"]:checked'
  ).value;

  if (reviewType === "airline") {
    try {
      showLoadingSpinner();

      // Get all media wrapper elements from the preview container
      const mediaWrappers = document.querySelectorAll(
        "#reviewMediaPreview .media-wrapper"
      );
      let mediaUrls = [];

      // Process each media wrapper
      for (const wrapper of mediaWrappers) {
        const mediaElement = wrapper.querySelector("img, video");
        if (mediaElement) {
          // Convert data URL to Blob
          const response = await fetch(mediaElement.src);
          const blob = await response.blob();

          // Create file from blob
          const fileName = wrapper.querySelector(".file-name").textContent;
          const file = new File([blob], fileName, { type: blob.type });

          // Upload to S3
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folderName", "reviews");

          try {
            const response = await axios.post("/upload-to-s3", formData, {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            });
            mediaUrls.push(response.data.url);
          } catch (error) {
            console.error("Error uploading media:", error);
            toastr.error(`Error uploading ${fileName}`);
          }
        }
      }

      const airlineData = {
        reviewer: "678ddd644b12a3d332bcd9a9",
        from: document.getElementById("airportFromSelect").value,
        to: document.getElementById("airportToSelect").value,
        airline: document.getElementById("airlineTravelSelect").value,
        classTravel:
          document.querySelector('input[name="classTravel"]:checked').value ??
          "Economy",
        imageUrls: mediaUrls,
        departureArrival: Object.fromEntries(
          Array.from(
            document.querySelectorAll('input[name="departureArrival"]')
          ).map((cb) => [cb.id, cb.checked])
        ),
        comfort: Object.fromEntries(
          Array.from(document.querySelectorAll('input[name="comfort"]')).map(
            (cb) => [cb.id, cb.checked]
          )
        ),
        cleanliness: Object.fromEntries(
          Array.from(
            document.querySelectorAll('input[name="cleanliness"]')
          ).map((cb) => [cb.id, cb.checked])
        ),
        onboardService: Object.fromEntries(
          Array.from(
            document.querySelectorAll('input[name="onboardService"]')
          ).map((cb) => [cb.id, cb.checked])
        ),
        foodBeverage: Object.fromEntries(
          Array.from(
            document.querySelectorAll('input[name="foodBeverage"]')
          ).map((cb) => [cb.id, cb.checked])
        ),
        entertainmentWifi: Object.fromEntries(
          Array.from(
            document.querySelectorAll('input[name="entertainmentWifi"]')
          ).map((cb) => [cb.id, cb.checked])
        ),
        comment: document.getElementById("reviewComment").value,
      };

      const response = await axios.post(
        "https://airlinereview-b835007a0bbc.herokuapp.com/api/v1/airline-review",
        airlineData
      );

      if (response.status === 201) {
        const score = response.data.data.score;
        toastr.success(
          `Review submitted successfully! Score: ${score.toFixed(1)}/10`
        );
        // Reset form
        document.getElementById("reviewMedia").value = "";
        document.getElementById("reviewMediaPreview").innerHTML = "";
        document.getElementById("reviewComment").value = "";
        document
          .querySelectorAll('input[type="checkbox"]')
          .forEach((cb) => (cb.checked = false));
      } else {
        toastr.error("Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toastr.error("Error submitting review");
    } finally {
      hideLoadingSpinner();
    }
  }
}

async function submitAirportReview() {
  try {
    showLoadingSpinner();

    // Get all media wrapper elements from the preview container
    const mediaWrappers = document.querySelectorAll(
      "#airportReviewMediaPreview .media-wrapper"
    );
    let mediaUrls = [];

    // Process each media wrapper
    for (const wrapper of mediaWrappers) {
      const mediaElement = wrapper.querySelector("img, video");
      if (mediaElement) {
        // Convert data URL to Blob
        const response = await fetch(mediaElement.src);
        const blob = await response.blob();

        // Create file from blob
        const fileName = wrapper.querySelector(".file-name").textContent;
        const file = new File([blob], fileName, { type: blob.type });

        // Upload to S3
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderName", "reviews");

        try {
          const response = await axios.post("/upload-to-s3", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
          mediaUrls.push(response.data.url);
        } catch (error) {
          console.error("Error uploading media:", error);
          toastr.error(`Error uploading ${fileName}`);
        }
      }
    }

    const airportData = {
      reviewer: "678ddd644b12a3d332bcd9a9",
      airport: document.getElementById("airportReviewAirportSelect").value,
      airline: document.getElementById("airportReviewAirlineSelect").value,
      imageUrls: mediaUrls,
      classTravel:
        document.querySelector('input[name="classTravel"]:checked').value ??
        "Economy",
      accessibility: Object.fromEntries(
        Array.from(
          document.querySelectorAll('input[name="accessibility"]')
        ).map((cb) => [cb.id, cb.checked])
      ),
      waitTimes: Object.fromEntries(
        Array.from(document.querySelectorAll('input[name="waitTimes"]')).map(
          (cb) => [cb.id, cb.checked]
        )
      ),
      helpfulness: Object.fromEntries(
        Array.from(document.querySelectorAll('input[name="helpfulness"]')).map(
          (cb) => [cb.id, cb.checked]
        )
      ),
      ambienceComfort: Object.fromEntries(
        Array.from(
          document.querySelectorAll('input[name="ambienceComfort"]')
        ).map((cb) => [cb.id, cb.checked])
      ),
      foodBeverage: Object.fromEntries(
        Array.from(document.querySelectorAll('input[name="foodBeverage"]')).map(
          (cb) => [cb.id, cb.checked]
        )
      ),
      amenities: Object.fromEntries(
        Array.from(document.querySelectorAll('input[name="amenities"]')).map(
          (cb) => [cb.id, cb.checked]
        )
      ),
      comment: document.getElementById("airportReviewComment").value,
    };

    // Send review data to backend
    const response = await axios.post(
      "https://airlinereview-b835007a0bbc.herokuapp.com/api/v1/airport-review",
      airportData
    );

    if (response.status === 201) {
      const score = response.data.data.score;
      toastr.success(
        `Review submitted successfully! Score: ${score.toFixed(1)}/10`
      );
      // Reset form
      document.getElementById("airportReviewMedia").value = "";
      document.getElementById("airportReviewMediaPreview").innerHTML = "";
      document.getElementById("airportReviewComment").value = "";
      document
        .querySelectorAll('input[type="checkbox"]')
        .forEach((cb) => (cb.checked = false));
    } else {
      toastr.error("Failed to submit review");
    }
  } catch (error) {
    console.error("Error submitting review:", error);
    toastr.error("Error submitting review");
  } finally {
    hideLoadingSpinner();
  }
}
