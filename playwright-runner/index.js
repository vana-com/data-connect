/**
 * Playwright Runner for DataBridge
 *
 * Runs as a sidecar process, receives commands via stdin, sends results via stdout.
 *
 * Commands:
 * - { type: "run", runId, connectorPath, url }
 * - { type: "stop", runId }
 * - { type: "quit" }
 */

const { chromium } = require('playwright');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { execSync } = require('child_process');

// System Chrome paths by platform
const CHROME_PATHS = {
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  linux: '/usr/bin/google-chrome'
};

// Get browser cache directory
function getBrowserCacheDir() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.databridge', 'browsers');
}

// Check if system Chrome exists
function getSystemChromePath() {
  const chromePath = CHROME_PATHS[process.platform];
  if (chromePath && fs.existsSync(chromePath)) {
    return chromePath;
  }
  // Try alternative Windows paths
  if (process.platform === 'win32') {
    const altPaths = [
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
    ];
    for (const p of altPaths) {
      if (fs.existsSync(p)) return p;
    }
  }
  // Try Edge on Windows
  if (process.platform === 'win32') {
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    if (fs.existsSync(edgePath)) return edgePath;
  }
  return null;
}

// Check if Playwright Chromium is already downloaded
function getDownloadedChromiumPath() {
  const cacheDir = getBrowserCacheDir();
  if (!fs.existsSync(cacheDir)) return null;

  // Look for chromium directory
  const entries = fs.readdirSync(cacheDir);
  const chromiumDir = entries.find(e => e.startsWith('chromium-') && !e.includes('headless'));
  if (!chromiumDir) return null;

  const chromiumPath = path.join(cacheDir, chromiumDir);

  // Platform-specific executable paths (Playwright's "Chrome for Testing" structure)
  if (process.platform === 'darwin') {
    // Try arm64 first, then x64
    const paths = [
      path.join(chromiumPath, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
      path.join(chromiumPath, 'chrome-mac', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
      // Legacy paths
      path.join(chromiumPath, 'chrome-mac-arm64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      path.join(chromiumPath, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) return p;
    }
  } else if (process.platform === 'win32') {
    const paths = [
      path.join(chromiumPath, 'chrome-win', 'chrome.exe'),
      path.join(chromiumPath, 'chrome-win64', 'chrome.exe'),
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) return p;
    }
  } else {
    const paths = [
      path.join(chromiumPath, 'chrome-linux', 'chrome'),
      path.join(chromiumPath, 'chrome-linux64', 'chrome'),
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) return p;
    }
  }

  return null;
}

// Download Chromium using Playwright
async function downloadChromium(sendStatus) {
  const cacheDir = getBrowserCacheDir();

  // Create cache directory
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  log('Downloading Chromium browser (one-time setup)...');
  if (sendStatus) {
    sendStatus('DOWNLOADING_BROWSER');
  }

  // Set environment for Playwright to use our cache dir
  process.env.PLAYWRIGHT_BROWSERS_PATH = cacheDir;

  try {
    // Use Playwright's CLI to download Chromium
    execSync('npx playwright install chromium', {
      stdio: 'inherit',
      env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: cacheDir }
    });
    log('Chromium download complete');
    return getDownloadedChromiumPath();
  } catch (error) {
    log('Failed to download Chromium:', error.message);
    throw new Error('Failed to download browser. Please install Google Chrome or try again.');
  }
}

// Active browser contexts by runId
const activeRuns = new Map();

// Send message to parent process
function send(msg) {
  console.log(JSON.stringify(msg));
}

// Log to stderr (doesn't interfere with JSON protocol)
function log(...args) {
  console.error('[PlaywrightRunner]', ...args);
}

// Create the page API that connectors use
function createPageApi(page, runId) {
  const networkCaptures = new Map();
  const capturedResponses = new Map();

  // Set up network interception
  page.on('response', async (response) => {
    const url = response.url();

    for (const [key, config] of networkCaptures.entries()) {
      if (config.urlPattern && !url.includes(config.urlPattern)) continue;

      try {
        const request = response.request();
        const postData = request.postData() || '';

        if (config.bodyPattern) {
          const patterns = config.bodyPattern.split('|');
          if (!patterns.some(p => postData.includes(p))) continue;
        }

        const body = await response.json().catch(() => null);
        if (body) {
          capturedResponses.set(key, { url, data: body, timestamp: Date.now() });
          send({ type: 'network-captured', runId, key, url });
        }
      } catch (e) {
        // Ignore errors for non-JSON responses
      }
    }
  });

  return {
    goto: async (url) => {
      log(`pageApi.goto called with: ${url}`);
      send({ type: 'log', runId, message: `Navigating to: ${url}` });
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        log('pageApi.goto completed successfully');
      } catch (err) {
        log(`pageApi.goto error: ${err.message}`);
        throw err;
      }
    },

    evaluate: async (script) => {
      if (typeof script === 'string') {
        return await page.evaluate(script);
      }
      return await page.evaluate(script);
    },

    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    setData: async (key, value) => {
      if (key === 'status') {
        send({ type: 'log', runId, message: value });
      }
      send({ type: 'data', runId, key, value });
    },

    promptUser: async (message, checkFn, interval = 2000) => {
      send({ type: 'log', runId, message });
      send({ type: 'status', runId, status: 'WAITING_FOR_USER' });

      // Poll until condition is met
      while (true) {
        await new Promise(resolve => setTimeout(resolve, interval));
        try {
          // checkFn references page.evaluate internally in the connector
          // We need to evaluate it in the page context
          const result = await checkFn();
          if (result) {
            send({ type: 'log', runId, message: 'User action completed' });
            return;
          }
        } catch (e) {
          // Keep waiting
        }
      }
    },

    captureNetwork: async (config) => {
      networkCaptures.set(config.key, {
        urlPattern: config.urlPattern || '',
        bodyPattern: config.bodyPattern || ''
      });
      log(`Registered network capture: ${config.key}`);
    },

    getCapturedResponse: async (key) => {
      const captured = capturedResponses.get(key);
      return captured ? captured : null;
    },

    clearNetworkCaptures: async () => {
      networkCaptures.clear();
      capturedResponses.clear();
    },

    hasCapturedResponse: (key) => {
      return capturedResponses.has(key);
    }
  };
}

// Run a connector
async function runConnector(runId, connectorPath, url) {
  log(`Starting run ${runId} with connector ${connectorPath}`);

  try {
    // Read connector script
    const connectorCode = fs.readFileSync(connectorPath, 'utf-8');

    // Launch browser - prefer system Chrome for smaller app size
    const launchOptions = {
      headless: false, // User needs to see and interact
      args: ['--disable-blink-features=AutomationControlled']
    };

    // Try to find a browser in this order:
    // 1. System Chrome/Edge
    // 2. Previously downloaded Chromium
    // 3. Download Chromium on-demand
    let browserPath = getSystemChromePath();

    if (browserPath) {
      log(`Using system browser: ${browserPath}`);
      launchOptions.executablePath = browserPath;
    } else {
      // Check for previously downloaded Chromium
      browserPath = getDownloadedChromiumPath();

      if (browserPath) {
        log(`Using downloaded Chromium: ${browserPath}`);
        launchOptions.executablePath = browserPath;
      } else {
        // Download Chromium on-demand
        send({ type: 'log', runId, message: 'No browser found. Downloading Chromium (one-time, ~170MB)...' });
        browserPath = await downloadChromium((status) => {
          send({ type: 'status', runId, status });
        });

        if (browserPath) {
          log(`Using newly downloaded Chromium: ${browserPath}`);
          launchOptions.executablePath = browserPath;
        } else {
          throw new Error('No browser available. Please install Google Chrome.');
        }
      }
    }

    const browser = await chromium.launch(launchOptions);

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // Store for cleanup
    activeRuns.set(runId, { browser, context, page });

    // Create page API
    const pageApi = createPageApi(page, runId);

    // Navigate to starting URL
    log(`Navigating to initial URL: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    log('Initial navigation complete');
    send({ type: 'status', runId, status: 'RUNNING' });

    // Build the connector execution wrapper
    // The connector has an IIFE at the end - we need to return its Promise
    // Find the LAST IIFE and add 'return' before it (there may be inner IIFEs in helpers)
    let modifiedCode = connectorCode;

    // Find all occurrences and replace the last one
    const iifePattern = /\n\(async\s*\(\)\s*=>\s*\{/g;
    const matches = [...modifiedCode.matchAll(iifePattern)];

    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const insertPos = lastMatch.index;
      modifiedCode = modifiedCode.substring(0, insertPos) +
        '\nreturn (async () => {' +
        modifiedCode.substring(insertPos + lastMatch[0].length);
      log(`Added return before IIFE (match ${matches.length} of ${matches.length})`);
    } else {
      log('WARNING: Could not find IIFE pattern in connector code');
    }

    // Execute connector with page API in scope using AsyncFunction
    log('Starting connector execution...');
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const runConnectorFn = new AsyncFunction('page', modifiedCode);

    log('Calling connector function...');
    const result = await runConnectorFn.call(null, pageApi);
    log('Connector function completed with result:', result ? 'has result' : 'undefined');

    send({ type: 'result', runId, data: result });
    send({ type: 'status', runId, status: 'COMPLETE' });

    // Keep browser open for a bit so user can see result
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cleanup
    await browser.close();
    activeRuns.delete(runId);

    // Exit process after successful completion
    // This ensures Rust receives the end-of-stream and can emit STOPPED if needed
    log('Connector completed successfully, exiting');
    process.exit(0);

  } catch (error) {
    log(`Error in run ${runId}:`, error.message);
    send({ type: 'error', runId, message: error.message });
    send({ type: 'status', runId, status: 'ERROR' });

    // Cleanup on error
    const run = activeRuns.get(runId);
    if (run) {
      await run.browser.close().catch(() => {});
      activeRuns.delete(runId);
    }

    // Exit process after error
    log('Connector failed, exiting');
    process.exit(1);
  }
}

// Stop a run
async function stopRun(runId) {
  const run = activeRuns.get(runId);
  if (run) {
    log(`Stopping run ${runId}`);
    await run.browser.close().catch(() => {});
    activeRuns.delete(runId);
    send({ type: 'status', runId, status: 'STOPPED' });
  }
}

// Main loop - read commands from stdin
async function main() {
  log('Playwright runner started');
  send({ type: 'ready' });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  for await (const line of rl) {
    try {
      const cmd = JSON.parse(line);

      switch (cmd.type) {
        case 'run':
          runConnector(cmd.runId, cmd.connectorPath, cmd.url);
          break;

        case 'stop':
          await stopRun(cmd.runId);
          break;

        case 'quit':
          log('Quitting...');
          // Close all active runs
          for (const [runId, run] of activeRuns) {
            await run.browser.close().catch(() => {});
          }
          process.exit(0);
          break;

        default:
          log(`Unknown command: ${cmd.type}`);
      }
    } catch (error) {
      log(`Error parsing command: ${error.message}`);
    }
  }
}

main().catch(err => {
  log('Fatal error:', err);
  process.exit(1);
});
