/**
 * CrimePredict One-Shot Starter
 * Works on Mac / Linux / Windows
 */

const { exec, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

function run(cmd, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd }, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout);
    });
  });
}

function runDetached(cmd, cwd = process.cwd()) {
  const parts = cmd.split(" ");
  const p = spawn(parts[0], parts.slice(1), {
    cwd,
    shell: true,
    stdio: "inherit",
  });
  return p;
}

async function killPort(port) {
  console.log(`🧹 Cleaning port ${port}...`);

  if (os.platform() === "win32") {
    try {
      await run(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /PID %a /F`);
    } catch {}
  } else {
    try {
      await run(`lsof -ti:${port} | xargs kill -9`);
    } catch {}
  }
}

async function findBackend() {
  console.log("📍 Searching backend (manage.py)...");

  const result = await run(
    `find . -maxdepth 4 -name manage.py`,
    process.cwd()
  );

  const first = result.split("\n")[0].trim();
  if (!first) throw new Error("manage.py not found");

  return path.dirname(first);
}

async function ensureVenv(backendDir) {
  const venvPath = path.join(backendDir, "venv");

  if (!fs.existsSync(venvPath)) {
    console.log("📦 Creating virtual environment...");
    await run(`python3 -m venv venv`, backendDir);
  }

  const activate = os.platform() === "win32"
    ? path.join(venvPath, "Scripts", "activate")
    : path.join(venvPath, "bin", "activate");

  return { venvPath, activate };
}

async function installDeps(backendDir) {
  console.log("📦 Installing backend dependencies (safe mode)...");

  await run(`pip install --upgrade pip`);

  const deps = [
    "django",
    "djangorestframework",
    "channels",
    "daphne",
    "channels-redis",
    "redis",
    "feedparser"
  ];

  await run(`pip install ${deps.join(" ")}`, backendDir);
}

async function startRedis() {
  console.log("📦 Checking Redis...");

  try {
    await run(`docker ps`);
    const out = await run(`docker ps`);
    if (out.includes("crimepredict-redis")) {
      console.log("✔ Redis already running");
      return;
    }

    console.log("⚠ Starting Redis container...");
    await run(`docker start crimepredict-redis`);
  } catch {
    console.log("⚠ Docker not available or Redis not running (skip)");
  }
}

async function main() {
  console.log("🚀 Starting CrimePredict Full Stack...\n");

  await killPort(8000);

  const backendDir = await findBackend();
  console.log("📍 Backend:", backendDir);

  await ensureVenv(backendDir);
  await installDeps(backendDir);

  // Start backend
  console.log("🐍 Starting Django (Daphne)...");

  const backend = runDetached(
    "python3 -m daphne backend.asgi:application",
    backendDir

  );

  // Redis
  await startRedis();

  // Frontend
  console.log("⚛️ Starting frontend...");

  const frontend = runDetached("npm run dev", process.cwd());

  console.log("\n✅ SYSTEM RUNNING:");
  console.log("   Backend : http://127.0.0.1:8000");
  console.log("   Frontend: http://localhost:5173");
  console.log("   Redis   : localhost:6379\n");

  backend.on("close", (c) => console.log("Backend exited", c));
  frontend.on("close", (c) => console.log("Frontend exited", c));
}

main().catch((err) => {
  console.error("❌ FAILED:", err);
});