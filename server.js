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

// Set up multer for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

const uploadFileToS3 = (fileBuffer, fileName) => {
  const key = `${fileName}`;

  const uploadParams = {
    Bucket: "airlinereview",
    Key: key,
    Body: fileBuffer,
    ACL: "public-read",
  };

  return new Promise((resolve, reject) => {
    s3.upload(uploadParams, (err, data) => {
      if (err) {
        console.log("Error", err);
        reject(err);
      }
      if (data) {
        console.log("Uploaded in", data.Location);
        resolve(data.Location);
      }
    });
  });
};

// Serve the HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Handle file upload
app.post("/upload-to-s3", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  try {
    const file = req.file;
    const key = req.body.key;
    const url = await uploadFileToS3(file.buffer, key);
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
