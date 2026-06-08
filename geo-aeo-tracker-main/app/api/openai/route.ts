import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: "프롬프트가 없습니다." }, { status: 400 });

    const response = await openai.chat.completions.create({
      model: "gpt-5-search-api", 
      messages: [{ role: "user", content: prompt }],
    });

    const message = response.choices[0].message;
    const text = message.content || "";
    
    // 💡 공식 문서 기반: 구조화된 annotations에서 url_citation을 통해 정확한 URL 추출
    const urls = new Set<string>();
    
    if ((message as any).annotations) {
      (message as any).annotations.forEach((anno: any) => {
        if (anno.url) urls.add(anno.url);
        if (anno.url_citation?.url) urls.add(anno.url_citation.url); //
      });
    }

    // 만약 annotations가 비어있다면 텍스트에서 한 번 더 추출 (안전장치)
    if (urls.size === 0) {
      const urlRegex = /https?:\/\/[^\s)\]'"><]+/g;
      const matches = text.match(urlRegex) || [];
      matches.forEach(u => urls.add(u));
    }

    return NextResponse.json({ 
      text, 
      sources: Array.from(urls) 
    });
  } catch (error) {
    console.error("OpenAI API 호출 에러:", error);
    return NextResponse.json({ error: "OpenAI API 오류" }, { status: 500 });
  }
}