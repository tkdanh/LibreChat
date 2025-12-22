const path = require("path");
const fs = require("fs");

console.log("=== Checking .env files ===\n");

const rootEnvPath = path.join(__dirname, "..", ".env");
const localEnvPath = path.join(__dirname, ".env");

console.log(`1. Root .env: ${rootEnvPath}`);
if (fs.existsSync(rootEnvPath)) {
  const content = fs.readFileSync(rootEnvPath, "utf8");
  const hasZaloToken = content.includes("ZALOBOT_TOKEN");
  const hasApiToken = content.includes("API_TOKEN");
  console.log(`   ✓ Exists`);
  console.log(`   - Has ZALOBOT_TOKEN: ${hasZaloToken ? "YES" : "NO"}`);
  console.log(`   - Has API_TOKEN: ${hasApiToken ? "YES" : "NO"}`);
  if (!hasZaloToken || !hasApiToken) {
    console.log(`   ⚠ Missing required variables!`);
  }
} else {
  console.log(`   ✗ Does NOT exist`);
}

console.log(`\n2. Local api-zalo/.env: ${localEnvPath}`);
if (fs.existsSync(localEnvPath)) {
  const content = fs.readFileSync(localEnvPath, "utf8");
  const hasZaloToken = content.includes("ZALOBOT_TOKEN");
  const hasApiToken = content.includes("API_TOKEN");
  console.log(`   ✓ Exists`);
  console.log(`   - Has ZALOBOT_TOKEN: ${hasZaloToken ? "YES" : "NO"}`);
  console.log(`   - Has API_TOKEN: ${hasApiToken ? "YES" : "NO"}`);
  if (content.trim().length === 0) {
    console.log(`   ⚠ File is EMPTY!`);
  }
} else {
  console.log(`   ✗ Does NOT exist`);
}

console.log(`\n=== Recommendation ===`);
if (!fs.existsSync(rootEnvPath)) {
  console.log("Create .env file in root directory with:");
  console.log("  ZALOBOT_TOKEN=your_token_here");
  console.log("  API_TOKEN=your_token_here");
} else {
  const rootContent = fs.existsSync(rootEnvPath) ? fs.readFileSync(rootEnvPath, "utf8") : "";
  if (!rootContent.includes("ZALOBOT_TOKEN") || !rootContent.includes("API_TOKEN")) {
    console.log("Add these variables to root .env file:");
    console.log("  ZALOBOT_TOKEN=your_token_here");
    console.log("  API_TOKEN=your_token_here");
  } else {
    console.log("✓ Root .env file looks good!");
    if (fs.existsSync(localEnvPath)) {
      const localContent = fs.readFileSync(localEnvPath, "utf8");
      if (localContent.trim().length === 0) {
        console.log("⚠ api-zalo/.env exists but is empty. You can delete it or add variables there.");
      }
    }
  }
}

