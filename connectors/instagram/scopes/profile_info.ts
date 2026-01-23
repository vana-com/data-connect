/**
 * Profile Info Scope - Steel version
 */

import type { ScriptContext } from '../../../types/session.js';
import type { ProfileInfo } from '../schemas.js';
import { type InstagramWebInfo } from '../login.js';
import { extractProfileData, normalizeInstagramUrl, waitForNetworkIdle } from '../helpers.js';

export async function scrapeProfileInfo(
  ctx: ScriptContext,
  webInfo: InstagramWebInfo
): Promise<ProfileInfo> {
  const { page } = ctx;

  ctx.setStatus('Collecting profile information...');
  ctx.log.info('Starting profile_info scrape', { username: webInfo.username });

  ctx.captureNetwork({
    key: 'profile',
    urlPattern: /\/api\/v1\/users\/web_profile_info/,
  });

  ctx.captureNetwork({
    key: 'profile_graphql',
    urlPattern: /\/graphql/,
    bodyPattern: /PolarisProfilePageContentQuery|ProfilePageQuery|UserProfileQuery|UserByUsernameQuery/,
  });

  const profileUrl = normalizeInstagramUrl(webInfo.username);
  ctx.setStatus(`Navigating to profile: ${profileUrl}`);
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
  await waitForNetworkIdle(page, 5000);

  let profileInfo: ProfileInfo | null = null;

  const webProfileResponse = await ctx.getCapturedResponse('profile');
  if (webProfileResponse) {
    profileInfo = extractProfileData(webProfileResponse);
  }

  if (!profileInfo) {
    const graphqlResponse = await ctx.getCapturedResponse('profile_graphql');
    if (graphqlResponse) {
      profileInfo = extractProfileData(graphqlResponse);
    }
  }

  if (!profileInfo) {
    ctx.log.warn('API interception failed, falling back to DOM scraping');
    profileInfo = await scrapeProfileFromDOM(page, webInfo.username);
  }

  if (!profileInfo) {
    throw new Error('Failed to extract profile information');
  }

  ctx.setStatus(`Profile info collected for @${profileInfo.username}`);
  ctx.log.info('Profile info collected', {
    username: profileInfo.username,
    followers: profileInfo.followersCount,
    posts: profileInfo.postsCount,
  });

  return profileInfo;
}

async function scrapeProfileFromDOM(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  username: string
): Promise<ProfileInfo | null> {
  try {
    return await page.evaluate((username: string) => {
      const header = document.querySelector('header section');
      if (!header) return null;

      const statElements = header.querySelectorAll('ul li');
      let postsCount = 0;
      let followersCount = 0;
      let followingCount = 0;

      statElements.forEach((el: Element) => {
        const text = el.textContent?.toLowerCase() || '';
        const numMatch = text.match(/[\d,]+/);
        const num = numMatch ? parseInt(numMatch[0].replace(/,/g, ''), 10) : 0;

        if (text.includes('post')) postsCount = num;
        else if (text.includes('follower')) followersCount = num;
        else if (text.includes('following')) followingCount = num;
      });

      const fullNameEl = header.querySelector('span[class*="name"]') ||
        header.querySelector('h1 + span') ||
        document.querySelector('header h2');
      const bioEl = header.querySelector('div[class*="biography"]') ||
        header.querySelector('h1 ~ div');
      const avatarEl = header.querySelector('img[alt*="profile"]') ||
        header.querySelector('canvas + img');

      const verifiedEl = document.querySelector('[aria-label="Verified"]') ||
        document.querySelector('svg[aria-label="Verified"]');

      return {
        username,
        fullName: fullNameEl?.textContent?.trim() || '',
        bio: bioEl?.textContent?.trim() || '',
        avatarUrl: (avatarEl as HTMLImageElement)?.src || '',
        followersCount,
        followingCount,
        postsCount,
        isVerified: !!verifiedEl,
        isPrivate: false,
        isBusinessAccount: false,
        userId: '',
      };
    }, username);
  } catch {
    return null;
  }
}
