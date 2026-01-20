/**
 * Instagram Connector for DataBridge
 *
 * Exports Instagram profile info, posts, and liked posts.
 * Can be copy-pasted into browser console for testing.
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
  // Helper Functions
  // ============================================

  // Fetch user info from web_info endpoint
  const fetchWebInfo = async () => {
    try {
      const response = await fetch('https://www.instagram.com/accounts/web_info/', {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
      });

      if (!response.ok) return null;

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
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

      for (const script of scripts) {
        try {
          const jsonContent = JSON.parse(script.textContent);
          const foundData = findPolarisData(jsonContent);
          if (foundData && foundData.data) {
            return {
              username: foundData.data.username || '',
              userId: foundData.data.id || '',
              fullName: foundData.data.full_name || '',
              isLoggedIn: !!foundData.data.username,
            };
          }
        } catch (e) {
          // Continue to next script
        }
      }

      return null;
    } catch (e) {
      log('Error fetching web info:', e.message);
      return null;
    }
  };

  // Check login state from DOM
  const checkLoginState = () => {
    // Check for shared data
    const sharedData = window._sharedData?.config?.viewer;
    if (sharedData?.username) {
      return {
        username: sharedData.username,
        userId: sharedData.id || '',
        fullName: sharedData.full_name || '',
        isLoggedIn: true,
      };
    }

    // Check for profile links with avatar
    const profileLinks = document.querySelectorAll('a[href^="/"]');
    for (const link of profileLinks) {
      const href = link.getAttribute('href');
      if (href && /^\/[a-zA-Z0-9._]+\/$/.test(href)) {
        const hasAvatar = link.querySelector('img[alt*="profile" i]') ||
          link.querySelector('img[alt$="\'s profile picture" i]');

        if (hasAvatar) {
          const username = href.replace(/\//g, '');
          const excluded = ['explore', 'reels', 'direct', 'accounts', 'stories', 'p', 'reel'];
          if (!excluded.includes(username.toLowerCase())) {
            return { username, userId: '', fullName: '', isLoggedIn: true };
          }
        }
      }
    }

    // Check for Home icon (logged in indicator)
    const homeIcon = document.querySelector('svg[aria-label="Home"]') ||
      document.querySelector('a[href="/direct/inbox/"]');
    if (homeIcon) {
      return { username: '', userId: '', fullName: '', isLoggedIn: true };
    }

    // Check for login form
    const loginForm = document.querySelector('input[name="username"]') ||
      document.querySelector('form[id="loginForm"]');
    const isLoginPage = window.location.pathname.includes('/accounts/login');

    if (loginForm && isLoginPage) {
      return null;
    }

    return null;
  };

  // Extract username from profile link in sidebar
  const extractUsernameFromProfileLink = () => {
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

    return null;
  };

  // Scrape profile info from DOM
  const scrapeProfileFromDOM = async (username) => {
    try {
      const header = document.querySelector('header section');
      if (!header) return null;

      const statElements = header.querySelectorAll('ul li');
      let postsCount = 0;
      let followersCount = 0;
      let followingCount = 0;

      statElements.forEach((el) => {
        const text = el.textContent?.toLowerCase() || '';
        const numMatch = text.match(/[\d,]+/);
        const num = numMatch ? parseInt(numMatch[0].replace(/,/g, ''), 10) : 0;

        if (text.includes('post')) postsCount = num;
        else if (text.includes('follower')) followersCount = num;
        else if (text.includes('following')) followingCount = num;
      });

      const fullNameEl = header.querySelector('span[class*="name"]') ||
        header.querySelector('h1 + span');
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
        avatarUrl: avatarEl?.src || '',
        followersCount,
        followingCount,
        postsCount,
        isVerified: !!verifiedEl,
        isPrivate: false,
        isBusinessAccount: false,
        userId: '',
      };
    } catch (e) {
      log('Error scraping profile from DOM:', e.message);
      return null;
    }
  };

  // Collect posts by scrolling
  const collectPosts = async (maxPosts = 50) => {
    const posts = [];
    const seenIds = new Set();
    let scrollAttempts = 0;
    const maxScrollAttempts = 20;
    let noNewPostsCount = 0;

    while (scrollAttempts < maxScrollAttempts && posts.length < maxPosts) {
      scrollAttempts++;

      // Extract posts from DOM
      const postLinks = document.querySelectorAll('a[href^="/p/"], a[href^="/reel/"]');

      for (const link of postLinks) {
        const href = link.getAttribute('href');
        if (!href) continue;

        const match = href.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
        if (!match) continue;

        const shortcode = match[2];
        if (seenIds.has(shortcode)) continue;
        seenIds.add(shortcode);

        const img = link.querySelector('img');
        const video = link.querySelector('video');

        posts.push({
          id: shortcode,
          shortcode: shortcode,
          url: 'https://www.instagram.com' + href,
          thumbnailUrl: img?.src || '',
          mediaType: video ? 'video' : (href.includes('/reel/') ? 'video' : 'image'),
          scrapedAt: new Date().toISOString(),
        });

        if (posts.length >= maxPosts) break;
      }

      const beforeCount = posts.length;

      // Update status
      sendStatus({
        type: 'COLLECTING',
        message: 'Scrolling to load more posts...',
        phase: PHASES.POSTS,
        count: posts.length,
      });
      updateOverlay(4, 5, 'Collecting posts', 'Scrolling...', posts.length);

      // Scroll down
      window.scrollTo(0, document.body.scrollHeight);
      await wait(1.5);

      if (posts.length === beforeCount) {
        noNewPostsCount++;
        if (noNewPostsCount >= 3) {
          log('No new posts found after 3 attempts, stopping');
          break;
        }
      } else {
        noNewPostsCount = 0;
      }
    }

    log(`Collected ${posts.length} posts`);
    return posts;
  };

  // Collect liked posts
  const collectLikedPosts = async (maxLikedPosts = 100) => {
    log('Navigating to liked posts...');
    window.location.href = 'https://www.instagram.com/your_activity/interactions/likes/';
    await wait(3);

    const likedPosts = [];
    const seenIds = new Set();
    let scrollAttempts = 0;
    const maxScrollAttempts = 50;
    let noNewPostsCount = 0;

    while (scrollAttempts < maxScrollAttempts && likedPosts.length < maxLikedPosts) {
      scrollAttempts++;

      // Extract liked posts from DOM using image cache keys
      const images = document.querySelectorAll('img[src*="instagram"]');

      for (const img of images) {
        const src = img.src;
        if (src.includes('s150x150') || src.includes('44x44') || src.includes('profile')) continue;

        const cacheKeyMatch = src.match(/ig_cache_key=([^&]+)/);
        if (!cacheKeyMatch) continue;

        const cacheKey = decodeURIComponent(cacheKeyMatch[1]);
        let mediaId = '';
        try {
          mediaId = atob(cacheKey).split('.')[0];
        } catch {
          mediaId = cacheKey;
        }

        if (!mediaId || seenIds.has(mediaId)) continue;
        seenIds.add(mediaId);

        let mediaType = 'image';
        if (src.includes('t51.71878')) mediaType = 'video';

        likedPosts.push({
          id: mediaId,
          thumbnailUrl: src,
          mediaType: mediaType,
          scrapedAt: new Date().toISOString(),
        });

        if (likedPosts.length >= maxLikedPosts) break;
      }

      const beforeCount = likedPosts.length;

      // Update status
      sendStatus({
        type: 'COLLECTING',
        message: 'Scrolling to load more liked posts...',
        phase: PHASES.LIKED,
        count: likedPosts.length,
      });
      updateOverlay(5, 5, 'Collecting liked posts', 'Scrolling...', likedPosts.length);

      // Scroll down
      window.scrollTo(0, document.body.scrollHeight);
      await wait(1.5);

      if (likedPosts.length === beforeCount) {
        noNewPostsCount++;
        if (noNewPostsCount >= 3) {
          log('No new liked posts found after 3 attempts, stopping');
          break;
        }
      } else {
        noNewPostsCount = 0;
      }
    }

    log(`Collected ${likedPosts.length} liked posts`);
    return likedPosts;
  };

  // ============================================
  // Main Execution
  // ============================================

  // Initialize overlay
  createOverlay();

  log('Instagram Connector started');
  sendStatus({ type: 'STARTED', message: 'Connecting to Instagram...', phase: PHASES.INITIALIZING });
  updateOverlay(1, 5, 'Initializing', 'Connecting to Instagram...');

  await wait(2);

  // Check login status
  log('Checking login status...');
  let webInfo = await fetchWebInfo();

  if (!webInfo?.isLoggedIn) {
    webInfo = checkLoginState();
  }

  let loggedIn = webInfo?.isLoggedIn || false;
  let waitCount = 0;
  const maxWait = 120;

  while (!loggedIn && waitCount < maxWait) {
    log(`Waiting for login... (${waitCount}/${maxWait}s)`);
    sendStatus({ type: 'WAITING_LOGIN', message: 'Please log in to Instagram', phase: PHASES.WAITING_LOGIN });
    updateOverlay(2, 5, 'Waiting for login', 'Please log in to Instagram');
    await wait(2);
    waitCount += 2;
    webInfo = await fetchWebInfo();
    if (!webInfo?.isLoggedIn) {
      webInfo = checkLoginState();
    }
    loggedIn = webInfo?.isLoggedIn || false;
  }

  if (!loggedIn) {
    log('Login timeout');
    sendStatus({ type: 'ERROR', message: 'Login timeout - please try again' });
    const overlay = document.getElementById('databridge-overlay');
    if (overlay) overlay.remove();
    return;
  }

  log('User is logged in');

  // Get username if not available
  let username = webInfo?.username || '';
  if (!username || username === '__needs_profile_navigation__') {
    username = extractUsernameFromProfileLink() || '';
    if (username) {
      log(`Extracted username from profile link: ${username}`);
    }
  }

  // Navigate to profile to get profile info and posts
  sendStatus({ type: 'COLLECTING', message: 'Collecting profile info...', phase: PHASES.PROFILE });
  updateOverlay(3, 5, 'Collecting profile', 'Navigating to profile...');

  if (username) {
    const profileUrl = `https://www.instagram.com/${username}/`;
    if (window.location.href !== profileUrl) {
      window.location.href = profileUrl;
      await wait(3);
    }
  }

  // Scrape profile info
  let profileInfo = null;
  if (username) {
    profileInfo = await scrapeProfileFromDOM(username);
    log('Profile info:', profileInfo);
  }

  // Collect posts
  sendStatus({ type: 'COLLECTING', message: 'Collecting posts...', phase: PHASES.POSTS });
  updateOverlay(4, 5, 'Collecting posts', 'Starting posts collection...');

  const posts = await collectPosts(100);

  // Collect liked posts
  sendStatus({ type: 'COLLECTING', message: 'Collecting liked posts...', phase: PHASES.LIKED });
  updateOverlay(5, 5, 'Collecting liked posts', 'Starting liked posts collection...');

  const likedPosts = await collectLikedPosts(200);

  // Prepare result
  const result = {
    platform: 'instagram',
    company: 'Meta',
    exportedAt: new Date().toISOString(),
    userInfo: {
      username: username || profileInfo?.username || undefined,
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
