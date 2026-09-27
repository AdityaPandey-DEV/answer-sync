# Answer Sync

**Chrome extension + web platform for real-time quiz answer synchronization.**

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Chrome](https://img.shields.io/badge/Chrome_Extension-4285F4?style=flat-square&logo=googlechrome&logoColor=white)

---

## What It Does

Answer Sync is a Chrome extension that detects quiz elements on web pages and synchronizes answers across sessions, paired with a web dashboard for review.

**Key Features:**
- **Auto-detection** — content scripts identify and parse quiz elements
- **Real-time sync** — across browser sessions via Chrome Storage API
- **Web dashboard** — companion app for managing synced content
- **Pattern matching** — supports multiple quiz formats

## Architecture

```
Web Page → Content Script (parser) → Background Service Worker
                                          ↓
                                  Chrome Storage API
                                          ↓
                                    Web Dashboard
```

## Tech Stack

| Component | Technology |
|---|---|
| Extension | JavaScript, Manifest V3 |
| Storage | Chrome Storage API |
| Web App | JavaScript |

## My Role

I designed the content script injection strategy, planned the Chrome Storage sync model, and scoped Manifest V3 permissions. Code generation was accelerated using AI tools; Chrome extension lifecycle management and debugging are mine.

## Quick Start

```bash
# Extension
# Open chrome://extensions/, enable Developer Mode
# Click Load Unpacked → select the answer-sync/ directory

# Web Dashboard
cd answer-sync-web
# Open index.html in browser
```

---

<div align="center">

*Architected & built by [Aditya Pandey](https://github.com/AdityaPandey-DEV) — AI-augmented development*

</div>
