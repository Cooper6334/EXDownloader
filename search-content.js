// Content script for EXH Downloader - Search page functionality
console.log('EXH Downloader search content script loaded on:', window.location.href);

// Function to modify torrent button width
function modifyTorrentButtons() {
  // Find all torrent buttons with the specific image
  const torrentButtons = document.querySelectorAll('img[src="https://exhentai.org/img/t.png"]');
  
  torrentButtons.forEach(img => {
    // Set the image width to 30px
    img.style.width = '30px';
    
    // Also modify the parent element if it's a link or button
    const parent = img.parentElement;
    if (parent) {
      parent.style.width = '30px';
      parent.style.display = 'inline-block';
      parent.style.textAlign = 'center';
    }
    
    console.log('Modified torrent button width to 30px');
  });
  
  return torrentButtons.length;
}

// Function to check if we're on a search page
function isSearchPage() {
  return window.location.href.includes('exhentai.org/?f_search') || 
         window.location.href.includes('exhentai.org/') ||
         window.location.pathname === '/';
}

// Run the modification function when page loads
function initializeButtonModification() {
  if (isSearchPage()) {
    // Initial modification
    modifyTorrentButtons();
    
    // Create a MutationObserver to handle dynamically added content
    const observer = new MutationObserver(function(mutations) {
      let shouldModify = false;
      
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node contains torrent buttons
              const torrentImgs = node.querySelectorAll ? node.querySelectorAll('img[src="https://exhentai.org/img/t.png"]') : [];
              if (torrentImgs.length > 0 || (node.tagName === 'IMG' && node.src === 'https://exhentai.org/img/t.png')) {
                shouldModify = true;
              }
            }
          });
        }
      });
      
      if (shouldModify) {
        setTimeout(modifyTorrentButtons, 100); // Small delay to ensure DOM is ready
      }
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('EXH Downloader: Torrent button width modification initialized');
  }
}

// Run when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeButtonModification);
} else {
  initializeButtonModification();
}

// Also run after a short delay to catch any late-loading elements
setTimeout(() => {
  if (isSearchPage()) {
    modifyTorrentButtons();
  }
}, 2000);