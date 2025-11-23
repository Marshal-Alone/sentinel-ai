let btn = document.getElementById('toggleBtn');
let apiUrlInput = document.getElementById('apiUrl');
let saveBtn = document.getElementById('saveBtn');
let testBtn = document.getElementById('testBtn');
let statusMsg = document.getElementById('statusMsg');
let lastLog = document.getElementById('lastLog');

// Load initial state
chrome.storage.local.get(['sentinelActive', 'backendUrl', 'lastLog'], function (result) {
  updateBtn(result.sentinelActive !== false); // Default to true
  apiUrlInput.value = result.backendUrl || "https://sa-d-bo-sentinel-brain.hf.space";
  if (result.lastLog) {
    lastLog.innerText = result.lastLog;
  }
});

// Listen for updates from background.js
chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (changes.lastLog) {
    lastLog.innerText = changes.lastLog.newValue;
  }
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
  if (url.endsWith('/')) url = url.slice(0, -1);

  chrome.storage.local.set({ backendUrl: url }, function () {
    showStatus("Saved!", false);
  });
};

// Test Connection Logic
testBtn.onclick = function () {
  let url = apiUrlInput.value.trim();
  if (url.endsWith('/')) url = url.slice(0, -1);

  showStatus("Testing...", false);

  fetch(`${url}/`)
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error(`Status: ${response.status}`);
      }
    })
    .then(data => {
      showStatus("Online: " + data.status, false);
    })
    .catch(error => {
      showStatus("Error: " + error.message, true);
    });
};

function updateBtn(isOn) {
  btn.innerText = isOn ? "SENTINEL ON" : "SENTINEL PAUSED";
  btn.className = isOn ? "on" : "off";
}

function showStatus(msg, isError) {
  statusMsg.innerText = msg;
  statusMsg.className = "status-msg" + (isError ? " error-msg" : "");
}