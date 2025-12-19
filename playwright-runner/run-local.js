#!/usr/bin/env node

// Local test runner for development
// This runs Playwright tests and reports results back to the API

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// Get arguments
const RUN_ID = process.argv[2];
const API_URL = process.argv[3] || 'http://localhost:3000';

if (!RUN_ID) {
  console.error('Usage: node run-local.js <RUN_ID> [API_URL]');
  process.exit(1);
}

async function runTests() {
  console.log(`🚀 Starting test run ${RUN_ID}`);
  const startTime = Date.now();

  try {
    // Run Playwright tests
    console.log('Running Playwright tests...');
    console.log('Working directory:', __dirname);
    
    const { stdout, stderr } = await execAsync(
      'npx playwright test --reporter=json',
      {
        cwd: __dirname,
        env: {
          ...process.env,
          FORCE_COLOR: '0', // Disable colors for clean output
        },
      }
    );
    
    console.log('STDOUT length:', stdout.length, 'chars');
    console.log('STDERR length:', stderr.length, 'chars');
    
    // Debug: show if we find "suites" in the output
    if (stdout.includes('"suites"')) {
      console.log('✅ Found "suites" in output');
    } else {
      console.log('❌ No "suites" found in output');
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Parse test results
    let results = { passed: 0, failed: 0, tests: [] };
    try {
      // Parse from stdout - Playwright JSON reporter outputs to stdout
      // The entire stdout should be valid JSON
      let reportData = null;
      
      try {
        // Try parsing the entire stdout as JSON
        reportData = JSON.parse(stdout);
        console.log('✅ Successfully parsed JSON report');
      } catch (parseErr) {
        console.log('❌ Failed to parse full stdout as JSON:', parseErr.message);
        // Fallback: try line by line
        const lines = stdout.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('{') && trimmed.includes('"suites"')) {
            try {
              reportData = JSON.parse(trimmed);
              console.log('✅ Parsed JSON from line');
              break;
            } catch (e) {
              // Try next line
            }
          }
        }
      }
      
      if (reportData && reportData.suites) {
        console.log('✅ Found suites array, length:', reportData.suites.length);
        
        // Count passed/failed from suites and collect individual test results
        const countTests = (suites) => {
          suites.forEach(suite => {
            if (suite.specs) {
              suite.specs.forEach(spec => {
                if (spec.tests) {
                  spec.tests.forEach(test => {
                    if (test.results && test.results.length > 0) {
                      const result = test.results[0];
                      const status = result.status;
                      const duration = result.duration || 0;
                      
                      // Add to tests array
                      results.tests.push({
                        name: spec.title,
                        status: status,
                        duration: duration,
                        passed: status === 'passed',
                        failed: status === 'failed' || status === 'timedOut'
                      });
                      
                      if (status === 'passed') {
                        results.passed++;
                      } else if (status === 'failed' || status === 'timedOut') {
                        results.failed++;
                      }
                    }
                  });
                }
              });
            }
            // Recursively check nested suites
            if (suite.suites) {
              countTests(suite.suites);
            }
          });
        };
        
        countTests(reportData.suites);
      }
      
      // If still no results, try stats from report
      if (results.passed === 0 && results.failed === 0 && reportData && reportData.stats) {
        results.passed = reportData.stats.expected || 0;
        results.failed = reportData.stats.unexpected || 0;
      }
      
      console.log(`Parsed results: ${results.passed} passed, ${results.failed} failed`);
      console.log(`Test array length: ${results.tests.length}`);
      if (results.tests.length > 0) {
        console.log(`First test:`, results.tests[0]);
      }
    } catch (parseError) {
      console.error('Error parsing test results:', parseError);
      // Fallback: count from stderr output
      const passedMatches = stderr.match(/(\d+) passed/);
      const failedMatches = stderr.match(/(\d+) failed/);
      results.passed = passedMatches ? parseInt(passedMatches[1]) : 0;
      results.failed = failedMatches ? parseInt(failedMatches[1]) : 0;
    }

    // Collect screenshots and videos (simplified for local dev)
    const testResultsDir = path.join(__dirname, 'test-results');
    const publicDir = path.join(__dirname, '..', 'public', 'test-artifacts', RUN_ID);
    let screenshots = [];
    let videos = [];
    const videoMap = {}; // Map test names to video URLs
    
    try {
      // Create public directory for this run
      await fs.mkdir(publicDir, { recursive: true });
      
      // Read all files from test-results
      const files = await fs.readdir(testResultsDir, { recursive: true });
      
      // Collect screenshots
      const pngFiles = files.filter(file => file.endsWith('.png'));
      for (const pngFile of pngFiles.slice(0, 5)) {
        const sourcePath = path.join(testResultsDir, pngFile);
        const destFileName = `screenshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
        const destPath = path.join(publicDir, destFileName);
        await fs.copyFile(sourcePath, destPath);
        screenshots.push(`/test-artifacts/${RUN_ID}/${destFileName}`);
      }
      
      // Collect videos and map them to test names
      const videoFiles = files.filter(file => file.endsWith('.webm'));
      console.log(`📹 Found ${videoFiles.length} video files`);
      
      for (const videoFile of videoFiles) {
        const sourcePath = path.join(testResultsDir, videoFile);
        const destFileName = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.webm`;
        const destPath = path.join(publicDir, destFileName);
        await fs.copyFile(sourcePath, destPath);
        
        const videoUrl = `/test-artifacts/${RUN_ID}/${destFileName}`;
        videos.push(videoUrl);
        
        // Extract test name from video file path
        // Example: "example-E-commerce-Homepage-Tests-homepage-loads-successfully-chromium/video.webm"
        // We want to match this to the test name "homepage loads successfully"
        const testNameFromPath = videoFile
          .replace(/\//g, ' ')
          .replace('.webm', '')
          .toLowerCase();
        
        // Try to match with any test name in results
        for (const test of results.tests) {
          const testNameWords = test.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
          const pathNormalized = testNameFromPath.replace(/[^a-z0-9]/g, '');
          
          // Count how many words from the test name appear in the video path
          // Also check for partial matches (at least 4 chars) for truncated words
          const matchedWords = testNameWords.filter(word => {
            const wordNormalized = word.replace(/[^a-z0-9]/g, '');
            // Full word match
            if (pathNormalized.includes(wordNormalized)) return true;
            // Partial match for words >= 6 chars (check last 4+ chars in case of truncation)
            if (wordNormalized.length >= 6) {
              const suffix = wordNormalized.slice(-5); // last 5 chars
              if (pathNormalized.includes(suffix)) return true;
            }
            return false;
          }).length;
          
          // If at least 70% of words match, consider it a match
          if (matchedWords >= Math.ceil(testNameWords.length * 0.7)) {
            videoMap[test.name] = videoUrl;
            console.log(`   ✓ Matched "${test.name}" to ${videoFile}`);
            break;
          }
        }
        
        console.log(`✅ Copied video: ${videoFile} -> ${destFileName}`);
      }
      
      // Attach videos to their corresponding tests
      let videosMatched = 0;
      for (const test of results.tests) {
        if (videoMap[test.name]) {
          test.videoUrl = videoMap[test.name];
          videosMatched++;
        }
      }
      
      console.log(`🎬 Matched ${videosMatched} videos to tests`);
      if (videosMatched < results.tests.length) {
        console.log(`⚠️  ${results.tests.length - videosMatched} tests without videos`);
      }
    } catch (err) {
      console.log('Error collecting artifacts:', err.message);
    }

    console.log(`✅ Tests completed: ${results.passed} passed, ${results.failed} failed`);
    console.log(`📸 Screenshots: ${screenshots.length}, 📹 Videos: ${videos.length}`);

    // Send results back to API
    const webhookPayload = {
      runId: RUN_ID,
      status: results.failed > 0 ? 'failed' : 'completed',
      duration_ms: duration,
      tests_passed: results.passed,
      tests_failed: results.failed,
      screenshots: screenshots,
      videos: videos,
      logs: `Tests executed locally\n\n${stdout}\n\n${stderr}`,
      results: results,
    };

    console.log(`📤 Sending results to ${API_URL}/api/webhook...`);

    const response = await fetch(`${API_URL}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Failed to send results to webhook:', text);
      process.exit(1);
    }

    console.log('✅ Results sent successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running tests:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stdout: error.stdout?.substring(0, 500),
      stderr: error.stderr?.substring(0, 500),
    });

    // Send failure notification
    try {
      await fetch(`${API_URL}/api/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: RUN_ID,
          status: 'failed',
          logs: `Error: ${error.message}\n\n${error.stack}`,
          tests_passed: 0,
          tests_failed: 1,
          duration_ms: Date.now() - startTime,
        }),
      });
    } catch (webhookError) {
      console.error('Failed to send error to webhook:', webhookError);
    }

    process.exit(1);
  }
}

// Run tests
runTests();

