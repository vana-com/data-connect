/**
 * ChatGPT Connector - Steel version
 */

import type { ScriptDefinition, ScriptContext } from '../../types/session.js';
import type { ConversationsResult, ConversationListItem, MemoriesResult, Memory, ChatGPTUserInfo } from './schemas.js';

export * from './schemas.js';

export interface ChatGPTScrapeParams {
  scopes?: string[];
  maxConversations?: number;
}

export interface ChatGPTScrapeResult {
  conversations?: ConversationsResult;
  memories?: MemoriesResult;
}

async function ensureLoggedIn(ctx: ScriptContext): Promise<boolean> {
  const { page, log } = ctx;

  log.info('Checking ChatGPT login status...');
  ctx.setStatus('Checking login status...');

  // Start directly on the login page
  await page.goto('https://chat.openai.com/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Check IP address now that we're on a real page
  try {
    const ip = await page.evaluate(async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json() as { ip: string };
        return data.ip;
      } catch {
        return 'check failed';
      }
    });
    log.info(`Session IP: ${ip}`);
    ctx.setData('sessionIP', ip);
  } catch (e) {
    log.warn('Could not check IP');
  }

  await page.waitForTimeout(1000);

  // Check if we're already logged in (redirected to main page with conversations)
  const currentUrl = page.url();
  const isLoggedIn = currentUrl.includes('chatgpt.com') && !currentUrl.includes('auth');

  if (isLoggedIn) {
    // Double check by looking for conversation list
    const conversationList = await page.$('nav a[href^="/c/"]');
    if (conversationList) {
      log.info('User is already logged in');
      return true;
    }
  }

  log.info('Not logged in. Requesting user login...');
  ctx.setStatus('Please log in to ChatGPT...');

  // Request user takeover for login
  await ctx.requestTakeover('Please log in to ChatGPT. TIP: Use Email/Password or Apple/Microsoft login - Google login may be blocked by bot detection. Click "Done - Continue Automation" when finished.', {
    autoComplete: {
      urlPattern: /chatgpt\.com/,
      selector: 'nav a[href^="/c/"]', // Only complete when we see conversations
    }
  });

  log.info('Login completed');
  await page.waitForTimeout(2000);

  return true;
}

/**
 * Get user info including access token from the page
 */
async function getUserInfo(ctx: ScriptContext): Promise<ChatGPTUserInfo> {
  const { page, log } = ctx;

  log.info('Getting user info...');

  const userInfo = await page.evaluate(() => {
    // Try to get access token from various sources
    let accessToken: string | undefined;
    let deviceId: string | undefined;

    // Method 1: Check localStorage/sessionStorage
    try {
      const authData = localStorage.getItem('oai/apps/hasSeenOnboarding/chat') ||
                       sessionStorage.getItem('oai/apps/hasSeenOnboarding/chat');
      if (authData) {
        // Access token might be in cookies or elsewhere
      }
    } catch (e) {
      // Ignore
    }

    // Method 2: Check for __NEXT_DATA__ which might contain session info
    try {
      const nextData = document.getElementById('__NEXT_DATA__');
      if (nextData?.textContent) {
        const data = JSON.parse(nextData.textContent);
        if (data?.props?.pageProps?.accessToken) {
          accessToken = data.props.pageProps.accessToken;
        }
      }
    } catch (e) {
      // Ignore
    }

    // Method 3: Try to get from window object
    try {
      // @ts-ignore - accessing window properties
      if (window.__NEXT_DATA__?.props?.pageProps?.accessToken) {
        // @ts-ignore
        accessToken = window.__NEXT_DATA__.props.pageProps.accessToken;
      }
    } catch (e) {
      // Ignore
    }

    // Get device ID from localStorage
    try {
      deviceId = localStorage.getItem('oai-did') || undefined;
    } catch (e) {
      // Ignore
    }

    return { accessToken, deviceId };
  });

  return userInfo;
}

/**
 * Scrape memories using the ChatGPT UI
 */
async function scrapeMemories(ctx: ScriptContext): Promise<MemoriesResult> {
  const { page, log } = ctx;

  log.info('Scraping memories...');
  ctx.setStatus('Fetching memories...');

  const memories: Memory[] = [];

  // Set up network capture before navigating
  ctx.captureNetwork({
    key: 'memories_api',
    urlPattern: /backend-api\/memories/,
  });

  // Navigate to main ChatGPT page if not there
  const currentUrl = page.url();
  if (!currentUrl.includes('chatgpt.com')) {
    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  }

  log.info('Opening settings menu...');
  ctx.setStatus('Opening settings...');

  // Click on the user menu / profile button (usually in bottom left or top right)
  // Try multiple selectors for the settings/profile button
  const profileSelectors = [
    'button[data-testid="profile-button"]',
    '[data-testid="user-menu-button"]',
    'button:has-text("Settings")',
    'nav button[aria-haspopup="menu"]',
    // Profile avatar button - usually has user's initials or image
    'button.rounded-full',
  ];

  let settingsOpened = false;
  for (const selector of profileSelectors) {
    try {
      const btn = await page.$(selector);
      if (btn) {
        await btn.click();
        await page.waitForTimeout(1000);
        settingsOpened = true;
        log.info(`Clicked profile button: ${selector}`);
        break;
      }
    } catch (e) {
      // Try next selector
    }
  }

  if (!settingsOpened) {
    // Try clicking the gear icon or Settings text directly
    log.info('Trying to find Settings link...');
    try {
      await page.click('text=Settings');
      await page.waitForTimeout(1000);
      settingsOpened = true;
    } catch (e) {
      log.warn('Could not open settings menu');
    }
  }

  // Look for Settings option in the menu
  if (settingsOpened) {
    try {
      // Click Settings in the dropdown menu
      const settingsLink = await page.$('div[role="menuitem"]:has-text("Settings")');
      if (settingsLink) {
        await settingsLink.click();
        await page.waitForTimeout(1500);
        log.info('Clicked Settings menu item');
      }
    } catch (e) {
      log.warn('Could not click Settings menu item');
    }
  }

  // Now we should be in Settings dialog - click Personalization tab
  log.info('Looking for Personalization tab...');
  ctx.setStatus('Opening Personalization...');

  try {
    // Try clicking Personalization tab/link
    const personalizationSelectors = [
      'button:has-text("Personalization")',
      'a:has-text("Personalization")',
      '[role="tab"]:has-text("Personalization")',
      'div:has-text("Personalization")',
    ];

    for (const selector of personalizationSelectors) {
      try {
        const el = await page.$(selector);
        if (el) {
          await el.click();
          await page.waitForTimeout(1500);
          log.info(`Clicked Personalization: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next
      }
    }
  } catch (e) {
    log.warn('Could not click Personalization tab');
  }

  // Now click the Manage button for Memory
  log.info('Looking for Memory Manage button...');
  ctx.setStatus('Opening Memory settings...');

  try {
    // Look for "Manage" button near "Memory" text
    const manageSelectors = [
      'button:has-text("Manage")',
      'a:has-text("Manage")',
      '[role="button"]:has-text("Manage")',
    ];

    for (const selector of manageSelectors) {
      try {
        const buttons = await page.$$(selector);
        for (const btn of buttons) {
          // Click the first Manage button we find (should be for memories)
          await btn.click();
          await page.waitForTimeout(2000);
          log.info(`Clicked Manage button: ${selector}`);
          break;
        }
        if (buttons.length > 0) break;
      } catch (e) {
        // Try next
      }
    }
  } catch (e) {
    log.warn('Could not click Manage button');
  }

  // Wait a bit for API call
  await page.waitForTimeout(2000);

  // Check if we captured the memories API response
  const capturedResponse = await ctx.getCapturedResponse('memories_api');
  if (capturedResponse?.body) {
    try {
      const apiData = JSON.parse(capturedResponse.body) as { memories?: Array<{
        id?: string;
        content?: string;
        created_at?: string;
        updated_at?: string;
        type?: string;
      }> };

      if (apiData.memories) {
        log.info(`Found ${apiData.memories.length} memories from API`);
        for (const m of apiData.memories) {
          memories.push({
            id: m.id || '',
            content: m.content || '',
            createdAt: m.created_at || new Date().toISOString(),
            updatedAt: m.updated_at,
            type: m.type,
          });
        }
      }
    } catch (e) {
      log.warn('Failed to parse captured memories API response');
    }
  } else {
    log.info('No memories API response captured, trying to scrape from UI...');

    // Fallback: Try to scrape memories from the UI directly
    try {
      const memoryItems = await page.$$('div[data-testid="memory-item"], .memory-item, [class*="memory"]');
      log.info(`Found ${memoryItems.length} memory elements in UI`);

      for (let i = 0; i < memoryItems.length; i++) {
        try {
          const text = await memoryItems[i].textContent();
          if (text && text.trim()) {
            memories.push({
              id: `ui-memory-${i}`,
              content: text.trim(),
              createdAt: new Date().toISOString(),
            });
          }
        } catch (e) {
          // Skip this memory item
        }
      }
    } catch (e) {
      log.warn('Could not scrape memories from UI');
    }
  }

  // Close settings dialog by pressing Escape or clicking outside
  try {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
  } catch (e) {
    // Ignore
  }

  ctx.setStatus(`Collected ${memories.length} memories`);
  log.info('Memories collection complete', { memoriesCount: memories.length });

  return {
    memories,
    total: memories.length,
  };
}

async function scrapeConversations(ctx: ScriptContext, maxConversations: number = 50): Promise<ConversationsResult> {
  const { page, log } = ctx;

  log.info('Scraping conversations...');
  ctx.setStatus('Scraping conversations...');

  const conversations: ConversationListItem[] = [];

  // Set up network capture for the conversations API
  ctx.captureNetwork({
    key: 'conversations_api',
    urlPattern: /backend-api\/conversations/,
  });

  // Refresh to trigger API call if needed
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Try to get from captured API response first
  const capturedResponse = await ctx.getCapturedResponse('conversations_api');
  if (capturedResponse?.body) {
    try {
      const apiData = JSON.parse(capturedResponse.body) as { items?: Array<{ id: string; title: string; create_time: string; update_time: string }> };
      if (apiData.items) {
        log.info(`Found ${apiData.items.length} conversations from API`);
        for (const item of apiData.items.slice(0, maxConversations)) {
          conversations.push({
            id: item.id,
            title: item.title || 'Untitled',
            create_time: item.create_time,
            update_time: item.update_time,
          });
        }
      }
    } catch (e) {
      log.warn('Failed to parse captured API response');
    }
  }

  // If no API data, scrape from sidebar
  if (conversations.length === 0) {
    log.info('No API data captured, scraping from sidebar...');

    // Look for conversation links in the sidebar
    const conversationElements = await page.$$('nav a[href^="/c/"]');
    log.info(`Found ${conversationElements.length} conversation elements in sidebar`);

    for (const element of conversationElements.slice(0, maxConversations)) {
      try {
        const href = await element.getAttribute('href');
        const title = await element.textContent();

        if (href && title) {
          const id = href.replace('/c/', '');
          conversations.push({
            id,
            title: title.trim(),
            create_time: new Date().toISOString(),
            update_time: new Date().toISOString(),
          });
        }
      } catch (e) {
        // Skip elements that can't be read
      }
    }
  }

  log.info(`Scraped ${conversations.length} conversations`);

  return {
    conversations,
    total: conversations.length,
  };
}

export const chatgptScrape: ScriptDefinition<ChatGPTScrapeParams, ChatGPTScrapeResult> = {
  id: 'chatgpt-scrape',
  name: 'ChatGPT Data Scraper',
  description: 'Scrapes conversation history and memories from ChatGPT',
  version: '1.0.0',

  paramsSchema: {
    type: 'object',
    properties: {
      scopes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['conversations', 'memories'],
        },
      },
      maxConversations: {
        type: 'number',
        minimum: 1,
        maximum: 500,
        default: 50,
      },
    },
    required: ['scopes'],
  },

  async execute(ctx: ScriptContext): Promise<ChatGPTScrapeResult> {
    const params = ctx.params as unknown as ChatGPTScrapeParams;
    const scopes = params.scopes || ['conversations'];

    ctx.log.info('Starting ChatGPT scrape', { scopes });
    ctx.setStatus('Starting ChatGPT data collection...');

    await ensureLoggedIn(ctx);

    const result: ChatGPTScrapeResult = {};
    const totalScopes = scopes.length;
    let completedScopes = 0;

    for (const scope of scopes) {
      ctx.setProgress(completedScopes, totalScopes);

      try {
        switch (scope) {
          case 'conversations': {
            ctx.setStatus('Scraping conversations...');
            result.conversations = await scrapeConversations(ctx, params.maxConversations || 50);
            ctx.setData('conversations_count', result.conversations.total);
            break;
          }

          case 'memories': {
            ctx.setStatus('Scraping memories...');
            result.memories = await scrapeMemories(ctx);
            ctx.setData('memories_count', result.memories.total);
            break;
          }

          default:
            ctx.log.warn(`Unknown scope: ${scope}`);
        }
      } catch (error) {
        ctx.log.error(`Failed to scrape scope: ${scope}`, {
          error: (error as Error).message,
        });
      }

      completedScopes++;
    }

    ctx.setProgress(totalScopes, totalScopes);
    ctx.setStatus('ChatGPT data collection complete!');
    ctx.log.info('ChatGPT scrape complete', {
      scopes: Object.keys(result),
    });

    return result;
  },

  async onError(ctx: ScriptContext, error: Error): Promise<void> {
    ctx.log.error('ChatGPT scrape failed', { error: error.message });
    ctx.setData('error', error.message);
    ctx.setStatus(`Error: ${error.message}`);
  },
};

export const chatgptConversations: ScriptDefinition<{ maxConversations?: number }, ConversationsResult> = {
  id: 'chatgpt-conversations',
  name: 'ChatGPT Conversations',
  description: 'Extracts conversation list from ChatGPT',
  version: '1.0.0',

  paramsSchema: {
    type: 'object',
    properties: {
      maxConversations: {
        type: 'number',
        minimum: 1,
        maximum: 500,
        default: 50,
      },
    },
  },

  async execute(ctx: ScriptContext): Promise<ConversationsResult> {
    await ensureLoggedIn(ctx);
    const maxConversations = (ctx.params.maxConversations as number) || 50;
    const conversations = await scrapeConversations(ctx, maxConversations);
    ctx.setData('conversations', conversations);
    return conversations;
  },
};

export const chatgptMemories: ScriptDefinition<Record<string, never>, MemoriesResult> = {
  id: 'chatgpt-memories',
  name: 'ChatGPT Memories',
  description: 'Extracts all saved memories from ChatGPT',
  version: '1.0.0',

  paramsSchema: {
    type: 'object',
    properties: {},
  },

  async execute(ctx: ScriptContext): Promise<MemoriesResult> {
    await ensureLoggedIn(ctx);
    const memories = await scrapeMemories(ctx);
    ctx.setData('memories', memories);
    return memories;
  },
};
