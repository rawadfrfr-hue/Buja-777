import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

const SUBJECT_MAP: Record<string, string> = {
  '101': 'BANGLA',
  '102': 'BANGLA-II',
  '107': 'ENGLISH',
  '108': 'ENGLISH-II',
  '109': 'MATHEMATICS',
  '127': 'SCIENCE',
  '110': 'GEOGRAPHY & ENVIRONMENT',
  '111': 'ISLAM & MORAL EDUCATION',
  '112': 'HINDU RELIGION & MORAL EDUCATION',
  '113': 'BUDDHIST RELIGION',
  '114': 'CHRISTIAN RELIGION',
  '136': 'HIGHER MATHEMATICS',
  '137': 'CHEMISTRY',
  '138': 'BIOLOGY',
  '140': 'CIVICS & CITIZENSHIP',
  '147': 'PHYSICAL EDUCATION, HEALTH & SPORTS',
  '150': 'AGRICULTURE STUDIES',
  '151': 'HOME SCIENCE',
  '153': 'HISTORY OF BANGLADESH & WORLD CIVILIZATION',
  '154': 'INFORMATION & COMMUNICATION TECHNOLOGY',
  '156': 'CAREER EDUCATION',
};

function parseSubjectDetails(displayDetails?: string): Array<{ code: string; name: string; grade: string }> {
  if (!displayDetails) return [];
  const subjects: Array<{ code: string; name: string; grade: string }> = [];
  const parts = displayDetails.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const code = trimmed.slice(0, colonIdx).trim();
    const resultPart = trimmed.slice(colonIdx + 1).trim();
    const equalIdx = resultPart.lastIndexOf('=');
    const grade = equalIdx !== -1 ? resultPart.slice(equalIdx + 1).trim() : resultPart;
    const name = SUBJECT_MAP[code] || `Subject ${code}`;

    subjects.push({ code, name, grade });
  }

  return subjects;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { board, exam, year, roll, reg, captcha, session, source } = body;

    if (!roll || !board || !exam || !year) {
      return NextResponse.json(
        { success: false, error: 'Please provide Board, Examination, Year, and Roll number.' },
        { status: 400 }
      );
    }

    if (!captcha) {
      return NextResponse.json(
        { success: false, error: 'Please enter the 4-digit Security Key shown in the image.' },
        { status: 400 }
      );
    }

    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // Normalize board
    let normalizedBoard = String(board).toLowerCase();
    if (normalizedBoard === 'technical') normalizedBoard = 'tec';
    if (normalizedBoard === 'rajashai') normalizedBoard = 'rajshahi';

    // Use Official eboardresults.com via Cloudflare Proxy
    const postData = new URLSearchParams();
    postData.append('exam', String(exam).toLowerCase());
    postData.append('year', String(year));
    postData.append('board', normalizedBoard);
    postData.append('result_type', '1');
    postData.append('roll', String(roll).trim());
    postData.append('reg', String(reg || '').trim());
    postData.append('captcha', String(captcha).trim());

    const cookieHeader = session ? `EBRSESSID2=${session}` : '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000); // 9 seconds timeout for Vercel

    const response = await fetch('https://withered-mountain-9571.2flolgamer3-8-5.workers.dev/v2/getres', {
      method: 'POST',
      headers: {
        'User-Agent': userAgent,
        'Referer': 'https://eboardresults.com/v2/home',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieHeader,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: postData.toString(),
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Education Board server returned HTTP ${response.status}. Please try again.` },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Check status
    if (data.status !== 0) {
      const errorMsg =
        data.msg || data.message || 'Could not validate security key. Please check the code and try again.';
      return NextResponse.json({
        success: false,
        error: errorMsg,
        isCaptchaError: errorMsg.toLowerCase().includes('captcha') || errorMsg.toLowerCase().includes('security key'),
      });
    }

    const res = data.res || {};
    const subjects = parseSubjectDetails(res.display_details);

    const extractedResult = {
      roll: res.roll_no || roll,
      reg: res.regno || reg || '',
      name: res.name || '',
      father: res.fname || '',
      mother: res.mname || '',
      board: res.board_name || board,
      session: res.session || '',
      group: res.stud_group || '',
      dob: res.dob || '',
      institute: res.inst_name || res.eiin || '',
      gpa: res.res_detail === 'P' ? (res.gpa || 'PASSED') : (res.res_detail || res.gpa || ''),
      statusDetail: res.res_detail || '',
      subjects,
    };

    return NextResponse.json({
      success: true,
      result: extractedResult,
    });
  } catch (err: any) {
    console.error('get-result error:', err);
    if (err.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Connection to Education Board server timed out. Please try again.' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error while fetching result.' },
      { status: 500 }
    );
  }
}
