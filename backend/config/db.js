const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

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
    path.resolve(process.cwd(), "..", "..", ".env"),
    path.resolve(process.cwd(), "..", "..", ".env.local")
  ];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }

  envLoaded = true;
}

loadEnv();

// MongoDB completely disabled - using datasetService only
console.log("[db] MongoDB completely disabled. Using datasetService for all operations.");

module.exports = {
  loadEnv,
  connectDB: async () => { return true; }
};
