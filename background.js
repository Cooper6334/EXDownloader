// Background script for EXH Downloader
console.log('EXH Downloader background script loaded');

// Function to find torrent links in all matching tabs
async function findTorrentLinksInAllTabs() {
  try {
    // Query all tabs that match the target URL pattern
    const tabs = await chrome.tabs.query({
      url: "https://exhentai.org/gallerytorrents.php*"
    });
    
    console.log(`Found ${tabs.length} matching tabs`);
    
    const results = [];
    
    for (const tab of tabs) {
      try {
        // Execute script in each matching tab to find torrent links
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: findTorrentLinksInPage
        });
        
        if (result.result && result.result.length > 0) {
          results.push({
            tabId: tab.id,
            url: tab.url,
            title: tab.title,
            torrentLinks: result.result
          });
        }
      } catch (error) {
        console.error(`Error processing tab ${tab.id}:`, error);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error finding torrent links:', error);
    return [];
  }
}

// Function to be injected into pages to find torrent links
function findTorrentLinksInPage() {
  const torrentData = [];
  
  // Check if page shows "There are no torrents for this gallery."
  const noTorrentsMessage = document.body.textContent.includes('There are no torrents for this gallery.');
  if (noTorrentsMessage) {
    console.log('Page shows "There are no torrents for this gallery."');
    return [];
  }
  
  // Find all forms containing torrent links
  const forms = document.querySelectorAll('form[action*="gallerytorrents.php"]');
  
  forms.forEach(form => {
    const link = form.querySelector('a[href^="https://exhentai.org/torrent/"]');
    if (!link) return;
    
    // Find the Downloads count in the same form
    let downloads = 0;
    const downloadsCell = form.querySelector('td');
    const allCells = form.querySelectorAll('td');
    
    // Look for Downloads: pattern in all cells
    allCells.forEach(cell => {
      const text = cell.textContent;
      const match = text.match(/Downloads:\s*(\d+)/);
      if (match) {
        downloads = parseInt(match[1]);
      }
    });
    
    // Extract other information
    let size = '';
    let seeds = 0;
    let peers = 0;
    let uploader = '';
    let posted = '';
    
    allCells.forEach(cell => {
      const text = cell.textContent.trim();
      if (text.includes('Size:')) {
        size = text.replace('Size:', '').trim();
      } else if (text.includes('Seeds:')) {
        seeds = parseInt(text.replace('Seeds:', '').trim()) || 0;
      } else if (text.includes('Peers:')) {
        peers = parseInt(text.replace('Peers:', '').trim()) || 0;
      } else if (text.includes('Uploader:')) {
        uploader = text.replace('Uploader:', '').trim();
      } else if (text.includes('Posted:')) {
        posted = text.replace('Posted:', '').trim();
      }
    });
    
    torrentData.push({
      href: link.href,
      text: link.textContent.trim(),
      onclick: link.getAttribute('onclick'),
      downloads: downloads,
      size: size,
      seeds: seeds,
      peers: peers,
      uploader: uploader,
      posted: posted
    });
  });
  
  // Sort by downloads count (highest first) and return the best one
  torrentData.sort((a, b) => b.downloads - a.downloads);
  
  console.log(`Found ${torrentData.length} torrent links, best has ${torrentData[0]?.downloads || 0} downloads`);
  return torrentData;
}

// Function to fetch torrent page content and extract links
async function fetchTorrentPageContent(torrentPageUrl) {
  try {
    // Create a new tab to load the torrent page
    const tab = await chrome.tabs.create({
      url: torrentPageUrl,
      active: false
    });
    
    // Wait a moment for the page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Execute script to extract torrent links
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: findTorrentLinksInPage
    });
    
    // Close the tab
    await chrome.tabs.remove(tab.id);
    
    return result.result || [];
  } catch (error) {
    console.error('Error fetching torrent page:', error);
    return [];
  }
}

// Function to find gallery pages with torrent links
async function findGalleryTorrentLinks() {
  try {
    const tabs = await chrome.tabs.query({
      url: "https://exhentai.org/g/*"
    });
    
    console.log(`Found ${tabs.length} gallery tabs`);
    
    const results = [];
    
    for (const tab of tabs) {
      try {
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // Extract gallery title
            function extractGalleryTitle() {
              const titleElement = document.querySelector('#gj');
              return titleElement ? titleElement.textContent.trim() : '';
            }

            // Check if gallery has torrents
            function checkTorrentAvailability() {
              const torrentElements = document.querySelectorAll('a[onclick*="popUp"][onclick*="gallerytorrents.php"]');
              
              for (const element of torrentElements) {
                const text = element.textContent.trim();
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

            // Extract torrent popup URLs from gallery page
            const torrentElements = document.querySelectorAll('a[onclick*="popUp"][onclick*="gallerytorrents.php"]');
            const urls = [];
            const torrentInfo = checkTorrentAvailability();
            const galleryTitle = extractGalleryTitle();
            
            if (!torrentInfo.hasLinks) {
              return {
                galleryTitle: galleryTitle,
                torrentStatus: `該漫畫沒有種子 (${torrentInfo.text})`,
                hasTorrents: false,
                torrentUrls: []
              };
            }
            
            torrentElements.forEach(element => {
              const onclickAttr = element.getAttribute('onclick');
              if (onclickAttr) {
                const match = onclickAttr.match(/popUp\('([^']+)',\d+,\d+\)/);
                if (match && match[1]) {
                  urls.push({
                    text: element.textContent.trim(),
                    torrentPageUrl: match[1]
                  });
                }
              }
            });
            
            return {
              galleryTitle: galleryTitle,
              torrentStatus: `找到 ${urls.length} 個種子連結`,
              hasTorrents: true,
              torrentUrls: urls
            };
          }
        });
        
        if (result.result) {
          const galleryData = result.result;
          
          // Always add gallery results to show status (whether they have torrents or not)
          if (!galleryData.hasTorrents) {
            // No torrents available - add to results to show the status
            results.push({
              tabId: tab.id,
              url: tab.url,
              title: tab.title,
              galleryTitle: galleryData.galleryTitle,
              torrentStatus: galleryData.torrentStatus,
              hasTorrents: false,
              torrentLinks: []
            });
          } else if (galleryData.torrentUrls && galleryData.torrentUrls.length > 0) {
            // For each torrent URL found, fetch the actual torrent links
            const torrentLinks = [];
            
            for (const urlInfo of galleryData.torrentUrls) {
              const links = await fetchTorrentPageContent(urlInfo.torrentPageUrl);
              if (links.length > 0) {
                torrentLinks.push(...links);
              }
            }
            
            // If no actual torrent links were found, treat as no torrents
            if (torrentLinks.length === 0) {
              results.push({
                tabId: tab.id,
                url: tab.url,
                title: tab.title,
                galleryTitle: galleryData.galleryTitle,
                torrentStatus: '該漫畫沒有種子 (torrent頁面內容為空)',
                hasTorrents: false,
                torrentLinks: []
              });
            } else {
              results.push({
                tabId: tab.id,
                url: tab.url,
                title: tab.title,
                galleryTitle: galleryData.galleryTitle,
                torrentStatus: galleryData.torrentStatus,
                hasTorrents: true,
                torrentLinks: torrentLinks
              });
            }
          }
        } else {
          // If no result returned, still add the tab to show it was checked
          results.push({
            tabId: tab.id,
            url: tab.url,
            title: tab.title,
            galleryTitle: tab.title || 'Unknown Gallery',
            torrentStatus: '無法檢測種子狀態',
            hasTorrents: false,
            torrentLinks: []
          });
        }
      } catch (error) {
        console.error(`Error processing gallery tab ${tab.id}:`, error);
        // Add error result to show the tab was processed but failed
        results.push({
          tabId: tab.id,
          url: tab.url,
          title: tab.title,
          galleryTitle: tab.title || 'Unknown Gallery',
          torrentStatus: `檢測失敗: ${error.message}`,
          hasTorrents: false,
          torrentLinks: []
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error finding gallery torrent links:', error);
    return [];
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'findTorrentLinks') {
    // Check both regular torrent pages and gallery pages
    Promise.all([
      findTorrentLinksInAllTabs(),
      findGalleryTorrentLinks()
    ]).then(([regularResults, galleryResults]) => {
      const allResults = [...regularResults, ...galleryResults];
      sendResponse({ success: true, results: allResults });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep the message channel open for async response
  } else if (request.action === 'fetchTorrentPage') {
    fetchTorrentPageContent(request.url).then(torrentLinks => {
      sendResponse({ success: true, torrentLinks: torrentLinks });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});