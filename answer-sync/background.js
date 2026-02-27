// Background script to handle API requests securely
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SOLVE_QUESTION') {
        const questionText = request.question;
        const contextText = request.context || '';

        // Get API key from storage
        chrome.storage.local.get(['authToken', 'subscriptionActive'], async (result) => {
            if (!result.authToken) {
                sendResponse({ error: 'Please sign in from the extension popup to use Answer Sync.' });
                return;
            }
            if (!result.subscriptionActive) {
                sendResponse({ error: 'Active subscription required. Please upgrade your plan in the extension popup.' });
                return;
            }

            try {
                const token = result.authToken;
                const apiUrl = 'https://answer-sync-web.vercel.app/api/solve';

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        question: questionText,
                        context: contextText
                    })
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Server Error: ${response.status} - ${errText}`);
                }

                const data = await response.json();
                const answer = data.answer;

                sendResponse({ answer: answer });

            } catch (error) {
                console.error('Error solving question:', error);
                sendResponse({ error: error.message });
            }
        });

        // Return true to indicate we will send a response asynchronously
        return true;
    }
});
