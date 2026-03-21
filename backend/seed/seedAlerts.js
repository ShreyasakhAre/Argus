const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");
const { Alert } = require("../models/Alert");

async function seedAlerts() {
  const shouldClear = process.argv.includes("--clear");
  const filePath = path.resolve(__dirname, "..", "data", "alerts.json");
  const fileContents = fs.readFileSync(filePath, "utf8");
  const alerts = JSON.parse(fileContents);

  const documents = alerts.map((alert, index) => ({
    legacyId: alert.id || `A${Date.now()}${index}`,
    type: alert.type || "new_threat",
    severity: alert.severity || "medium",
    message: alert.message,
    status: alert.status || (alert.acknowledged ? "acknowledged" : "pending"),
    timestamp: alert.timestamp ? new Date(alert.timestamp) : new Date(),
    notification_id: alert.notification_id || null,
    details: alert.details || {},
  }));

  await connectDB();

  if (shouldClear) {
    const cleared = await Alert.deleteMany({});
    console.log(`[seed] Cleared ${cleared.deletedCount} existing alerts.`);
  }

  const inserted = await Alert.insertMany(documents);
  console.log(`[seed] Inserted ${inserted.length} alerts from ${filePath}.`);
}

seedAlerts()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[seed] Failed to seed alerts:", error);
    await mongoose.connection.close();
    process.exit(1);
  });
