/**
 * Instagram Connector - Steel version
 */

import type { ScriptDefinition, ScriptContext } from '../../types/session.js';
import type {
  InstagramScrapeResult,
  InstagramScrapeParams,
  ProfileInfo,
  Post,
  LikedPost,
} from './schemas.js';
import { ensureLoggedIn } from './login.js';
import { scrapeProfileInfo } from './scopes/profile_info.js';
import { scrapePosts } from './scopes/posts.js';
import { scrapeLikedPosts } from './scopes/liked_posts.js';

export * from './schemas.js';
export * from './login.js';
export * from './helpers.js';
export * from './scopes/index.js';

export const instagramScrape: ScriptDefinition<
  InstagramScrapeParams,
  InstagramScrapeResult
> = {
  id: 'instagram-scrape',
  name: 'Instagram Data Scraper',
  description: 'Scrapes profile data and content from Instagram based on requested scopes',
  version: '1.0.0',

  paramsSchema: {
    type: 'object',
    properties: {
      scopes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['profile_info', 'posts', 'liked_posts', 'comments', 'ads_targeted'],
        },
      },
      maxPosts: {
        type: 'number',
        minimum: 1,
        maximum: 500,
        default: 50,
      },
      maxLikedPosts: {
        type: 'number',
        minimum: 1,
        maximum: 500,
        default: 50,
      },
      maxComments: {
        type: 'number',
        minimum: 1,
        maximum: 500,
        default: 50,
      },
      maxAds: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 20,
      },
    },
    required: ['scopes'],
  },

  async execute(ctx: ScriptContext): Promise<InstagramScrapeResult> {
    const params = ctx.params as unknown as InstagramScrapeParams;
    const scopes = params.scopes || ['profile_info'];

    ctx.log.info('Starting Instagram scrape', { scopes });
    ctx.setStatus('Starting Instagram data collection...');

    const webInfo = await ensureLoggedIn(ctx);
    ctx.setData('username', webInfo.username);

    const result: InstagramScrapeResult = {};
    const totalScopes = scopes.length;
    let completedScopes = 0;

    for (const scope of scopes) {
      ctx.setProgress(completedScopes, totalScopes);

      try {
        switch (scope) {
          case 'profile_info': {
            ctx.setStatus('Scraping profile info...');
            result.profile_info = await scrapeProfileInfo(ctx, webInfo);
            ctx.setData('profile_info', result.profile_info);
            break;
          }

          case 'posts': {
            ctx.setStatus('Scraping posts...');
            result.posts = await scrapePosts(
              ctx,
              webInfo,
              params.maxPosts || 50
            );
            ctx.setData('posts_count', result.posts.length);
            break;
          }

          case 'liked_posts': {
            ctx.setStatus('Scraping liked posts...');
            result.liked_posts = await scrapeLikedPosts(ctx, webInfo);
            ctx.setData('liked_posts_count', result.liked_posts.length);
            break;
          }

          case 'comments': {
            ctx.setStatus('Comments scraping not yet implemented');
            ctx.log.warn('Comments scope not implemented');
            result.comments = [];
            break;
          }

          case 'ads_targeted': {
            ctx.setStatus('Ads scraping not yet implemented');
            ctx.log.warn('Ads scope not implemented');
            result.ads_targeted = [];
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
    ctx.setStatus('Instagram data collection complete!');
    ctx.log.info('Instagram scrape complete', {
      username: webInfo.username,
      scopes: Object.keys(result),
    });

    return result;
  },

  async onError(ctx: ScriptContext, error: Error): Promise<void> {
    ctx.log.error('Instagram scrape failed', { error: error.message });
    ctx.setData('error', error.message);
    ctx.setStatus(`Error: ${error.message}`);
  },
};

export const instagramProfileInfo: ScriptDefinition<Record<string, never>, ProfileInfo> = {
  id: 'instagram-profile-info',
  name: 'Instagram Profile Info',
  description: 'Extracts profile information from Instagram',
  version: '1.0.0',

  async execute(ctx: ScriptContext): Promise<ProfileInfo> {
    const webInfo = await ensureLoggedIn(ctx);
    const profileInfo = await scrapeProfileInfo(ctx, webInfo);
    ctx.setData('profile_info', profileInfo);
    return profileInfo;
  },
};

export const instagramPosts: ScriptDefinition<{ maxPosts?: number }, Post[]> = {
  id: 'instagram-posts',
  name: 'Instagram Posts',
  description: 'Extracts user posts from Instagram',
  version: '1.0.0',

  paramsSchema: {
    type: 'object',
    properties: {
      maxPosts: {
        type: 'number',
        minimum: 1,
        maximum: 500,
        default: 50,
      },
    },
  },

  async execute(ctx: ScriptContext): Promise<Post[]> {
    const webInfo = await ensureLoggedIn(ctx);
    const maxPosts = (ctx.params.maxPosts as number) || 50;
    const posts = await scrapePosts(ctx, webInfo, maxPosts);
    ctx.setData('posts', posts);
    return posts;
  },
};

export const instagramLikedPosts: ScriptDefinition<Record<string, never>, LikedPost[]> = {
  id: 'instagram-liked-posts',
  name: 'Instagram Liked Posts',
  description: 'Extracts all posts the user has liked from Instagram',
  version: '1.0.0',

  async execute(ctx: ScriptContext): Promise<LikedPost[]> {
    const webInfo = await ensureLoggedIn(ctx);
    const likedPosts = await scrapeLikedPosts(ctx, webInfo);
    ctx.setData('liked_posts', likedPosts);
    return likedPosts;
  },
};
