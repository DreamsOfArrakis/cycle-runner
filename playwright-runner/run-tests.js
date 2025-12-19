const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// Get environment variables
const RUN_ID = process.env.RUN_ID;
const API_WEBHOOK_URL = process.env.API_WEBHOOK_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function runTests() {
  console.log(`Starting test run ${RUN_ID}`);
  const startTime = Date.now();

  try {
    // Run Playwright tests with video recording
    const { stdout, stderr } = await execAsync(
      'npx playwright test --reporter=json',
      {
        env: {
          ...process.env,
          PLAYWRIGHT_VIDEO: 'on',
        },
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Parse test results
    let results = { passed: 0, failed: 0 };
    try {
      const reportPath = path.join(__dirname, 'test-results.json');
      const reportExists = await fs.access(reportPath).then(() => true).catch(() => false);
      
      if (reportExists) {
        const report = JSON.parse(await fs.readFile(reportPath, 'utf-8'));
        results.passed = report.stats?.expected || 0;
        results.failed = report.stats?.unexpected || 0;
      }
    } catch (parseError) {
      console.error('Error parsing test results:', parseError);
    }

    // Collect screenshots
    const screenshotsDir = path.join(__dirname, 'test-results');
    let screenshots = [];
    
    try {
      const files = await fs.readdir(screenshotsDir, { recursive: true });
      screenshots = files
        .filter(file => file.endsWith('.png'))
        .map(file => path.join(screenshotsDir, file));
    } catch (err) {
      console.log('No screenshots found');
    }

    // TODO: Upload screenshots to Supabase Storage
    // For Phase 1, we'll just include the paths
    const screenshotUrls = screenshots.map(s => s);

    // Send results back to API
    const webhookPayload = {
      runId: RUN_ID,
      status: results.failed > 0 ? 'failed' : 'completed',
      duration_ms: duration,
      tests_passed: results.passed,
      tests_failed: results.failed,
      screenshots: screenshotUrls,
      logs: stdout + '\n' + stderr,
      results: results,
    };

    // Post results to webhook
    if (API_WEBHOOK_URL) {
      const response = await fetch(API_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        console.error('Failed to send results to webhook');
      } else {
        console.log('Results sent successfully');
      }
    }

    console.log('Test run completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error running tests:', error);

    // Send failure notification
    if (API_WEBHOOK_URL) {
      await fetch(API_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: RUN_ID,
          status: 'failed',
          logs: error.message,
          tests_passed: 0,
          tests_failed: 1,
        }),
      });
    }

    process.exit(1);
  }
}

// Run tests
runTests();

