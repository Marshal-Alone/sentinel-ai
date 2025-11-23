// Default Backend URL
const DEFAULT_API_URL = "https://sa-d-bo-sentinel-brain.hf.space";

function logStatus(msg) {
    const time = new Date().toLocaleTimeString();
    const fullMsg = `[${time}] ${msg}`;
    console.log(fullMsg);
    chrome.storage.local.set({ lastLog: fullMsg });
}

// This listens for the data coming from the open tab (content.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // CHECK IF PAUSED
    chrome.storage.local.get(['sentinelActive', 'backendUrl'], function (result) {
        if (result.sentinelActive === false) return; // Stop if paused

        const apiUrl = result.backendUrl || DEFAULT_API_URL;

        if (message.type === "log_activity") {
            const title = message.payload.title || "Unknown Page";
            logStatus(`Attempting to log: ${title.substring(0, 20)}...`);

            // 1. Show "..." on the icon to show we are thinking
            if (sender.tab) {
                chrome.action.setBadgeText({ text: "...", tabId: sender.tab.id });
                chrome.action.setBadgeBackgroundColor({ color: "#FFD700", tabId: sender.tab.id }); // Gold color
            }

            // 2. DIRECTLY send data to the Python Brain (The "Invisible Wire")
            fetch(`${apiUrl}/ingest`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(message.payload)
            })
                .then(response => {
                    if (response.ok) {
                        logStatus(`✅ Success: ${title.substring(0, 20)}...`);
                        // 3. Change icon to "OK" (Green) so you know it worked
                        if (sender.tab) {
                            chrome.action.setBadgeText({ text: "OK", tabId: sender.tab.id });
                            chrome.action.setBadgeBackgroundColor({ color: "#4CAF50", tabId: sender.tab.id });
                        }
                    } else {
                        logStatus(`❌ Server Error: ${response.status}`);
                        console.error("Server error");
                        if (sender.tab) {
                            chrome.action.setBadgeText({ text: "ERR", tabId: sender.tab.id });
                            chrome.action.setBadgeBackgroundColor({ color: "#F44336", tabId: sender.tab.id });
                        }
                    }
                })
                .catch(error => {
                    logStatus(`❌ Network Error: ${error.message}`);
                    console.error("Network error - Is Python running?", error);
                    if (sender.tab) {
                        chrome.action.setBadgeText({ text: "OFF", tabId: sender.tab.id }); // Python backend is likely offline
                        chrome.action.setBadgeBackgroundColor({ color: "#000000", tabId: sender.tab.id });
                    }
                });
        }
    });
});