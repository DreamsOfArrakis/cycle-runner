const { exec } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const fs = require("fs").promises;
const AdmZip = require("adm-zip");

const execAsync = promisify(exec);

/**
 * Clones a GitHub repository or returns cached path if already cloned
 * @param {string} githubRepo - Repository in format "username/repo-name"
 * @param {string} branch - Optional branch name (defaults to "main")
 * @returns {Promise<string>} Path to the cloned repository
 */
async function cloneOrGetRepo(githubRepo, branch = "main") {
  const repoName = githubRepo.split("/").pop() || githubRepo;
  const cacheDir = path.join(process.cwd(), ".cache", "repos");
  const repoPath = path.join(cacheDir, repoName);

  // Ensure cache directory exists
  await fs.mkdir(cacheDir, { recursive: true });

  try {
    // Check if repo already exists
    const repoExists = await fs
      .access(repoPath)
      .then(() => true)
      .catch(() => false);

    if (repoExists) {
      // Check if it's a valid git repo
      try {
        await execAsync("git rev-parse --git-dir", { cwd: repoPath });
        // Repo exists and is valid, pull latest changes
        console.log(`📦 Pulling latest changes for ${githubRepo}...`);
        await execAsync(`git fetch origin && git checkout ${branch} && git pull origin ${branch}`, {
          cwd: repoPath,
        });
        return repoPath;
      } catch (error) {
        // Not a valid git repo, remove and re-clone
        console.log(`🗑️ Removing invalid repo cache for ${githubRepo}...`);
        await fs.rm(repoPath, { recursive: true, force: true });
      }
    }

    // Try git first, fallback to GitHub API zip download
    let useGit = false;
    try {
      await execAsync("git --version");
      useGit = true;
    } catch (error) {
      console.log(`⚠️ Git not available, using GitHub API zip download`);
    }

    if (useGit) {
      // Clone the repository using git
      console.log(`📥 Cloning ${githubRepo} (branch: ${branch}) using git...`);
      const repoUrl = `https://github.com/${githubRepo}.git`;
      await execAsync(`git clone -b ${branch} --depth 1 ${repoUrl} ${repoName}`, {
        cwd: cacheDir,
        timeout: 60000, // 60 second timeout
      });
      console.log(`✅ Successfully cloned ${githubRepo}`);
    } else {
      // Download as zip from GitHub API (for environments without git, like Vercel)
      console.log(`📥 Downloading ${githubRepo} (branch: ${branch}) as zip...`);
      const zipUrl = `https://github.com/${githubRepo}/archive/refs/heads/${branch}.zip`;
      const zipPath = path.join(cacheDir, `${repoName}.zip`);

      // Download the zip file (Node 18+ has fetch built-in)
      const response = await fetch(zipUrl);
      if (!response.ok) {
        throw new Error(`Failed to download repository: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save zip file
      await fs.writeFile(zipPath, buffer);

      // Extract zip using adm-zip
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(cacheDir, true);

      // Move extracted folder to expected location
      const extractedFolder = path.join(cacheDir, `${repoName}-${branch}`);
      if (extractedFolder !== repoPath) {
        // Remove old if exists
        try {
          await fs.rm(repoPath, { recursive: true, force: true });
        } catch {}
        await fs.rename(extractedFolder, repoPath);
      }

      // Clean up zip
      await fs.unlink(zipPath);
      console.log(`✅ Successfully downloaded and extracted ${githubRepo}`);
    }

    return repoPath;
  } catch (error) {
    console.error(`❌ Error cloning ${githubRepo}:`, error.message);
    throw new Error(`Failed to clone repository ${githubRepo}: ${error.message}`);
  }
}

/**
 * Gets the test directory path from a cloned repository
 * Looks for common test directory patterns
 * @param {string} repoPath - Path to the cloned repository
 * @returns {Promise<string>} Path to the test directory
 */
async function findTestDirectory(repoPath) {
  const commonTestDirs = [
    "tests/e2e",
    "tests",
    "test/e2e",
    "test",
    "e2e",
    "playwright/tests",
  ];

  for (const testDir of commonTestDirs) {
    const testPath = path.join(repoPath, testDir);
    try {
      const stat = await fs.stat(testPath);
      if (stat.isDirectory()) {
        return testPath;
      }
    } catch {
      // Directory doesn't exist, try next
      continue;
    }
  }

  // If no test directory found, return repo root
  return repoPath;
}

module.exports = { cloneOrGetRepo, findTestDirectory };

