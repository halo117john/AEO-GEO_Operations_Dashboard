import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: "프롬프트가 없습니다." }, { status: 400 });

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      tools: [{ googleSearch: {} }], 
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const rawUrls = new Set<string>();
    
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      groundingMetadata.groundingChunks.forEach((chunk: any) => {
        const uri = chunk.uri || chunk.web?.uri;
        if (uri) rawUrls.add(uri);
      });
    }

    const urlRegex = /https?:\/\/[^\s)\]'"><]+/g;
    const matches = text.match(urlRegex) || [];
    matches.forEach(u => rawUrls.add(u));

    // 💡 [핵심] 수집된 URL 중 vertexaisearch 링크가 있다면 직접 접속해서 원본 URL로 변환합니다.
    const resolvedUrls = await Promise.all(
      Array.from(rawUrls).map(async (url) => {
        if (url.includes("vertexaisearch.cloud.google.com")) {
          try {
            // 서버에서 우회 링크를 따라가(follow) 최종 목적지 URL을 가져옵니다.
            const res = await fetch(url, { method: "HEAD", redirect: "follow" });
            return res.url; // 진짜 원본 뉴스/블로그 URL 반환!
          } catch (e) {
            return null; // 접속 실패 시 차라리 버립니다.
          }
        }
        return url; // 정상적인 URL은 그대로 통과
      })
    );

    // null 값 제거 및 최종 중복 제거
    const finalUrls = Array.from(new Set(resolvedUrls.filter(Boolean))) as string[];

    return NextResponse.json({ 
      text, 
      sources: finalUrls 
    });
    
  } catch (error) {
    console.error("Gemini API 호출 에러:", error);
    return NextResponse.json({ error: "Gemini API 통신 중 오류가 발생했습니다." }, { status: 500 });
  }
}