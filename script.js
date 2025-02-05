let airlines = [];
let airports = [];
let uploadedFiles = new Set();

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

async function saveInfo(type) {
  const id = document.getElementById(`${type}Select`).value;
  const logoImage = document.getElementById(`${type}LogoPreview`).src;
  const backgroundImage = document.getElementById(
    `${type}BackgroundPreview`
  ).src;
  const description =
    document.getElementById(`${type}Description`).value || null;
  const trendingBio =
    document.getElementById(`${type}TrendingBio`).value || null;
  const perksBio = document.getElementById(`${type}PerksBio`).value || null;

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

async function fetchAirlinesAndAirports() {
  try {
    const response = await axios.get(
      "https://airlinereview-b835007a0bbc.herokuapp.com/api/v2/airline-airport/lists"
    );
    const { data } = response.data;

    airlines = data.airlines;
    airports = data.airports;

    populateSelect("airlineSelect", airlines);
    populateSelect("airportSelect", airports);
  } catch (error) {
    console.error("Error fetching data:", error);
    toastr.error("Failed to fetch airlines and airports. Please try again.");
  }
}

function populateSelect(selectId, items) {
  const select = document.getElementById(selectId);
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item._id;
    option.textContent = item.name;
    select.appendChild(option);
  });
}

async function uploadFiles(type) {
  const select = document.getElementById(`${type}Select`);
  const logo = document.getElementById(`${type}Logo`).files[0];
  const background = document.getElementById(`${type}Background`).files[0];
  const id = select.value;
  const description = document.getElementById(`${type}Description`).value;
  const trendingBio = document.getElementById(`${type}TrendingBio`).value;
  const perksBio = document.getElementById(`${type}PerksBio`).value;

  if (!id || !logo) {
    toastr.warning("Please select an ID and upload a logo file.");
    return;
  }

  if (
    logo.type !== "image/png" ||
    (background && background.type !== "image/png")
  ) {
    toastr.error("Please upload PNG files only.");
    return;
  }

  const logoKey = `logos/${id}.png`;
  const backgroundKey = background
    ? `backgrounds/${id}.png`
    : null;

  if (
    uploadedFiles.has(logoKey) ||
    (backgroundKey && uploadedFiles.has(backgroundKey))
  ) {
    toastr.info("Files for this item have already been uploaded.");
    return;
  }

  const loadingSpinner = document.getElementById(`${type}LoadingSpinner`);
  loadingSpinner.style.display = "block";

  try {
    const logoImage = await uploadFileToS3(logo, logoKey);
    let backgroundImage = null;

    if (background) {
      backgroundImage = await uploadFileToS3(background, backgroundKey);
      uploadedFiles.add(backgroundKey);
    }

    uploadedFiles.add(logoKey);

    const data = {
      id,
      logoImage,
      backgroundImage: background || null,
      description: description || null,
      trendingBio: trendingBio || null,
      perksBio: perksBio || null,
    };

    const response = await axios.post("/save-info", data);

    if (response.data.success) {
      toastr.success("Files and information uploaded successfully!");

      // Reset form
      document.getElementById(`${type}Logo`).value = "";
      document.getElementById(`${type}Background`).value = "";
      document.getElementById(`${type}Description`).value = "";
      document.getElementById(`${type}TrendingBio`).value = "";
      document.getElementById(`${type}PerksBio`).value = "";
      document.getElementById(`${type}LogoPreview`).style.display = "none";
      document.getElementById(`${type}BackgroundPreview`).style.display =
        "none";

      updateUploadedList(type, select.options[select.selectedIndex].text);
    } else {
      toastr.error("Failed to save information. Please try again.");
    }
  } catch (error) {
    console.error("Error uploading files:", error);
    toastr.error("Error uploading files. Please try again.");
  } finally {
    loadingSpinner.style.display = "none";
  }
}

function updateUploadedList(type, name) {
  const list = document.querySelector(
    `#uploaded${type.charAt(0).toUpperCase() + type.slice(1)}sList ul`
  );
  const listItem = document.createElement("li");
  listItem.textContent = name;
  list.appendChild(listItem);
}

function uploadAirlineFiles() {
  uploadFiles("airline");
}

function uploadAirportFiles() {
  uploadFiles("airport");
}

async function uploadFileToS3(file, key) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("key", key);

  try {
    const response = await axios.post("/upload-to-s3", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data.url;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

function previewImage(input, previewId) {
  const preview = document.getElementById(previewId);
  const file = input.files[0];
  const reader = new FileReader();

  reader.onloadend = function () {
    preview.src = reader.result;
    preview.style.display = "block";
  };

  if (file) {
    if (file.type !== "image/png") {
      toastr.error("Please select a PNG file.");
      input.value = "";
      preview.src = "";
      preview.style.display = "none";
      return;
    }
    reader.readAsDataURL(file);
  } else {
    preview.src = "";
    preview.style.display = "none";
  }
}

document.querySelectorAll(".sidebar-tabs li").forEach((tab) => {
  tab.addEventListener("click", () => {
    // Remove active class from all tabs
    document
      .querySelectorAll(".sidebar-tabs li")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((content) => content.classList.remove("active"));

    // Add active class to clicked tab
    tab.classList.add("active");

    // Show corresponding content
    const tabId = tab.getAttribute("data-tab");
    document.getElementById(tabId).classList.add("active");
  });
});

function validateFileSize(file) {
  const maxSize = 50 * 1024 * 1024; // 50MB in bytes
  if (file.size > maxSize) {
    toastr.error("File size must be less than 50MB");
    return false;
  }
  return true;
}

function previewMultipleMedia(input, previewContainerId) {
  const previewContainer = document.getElementById(previewContainerId);
  previewContainer.innerHTML = "";

  if (input.files) {
    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];

      if (!validateFileSize(file)) {
        input.value = "";
        previewContainer.innerHTML = "";
        return;
      }

      const reader = new FileReader();
      const mediaElement = document.createElement(
        file.type.startsWith("image/") ? "img" : "video"
      );

      reader.onload = function (e) {
        if (file.type.startsWith("image/")) {
          mediaElement.src = e.target.result;
          mediaElement.className = "preview-media";
        } else if (file.type.startsWith("video/")) {
          mediaElement.src = e.target.result;
          mediaElement.controls = true;
          mediaElement.className = "preview-media";
        }

        const mediaWrapper = document.createElement("div");
        mediaWrapper.className = "media-wrapper";

        const removeBtn = document.createElement("button");
        removeBtn.innerHTML = "×";
        removeBtn.className = "remove-media";
        removeBtn.onclick = function () {
          mediaWrapper.remove();
        };

        mediaWrapper.appendChild(mediaElement);
        mediaWrapper.appendChild(removeBtn);
        previewContainer.appendChild(mediaWrapper);
      };

      reader.readAsDataURL(file);
    }
  }
}

fetchAirlinesAndAirports();
