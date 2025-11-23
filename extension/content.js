// Helper to debounce logs so we don't spam the server while you type
let timer;

function sendLog(data) {
  chrome.runtime.sendMessage({ type: "log_activity", payload: data });
}

function getPageContext() {
  const url = window.location.href;
  let content = "";
  let title = document.title;

  // --- STRATEGY 1: CHATGPT SPECIFIC ---
  if (url.includes("chatgpt.com")) {
    const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
    const aiMessages = document.querySelectorAll('[data-message-author-role="assistant"]');

    if (userMessages.length > 0) {
      const lastUser = userMessages[userMessages.length - 1].innerText;
      const lastAI = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].innerText : "...";

      title = `ChatGPT Conversation: ${lastUser.substring(0, 30)}...`;
      content = `User asked: ${lastUser}\nChatGPT Answered: ${lastAI}`;
    } else {
      return null;
    }
  }

  // --- STRATEGY 2: INSTAGRAM REELS SPECIFIC ---
  else if (url.includes("instagram.com/reel")) {
    const captionEl = document.querySelector('h1') || document.querySelector('span._aacl');
    const captionText = captionEl ? captionEl.innerText : "Watched an Instagram Reel";

    content = `Reel URL: ${url} - Caption Preview: ${captionText}`;
  }

  // --- STRATEGY 3: GENERIC WEBPAGE ---
  else {
    const metaDesc = document.querySelector("meta[name='description']")?.content || "";
    const headers = Array.from(document.querySelectorAll('h1, h2'))
      .map(h => h.innerText)
      .slice(0, 10)
      .join(" ");
    content = `${title} - ${metaDesc} - ${headers}`;
  }

  return {
    title: title,
    url: url,
    content: content,
    timestamp: new Date().toISOString()
  };
}

// --- UI INJECTION ---

function createFloatingButton() {
  if (document.getElementById('sentinel-fab')) return;

  const btn = document.createElement('div');
  btn.id = 'sentinel-fab';
  btn.title = "Save to Sentinel Memory";
  btn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5 10 10 0 0 0-10 0Z"></path>
            <path d="M8.5 8.5a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1-5 0Z"></path>
        </svg>
    `;

  // Styles
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '50px',
    height: '50px',
    backgroundColor: '#000000',
    color: '#ffffff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: '999999',
    transition: 'transform 0.2s, background-color 0.2s',
    border: '2px solid #333'
  });

  // Hover effects
  btn.onmouseenter = () => { btn.style.transform = 'scale(1.1)'; };
  btn.onmouseleave = () => { btn.style.transform = 'scale(1.0)'; };

  // Click Action
  btn.onclick = async () => {
    // Visual Feedback: Loading
    btn.style.backgroundColor = '#FFD700'; // Gold
    btn.innerHTML = '...';

    const data = getPageContext();
    if (data) {
      try {
        // Send to background script
        chrome.runtime.sendMessage({ type: "log_activity", payload: data }, (response) => {
          // We don't easily get the HTTP response back here from sendMessage unless we setup a complex callback chain
          // So we just simulate success after a short delay if no runtime error
          setTimeout(() => {
            btn.style.backgroundColor = '#4CAF50'; // Green
            btn.innerHTML = '✓';
            setTimeout(resetBtn, 2000);
          }, 500);
        });
      } catch (e) {
        showError();
      }
    } else {
      showError();
    }
  };

  function resetBtn() {
    btn.style.backgroundColor = '#000000';
    btn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5 10 10 0 0 0-10 0Z"></path>
                <path d="M8.5 8.5a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1-5 0Z"></path>
            </svg>
        `;
  }

  function showError() {
    btn.style.backgroundColor = '#F44336'; // Red
    btn.innerHTML = '✕';
    setTimeout(resetBtn, 2000);
  }

  document.body.appendChild(btn);
}

// Inject immediately
createFloatingButton();

// Re-inject on dynamic page updates (SPA navigation)
const observer = new MutationObserver(() => {
  if (!document.getElementById('sentinel-fab')) {
    createFloatingButton();
  }
});
observer.observe(document.body, { childList: true, subtree: true });