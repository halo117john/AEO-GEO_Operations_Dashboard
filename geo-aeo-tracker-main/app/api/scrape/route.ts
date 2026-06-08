import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// 1. 프론트엔드에서 넘어오는 데이터 규격
const InputSchema = z.object({
  provider: z.enum([
    "chatgpt",
    "gemini",
    "google_ai", 
    "naver_ai",  // 네이버 AI 추가
    "perplexity", 
    "copilot",
    "grok",
  ]),
  prompt: z.string().min(3),
  requireSources: z.boolean().optional(),
  country: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = InputSchema.parse(body);
    const { provider, prompt } = parsed;

    // ====================================================================
    // 💡 [분기 1] 파이썬 크롤러 통신 그룹 (Google AI & Naver AI)
    // ====================================================================
    if (provider === "google_ai" || provider === "naver_ai") {
      console.log(`🚀 파이썬 크롤러 서버로 요청을 보냅니다: 모델=${provider}, 검색어=${prompt}`);
      
      // 파이썬 서버가 인식할 수 있는 모델 이름으로 변환
      const pythonProvider = provider === "google_ai" ? "google_ai_overview" : "naver_ai";

      const pythonResponse = await fetch("http://127.0.0.1:8000/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          keyword: prompt, 
          provider: pythonProvider 
        }),
      });

      // 🚨 에러 캐치 1: 파이썬 서버 통신 자체 실패 (404, 500 에러 등)
      if (!pythonResponse.ok) {
        // 파이썬 서버가 보내준 에러 메시지(detail)를 뽑아냅니다.
        const errorData = await pythonResponse.json().catch(() => ({}));
        const errorMessage = errorData.detail || `파이썬 서버 에러 (${pythonResponse.status})`;
        throw new Error(errorMessage);
      }

      const pythonData = await pythonResponse.json();
      
      // 🚨 에러 캐치 2: 통신은 200 OK였지만, 파이썬이 데이터 안에 error를 담아 보낸 경우
      if (pythonData.data && pythonData.data.error) {
        throw new Error(pythonData.data.error);
      }
      
      // ✅ 성공 시: 프론트엔드 템플릿이 기대하는 규격에 맞게 데이터 포장
      return NextResponse.json({
        prompt: prompt,                  
        provider: provider,              
        answer: pythonData.data.text || "내용을 가져오지 못했습니다.", // text를 answer로 변환
        sources: pythonData.data.sources ? pythonData.data.sources.map((s: { url: string }) => s.url) : []
      });
    }

    // ====================================================================
    // [분기 2] ChatGPT (OpenAI 공식 API 연동 예정)
    // ====================================================================
    else if (provider === "chatgpt") {
      return NextResponse.json({ answer: "ChatGPT API 연동이 준비 중입니다.", sources: [] });
    }

    // ====================================================================
    // [분기 3] Gemini (Google 공식 API 연동 예정)
    // ====================================================================
    else if (provider === "gemini") {
      return NextResponse.json({ answer: "Gemini API 연동이 준비 중입니다.", sources: [] });
    }

    // 처리되지 않은 모델
    throw new Error(`지원하지 않는 Provider 입니다: ${provider}`);

  } catch (error) {
    // 🚨 최종 에러 처리: 프론트엔드로 에러 메시지 전송
    const message = error instanceof Error ? error.message : "알 수 없는 에러가 발생했습니다.";
    console.error("❌ API 라우트 에러:", message);
    
    // 대시보드에서 에러를 인지할 수 있도록 status 400으로 보내고,
    // 화면에 출력될 수 있도록 answer에도 에러 내용을 강제로 담아줍니다.
    return NextResponse.json(
      { 
        error: message,
        answer: `⚠️ 크롤링 에러 발생:\n${message}`,
        sources: []
      }, 
      { status: 400 }
    );
  }
}