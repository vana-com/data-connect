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

  log('ChatGPT Connector started');
  sendStatus({ type: 'STARTED', message: 'ChatGPT connector initialized' });

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
    sendStatus({ type: 'WAITING_LOGIN', message: 'Please log in to ChatGPT' });
    await wait(2);
    waitCount += 2;
    loggedIn = await isLoggedIn();
  }

  if (!loggedIn) {
    log('Login timeout - user did not log in');
    sendStatus({ type: 'ERROR', message: 'Login timeout' });
    return;
  }

  log('User is logged in, starting data collection');
  sendStatus({ type: 'COLLECTING', message: 'Collecting conversations...' });

  // Give the page time to load conversations
  await wait(3);

  // Scroll the sidebar to load more conversations
  const scrollSidebar = async () => {
    const sidebar = document.querySelector('nav');
    if (sidebar) {
      log('Scrolling sidebar to load more conversations...');
      const scrollContainer = sidebar.querySelector('[class*="overflow"]') || sidebar;

      for (let i = 0; i < 5; i++) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        await wait(1);
      }

      // Scroll back to top
      scrollContainer.scrollTop = 0;
    }
  };

  await scrollSidebar();
  await wait(2);

  // Scrape conversations from the sidebar
  log('Scraping conversations from sidebar...');

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

  // Send the data back to the Rust backend
  sendStatus({
    type: 'COMPLETE',
    message: `Exported ${conversations.length} conversations`,
    data: result
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
