console.log('EXDownloader settings page loaded');

document.addEventListener('DOMContentLoaded', function() {
  const backBtn = document.getElementById('backBtn');
  
  // Handle back button click
  backBtn.addEventListener('click', function() {
    // Close current window and return to popup
    window.close();
  });
  
  console.log('Settings page initialized');
});