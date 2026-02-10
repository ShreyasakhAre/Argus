import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

export async function connectDB() {
  // MongoDB intentionally disabled for dataset-driven mode
  return;
}
