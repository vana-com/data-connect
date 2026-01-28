/**
 * LinkedIn Connector (Playwright)
 *
 * Uses Playwright for real browser control to extract profile data.
 * Requires the playwright-runner sidecar.
 */

// State management
const state = {
  profileUrl: null,
  heroData: null,
  aboutData: null,
  experiences: [],
  education: [],
  skills: [],
  isComplete: false
};

// Helper: Check if logged in
const checkLoginStatus = async () => {
  try {
    const result = await page.evaluate(`
      (() => {
        // Check for feed or profile elements that only appear when logged in
        const hasGlobalNav = !!document.querySelector('.global-nav__me');
        const hasFeed = !!document.querySelector('[data-view-name="feed"]') ||
                       !!document.querySelector('.feed-identity-module');
        const hasProfileLink = !!document.querySelector('a[href*="/in/"]');

        // Check for login form (means NOT logged in)
        const hasLoginForm = !!document.querySelector('input[name="session_key"]') ||
                            !!document.querySelector('#username');

        if (hasLoginForm) {
          return false;
        }

        return hasGlobalNav || hasFeed || hasProfileLink;
      })()
    `);
    return result;
  } catch (err) {
    return false;
  }
};

// Helper: Get current user's profile URL
const getProfileUrl = async () => {
  try {
    const result = await page.evaluate(`
      (() => {
        // Try to find profile link in navigation
        const meButton = document.querySelector('.global-nav__me-photo');
        if (meButton) {
          const link = meButton.closest('a');
          if (link && link.href) return link.href;
        }

        // Try profile link in feed identity module
        const feedIdentity = document.querySelector('.feed-identity-module__actor-meta a');
        if (feedIdentity && feedIdentity.href) return feedIdentity.href;

        // Try any profile link
        const profileLinks = document.querySelectorAll('a[href*="/in/"]');
        for (const link of profileLinks) {
          const href = link.href;
          if (href.includes('/in/') && !href.includes('/in/edit')) {
            return href;
          }
        }

        return null;
      })()
    `);
    return result;
  } catch (err) {
    return null;
  }
};

// Helper: Extract hero section (name, headline, location, etc.)
const extractHeroSection = async () => {
  try {
    const result = await page.evaluate(`
      (() => {
        const data = {
          fullName: '',
          headline: '',
          location: '',
          connections: '',
          profilePictureUrl: '',
          backgroundImageUrl: ''
        };

        // Full name - try multiple selectors
        const nameEl = document.querySelector('h1.text-heading-xlarge') ||
                      document.querySelector('.pv-top-card--list h1') ||
                      document.querySelector('[data-generated-suggestion-target]');
        if (nameEl) {
          data.fullName = nameEl.textContent.trim();
        }

        // Headline
        const headlineEl = document.querySelector('.text-body-medium.break-words') ||
                          document.querySelector('.pv-top-card--list-bullet .text-body-medium');
        if (headlineEl) {
          data.headline = headlineEl.textContent.trim();
        }

        // Location
        const locationEl = document.querySelector('.text-body-small.inline.t-black--light.break-words') ||
                          document.querySelector('.pv-top-card--list-bullet:nth-child(2) span');
        if (locationEl) {
          data.location = locationEl.textContent.trim();
        }

        // Connections
        const connectionsEl = document.querySelector('a[href*="connections"] span') ||
                             document.querySelector('.pv-top-card--list-bullet li:last-child span');
        if (connectionsEl) {
          data.connections = connectionsEl.textContent.trim();
        }

        // Profile picture
        const profilePic = document.querySelector('.pv-top-card-profile-picture__image') ||
                          document.querySelector('img.profile-photo-edit__preview');
        if (profilePic && profilePic.src) {
          data.profilePictureUrl = profilePic.src;
        }

        // Background image
        const bgImage = document.querySelector('.profile-background-image img') ||
                       document.querySelector('.pv-top-card__background-image img');
        if (bgImage && bgImage.src) {
          data.backgroundImageUrl = bgImage.src;
        }

        return data;
      })()
    `);
    return result;
  } catch (err) {
    return null;
  }
};

// Helper: Extract about section
const extractAboutSection = async () => {
  try {
    const result = await page.evaluate(`
      (() => {
        // Try to find the about section
        const aboutSection = document.querySelector('#about') ||
                            document.querySelector('section.pv-about-section');

        if (!aboutSection) {
          // Try finding by heading text
          const headings = document.querySelectorAll('h2, .pvs-header__title');
          for (const h of headings) {
            if (h.textContent.toLowerCase().includes('about')) {
              const section = h.closest('section');
              if (section) {
                const textEl = section.querySelector('.pv-shared-text-with-see-more span') ||
                              section.querySelector('.inline-show-more-text span') ||
                              section.querySelector('.visually-hidden');
                if (textEl) {
                  return { aboutText: textEl.textContent.trim() };
                }
              }
            }
          }
          return null;
        }

        const aboutText = aboutSection.querySelector('.pv-shared-text-with-see-more span') ||
                         aboutSection.querySelector('.inline-show-more-text span');

        return {
          aboutText: aboutText ? aboutText.textContent.trim() : ''
        };
      })()
    `);
    return result;
  } catch (err) {
    return null;
  }
};

// Helper: Extract experiences
const extractExperiences = async () => {
  try {
    const result = await page.evaluate(`
      (() => {
        const experiences = [];

        // Find experience section
        const expSection = document.querySelector('#experience') ||
                          document.querySelector('section.experience-section');

        if (!expSection) {
          // Try finding by heading
          const headings = document.querySelectorAll('h2, .pvs-header__title');
          for (const h of headings) {
            if (h.textContent.toLowerCase().includes('experience')) {
              const section = h.closest('section');
              if (section) {
                const items = section.querySelectorAll('.pvs-list__paged-list-item, li.pv-entity__position-group-pager');
                items.forEach(item => {
                  const titleEl = item.querySelector('.mr1.t-bold span, .t-16.t-black.t-bold');
                  const companyEl = item.querySelector('.t-14.t-normal span, .pv-entity__secondary-title');
                  const datesEl = item.querySelector('.t-14.t-normal.t-black--light span, .pv-entity__date-range span:nth-child(2)');
                  const locationEl = item.querySelector('.t-14.t-normal.t-black--light:last-child span');
                  const descEl = item.querySelector('.pv-shared-text-with-see-more span, .pv-entity__description');

                  if (titleEl) {
                    experiences.push({
                      jobTitle: titleEl.textContent.trim(),
                      companyName: companyEl ? companyEl.textContent.trim() : '',
                      dates: datesEl ? datesEl.textContent.trim() : '',
                      location: locationEl ? locationEl.textContent.trim() : '',
                      description: descEl ? descEl.textContent.trim() : ''
                    });
                  }
                });
                return experiences;
              }
            }
          }
        }

        if (expSection) {
          const items = expSection.querySelectorAll('.pvs-list__paged-list-item, li.pv-entity__position-group-pager');
          items.forEach(item => {
            const titleEl = item.querySelector('.mr1.t-bold span, .t-16.t-black.t-bold');
            const companyEl = item.querySelector('.t-14.t-normal span, .pv-entity__secondary-title');
            const datesEl = item.querySelector('.t-14.t-normal.t-black--light span, .pv-entity__date-range span:nth-child(2)');
            const locationEl = item.querySelector('.t-14.t-normal.t-black--light:last-child span');
            const descEl = item.querySelector('.pv-shared-text-with-see-more span, .pv-entity__description');

            if (titleEl) {
              experiences.push({
                jobTitle: titleEl.textContent.trim(),
                companyName: companyEl ? companyEl.textContent.trim() : '',
                dates: datesEl ? datesEl.textContent.trim() : '',
                location: locationEl ? locationEl.textContent.trim() : '',
                description: descEl ? descEl.textContent.trim() : ''
              });
            }
          });
        }

        return experiences;
      })()
    `);
    return result || [];
  } catch (err) {
    return [];
  }
};

// Helper: Extract education
const extractEducation = async () => {
  try {
    const result = await page.evaluate(`
      (() => {
        const education = [];

        // Find education section
        const eduSection = document.querySelector('#education') ||
                          document.querySelector('section.education-section');

        if (!eduSection) {
          const headings = document.querySelectorAll('h2, .pvs-header__title');
          for (const h of headings) {
            if (h.textContent.toLowerCase().includes('education')) {
              const section = h.closest('section');
              if (section) {
                const items = section.querySelectorAll('.pvs-list__paged-list-item, li.pv-education-entity');
                items.forEach(item => {
                  const schoolEl = item.querySelector('.mr1.t-bold span, .pv-entity__school-name');
                  const degreeEl = item.querySelector('.t-14.t-normal span, .pv-entity__degree-name span:nth-child(2)');
                  const datesEl = item.querySelector('.t-14.t-normal.t-black--light span, .pv-entity__dates span:nth-child(2)');
                  const logoEl = item.querySelector('img');

                  if (schoolEl) {
                    education.push({
                      schoolName: schoolEl.textContent.trim(),
                      degree: degreeEl ? degreeEl.textContent.trim() : '',
                      years: datesEl ? datesEl.textContent.trim() : '',
                      logoUrl: logoEl ? logoEl.src : ''
                    });
                  }
                });
                return education;
              }
            }
          }
        }

        if (eduSection) {
          const items = eduSection.querySelectorAll('.pvs-list__paged-list-item, li.pv-education-entity');
          items.forEach(item => {
            const schoolEl = item.querySelector('.mr1.t-bold span, .pv-entity__school-name');
            const degreeEl = item.querySelector('.t-14.t-normal span, .pv-entity__degree-name span:nth-child(2)');
            const datesEl = item.querySelector('.t-14.t-normal.t-black--light span, .pv-entity__dates span:nth-child(2)');
            const logoEl = item.querySelector('img');

            if (schoolEl) {
              education.push({
                schoolName: schoolEl.textContent.trim(),
                degree: degreeEl ? degreeEl.textContent.trim() : '',
                years: datesEl ? datesEl.textContent.trim() : '',
                logoUrl: logoEl ? logoEl.src : ''
              });
            }
          });
        }

        return education;
      })()
    `);
    return result || [];
  } catch (err) {
    return [];
  }
};

// Helper: Extract skills
const extractSkills = async () => {
  try {
    const result = await page.evaluate(`
      (() => {
        const skills = [];

        // Find skills section
        const skillsSection = document.querySelector('#skills') ||
                             document.querySelector('section.skills-section');

        if (!skillsSection) {
          const headings = document.querySelectorAll('h2, .pvs-header__title');
          for (const h of headings) {
            if (h.textContent.toLowerCase().includes('skills')) {
              const section = h.closest('section');
              if (section) {
                const items = section.querySelectorAll('.pvs-list__paged-list-item, li.pv-skill-category-entity');
                items.forEach(item => {
                  const nameEl = item.querySelector('.mr1.t-bold span, .pv-skill-category-entity__name-text');
                  const endorsementsEl = item.querySelector('.t-14.t-normal.t-black--light span, .pv-skill-category-entity__endorsement-count');

                  if (nameEl) {
                    skills.push({
                      name: nameEl.textContent.trim(),
                      endorsements: endorsementsEl ? endorsementsEl.textContent.trim() : '0'
                    });
                  }
                });
                return skills;
              }
            }
          }
        }

        if (skillsSection) {
          const items = skillsSection.querySelectorAll('.pvs-list__paged-list-item, li.pv-skill-category-entity');
          items.forEach(item => {
            const nameEl = item.querySelector('.mr1.t-bold span, .pv-skill-category-entity__name-text');
            const endorsementsEl = item.querySelector('.t-14.t-normal.t-black--light span, .pv-skill-category-entity__endorsement-count');

            if (nameEl) {
              skills.push({
                name: nameEl.textContent.trim(),
                endorsements: endorsementsEl ? endorsementsEl.textContent.trim() : '0'
              });
            }
          });
        }

        return skills;
      })()
    `);
    return result || [];
  } catch (err) {
    return [];
  }
};

// Helper: Scroll to load lazy content
const scrollToLoadContent = async () => {
  await page.evaluate(`
    (async () => {
      const delay = ms => new Promise(r => setTimeout(r, ms));
      const scrollHeight = document.body.scrollHeight;
      const step = window.innerHeight;

      for (let pos = 0; pos < scrollHeight; pos += step) {
        window.scrollTo(0, pos);
        await delay(500);
      }

      // Scroll back to top
      window.scrollTo(0, 0);
    })()
  `);
  await page.sleep(1000);
};

// Main export flow
(async () => {
  // Check login status
  await page.setData('status', 'Checking login status...');
  await page.sleep(2000);

  let isLoggedIn = await checkLoginStatus();

  if (!isLoggedIn) {
    await page.setData('status', 'Please log in to LinkedIn...');

    // Wait for user to log in
    await page.promptUser(
      'Please log in to LinkedIn. Click "Done" when you see your feed.',
      async () => {
        return await checkLoginStatus();
      },
      2000
    );

    await page.setData('status', 'Login completed');
    await page.sleep(2000);
  } else {
    await page.setData('status', 'Already logged in');
  }

  // Get profile URL and navigate
  await page.setData('status', 'Finding your profile...');

  // Navigate to feed first to get profile link
  await page.goto('https://www.linkedin.com/feed/');
  await page.sleep(3000);

  const profileUrl = await getProfileUrl();

  if (!profileUrl) {
    // Try navigating to /me which redirects to profile
    await page.setData('status', 'Navigating to your profile...');
    await page.goto('https://www.linkedin.com/in/me/');
    await page.sleep(3000);
  } else {
    await page.setData('status', 'Navigating to your profile...');
    await page.goto(profileUrl);
    await page.sleep(3000);
  }

  state.profileUrl = await page.evaluate(`window.location.href`);

  // Scroll to load lazy content
  await page.setData('status', 'Loading profile content...');
  await scrollToLoadContent();

  // Extract hero section
  await page.setData('status', 'Extracting profile header...');
  state.heroData = await extractHeroSection();

  if (state.heroData?.fullName) {
    await page.setData('status', `Found profile: ${state.heroData.fullName}`);
  }

  // Extract about section
  await page.setData('status', 'Extracting about section...');
  state.aboutData = await extractAboutSection();

  // Extract experiences
  await page.setData('status', 'Extracting work experience...');
  state.experiences = await extractExperiences();
  await page.setData('status', `Found ${state.experiences.length} experiences`);

  // Extract education
  await page.setData('status', 'Extracting education...');
  state.education = await extractEducation();
  await page.setData('status', `Found ${state.education.length} education entries`);

  // Extract skills
  await page.setData('status', 'Extracting skills...');
  state.skills = await extractSkills();
  await page.setData('status', `Found ${state.skills.length} skills`);

  // Build final result
  const transformDataForSchema = () => {
    const hero = state.heroData || {};
    const about = state.aboutData || {};

    return {
      profileUrl: state.profileUrl,
      fullName: hero.fullName || '',
      headline: hero.headline || '',
      location: hero.location || '',
      connections: hero.connections || '',
      profilePictureUrl: hero.profilePictureUrl || '',
      backgroundImageUrl: hero.backgroundImageUrl || '',
      about: about.aboutText || '',
      experience: state.experiences,
      education: state.education,
      skills: state.skills,
      // Standard export summary for consistent UI display
      exportSummary: {
        count: state.experiences.length,
        label: state.experiences.length === 1 ? 'experience' : 'experiences'
      },
      timestamp: new Date().toISOString(),
      version: "1.0.0-playwright",
      platform: "linkedin"
    };
  };

  state.isComplete = true;
  const result = transformDataForSchema();

  if (result && result.fullName) {
    await page.setData('result', result);
    await page.setData('status', `Complete! Profile exported for ${result.fullName}`);
    return { success: true, data: result };
  } else {
    await page.setData('error', 'Failed to extract profile data');
    return { success: false, error: 'Failed to extract profile data' };
  }
})();
