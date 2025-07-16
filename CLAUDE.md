# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Extension project called "EXDownloader" that automatically detects and downloads the best torrent files from ExHentai gallery pages. The project follows Chrome Extension Manifest V3 format and provides intelligent torrent detection, duplicate prevention, and batch download management.

## Project Structure

- `manifest.json` - Chrome extension manifest file defining extension metadata and permissions
- `hello.html` - Popup HTML file that displays when the extension icon is clicked
- `popup.js` - JavaScript file that runs when the popup is opened
- `hello_extensions.png` - Extension icon file
- `README.md` - Project documentation with setup instructions

## Development Commands

This project doesn't require a build system or package manager. Development is done directly with the source files:

1. **Load Extension for Development**: Load the entire project directory as an unpacked extension in Chrome
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select this directory

2. **Testing**: Test the extension by clicking the extension icon in the Chrome toolbar

3. **Debugging**: Use Chrome Developer Tools to debug the popup and extension code

## Architecture Notes

- **Manifest V3**: Uses Chrome Extension Manifest V3 format
- **Popup-based Extension**: Simple popup extension that displays HTML content when clicked
- **No Background Scripts**: This basic extension doesn't use background scripts or content scripts
- **No External Dependencies**: Pure HTML/CSS/JavaScript with no build process or external libraries

## Extension Development Workflow

1. Make changes to HTML, CSS, or JavaScript files
2. Reload the extension in Chrome (`chrome://extensions/` → click reload button)
3. Test functionality by clicking the extension icon
4. Debug using Chrome Developer Tools if needed

## Key Files to Modify

- `manifest.json` - Add permissions, change extension metadata, or add new script files
- `hello.html` - Modify popup UI and structure
- `popup.js` - Add popup functionality and logic