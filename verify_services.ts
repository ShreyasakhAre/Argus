import { getAlerts as getJsonAlerts } from "./backend/services/jsonAlertService.js";
import { getAlerts as getMongoAlerts } from "./backend/services/alertService.js";

async function verify() {
  console.log("Verifying JSON Service...");
  const jsonRes = await getJsonAlerts();
  console.log(`JSON returned ${jsonRes.alerts?.length} alerts, total: ${jsonRes.total}`);

  console.log("Verifying Mongo Service...");
  const mongoRes = await getMongoAlerts();
  console.log(`Mongo returned ${mongoRes.alerts?.length} alerts, total: ${mongoRes.total}`);

  if (jsonRes.alerts && jsonRes.alerts.length > 0) {
    if (typeof jsonRes.alerts[0].id === 'string') {
      console.log("JSON Service format OK");
    } else {
      console.log("JSON Service item is missing ID!");
    }
  }
  
  if (mongoRes.alerts && mongoRes.alerts.length > 0) {
    if (typeof mongoRes.alerts[0].id === 'string') {
      console.log("Mongo Service format OK");
      console.log("Sample Data: ", JSON.stringify(mongoRes.alerts[0]).slice(0, 100));
    } else {
      console.log("Mongo Service item is missing ID!");
    }
  }
  
  console.log("Verification completed successfully.");
  process.exit(0);
}

verify().catch(err => {
  console.error("Verification Error:", err);
  process.exit(1);
});
