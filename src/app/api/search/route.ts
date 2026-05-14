import { NextRequest, NextResponse } from 'next/server';

const DATA_SERVER = process.env.DATA_SERVER_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  try {
    const res = await fetch(
      `${DATA_SERVER}/search?q=${encodeURIComponent(q)}`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
    return NextResponse.json({ error: 'Data server unavailable' }, { status: 503 });
  } catch {
    return NextResponse.json({ error: 'Data server not running. Start it with: bash start.sh' }, { status: 503 });
  }
}
