const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

let envLoaded = false;

function loadEnv() {
  if (envLoaded) {
    return;
  }

  const candidatePaths = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env.local"),
    path.resolve(process.cwd(), "..", ".env"),
    path.resolve(process.cwd(), "..", "..", ".env.local"),
    path.resolve(process.cwd(), "..", "..", ".env"),
  ];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }

  envLoaded = true;
}

loadEnv();

const globalMongoose = global.__argusMongoose || {
  conn: null,
  promise: null,
};

global.__argusMongoose = globalMongoose;

async function connectDB() {
  loadEnv();

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined. Add it to your .env file.");
  }

  if (globalMongoose.conn) {
    return globalMongoose.conn;
  }

  if (!globalMongoose.promise) {
    console.log("[db] Connecting to MongoDB Atlas...");
    globalMongoose.promise = mongoose.connect(mongoUri).then((mongooseInstance) => {
      console.log("[db] MongoDB connected.");
      return mongooseInstance;
    });
  }

  globalMongoose.conn = await globalMongoose.promise;
  return globalMongoose.conn;
}

module.exports = {
  connectDB,
  loadEnv,
};
