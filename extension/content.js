// Sentinel Eye - Content Scraper

function getPageContext() {
  const title = document.title;
  const url = window.location.href;

  // Basic Metadata
  const metaDesc = document.querySelector("meta[name='description']")?.content || "";

  // Platform Specific Scrapers
  let specificContext = "";

  if (url.includes("youtube.com/watch")) {
    const descriptionEl = document.querySelector("#description-inline-expander");
    if (descriptionEl) {
      specificContext = "Video Description: " + descriptionEl.innerText.substring(0, 300);
    }
  } else if (url.includes("instagram.com")) {
    const images = document.querySelectorAll("img");
    images.forEach(img => {
      if (img.alt) specificContext += "Image content: " + img.alt + ". ";
    });
  }

  // General Context (H1s)
  const headers = Array.from(document.querySelectorAll('h1'))
    .map(h => h.innerText)
    .join(" - ");

  return {
    title: title,
    url: url,
    content: `${title}. ${metaDesc}. ${headers}. ${specificContext}`,
    platform: window.location.hostname,
    timestamp: new Date().toISOString() // ISO String for Python backend
  };
}

// Auto-log active page after 3 seconds
setTimeout(() => {
  const data = getPageContext();
  chrome.runtime.sendMessage({ type: "log_activity", payload: data });
}, 3000);

// Listen for manual triggers if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "snapshot") {
    sendResponse(getPageContext());
  }
});