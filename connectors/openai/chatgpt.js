/**
 * ChatGPT Connector for DataBridge
 *
 * Exports ChatGPT conversations and memories.
 * Can be copy-pasted into browser console for testing.
 */
(async function() {
  // ============================================
  // Polyfills for browser console testing
  // ============================================
  const isDataBridge = typeof window.__DATABRIDGE_API__ !== 'undefined';

  const api = window.__DATABRIDGE_API__ || {
    log: (...args) => console.log('[ChatGPT Connector]', ...args),
    wait: (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000)),
    sendStatus: (status) => console.log('[Status]', JSON.stringify(status, null, 2)),
  };

  const { log, wait, sendStatus } = api;

  // Progress phases
  const PHASES = {
    INITIALIZING: { step: 1, total: 4, label: 'Initializing' },
    WAITING_LOGIN: { step: 2, total: 4, label: 'Waiting for login' },
    LOADING: { step: 3, total: 4, label: 'Loading data' },
    SCRAPING: { step: 4, total: 4, label: 'Collecting data' },
  };

  // ============================================
  // Progress Overlay (only in DataBridge)
  // ============================================
  const createOverlay = () => {
    if (!isDataBridge) return null;

    const overlay = document.createElement('div');
    overlay.id = 'databridge-overlay';
    overlay.innerHTML = `
      <style>
        #databridge-overlay {
          position: fixed;
          top: 16px;
          right: 16px;
          width: 320px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.15);
          padding: 16px;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #databridge-overlay .db-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        #databridge-overlay .db-logo {
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 6px;
        }
        #databridge-overlay .db-title {
          font-weight: 600;
          font-size: 14px;
          color: #1a1a1a;
        }
        #databridge-overlay .db-steps {
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
        }
        #databridge-overlay .db-step {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #e5e7eb;
          transition: background 0.3s;
        }
        #databridge-overlay .db-step.active {
          background: #6366f1;
        }
        #databridge-overlay .db-step-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        #databridge-overlay .db-message {
          font-size: 13px;
          color: #1a1a1a;
          font-weight: 500;
        }
        #databridge-overlay .db-count {
          color: #6366f1;
          margin-left: 6px;
        }
        #databridge-overlay .db-progress {
          height: 4px;
          background: #f3f4f6;
          border-radius: 2px;
          margin-top: 12px;
          overflow: hidden;
        }
        #databridge-overlay .db-progress-bar {
          height: 100%;
          background: #6366f1;
          border-radius: 2px;
          transition: width 0.5s ease;
        }
        #databridge-overlay.db-success {
          border: 2px solid #22c55e;
        }
        #databridge-overlay.db-success .db-message {
          color: #22c55e;
        }
      </style>
      <div class="db-header">
        <div class="db-logo"></div>
        <span class="db-title">DataBridge</span>
      </div>
      <div class="db-steps">
        <div class="db-step" data-step="1"></div>
        <div class="db-step" data-step="2"></div>
        <div class="db-step" data-step="3"></div>
        <div class="db-step" data-step="4"></div>
      </div>
      <div class="db-step-label">Step 1 of 4</div>
      <div class="db-message">Initializing...</div>
      <div class="db-progress">
        <div class="db-progress-bar" style="width: 25%"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  };

  const updateOverlay = (step, total, label, message, count) => {
    const overlay = document.getElementById('databridge-overlay');
    if (!overlay) return;

    overlay.querySelectorAll('.db-step').forEach((el, i) => {
      el.classList.toggle('active', i < step);
    });

    const stepLabel = overlay.querySelector('.db-step-label');
    const messageEl = overlay.querySelector('.db-message');
    const progressBar = overlay.querySelector('.db-progress-bar');

    if (stepLabel) stepLabel.textContent = `Step ${step} of ${total} — ${label}`;
    if (messageEl) {
      messageEl.innerHTML = message + (count !== undefined ? `<span class="db-count">(${count} found)</span>` : '');
    }
    if (progressBar) progressBar.style.width = `${(step / total) * 100}%`;
  };

  const completeOverlay = (conversationCount, memoryCount) => {
    const overlay = document.getElementById('databridge-overlay');
    if (!overlay) return;

    overlay.classList.add('db-success');
    overlay.querySelectorAll('.db-step').forEach(el => el.classList.add('active'));

    const stepLabel = overlay.querySelector('.db-step-label');
    const messageEl = overlay.querySelector('.db-message');
    const progressBar = overlay.querySelector('.db-progress-bar');

    if (stepLabel) stepLabel.textContent = 'Complete!';
    if (messageEl) {
      messageEl.innerHTML = `
        Exported ${conversationCount} conversations${memoryCount > 0 ? ` and ${memoryCount} memories` : ''}<br>
        <span style="font-size: 12px; color: #6b7280; font-weight: 400;">
          You can close this window now
        </span>
      `;
    }
    if (progressBar) progressBar.style.width = '100%';
  };

  // ============================================
  // Helper Functions
  // ============================================

  // Get email from DOM or API
  const getEmail = async () => {
    // Try to get email from existing DOM scripts first
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const content = script.textContent || script.innerText || '';
      if (content.length > 100) {
        const emailMatch = content.match(/"email":"(.*?)"/);
        if (emailMatch) {
          log('Found email in DOM');
          return emailMatch[1];
        }
      }
    }

    // Fallback: fetch from page
    log('Email not in DOM, fetching from page...');
    try {
      const response = await fetch(window.location.href, {
        headers: {
          accept: '*/*',
          'cache-control': 'no-cache',
        },
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const html = await response.text();
        const emailMatch = html.match(/"email":"(.*?)"/);
        if (emailMatch) {
          log('Found email from page fetch');
          return emailMatch[1];
        }
      }
    } catch (e) {
      log('Failed to fetch email:', e.message);
    }

    return null;
  };

  // Get authentication credentials
  const getCredentials = () => {
    let userToken = null;
    let deviceId = null;

    // Try #client-bootstrap script tag
    const bootstrapScript = document.getElementById('client-bootstrap');
    if (bootstrapScript) {
      try {
        const bootstrapData = JSON.parse(bootstrapScript.textContent);
        userToken = bootstrapData?.session?.accessToken;
      } catch (e) {
        log('Failed to parse #client-bootstrap');
      }
    }

    // Fallback: window.CLIENT_BOOTSTRAP
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
  };

  // Fetch memories from ChatGPT API
  const fetchMemories = async (userToken, deviceId) => {
    if (!userToken) {
      log('No auth token, skipping memories fetch');
      return [];
    }

    try {
      log('Fetching memories from API...');
      const response = await fetch('https://chatgpt.com/backend-api/memories?include_memory_entries=true', {
        headers: {
          accept: '*/*',
          authorization: 'Bearer ' + userToken,
          'oai-device-id': deviceId || '',
          'oai-language': 'en-US',
        },
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const memories = data.memories || [];
        log(`Fetched ${memories.length} memories`);
        return memories;
      } else {
        log(`Memories API failed: ${response.status}`);
      }
    } catch (e) {
      log('Error fetching memories:', e.message);
    }

    return [];
  };

  // Find and scroll the conversation sidebar
  const scrollAndCollectConversations = async () => {
    log('Looking for scroll container...');

    // Find the scrollable container
    const findScrollContainer = () => {
      const nav = document.querySelector('nav');
      if (!nav) return null;

      const candidates = [];
      const walk = (el) => {
        if (el.scrollHeight > el.clientHeight + 50) {
          candidates.push(el);
        }
        for (const child of el.children) {
          walk(child);
        }
      };
      walk(nav);

      candidates.sort((a, b) => b.scrollHeight - a.scrollHeight);
      return candidates.length > 0 ? candidates[0] : nav;
    };

    const scrollContainer = findScrollContainer();

    if (!scrollContainer) {
      log('No scroll container found');
      return [];
    }

    log(`Scroll container found: scrollHeight=${scrollContainer.scrollHeight}`);

    let lastCount = 0;
    let noNewCount = 0;
    let lastScrollHeight = 0;

    // Keep scrolling until we stop getting new content
    while (noNewCount < 8) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight + 10000;
      await wait(1.5);

      const currentCount = document.querySelectorAll('nav a[href^="/c/"]').length;
      const currentScrollHeight = scrollContainer.scrollHeight;

      log(`Scroll: ${currentCount} conversations, scrollHeight=${currentScrollHeight}`);

      sendStatus({
        type: 'COLLECTING',
        message: 'Loading conversations...',
        phase: PHASES.LOADING,
        count: currentCount
      });
      updateOverlay(3, 4, 'Loading data', 'Scrolling to load more...', currentCount);

      if (currentCount === lastCount && currentScrollHeight === lastScrollHeight) {
        noNewCount++;
      } else {
        noNewCount = 0;
      }

      lastCount = currentCount;
      lastScrollHeight = currentScrollHeight;

      if (currentCount > 1000) {
        log('Reached 1000 conversations limit');
        break;
      }
    }

    scrollContainer.scrollTop = 0;
    log(`Finished scrolling. Total: ${lastCount}`);

    // Collect conversation data
    const conversations = [];
    const links = document.querySelectorAll('nav a[href^="/c/"]');

    for (const link of links) {
      const href = link.getAttribute('href');
      const title = link.textContent?.trim() || 'Untitled';

      if (href) {
        conversations.push({
          id: href.replace('/c/', ''),
          title: title,
          url: 'https://chatgpt.com' + href,
          scrapedAt: new Date().toISOString(),
        });
      }
    }

    return conversations;
  };

  // ============================================
  // Main Execution
  // ============================================

  // Initialize overlay
  createOverlay();

  log('ChatGPT Connector started');
  sendStatus({ type: 'STARTED', message: 'Connecting to ChatGPT...', phase: PHASES.INITIALIZING });
  updateOverlay(1, 4, 'Initializing', 'Connecting to ChatGPT...');

  await wait(2);

  // Check login status
  log('Checking login status...');
  const isLoggedIn = () => {
    const indicators = [
      'nav a[href^="/c/"]',
      'img[alt="User"]',
      '[data-testid="profile-button"]',
      'nav [data-testid]',
    ];
    return indicators.some(sel => document.querySelector(sel));
  };

  let loggedIn = isLoggedIn();
  let waitCount = 0;
  const maxWait = 60;

  while (!loggedIn && waitCount < maxWait) {
    log(`Waiting for login... (${waitCount}/${maxWait}s)`);
    sendStatus({ type: 'WAITING_LOGIN', message: 'Please log in to ChatGPT', phase: PHASES.WAITING_LOGIN });
    updateOverlay(2, 4, 'Waiting for login', 'Please log in to ChatGPT');
    await wait(2);
    waitCount += 2;
    loggedIn = isLoggedIn();
  }

  if (!loggedIn) {
    log('Login timeout');
    sendStatus({ type: 'ERROR', message: 'Login timeout - please try again' });
    const overlay = document.getElementById('databridge-overlay');
    if (overlay) overlay.remove();
    return;
  }

  log('User is logged in');
  sendStatus({ type: 'COLLECTING', message: 'Loading your data...', phase: PHASES.LOADING });
  updateOverlay(3, 4, 'Loading data', 'Collecting your data...');

  await wait(2);

  // Get user info
  const email = await getEmail();
  const { userToken, deviceId } = getCredentials();

  log(`Email: ${email ? 'found' : 'not found'}, Token: ${userToken ? 'found' : 'not found'}`);

  // Fetch memories
  const memories = await fetchMemories(userToken, deviceId);

  // Scroll and collect conversations
  const conversations = await scrollAndCollectConversations();

  // Update overlay to scraping phase
  sendStatus({ type: 'COLLECTING', message: 'Processing data...', phase: PHASES.SCRAPING });
  updateOverlay(4, 4, 'Collecting data', 'Processing...');

  await wait(1);

  // Prepare result
  const result = {
    platform: 'chatgpt',
    company: 'OpenAI',
    exportedAt: new Date().toISOString(),
    userInfo: {
      email: email || undefined,
    },
    conversations: conversations,
    totalConversations: conversations.length,
    memories: memories,
    totalMemories: memories.length,
    // Standard export summary for consistent UI display
    exportSummary: {
      count: conversations.length,
      label: conversations.length === 1 ? 'conversation' : 'conversations'
    },
  };

  log(`Export complete: ${conversations.length} conversations, ${memories.length} memories`);

  // Show completion
  completeOverlay(conversations.length, memories.length);

  sendStatus({
    type: 'COMPLETE',
    message: `Exported ${conversations.length} conversations and ${memories.length} memories`,
    data: result,
    count: conversations.length,
  });

  // Emit export-complete event (DataBridge only)
  if (isDataBridge && window.__TAURI__) {
    window.__TAURI__.event.emit('export-complete', {
      runId: window.__DATABRIDGE_RUN_ID__,
      platformId: window.__DATABRIDGE_PLATFORM_ID__,
      company: window.__DATABRIDGE_COMPANY__,
      name: window.__DATABRIDGE_NAME__,
      data: result,
      timestamp: Date.now(),
    });
  }

  log('Data sent to backend');

  // For browser console testing, return the result
  if (!isDataBridge) {
    console.log('=== EXPORT RESULT ===');
    console.log(result);
    return result;
  }
})();
