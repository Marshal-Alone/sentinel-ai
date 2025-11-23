// Helper to debounce logs so we don't spam the server while you type
let timer;

function sendLog(data) {
  chrome.runtime.sendMessage({ type: "log_activity", payload: data });
}

function getPageContext() {
  const url = window.location.href;
  let content = "";
  let title = document.title;
  let type = "web";

  // --- STRATEGY 1: INSTAGRAM DIRECT MESSAGES (The Fix) ---
  if (url.includes("instagram.com/direct/t/")) {
    type = "chat";
    // 1. Grab the person's name from the header
    const headerName = document.querySelector("header h1, header span")?.innerText || "Unknown Chat";
    title = `Chat with ${headerName}`;

    // 2. Scrape the message bubbles (accessibility roles are usually stable)
    // IG uses role="row" or "listitem" for messages. We grab the last 20.
    const messages = Array.from(document.querySelectorAll('[role="row"], [role="listitem"]'))
      .slice(-20) // Only keep the latest 20 messages to maintain context
      .map(msg => {
        // Distinguish between "Me" and "Them" is hard without complex logic, 
        // so we just grab the raw text which usually looks like: "10:00 PM You: Hello"
        return msg.innerText.replace(/\n/g, " ");
      })
      .join("\n");

    if (messages.length > 0) {
      content = `CONVERSATION CONTEXT:\n${messages}`;
    } else {
      // Fallback: If specific selectors fail, grab the main text body
      content = document.querySelector("main")?.innerText || "Active chat window";
    }
  }

  // --- STRATEGY 2: CHATGPT SPECIFIC ---
  else if (url.includes("chatgpt.com")) {
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

  // --- STRATEGY 3: INSTAGRAM REELS SPECIFIC ---
  else if (url.includes("instagram.com/reel")) {
    type = "social_video";

    // Extract caption - Instagram uses various selectors
    let caption = "";

    // Try multiple selectors (Instagram changes these frequently)
    const captionSelectors = [
      'h1',
      'span._ap3a._aaco._aacu._aacx._aad7._aade',
      'span.x193iq5w',
      '[class*="Caption"]',
      'div[role="button"] span'
    ];

    for (const selector of captionSelectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText && element.innerText.length > 10) {
        caption = element.innerText;
        break;
      }
    }

    // Get username
    let username = "Unknown";
    const usernameEl = document.querySelector('a.x1i10hfl.xjbqb8w');
    if (usernameEl) {
      username = usernameEl.innerText || usernameEl.getAttribute('href')?.split('/')[1] || "Unknown";
    }

    // Fallback: get all visible text from main content area
    if (!caption || caption.length < 10) {
      const mainContent = document.querySelector('article, main');
      if (mainContent) {
        caption = mainContent.innerText.substring(0, 500);
      }
    }

    content = `Instagram Reel by ${username}\n\nCaption: ${caption || "No caption available"}\n\nURL: ${url}`;
  }

  // --- STRATEGY 4: YOUTUBE SPECIFIC ---
  else if (url.includes("youtube.com/watch") || url.includes("youtu.be/")) {
    type = "video";
    // For YouTube, just send the URL and title - the backend will fetch the full transcript
    content = `YouTube Video: ${url}`;
  }

  // --- STRATEGY 5: GENERIC WEBPAGE ---
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
    timestamp: new Date().toISOString(),
    type: type
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