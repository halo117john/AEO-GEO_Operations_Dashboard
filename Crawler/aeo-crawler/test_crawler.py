import asyncio
import os
import random
from playwright.async_api import async_playwright
from playwright_stealth import Stealth 

async def main():
    # 1. Buster 확장 프로그램 폴더 경로 설정 (현재 폴더 안에 buster_extension 폴더가 있어야 함)
    extension_path = os.path.abspath("buster_extension")
    # Playwright가 확장 프로그램을 로드하려면 임시 유저 데이터 폴더가 필요합니다.
    user_data_dir = os.path.abspath("chrome_user_data")

    async with Stealth().use_async(async_playwright()) as p:
        # 2. 확장 프로그램 로드를 위해 launch_persistent_context 사용
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
        
        # persistent_context는 시작 시 이미 빈 페이지를 하나 들고 있습니다.
        page = context.pages[0]
        
        print("구글 검색 결과로 다이렉트 접속합니다...")
        search_url = "https://www.google.com/search?q=인공지능+트렌드+2026"
        await page.goto(search_url, wait_until="domcontentloaded")
        
        await page.wait_for_timeout(2000)

        # 💡 [핵심] 캡차 감지 및 Buster 자동 실행 로직
        # 구글 캡차의 체크박스가 포함된 iframe 찾기
        captcha_frames = page.locator("iframe[title*='reCAPTCHA']")
        
        if await captcha_frames.count() > 0:
            print("🚨 캡차(로봇 인증)가 감지되었습니다! Buster를 호출합니다.")
            
            # 1. '로봇이 아닙니다' 체크박스 프레임 지정 및 클릭
            checkbox_frame = captcha_frames.first.content_frame
            await checkbox_frame.locator(".recaptcha-checkbox-border").click()
            print("체크박스를 클릭했습니다. 챌린지 창을 기다립니다...")
            await page.wait_for_timeout(3000) # 그림 맞추기 창이 뜰 때까지 대기
            
            # 2. 이미지/오디오 챌린지가 뜨는 프레임 찾기
            challenge_frames = page.locator("iframe[title*='recaptcha challenge']")
            if await challenge_frames.count() > 0:
                challenge_frame = challenge_frames.first.content_frame
                
                # 3. Buster가 챌린지 창 하단에 삽입한 주황색 버튼 클릭!
                # Buster 버튼의 id는 보통 solver-button 입니다.
                buster_button = challenge_frame.locator("#solver-button")
                if await buster_button.count() > 0:
                    print("🎧 Buster 버튼(오디오 해결)을 클릭했습니다. STT 분석 중...")
                    await buster_button.click()
                    
                    # Buster가 오디오를 듣고 텍스트로 변환하여 입력하기까지 대기 (약 5~10초)
                    await page.wait_for_timeout(10000)
                    print("Buster 해결 시도 완료!")
                else:
                    print("Buster 버튼을 찾을 수 없습니다. 플러그인 로드를 확인하세요.")
        else:
            print("✅ 캡차가 뜨지 않았습니다. 무사 통과!")

        print("검색 결과를 확인합니다...")
        
        # 💡 수정 1: AI Overview(생성형 AI 요약)는 글씨가 써지며 렌더링되는데 시간이 걸립니다.
        print("AI 요약이 생성될 때까지 넉넉히 대기합니다... (약 5초)")
        await page.wait_for_timeout(3000)
        
        # ... (이전 캡차 감지 및 Buster 로직, 검색 결과 대기(7초) 부분까지는 동일) ...
        
        print("AI Overview 요약 생성 대기 완료.")

        # 💡 [핵심 수정 로직] 상단 메뉴의 '더보기'를 피하기 위해 본문 영역으로 범위를 좁힙니다.
        try:
            print("AI Overview 안의 '더보기' 버튼을 찾습니다...")
            
            # 구글 검색 결과 본문을 감싸는 메인 컨테이너(#rcnt)로 탐색 범위를 제한합니다.
            # 이렇게 하면 상단 메뉴바에 있는 '더보기'를 무시할 수 있습니다.
            main_results_area = page.locator("#rcnt")
            
            # 본문 영역 안에서 '더보기' 텍스트를 가진 요소 중 첫 번째(가장 위에 있는 AI 개요 부분)를 찾습니다.
            more_button = main_results_area.locator("text='더보기'").locator("visible=true").first
            
            if await more_button.count() > 0:
                print("본문 영역의 정확한 '더보기' 버튼을 발견했습니다. 클릭합니다!")
                # 사람이 클릭하는 것처럼 약간의 딜레이를 주어 클릭
                await more_button.click(delay=100)
                
                print("내용이 펼쳐질 때까지 대기합니다...")
                await page.wait_for_timeout(2000)
            else:
                print("본문 영역 내에 '더보기' 버튼이 없습니다. (이미 다 펼쳐져 있거나 내용이 짧음)")
        except Exception as e:
            print(f"'더보기' 버튼 클릭 중 오류 발생: {e}")

        # ... (더보기 버튼 클릭 로직까지 동일) ...

        # 💡 [핵심 수정 로직] 스크롤 위치 조정 및 상단바 고정 해제
        print("상단 검색창이 내용을 가리지 않도록 조정합니다...")
        
        # 1. 스크롤을 맨 위(0, 0)가 아닌 살짝 아래(0, 150)로 이동시킵니다.
        await page.evaluate("window.scrollTo(0, 600)")
        
        # 2. (꿀팁) 구글 상단 검색창이 화면에 고정되어 따라다니는 것을 강제로 해제합니다.
        # 이렇게 하면 전체화면 캡처 시 검색창이 AI 요약을 가리는 현상을 원천 차단할 수 있습니다.
        try:
            await page.evaluate("""
                const searchBar = document.getElementById('searchform');
                if (searchBar) searchBar.style.position = 'static';
                
                const topNav = document.getElementById('hdtb');
                if (topNav) topNav.style.position = 'static';
            """)
        except Exception as e:
            pass
# ... (이전 '더보기' 버튼 클릭 및 스크롤 로직까지 동일) ...

        await page.wait_for_timeout(1000) # 조정 후 잠시 안정화 대기
        
        # 💡 [새로운 핵심 단계] DOM 파싱: 텍스트와 출처 URL 추출하기
        print("AI Overview 데이터 추출을 시작합니다...")
        
        # Playwright의 evaluate 함수를 사용하면 브라우저 내에서 직접 자바스크립트를 실행해 
        # 원하는 요소를 정확하고 빠르게 긁어올 수 있습니다.
        ai_data = await page.evaluate('''() => {
            // 1. AI 개요 영역을 감싸는 전체 블록을 찾습니다. 
            // (구글은 클래스명이 랜덤하게 바뀌지만, 보통 최상단 블록에 위치합니다. 
            // 여기서는 안전하게 본문 전체(#rcnt) 또는 최상단 카드 요소를 기준으로 잡습니다.)
            const overviewBlock = document.querySelector('.V3FYNc') || document.querySelector('.M8OgIe') || document.querySelector('#rcnt');
            
            if (!overviewBlock) {
                return { error: "AI 개요 영역을 찾을 수 없습니다." };
            }

            // 2. 전체 텍스트 추출 (화면에 보이는 텍스트만 깔끔하게 가져옴)
            const fullText = overviewBlock.innerText;

            // 3. 출처 URL(Citation) 추출
            // http로 시작하는 모든 a 태그(링크)를 수집합니다.
            const linkElements = overviewBlock.querySelectorAll('a[href^="http"]');
            
            const sources = [];
            linkElements.forEach(a => {
                const url = a.href;
                // 기존: const title = a.innerText.trim();
                const title = a.getAttribute('aria-label') || a.innerText.trim() || '출처';
                
                // 구글 내부 링크(검색 결과 이동, 로그인 등)는 출처가 아니므로 제외합니다.
                if (!url.includes('google.com') && !url.includes('google.co.kr')) {
                    sources.push({
                        title: title,
                        url: url
                    });
                }
            });
            
            // 4. 동일한 URL이 여러 번 수집되는 것을 방지 (중복 제거)
            const uniqueSources = Array.from(new Map(sources.map(item => [item.url, item])).values());
            
            return {
                text: fullText,
                sources: uniqueSources
            };
        }''')

        # 추출된 데이터 출력 (향후 이 데이터를 Next.js 대시보드로 전달하게 됩니다)
        print("\n" + "="*50)
        print("🎯 [추출 완료] AI Overview 데이터")
        print("="*50)
        
        if "error" in ai_data:
            print(ai_data["error"])
        else:
            print("[본문 텍스트 요약 (앞 200자)]")
            print(ai_data["text"][:200] + "...\n")
            
            print(f"[인용된 출처 URL 목록 - 총 {len(ai_data['sources'])}개]")
            for idx, source in enumerate(ai_data['sources'], 1):
                # 제목이 비어있으면 URL 자체를 제목으로 표시
                title = source['title'].replace('\n', ' ') if source['title'] else '제목 없음'
                print(f"{idx}. {title}")
                print(f"   ㄴ {source['url']}")
        
        print("="*50 + "\n")

        # 스크린샷 코드는 이제 필요 없으니 주석 처리하거나 삭제합니다.
        await page.screenshot(path="google_search_test.jpg", full_page=True)
        
        await context.close()

if __name__ == "__main__":
    asyncio.run(main())