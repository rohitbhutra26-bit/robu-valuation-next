import { NextResponse } from 'next/server';

const DATA_SERVER = process.env.NEXT_PUBLIC_DATA_SERVER_URL || 'https://robu-data-server.onrender.com';

export const revalidate = 900;

export async function GET(_req: Request, { params }: { params: { symbol: string } }) {
  const { symbol } = params;
  try {
    const res = await fetch(`${DATA_SERVER}/peers/${symbol}`, { next: { revalidate: 900 } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.detail || `Failed to fetch peers for ${symbol}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
