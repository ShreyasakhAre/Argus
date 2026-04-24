const http = require('http');

// Test all API endpoints
const endpoints = [
  '/api/health',
  '/api/test/services', 
  '/api/agent/stats',
  '/api/agent/processing/stats',
  '/api/alerts/live/stats',
  '/api/risk/departments',
  '/api/insights/summary',
  '/api/threat/summary',
  '/api/attacks/network',
  '/api/attacks/map'
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5000' + endpoint, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const status = res.statusCode === 200 ? '✅' : '❌';
        console.log(`${status} ${endpoint} - ${res.statusCode}`);
        resolve({ endpoint, status: res.statusCode, success: res.statusCode === 200 });
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ ${endpoint} - ERROR: ${error.message}`);
      resolve({ endpoint, error: error.message, success: false });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`❌ ${endpoint} - TIMEOUT`);
      resolve({ endpoint, error: 'TIMEOUT', success: false });
    });
  });
}

async function runTests() {
  console.log('🧪 Testing ARGUS API Endpoints...');
  console.log('================================');
  
  const results = await Promise.all(endpoints.map(testEndpoint));
  
  const working = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log('================================');
  console.log(`📊 Results: ${working}/${total} endpoints working`);
  
  if (working === total) {
    console.log('🎉 ALL ENDPOINTS WORKING!');
  } else {
    console.log('⚠️ Some endpoints not responding');
  }
}

runTests().catch(console.error);
