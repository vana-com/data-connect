/**
 * Instagram Connector Schemas
 * (Copy from original - no changes needed)
 */

export interface ProfileInfo {
  username: string;
  fullName: string;
  bio: string;
  avatarUrl: string;
  externalUrl?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  isPrivate: boolean;
  isBusinessAccount: boolean;
  businessCategory?: string;
  userId: string;
}

export type MediaType = 'image' | 'video' | 'carousel';

export interface Post {
  id: string;
  shortcode: string;
  caption: string;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  mediaUrls?: string[];
  timestamp: string;
  likeCount: number;
  commentCount: number;
  location?: PostLocation;
  taggedUsers?: string[];
  hashtags?: string[];
  commentsDisabled: boolean;
  videoDuration?: number;
  videoViewCount?: number;
}

export interface PostLocation {
  id: string;
  name: string;
  slug?: string;
}

export interface LikedPost {
  id: string;
  shortcode: string;
  ownerUsername: string;
  ownerId: string;
  caption: string;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  timestamp: string;
  likeCount?: number;
  commentCount?: number;
}

export interface Comment {
  id: string;
  text: string;
  timestamp: string;
  postId: string;
  postShortcode: string;
  postOwnerUsername: string;
  likeCount: number;
  isReply: boolean;
  parentCommentId?: string;
}

export interface Ad {
  id: string;
  advertiserUsername: string;
  advertiserName: string;
  creativeType: 'image' | 'video' | 'carousel' | 'story';
  headline?: string;
  bodyText?: string;
  callToAction?: string;
  targetUrl?: string;
  timestamp: string;
  targetingCategories?: string[];
}

export interface InstagramScrapeResult {
  profile_info?: ProfileInfo;
  posts?: Post[];
  liked_posts?: LikedPost[];
  comments?: Comment[];
  ads_targeted?: Ad[];
}

export interface InstagramScrapeParams {
  scopes: Array<
    | 'profile_info'
    | 'posts'
    | 'liked_posts'
    | 'comments'
    | 'ads_targeted'
  >;
  maxPosts?: number;
  maxLikedPosts?: number;
  maxComments?: number;
  maxAds?: number;
}
