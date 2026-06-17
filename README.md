# **🚀 AEO/GEO Operations Dashboard & Crawler 시작하기**

본 프로젝트는 생성형 AI 검색 엔진(LLM) 환경에서 특정 브랜드의 가시성을 추적하고 분석하는 **Next.js 기반의 프론트엔드 대시보드**와, 구글 AI 오버뷰 및 네이버 AI 브리핑 데이터를 수집하는 **Python(FastAPI) 기반의 백엔드 크롤러**의 2가지 핵심 모듈로 구성되어 있습니다.

아래 가이드에 따라 로컬 환경에 프로젝트를 빠르고 간편하게 설정하고 실행할 수 있습니다.

## **📋 사전 준비 사항 (Prerequisites)**

프로젝트를 실행하기 전에 아래 도구들이 컴퓨터에 설치되어 있어야 합니다.

### **1. Node.js (프론트엔드 구동용)**
* **설치 방법:** [Node.js 공식 홈페이지(nodejs.org)](https://nodejs.org/ko/)에 접속하여 화면에 보이는 **LTS 버전**을 다운로드하고 설치합니다. (v18.0.0 이상 권장)
* **설치 확인:** 터미널을 열고 `node -v` 및 `npm -v`를 입력하여 버전 숫자가 나오면 성공입니다.

### **2. Python (백엔드 크롤러 구동용)**
* **설치 방법:** [Python 공식 홈페이지(python.org)](https://www.python.org/downloads/)에 접속하여 다운로드 후 설치합니다. (v3.9 이상 권장)
  * ⚠️ **중요 (Windows 사용자):** 파이썬 설치 화면 첫 페이지에서 **"Add Python to PATH"** 체크박스를 반드시 체크하고 설치해 주세요.
* **설치 확인:** 터미널에 `python --version`을 입력하여 버전을 확인합니다.

### **3. Git**
* **설치 방법:** [Git 공식 홈페이지(git-scm.com)](https://git-scm.com/)에서 다운로드하고 설치합니다.

---

## **🛠️ 1단계: 프로젝트 다운로드 및 환경 변수 설정**

**1. 저장소 다운로드 (Clone the repository)**
터미널을 열고 프로젝트를 다운로드할 폴더로 이동한 뒤, 아래 명령어를 입력합니다.
```bash
git clone https://github.com/halo117john/AEO-GEO_Operations_Dashboard.git
cd AEO-GEO_Operations_Dashboard
```

**2. 환경 변수(API 키) 설정 (.env.local)**
본 대시보드는 챗GPT와 제미나이(Gemini)에 직접 질문을 던지고 답변을 받아오기 위해 공식 API를 사용합니다.
`geo-aeo-tracker-main` (프론트엔드 최상단) 폴더에 `.env.local` 이라는 파일을 생성하고, 아래 안내에 따라 API 키를 입력해 주세요.

* **OpenAI API Key:** [OpenAI 플랫폼](https://platform.openai.com/api-keys)에서 발급
* **Gemini API Key:** [Google AI Studio](https://aistudio.google.com/app/apikey)에서 발급

```env
# geo-aeo-tracker-main/.env.local 

# [필수] OpenAI API Key
OPENAI_API_KEY=발급받은_openai_api_키를_여기에_입력하세요

# [필수] Google Gemini API Key 
GEMINI_API_KEY=발급받은_gemini_api_키를_여기에_입력하세요
```

---

## **⚙️ 2단계: 클릭 한 번으로 모든 환경 세팅하기 (자동화 스크립트)**

프론트엔드와 백엔드 디렉토리를 일일이 돌아다니며 설치할 필요가 없습니다. 프로젝트 루트 폴더에 있는 **`setup_env.bat`** 파일을 더블클릭하여 실행하세요.

* **프론트엔드 (Next.js)** 패키지를 자동으로 설치합니다 (`npm install`).
* **백엔드 (Crawler)** 가상환경을 만들고 필요한 패키지와 Playwright 브라우저를 설치합니다.

> 🚨 **Buster 크롬 확장 프로그램 준비 (캡차 우회용):** 
> 본 크롤러는 구글 검색 시 발생하는 캡차를 풀기 위해 크롬 확장 프로그램을 사용합니다. `Crawler/aeo-crawler/buster_extension` 폴더가 정상적으로 위치하는지 확인해주세요.

---

## **🚀 3단계: 서버 한 번에 실행하기**

마찬가지로 터미널을 여러 개 띄울 필요 없이, 프로젝트 루트 폴더의 **`start_servers.bat`** 파일을 더블클릭하세요.
자동으로 2개의 커맨드 창이 열리며 아래의 서버들이 구동됩니다.

1. **Frontend (Next.js 대시보드):** 포트 `3000`
2. **Backend (크롤러 API):** 포트 `8000`

**접속하기:**
모든 창에서 서버 구동이 완료되었다면, 인터넷 브라우저를 열고 [http://localhost:3000](http://localhost:3000) 으로 접속하여 대시보드를 사용하시면 됩니다!

---

## **💡 주요 디렉토리 구조 (Folder Structure)**

* `geo-aeo-tracker-main/`: Next.js 기반의 프론트엔드 대시보드 소스코드
* `Crawler/aeo-crawler/`: 구글 및 네이버 AI 브리핑을 수집하는 FastAPI 로컬 서버 (백엔드)
* `setup_env.bat`: [Windows 전용] 모든 컴포넌트의 종속성 패키지를 한 번에 설치하는 자동화 스크립트
* `start_servers.bat`: [Windows 전용] 2개의 서버를 동시에 띄워주는 자동화 스크립트
