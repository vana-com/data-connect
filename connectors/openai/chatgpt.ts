/**
 * ChatGPT Connector for DataBridge
 *
 * Scrapes ChatGPT conversation history directly from the sidebar.
 * This connector runs automatically when injected into the ChatGPT page.
 */

// This runs immediately when injected
(async function() {
  const api = (window as any).__DATABRIDGE_API__;

  if (!api) {
    console.error('[ChatGPT Connector] DataBridge API not found');
    return;
  }

  const { log, waitForElement, wait, sendStatus } = api;

  // Progress phases for clear UX
  const PHASES = {
    INITIALIZING: { step: 1, total: 4, label: 'Initializing' },
    WAITING_LOGIN: { step: 2, total: 4, label: 'Waiting for login' },
    LOADING: { step: 3, total: 4, label: 'Loading conversations' },
    SCRAPING: { step: 4, total: 4, label: 'Collecting data' },
  };

  // Create progress overlay UI
  const createOverlay = () => {
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

  const updateOverlay = (step: number, total: number, label: string, message: string, count?: number) => {
    const overlay = document.getElementById('databridge-overlay');
    if (!overlay) return;

    // Update steps
    overlay.querySelectorAll('.db-step').forEach((el, i) => {
      el.classList.toggle('active', i < step);
    });

    // Update label and message
    const stepLabel = overlay.querySelector('.db-step-label');
    const messageEl = overlay.querySelector('.db-message');
    const progressBar = overlay.querySelector('.db-progress-bar') as HTMLElement;

    if (stepLabel) stepLabel.textContent = `Step ${step} of ${total} — ${label}`;
    if (messageEl) {
      messageEl.innerHTML = message + (count !== undefined ? `<span class="db-count">(${count} found)</span>` : '');
    }
    if (progressBar) progressBar.style.width = `${(step / total) * 100}%`;
  };

  const completeOverlay = (count: number) => {
    const overlay = document.getElementById('databridge-overlay');
    if (!overlay) return;

    overlay.classList.add('db-success');
    overlay.querySelectorAll('.db-step').forEach(el => el.classList.add('active'));

    const stepLabel = overlay.querySelector('.db-step-label');
    const messageEl = overlay.querySelector('.db-message');
    const progressBar = overlay.querySelector('.db-progress-bar') as HTMLElement;

    if (stepLabel) stepLabel.textContent = 'Complete!';
    if (messageEl) {
      messageEl.innerHTML = `
        Successfully exported ${count} conversations<br>
        <span style="font-size: 12px; color: #6b7280; font-weight: 400;">
          You can close this window now
        </span>
      `;
    }
    if (progressBar) progressBar.style.width = '100%';
  };

  // Initialize overlay
  createOverlay();

  log('ChatGPT Connector started');
  sendStatus({
    type: 'STARTED',
    message: 'Connecting to ChatGPT...',
    phase: PHASES.INITIALIZING
  });
  updateOverlay(1, 4, 'Initializing', 'Connecting to ChatGPT...');

  // Wait for page to fully load
  await wait(2);

  // Check if user is logged in by looking for the conversation sidebar or user menu
  log('Checking login status...');

  const isLoggedIn = async (): Promise<boolean> => {
    // Multiple ways to detect logged-in state
    const indicators = [
      'nav a[href^="/c/"]',           // Conversation links
      'img[alt="User"]',               // User avatar
      '[data-testid="profile-button"]', // Profile button
      'button[aria-label*="profile"]',  // Profile button alt
      'nav [data-testid]',              // Any testid in nav
    ];

    for (const selector of indicators) {
      const element = document.querySelector(selector);
      if (element) {
        log(`Login detected via: ${selector}`);
        return true;
      }
    }
    return false;
  };

  // Wait for login with timeout
  let loggedIn = await isLoggedIn();
  let waitCount = 0;
  const maxWait = 60; // Wait up to 60 seconds for login

  while (!loggedIn && waitCount < maxWait) {
    log(`Waiting for login... (${waitCount}/${maxWait}s)`);
    sendStatus({
      type: 'WAITING_LOGIN',
      message: 'Please log in to ChatGPT',
      phase: PHASES.WAITING_LOGIN
    });
    updateOverlay(2, 4, 'Waiting for login', 'Please log in to ChatGPT');
    await wait(2);
    waitCount += 2;
    loggedIn = await isLoggedIn();
  }

  if (!loggedIn) {
    log('Login timeout - user did not log in');
    sendStatus({ type: 'ERROR', message: 'Login timeout - please try again' });
    const overlay = document.getElementById('databridge-overlay');
    if (overlay) overlay.remove();
    return;
  }

  log('User is logged in, starting data collection');
  sendStatus({
    type: 'COLLECTING',
    message: 'Loading your conversations...',
    phase: PHASES.LOADING
  });
  updateOverlay(3, 4, 'Loading conversations', 'Loading your conversations...');

  // Give the page time to load conversations
  await wait(3);

  // Scroll the sidebar to load more conversations
  const scrollSidebar = async () => {
    log('Looking for scroll container...');

    // Find the scrollable container - look for the element that actually scrolls
    const findScrollContainer = (): Element | null => {
      const nav = document.querySelector('nav');
      if (!nav) return null;

      // Find all potentially scrollable elements
      const candidates: Element[] = [];
      const walk = (el: Element) => {
        if (el.scrollHeight > el.clientHeight + 50) {
          candidates.push(el);
        }
        for (const child of Array.from(el.children)) {
          walk(child);
        }
      };
      walk(nav);

      // Sort by scroll height (largest first) and pick the best one
      candidates.sort((a, b) => b.scrollHeight - a.scrollHeight);

      if (candidates.length > 0) {
        log(`Found ${candidates.length} scrollable candidates, using largest`);
        return candidates[0];
      }

      return nav;
    };

    const scrollContainer = findScrollContainer();

    if (scrollContainer) {
      log(`Scroll container: scrollHeight=${scrollContainer.scrollHeight}, clientHeight=${scrollContainer.clientHeight}`);

      let lastCount = 0;
      let noNewCount = 0;
      let lastScrollHeight = 0;

      // Keep scrolling until we stop getting new content
      while (noNewCount < 8) {
        // Scroll to absolute bottom
        scrollContainer.scrollTop = scrollContainer.scrollHeight + 10000;

        await wait(1.5); // Wait for lazy loading

        const currentCount = document.querySelectorAll('nav a[href^="/c/"]').length;
        const currentScrollHeight = scrollContainer.scrollHeight;

        log(`Scroll: ${currentCount} conversations, scrollHeight=${currentScrollHeight}`);

        sendStatus({
          type: 'COLLECTING',
          message: `Loading conversations...`,
          phase: PHASES.LOADING,
          count: currentCount
        });
        updateOverlay(3, 4, 'Loading conversations', 'Scrolling to load more...', currentCount);

        // Check if we're still loading new content (either new conversations or scroll height changed)
        if (currentCount === lastCount && currentScrollHeight === lastScrollHeight) {
          noNewCount++;
        } else {
          noNewCount = 0;
        }

        lastCount = currentCount;
        lastScrollHeight = currentScrollHeight;

        // Safety limit
        if (currentCount > 1000) {
          log('Reached 1000 conversations limit');
          break;
        }
      }

      log(`Finished scrolling after ${noNewCount} stable scrolls. Total: ${lastCount}`);

      // Scroll back to top
      scrollContainer.scrollTop = 0;
    } else {
      log('Error: No scroll container found');
    }
  };

  await scrollSidebar();
  await wait(2);

  // Scrape conversations from the sidebar
  log('Scraping conversations from sidebar...');
  sendStatus({
    type: 'COLLECTING',
    message: 'Collecting conversation data...',
    phase: PHASES.SCRAPING
  });
  updateOverlay(4, 4, 'Collecting data', 'Processing conversations...');

  interface ConversationItem {
    id: string;
    title: string;
    url: string;
    scrapedAt: string;
  }

  const conversations: ConversationItem[] = [];

  // Find all conversation links
  const conversationLinks = document.querySelectorAll('nav a[href^="/c/"]');
  log(`Found ${conversationLinks.length} conversation links`);

  for (const link of Array.from(conversationLinks)) {
    const href = link.getAttribute('href');
    const title = link.textContent?.trim() || 'Untitled';

    if (href) {
      const id = href.replace('/c/', '');
      conversations.push({
        id,
        title,
        url: `https://chatgpt.com${href}`,
        scrapedAt: new Date().toISOString(),
      });
    }
  }

  log(`Scraped ${conversations.length} conversations`);

  // Also try to get user info
  let userInfo: { name?: string; email?: string } = {};

  try {
    // Try to find user name from the UI
    const profileButton = document.querySelector('[data-testid="profile-button"]');
    if (profileButton) {
      const nameEl = profileButton.querySelector('span');
      if (nameEl) {
        userInfo.name = nameEl.textContent?.trim();
      }
    }

    // Try to find user avatar alt text
    const userAvatar = document.querySelector('img[alt="User"]');
    if (userAvatar && !userInfo.name) {
      const parent = userAvatar.closest('button');
      if (parent) {
        userInfo.name = parent.textContent?.trim();
      }
    }
  } catch (e) {
    log('Could not get user info');
  }

  // Prepare the result data
  const result = {
    platform: 'chatgpt',
    company: 'OpenAI',
    exportedAt: new Date().toISOString(),
    userInfo,
    conversations,
    totalConversations: conversations.length,
  };

  log(`Export complete: ${conversations.length} conversations`);

  // Update overlay to show completion
  completeOverlay(conversations.length);

  // Send the data back to the Rust backend
  sendStatus({
    type: 'COMPLETE',
    message: `Successfully exported ${conversations.length} conversations`,
    data: result,
    count: conversations.length
  });

  // Also emit a dedicated export-complete event with the data
  if ((window as any).__TAURI__) {
    (window as any).__TAURI__.event.emit('export-complete', {
      runId: (window as any).__DATABRIDGE_RUN_ID__,
      platformId: (window as any).__DATABRIDGE_PLATFORM_ID__,
      company: (window as any).__DATABRIDGE_COMPANY__,
      name: (window as any).__DATABRIDGE_NAME__,
      data: result,
      timestamp: Date.now()
    });
  }

  log('Data sent to backend');
})();
