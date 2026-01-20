/**
 * Instagram Connector for DataBridge
 *
 * Exports Instagram profile info, posts, and liked posts.
 * Can be copy-pasted into browser console for testing.
 *
 * Uses Instagram's internal GraphQL API for reliable data extraction.
 */
(async function() {
  // ============================================
  // Polyfills for browser console testing
  // ============================================
  const isDataBridge = typeof window.__DATABRIDGE_API__ !== 'undefined';

  const api = window.__DATABRIDGE_API__ || {
    log: (...args) => console.log('[Instagram Connector]', ...args),
    wait: (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000)),
    sendStatus: (status) => console.log('[Status]', JSON.stringify(status, null, 2)),
  };

  const { log, wait, sendStatus } = api;

  // Progress phases
  const PHASES = {
    INITIALIZING: { step: 1, total: 5, label: 'Initializing' },
    WAITING_LOGIN: { step: 2, total: 5, label: 'Waiting for login' },
    PROFILE: { step: 3, total: 5, label: 'Collecting profile' },
    POSTS: { step: 4, total: 5, label: 'Collecting posts' },
    LIKED: { step: 5, total: 5, label: 'Collecting liked posts' },
  };

  // ============================================
  // Progress Overlay (only in DataBridge)
  // ============================================
  const createOverlay = () => {
    if (!isDataBridge) return null;

    const overlay = document.createElement('div');
    overlay.id = 'databridge-overlay';
    overlay.innerHTML = `
      <style>
        #databridge-overlay {
          position: fixed;
          top: 16px;
          right: 16px;
          width: 320px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.15);
          padding: 16px;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #databridge-overlay .db-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        #databridge-overlay .db-logo {
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 6px;
        }
        #databridge-overlay .db-title {
          font-weight: 600;
          font-size: 14px;
          color: #1a1a1a;
        }
        #databridge-overlay .db-steps {
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
        }
        #databridge-overlay .db-step {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #e5e7eb;
          transition: background 0.3s;
        }
        #databridge-overlay .db-step.active {
          background: #6366f1;
        }
        #databridge-overlay .db-step-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        #databridge-overlay .db-message {
          font-size: 13px;
          color: #1a1a1a;
          font-weight: 500;
        }
        #databridge-overlay .db-count {
          color: #6366f1;
          margin-left: 6px;
        }
        #databridge-overlay .db-progress {
          height: 4px;
          background: #f3f4f6;
          border-radius: 2px;
          margin-top: 12px;
          overflow: hidden;
        }
        #databridge-overlay .db-progress-bar {
          height: 100%;
          background: #6366f1;
          border-radius: 2px;
          transition: width 0.5s ease;
        }
        #databridge-overlay.db-success {
          border: 2px solid #22c55e;
        }
        #databridge-overlay.db-success .db-message {
          color: #22c55e;
        }
      </style>
      <div class="db-header">
        <div class="db-logo"></div>
        <span class="db-title">DataBridge</span>
      </div>
      <div class="db-steps">
        <div class="db-step" data-step="1"></div>
        <div class="db-step" data-step="2"></div>
        <div class="db-step" data-step="3"></div>
        <div class="db-step" data-step="4"></div>
        <div class="db-step" data-step="5"></div>
      </div>
      <div class="db-step-label">Step 1 of 5</div>
      <div class="db-message">Initializing...</div>
      <div class="db-progress">
        <div class="db-progress-bar" style="width: 20%"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  };

  const updateOverlay = (step, total, label, message, count) => {
    const overlay = document.getElementById('databridge-overlay');
    if (!overlay) return;

    overlay.querySelectorAll('.db-step').forEach((el, i) => {
      el.classList.toggle('active', i < step);
    });

    const stepLabel = overlay.querySelector('.db-step-label');
    const messageEl = overlay.querySelector('.db-message');
    const progressBar = overlay.querySelector('.db-progress-bar');

    if (stepLabel) stepLabel.textContent = `Step ${step} of ${total} — ${label}`;
    if (messageEl) {
      messageEl.innerHTML = message + (count !== undefined ? `<span class="db-count">(${count} found)</span>` : '');
    }
    if (progressBar) progressBar.style.width = `${(step / total) * 100}%`;
  };

  const completeOverlay = (profileUsername, postsCount, likedPostsCount) => {
    const overlay = document.getElementById('databridge-overlay');
    if (!overlay) return;

    overlay.classList.add('db-success');
    overlay.querySelectorAll('.db-step').forEach(el => el.classList.add('active'));

    const stepLabel = overlay.querySelector('.db-step-label');
    const messageEl = overlay.querySelector('.db-message');
    const progressBar = overlay.querySelector('.db-progress-bar');

    if (stepLabel) stepLabel.textContent = 'Complete!';
    if (messageEl) {
      messageEl.innerHTML = `
        Exported @${profileUsername}<br>
        ${postsCount} posts, ${likedPostsCount} liked posts<br>
        <span style="font-size: 12px; color: #6b7280; font-weight: 400;">
          You can close this window now
        </span>
      `;
    }
    if (progressBar) progressBar.style.width = '100%';
  };

  // ============================================
  // Instagram API Helpers
  // ============================================

  // Get CSRF token from cookies
  const getCSRFToken = () => {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : '';
  };

  // Get App ID from page
  const getAppId = () => {
    // Try to find it in scripts
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const content = script.textContent || '';
      const match = content.match(/"APP_ID":"(\d+)"/);
      if (match) return match[1];
    }
    // Default Instagram web app ID
    return '936619743392459';
  };

  // Make Instagram GraphQL request
  const graphqlRequest = async (docId, variables) => {
    const csrfToken = getCSRFToken();
    const appId = getAppId();

    const response = await fetch('https://www.instagram.com/graphql/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': csrfToken,
        'X-IG-App-ID': appId,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
      body: `variables=${encodeURIComponent(JSON.stringify(variables))}&doc_id=${docId}`,
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status}`);
    }

    return response.json();
  };

  // ============================================
  // User Info
  // ============================================

  const getUserInfo = async () => {
    try {
      // Try to get from window.__additionalData or __REDUX_STATE__
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent || '';

        // Look for viewer data
        const viewerMatch = content.match(/"viewer":\s*\{[^}]*"username":\s*"([^"]+)"[^}]*"id":\s*"(\d+)"/);
        if (viewerMatch) {
          return {
            username: viewerMatch[1],
            userId: viewerMatch[2],
            isLoggedIn: true,
          };
        }

        // Look for PolarisViewer
        if (content.includes('PolarisViewer')) {
          const usernameMatch = content.match(/"username":"([^"]+)"/);
          const idMatch = content.match(/"id":"(\d+)"/);
          if (usernameMatch) {
            return {
              username: usernameMatch[1],
              userId: idMatch ? idMatch[1] : '',
              isLoggedIn: true,
            };
          }
        }
      }

      // Try web_info endpoint
      const response = await fetch('https://www.instagram.com/api/v1/web/accounts/web_info/', {
        credentials: 'include',
        headers: {
          'X-CSRFToken': getCSRFToken(),
          'X-IG-App-ID': getAppId(),
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.user) {
          return {
            username: data.data.user.username,
            userId: data.data.user.id,
            isLoggedIn: true,
          };
        }
      }

      // Check DOM for login indicators
      const homeIcon = document.querySelector('svg[aria-label="Home"]');
      if (homeIcon) {
        // Try to extract username from profile link
        const profileLink = document.querySelector('a[href^="/"][role="link"] img[alt$="profile picture"]');
        if (profileLink) {
          const link = profileLink.closest('a');
          const href = link?.getAttribute('href') || '';
          const match = href.match(/^\/([a-zA-Z0-9._]+)\/?$/);
          if (match) {
            return { username: match[1], userId: '', isLoggedIn: true };
          }
        }
        return { username: '', userId: '', isLoggedIn: true };
      }

      return null;
    } catch (e) {
      log('Error getting user info:', e.message);
      return null;
    }
  };

  // ============================================
  // Profile Info
  // ============================================

  const getProfileInfo = async (username) => {
    try {
      // Use the web profile info API
      const response = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
        credentials: 'include',
        headers: {
          'X-CSRFToken': getCSRFToken(),
          'X-IG-App-ID': getAppId(),
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) {
        log('Profile API failed, status:', response.status);
        return null;
      }

      const data = await response.json();
      const user = data.data?.user;

      if (!user) return null;

      return {
        username: user.username,
        userId: user.id,
        fullName: user.full_name || '',
        bio: user.biography || '',
        avatarUrl: user.profile_pic_url_hd || user.profile_pic_url || '',
        followersCount: user.edge_followed_by?.count || 0,
        followingCount: user.edge_follow?.count || 0,
        postsCount: user.edge_owner_to_timeline_media?.count || 0,
        isVerified: user.is_verified || false,
        isPrivate: user.is_private || false,
        isBusinessAccount: user.is_business_account || false,
      };
    } catch (e) {
      log('Error fetching profile:', e.message);
      return null;
    }
  };

  // ============================================
  // Posts Collection via API
  // ============================================

  const fetchUserPosts = async (userId, maxPosts = 50) => {
    const posts = [];
    let endCursor = null;
    let hasNext = true;
    const seenIds = new Set();

    // Doc ID for user timeline query
    const docId = '8845758582119845'; // PolarisProfilePostsTabContentQuery_connection

    while (hasNext && posts.length < maxPosts) {
      try {
        const variables = {
          id: userId,
          first: 12,
          after: endCursor,
        };

        log(`Fetching posts batch... (${posts.length} so far)`);
        updateOverlay(4, 5, 'Collecting posts', 'Fetching from API...', posts.length);
        sendStatus({ type: 'COLLECTING', message: 'Fetching posts...', phase: PHASES.POSTS, count: posts.length });

        const data = await graphqlRequest(docId, variables);

        const timeline = data.data?.xdt_api__v1__feed__user_timeline_graphql_connection;
        if (!timeline) {
          log('No timeline data in response');
          break;
        }

        const edges = timeline.edges || [];
        const pageInfo = timeline.page_info || {};

        for (const edge of edges) {
          const node = edge.node;
          const postId = node.id || node.pk || '';

          if (seenIds.has(postId)) continue;
          seenIds.add(postId);

          const imgUrl = node.image_versions2?.candidates?.[0]?.url ||
            node.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url || '';
          const videoUrl = node.video_versions?.[0]?.url;
          const caption = node.caption?.text || '';

          let mediaType = 'image';
          if (node.media_type === 2 || videoUrl) mediaType = 'video';
          else if (node.media_type === 8 || node.carousel_media) mediaType = 'carousel';

          posts.push({
            id: postId,
            shortcode: node.code || '',
            caption,
            mediaType,
            mediaUrl: videoUrl || imgUrl,
            thumbnailUrl: imgUrl,
            timestamp: node.taken_at ? new Date(node.taken_at * 1000).toISOString() : new Date().toISOString(),
            likeCount: node.like_count || 0,
            commentCount: node.comment_count || 0,
          });

          if (posts.length >= maxPosts) break;
        }

        hasNext = pageInfo.has_next_page || false;
        endCursor = pageInfo.end_cursor || null;

        if (edges.length === 0) break;

        await wait(0.5); // Rate limiting

      } catch (e) {
        log('Error fetching posts:', e.message);
        break;
      }
    }

    log(`Collected ${posts.length} posts via API`);
    return posts;
  };

  // ============================================
  // Liked Posts Collection via API
  // ============================================

  const fetchLikedPosts = async (maxPosts = 100) => {
    const posts = [];
    let endCursor = null;
    let hasNext = true;
    const seenIds = new Set();

    // Doc ID for liked posts query
    const docId = '9549055498521777'; // liked_posts query

    while (hasNext && posts.length < maxPosts) {
      try {
        const variables = {
          first: 12,
          after: endCursor,
        };

        log(`Fetching liked posts batch... (${posts.length} so far)`);
        updateOverlay(5, 5, 'Collecting liked posts', 'Fetching from API...', posts.length);
        sendStatus({ type: 'COLLECTING', message: 'Fetching liked posts...', phase: PHASES.LIKED, count: posts.length });

        const data = await graphqlRequest(docId, variables);

        // Try different response structures
        const likedData = data.data?.xdt_api__v1__feed__liked_connection ||
          data.data?.xdt_api__v1__activity__interactions__likes ||
          data.data?.liked_media;

        if (!likedData) {
          log('No liked posts data in response, trying alternative API...');
          // Try alternative endpoint
          const altPosts = await fetchLikedPostsAlternative(maxPosts - posts.length);
          posts.push(...altPosts);
          break;
        }

        const edges = likedData.edges || [];
        const pageInfo = likedData.page_info || {};

        for (const edge of edges) {
          const node = edge.node;
          const postId = node.id || node.pk || '';

          if (seenIds.has(postId)) continue;
          seenIds.add(postId);

          const imgUrl = node.image_versions2?.candidates?.[0]?.url ||
            node.display_url || '';
          const videoUrl = node.video_versions?.[0]?.url || node.video_url;

          let mediaType = 'image';
          if (node.media_type === 2 || node.is_video || videoUrl) mediaType = 'video';
          else if (node.media_type === 8 || node.carousel_media) mediaType = 'carousel';

          posts.push({
            id: postId,
            shortcode: node.code || node.shortcode || '',
            ownerUsername: node.user?.username || node.owner?.username || '',
            caption: node.caption?.text || '',
            mediaType,
            mediaUrl: videoUrl || imgUrl,
            thumbnailUrl: imgUrl,
            timestamp: node.taken_at ? new Date(node.taken_at * 1000).toISOString() : new Date().toISOString(),
            likeCount: node.like_count || 0,
            commentCount: node.comment_count || 0,
          });

          if (posts.length >= maxPosts) break;
        }

        hasNext = pageInfo.has_next_page || false;
        endCursor = pageInfo.end_cursor || null;

        if (edges.length === 0) break;

        await wait(0.5); // Rate limiting

      } catch (e) {
        log('Error fetching liked posts:', e.message);
        // Try alternative method
        const altPosts = await fetchLikedPostsAlternative(maxPosts - posts.length);
        posts.push(...altPosts);
        break;
      }
    }

    log(`Collected ${posts.length} liked posts`);
    return posts;
  };

  // Alternative method: Use REST API for liked posts
  const fetchLikedPostsAlternative = async (maxPosts = 100) => {
    const posts = [];
    let maxId = null;
    const seenIds = new Set();

    log('Trying alternative liked posts API...');

    for (let i = 0; i < 10 && posts.length < maxPosts; i++) {
      try {
        let url = 'https://www.instagram.com/api/v1/feed/liked/';
        if (maxId) url += `?max_id=${maxId}`;

        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'X-CSRFToken': getCSRFToken(),
            'X-IG-App-ID': getAppId(),
            'X-Requested-With': 'XMLHttpRequest',
          },
        });

        if (!response.ok) {
          log('Alternative liked API failed:', response.status);
          break;
        }

        const data = await response.json();
        const items = data.items || [];

        if (items.length === 0) break;

        for (const item of items) {
          const postId = item.id || item.pk || '';
          if (seenIds.has(postId)) continue;
          seenIds.add(postId);

          const imgUrl = item.image_versions2?.candidates?.[0]?.url || '';
          const videoUrl = item.video_versions?.[0]?.url;

          posts.push({
            id: postId,
            shortcode: item.code || '',
            ownerUsername: item.user?.username || '',
            caption: item.caption?.text || '',
            mediaType: item.media_type === 2 ? 'video' : item.media_type === 8 ? 'carousel' : 'image',
            mediaUrl: videoUrl || imgUrl,
            thumbnailUrl: imgUrl,
            timestamp: item.taken_at ? new Date(item.taken_at * 1000).toISOString() : new Date().toISOString(),
          });

          if (posts.length >= maxPosts) break;
        }

        if (!data.more_available) break;
        maxId = data.next_max_id;

        await wait(0.5);

      } catch (e) {
        log('Alternative liked posts error:', e.message);
        break;
      }
    }

    return posts;
  };

  // ============================================
  // Main Execution
  // ============================================

  // Initialize overlay
  createOverlay();

  log('Instagram Connector started');
  sendStatus({ type: 'STARTED', message: 'Connecting to Instagram...', phase: PHASES.INITIALIZING });
  updateOverlay(1, 5, 'Initializing', 'Connecting to Instagram...');

  await wait(1);

  // Check login status
  log('Checking login status...');
  let userInfo = await getUserInfo();

  let waitCount = 0;
  const maxWait = 120;

  while (!userInfo?.isLoggedIn && waitCount < maxWait) {
    log(`Waiting for login... (${waitCount}/${maxWait}s)`);
    sendStatus({ type: 'WAITING_LOGIN', message: 'Please log in to Instagram', phase: PHASES.WAITING_LOGIN });
    updateOverlay(2, 5, 'Waiting for login', 'Please log in to Instagram');
    await wait(2);
    waitCount += 2;
    userInfo = await getUserInfo();
  }

  if (!userInfo?.isLoggedIn) {
    log('Login timeout');
    sendStatus({ type: 'ERROR', message: 'Login timeout - please try again' });
    const overlay = document.getElementById('databridge-overlay');
    if (overlay) overlay.remove();
    return;
  }

  log('User is logged in:', userInfo.username || '(username pending)');

  // Get profile info
  sendStatus({ type: 'COLLECTING', message: 'Collecting profile info...', phase: PHASES.PROFILE });
  updateOverlay(3, 5, 'Collecting profile', 'Fetching profile data...');

  let profileInfo = null;
  let username = userInfo.username;
  let userId = userInfo.userId;

  if (username) {
    profileInfo = await getProfileInfo(username);
    if (profileInfo) {
      userId = profileInfo.userId || userId;
      log('Profile info fetched:', profileInfo.username);
    }
  }

  // Collect posts
  sendStatus({ type: 'COLLECTING', message: 'Collecting posts...', phase: PHASES.POSTS });
  updateOverlay(4, 5, 'Collecting posts', 'Starting posts collection...');

  let posts = [];
  if (userId) {
    posts = await fetchUserPosts(userId, 100);
  } else {
    log('No user ID available, skipping posts collection');
  }

  // Collect liked posts
  sendStatus({ type: 'COLLECTING', message: 'Collecting liked posts...', phase: PHASES.LIKED });
  updateOverlay(5, 5, 'Collecting liked posts', 'Starting liked posts collection...');

  const likedPosts = await fetchLikedPosts(200);

  // Prepare result
  const result = {
    platform: 'instagram',
    company: 'Meta',
    exportedAt: new Date().toISOString(),
    userInfo: {
      username: username || profileInfo?.username || undefined,
      userId: userId || undefined,
      fullName: profileInfo?.fullName || undefined,
      bio: profileInfo?.bio || undefined,
      avatarUrl: profileInfo?.avatarUrl || undefined,
      followersCount: profileInfo?.followersCount || undefined,
      followingCount: profileInfo?.followingCount || undefined,
      postsCount: profileInfo?.postsCount || undefined,
      isVerified: profileInfo?.isVerified || undefined,
    },
    posts: posts,
    totalPosts: posts.length,
    likedPosts: likedPosts,
    totalLikedPosts: likedPosts.length,
  };

  log(`Export complete: ${posts.length} posts, ${likedPosts.length} liked posts`);

  // Show completion
  completeOverlay(username || 'Unknown', posts.length, likedPosts.length);

  sendStatus({
    type: 'COMPLETE',
    message: `Exported ${posts.length} posts and ${likedPosts.length} liked posts`,
    data: result,
    count: posts.length + likedPosts.length,
  });

  // Emit export-complete event (DataBridge only)
  if (isDataBridge && window.__TAURI__) {
    window.__TAURI__.event.emit('export-complete', {
      runId: window.__DATABRIDGE_RUN_ID__,
      platformId: window.__DATABRIDGE_PLATFORM_ID__,
      company: window.__DATABRIDGE_COMPANY__,
      name: window.__DATABRIDGE_NAME__,
      data: result,
      timestamp: Date.now(),
    });
  }

  log('Data sent to backend');

  // For browser console testing, return the result
  if (!isDataBridge) {
    console.log('=== EXPORT RESULT ===');
    console.log(result);
    return result;
  }
})();
