# How to Deploy the VampFlicks Stream Proxy (Free)

This proxy converts your Google Drive video files into direct HTML5 video streams with full scrubbing/seeking support, completely removing Google's sign-in popups and limits.

---

## Method 1: Cloudflare Web Dashboard (Easiest — No install needed, 2 mins)

1. Go to [https://dash.cloudflare.com/](https://dash.cloudflare.com/) and sign in (or create a free account).
2. In the left sidebar, click **Compute (Workers & Pages)** > **Create application**.
3. Click the **Workers** tab and click **Create Worker**.
4. Give it a name (e.g. `vampflicks-stream`) and click **Deploy**.
5. On the success screen, click **Edit Code**.
6. Select everything in the editor and replace it with the entire contents of [`worker.js`](./worker.js).
7. Click **Deploy** in the top right corner.
8. Copy your worker's live URL (e.g. `https://vampflicks-stream.yourname.workers.dev`).
9. Open `index.html` in VampFlicks, find `const STREAM_PROXY_URL = '';` near line 335, and paste your URL:
   ```javascript
   const STREAM_PROXY_URL = 'https://vampflicks-stream.yourname.workers.dev';
   ```
10. Commit and push to GitHub!

---

## Method 2: Command Line (CLI via Wrangler)

1. Open PowerShell in the `stream-proxy` folder:
   ```powershell
   cd c:\Users\Aceco\Desktop\Archive\VampFlickz\VampFlicks\stream-proxy
   ```
2. Log in to Cloudflare:
   ```powershell
   npx wrangler login
   ```
3. Deploy the worker:
   ```powershell
   npx wrangler deploy
   ```
4. Copy the URL printed in your console and paste it into `STREAM_PROXY_URL` in `index.html`.
