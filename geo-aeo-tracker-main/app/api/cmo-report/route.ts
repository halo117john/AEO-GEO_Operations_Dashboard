// app/api/cmo-report/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. 프론트엔드 탭에서 선택된 데이터(JSON 배열)를 받음
    const payload = await req.json();

    // 2. 로컬에서 돌고 있는 Python FastAPI 서버로 데이터 전송
    const pythonResponse = await fetch('http://127.0.0.1:8000/api/analyze-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!pythonResponse.ok) {
      throw new Error('Python FastAPI 서버에서 에러가 발생했습니다.');
    }

    // 3. 파이썬이 생성한 CMO 리포트 결과를 프론트엔드로 반환
    const reportData = await pythonResponse.json();
    return NextResponse.json(reportData);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}