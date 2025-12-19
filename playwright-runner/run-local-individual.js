#!/usr/bin/env node

// Individual test runner with real-time status updates
// This discovers tests, creates records, then runs each test and updates status

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { discoverTests } = require('./discover-tests');

const execAsync = promisify(exec);

/**
 * Convert technical Playwright errors into customer-friendly messages
 */
function humanizeError(technicalError) {
  if (!technicalError) return 'Test failed';
  
  const error = technicalError.toLowerCase();
  
  // Timeout errors
  if (error.includes('timeout') && error.includes('exceeded')) {
    if (error.includes('locator.click')) {
      const elementMatch = error.match(/locator\(['"]([^'"]+)['"]\)/);
      const element = elementMatch ? elementMatch[1] : 'an element';
      return `⏱️ Timeout: Could not find or click "${element}" within 30 seconds. The element may not exist or took too long to load.`;
    }
    if (error.includes('waiting for')) {
      return `⏱️ Timeout: Page took too long to load or respond (exceeded 30 seconds).`;
    }
    return `⏱️ Timeout: Test exceeded the maximum time limit of 30 seconds.`;
  }
  
  // Assertion errors (expect)
  if (error.includes('expect(received)')) {
    // toBeVisible
    if (error.includes('tobevisible')) {
      return `👁️ Element not visible: Expected element to be visible on the page, but it was not found or hidden.`;
    }
    
    // toBeGreaterThan
    if (error.includes('tobegreaterthan')) {
      const expectedMatch = technicalError.match(/Expected:\s*>\s*(\d+)/i);
      const receivedMatch = technicalError.match(/Received:\s*(\d+)/i);
      const expected = expectedMatch ? expectedMatch[1] : 'some';
      const received = receivedMatch ? receivedMatch[1] : '0';
      return `📊 Count mismatch: Expected more than ${expected} items, but found ${received}. Some content may be missing from the page.`;
    }
    
    // toContainText
    if (error.includes('tocontaintext')) {
      const textMatch = technicalError.match(/Expected string:\s*"([^"]+)"/i);
      const text = textMatch ? textMatch[1] : 'expected text';
      return `📝 Text not found: Expected to find "${text}" on the page, but it was not present.`;
    }
    
    // toHaveURL
    if (error.includes('tohaveurl')) {
      return `🔗 Wrong page: The test ended up on a different page than expected.`;
    }
    
    // Generic expect failure
    return `❌ Assertion failed: The page content did not match what was expected.`;
  }
  
  // Element not found
  if (error.includes('element not found') || error.includes('unable to locate')) {
    return `🔍 Element not found: A required element could not be located on the page. The page structure may have changed.`;
  }
  
  // Navigation errors
  if (error.includes('navigation') || error.includes('net::err')) {
    return `🌐 Navigation failed: Could not load the page. The site may be down or the URL is incorrect.`;
  }
  
  // Click errors
  if (error.includes('click') && error.includes('intercept')) {
    return `🖱️ Click blocked: Could not click the element because another element is covering it.`;
  }
  
  // Generic fallback - try to extract first meaningful line
  const lines = technicalError.split('\n').filter(line => line.trim());
  const firstMeaningfulLine = lines.find(line => 
    !line.includes('Call log:') && 
    !line.includes('at ') &&
    line.length > 10
  );
  
  if (firstMeaningfulLine) {
    // Truncate if too long
    return firstMeaningfulLine.length > 200 
      ? firstMeaningfulLine.substring(0, 200) + '...'
      : firstMeaningfulLine;
  }
  
  return technicalError.length > 200 
    ? technicalError.substring(0, 200) + '...'
    : technicalError;
}

// Get arguments
const RUN_ID = process.argv[2];
const API_URL = process.argv[3] || 'http://localhost:3000';
const SELECTED_TESTS_JSON = process.argv[4]; // Optional: JSON array of selected tests

if (!RUN_ID) {
  console.error('Usage: node run-local-individual.js <RUN_ID> [API_URL] [SELECTED_TESTS_JSON]');
  process.exit(1);
}

// Parse selected tests if provided
let selectedTestsFilter = null;
if (SELECTED_TESTS_JSON) {
  try {
    selectedTestsFilter = JSON.parse(SELECTED_TESTS_JSON);
    console.log(`📋 Running ${selectedTestsFilter.length} selected tests`);
  } catch (err) {
    console.error('❌ Failed to parse selected tests JSON:', err.message);
    process.exit(1);
  }
}

async function updateTestStatus(testName, updates) {
  try {
    await fetch(`${API_URL}/api/test-results`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testRunId: RUN_ID,
        testName,
        ...updates,
      }),
    });
    console.log(`   ✓ Updated ${testName}: ${updates.status || 'data updated'}`);
  } catch (error) {
    console.error(`   ✗ Failed to update ${testName}:`, error.message);
  }
}

async function runIndividualTest(testFile, testName) {
  console.log(`\n🧪 Running: ${testName} (${testFile})`);
  
  // Update status to running
  await updateTestStatus(testName, { status: 'running' });
  
  const startTime = Date.now();
  
  try {
    // Run single test by file and grep for test name
    // Escape special regex characters in test name
    const escapedTestName = testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const { stdout, stderr } = await execAsync(
      `npx playwright test ${testFile} --grep "${escapedTestName}" --reporter=json`,
      {
        cwd: __dirname,
        env: {
          ...process.env,
          FORCE_COLOR: '0',
        },
      }
    );
    
    const duration = Date.now() - startTime;
    
    // Parse results
    try {
      const reportData = JSON.parse(stdout);
      
      // Find this specific test in the results
      let testResult = null;
      const findTest = (suites) => {
        for (const suite of suites || []) {
          if (suite.specs) {
            for (const spec of suite.specs) {
              if (spec.title === testName && spec.tests && spec.tests.length > 0) {
                testResult = spec.tests[0].results[0];
                return;
              }
            }
          }
          if (suite.suites) {
            findTest(suite.suites);
          }
        }
      };
      findTest(reportData.suites);
      
      if (testResult) {
        const passed = testResult.status === 'passed';
        let errorMessage = null;
        if (testResult.errors && testResult.errors.length > 0) {
          const technicalError = testResult.errors.map(e => e.message || e.value).join('\n');
          errorMessage = humanizeError(technicalError);
        }
        
        // Extract video URL if available
        let videoUrl = null;
        if (testResult.attachments) {
          const videoAttachment = testResult.attachments.find(a => a.contentType === 'video/webm');
          if (videoAttachment && videoAttachment.path) {
            // Copy video to public dir
            const sourcePath = videoAttachment.path;
            const publicDir = path.join(__dirname, '..', 'public', 'test-artifacts', RUN_ID);
            await fs.mkdir(publicDir, { recursive: true });
            
            const destFileName = `video-${testName.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.webm`;
            const destPath = path.join(publicDir, destFileName);
            
            try {
              await fs.copyFile(sourcePath, destPath);
              videoUrl = `/test-artifacts/${RUN_ID}/${destFileName}`;
              console.log(`   📹 Video saved: ${destFileName}`);
            } catch (err) {
              console.log(`   ⚠️  Could not copy video: ${err.message}`);
            }
          }
        }
        
        // Update test result
        await updateTestStatus(testName, {
          status: passed ? 'passed' : 'failed',
          duration_ms: testResult.duration,
          error_message: errorMessage,
          video_url: videoUrl,
        });
        
        console.log(`   ${passed ? '✅ PASSED' : '❌ FAILED'} (${(testResult.duration / 1000).toFixed(1)}s)`);
        
        return { passed, failed: !passed, duration: testResult.duration };
      }
    } catch (parseErr) {
      console.log(`   ⚠️  Could not parse test result: ${parseErr.message}`);
    }
    
    // Fallback: assume passed if no error
    await updateTestStatus(testName, {
      status: 'passed',
      duration_ms: duration,
    });
    console.log(`   ✅ PASSED (${(duration / 1000).toFixed(1)}s)`);
    return { passed: true, failed: false, duration };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Try to parse error output to get actual test failure details
    let errorMessage = humanizeError(error.message || 'Test execution failed');
    let videoUrl = null;
    
    // Even on failure, try to parse the JSON output
    if (error.stdout) {
      try {
        const reportData = JSON.parse(error.stdout);
        
        // Find this specific test in the results
        const findTest = (suites) => {
          for (const suite of suites || []) {
            if (suite.specs) {
              for (const spec of suite.specs) {
                if (spec.title === testName && spec.tests && spec.tests.length > 0) {
                  const testResult = spec.tests[0].results[0];
                  
                  // Extract error message
                  if (testResult.errors && testResult.errors.length > 0) {
                    const technicalError = testResult.errors.map(e => e.message || e.value).join('\n');
                    errorMessage = humanizeError(technicalError);
                  }
                  
                  // Extract video if available (async, but we'll continue without waiting)
                  if (testResult.attachments) {
                    const videoAttachment = testResult.attachments.find(a => a.contentType === 'video/webm');
                    if (videoAttachment && videoAttachment.path) {
                      const sourcePath = videoAttachment.path;
                      const publicDir = path.join(__dirname, '..', 'public', 'test-artifacts', RUN_ID);
                      const destFileName = `video-${testName.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.webm`;
                      const destPath = path.join(publicDir, destFileName);
                      videoUrl = `/test-artifacts/${RUN_ID}/${destFileName}`;
                      
                      // Copy video asynchronously (don't wait)
                      (async () => {
                        try {
                          await fs.mkdir(publicDir, { recursive: true });
                          await fs.copyFile(sourcePath, destPath);
                          console.log(`   📹 Video saved for failed test: ${destFileName}`);
                        } catch (err) {
                          console.log(`   ⚠️  Could not save video: ${err.message}`);
                        }
                      })();
                    }
                  }
                  
                  return;
                }
              }
            }
            if (suite.suites) {
              findTest(suite.suites);
            }
          }
        };
        findTest(reportData.suites);
      } catch (parseErr) {
        console.log(`   ⚠️  Could not parse error output: ${parseErr.message}`);
      }
    }
    
    // Update test result with failure
    await updateTestStatus(testName, {
      status: 'failed',
      duration_ms: duration,
      error_message: errorMessage,
      video_url: videoUrl,
    });
    
    console.log(`   ❌ FAILED (${(duration / 1000).toFixed(1)}s)`);
    if (errorMessage !== error.message) {
      console.log(`   Error: ${errorMessage.substring(0, 200)}...`);
    }
    
    return { passed: false, failed: true, duration };
  }
}

async function runAllTests() {
  console.log(`\n🚀 Starting individual test run ${RUN_ID}\n`);
  const overallStartTime = Date.now();
  
  try {
    // Step 1: Discover all tests
    console.log('📋 Discovering tests...');
    let tests = await discoverTests();
    console.log(`   Found ${tests.length} total tests\n`);
    
    // Filter tests if selectedTestsFilter is provided
    if (selectedTestsFilter && selectedTestsFilter.length > 0) {
      const testsToRun = tests.filter(test => {
        return selectedTestsFilter.some(selected => 
          selected.testName === test.testName && selected.testFile === test.testFile
        );
      });
      tests = testsToRun;
      console.log(`   Filtered to ${tests.length} selected tests\n`);
    }
    
    if (tests.length === 0) {
      console.log('   ⚠️  No tests to run');
      return;
    }
    
    // Step 2: Create test_results records
    console.log('💾 Creating test result records...');
    const createResponse = await fetch(`${API_URL}/api/test-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testRunId: RUN_ID,
        tests,
      }),
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create test results: ${await createResponse.text()}`);
    }
    console.log('   ✓ Test records created\n');
    
    // Step 3: Run each test individually
    console.log('🏃 Running tests individually...\n');
    const results = {
      total: tests.length,
      passed: 0,
      failed: 0,
    };
    
    for (const test of tests) {
      const result = await runIndividualTest(test.testFile, test.testName);
      if (result.passed) results.passed++;
      if (result.failed) results.failed++;
    }
    
    const overallDuration = Date.now() - overallStartTime;
    
    // Step 4: Update test_run with final status
    console.log(`\n📊 Test Run Complete!`);
    console.log(`   Total: ${results.total}`);
    console.log(`   Passed: ${results.passed} ✅`);
    console.log(`   Failed: ${results.failed} ❌`);
    console.log(`   Duration: ${(overallDuration / 1000).toFixed(1)}s`);
    
    const webhookResponse = await fetch(`${API_URL}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: RUN_ID,
        status: results.failed > 0 ? 'failed' : 'completed',
        duration_ms: overallDuration,
        tests_passed: results.passed,
        tests_failed: results.failed,
        logs: `Individual test execution completed\nTotal: ${results.total}, Passed: ${results.passed}, Failed: ${results.failed}`,
      }),
    });
    
    if (webhookResponse.ok) {
      console.log('\n✅ Results sent successfully');
    } else {
      console.log('\n⚠️  Failed to send final results');
    }
    
  } catch (error) {
    console.error('\n❌ Error running tests:', error.message);
    
    // Try to update test_run status
    try {
      await fetch(`${API_URL}/api/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: RUN_ID,
          status: 'failed',
          logs: `Test execution error: ${error.message}`,
        }),
      });
    } catch (e) {
      console.error('Failed to update run status:', e.message);
    }
    
    process.exit(1);
  }
}

// Run tests
runAllTests();

