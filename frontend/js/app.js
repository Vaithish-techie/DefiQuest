const API_BASE = 'http://localhost:8081/api';
const AI_BASE = 'http://localhost:5001';

// Blockchain Configuration
const SUPPORTED_CHAINS = {
  ethereum: {
    chainId: '0x1', // Mainnet
    chainName: 'Ethereum Mainnet',
    rpcUrls: ['https://mainnet.infura.io/v3/YOUR_INFURA_KEY'],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://etherscan.io']
  },
  sepolia: {
    chainId: '0xaa36a7', // Sepolia testnet
    chainName: 'Sepolia Test Network',
    rpcUrls: ['https://sepolia.infura.io/v3/YOUR_INFURA_KEY'],
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'SEP', decimals: 18 },
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  },
  blockdag: {
    chainId: '0x3039', // Example BlockDAG chain ID
    chainName: 'BlockDAG Testnet',
    rpcUrls: ['https://testnet-rpc.blockdag.org'],
    nativeCurrency: { name: 'BDAG', symbol: 'BDAG', decimals: 18 },
    blockExplorerUrls: ['https://explorer.blockdag.org']
  }
};

let wallet = localStorage.getItem('deFiQuestWallet');
let web3Provider = null;
let currentNetwork = null;

// DOM Elements
const topnav = document.getElementById('topnav');
const loginBtn = document.getElementById('login-btn');
const walletDisplay = document.getElementById('wallet-display');
const signoutBtn = document.getElementById('signout-btn');
const mainContent = document.getElementById('main-content');
const sidebar = document.getElementById('sidebar');
const quizModal = document.getElementById('quiz-modal');

setupEventListeners();
updateUI();

function setupEventListeners() {
  if (loginBtn)
    loginBtn.addEventListener('click', renderLanding);

  if (signoutBtn)
    signoutBtn.addEventListener('click', disconnectWallet);

  const questBtn = document.getElementById('mode-quest');
  if (questBtn)
    questBtn.addEventListener('click', () => {
      if (!wallet) return alert('Please connect your wallet first.');
      setActiveTab(questBtn);
      renderPathway();
    });

  const prodBtn = document.getElementById('mode-productivity');
  if (prodBtn)
    prodBtn.addEventListener('click', () => {
      if (!wallet) return alert('Please connect your wallet first.');
      setActiveTab(prodBtn);
      renderProductivity();
    });

  // Listen for MetaMask account changes
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
  }
}

function setActiveTab(activeBtn) {
  document.querySelectorAll('.navmode-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  activeBtn.classList.add('active');
}

function updateUI() {
  const loggedIn = !!wallet;
  if (loginBtn) loginBtn.classList.toggle('hidden', loggedIn);
  if (signoutBtn) signoutBtn.classList.toggle('hidden', !loggedIn);
  if (walletDisplay) {
    if (loggedIn) {
      walletDisplay.innerHTML = `
        <span>Wallet: ${wallet.slice(0, 6)}...${wallet.slice(-4)}</span>
        ${currentNetwork ? `<span class="network-indicator">${currentNetwork}</span>` : ''}
      `;
    } else {
      walletDisplay.textContent = '';
    }
  }
  if (sidebar) sidebar.classList.toggle('hidden', !loggedIn);
  if (!loggedIn) {
    setActiveTab(loginBtn);
  } else {
    setActiveTab(document.getElementById('mode-quest'));
  }
}

// MetaMask Integration Functions
async function detectMetaMask() {
  if (typeof window.ethereum !== 'undefined') {
    return window.ethereum;
  }
  return null;
}

async function connectMetaMask() {
  try {
    const ethereum = await detectMetaMask();
    if (!ethereum) {
      throw new Error('MetaMask not detected. Please install MetaMask to connect your wallet.');
    }

    // Request account access
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts.length === 0) {
      throw new Error('No accounts found. Please unlock MetaMask.');
    }

    const account = accounts[0];
    
    // Get network info
    const chainId = await ethereum.request({ method: 'eth_chainId' });
    currentNetwork = getNetworkName(chainId);

    // Authenticate with backend
    await authenticateWithBackend(account);
    
    wallet = account;
    localStorage.setItem('deFiQuestWallet', wallet);
    localStorage.setItem('deFiQuestNetwork', currentNetwork);
    
    updateUI();
    renderPathway();
    
    return account;
  } catch (error) {
    console.error('MetaMask connection error:', error);
    throw error;
  }
}

async function authenticateWithBackend(address) {
  try {
    // Get nonce from backend
    const nonceResponse = await fetch(`${API_BASE}/auth/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    });
    
    if (!nonceResponse.ok) {
      throw new Error('Failed to get authentication nonce');
    }
    
    const { nonce } = await nonceResponse.json();
    
    // Sign the nonce with MetaMask
    const message = `DeFiQuest Login Nonce: ${nonce}`;
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, address]
    });
    
    // Verify signature with backend
    const verifyResponse = await fetch(`${API_BASE}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, signature })
    });
    
    if (!verifyResponse.ok) {
      throw new Error('Authentication failed');
    }
    
    const { token } = await verifyResponse.json();
    localStorage.setItem('deFiQuestToken', token);
    
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

function getNetworkName(chainId) {
  switch (chainId) {
    case '0x1': return 'Ethereum';
    case '0xaa36a7': return 'Sepolia';
    case '0x3039': return 'BlockDAG'; // Example
    default: return 'Unknown';
  }
}

async function switchNetwork(networkKey) {
  try {
    const ethereum = await detectMetaMask();
    if (!ethereum) return;
    
    const network = SUPPORTED_CHAINS[networkKey];
    if (!network) return;
    
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: network.chainId }]
    });
  } catch (error) {
    if (error.code === 4902) {
      // Network not added to MetaMask
      await addNetwork(networkKey);
    } else {
      console.error('Network switch error:', error);
    }
  }
}

async function addNetwork(networkKey) {
  try {
    const ethereum = await detectMetaMask();
    if (!ethereum) return;
    
    const network = SUPPORTED_CHAINS[networkKey];
    if (!network) return;
    
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [network]
    });
  } catch (error) {
    console.error('Add network error:', error);
  }
}

function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    disconnectWallet();
  } else if (accounts[0] !== wallet) {
    wallet = accounts[0];
    localStorage.setItem('deFiQuestWallet', wallet);
    updateUI();
    renderPathway();
  }
}

function handleChainChanged(chainId) {
  currentNetwork = getNetworkName(chainId);
  localStorage.setItem('deFiQuestNetwork', currentNetwork);
  updateUI();
  // Optionally reload the page to reset state
  // window.location.reload();
}

function disconnectWallet() {
  localStorage.removeItem('deFiQuestWallet');
  localStorage.removeItem('deFiQuestToken');
  localStorage.removeItem('deFiQuestNetwork');
  wallet = null;
  web3Provider = null;
  currentNetwork = null;
  updateUI();
  renderLanding();
}

// Initialize on page load
if (wallet) {
  currentNetwork = localStorage.getItem('deFiQuestNetwork');
  updateUI();
  renderPathway();
} else {
  renderLanding();
}

// -- Landing Page with MetaMask Integration --

function renderLanding() {
  mainContent.innerHTML = `
    <section class="landing-wrap">
      <div class="landing-title">Empower Your DeFi Knowledge</div>
      <div class="landing-desc">
        Unlock the future of finance. Learn, earn, and grow with <b>DeFiQuest</b>:
      </div>
      <div class="landing-section">
        <div class="benefit-card"><h3>Earn Rewards</h3>Complete quests to earn XP & collectible NFT badges.</div>
        <div class="benefit-card"><h3>Boost Productivity</h3>Track your DeFi habits, get AI tips, and build a learning streak.</div>
        <div class="benefit-card"><h3>Unlock DeFi Mastery</h3>AI-powered quizzes and curated education on blockchain, yield, DAOs, and more.</div>
      </div>
      
      <div class="wallet-connection">
        <h3>Connect Your Wallet</h3>
        <div class="wallet-options">
          <button id="connect-metamask" class="wallet-btn">
            <img src="https://cdn.iconscout.com/icon/free/png-256/metamask-2728406-2261817.png" alt="MetaMask" width="24" height="24">
            Connect MetaMask
          </button>
          <button id="manual-wallet" class="wallet-btn secondary">
            Manual Entry (Demo)
          </button>
        </div>
        
        <div id="manual-input" class="manual-input hidden">
          <input id="wallet-input" type="text" placeholder="Enter your wallet (0x...)" autocomplete="off"/>
          <button id="manual-login" class="navmode-btn">Sign In</button>
        </div>
        
        <div class="network-selector">
          <label>Select Network:</label>
          <select id="network-select">
            <option value="ethereum">Ethereum Mainnet</option>
            <option value="sepolia" selected>Sepolia Testnet</option>
            <option value="blockdag">BlockDAG Testnet</option>
          </select>
        </div>
      </div>
      
      <div id="landing-error" class="landing-error"></div>
    </section>
  `;

  // Event listeners for wallet connection
  document.getElementById('connect-metamask').addEventListener('click', async () => {
    try {
      await connectMetaMask();
    } catch (error) {
      document.getElementById('landing-error').textContent = error.message;
    }
  });

  document.getElementById('manual-wallet').addEventListener('click', () => {
    const manualInput = document.getElementById('manual-input');
    manualInput.classList.toggle('hidden');
  });

  document.getElementById('manual-login').addEventListener('click', () => {
    const addr = document.getElementById('wallet-input').value.trim();
    let errDiv = document.getElementById('landing-error');
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      errDiv.textContent = 'Enter a valid wallet address (0x + 40 hex chars).';
      return;
    }
    wallet = addr;
    localStorage.setItem('deFiQuestWallet', wallet);
    updateUI();
    renderPathway();
  });

  document.getElementById('network-select').addEventListener('change', async (e) => {
    const networkKey = e.target.value;
    try {
      await switchNetwork(networkKey);
    } catch (error) {
      console.error('Network switch failed:', error);
    }
  });
}

// -- Quest Pathway --

async function renderPathway() {
    if (sidebar) {
        sidebar.innerHTML = `
      <h2>Learning Menu</h2>
      <div class="sidebar-nav">
        <button id="nav-pathway" class="active">Quests Pathway</button>
        <button id="nav-profile">Profile</button>
        <button id="nav-productivity">Productivity</button>
      </div>
    `;
        document.getElementById('nav-profile').onclick = renderProfile;
        document.getElementById('nav-productivity').onclick = renderProductivity;
        document.getElementById('nav-pathway').onclick = renderPathway;
    }

    mainContent.innerHTML = `<div class="quest-pathway" id="qp"></div>`;
    try {
        const res = await fetch(`${API_BASE}/quests`);
        const quests = await res.json();
        const profileRes = await fetch(`${API_BASE}/user/${wallet}/profile`);
        const profile = await profileRes.json();
        const completedIds = profile.completed_quests || [];

        const list = document.getElementById('qp');
        list.innerHTML = '';
        quests.forEach((q, idx) => {
            const completed = completedIds.includes(q.id);
            const card = document.createElement('div');
            card.className = 'quest-card' + (completed ? ' completed' : '');
            card.innerHTML = `
        <div>
          <h3>${q.title}</h3>
          <div style="margin-top:0.7rem; font-size:1.05rem; color:#A3DEFF;">${q.description}</div>
        </div>
        <div class="xp-and-btn">
          <span class="xp-badge">XP: ${q.xp_reward}</span>
          <button ${completed ? 'disabled' : ''} data-id="${q.id}" data-type="${q.type}">
            ${q.type === 'quiz' ? 'Start Quiz' : 'Mark as Complete'}
          </button>
        </div>
      `;

            card.querySelector('button').onclick = () => {
                if (q.type === 'quiz') openQuizModal(q.title, q.id, 7);
                else submitQuestCompletion(q.id, {});
            };
            list.appendChild(card);
            if (idx < quests.length - 1) {
                const bar = document.createElement('div');
                bar.className = 'vertical-bar';
                list.appendChild(bar);
            }
        });
    } catch (e) {
        mainContent.innerHTML = `<div class="error-message">Failed to load quests: ${e.message}</div>`;
    }
}

// -- Quiz Modal --

function openQuizModal(topic, questId, count = 5) {
    quizModal.classList.remove('hidden');
    quizModal.innerHTML = `
    <div class="modal-content">
      <span class="modal-close" title="Close">&times;</span>
      <div class="quiz-title">${topic}</div>
      <div id="quiz-box">Generating quiz questions from AI...</div>
    </div>
  `;
    document.querySelector('.modal-close').onclick = closeQuizModal;
    generateAIQuiz(topic, count, questId);
}

function closeQuizModal() {
    quizModal.classList.add('hidden');
    quizModal.innerHTML = '';
}

async function generateAIQuiz(topic, count, questId) {
    const box = document.getElementById('quiz-box');
    try {
        const res = await fetch(`${AI_BASE}/generate-quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, num_questions: count }),
        });
        const data = await res.json();
        if (!data.success || !data.questions)
            throw new Error(data.error || "AI quiz generation failed");

        box.innerHTML = `<form id="ai-quiz-form"></form>`;
        const form = document.getElementById('ai-quiz-form');

        data.questions.forEach((q, i) => {
            form.innerHTML += `
        <div class="quiz-question">
          <strong>${i + 1}. ${q.question}</strong>
          <div class="quiz-choices">
            ${q.choices.map((c, j) => `<label><input type="radio" name="q${i}" value="${j}"/> ${c}</label>`).join('')}
          </div>
        </div>
      `;
        });

        form.innerHTML += `<div class="quiz-submit"><button type="submit">Submit Quiz</button></div>`;
        form.onsubmit = async (e) => {
            e.preventDefault();
            let answers = {};
            for (let i = 0; i < data.questions.length; i++) {
                let val = form[`q${i}`].value;
                if (val === undefined || val === '') {
                    alert(`Please answer question ${i + 1}`);
                    return;
                }
                answers[data.questions[i].question] = Number(val);
            }
            await submitQuestCompletion(questId, { answers });
            closeQuizModal();
        };
    } catch (e) {
        box.innerHTML = `<div style="color:#f67171">Could not generate quiz: ${e.message}</div>`;
    }
}

// -- Submit Quest Completion to Backend --

async function submitQuestCompletion(questID, extraData) {
    try {
        const response = await fetch(`${API_BASE}/quest/${questID}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAddress: wallet, ...extraData }),
        });
        const data = await response.json();
        if (!response.ok)
            throw new Error(data.message || 'Failed to complete quest');

        alert('Quest successfully completed! NFT mint triggered.');
        renderPathway();
    } catch (e) {
        alert('Error submitting quest: ' + (e.message || 'Unknown error.'));
        renderPathway();
    }
}

// -- Profile (simplified) --

async function renderProfile() {
    if (sidebar) {
        sidebar.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        document.getElementById('nav-profile').classList.add('active');
    }
    mainContent.innerHTML = '<h1>Loading profile...</h1>';
    try {
        const res = await fetch(`${API_BASE}/user/${wallet}/profile`);
        const data = await res.json();

        let badgesHtml = '';
        if (data.badges && data.badges.length) {
            badgesHtml = '<div class="badges">' + data.badges.map(b =>
                `<div class="badge-item"><img src="${b.image_url}" alt="${b.name}" width="50" height="50"/><div>${b.name}</div></div>`
            ).join('') + '</div>';
        }

        mainContent.innerHTML = `
      <h1>Your Profile</h1>
      <p>XP: <strong>${data.xp}</strong></p>
      <p>Completed Quests: <strong>${data.completed}</strong></p>
      <p>Current Streak: <strong>${data.streak}</strong></p>
      <p>Badges Earned: <strong>${data.badges?.length || 0}</strong></p>
      ${badgesHtml}
      <div class="ai-feedback">
        <h3>AI-Generated Insights</h3>
        <p>${data.ai_feedback || 'No AI feedback yet.'}</p>
      </div>
    `;
    } catch (e) {
        mainContent.innerHTML = `<div class="error-message">Failed to load profile: ${e.message}</div>`;
    }
}

// -- Productivity Mode (simplified) --

async function renderProductivity() {
    if (sidebar) {
        sidebar.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        document.getElementById('nav-productivity').classList.add('active');
    }
    mainContent.innerHTML = '<h1>Loading Productivity...</h1>';
    try {
        const res = await fetch(`${API_BASE}/user/${wallet}/productivity`);
        const data = await res.json();

        mainContent.innerHTML = `
      <h1>Productivity Mode</h1>
      <p>Total Quests Completed: <strong>${data.total_completed}</strong></p>
      <p>Current Streak: <strong>${data.current_streak || 0}</strong> days</p>
    `;
    } catch (e) {
        mainContent.innerHTML = `<div class="error-message">Failed to load productivity: ${e.message}</div>`;
    }
}
