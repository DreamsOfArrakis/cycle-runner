const fs = require('fs').promises;
const path = require('path');

/**
 * Discovers all Playwright tests from test files
 * Returns array of { testName, testFile }
 */
async function discoverTests() {
  const testsDir = path.join(__dirname, 'tests');
  const tests = [];

  try {
    const files = await fs.readdir(testsDir);
    const testFiles = files.filter(f => f.endsWith('.spec.js'));

    for (const file of testFiles) {
      const filePath = path.join(testsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');

      // Extract test names using regex
      // Matches: test('test name', ...) or test("test name", ...)
      const testRegex = /test\s*\(\s*['"](.*?)['"]\s*,/g;
      let match;

      while ((match = testRegex.exec(content)) !== null) {
        tests.push({
          testName: match[1],
          testFile: file
        });
      }
    }

    return tests;
  } catch (error) {
    console.error('Error discovering tests:', error);
    return [];
  }
}

module.exports = { discoverTests };

// Allow running standalone for debugging
if (require.main === module) {
  discoverTests().then(tests => {
    console.log('Discovered tests:');
    console.log(JSON.stringify(tests, null, 2));
  });
}

