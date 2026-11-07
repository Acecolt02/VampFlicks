/**
 * VampFlicks Google Drive Stream Proxy
 * Cloudflare Worker to proxy Google Drive videos directly to HTML5 <video> players.
 *
 * Handles:
 * - HTTP Range requests (HTTP 206 Partial Content) for seeking & timeline scrubbing
 * - Google Drive large file virus-scan confirmation bypass (&confirm=t)
 * - Video Content-Type header overriding (video/mp4)
 * - Full Cross-Origin Resource Sharing (CORS) headers
 */

export default {
  async fetch(request, env, ctx) {
    // 1. Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);

    // 2. Extract Google Drive file ID
    let fileId = url.searchParams.get('id');

    // Also support passing full drive link e.g. ?url=https://drive.google.com/file/d/...
    if (!fileId && url.searchParams.get('url')) {
      const match = url.searchParams.get('url').match(/\/d\/([\w-]+)/) || url.searchParams.get('url').match(/[?&]id=([\w-]+)/);
      if (match) fileId = match[1];
    }

    // Also support path format: /stream/:id
    if (!fileId) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'stream' && parts[1]) {
        fileId = parts[1];
      }
    }

    if (!fileId) {
      return new Response(JSON.stringify({
        error: 'Missing file ID',
        usage: 'Pass ?id=GOOGLE_DRIVE_FILE_ID or /stream/GOOGLE_DRIVE_FILE_ID'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 3. Construct target URL with download confirmation
    const targetUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;

    // 4. Forward Range header if present
    const clientRange = request.headers.get('Range');
    const fetchHeaders = new Headers();
    if (clientRange) {
      fetchHeaders.set('Range', clientRange);
    }
    fetchHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
      const driveResp = await fetch(targetUrl, {
        method: request.method,
        headers: fetchHeaders,
        redirect: 'follow',
      });

      // 5. Build response headers for the browser
      const responseHeaders = new Headers();
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');
      responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
      responseHeaders.set('Accept-Ranges', 'bytes');

      // Set video Content-Type so browsers know to stream it
      const disposition = driveResp.headers.get('Content-Disposition') || '';
      if (disposition.toLowerCase().endsWith('.webm"') || disposition.toLowerCase().endsWith('.webm')) {
        responseHeaders.set('Content-Type', 'video/webm');
      } else {
        responseHeaders.set('Content-Type', 'video/mp4');
      }

      // Forward Content-Range and Content-Length
      if (driveResp.headers.has('Content-Range')) {
        responseHeaders.set('Content-Range', driveResp.headers.get('Content-Range'));
      }
      if (driveResp.headers.has('Content-Length')) {
        responseHeaders.set('Content-Length', driveResp.headers.get('Content-Length'));
      }

      // Cache control
      responseHeaders.set('Cache-Control', 'public, max-age=3600');

      return new Response(driveResp.body, {
        status: driveResp.status,
        headers: responseHeaders,
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
