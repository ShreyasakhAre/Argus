const fs = require('fs');
const path = require('path');

// 1. Patch Server.js
const serverPath = path.resolve(__dirname, 'backend', 'server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');

if (!serverContent.includes('helmet')) {
  serverContent = serverContent.replace(
    'const cors = require("cors");',
    'const cors = require("cors");\nconst helmet = require("helmet");\nconst rateLimit = require("express-rate-limit");'
  );

  const securityMiddleware = `app.use(helmet());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);`;

  serverContent = serverContent.replace(
    'app.use(cors());',
    securityMiddleware + '\napp.use(cors());'
  );

  fs.writeFileSync(serverPath, serverContent, 'utf8');
  console.log('Server patched with DevOps security features.');
}

// 2. Patch package.json
const pkgPath = path.resolve(__dirname, 'package.json');
let pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

pkgContent.engines = {
  "node": ">=18.0.0"
};

fs.writeFileSync(pkgPath, JSON.stringify(pkgContent, null, 2), 'utf8');
console.log('Package patched with engine requirements.');
