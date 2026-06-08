import sys
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import random
import uuid       # 💡 [추가] 고유한 폴더 이름을 만들기 위해 필요
import shutil     # 💡 [추가] 작업이 끝난 임시 폴더를 삭제하기 위해 필요
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

# 💡 [핵심 추가 코드] 윈도우 환경에서 Uvicorn과 Playwright의 비동기 충돌 해결
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

app = FastAPI(title="AEO Tracker Crawler API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScrapeRequest(BaseModel):
    keyword: str
    provider: str = "google_ai_overview"

# 💡 [변경] 동시에 최대 3개까지만 병렬로 실행되도록 제한 (컴퓨터 사양에 따라 5까지 늘려도 됩니다)
crawler_semaphore = asyncio.Semaphore(5)

async def run_google_crawler(keyword: str):
    extension_path = os.path.abspath("buster_extension")
    
    unique_id = str(uuid.uuid4())
    user_data_dir = os.path.abspath(f"chrome_temp_{unique_id}")

    try:
        async with Stealth().use_async(async_playwright()) as p:
            context = await p.chromium.launch_persistent_context(
                user_data_dir,
                headless=False,
                ignore_default_args=["--enable-automation"], 
                args=[
                    f"--disable-extensions-except={extension_path}",
                    f"--load-extension={extension_path}",
                    '--disable-blink-features=AutomationControlled',
                    '--disable-infobars',
                    '--start-maximized'
                ],
                no_viewport=True,
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                locale='ko-KR',
                timezone_id='Asia/Seoul'
            )
            
            # 💡 [여기서부터 끝까지 모두 들여쓰기가 한 칸(4칸) 안으로 들어와야 합니다!]
            page = context.pages[0]
            
            print(f"[{keyword}] 검색 결과로 접속합니다...")
            search_url = f"https://www.google.com/search?q={keyword}"
            await page.goto(search_url, wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)

            captcha_frames = page.locator("iframe[title*='reCAPTCHA']")
            if await captcha_frames.count() > 0:
                print("🚨 캡차 감지! Buster를 호출합니다.")
                checkbox_frame = captcha_frames.first.content_frame
                await checkbox_frame.locator(".recaptcha-checkbox-border").click()
                await page.wait_for_timeout(3000)
                
                challenge_frames = page.locator("iframe[title*='recaptcha challenge']")
                if await challenge_frames.count() > 0:
                    challenge_frame = challenge_frames.first.content_frame
                    buster_button = challenge_frame.locator("#solver-button")
                    if await buster_button.count() > 0:
                        await buster_button.click()
                        await page.wait_for_timeout(10000)

            print("AI 요약 생성 대기 중...")
            await page.wait_for_timeout(7000)

            try:
                more_button = page.locator("#rcnt").get_by_text("더보기").first
                if await more_button.count() > 0:
                    await more_button.click(delay=100)
                    await page.wait_for_timeout(2000)
            except Exception as e:
                print("더보기 버튼 클릭 무시됨:", e)

            js_code = """() => {
                const overviewBlock = document.querySelector('.V3FYNc') || document.querySelector('.M8OgIe') || document.querySelector('#rcnt');
                if (!overviewBlock) return { error: "AI 개요 영역을 찾을 수 없습니다." };

                const fullText = overviewBlock.innerText;
                const linkElements = overviewBlock.querySelectorAll('a[href^="http"]');
                
                const sources = [];
                linkElements.forEach(a => {
                    const url = a.href;
                    let title = a.innerText.trim() || a.getAttribute('aria-label') || a.textContent.trim();
                    if (!title) {
                        try {
                            title = new URL(url).hostname;
                        } catch(e) {
                            title = '출처 링크';
                        }
                    }
                    sources.push({ title: title, url: url });
                });
                
                const uniqueSources = Array.from(new Map(sources.map(item => [item.url, item])).values());
                
                return { text: fullText, sources: uniqueSources };
            }"""
            
            ai_data = await page.evaluate(js_code)
            await context.close()
            return ai_data
            
    finally:
        if os.path.exists(user_data_dir):
            shutil.rmtree(user_data_dir, ignore_errors=True)

# ---------------------------------------------------------
# 네이버 AI 브리핑 크롤러 로직
# ---------------------------------------------------------
async def run_naver_crawler(keyword: str):
    extension_path = os.path.abspath("buster_extension")
    unique_id = str(uuid.uuid4())
    user_data_dir = os.path.abspath(f"chrome_temp_naver_{unique_id}")

    try:
        async with Stealth().use_async(async_playwright()) as p:
            context = await p.chromium.launch_persistent_context(
                user_data_dir,
                headless=False,
                ignore_default_args=["--enable-automation"], 
                args=[
                    f"--disable-extensions-except={extension_path}",
                    f"--load-extension={extension_path}",
                    '--disable-blink-features=AutomationControlled',
                    '--disable-infobars',
                    '--start-maximized'
                ],
                no_viewport=True,
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                locale='ko-KR',
                timezone_id='Asia/Seoul'
            )
            
            page = context.pages[0]
            
            # 1. 네이버 통합검색 접속
            print(f"[Naver] '{keyword}' 검색 결과로 접속합니다...")
            search_url = f"https://search.naver.com/search.naver?query={keyword}"
            await page.goto(search_url, wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)

            print("[Naver] AI 브리핑 대기 중...")
            await page.wait_for_timeout(5000) # 네이버 AI 렌더링 대기

            # 💡 [추가] '펼쳐서 더보기' 버튼 클릭 로직
            try:
                # 텍스트로 버튼을 정확히 찾아서 클릭합니다.
                more_button = page.get_by_text("펼쳐서 더보기").first
                if await more_button.count() > 0:
                    await more_button.click(delay=100)
                    print("[Naver] '펼쳐서 더보기' 버튼을 클릭했습니다.")
                    await page.wait_for_timeout(2000) # 펼쳐지는 애니메이션 대기
            except Exception as e:
                print("[Naver] 펼쳐서 더보기 버튼 없음 (이미 다 펼쳐져 있거나 에러):", e)

            # 2. DOM 파싱 (무적의 자바스크립트 코드 업데이트)
            js_code = """function() {
                // 💡 [핵심] 네이버 클래스명이 바뀌어도 'AI 브리핑'이라는 글자가 포함된 큰 덩어리를 강제로 찾아냅니다.
                var overviewBlock = document.querySelector('.cs_ai_briefing') || 
                                    document.querySelector('.ai_briefing_wrap') ||
                                    Array.from(document.querySelectorAll('section, .api_subject_bx')).find(el => el.innerText && el.innerText.includes('AI 브리핑'));
                
                if (!overviewBlock) {
                    return { error: '네이버 AI 브리핑 영역을 찾을 수 없습니다. (이 키워드에는 AI 브리핑이 제공되지 않을 수 있습니다.)' };
                }

                var fullText = overviewBlock.innerText;
                var linkElements = overviewBlock.querySelectorAll('a');
                
                var sources = [];
                for (var i = 0; i < linkElements.length; i++) {
                    var a = linkElements[i];
                    var url = a.href;
                    
                    // http로 시작하지 않거나, 네이버 내부 검색 탭 이동 링크는 출처가 아니므로 무시합니다.
                    if (!url || url.indexOf('http') !== 0) continue;
                    if (url.indexOf('search.naver.com') > -1 && url.indexOf('query=') > -1) continue;
                    
                    var title = a.innerText.trim();
                    if (!title && a.getAttribute('aria-label')) title = a.getAttribute('aria-label');
                    if (!title) title = a.textContent.trim();
                    if (!title) continue; // 버튼이나 빈 이미지 링크 무시
                    
                    sources.push({ title: title, url: url });
                }
                
                // 중복 출처 제거
                var uniqueSources = [];
                var seen = {};
                for (var j = 0; j < sources.length; j++) {
                    var currentUrl = sources[j].url;
                    if (!seen[currentUrl]) {
                        seen[currentUrl] = true;
                        uniqueSources.push(sources[j]);
                    }
                }
                
                return { text: fullText, sources: uniqueSources };
            }"""
            
            ai_data = await page.evaluate(js_code)
            await context.close()
            return ai_data
            
    finally:
        # 작업이 끝나면 네이버 전용 임시 폴더 삭제
        if os.path.exists(user_data_dir):
            shutil.rmtree(user_data_dir, ignore_errors=True)

# ---------------------------------------------------------
# API 라우트 엔드포인트
# ---------------------------------------------------------
@app.post("/api/scrape")
async def scrape_endpoint(req: ScrapeRequest):
    print(f"요청 수신됨: 모델={req.provider}, 키워드={req.keyword}")
    
    try:
        # 💡 [구글 AI 분기]
        # 💡 google_ai와 google_ai_overview 둘 중 무엇이 들어와도 구글 크롤러가 돌도록 수정합니다.
        if req.provider == "google_ai" or req.provider == "google_ai_overview":
            async with crawler_semaphore:
                result = await run_google_crawler(req.keyword)
                
        # 💡 [네이버 AI 분기 추가!]
        elif req.provider == "naver_ai":
            async with crawler_semaphore:
                result = await run_naver_crawler(req.keyword)
                
        # 예외 처리
        else:
            raise HTTPException(status_code=400, detail=f"아직 지원하지 않는 모델입니다: {req.provider}")

        # 결과 반환
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
            
        return {
            "status": "success",
            "data": result
        }
        
    except Exception as e:
        print(f"에러 발생: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)