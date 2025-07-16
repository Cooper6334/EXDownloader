console.log('EXH Downloader popup loaded');

document.addEventListener('DOMContentLoaded', function() {
  const downloadBestBtn = document.getElementById('downloadBest');
  const statusDiv = document.getElementById('status');
  const resultsDiv = document.getElementById('results');

  // Function to update status
  function updateStatus(message) {
    statusDiv.textContent = message;
  }

  // Function to download file directly
  function downloadFile(url, filename) {
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false
    }, function(downloadId) {
      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError);
        updateStatus(`Download failed: ${chrome.runtime.lastError.message}`);
      } else {
        console.log('Download started with ID:', downloadId);
      }
    });
  }

  // Function to display download results
  function displayResults(results, downloadStats) {
    resultsDiv.innerHTML = '';
    
    if (results.length === 0) {
      resultsDiv.innerHTML = '<div class="status">No matching tabs or torrent links found</div>';
      return;
    }

    results.forEach(result => {
      const resultItem = document.createElement('div');
      resultItem.className = 'result-item';
      
      // Check if this result has no torrents
      if (result.hasTorrents === false) {
        // Display "no torrents" message with gallery title
        resultItem.style.backgroundColor = '#ffe6e6';
        resultItem.style.border = '2px solid #ff9999';
        
        const tabInfo = document.createElement('div');
        tabInfo.className = 'tab-info';
        tabInfo.textContent = `❌ ${result.galleryTitle || result.title || result.url}`;
        tabInfo.style.color = '#cc0000';
        resultItem.appendChild(tabInfo);
        
        const statusDiv = document.createElement('div');
        statusDiv.style.fontSize = '12px';
        statusDiv.style.color = '#cc0000';
        statusDiv.style.marginTop = '5px';
        statusDiv.textContent = result.torrentStatus || '該漫畫沒有種子';
        resultItem.appendChild(statusDiv);
        
        resultsDiv.appendChild(resultItem);
        return;
      }
      
      if (result.torrentLinks && result.torrentLinks.length > 0) {
        const bestTorrent = result.torrentLinks[0]; // Already sorted by downloads
        
        // Check if this was downloaded or skipped
        const wasDownloaded = result.downloaded;
        const wasSkipped = result.skipped;
        
        if (wasDownloaded) {
          resultItem.style.backgroundColor = '#e8f5e8';
          resultItem.style.border = '2px solid #4CAF50';
        } else if (wasSkipped) {
          resultItem.style.backgroundColor = '#fff3cd';
          resultItem.style.border = '2px solid #ffc107';
        }
        
        const tabInfo = document.createElement('div');
        tabInfo.className = 'tab-info';
        if (wasDownloaded) {
          tabInfo.textContent = `✓ Downloaded from: ${result.galleryTitle || result.title || result.url}`;
        } else if (wasSkipped) {
          tabInfo.textContent = `⚠ Skipped (duplicate) from: ${result.galleryTitle || result.title || result.url}`;
          tabInfo.style.color = '#856404';
        } else {
          tabInfo.textContent = result.galleryTitle || result.title || result.url;
        }
        resultItem.appendChild(tabInfo);
        
        const infoDiv = document.createElement('div');
        infoDiv.style.fontSize = '11px';
        infoDiv.style.color = '#666';
        infoDiv.style.marginBottom = '3px';
        
        let infoText = `Downloads: ${bestTorrent.downloads || 0} | Size: ${bestTorrent.size || 'N/A'} | Seeds: ${bestTorrent.seeds || 0}`;
        if (bestTorrent.uploader) {
          infoText += ` | Uploader: ${bestTorrent.uploader}`;
        }
        infoDiv.textContent = infoText;
        resultItem.appendChild(infoDiv);
        
        const linkText = document.createElement('div');
        linkText.textContent = bestTorrent.text || bestTorrent.href;
        linkText.style.fontWeight = 'bold';
        linkText.style.color = wasDownloaded ? '#2e7d32' : '#856404';
        resultItem.appendChild(linkText);
        
        resultsDiv.appendChild(resultItem);
      }
    });
    
    let statusMessage = `Downloaded: ${downloadStats.downloaded}, Skipped: ${downloadStats.skipped}`;
    if (downloadStats.skipped > 0) {
      statusMessage += ` (${downloadStats.skipped} duplicates avoided)`;
    }
    updateStatus(statusMessage);
  }

  // Find and download best torrent from all matching tabs
  downloadBestBtn.addEventListener('click', function() {
    updateStatus('Finding and downloading best torrents...');
    downloadBestBtn.disabled = true;

    chrome.runtime.sendMessage({ action: 'findTorrentLinks' }, function(response) {
      downloadBestBtn.disabled = false;
      
      if (response.success) {
        if (response.results.length === 0) {
          updateStatus('No matching tabs found');
          return;
        }
        
        // Track downloaded URLs and filenames to avoid duplicates
        const downloadedUrls = new Set();
        const downloadedFilenames = new Set();
        let downloadCount = 0;
        let skipCount = 0;
        
        response.results.forEach(result => {
          // Skip results with no torrents
          if (result.hasTorrents === false) {
            return;
          }
          
          if (result.torrentLinks && result.torrentLinks.length > 0) {
            const bestTorrent = result.torrentLinks[0]; // Already sorted by downloads
            
            // Extract the actual download URL from onclick if it exists
            let downloadUrl = bestTorrent.href;
            if (bestTorrent.onclick) {
              const match = bestTorrent.onclick.match(/document\.location='([^']+)'/);
              if (match) {
                downloadUrl = match[1];
              }
            }
            
            // Generate a clean filename
            let filename = bestTorrent.text || 'torrent.torrent';
            if (!filename.endsWith('.torrent')) {
              filename += '.torrent';
            }
            // Clean filename for downloads
            filename = filename.replace(/[<>:"/\\|?*]/g, '_');
            
            // Check for duplicates using both URL and filename
            const isDuplicateUrl = downloadedUrls.has(downloadUrl);
            const isDuplicateFilename = downloadedFilenames.has(filename);
            
            if (isDuplicateUrl || isDuplicateFilename) {
              // Mark as skipped
              result.skipped = true;
              skipCount++;
              console.log(`Skipping duplicate: ${filename} (URL: ${downloadUrl})`);
            } else {
              // Add to tracking sets and download
              downloadedUrls.add(downloadUrl);
              downloadedFilenames.add(filename);
              downloadFile(downloadUrl, filename);
              result.downloaded = true;
              downloadCount++;
            }
          }
        });
        
        const downloadStats = {
          downloaded: downloadCount,
          skipped: skipCount
        };
        
        if (downloadCount > 0 || skipCount > 0) {
          displayResults(response.results, downloadStats);
        } else {
          updateStatus('No torrent links found in matching tabs');
        }
      } else {
        updateStatus(`Error: ${response.error}`);
      }
    });
  });

  updateStatus('Ready - Click to find and download best torrents');
});
