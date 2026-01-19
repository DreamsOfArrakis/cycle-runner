const fs = require('fs').promises;
const path = require('path');

/**
 * Recursively discovers all Playwright tests from test files
 * Returns array of { testName, testFile, folderPath }
 * @param {string} companyFolder - Optional folder name to filter by (e.g., 'ecommerce-store')
 * @param {string} externalPath - Optional path to external repository (when github_repo is configured)
 */
async function discoverTests(companyFolder = null, externalPath = null) {
  // Use external path if provided, otherwise use local tests directory
  const testsDir = externalPath || path.join(__dirname, 'tests');
  const tests = [];
  
  console.log(`[discover-tests] Starting discovery in: ${testsDir}`);
  
  // Check if directory exists
  try {
    const stat = await fs.stat(testsDir);
    if (!stat.isDirectory()) {
      console.error(`[discover-tests] Path is not a directory: ${testsDir}`);
      return [];
    }
  } catch (error) {
    console.error(`[discover-tests] Directory does not exist: ${testsDir}`, error);
    return [];
  }

  async function searchDirectory(dir, relativePath = '') {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      console.log(`[discover-tests] Searching directory: ${dir} (relative: ${relativePath}), found ${entries.length} entries`);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativeFilePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          // If filtering by company folder, only search that folder
          if (companyFolder && entry.name !== companyFolder) {
            continue;
          }
          // Recursively search subdirectories
          await searchDirectory(fullPath, relativeFilePath);
        } else if (entry.isFile() && entry.name.endsWith('.spec.js')) {
          // If filtering by company folder, only process files in that folder
          if (companyFolder && !relativePath.startsWith(companyFolder)) {
            continue;
          }

          console.log(`[discover-tests] Found test file: ${fullPath}`);
          const content = await fs.readFile(fullPath, 'utf-8');

          // Extract test names using regex
          // Matches: test('test name', ...) or test("test name", ...)
          const testRegex = /test\s*\(\s*['"](.*?)['"]\s*,/g;
          let match;
          let testCount = 0;

          while ((match = testRegex.exec(content)) !== null) {
            testCount++;
            tests.push({
              testName: match[1],
              testFile: relativeFilePath, // Include folder path (e.g., 'ecommerce-store/authentication.spec.js')
              folderPath: relativePath || entry.name.replace('.spec.js', '') // Extract folder name
            });
          }
          console.log(`[discover-tests] Found ${testCount} tests in ${entry.name}`);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
  }

  try {
    await searchDirectory(testsDir);
    console.log(`[discover-tests] Total tests discovered: ${tests.length}`);
    return tests;
  } catch (error) {
    console.error('[discover-tests] Error discovering tests:', error);
    return [];
  }
}

module.exports = { discoverTests };

// Allow running standalone for debugging
if (require.main === module) {
  let companyFolder = null;
  let externalPath = null;
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--external' && args[i + 1]) {
      externalPath = args[i + 1];
      i++; // Skip next arg as it's the path value
    } else if (!args[i].startsWith('--')) {
      // If not a flag, treat as company folder (backward compatibility)
      companyFolder = args[i];
    }
  }
  
  discoverTests(companyFolder, externalPath).then(tests => {
    console.log('Discovered tests:');
    console.log(JSON.stringify(tests, null, 2));
  });
}

