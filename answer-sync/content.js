let extensionEnabled = true;

// Initialize
chrome.storage.local.get(['extensionEnabled'], (result) => {
    extensionEnabled = result.extensionEnabled !== false;
    if (extensionEnabled) {
        scanForQuestions();
    }
});

// Listen for authentication messages from the web app (e.g. login/signup)
window.addEventListener('message', (event) => {
    // Only accept messages from our web app domain
    // During development it might be localhost, in production it's vercel.app
    const allowedOrigins = ['http://localhost:3000', 'https://answer-sync-web.vercel.app'];
    if (!allowedOrigins.includes(event.origin)) return;

    if (event.data && event.data.type === 'ANSWER_SYNC_AUTH') {
        const { token, user } = event.data;
        if (token && user) {
            chrome.storage.local.set({
                authToken: token,
                userEmail: user.email,
                subscriptionActive: user.subscriptionActive
            }, () => {
                console.log('Answer Sync: Successfully authenticated and saved token.');
            });
        }
    }
});

// Update on settings change
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SETTINGS_UPDATED') {
        extensionEnabled = request.extensionEnabled;
        if (extensionEnabled) {
            scanForQuestions();
        } else {
            removeAllButtons();
        }
    }
});

function removeAllButtons() {
    document.querySelectorAll('.answersync-button-container').forEach(el => el.remove());
}

function scanForQuestions() {
    if (!extensionEnabled) return;

    // Find all inputs that we want to potentially answer
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="radio"], textarea'));

    // We want to group radio buttons by name so we don't have multiple solve buttons for the same question
    const processedRadioNames = new Set();
    const validTargets = [];

    inputs.forEach(input => {
        // Skip hidden inputs or already processed inputs
        if (input.type === 'hidden' || input.dataset.answersync || input.style.display === 'none') return;
        if (input.type === 'radio') {
            if (input.name && processedRadioNames.has(input.name)) return;
            if (input.name) processedRadioNames.add(input.name);
        }

        // Find the question text
        let questionText = extractQuestionText(input);
        if (!questionText || questionText.length < 5) return; // Ignore very short labels

        validTargets.push({ input, questionText });
    });

    validTargets.forEach(target => {
        injectSolveButton(target.input, target.questionText);
    });
}

function extractQuestionText(element) {
    let text = '';

    // 1. Check if it has an id and an associated label
    if (element.id) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) text = label.innerText;
    }

    // 2. Check if it's wrapped in a label
    if (!text) {
        const parentLabel = element.closest('label');
        if (parentLabel) text = parentLabel.innerText;
    }

    // 3. For complex forms, look at the closest container
    if (!text) {
        let parent = element.parentElement;
        for (let i = 0; i < 4 && parent; i++) {
            // Only select direct text or obvious headers if possible
            const potentialText = parent.innerText ? parent.innerText.trim() : "";
            if (potentialText && potentialText.includes('?')) {
                text = potentialText;
                break;
            }
            parent = parent.parentElement;
        }
    }

    // 4. Fallback for text before the input
    if (!text && element.previousSibling && element.previousSibling.nodeType === Node.TEXT_NODE) {
        text = element.previousSibling.textContent.trim();
    }

    // Clean up
    if (text) {
        // Extracted text might contain all form elements text, just take the first meaningful line
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        // Find the line with a question mark if it exists
        const qLine = lines.find(l => l.includes('?'));
        return qLine || lines[0];
    }

    return null;
}

function injectSolveButton(anchorElement, questionText) {
    // Mark as processed
    anchorElement.dataset.answersync = "true";

    const container = document.createElement('div');
    container.className = 'answersync-button-container';

    const btn = document.createElement('button');
    btn.className = 'answersync-solve-btn';
    btn.innerHTML = '✨ Solve';
    btn.title = "Solve with Answer Sync\\nQuestion: " + questionText;

    // Popup
    const popup = document.createElement('div');
    popup.className = 'answersync-answer-popup hidden';
    popup.innerHTML = `
    <div class="answersync-popup-header">
      Answer Sync
      <span class="answersync-popup-close">&times;</span>
    </div>
    <div class="answersync-popup-content">Generating...</div>
    <div class="answersync-actions">
      <button class="answersync-autofill-btn">Auto Fill</button>
    </div>
  `;

    const closeBtn = popup.querySelector('.answersync-popup-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.classList.add('hidden');
    });

    container.appendChild(btn);
    container.appendChild(popup);

    // Position the container
    if (anchorElement.type === 'radio') {
        let parentGroup = anchorElement.closest('fieldset') || anchorElement.closest('div[role="radiogroup"]') || anchorElement.parentElement.parentElement;
        if (parentGroup) {
            parentGroup.appendChild(container);
        } else {
            anchorElement.parentNode.insertBefore(container, anchorElement.nextSibling);
        }
    } else {
        anchorElement.parentNode.insertBefore(container, anchorElement.nextSibling);
    }

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Toggle popup if already shown
        if (!popup.classList.contains('hidden')) {
            popup.classList.add('hidden');
            return;
        }

        // Hide all other open popups
        document.querySelectorAll('.answersync-answer-popup').forEach(p => p.classList.add('hidden'));

        popup.classList.remove('hidden');
        const contentDiv = popup.querySelector('.answersync-popup-content');
        contentDiv.textContent = 'Generating...';
        btn.classList.add('answersync-loading');

        // Gather context (e.g. options for multiple choice)
        let contextText = '';
        if (anchorElement.type === 'radio') {
            const name = anchorElement.name;
            if (name) {
                const siblings = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
                const options = Array.from(siblings).map(sib => {
                    let optLabel = '';
                    if (sib.id) {
                        const l = document.querySelector(`label[for="${sib.id}"]`);
                        if (l) optLabel = l.innerText;
                    }
                    if (!optLabel && sib.closest('label')) {
                        optLabel = sib.closest('label').innerText;
                    }
                    if (!optLabel && sib.nextSibling && sib.nextSibling.nodeType === Node.TEXT_NODE) {
                        optLabel = sib.nextSibling.textContent;
                    }
                    // Get text after the radio button as a fallback
                    if (!optLabel && sib.nextElementSibling) {
                        optLabel = sib.nextElementSibling.innerText;
                    }
                    return optLabel ? optLabel.trim() : sib.value;
                }).filter(opt => opt);
                contextText = "Available options: " + options.join(' || ');
            }
        }

        // Call background script to get answer
        chrome.runtime.sendMessage({
            type: 'SOLVE_QUESTION',
            question: questionText,
            context: contextText
        }, (response) => {
            btn.classList.remove('answersync-loading');

            if (chrome.runtime.lastError) {
                contentDiv.textContent = 'Extension Error. Make sure the background script is running.';
                return;
            }

            if (response && response.error) {
                contentDiv.textContent = 'Error: ' + response.error;
                return;
            }

            if (response && response.answer) {
                const answerText = response.answer;
                contentDiv.innerHTML = '<strong>Answer:</strong><br>' + answerText.replace(/\\n/g, '<br>');

                // Setup autofill button action
                const autofillBtn = popup.querySelector('.answersync-autofill-btn');
                const newAutofillBtn = autofillBtn.cloneNode(true);
                autofillBtn.parentNode.replaceChild(newAutofillBtn, autofillBtn);

                newAutofillBtn.addEventListener('click', () => {
                    autoFillAnswer(anchorElement, answerText);
                    popup.classList.add('hidden');
                });

            } else {
                contentDiv.textContent = 'Could not generate an answer.';
            }
        });
    });
}

function autoFillAnswer(anchorElement, answerText) {
    if (anchorElement.type === 'text' || anchorElement.tagName.toLowerCase() === 'textarea') {
        anchorElement.value = answerText;
        anchorElement.dispatchEvent(new Event('input', { bubbles: true }));
        anchorElement.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (anchorElement.type === 'radio') {
        const name = anchorElement.name;
        if (name) {
            const siblings = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
            const answerLower = answerText.toLowerCase();
            for (let sib of siblings) {
                let optLabel = '';
                if (sib.id) {
                    const l = document.querySelector(`label[for="${sib.id}"]`);
                    if (l) optLabel = l.innerText;
                }
                if (!optLabel && sib.closest('label')) {
                    optLabel = sib.closest('label').innerText;
                }
                if (!optLabel && sib.nextSibling && sib.nextSibling.nodeType === Node.TEXT_NODE) {
                    optLabel = sib.nextSibling.textContent;
                }
                if (!optLabel && sib.nextElementSibling) {
                    optLabel = sib.nextElementSibling.innerText;
                }
                const text = (optLabel ? optLabel.trim() : sib.value).toLowerCase();

                if (text && (answerLower.includes(text) || text.includes(answerLower))) {
                    sib.checked = true;
                    sib.dispatchEvent(new Event('input', { bubbles: true }));
                    sib.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                }
            }
        }
    }
}

// Re-scan periodically for dynamically added forms
setInterval(() => {
    if (extensionEnabled) {
        scanForQuestions();
    }
}, 3000);
