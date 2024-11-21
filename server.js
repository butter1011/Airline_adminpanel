// In index.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const AWS = require("aws-sdk");
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
