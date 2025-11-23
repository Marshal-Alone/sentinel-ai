let btn = document.getElementById('toggleBtn');
let apiUrlInput = document.getElementById('apiUrl');
let saveBtn = document.getElementById('saveBtn');
let statusMsg = document.getElementById('statusMsg');

// Load initial state
chrome.storage.local.get(['sentinelActive', 'backendUrl'], function (result) {
  updateBtn(result.sentinelActive !== false); // Default to true
  apiUrlInput.value = result.backendUrl || "http://localhost:8000";
});

// Toggle Logic
btn.onclick = function () {
  chrome.storage.local.get(['sentinelActive'], function (result) {
    let newState = !(result.sentinelActive !== false);
    chrome.storage.local.set({ sentinelActive: newState }, function () {
      updateBtn(newState);
    });
  });
};

// Save Config Logic
saveBtn.onclick = function () {
  let url = apiUrlInput.value.trim();
  // Remove trailing slash if present
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  chrome.storage.local.set({ backendUrl: url }, function () {
    statusMsg.innerText = "Saved!";
    setTimeout(() => { statusMsg.innerText = ""; }, 2000);
  });
};

function updateBtn(isOn) {
  btn.innerText = isOn ? "SENTINEL ON" : "SENTINEL PAUSED";
  btn.className = isOn ? "on" : "off";
}