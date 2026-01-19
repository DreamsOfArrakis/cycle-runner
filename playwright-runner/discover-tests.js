const fs = require('fs').promises;
const path = require('path');

/**
 * Recursively discovers all Playwright tests from test files
 * Returns array of { testName, testFile, folderPath }
 * @param {string} companyFolder - Optional folder name to filter by (e.g., 'ecommerce-store')
 */
async function discoverTests(companyFolder = null) {
  const testsDir = path.join(__dirname, 'tests');
  const tests = [];

  async function searchDirectory(dir, relativePath = '') {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

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

          const content = await fs.readFile(fullPath, 'utf-8');

          // Extract test names using regex
          // Matches: test('test name', ...) or test("test name", ...)
          const testRegex = /test\s*\(\s*['"](.*?)['"]\s*,/g;
          let match;

          while ((match = testRegex.exec(content)) !== null) {
            tests.push({
              testName: match[1],
              testFile: relativeFilePath, // Include folder path (e.g., 'ecommerce-store/authentication.spec.js')
              folderPath: relativePath || entry.name.replace('.spec.js', '') // Extract folder name
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
  }

  try {
    await searchDirectory(testsDir);
    return tests;
  } catch (error) {
    console.error('Error discovering tests:', error);
    return [];
  }
}

module.exports = { discoverTests };

// Allow running standalone for debugging
if (require.main === module) {
  const companyFolder = process.argv[2] || null; // Allow passing company folder as argument
  discoverTests(companyFolder).then(tests => {
    console.log('Discovered tests:');
    console.log(JSON.stringify(tests, null, 2));
  });
}

