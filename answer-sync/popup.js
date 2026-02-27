document.addEventListener('DOMContentLoaded', () => {
    // Views
    const loggedOutView = document.getElementById('loggedOutView');
    const loggedInView = document.getElementById('loggedInView');

    // Auth Elements
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const userEmailEl = document.getElementById('userEmail');

    // Subscription Elements
    const subStatusBadge = document.getElementById('subStatusBadge');
    const upgradeSection = document.getElementById('upgradeSection');
    const upgradeBtn = document.getElementById('upgradeBtn');

    // Settings Elements
    const enableCheckbox = document.getElementById('extensionEnabled');
    const saveBtn = document.getElementById('saveBtn');
    const statusEl = document.getElementById('status');
    const backendUrl = 'https://api.yourdomain.com'; // Change to actual backend

    // Check auth state on load
    checkAuthState();

    function updateUI(user, subscription) {
        if (user) {
            loggedOutView.classList.add('hidden');
            loggedInView.classList.remove('hidden');
            userEmailEl.textContent = user.email;

            // Update Subscription Status
            if (subscription && subscription.active) {
                subStatusBadge.textContent = 'Active PRO';
                subStatusBadge.className = 'badge active';
                upgradeSection.classList.add('hidden');
            } else {
                subStatusBadge.textContent = 'Free Basic';
                subStatusBadge.className = 'badge inactive';
                upgradeSection.classList.remove('hidden');
            }
        } else {
            loggedInView.classList.add('hidden');
            loggedOutView.classList.remove('hidden');
        }
    }

    function checkAuthState() {
        chrome.storage.local.get(['authToken', 'userEmail', 'subscriptionActive', 'extensionEnabled'], (result) => {
            // Settings
            enableCheckbox.checked = result.extensionEnabled !== false;

            if (result.authToken) {
                // Mock user data from local storage for now
                const user = { email: result.userEmail || 'user@example.com' };
                const sub = { active: result.subscriptionActive || false };
                updateUI(user, sub);

                // Ideally, here you would call your backend to verify the token and get the latest sub status:
                // fetch(`${backendUrl}/me`, { headers: { 'Authorization': `Bearer ${result.authToken}` }})
                //    .then(res => res.json())
                //    .then(data => {
                //       chrome.storage.local.set({ subscriptionActive: data.isPro });
                //       updateUI(data.user, { active: data.isPro });
                //    });
            } else {
                updateUI(null, null);
            }
        });
    }

    // --- Event Listeners ---

    signInBtn.addEventListener('click', () => {
        // Open the Sign In page of your web app
        chrome.tabs.create({ url: `${backendUrl}/login?source=extension` });
    });

    signUpBtn.addEventListener('click', () => {
        // Open the Sign Up page of your web app
        chrome.tabs.create({ url: `${backendUrl}/signup?source=extension` });
    });

    upgradeBtn.addEventListener('click', () => {
        // Open Stripe checkout or Pricing page
        chrome.storage.local.get(['authToken'], (result) => {
            const tokenQuery = result.authToken ? `?token=${result.authToken}` : '';
            chrome.tabs.create({ url: `${backendUrl}/pricing${tokenQuery}` });
        });
    });

    signOutBtn.addEventListener('click', () => {
        chrome.storage.local.remove(['authToken', 'userEmail', 'subscriptionActive'], () => {
            checkAuthState();
        });
    });

    saveBtn.addEventListener('click', () => {
        const isEnabled = enableCheckbox.checked;

        chrome.storage.local.set({
            extensionEnabled: isEnabled
        }, () => {
            statusEl.classList.remove('hidden');
            setTimeout(() => {
                statusEl.classList.add('hidden');
            }, 2000);

            // Notify content script
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs && tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'SETTINGS_UPDATED',
                        extensionEnabled: isEnabled
                    }).catch(() => { });
                }
            });
        });
    });
});
