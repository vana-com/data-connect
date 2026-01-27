/**
 * ChatGPT Connector (Playwright)
 *
 * Uses Playwright for real browser control to extract email and memories.
 * Requires the playwright-runner sidecar.
 */

// State management
const state = {
  email: null,
  memories: [],
  accessToken: null,
  deviceId: null,
  isComplete: false
};

// Helper: Dismiss interrupting popups
const dismissInterruptingDialogs = async () => {
  try {
    await page.evaluate(`
      (() => {
        const buttonElements = document.querySelectorAll('button, a');
        const maybeLaterButton = Array.from(buttonElements).find(el =>
          el.textContent?.toLowerCase().includes('maybe later')
        );
        const rejectNonEssentialButton = Array.from(buttonElements).find(el =>
          el.textContent?.toLowerCase().includes('reject non-essential')
        );

        if (maybeLaterButton && typeof maybeLaterButton.click === 'function') {
          maybeLaterButton.click();
          return 'clicked maybe later';
        }
        if (rejectNonEssentialButton && typeof rejectNonEssentialButton.click === 'function') {
          rejectNonEssentialButton.click();
          return 'clicked reject non-essential';
        }
        return 'no dialogs found';
      })()
    `);
  } catch (err) {
    // Ignore errors
  }
};

// Helper: Extract email from page
const extractEmail = async () => {
  try {
    const result = await page.evaluate(`
      (async () => {
        try {
          // Method 1: Try to get email from script tags
          const scripts = document.querySelectorAll('script');
          for (let script of scripts) {
            const content = script.textContent || script.innerText || '';
            if (content.length > 100) {
              const emailMatch = content.match(/"email":"([^"]+)"/);
              if (emailMatch) {
                return { success: true, email: emailMatch[1], source: 'script_tag' };
              }
            }
          }

          // Method 2: Try to fetch from current page
          const response = await fetch(window.location.href, {
            headers: {
              "accept": "*/*",
              "accept-language": navigator.language || "en-US,en;q=0.9",
              "cache-control": "no-cache",
            },
            method: "GET",
            credentials: "include",
          });

          if (response.ok) {
            const html = await response.text();
            const emailMatch = html.match(/"email":"([^"]+)"/);
            if (emailMatch) {
              return { success: true, email: emailMatch[1], source: 'api' };
            }
          }

          return { success: false, error: 'email not found' };
        } catch (err) {
          return { success: false, error: err.message };
        }
      })()
    `);

    if (result?.success) {
      return result.email;
    }
    return null;
  } catch (err) {
    return null;
  }
};

// Helper: Get authentication credentials
const getAuthCredentials = async () => {
  try {
    const result = await page.evaluate(`
      (() => {
        let userToken = null;
        let deviceId = null;

        // Try to get token from #client-bootstrap script tag
        const bootstrapScript = document.getElementById('client-bootstrap');
        if (bootstrapScript) {
          try {
            const bootstrapData = JSON.parse(bootstrapScript.textContent);
            userToken = bootstrapData?.session?.accessToken;
          } catch (e) {
            // Ignore
          }
        }

        // Fallback: try window.CLIENT_BOOTSTRAP
        if (!userToken && window.CLIENT_BOOTSTRAP) {
          userToken = window.CLIENT_BOOTSTRAP?.session?.accessToken;
        }

        // Get deviceId from oai-did cookie
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'oai-did') {
            deviceId = value;
            break;
          }
        }

        return { userToken, deviceId };
      })()
    `);

    return result || { userToken: null, deviceId: null };
  } catch (err) {
    return { userToken: null, deviceId: null };
  }
};

// Helper: Fetch memories from API
const fetchMemories = async (accessToken, deviceId) => {
  try {
    const result = await page.evaluate(`
      (async () => {
        const token = ${JSON.stringify(accessToken)};
        const device = ${JSON.stringify(deviceId)};

        try {
          const response = await fetch("https://chatgpt.com/backend-api/memories?include_memory_entries=true", {
            headers: {
              accept: "*/*",
              "accept-language": "en-US,en;q=0.9",
              authorization: "Bearer " + token,
              "oai-device-id": device,
              "oai-language": "en-US",
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "same-origin",
            },
            referrer: "https://chatgpt.com/",
            method: "GET",
            mode: "cors",
            credentials: "include",
          });

          if (!response.ok) {
            return { success: false, error: 'API request failed', status: response.status };
          }

          const data = await response.json();
          return { success: true, memories: data.memories || [] };
        } catch (err) {
          return { success: false, error: err.message };
        }
      })()
    `);

    if (result?.success) {
      return result.memories;
    }
    return [];
  } catch (err) {
    return [];
  }
};

// Helper: Check if logged in
// Key insight: ChatGPT shows a chat input even when NOT logged in!
// The reliable indicator is the ABSENCE of "Log in" / "Sign up" buttons
const checkLoginStatus = async () => {
  try {
    const result = await page.evaluate(`
      (() => {
        // FIRST: Check if "Log in" or "Sign up" buttons exist - if so, NOT logged in
        const allButtons = document.querySelectorAll('button, a');
        const hasLoginButton = Array.from(allButtons).some(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('log in') || text.includes('sign up');
        });

        // If login/signup buttons exist, user is definitely NOT logged in
        if (hasLoginButton) {
          return false;
        }

        // No login buttons found - verify with positive indicators
        // Check for sidebar navigation (only exists when logged in)
        const hasSidebar = !!document.querySelector('nav[aria-label="Chat history"]') ||
                          !!document.querySelector('nav a[href^="/c/"]') ||
                          document.querySelectorAll('nav').length > 0;

        // Check for user menu in sidebar (bottom left when logged in)
        const hasUserMenu = !!document.querySelector('[data-testid="profile-button"]') ||
                           !!document.querySelector('button[aria-label*="User menu"]');

        return hasSidebar || hasUserMenu;
      })()
    `);

    return result;
  } catch (err) {
    return false;
  }
};

// Main export flow
(async () => {
  // Navigate to ChatGPT
  await page.setData('status', 'Navigating to ChatGPT...');
  await page.goto('https://chatgpt.com/');
  await page.sleep(3000);

  // Dismiss any interrupting dialogs
  await dismissInterruptingDialogs();
  await page.sleep(1000);

  // Check if logged in
  await page.setData('status', 'Checking login status...');
  let isLoggedIn = await checkLoginStatus();

  // Double-check after a short delay (page might still be loading)
  if (!isLoggedIn) {
    await page.sleep(2000);
    isLoggedIn = await checkLoginStatus();
  }

  if (!isLoggedIn) {
    await page.setData('status', 'Please log in to ChatGPT...');

    // Wait for user to log in - check every 2 seconds
    await page.promptUser(
      'Please log in to ChatGPT. Click "Done" when you see the chat interface.',
      async () => {
        // Dismiss any dialogs that appear during login
        await dismissInterruptingDialogs();
        return await checkLoginStatus();
      },
      2000
    );

    await page.setData('status', 'Login completed, loading data...');
    await page.sleep(3000);

    // Dismiss any post-login dialogs
    await dismissInterruptingDialogs();
    await page.sleep(1000);
  } else {
    await page.setData('status', 'Already logged in');
  }

  // Final dialog dismissal
  await dismissInterruptingDialogs();
  await page.sleep(1000);

  // Extract email (with retries)
  await page.setData('status', 'Extracting email...');
  let email = null;
  let emailAttempts = 0;
  const maxEmailAttempts = 5;

  while (!email && emailAttempts < maxEmailAttempts) {
    emailAttempts++;
    email = await extractEmail();
    if (!email) {
      await page.setData('status', `Looking for email... (attempt ${emailAttempts}/${maxEmailAttempts})`);
      await page.sleep(2000);
    }
  }

  if (!email) {
    await page.setData('error', 'Could not extract email after multiple attempts');
    return { error: 'Could not extract email' };
  }

  state.email = email;
  await page.setData('status', `Email found: ${email}`);
  await page.setData('email', email);

  // Get authentication credentials
  await page.setData('status', 'Getting authentication credentials...');
  const { userToken, deviceId } = await getAuthCredentials();

  state.accessToken = userToken;
  state.deviceId = deviceId;

  // Set up network capture for memories API
  await page.captureNetwork({
    urlPattern: '/backend-api/memories',
    key: 'memoriesResponse'
  });

  // Fetch memories
  if (userToken && deviceId) {
    await page.setData('status', 'Fetching memories...');

    const memories = await fetchMemories(userToken, deviceId);
    state.memories = memories;

    await page.setData('status', `Fetched ${memories.length} memories`);
    await page.setData('memories_count', memories.length);
  } else {
    await page.setData('status', 'Could not get auth credentials, trying network capture...');

    // Try to trigger memories load by navigating to settings (if needed)
    // For now, just wait a bit to see if we captured anything
    await page.sleep(2000);

    // Check if we captured the memories response
    const capturedResponse = await page.getCapturedResponse('memoriesResponse');
    if (capturedResponse) {
      try {
        const data = capturedResponse.data;
        if (data && data.memories) {
          state.memories = data.memories;
          await page.setData('status', `Captured ${data.memories.length} memories from network`);
          await page.setData('memories_count', data.memories.length);
        }
      } catch (err) {
        // Could not parse captured response
      }
    } else {
      await page.setData('status', 'No memories captured, continuing with email only');
    }
  }

  // Transform data to schema format
  const transformDataForSchema = () => {
    const { email, memories } = state;

    if (!email) {
      return null;
    }

    const transformedMemories = (memories || []).map((memory) => ({
      id: memory.id || '',
      content: memory.content || '',
      created_at: memory.created_at || memory.createdAt || new Date().toISOString(),
      updated_at: memory.updated_at || memory.updatedAt,
      type: memory.type || 'memory'
    }));

    return {
      email: email,
      memories: transformedMemories,
      // Standard export summary for consistent UI display
      exportSummary: {
        count: transformedMemories.length,
        label: transformedMemories.length === 1 ? 'memory' : 'memories'
      },
      timestamp: new Date().toISOString(),
      version: "1.0.0-playwright",
      platform: "chatgpt"
    };
  };

  // Build final result
  state.isComplete = true;
  const result = transformDataForSchema();

  if (result) {
    await page.setData('result', result);
    await page.setData('status', `Complete! ${result.memories?.length || 0} memories collected for ${result.email}`);
    return { success: true, data: result };
  } else {
    await page.setData('error', 'Failed to transform data');
    return { success: false, error: 'Failed to transform data' };
  }
})();
