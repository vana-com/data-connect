/**
 * Instagram Helpers - Steel version
 * Changed: import playwright instead of @cloudflare/playwright
 */

import type { Page } from 'playwright';
import type { CapturedResponse } from '../../types/session.js';
import type { Post, LikedPost, ProfileInfo, MediaType } from './schemas.js';

interface IGGraphQLUser {
  id: string;
  username: string;
  full_name: string;
  biography: string;
  profile_pic_url_hd?: string;
  profile_pic_url?: string;
  external_url?: string;
  edge_followed_by?: { count: number };
  edge_follow?: { count: number };
  edge_owner_to_timeline_media?: { count: number };
  is_verified?: boolean;
  is_private?: boolean;
  is_business_account?: boolean;
  business_category_name?: string;
}

interface IGGraphQLMedia {
  id: string;
  shortcode: string;
  __typename: string;
  display_url: string;
  thumbnail_src?: string;
  video_url?: string;
  is_video: boolean;
  edge_media_to_caption?: { edges: Array<{ node: { text: string } }> };
  taken_at_timestamp: number;
  edge_liked_by?: { count: number };
  edge_media_preview_like?: { count: number };
  edge_media_to_comment?: { count: number };
  location?: { id: string; name: string; slug?: string };
  edge_media_to_tagged_user?: { edges: Array<{ node: { user: { username: string } } }> };
  comments_disabled?: boolean;
  video_duration?: number;
  video_view_count?: number;
  edge_sidecar_to_children?: { edges: Array<{ node: IGGraphQLMedia }> };
  owner?: { id: string; username: string };
}

interface IGAPIUser {
  id?: string;
  pk?: string;
  username: string;
  full_name?: string;
  biography?: string;
  profile_pic_url?: string;
  profile_pic_url_hd?: string;
  hd_profile_pic_url_info?: { url: string };
  external_url?: string;
  follower_count?: number;
  following_count?: number;
  media_count?: number;
  is_verified?: boolean;
  is_private?: boolean;
  is_business?: boolean;
  is_professional_account?: boolean;
  business_category_name?: string;
  account_type?: number;
}

export function extractProfileData(response: CapturedResponse): ProfileInfo | null {
  try {
    const json = JSON.parse(response.body);

    const legacyUser: IGGraphQLUser | undefined =
      json.data?.user ||
      json.graphql?.user;

    const apiUser: IGAPIUser | undefined =
      json.data?.data?.user ||
      json.data?.xdt_api__v1__users__web_profile_info?.data?.user;

    if (apiUser) {
      return {
        username: apiUser.username,
        fullName: apiUser.full_name || '',
        bio: apiUser.biography || '',
        avatarUrl: apiUser.hd_profile_pic_url_info?.url || apiUser.profile_pic_url_hd || apiUser.profile_pic_url || '',
        externalUrl: apiUser.external_url || undefined,
        followersCount: apiUser.follower_count || 0,
        followingCount: apiUser.following_count || 0,
        postsCount: apiUser.media_count || 0,
        isVerified: apiUser.is_verified || false,
        isPrivate: apiUser.is_private || false,
        isBusinessAccount: apiUser.is_business || apiUser.is_professional_account || false,
        businessCategory: apiUser.business_category_name || undefined,
        userId: apiUser.id || apiUser.pk || '',
      };
    }

    if (legacyUser) {
      return {
        username: legacyUser.username,
        fullName: legacyUser.full_name || '',
        bio: legacyUser.biography || '',
        avatarUrl: legacyUser.profile_pic_url_hd || legacyUser.profile_pic_url || '',
        externalUrl: legacyUser.external_url || undefined,
        followersCount: legacyUser.edge_followed_by?.count || 0,
        followingCount: legacyUser.edge_follow?.count || 0,
        postsCount: legacyUser.edge_owner_to_timeline_media?.count || 0,
        isVerified: legacyUser.is_verified || false,
        isPrivate: legacyUser.is_private || false,
        isBusinessAccount: legacyUser.is_business_account || false,
        businessCategory: legacyUser.business_category_name || undefined,
        userId: legacyUser.id,
      };
    }

    return null;
  } catch (error) {
    console.error('[extractProfileData] Error parsing response:', error);
    return null;
  }
}

function getMediaType(media: IGGraphQLMedia): MediaType {
  if (media.__typename === 'GraphSidecar' || media.edge_sidecar_to_children) {
    return 'carousel';
  }
  if (media.is_video || media.__typename === 'GraphVideo') {
    return 'video';
  }
  return 'image';
}

function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#[\w\u0080-\uFFFF]+/g);
  return matches ? matches.map((tag) => tag.slice(1)) : [];
}

interface IGAPIMediaNode {
  id?: string;
  pk?: string;
  code?: string;
  media_id?: string;
  media_type?: number;
  image_versions2?: { candidates?: Array<{ url: string }> };
  carousel_media?: Array<{ image_versions2?: { candidates?: Array<{ url: string }> } }>;
  video_versions?: Array<{ url: string }>;
  caption?: { text: string };
  like_count?: number;
  comment_count?: number;
  taken_at?: number;
  location?: { pk: string; name: string; short_name?: string };
  usertags?: { in: Array<{ user: { username: string } }> };
  video_duration?: number;
  play_count?: number;
}

export function extractPosts(response: CapturedResponse): {
  posts: Post[];
  hasMore: boolean;
  endCursor?: string;
} {
  try {
    const json = JSON.parse(response.body);

    const xdtTimeline = json.data?.xdt_api__v1__feed__user_timeline_graphql_connection;
    const legacyTimeline =
      json.data?.user?.edge_owner_to_timeline_media ||
      json.graphql?.user?.edge_owner_to_timeline_media;

    if (xdtTimeline) {
      const edges = xdtTimeline.edges || [];
      const pageInfo = xdtTimeline.page_info || {};

      const posts: Post[] = edges.map((edge: { node: IGAPIMediaNode }) => {
        const node = edge.node;

        const imgUrl = node.image_versions2?.candidates?.[0]?.url ||
          node.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url || '';

        const videoUrl = node.video_versions?.[0]?.url;
        const caption = node.caption?.text || '';

        let mediaType: MediaType = 'image';
        if (node.media_type === 2 || videoUrl) {
          mediaType = 'video';
        } else if (node.media_type === 8 || node.carousel_media) {
          mediaType = 'carousel';
        }

        let mediaUrls: string[] | undefined;
        if (node.carousel_media) {
          mediaUrls = node.carousel_media.map(
            (item) => item.image_versions2?.candidates?.[0]?.url || ''
          ).filter(Boolean);
        }

        const taggedUsers = node.usertags?.in?.map(
          (tag) => tag.user.username
        );

        const post: Post = {
          id: node.id || node.pk || node.media_id || '',
          shortcode: node.code || '',
          caption,
          mediaType,
          mediaUrl: videoUrl || imgUrl,
          thumbnailUrl: imgUrl,
          mediaUrls,
          timestamp: node.taken_at ? new Date(node.taken_at * 1000).toISOString() : new Date().toISOString(),
          likeCount: node.like_count || 0,
          commentCount: node.comment_count || 0,
          location: node.location
            ? {
                id: node.location.pk,
                name: node.location.name,
                slug: node.location.short_name,
              }
            : undefined,
          taggedUsers,
          hashtags: extractHashtags(caption),
          commentsDisabled: false,
          videoDuration: node.video_duration,
          videoViewCount: node.play_count,
        };

        return post;
      });

      return {
        posts,
        hasMore: pageInfo.has_next_page || false,
        endCursor: pageInfo.end_cursor,
      };
    }

    if (legacyTimeline) {
      const edges = legacyTimeline.edges || [];
      const pageInfo = legacyTimeline.page_info || {};

      const posts: Post[] = edges.map((edge: { node: IGGraphQLMedia }) => {
        const media = edge.node;
        const caption =
          media.edge_media_to_caption?.edges?.[0]?.node?.text || '';

        let mediaUrls: string[] | undefined;
        if (media.edge_sidecar_to_children?.edges) {
          mediaUrls = media.edge_sidecar_to_children.edges.map(
            (e: { node: IGGraphQLMedia }) => e.node.display_url || e.node.video_url || ''
          );
        }

        const taggedUsers = media.edge_media_to_tagged_user?.edges?.map(
          (e: { node: { user: { username: string } } }) => e.node.user.username
        );

        const post: Post = {
          id: media.id,
          shortcode: media.shortcode,
          caption,
          mediaType: getMediaType(media),
          mediaUrl: media.video_url || media.display_url,
          thumbnailUrl: media.thumbnail_src,
          mediaUrls,
          timestamp: new Date(media.taken_at_timestamp * 1000).toISOString(),
          likeCount: media.edge_liked_by?.count || media.edge_media_preview_like?.count || 0,
          commentCount: media.edge_media_to_comment?.count || 0,
          location: media.location
            ? {
                id: media.location.id,
                name: media.location.name,
                slug: media.location.slug,
              }
            : undefined,
          taggedUsers,
          hashtags: extractHashtags(caption),
          commentsDisabled: media.comments_disabled || false,
          videoDuration: media.video_duration,
          videoViewCount: media.video_view_count,
        };

        return post;
      });

      return {
        posts,
        hasMore: pageInfo.has_next_page || false,
        endCursor: pageInfo.end_cursor,
      };
    }

    return { posts: [], hasMore: false };
  } catch (error) {
    console.error('[extractPosts] Error parsing response:', error);
    return { posts: [], hasMore: false };
  }
}

function findLikedPostsData(obj: unknown, depth = 0): { edges?: unknown[]; page_info?: unknown } | null {
  if (depth > 10 || !obj || typeof obj !== 'object') return null;

  const o = obj as Record<string, unknown>;

  if (o.edges && Array.isArray(o.edges) && o.edges.length > 0) {
    const firstEdge = o.edges[0] as Record<string, unknown>;
    if (firstEdge?.node) {
      const node = firstEdge.node as Record<string, unknown>;
      if (node.id || node.pk || node.shortcode || node.code || node.image_versions2) {
        return { edges: o.edges as unknown[], page_info: o.page_info };
      }
    }
  }

  const knownPaths = [
    'xdt_api__v1__feed__liked_connection',
    'xdt_api__v1__activity__interactions__likes',
    'liked_media',
    'likes',
    'items',
  ];

  for (const path of knownPaths) {
    if (o[path]) {
      const result = findLikedPostsData(o[path], depth + 1);
      if (result) return result;
    }
  }

  for (const key of ['data', 'user', 'viewer', 'activity_log']) {
    if (o[key] && typeof o[key] === 'object') {
      const result = findLikedPostsData(o[key], depth + 1);
      if (result) return result;
    }
  }

  return null;
}

export function extractLikedPosts(response: CapturedResponse): {
  posts: LikedPost[];
  hasMore: boolean;
  endCursor?: string;
} {
  try {
    const json = JSON.parse(response.body);

    const likedData = findLikedPostsData(json);

    if (!likedData || !likedData.edges || likedData.edges.length === 0) {
      const items = json.items || json.data?.items;
      if (items && Array.isArray(items)) {
        return extractLikedPostsFromItems(items, json.more_available, json.next_max_id);
      }
      return { posts: [], hasMore: false };
    }

    const edges = likedData.edges;
    const pageInfo = likedData.page_info as { has_next_page?: boolean; end_cursor?: string } || {};

    const posts: LikedPost[] = edges.map((edge: unknown) => {
      const e = edge as { node: IGGraphQLMedia | IGAPIMediaNode };
      const media = e.node as IGGraphQLMedia & IGAPIMediaNode;

      const caption =
        media.edge_media_to_caption?.edges?.[0]?.node?.text ||
        (media.caption as { text?: string })?.text ||
        '';

      const imgUrl = media.image_versions2?.candidates?.[0]?.url ||
        media.display_url ||
        '';
      const videoUrl = media.video_versions?.[0]?.url || media.video_url;

      let mediaType: MediaType = 'image';
      if (media.is_video || media.media_type === 2 || videoUrl) {
        mediaType = 'video';
      } else if (media.__typename === 'GraphSidecar' || media.media_type === 8 || media.carousel_media) {
        mediaType = 'carousel';
      }

      const mediaAny = media as unknown as Record<string, unknown>;
      const owner = media.owner || mediaAny.user as { username?: string; id?: string; pk?: string } | undefined;

      return {
        id: media.id || media.pk || media.media_id || '',
        shortcode: media.shortcode || media.code || '',
        ownerUsername: owner?.username || '',
        ownerId: owner?.id || (owner as { pk?: string })?.pk || '',
        caption,
        mediaType,
        mediaUrl: videoUrl || imgUrl,
        thumbnailUrl: media.thumbnail_src || imgUrl,
        timestamp: media.taken_at_timestamp
          ? new Date(media.taken_at_timestamp * 1000).toISOString()
          : media.taken_at
            ? new Date(media.taken_at * 1000).toISOString()
            : new Date().toISOString(),
        likeCount: media.edge_liked_by?.count || media.edge_media_preview_like?.count || media.like_count,
        commentCount: media.edge_media_to_comment?.count || media.comment_count,
      };
    });

    return {
      posts: posts.filter(p => p.id),
      hasMore: pageInfo.has_next_page || false,
      endCursor: pageInfo.end_cursor,
    };
  } catch (error) {
    console.error('[extractLikedPosts] Error parsing response:', error);
    return { posts: [], hasMore: false };
  }
}

function extractLikedPostsFromItems(
  items: unknown[],
  moreAvailable?: boolean,
  nextMaxId?: string
): { posts: LikedPost[]; hasMore: boolean; endCursor?: string } {
  const posts: LikedPost[] = items.map((item: unknown) => {
    const media = item as IGAPIMediaNode & { user?: { username?: string; pk?: string; id?: string } };

    const imgUrl = media.image_versions2?.candidates?.[0]?.url || '';
    const videoUrl = media.video_versions?.[0]?.url;
    const caption = media.caption?.text || '';

    let mediaType: MediaType = 'image';
    if (media.media_type === 2 || videoUrl) {
      mediaType = 'video';
    } else if (media.media_type === 8 || media.carousel_media) {
      mediaType = 'carousel';
    }

    return {
      id: media.id || media.pk || media.media_id || '',
      shortcode: media.code || '',
      ownerUsername: media.user?.username || '',
      ownerId: media.user?.pk || media.user?.id || '',
      caption,
      mediaType,
      mediaUrl: videoUrl || imgUrl,
      thumbnailUrl: imgUrl,
      timestamp: media.taken_at ? new Date(media.taken_at * 1000).toISOString() : new Date().toISOString(),
      likeCount: media.like_count,
      commentCount: media.comment_count,
    };
  });

  return {
    posts: posts.filter(p => p.id),
    hasMore: moreAvailable || false,
    endCursor: nextMaxId,
  };
}

export async function scrollToLoadMore(page: Page, waitMs = 2000): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(waitMs);
}

export async function waitForNetworkIdle(
  page: Page,
  timeout = 5000
): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // Timeout is acceptable, continue
  }
}

export function normalizeInstagramUrl(username: string): string {
  const cleanUsername = username.replace(/^@/, '');
  return `https://www.instagram.com/${cleanUsername}/`;
}
