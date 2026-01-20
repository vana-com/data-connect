/**
 * ChatGPT Connector for DataBridge
 *
 * Scrapes ChatGPT conversation history directly from the sidebar.
 * Results are stored in window.__DATABRIDGE_RESULT__ for Rust to poll via URL hash.
 */

(async function() {
  console.log('[ChatGPT Connector] ====== CONNECTOR STARTING ======');

  // Clear any previous state
  window.__DATABRIDGE_STATUS__ = null;
  window.__DATABRIDGE_RESULT__ = null;
  window.__DATABRIDGE_HASH_SET__ = false;
  window.__DATABRIDGE_LAST_STATUS_KEY__ = null;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const updateStatus = (type, message) => {
    console.log('[ChatGPT Connector] Status:', type, message);
    window.__DATABRIDGE_STATUS__ = { type, message, timestamp: Date.now() };
    // Clear the hash flag so Rust can pick up the new status
    window.__DATABRIDGE_LAST_STATUS_KEY__ = null;
  };

  // Initial status
  updateStatus('STARTED', 'Connector initialized');

  // Wait for page to load
  await sleep(2000);

  // Check if user is logged in
  const isLoggedIn = () => {
    const indicators = [
      'nav a[href^="/c/"]',
      'img[alt="User"]',
      '[data-testid="profile-button"]',
      '.text-token-text-primary',
    ];
    for (const selector of indicators) {
      if (document.querySelector(selector)) {
        console.log('[ChatGPT Connector] Login detected via:', selector);
        return true;
      }
    }
    return false;
  };

  // Wait for login
  let loggedIn = isLoggedIn();
  let waitCount = 0;
  const maxWait = 60;

  while (!loggedIn && waitCount < maxWait) {
    updateStatus('WAITING_LOGIN', 'Please log in to ChatGPT (' + waitCount + 's)');
    await sleep(2000);
    waitCount += 2;
    loggedIn = isLoggedIn();
  }

  if (!loggedIn) {
    updateStatus('ERROR', 'Login timeout');
    window.__DATABRIDGE_RESULT__ = { error: 'Login timeout' };
    return;
  }

  updateStatus('COLLECTING', 'User logged in, collecting data...');
  await sleep(2000);

  // Scroll sidebar to load more conversations
  const nav = document.querySelector('nav');
  if (nav) {
    console.log('[ChatGPT Connector] Scrolling sidebar...');
    const scrollContainers = nav.querySelectorAll('[class*="overflow"]');
    let scrollContainer = nav;

    for (const container of scrollContainers) {
      if (container.scrollHeight > container.clientHeight) {
        scrollContainer = container;
        break;
      }
    }

    for (let i = 0; i < 5; i++) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      await sleep(800);
    }
    scrollContainer.scrollTop = 0;
  }

  await sleep(1000);

  // Scrape conversations
  console.log('[ChatGPT Connector] Scraping conversations...');
  const links = document.querySelectorAll('nav a[href^="/c/"]');
  console.log('[ChatGPT Connector] Found', links.length, 'conversation links');

  const conversations = [];
  for (const link of links) {
    const href = link.getAttribute('href');
    const title = (link.textContent || '').trim() || 'Untitled';
    if (href && href.startsWith('/c/')) {
      conversations.push({
        id: href.replace('/c/', ''),
        title: title,
        url: 'https://chatgpt.com' + href,
        scrapedAt: new Date().toISOString()
      });
    }
  }

  // Get user info
  let userInfo = {};
  try {
    const profileBtn = document.querySelector('[data-testid="profile-button"]');
    if (profileBtn) {
      userInfo.name = (profileBtn.textContent || '').trim();
    }
  } catch (e) {}

  // Store final result
  const result = {
    platform: 'chatgpt',
    company: 'OpenAI',
    exportedAt: new Date().toISOString(),
    userInfo: userInfo,
    conversations: conversations,
    totalConversations: conversations.length
  };

  console.log('[ChatGPT Connector] Export complete:', conversations.length, 'conversations');

  window.__DATABRIDGE_RESULT__ = result;
  updateStatus('COMPLETE', 'Exported ' + conversations.length + ' conversations');

  console.log('[ChatGPT Connector] ====== CONNECTOR FINISHED ======');
})();
