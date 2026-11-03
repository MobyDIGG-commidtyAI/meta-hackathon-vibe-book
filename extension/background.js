// Toolbar fallback: when the photo chip doesn't show up, clicking the extension icon reads
// the post in the middle of the screen and opens the same panel.
const FACEBOOK = /^https:\/\/([^/]+\.)?facebook\.com\//;

chrome.action.onClicked.addListener(async (tab) => {
  if (!FACEBOOK.test(tab.url ?? "")) return;
  const msg = { type: "vibebook:open-center" };
  try {
    await chrome.tabs.sendMessage(tab.id, msg);
  } catch {
    // No content script in this tab yet (it was open before the extension was installed or reloaded).
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    await chrome.tabs.sendMessage(tab.id, msg);
  }
});
