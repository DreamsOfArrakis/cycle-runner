import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import AdmZip from "adm-zip";

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
  // Use /tmp on Vercel/serverless, otherwise use .cache in project
  const isVercel = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME;
  const cacheDir = isVercel 
    ? path.join("/tmp", "cycle-runner-repos")
    : path.join(process.cwd(), ".cache", "repos");
  const repoPath = path.join(cacheDir, repoName);
  
  console.log(`[cloneOrGetRepo] Using cache directory: ${cacheDir} (Vercel: ${isVercel})`);

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
      // Download as zip from GitHub API (for environments without git)
      console.log(`📥 Downloading ${githubRepo} (branch: ${branch}) as zip...`);
      const zipUrl = `https://github.com/${githubRepo}/archive/refs/heads/${branch}.zip`;
      const zipPath = path.join(cacheDir, `${repoName}.zip`);

      // Download the zip file
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
      console.log(`📦 Extracting zip to: ${cacheDir}`);
      zip.extractAllTo(cacheDir, true);

      // GitHub zip archives extract with folder name like "repo-name-branch"
      // Find the extracted folder
      const extractedFolder = path.join(cacheDir, `${repoName}-${branch}`);
      console.log(`📁 Looking for extracted folder: ${extractedFolder}`);
      
      // Check if extracted folder exists
      try {
        const stat = await fs.stat(extractedFolder);
        if (!stat.isDirectory()) {
          throw new Error(`Extracted path is not a directory: ${extractedFolder}`);
        }
        console.log(`✅ Found extracted folder: ${extractedFolder}`);
      } catch (error) {
        // List what was actually extracted
        const extractedItems = await fs.readdir(cacheDir);
        console.error(`❌ Extracted folder not found. Items in cacheDir:`, extractedItems);
        throw new Error(`Failed to find extracted folder. Expected: ${extractedFolder}, Found: ${extractedItems.join(', ')}`);
      }

      // Move extracted folder to expected location
      if (extractedFolder !== repoPath) {
        // Remove old if exists
        try {
          await fs.rm(repoPath, { recursive: true, force: true });
        } catch {}
        console.log(`📦 Moving ${extractedFolder} to ${repoPath}`);
        await fs.rename(extractedFolder, repoPath);
      }

      // Clean up zip
      await fs.unlink(zipPath);
      console.log(`✅ Successfully downloaded and extracted ${githubRepo} to ${repoPath}`);
    }

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
  console.log(`[findTestDirectory] Looking for test directory in: ${repoPath}`);
  
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
        console.log(`[findTestDirectory] Found test directory: ${testPath}`);
        // List files in the test directory
        const files = await fs.readdir(testPath);
        console.log(`[findTestDirectory] Test directory contains ${files.length} items: ${files.slice(0, 10).join(', ')}${files.length > 10 ? '...' : ''}`);
        return testPath;
      }
    } catch (error) {
      // Directory doesn't exist, try next
      continue;
    }
  }

  // If no test directory found, return repo root
  console.log(`[findTestDirectory] No test directory found, using repo root: ${repoPath}`);
  return repoPath;
}

