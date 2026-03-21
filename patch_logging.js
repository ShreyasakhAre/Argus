const fs = require('fs');
const path = require('path');

// 1. Patch AuthController
const authPath = path.resolve(__dirname, 'backend', 'controllers', 'authController.js');
let authContent = fs.readFileSync(authPath, 'utf8');

if (!authContent.includes('const logger')) {
  authContent = authContent.replace(
    'const { JWT_SECRET } = require("../middleware/authMiddleware");',
    'const { JWT_SECRET } = require("../middleware/authMiddleware");\nconst logger = require("../utils/logger");'
  );
  
  authContent = authContent.replace(
    /return res.status\(200\).json\(\{/g,
    'logger.info("User Login", user.email, { role: user.role });\n\n    return res.status(200).json({'
  );
  fs.writeFileSync(authPath, authContent, 'utf8');
}

// 2. Patch AlertController
const alertPath = path.resolve(__dirname, 'backend', 'controllers', 'alertController.js');
let alertContent = fs.readFileSync(alertPath, 'utf8');

if (!alertContent.includes('const logger')) {
  alertContent = alertContent.replace(
    'const alertService = require("../services/alertService");',
    'const alertService = require("../services/alertService");\nconst logger = require("../utils/logger");'
  );
  
  const targetReqBody = `const result = await alertService.createAlert(req.body);`;
  const replacementReqBody = `const result = await alertService.createAlert(req.body);\n    logger.info("Alert Created", req.user ? req.user.email : "system", { severity: result.alert.severity, type: result.alert.type });`;
  
  alertContent = alertContent.replace(targetReqBody, replacementReqBody);
  fs.writeFileSync(alertPath, alertContent, 'utf8');
}

console.log('Logging successfully injected');
