/**
 * Posts Scope - Steel version
 */

import type { ScriptContext, CapturedResponse } from '../../../types/session.js';
import type { Post } from '../schemas.js';
import type { InstagramWebInfo } from '../login.js';
import { normalizeInstagramUrl } from '../helpers.js';

const DEFAULT_MAX_POSTS = 50;
const MAX_SCROLL_ATTEMPTS = 20;

function extractPostsFromResponse(response: CapturedResponse): Post[] {
  try {
    const json = JSON.parse(response.body);

    const timelineData = json?.data?.xdt_api__v1__feed__user_timeline_graphql_connection;

    if (!timelineData?.edges) {
      console.log('[extractPostsFromResponse] No timeline data found in response');
      return [];
    }

    const edges = timelineData.edges || [];
    console.log(`[extractPostsFromResponse] Found ${edges.length} posts in response`);

    return edges.map((edge: { node: Record<string, unknown> }) => {
      const node = edge.node;

      const imgUrl = (node.image_versions2 as { candidates?: Array<{ url: string }> })?.candidates?.[0]?.url ||
        (node.carousel_media as Array<{ image_versions2?: { candidates?: Array<{ url: string }> } }>)?.[0]?.image_versions2?.candidates?.[0]?.url || '';

      const videoUrl = (node.video_versions as Array<{ url: string }>)?.[0]?.url;
      const caption = (node.caption as { text?: string })?.text || '';

      let mediaType: 'image' | 'video' | 'carousel' = 'image';
      if (node.media_type === 2 || videoUrl) {
        mediaType = 'video';
      } else if (node.media_type === 8 || node.carousel_media) {
        mediaType = 'carousel';
      }

      return {
        id: (node.id || node.pk || node.media_id || '') as string,
        shortcode: (node.code || '') as string,
        caption,
        mediaType,
        mediaUrl: videoUrl || imgUrl,
        thumbnailUrl: imgUrl,
        timestamp: node.taken_at ? new Date((node.taken_at as number) * 1000).toISOString() : new Date().toISOString(),
        likeCount: (node.like_count || 0) as number,
        commentCount: (node.comment_count || 0) as number,
        commentsDisabled: false,
      };
    });
  } catch (error) {
    console.error('[extractPostsFromResponse] Error:', error);
    return [];
  }
}

export async function scrapePosts(
  ctx: ScriptContext,
  webInfo: InstagramWebInfo,
  maxPosts: number = DEFAULT_MAX_POSTS
): Promise<Post[]> {
  const { page } = ctx;

  ctx.setStatus('Collecting your posts...');
  ctx.log.info('Starting posts scrape', {
    username: webInfo.username,
    maxPosts,
  });

  ctx.captureNetwork({
    key: 'postsResponse',
    urlPattern: /\/graphql/,
    bodyPattern: /PolarisProfilePostsQuery|PolarisProfilePostsTabContentQuery_connection|ProfilePostsQuery|UserMediaQuery/,
  });

  const profileUrl = normalizeInstagramUrl(webInfo.username);
  ctx.setStatus(`Navigating to profile: @${webInfo.username}`);
  await page.goto(profileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  ctx.setStatus('Waiting for posts data...');
  let postsResponse: CapturedResponse | null = null;
  let attempts = 0;
  const maxWaitAttempts = 30;

  while (attempts < maxWaitAttempts && !postsResponse) {
    await page.waitForTimeout(1000);
    attempts++;
    postsResponse = await ctx.getCapturedResponse('postsResponse');
    if (postsResponse) {
      ctx.log.info('Posts data captured!');
    }
  }

  if (!postsResponse) {
    ctx.setStatus('Scrolling to load posts...');
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await page.waitForTimeout(2000);
    postsResponse = await ctx.getCapturedResponse('postsResponse');
  }

  if (!postsResponse) {
    ctx.log.warn('Could not capture posts response');
    return [];
  }

  let allPosts = extractPostsFromResponse(postsResponse);
  ctx.log.info(`Initial capture: ${allPosts.length} posts`);
  ctx.setStatus(`Captured ${allPosts.length} posts`);
  ctx.setData('posts_count', allPosts.length);

  if (allPosts.length < maxPosts && allPosts.length > 0) {
    let scrollAttempts = 0;
    let hasMore = true;

    while (hasMore && scrollAttempts < MAX_SCROLL_ATTEMPTS && allPosts.length < maxPosts) {
      scrollAttempts++;
      ctx.setStatus(`Fetching more posts... (${allPosts.length} so far)`);

      ctx.captureNetwork({
        key: 'postsResponse',
        urlPattern: /\/graphql/,
        bodyPattern: /PolarisProfilePostsQuery|PolarisProfilePostsTabContentQuery_connection|ProfilePostsQuery|UserMediaQuery/,
      });

      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForTimeout(2000);

      const nextResponse = await ctx.getCapturedResponse('postsResponse');
      if (nextResponse) {
        const newPosts = extractPostsFromResponse(nextResponse);

        const existingIds = new Set(allPosts.map(p => p.id));
        const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));

        if (uniqueNewPosts.length > 0) {
          allPosts = [...allPosts, ...uniqueNewPosts];
          ctx.setStatus(`Captured ${allPosts.length} posts`);
          ctx.setData('posts_count', allPosts.length);
          ctx.log.info(`Added ${uniqueNewPosts.length} new posts, total: ${allPosts.length}`);
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
  }

  const finalPosts = allPosts.slice(0, maxPosts);

  ctx.setStatus(`Collected ${finalPosts.length} posts`);
  ctx.log.info('Posts collection complete', {
    username: webInfo.username,
    postsCollected: finalPosts.length,
  });

  return finalPosts;
}

export async function scrapePostDetails(
  ctx: ScriptContext,
  shortcode: string
): Promise<Post | null> {
  const { page } = ctx;

  ctx.captureNetwork({
    key: 'post_detail',
    urlPattern: /\/graphql\/query/,
    bodyPattern: /PolarisPostQuery|shortcode_media/,
  });

  await page.goto(`https://www.instagram.com/p/${shortcode}/`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(3000);

  const response = await ctx.getCapturedResponse('post_detail');
  if (!response) return null;

  const posts = extractPostsFromResponse(response);
  return posts[0] || null;
}
