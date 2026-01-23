/**
 * Liked Posts Scope - Steel version
 */

import type { ScriptContext } from '../../../types/session.js';
import type { LikedPost, MediaType } from '../schemas.js';
import type { InstagramWebInfo } from '../login.js';
import { scrollToLoadMore, waitForNetworkIdle } from '../helpers.js';

const MAX_SCROLL_ATTEMPTS = 500;

export async function scrapeLikedPosts(
  ctx: ScriptContext,
  webInfo: InstagramWebInfo
): Promise<LikedPost[]> {
  const { page } = ctx;

  ctx.setStatus('Collecting all posts you\'ve liked...');
  ctx.log.info('Starting liked_posts scrape (scrolling to bottom)', {
    username: webInfo.username,
  });

  ctx.setStatus('Navigating to liked posts...');

  await page.goto('https://www.instagram.com/your_activity/interactions/likes/', {
    waitUntil: 'domcontentloaded',
  });
  await waitForNetworkIdle(page, 3000);

  const isOnLikesPage = await page.evaluate(() => {
    return window.location.href.includes('likes') ||
      document.body.textContent?.includes('Posts you\'ve liked') ||
      document.body.textContent?.includes('Likes');
  });

  if (!isOnLikesPage) {
    ctx.log.info('Direct likes URL failed, trying alternate navigation');

    await page.goto('https://www.instagram.com/accounts/access_tool/ads_interests', {
      waitUntil: 'domcontentloaded',
    });
    await waitForNetworkIdle(page, 3000);

    await navigateToLikesViaMenu(ctx);
  }

  ctx.log.info('Using DOM-based extraction for liked posts (bloks framework)');

  const likedPosts: LikedPost[] = [];
  const seenIds = new Set<string>();
  let scrollAttempts = 0;
  let noNewPostsCount = 0;

  while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
    scrollAttempts++;

    const domPosts = await page.evaluate(() => {
      const results: Array<{
        id: string;
        thumbnailUrl: string;
        mediaType: string;
      }> = [];
      const seen = new Set<string>();

      document.querySelectorAll('img[src*="instagram"]').forEach((img) => {
        const src = (img as HTMLImageElement).src;
        if (src.includes('s150x150') || src.includes('44x44') || src.includes('profile')) return;

        const cacheKeyMatch = src.match(/ig_cache_key=([^&]+)/);
        if (!cacheKeyMatch) return;

        const cacheKey = decodeURIComponent(cacheKeyMatch[1]);
        let mediaId = '';
        try {
          mediaId = atob(cacheKey).split('.')[0];
        } catch {
          mediaId = cacheKey;
        }

        if (!mediaId || seen.has(mediaId)) return;
        seen.add(mediaId);

        let mediaType = 'image';
        if (src.includes('t51.71878')) mediaType = 'video';

        results.push({
          id: mediaId,
          thumbnailUrl: src,
          mediaType,
        });
      });

      return results;
    });

    const newPosts = domPosts
      .filter((p) => !seenIds.has(p.id))
      .map((p) => ({
        id: p.id,
        shortcode: '',
        ownerUsername: '',
        ownerId: '',
        caption: '',
        mediaType: p.mediaType as MediaType,
        mediaUrl: p.thumbnailUrl,
        thumbnailUrl: p.thumbnailUrl,
        timestamp: new Date().toISOString(),
      }));

    ctx.log.info('DOM extraction results', {
      scrollAttempt: scrollAttempts,
      totalInDom: domPosts.length,
      newPosts: newPosts.length,
    });

    for (const post of newPosts) {
      if (!seenIds.has(post.id)) {
        seenIds.add(post.id);
        likedPosts.push(post);
      }
    }

    ctx.setStatus(`Collected ${likedPosts.length} liked posts, scrolling...`);

    if (newPosts.length === 0) {
      noNewPostsCount++;
      if (noNewPostsCount >= 3) {
        ctx.log.info('Reached bottom of liked posts', { totalCollected: likedPosts.length });
        break;
      }
    } else {
      noNewPostsCount = 0;
    }

    await scrollToLoadMore(page, 1500);
  }

  ctx.setStatus(`Collected ${likedPosts.length} liked posts`);
  ctx.log.info('Liked posts collection complete', {
    username: webInfo.username,
    postsCollected: likedPosts.length,
    scrollAttempts,
  });

  return likedPosts;
}

async function navigateToLikesViaMenu(ctx: ScriptContext): Promise<void> {
  const { page } = ctx;

  const activityLink = await page.$('a[href*="your_activity"]');
  if (activityLink) {
    await activityLink.click();
    await waitForNetworkIdle(page, 3000);
  }

  const likesLink = await page.$('a[href*="likes"]');
  if (likesLink) {
    await likesLink.click();
    await waitForNetworkIdle(page, 3000);
    return;
  }

  ctx.log.info('Could not find likes navigation, requesting takeover');
  await ctx.requestTakeover(
    'Please navigate to Settings > Your Activity > Likes, then click Continue',
    {
      timeout: 2 * 60 * 1000,
      autoComplete: {
        urlPattern: /likes/,
      },
    }
  );
}
