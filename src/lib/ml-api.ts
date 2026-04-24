const BASE_URL = process.env.NEXT_PUBLIC_ML_API;

export async function predictThreat(payload: any) {
  const res = await fetch(`${BASE_URL}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Prediction failed");
  }

  return res.json();
}

export async function getStats() {
  const res = await fetch(`${BASE_URL}/stats`);
  return res.json();
}

export async function getNotifications() {
  const res = await fetch(`${BASE_URL}/notifications`);
  return res.json();
}

export async function getHeatmap() {
  const res = await fetch(`${BASE_URL}/heatmap`);
  return res.json();
}