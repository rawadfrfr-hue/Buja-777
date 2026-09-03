import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // Attempt 1: Direct eboardresults.com official captcha
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`https://eboardresults.com/v2/captcha?t=${Date.now()}`, {
      headers: {
        'User-Agent': userAgent,
        'Referer': 'https://eboardresults.com/v2/home',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';

    if (res.ok && contentType.includes('image')) {
      const setCookie = res.headers.get('set-cookie') || '';
      let session = '';
      const match = setCookie.match(/EBRSESSID2=([^;]+)/);
      if (match) {
        session = match[1];
      } else {
        session = setCookie.split(';')[0];
      }

      const buffer = await res.arrayBuffer();
      if (buffer && buffer.byteLength > 100) {
        const base64 = Buffer.from(buffer).toString('base64');
        return NextResponse.json(
          {
            success: true,
            image: `data:${contentType};base64,${base64}`,
            session,
            source: 'eboardresults',
          },
          { headers: NO_CACHE_HEADERS }
        );
      }
    }
  } catch (err) {
    console.error('Direct captcha fetch failed or timed out', err);
  }

  return NextResponse.json(
    { success: false, error: 'Could not load Security Key. Please reload or check your connection.' },
    { status: 500, headers: NO_CACHE_HEADERS }
  );
}

