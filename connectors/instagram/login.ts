/**
 * Instagram Login - Steel version
 * Changed: import playwright instead of @cloudflare/playwright
 */

import type { Page } from 'playwright';
import type { ScriptContext } from '../../types/session.js';

export interface InstagramWebInfo {
  username: string;
  userId: string;
  fullName: string;
  isLoggedIn: boolean;
}

export async function checkLoginState(page: Page): Promise<InstagramWebInfo | null> {
  try {
    const webInfo = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sharedData = (window as any)._sharedData?.config?.viewer;
      if (sharedData?.username) {
        return {
          username: sharedData.username,
          userId: sharedData.id || '',
          fullName: sharedData.full_name || '',
          isLoggedIn: true,
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reduxState = (window as any).__REDUX_STATE__ ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__APOLLO_STATE__ ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__initialData;

      if (reduxState) {
        const stateStr = JSON.stringify(reduxState);
        const viewerMatch = stateStr.match(/"viewer":\s*\{[^}]*"username":\s*"([^"]+)"/);
        if (viewerMatch) {
          return {
            username: viewerMatch[1],
            userId: '',
            fullName: '',
            isLoggedIn: true,
          };
        }
      }

      const profileLinks = document.querySelectorAll('a[href^="/"]');
      for (const link of profileLinks) {
        const href = link.getAttribute('href');
        if (href && /^\/[a-zA-Z0-9._]+\/$/.test(href)) {
          const hasAvatar = link.querySelector('img[alt*="profile" i]') ||
            link.querySelector('img[alt$="\'s profile picture" i]') ||
            link.querySelector('span[style*="background-image"]');

          if (hasAvatar) {
            const username = href.replace(/\//g, '');
            const excluded = ['explore', 'reels', 'direct', 'accounts', 'stories', 'p', 'reel'];
            if (!excluded.includes(username.toLowerCase())) {
              return {
                username,
                userId: '',
                fullName: '',
                isLoggedIn: true,
              };
            }
          }
        }
      }

      const navLinks = document.querySelectorAll('nav a[href^="/"], div[role="tablist"] a[href^="/"]');
      for (const link of navLinks) {
        const href = link.getAttribute('href');
        const ariaLabel = link.getAttribute('aria-label')?.toLowerCase() || '';

        if (href && ariaLabel.includes('profile') && /^\/[a-zA-Z0-9._]+\/?$/.test(href)) {
          const username = href.replace(/\//g, '');
          const excluded = ['explore', 'reels', 'direct', 'accounts', 'stories', 'home'];
          if (!excluded.includes(username.toLowerCase())) {
            return {
              username,
              userId: '',
              fullName: '',
              isLoggedIn: true,
            };
          }
        }
      }

      const loginForm = document.querySelector('input[name="username"]') ||
        document.querySelector('form[id="loginForm"]') ||
        document.querySelector('button[type="submit"]');

      const isLoginPage = window.location.pathname.includes('/accounts/login');

      if (loginForm && isLoginPage) {
        return null;
      }

      const hasFeed = document.querySelector('article') ||
        document.querySelector('[role="feed"]') ||
        document.querySelector('main[role="main"]');

      if (hasFeed && !isLoginPage) {
        return {
          username: '__needs_profile_navigation__',
          userId: '',
          fullName: '',
          isLoggedIn: true,
        };
      }

      return null;
    });

    return webInfo;
  } catch (error) {
    console.error('[checkLoginState] Failed to check Instagram login state:', error);
    return null;
  }
}

export async function fetchWebInfo(page: Page): Promise<InstagramWebInfo | null> {
  try {
    const result = await page.evaluate(`
      (async () => {
        try {
          const response = await fetch("https://www.instagram.com/accounts/web_info/", {
            headers: { "X-Requested-With": "XMLHttpRequest" },
            credentials: "include"
          });
          if (!response.ok) return { error: 'response not ok', status: response.status };

          const html = await response.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const scripts = doc.querySelectorAll('script[type="application/json"][data-sjs]');

          const findPolarisData = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            if (Array.isArray(obj) && obj[0] === 'PolarisViewer' && obj.length >= 3) {
              return obj[2];
            }
            for (const key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const found = findPolarisData(obj[key]);
                if (found) return found;
              }
            }
            return null;
          };

          let foundData = null;
          for (const script of scripts) {
            try {
              const jsonContent = JSON.parse(script.textContent);
              foundData = findPolarisData(jsonContent);
              if (foundData) break;
            } catch (e) {}
          }

          if (foundData && foundData.data) {
            return { success: true, data: foundData.data };
          }
          return { error: 'no polaris data found', scriptsCount: scripts.length };
        } catch (err) {
          return { error: err.message };
        }
      })()
    `) as { success?: boolean; data?: { username?: string; id?: string; full_name?: string }; error?: string; scriptsCount?: number };

    console.log('[fetchWebInfo] Result:', JSON.stringify(result));

    if (result && result.success && result.data) {
      return {
        username: result.data.username || '',
        userId: result.data.id || '',
        fullName: result.data.full_name || '',
        isLoggedIn: !!result.data.username,
      };
    }

    console.log('[fetchWebInfo] Failed to get user info:', result?.error || 'unknown');
    return null;
  } catch (err) {
    console.error('[fetchWebInfo] Error:', err);
    return null;
  }
}

async function dismissInterstitials(page: Page): Promise<void> {
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    await page.waitForTimeout(500);

    const dismissed = await page.evaluate(() => {
      const dismissTexts = ['not now', 'skip', 'cancel', 'later', 'close', 'not now', 'dismiss'];
      const buttons = document.querySelectorAll('button, div[role="button"], a, span[role="button"]');

      for (const btn of buttons) {
        const text = (btn.textContent || '').trim().toLowerCase();
        if (dismissTexts.some(t => text === t)) {
          console.log('[dismissInterstitials] Found dismiss button:', text);
          (btn as HTMLElement).click();
          return { dismissed: true, text };
        }
      }

      const notNowLinks = document.querySelectorAll('a, button, div[role="button"]');
      for (const link of notNowLinks) {
        const text = (link.textContent || '').trim();
        if (text.toLowerCase() === 'not now') {
          console.log('[dismissInterstitials] Found Not Now link');
          (link as HTMLElement).click();
          return { dismissed: true, text: 'Not Now link' };
        }
      }

      const closeBtn = document.querySelector('[aria-label="Close"]') ||
        document.querySelector('[aria-label="Dismiss"]') ||
        document.querySelector('svg[aria-label="Close"]')?.closest('button');

      if (closeBtn) {
        console.log('[dismissInterstitials] Found close button');
        (closeBtn as HTMLElement).click();
        return { dismissed: true, text: 'close button' };
      }

      const saveLoginDialog = document.body.innerText.includes('Save your login info');
      const notificationsDialog = document.body.innerText.includes('Turn on Notifications');

      if (saveLoginDialog || notificationsDialog) {
        const allClickables = document.querySelectorAll('button, a, div[role="button"]');
        for (const el of allClickables) {
          const text = (el.textContent || '').trim().toLowerCase();
          if (text.includes('not') || text.includes('skip') || text.includes('later')) {
            console.log('[dismissInterstitials] Found secondary action:', text);
            (el as HTMLElement).click();
            return { dismissed: true, text };
          }
        }
      }

      return { dismissed: false };
    });

    if (dismissed.dismissed) {
      console.log('[dismissInterstitials] Dismissed:', dismissed.text);
      await page.waitForTimeout(1500);
    } else {
      const onMainPage = await page.evaluate(() => {
        const url = window.location.href;
        return url === 'https://www.instagram.com/' ||
               url.includes('instagram.com/?') ||
               (document.querySelector('article') !== null && !document.body.innerText.includes('Save your login'));
      });

      if (onMainPage) {
        break;
      }

      await page.waitForTimeout(1000);
    }
  }

  const stillOnInterstitial = await page.evaluate(() => {
    return document.body.innerText.includes('Save your login info') ||
           document.body.innerText.includes('Turn on Notifications');
  });

  if (stillOnInterstitial) {
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  }
}

async function extractUsernameFromProfileLink(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const allLinks = document.querySelectorAll('a[href^="/"]');

    for (const link of allLinks) {
      const href = link.getAttribute('href') || '';
      const ariaLabel = (link.getAttribute('aria-label') || '').toLowerCase();
      const textContent = (link.textContent || '').trim().toLowerCase();

      const isProfileLink = ariaLabel === 'profile' ||
        textContent === 'profile' ||
        (link.querySelector('span')?.textContent?.trim().toLowerCase() === 'profile');

      if (isProfileLink && href) {
        const match = href.match(/^\/([a-zA-Z0-9._]+)\/?$/);
        if (match) {
          const username = match[1];
          const reserved = ['explore', 'reels', 'direct', 'accounts', 'stories', 'p', 'reel', 'home', 'search', 'create', 'notifications', 'messages'];
          if (!reserved.includes(username.toLowerCase())) {
            return username;
          }
        }
      }
    }

    const avatarLinks = document.querySelectorAll('a[href^="/"]');
    for (const link of avatarLinks) {
      const href = link.getAttribute('href') || '';
      const img = link.querySelector('img');
      const altText = (img?.getAttribute('alt') || '').toLowerCase();

      if (altText.includes('profile picture') || altText.includes("'s profile")) {
        const match = href.match(/^\/([a-zA-Z0-9._]+)\/?$/);
        if (match) {
          const username = match[1];
          const reserved = ['explore', 'reels', 'direct', 'accounts', 'stories', 'p', 'reel', 'home', 'search'];
          if (!reserved.includes(username.toLowerCase())) {
            return username;
          }
        }
      }
    }

    return null;
  });
}

export async function getUsernameFromProfilePage(page: Page, ctx: ScriptContext): Promise<string> {
  ctx.setStatus('Finding your profile...');

  const profileHref = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href^="/"]');
    const debugInfo: string[] = [];

    for (const link of links) {
      const href = link.getAttribute('href') || '';
      const text = (link.textContent || '').trim();
      const ariaLabel = link.getAttribute('aria-label') || '';

      const hasProfileText = text.toLowerCase().includes('profile') ||
        ariaLabel.toLowerCase().includes('profile');

      const hasAvatar = link.querySelector('img') !== null ||
        link.querySelector('span[style*="background"]') !== null;

      if (hasProfileText || (hasAvatar && href.match(/^\/[a-zA-Z0-9._]+\/?$/))) {
        debugInfo.push(`Link: href=${href}, text=${text}, aria=${ariaLabel}, hasAvatar=${hasAvatar}`);
      }

      if (hasProfileText && href) {
        const match = href.match(/^\/([a-zA-Z0-9._]+)\/?$/);
        if (match) {
          const username = match[1];
          const reserved = ['explore', 'reels', 'direct', 'accounts', 'stories', 'p', 'reel', 'home', 'search', 'create', 'notifications', 'messages'];
          if (!reserved.includes(username.toLowerCase())) {
            return { username, debug: debugInfo };
          }
        }
      }
    }

    return { username: null, debug: debugInfo };
  });

  ctx.log.info('Profile link search', { debug: profileHref.debug });

  if (profileHref.username) {
    return profileHref.username;
  }

  ctx.log.info('Trying to click Profile link...');

  const clicked = await page.evaluate(() => {
    const allElements = document.querySelectorAll('a, div[role="button"], span');
    for (const el of allElements) {
      const text = (el.textContent || '').trim();
      if (text === 'Profile') {
        const link = el.closest('a') || el;
        (link as HTMLElement).click();
        return 'clicked-by-text';
      }
    }

    const sidebarLinks = document.querySelectorAll('nav a[href^="/"], aside a[href^="/"]');
    for (const link of sidebarLinks) {
      const href = link.getAttribute('href') || '';
      if (href.match(/^\/[a-zA-Z0-9._]+\/?$/) && link.querySelector('img')) {
        const reserved = ['explore', 'reels', 'direct', 'accounts', 'stories'];
        const potentialUsername = href.replace(/\//g, '');
        if (!reserved.includes(potentialUsername.toLowerCase())) {
          (link as HTMLElement).click();
          return 'clicked-by-avatar';
        }
      }
    }

    return null;
  });

  ctx.log.info('Click result', { clicked });

  if (clicked) {
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});

    const url = page.url();
    ctx.log.info('Current URL after click', { url });

    const match = url.match(/instagram\.com\/([a-zA-Z0-9._]+)\/?(\?|$)/);
    if (match) {
      const username = match[1];
      const reserved = ['explore', 'reels', 'direct', 'accounts', 'stories', 'p', 'reel', 'home'];
      if (!reserved.includes(username.toLowerCase())) {
        return username;
      }
    }
  }

  ctx.log.warn('Could not auto-detect username, requesting takeover');
  await ctx.requestTakeover('Please click on your Profile in the sidebar', {
    timeout: 60 * 1000,
    autoComplete: {
      urlPattern: /instagram\.com\/[a-zA-Z0-9._]+\/?$/,
      pollInterval: 500,
    },
  });

  const finalUrl = page.url();
  const finalMatch = finalUrl.match(/instagram\.com\/([a-zA-Z0-9._]+)\/?/);
  if (finalMatch) {
    const username = finalMatch[1];
    const reserved = ['explore', 'reels', 'direct', 'accounts', 'stories', 'p', 'reel', 'home'];
    if (!reserved.includes(username.toLowerCase())) {
      return username;
    }
  }

  throw new Error('Could not determine username from URL');
}

export async function ensureLoggedIn(ctx: ScriptContext): Promise<InstagramWebInfo> {
  const { page } = ctx;

  ctx.setStatus('Checking Instagram login status...');

  await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  let webInfo = await fetchWebInfo(page);

  if (webInfo?.isLoggedIn && webInfo.username) {
    ctx.setStatus(`Logged in as @${webInfo.username}`);
    ctx.log.info('User already logged in', { username: webInfo.username });
    return webInfo;
  }

  ctx.setStatus('Not logged in. Redirecting to login page...');
  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  try {
    const usernameInput = await page.$('input[name="username"]');
    if (usernameInput) {
      await usernameInput.click();
      ctx.log.info('Focused on username input');
    }
  } catch (e) {
    ctx.log.warn('Could not focus username input', { error: String(e) });
  }

  ctx.log.info('Requesting user takeover for login');
  await ctx.requestTakeover('Please log in to your Instagram account', {
    timeout: 5 * 60 * 1000,
    autoComplete: {
      networkPattern: /facebook\.com\/ig_xsite_user_info|instagram\.com\/api\/v1\/web\/accounts\/web_info|instagram\.com\/accounts\/web_info|instagram\.com\/api\/graphql|instagram\.com\/ajax\/bulk-route-definitions/,
      selector: 'svg[aria-label="Home"], a[href="/direct/inbox/"], nav a[href="/"]',
      pollInterval: 500,
    },
  });

  ctx.setStatus('Verifying login...');

  ctx.log.info('Navigating to home after takeover');
  await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await dismissInterstitials(page);
  await page.waitForTimeout(1000);

  webInfo = await fetchWebInfo(page);
  ctx.log.info('fetchWebInfo result', { webInfo });

  if (webInfo?.isLoggedIn && webInfo.username) {
    ctx.setStatus(`Successfully logged in as @${webInfo.username}`);
    ctx.log.info('Login successful via fetchWebInfo', { username: webInfo.username });
    return webInfo;
  }

  ctx.log.info('fetchWebInfo failed, trying DOM-based detection');
  const domWebInfo = await checkLoginState(page);
  ctx.log.info('checkLoginState result', { domWebInfo });

  if (domWebInfo?.isLoggedIn) {
    if (domWebInfo.username === '__needs_profile_navigation__' || !domWebInfo.username) {
      const extractedUsername = await extractUsernameFromProfileLink(page);
      if (extractedUsername) {
        domWebInfo.username = extractedUsername;
      }
    }

    if (domWebInfo.username && domWebInfo.username !== '__needs_profile_navigation__') {
      ctx.setStatus(`Successfully logged in as @${domWebInfo.username}`);
      ctx.log.info('Login successful via DOM detection', { username: domWebInfo.username });
      return domWebInfo;
    }
  }

  throw new Error('Login failed - could not verify logged in state after takeover');
}

export async function handle2FA(ctx: ScriptContext): Promise<void> {
  const { page } = ctx;

  const is2FAPage = await page.evaluate(() => {
    const url = window.location.href;
    const has2FAInput = !!document.querySelector('input[name="verificationCode"]') ||
      !!document.querySelector('input[placeholder*="code"]');
    return url.includes('two_factor') || has2FAInput;
  });

  if (is2FAPage) {
    ctx.setStatus('Two-factor authentication required');
    ctx.log.info('2FA page detected, requesting takeover');

    await ctx.requestTakeover('Please enter your two-factor authentication code', {
      timeout: 3 * 60 * 1000,
      autoComplete: {
        networkPattern: /facebook\.com\/ig_xsite_user_info|instagram\.com\/api\/v1\/web\/accounts\/web_info|instagram\.com\/api\/graphql/,
        selector: 'svg[aria-label="Home"], a[href="/direct/inbox/"], nav a[href="/"]',
        pollInterval: 500,
      },
    });
  }
}

export async function handleChallenge(ctx: ScriptContext): Promise<void> {
  const { page } = ctx;

  const isChallengePage = await page.evaluate(() => {
    const url = window.location.href;
    return url.includes('challenge') || url.includes('checkpoint');
  });

  if (isChallengePage) {
    ctx.setStatus('Security challenge detected');
    ctx.log.info('Challenge page detected, requesting takeover');

    await ctx.requestTakeover('Please complete the security verification', {
      timeout: 5 * 60 * 1000,
      autoComplete: {
        networkPattern: /facebook\.com\/ig_xsite_user_info|instagram\.com\/api\/v1\/web\/accounts\/web_info|instagram\.com\/api\/graphql/,
        selector: 'svg[aria-label="Home"], a[href="/direct/inbox/"], nav a[href="/"]',
        pollInterval: 500,
      },
    });
  }
}
