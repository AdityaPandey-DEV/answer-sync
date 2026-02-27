# Answer Sync Extension

A Chrome Extension that automatically detects questions on webpages and provides answers using an AI API.

## Features

- **Auto-Detection**: Scans web pages for questions.
- **Floating Action Button**: Injects a "✨ Solve" button next to detected questions.
- **Smart Answering**: Uses advanced AI to generate concise answers.
- **Auto-Fill**: Automatically fills text inputs, textareas, and selects the correct radio button based on the generated answer.
- **Monetization Ready**: Configured to authenticate with a custom backend and check for active subscriptions (e.g., via Stripe) before providing answers.

## Architecture

This extension uses a secure architecture suitable for monetization:

1.  **User Authentication**: Users sign in or sign up via the extension popup, which redirects them to your backend's authentication flow. Authentication tokens are securely stored in the extension's local storage.
2.  **Subscription Verification**: When a user clicks "Solve", the extension sends the question and the user's authentication token to your custom backend.
3.  **Backend Processing (Your Server)**:
    - Verifies the user's authentication token.
    - Checks the user's subscription status (e.g., querying your database or a payment provider like Stripe) to ensure they have an active plan.
    - If valid, securely calls the AI API using your secret server-side API key.
    - Returns the generated answer to the extension.
4.  **Client-Side Injection**: The extension displays the answer and provides the auto-fill functionality.

This architecture ensures that your AI API key remains hidden and allows you to enforce subscription limits or paywalls effectively.

## Setup Instructions

### 1. Backend Setup

You will need to build a simple backend server (e.g., using Node.js/Express, Python/Flask, etc.) with the following endpoints:

-   **Authentication Endpoints**: Handle user sign-up, login, and token generation.
-   **`/solve` (POST)**:
    -   Requires an `Authorization: Bearer <token>` header.
    -   Accepts a JSON payload: `{ "question": "...", "context": "..." }`.
    -   Authenticates the user and checks their subscription status.
    -   Calls the AI API.
    -   Returns the JSON response: `{ "answer": "..." }`.
-   **`/pricing`**: A page where users can manage or purchase their subscription (e.g., integrating Stripe Checkout).

Don't forget to update the `backendUrl` variable in `popup.js` and the `apiUrl` in `background.js` to point to your live backend server.

### 2. Loading the Extension in Chrome

1.  Open Google Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** using the toggle switch in the top right corner.
3.  Click the **Load unpacked** button.
4.  Select the `answer-sync` directory containing the extension files.
5.  The Answer Sync extension should now appear in your list of installed extensions and in the browser toolbar.

### 3. Publishing to the Chrome Web Store

Once your backend is live and the extension is fully tested:

1.  Zip the contents of the `answer-sync` directory (ensure `manifest.json` is at the root of the zip file).
2.  Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
3.  Pay the one-time developer registration fee if you haven't already.
4.  Click **New Item** and upload your zip file.
5.  Fill out the required store listing details (Title, Description, Icons, Screenshots).
6.  Submit your extension for review.
