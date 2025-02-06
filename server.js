// In index.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const AWS = require("aws-sdk");
const axios = require("axios");
require("dotenv").config();

const app = express();

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Serve static files from the public directory
app.use((req, res, next) => {
  // Set correct MIME types for different file extensions
  const mimeTypes = {
    ".css": "text/css",
    ".js": "application/javascript",
    ".html": "text/html",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
  };

  const ext = path.extname(req.url);
  if (mimeTypes[ext]) {
    res.setHeader("Content-Type", mimeTypes[ext]);
  }
  next();
});

// Update static file serving with MIME type options
app.use(
  express.static("public", {
    setHeaders: (res, path) => {
      const ext = path.split(".").pop();
      switch (ext) {
        case "css":
          res.setHeader("Content-Type", "text/css");
          break;
        case "js":
          res.setHeader("Content-Type", "application/javascript");
          break;
        case "html":
          res.setHeader("Content-Type", "text/html");
          break;
      }
    },
  })
);

// Set up multer for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

const uploadFileToS3 = (fileBuffer, fileName, folderName) => {
  const destination = `${folderName}/${fileName}`;
  const fileExtension = path.extname(fileName).toLowerCase();

  let contentType;
  if (fileExtension === ".mp4" || fileExtension === ".mov") {
    contentType = "video/mp4";
  } else if (fileExtension === ".jpg" || fileExtension === ".jpeg") {
    contentType = "image/jpeg";
  } else if (fileExtension === ".png") {
    contentType = "image/png";
  } else {
    contentType = "application/octet-stream";
  }

  const uploadParams = {
    Bucket: "airsharereview",
    Key: destination,
    Body: fileBuffer,
    ContentType: contentType,
    ACL: "public-read",
  };

  return new Promise((resolve, reject) => {
    s3.upload(uploadParams, (err, data) => {
      if (err) {
        console.log("Error", err);
        reject(new Error(`Failed to upload file: ${err}`));
      }
      if (data) {
        console.log("Uploaded in", data.Location);
        const url = `https://d2ktq59qt1f9bd.cloudfront.net/${destination}`;
        resolve(url);
      }
    });
  });
};

// Serve the HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Handle file upload
app.post("/upload-to-s3", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  try {
    const file = req.file;
    const folderName = req.body.folderName || "default";
    const url = await uploadFileToS3(
      file.buffer,
      file.originalname,
      folderName
    );
    res.json({ success: true, url });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ success: false, error: "File upload failed" });
  }
});

app.post("/save-info", express.json(), async (req, res) => {
  try {
    const {
      id,
      logoImage,
      backgroundImage,
      description,
      trendingBio,
      perksBio,
    } = req.body;

    const url = `https://airlinereview-b835007a0bbc.herokuapp.com/api/v1/airline-airport/update`;
    const data = {
      id,
      logoImage,
      backgroundImage,
      descriptionBio: description,
      trendingBio,
      perksBio,
    };

    const response = await axios.post(url, data);

    if (response.data.success) {
      res.json({ success: true, message: "Information saved successfully" });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Failed to save information" });
    }
  } catch (error) {
    console.error("Error saving information:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
