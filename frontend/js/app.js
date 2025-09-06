const API_BASE = 'http://localhost:8081/api';
const AI_BASE = 'http://localhost:5001';

let wallet = localStorage.getItem('deFiQuestWallet');

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
        signoutBtn.addEventListener('click', () => {
            localStorage.removeItem('deFiQuestWallet');
            wallet = null;
            updateUI();
            renderLanding();
        });

    const questBtn = document.getElementById('mode-quest');
    if (questBtn)
        questBtn.addEventListener('click', () => {
            if (!wallet) return alert('Please sign in first.');
            setActiveTab(questBtn);
            renderPathway();
        });

    const prodBtn = document.getElementById('mode-productivity');
    if (prodBtn)
        prodBtn.addEventListener('click', () => {
            if (!wallet) return alert('Please sign in first.');
            setActiveTab(prodBtn);
            renderProductivity();
        });
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
    if (walletDisplay) walletDisplay.textContent = loggedIn ? `Wallet: ${wallet}` : '';
    if (sidebar) sidebar.classList.toggle('hidden', !loggedIn);
    if (!loggedIn) {
        setActiveTab(loginBtn);
    } else {
        setActiveTab(document.getElementById('mode-quest'));
    }
}

if (!wallet) {
    renderLanding();
} else {
    renderPathway();
}

// -- Landing Page --

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
      <div class="input-row">
        <input id="wallet-input" type="text" placeholder="Enter your wallet (0x...)" autocomplete="off"/>
        <button id="landing-login" class="navmode-btn">Sign In</button>
      </div>
      <div id="landing-error" class="landing-error"></div>
    </section>
  `;
    document.getElementById('landing-login').addEventListener('click', () => {
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
