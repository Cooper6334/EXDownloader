// Content script for EXH Downloader - Gallery page functionality
console.log('EXH Downloader gallery content script loaded on:', window.location.href);

// Function to extract gallery title
function extractGalleryTitle() {
  const titleElement = document.querySelector('#gj');
  return titleElement ? titleElement.textContent.trim() : '';
}

// Function to check if gallery has torrents
function checkTorrentAvailability() {
  const torrentElements = document.querySelectorAll('a[onclick*="popUp"][onclick*="gallerytorrents.php"]');
  
  for (const element of torrentElements) {
    const text = element.textContent.trim();
    // Check if it shows "Torrent Download (0)" or similar
    const match = text.match(/Torrent Download \((\d+)\)/);
    if (match) {
      const count = parseInt(match[1]);
      return {
        hasLinks: count > 0,
        count: count,
        text: text
      };
    }
  }
  
  return {
    hasLinks: false,
    count: 0,
    text: 'No torrent download link found'
  };
}

// Function to extract torrent popup URL from gallery page
function extractTorrentPopupUrl() {
  const torrentLinks = [];
  const torrentInfo = checkTorrentAvailability();
  const galleryTitle = extractGalleryTitle();
  
  // If no torrents available, return info about the gallery
  if (!torrentInfo.hasLinks) {
    console.log('No torrents available for gallery:', galleryTitle);
    return {
      torrentLinks: [],
      galleryTitle: galleryTitle,
      torrentStatus: `該漫畫沒有種子 (${torrentInfo.text})`,
      hasTorrents: false
    };
  }
  
  // Look for the specific torrent download link pattern you mentioned
  const torrentElements = document.querySelectorAll('a[onclick*="popUp"][onclick*="gallerytorrents.php"]');
  
  torrentElements.forEach(element => {
    const onclickAttr = element.getAttribute('onclick');
    if (onclickAttr) {
      // Extract URL from onclick="return popUp('URL',610,590)"
      const match = onclickAttr.match(/popUp\('([^']+)',\d+,\d+\)/);
      if (match && match[1]) {
        const torrentUrl = match[1];
        torrentLinks.push({
          text: element.textContent.trim(),
          href: element.href,
          torrentPageUrl: torrentUrl,
          onclick: onclickAttr
        });
        console.log('Found torrent popup URL:', torrentUrl);
      }
    }
  });
  
  return {
    torrentLinks: torrentLinks,
    galleryTitle: galleryTitle,
    torrentStatus: `找到 ${torrentLinks.length} 個種子連結`,
    hasTorrents: true
  };
}

// Function to open torrent page and extract download links
async function fetchTorrentLinksFromPopup(torrentPageUrl) {
  try {
    // Since we can't directly fetch due to CORS, we'll communicate with background script
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'fetchTorrentPage',
        url: torrentPageUrl
      }, response => {
        if (response.success) {
          resolve(response.torrentLinks);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  } catch (error) {
    console.error('Error fetching torrent links:', error);
    return [];
  }
}

// Function to auto-extract and process torrent links
async function autoProcessTorrentLinks() {
  const galleryData = extractTorrentPopupUrl();
  
  if (!galleryData.hasTorrents) {
    console.log('No torrents available for gallery:', galleryData.galleryTitle);
    return {
      galleryTitle: galleryData.galleryTitle,
      torrentStatus: galleryData.torrentStatus,
      hasTorrents: false,
      torrentLinks: []
    };
  }
  
  if (galleryData.torrentLinks.length === 0) {
    console.log('No torrent popup URLs found on this gallery page');
    return {
      galleryTitle: galleryData.galleryTitle,
      torrentStatus: '找不到種子下載連結',
      hasTorrents: false,
      torrentLinks: []
    };
  }
  
  const allTorrentLinks = [];
  
  for (const popup of galleryData.torrentLinks) {
    try {
      const torrentLinks = await fetchTorrentLinksFromPopup(popup.torrentPageUrl);
      if (torrentLinks.length > 0) {
        allTorrentLinks.push({
          popupInfo: popup,
          torrentLinks: torrentLinks
        });
      }
    } catch (error) {
      console.error('Failed to fetch torrent links for:', popup.torrentPageUrl, error);
    }
  }
  
  return {
    galleryTitle: galleryData.galleryTitle,
    torrentStatus: galleryData.torrentStatus,
    hasTorrents: true,
    torrentLinks: allTorrentLinks
  };
}

// Listen for messages from background script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getGalleryTorrentLinks') {
    autoProcessTorrentLinks().then(results => {
      sendResponse({ success: true, results: results });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  } else if (request.action === 'extractTorrentUrls') {
    const urls = extractTorrentPopupUrl();
    sendResponse({ torrentUrls: urls });
  }
});

// Auto-extract on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const galleryData = extractTorrentPopupUrl();
      console.log(`Gallery: ${galleryData.galleryTitle}`);
      console.log(`Torrent Status: ${galleryData.torrentStatus}`);
      if (galleryData.hasTorrents && galleryData.torrentLinks.length > 0) {
        console.log(`Found ${galleryData.torrentLinks.length} torrent popup URLs on gallery page`);
      }
    }, 1000);
  });
} else {
  setTimeout(() => {
    const galleryData = extractTorrentPopupUrl();
    console.log(`Gallery: ${galleryData.galleryTitle}`);
    console.log(`Torrent Status: ${galleryData.torrentStatus}`);
    if (galleryData.hasTorrents && galleryData.torrentLinks.length > 0) {
      console.log(`Found ${galleryData.torrentLinks.length} torrent popup URLs on gallery page`);
    }
  }, 1000);
}