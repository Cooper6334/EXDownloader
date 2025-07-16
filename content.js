// Content script for EXDownloader
console.log('EXDownloader content script loaded on:', window.location.href);

// Function to extract torrent data with Downloads info
function extractTorrentLinks() {
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
    const allCells = form.querySelectorAll('td');
    
    // Extract all information from the form
    let size = '';
    let seeds = 0;
    let peers = 0;
    let uploader = '';
    let posted = '';
    
    allCells.forEach(cell => {
      const text = cell.textContent.trim();
      if (text.includes('Downloads:')) {
        const match = text.match(/Downloads:\s*(\d+)/);
        if (match) {
          downloads = parseInt(match[1]);
        }
      } else if (text.includes('Size:')) {
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
    
    // Extract the actual download URL from onclick if it exists
    const href = link.href;
    const onclick = link.getAttribute('onclick');
    let downloadUrl = href;
    if (onclick) {
      const match = onclick.match(/document\.location='([^']+)'/);
      if (match) {
        downloadUrl = match[1];
      }
    }
    
    torrentData.push({
      displayUrl: href,
      downloadUrl: downloadUrl,
      filename: link.textContent.trim(),
      downloads: downloads,
      size: size,
      seeds: seeds,
      peers: peers,
      uploader: uploader,
      posted: posted,
      element: link
    });
  });
  
  // Sort by downloads count (highest first)
  torrentData.sort((a, b) => b.downloads - a.downloads);
  
  return torrentData;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTorrentLinks') {
    const torrentData = extractTorrentLinks();
    sendResponse({ torrentLinks: torrentData });
  }
});