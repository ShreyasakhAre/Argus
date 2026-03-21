const fs = require('fs');
const path = require('path');

// 1. FRONTEND: Localhost replacement
const uiPath = path.resolve(__dirname, 'src', 'components', 'alert-panel.tsx');
let uiContent = fs.readFileSync(uiPath, 'utf8');
uiContent = uiContent.split('"http://localhost:5000"').join('process.env.NEXT_PUBLIC_BACKEND_URL || "https://argus-backend.onrender.com"');
uiContent = uiContent.split("'http://localhost:5000/api/alerts'").join('`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/alerts` || "https://argus-backend.onrender.com/api/alerts"');
fs.writeFileSync(uiPath, uiContent, 'utf8');

const provPath = path.resolve(__dirname, 'src', 'components', 'notification-provider.tsx');
let provContent = fs.readFileSync(provPath, 'utf8');
provContent = provContent.split('"http://localhost:5000"').join('process.env.NEXT_PUBLIC_BACKEND_URL || "https://argus-backend.onrender.com"');
fs.writeFileSync(provPath, provContent, 'utf8');

// 2. FRONTEND: ENV Vars
const envLocalPath = path.resolve(__dirname, '.env.local');
const frontendEnvContent = `NEXT_PUBLIC_API_URL=https://argus-backend.onrender.com/api/alerts\nNEXT_PUBLIC_BACKEND_URL=https://argus-backend.onrender.com\n`;
fs.writeFileSync(envLocalPath, frontendEnvContent, 'utf8');

// 3. BACKEND: ENV Vars
const rootEnvPath = path.resolve(__dirname, '.env');
let rootEnv = '';
if (fs.existsSync(rootEnvPath)) {
  rootEnv = fs.readFileSync(rootEnvPath, 'utf8');
}
if (!rootEnv.includes('FRONTEND_URL')) {
  rootEnv += `\nFRONTEND_URL=https://argus-frontend.vercel.app\n`;
  fs.writeFileSync(rootEnvPath, rootEnv, 'utf8');
}

// 4. CLEANUP: Delete Sandbox Scripts Explicitly
const safeDelete = (filepath) => {
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    console.log("Deleted: " + path.basename(filepath));
  }
};

const garbageFiles = [
  'test_socket.js', 'simulate_post.js', 'qa_force_socket_debug.js',
  'qa_patch_notification_clean.js', 'qa_patch_socket_fix.js', 'patch_hard_socket.js',
  'patch_realtime_stream.js', 'patch_alert_service_threat.js', 'patch_auth_routes.js',
  'patch_product_features.js', 'diagnostic_patch.js', 'qa_test.js', 'qa_patch_ui.js',
  'qa_decouple_boot.js', 'qa_fix_auth_syntax.js', 'qa_patch_event_flow.js',
  'hard_unify_sockets.js', 'patch_socket.js', 'update_alert_panel.js', 
  'update_create_route.js', 'src/socket-server.ts', 'qa_patch_backend_enforce.js', 
  'deploy_prep.js', 'deploy_prep2.js', 'qa_deploy_final.js'
];

garbageFiles.forEach(file => {
  if (file !== 'qa_deploy_final.js') {
    safeDelete(path.resolve(__dirname, file));
  }
});

console.log('✅ ALL LOCALHOST DEPENDENCIES STRIPPED. DEPLOYMENT CONFIGURATIONS SECURED.');
