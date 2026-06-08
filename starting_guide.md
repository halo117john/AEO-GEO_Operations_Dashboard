1단계: 필수 프로그램 설치 (OS 환경 세팅)
VS Code만 있다고 코드가 돌아가지 않습니다. 코드를 실행할 '엔진' 두 개를 먼저 설치해야 합니다.

Node.js (프론트엔드 엔진): Node.js 공식 홈페이지에서 LTS 버전을 다운로드하여 설치합니다. (계속 'Next'만 누르시면 됩니다.)

Python (백엔드 엔진): Python 공식 홈페이지에서 3.10 이상 버전을 설치합니다.

🚨 [매우 중요] 파이썬 설치 화면 맨 첫 장에서 Add Python to PATH (또는 Add python.exe to PATH) 체크박스를 무조건 체크하셔야 합니다! 이거 안 하시면 VS Code 터미널에서 파이썬 명령어가 먹히지 않습니다.

2단계: VS Code 초기 세팅
VS Code를 켜시고, 좌측 테트리스 모양 아이콘(Extensions)을 눌러 개발을 편하게 해 줄 확장 프로그램을 설치합니다.

필수: Python (Microsoft 공식)

권장: ESLint, Prettier - Code formatter, Tailwind CSS IntelliSense

3단계: 백엔드 (파이썬 크롤러) 세팅 🐍
이제 파이썬 서버를 띄울 차례입니다. VS Code에서 [Terminal] -> [New Terminal]을 열어주세요.

1. 크롤러 폴더로 이동

터미널에서 파이썬 코드가 있는 폴더로 이동합니다. (예: cd Crawler/aeo-crawler)

2. 🚨 가상환경 생성 및 활성화 (가장 많이 헷갈리는 부분!)

가상환경 만들기: 터미널에 python -m venv .venv 입력 (폴더 안에 .venv라는 숨김 폴더가 생깁니다)

가상환경 켜기: * Windows: .\.venv\Scripts\activate 입력

Mac: source .venv/bin/activate 입력

👉 터미널 입력창 맨 앞에 (.venv) 라는 초록색 글씨가 나타나야 정상적으로 켜진 것입니다.

3. 필수 라이브러리 및 브라우저 설치
가상환경이 켜진 상태에서 아래 두 명령어를 차례로 입력합니다.

pip install fastapi uvicorn playwright playwright-stealth pydantic

playwright install chromium (크롤링에 쓸 크롬 브라우저 엔진을 다운받는 과정입니다)

4. 🚨 경로 및 파일 점검 (Gotcha!)

main.py 파일과 같은 위치(폴더)에 캡차 우회를 위한 buster_extension 폴더가 반드시 통째로 들어있어야 합니다. 위치가 다르면 크롬이 켜지다 에러를 뱉습니다.

5. 파이썬 서버 실행

python main.py 입력

터미널에 Uvicorn running on http://127.0.0.1:8000이 뜨면 백엔드 준비 완료입니다!

4단계: 프론트엔드 (Next.js 대시보드) 세팅 ⚛️
백엔드 터미널은 그대로 살려두고, 터미널 창 우측 상단의 + 버튼을 눌러 새로운 터미널 탭을 엽니다.

1. 대시보드 폴더로 이동

새 터미널에서 프론트엔드 코드가 있는 최상단 폴더로 이동합니다. (package.json 파일이 있는 위치여야 합니다.)

2. 라이브러리(패키지) 설치

터미널에 npm install 을 입력합니다. (필요한 모든 패키지를 다운받습니다. 시간이 조금 걸립니다.)

혹시 이전에 우리가 추가했던 아이콘 때문에 에러가 난다면 npm install lucide-react 도 한 번 쳐주세요.

3. 🚨 통신 포트 확인

프론트엔드의 route.ts 파일(또는 api/scrape 관련 파일)에 적힌 파이썬 서버 주소가 http://127.0.0.1:8000 으로 정확히 적혀있는지 한 번 더 확인합니다.

4. 프론트엔드 서버 실행

터미널에 npm run dev 입력

Ready in X ms (url: http://localhost:3000) 이 뜨면 프론트엔드 준비 완료입니다!

5단계: 짜릿한 첫 구동! 🚀
웹 브라우저를 켜고 http://localhost:3000 에 접속합니다. 우리가 예쁘게 세팅한 대시보드가 뜰 것입니다.

테스트로 'AI 응답 결과' 탭이나 '프롬프트 허브'에서 구글/네이버 AI 크롤링을 실행해 봅니다.

파이썬 터미널 쪽에서 크롬 창이 파바박! 열렸다가 닫히면서 데이터를 물어오면, 모든 세팅이 완벽하게 끝난 것입니다.