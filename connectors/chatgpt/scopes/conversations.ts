/**
 * ChatGPT Conversations Scope
 *
 * Fetches conversation list from ChatGPT by intercepting API responses
 */

import type { ScriptContext } from '../../../types/session.js';
import type { ConversationListItem, ConversationsResult } from '../schemas.js';

export async function fetchConversations(ctx: ScriptContext): Promise<ConversationsResult> {
  const { page, log } = ctx;

  log.info('Fetching ChatGPT conversations...');

  // Set up network capture for conversations API
  const capturedConversations: ConversationListItem[] = [];

  // Capture conversation list API responses
  ctx.captureNetwork({
    key: 'conversations',
    urlPattern: /backend-api\/conversations/,
  });

  // Navigate to ChatGPT
  log.info('Navigating to ChatGPT...');
  await page.goto('https://chatgpt.com/', { waitUntil: 'networkidle' });

  // Wait for the page to load
  await page.waitForTimeout(3000);

  // Check if we need to log in
  const loginButton = await page.$('button[data-testid="login-button"]');
  if (loginButton) {
    log.info('Login required, requesting takeover...');

    // Request user takeover for login
    await ctx.requestTakeover('Please log in to ChatGPT to continue.', {
      autoComplete: {
        urlPattern: /chatgpt\.com\/?$/,
        selector: '[data-testid="conversation-turn"]',
      }
    });

    log.info('Login completed, continuing...');
  }

  // Wait for conversations to load in sidebar
  await page.waitForTimeout(2000);

  // Try to get conversations from the API response we captured
  const capturedResponse = await ctx.getCapturedResponse('conversations');
  if (capturedResponse?.body) {
    try {
      const convData = JSON.parse(capturedResponse.body) as { items?: ConversationListItem[] };
      if (convData.items) {
        capturedConversations.push(...convData.items);
      }
    } catch (e) {
      log.warn('Failed to parse captured conversation data');
    }
  }

  // If we didn't capture from network, try to scrape from sidebar
  if (capturedConversations.length === 0) {
    log.info('Scraping conversations from sidebar...');

    // Look for conversation links in the sidebar
    const conversationElements = await page.$$('nav a[href^="/c/"]');

    for (const element of conversationElements) {
      try {
        const href = await element.getAttribute('href');
        const title = await element.textContent();

        if (href && title) {
          const id = href.replace('/c/', '');
          capturedConversations.push({
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

  log.info(`Found ${capturedConversations.length} conversations`);

  return {
    conversations: capturedConversations,
    total: capturedConversations.length,
  };
}
