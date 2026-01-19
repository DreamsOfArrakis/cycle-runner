import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execAsync = promisify(exec);

/**
 * Clones a GitHub repository or returns cached path if already cloned
 * @param githubRepo - Repository in format "username/repo-name"
 * @param branch - Optional branch name (defaults to "main")
 * @returns Path to the cloned repository
 */
export async function cloneOrGetRepo(
  githubRepo: string,
  branch: string = "main"
): Promise<string> {
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

    // Check if git is available
    try {
      await execAsync("git --version");
    } catch (error) {
      throw new Error("Git is not available in this environment. Cannot clone repositories.");
    }

    // Clone the repository
    console.log(`📥 Cloning ${githubRepo} (branch: ${branch})...`);
    const repoUrl = `https://github.com/${githubRepo}.git`;
    await execAsync(`git clone -b ${branch} --depth 1 ${repoUrl} ${repoName}`, {
      cwd: cacheDir,
      timeout: 60000, // 60 second timeout
    });

    console.log(`✅ Successfully cloned ${githubRepo}`);
    return repoPath;
  } catch (error: any) {
    console.error(`❌ Error cloning ${githubRepo}:`, error.message);
    throw new Error(`Failed to clone repository ${githubRepo}: ${error.message}`);
  }
}

/**
 * Gets the test directory path from a cloned repository
 * Looks for common test directory patterns
 */
export async function findTestDirectory(repoPath: string): Promise<string> {
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

