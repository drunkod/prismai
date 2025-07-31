// e2e/generate-credentials.js
import { execSync } from 'child_process';

console.log("🔐 Generating Jazz credentials for test infrastructure...\n");

// Generate server credentials
console.log("1. Generating Test Server credentials...");
execSync('npx jazz-run account create --name "Test Data Server" --peer "ws://node205197-env-9764176354321.mircloud.host:11129"', { stdio: 'inherit' });

console.log("\n2. Generating Test Reporter credentials...");
execSync('npx jazz-run account create --name "Test Reporter Client" --peer "ws://node205197-env-9764176354321.mircloud.host:11129"', { stdio: 'inherit' });

console.log("\n✅ Credentials generated!");
console.log("\n📝 Add these to your .env file:");
console.log("JAZZ_TEST_SERVER_ACCOUNT=<server-account-id>");
console.log("JAZZ_TEST_SERVER_SECRET=<server-secret>");
console.log("JAZZ_REPORTER_ACCOUNT=<reporter-account-id>");
console.log("JAZZ_REPORTER_SECRET=<reporter-secret>");
console.log("JAZZ_SYNC_URL=ws://your-sync-server:port");