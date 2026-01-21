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

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as readline from 'readline';

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

    // Launch browser
    const browser = await chromium.launch({
      headless: false, // User needs to see and interact
      args: ['--disable-blink-features=AutomationControlled']
    });

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
