<div align="center">

<img src=".github/assets/banner.png" alt="Inkling, an open-source writing assistant" width="100%" />

<br />

[![License: MIT](https://img.shields.io/badge/license-MIT-6a4cff?style=flat-square)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/manifest-v3-8f7bff?style=flat-square&logo=googlechrome&logoColor=white)](manifest.json)
[![Works in](https://img.shields.io/badge/works%20in-Chrome%20·%20Edge%20·%20Brave%20·%20Arc-1a1730?style=flat-square)](#-install)
[![No tracking](https://img.shields.io/badge/tracking-none-12b76a?style=flat-square)](#-privacy)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-f59f0b?style=flat-square)](#-project-structure)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-f04461?style=flat-square)](#-contributing)

**A browser extension that checks your spelling and grammar as you type, on almost any website.**<br />
It’s open source, works without an account, and can rewrite text with your own AI key.

### [🌐 Try the live demo →](https://inkling-writer.vercel.app)

[Install](#-install) · [Features](#-features) · [How it works](#-how-it-works) · [Privacy](#-privacy) · [FAQ](#-faq)

<br />

<img src=".github/assets/demo.gif" alt="Inkling underlines mistakes as you type and fixes them in one click" width="820" />

</div>

<br />

## ✨ Why Inkling?

Most writing assistants ask you to sign up, pay every month and send what you type to their servers. Inkling is a small open-source extension that does the main job without that:

|                                  | **Inkling**                | Typical paid assistant |
| :------------------------------- | :------------------------: | :--------------------: |
| Spelling, grammar, punctuation   | ✅                          | ✅                      |
| Rewrite: improve, shorten, tone  | ✅ with your own AI key     | ✅ paid plan            |
| Price                            | **Free** (AI costs a few cents, paid to the provider) | Monthly subscription |
| Account required                 | **No**                     | Yes                    |
| Has its own server storing your text | **No**                 | Yes                    |
| Open source                      | **Yes, MIT**               | No                     |
| Install size                     | **~100 KB**, zero dependencies | Megabytes          |

<br />

## 🧩 Features

<table>
<tr>
<td width="50%" valign="top">

### 🖍️ Underlines as you type
Spelling, grammar, punctuation and wording problems get a colored underline. Hover over one to see the reason, and click the suggestion to apply it.

<img src=".github/assets/card.png" alt="Suggestion card" />

</td>
<td width="50%" valign="top">

### 💧 Meet Inky
Inky lives in the corner of the field you're typing in. Click it to see every suggestion, then use **Fix all** to apply them together.

<img src=".github/assets/panel.png" alt="Inky panel with all suggestions" />

</td>
</tr>
<tr>
<td width="50%" valign="top">

### ✍️ AI rewrites
Select some text and pick **Improve**, **Shorter**, **Formal**, **Friendly** or **Confident**. Rewrites run on Claude or OpenAI with your own key.

<img src=".github/assets/rewrite.png" alt="Selection toolbar with rewrite modes" />

</td>
<td width="50%" valign="top">

### ⚙️ Settings
You can turn Inkling off on specific sites, choose your English variant and which checks to run, and keep a personal dictionary.

<img src=".github/assets/settings.png" alt="Popup and settings page" />

</td>
</tr>
</table>

**Also:** works in text areas, text inputs and rich-text editors like the ones in Gmail, Notion and LinkedIn · light and dark mode · fixes can be undone with <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Z</kbd> · password fields are never read · <kbd>Esc</kbd> closes any open card.

<br />

## 🚀 Install

Inkling isn't in the Chrome Web Store yet, so you load it from a folder. It takes about a minute.

**1. Get the code**

```bash
git clone https://github.com/STARMEXXX/inkling.git
```

…or click **Code → Download ZIP** above and unzip it.

**2. Load it into your browser**

| Browser | Open this page |
| :------ | :------------- |
| Chrome / Arc | `chrome://extensions` |
| Edge | `edge://extensions` |
| Brave | `brave://extensions` |

Turn on **Developer mode** (top right), click **Load unpacked**, and select the `inkling` folder.

**3. Pin Inky** 📌

Click the puzzle icon 🧩 in the toolbar and pin **Inkling**. A practice page opens where you can try it out.

> [!TIP]
> To update later, run `git pull` (or download the ZIP again) and press the ↻ reload button on Inkling's card in `chrome://extensions`.

<br />

## 🤖 Unlock AI rewrites (optional)

Spelling and grammar checks work without any setup and cost nothing. For rewrites and the AI checker, add your own API key:

1. Get a key from [console.anthropic.com](https://console.anthropic.com/settings/keys) (Claude) or [platform.openai.com](https://platform.openai.com/api-keys) (OpenAI).
2. Click Inky in the toolbar → **Settings** → paste the key → **Test**.

| Model | Best for |
| :---- | :------- |
| `claude-opus-5-5` | Best quality (default) |
| `claude-sonnet-5-5` | Balanced speed and quality |
| `claude-haiku-5-5` | Fastest and cheapest, good for the AI checker |
| Any OpenAI chat model | Type its name in Settings (default `gpt-5-mini`) |

You pay the provider directly for what you use, and a typical rewrite costs less than a cent.

<br />

## 🔍 How it works

```mermaid
flowchart LR
    A["✍️ You type in<br/>any text field"] --> B["content.js<br/>(waits 0.8s)"]
    B -- "text" --> C{"background.js"}
    C -- "free" --> D["LanguageTool API"]
    C -- "your key" --> E["Claude / OpenAI"]
    D & E -- "issues" --> C
    C --> B
    B --> F["💧 Underlines, cards<br/>and Inky's panel"]
    F -- "click a fix" --> A
```

Inkling never changes the page's HTML to draw underlines. It mirrors the field's layout off-screen, measures where each word sits, and paints thin lines on its own transparent layer inside a [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM). The page's own styles don't affect Inkling, and Inkling never changes the page's markup.

<details>
<summary><b>What happens when you click a fix</b></summary>

<br />

```mermaid
sequenceDiagram
    participant U as You
    participant I as Inkling (content.js)
    participant F as Text field
    participant B as background.js
    U->>I: Hover the underline on "recieved"
    I-->>U: Card: recieved → received
    U->>I: Click "received"
    I->>F: Select the word, insertText("received")
    Note over F: Native edit, so Undo works<br/>and React/Vue apps see the change
    F-->>I: input event
    I->>I: Shift the remaining underlines
    I->>B: Re-check after a short pause
```

</details>

<details>
<summary><b>How the AI checker finds positions</b></summary>

<br />

The model returns plain JSON. Each issue quotes the exact text it wants to change, and Inkling finds that quote in your text:

```json
{
  "issues": [
    {
      "original": "recieved",
      "replacement": "received",
      "type": "spelling",
      "title": "Spelling",
      "message": "Common misspelling: i before e, except after c."
    }
  ]
}
```

If a quote isn't found, the suggestion is dropped, so a made-up fix can't end up in the wrong place.

</details>

<br />

## 🔒 Privacy

Inkling doesn't have a server of its own, doesn't collect analytics and doesn't need an account. Your text only goes to the service you choose:

| What | Where it goes | When |
| :--- | :------------ | :--- |
| Text you type | `api.languagetool.org` | Free checker (default) |
| Text you type or select | `api.anthropic.com` or `api.openai.com` | Only if you add a key and use AI |
| Settings, dictionary | Your browser (`chrome.storage.sync`) | Always |
| API keys | Your browser only (`chrome.storage.local`, never synced) | When you save one |
| Password fields | Never read | |

To stop all network requests on a site, click Inky in the toolbar and turn that site off.

<br />

## 💧 Meet Inky

<p>
<img src=".github/assets/inky-happy.svg" width="64" alt="Happy" title="All clean" />&nbsp;&nbsp;
<img src=".github/assets/inky-think.svg" width="64" alt="Thinking" title="Reading your text" />&nbsp;&nbsp;
<img src=".github/assets/inky-alert.svg" width="64" alt="Alert" title="Found something" />&nbsp;&nbsp;
<img src=".github/assets/inky-sad.svg" width="64" alt="Sad" title="Something went wrong" />&nbsp;&nbsp;
<img src=".github/assets/inky-sleep.svg" width="64" alt="Sleeping" title="Turned off" />
</p>

Inky's face tells you what's going on: **happy** when your text is clean, **thinking** while checking, **surprised** when it found something, **sad** if a check failed, and **asleep** when switched off.

<br />

## 📁 Project structure

```text
inkling/
├── manifest.json          # Extension manifest (MV3)
├── src/
│   ├── content.js         # Underlines, cards, Inky, selection toolbar
│   ├── background.js      # Message router (service worker)
│   └── engines.js         # LanguageTool, Claude and OpenAI clients
├── popup/                 # Toolbar popup
├── options/               # Settings page
├── playground/            # Try-it page that opens after install
├── ui/                    # Shared styles and the Inky SVG
├── icons/
└── site/                  # Landing page with a live demo (deployed on Vercel)
```

There's no build step and no `node_modules`. After you edit a file, reload the extension on `chrome://extensions` and refresh the page.

<br />

## ❓ FAQ

<details>
<summary><b>Does it work in Google Docs?</b></summary>
<br />
Not yet. Google Docs draws text on a canvas instead of using normal text fields, so Inkling can't see it. Sites built on normal text fields or rich-text editors (Gmail, Notion, LinkedIn, GitHub and most others) work. If a site misbehaves, please open an issue.
</details>

<details>
<summary><b>Which languages are supported?</b></summary>
<br />
English: American, British, Canadian, Australian, New Zealand and South African.
</details>

<details>
<summary><b>Is the free checker really free?</b></summary>
<br />
Yes. It uses LanguageTool's public API, which allows about 20 checks per minute. Inkling waits until you pause typing, so normal use stays well within that.
</details>

<details>
<summary><b>Why "Developer mode"? Is that safe?</b></summary>
<br />
Developer mode just lets Chrome load an extension from a folder instead of the Web Store. The code you load is exactly what's in this repo, and it's small enough to read in one sitting.
</details>

<br />

## 🤝 Contributing

Issues and pull requests are welcome. Good first ideas:

- 🌍 More languages
- 🎨 New Inky moods and animations
- 🧪 Support for more editors (CodeMirror, Monaco, canvas-based apps)

```bash
git clone https://github.com/STARMEXXX/inkling.git
# load the folder in chrome://extensions, then:
# edit → reload the extension → refresh the page
```

<br />

## 📄 License

Released under the [MIT License](LICENSE).

<div align="center">
<br />
<img src=".github/assets/inky.svg" width="40" alt="Inky" />
</div>
