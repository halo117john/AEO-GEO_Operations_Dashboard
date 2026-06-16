# **🚀 AEO/GEO Operations Dashboard & Crawler 시작하기**

본 프로젝트는 생성형 AI 검색 엔진(LLM) 환경에서 특정 브랜드의 가시성을 추적하고 분석하는 **Next.js 기반의 프론트엔드 대시보드**와, 구글 AI 오버뷰 및 네이버 AI 브리핑 데이터를 수집하는 **Python(FastAPI) 기반의 백엔드 크롤러**로 구성되어 있습니다.

아래 가이드에 따라 로컬 환경에 프로젝트를 설정하고 실행할 수 있습니다.

## **📋 사전 준비 사항 (Prerequisites)**

프로젝트를 실행하기 전에 아래 도구들이 컴퓨터에 설치되어 있어야 합니다.

### **1\. Node.js (프론트엔드 구동용)**

* **설치 방법:** [Node.js 공식 홈페이지(nodejs.org)](https://nodejs.org/ko/)에 접속하여 화면에 보이는 **LTS 버전**을 다운로드하고 설치합니다. (v18.0.0 이상 권장)  
* **설치 확인:** 터미널을 열고 node \-v 및 npm \-v를 입력하여 버전 숫자가 나오면 성공입니다.

### **2\. Python (백엔드 크롤러 구동용)**

* **설치 방법:** [Python 공식 홈페이지(python.org)](https://www.python.org/downloads/)에 접속하여 다운로드 후 설치합니다. (v3.9 이상 권장)  
  * ⚠️ **중요 (Windows 사용자):** 파이썬 설치 화면 첫 페이지에서 **"Add Python to PATH"** 체크박스를 반드시 체크하고 설치해 주세요.  
* **설치 확인:** 터미널에 python \--version (또는 Mac의 경우 python3 \--version)을 입력하여 버전을 확인합니다.

### **3\. Git**

* **설치 방법:** [Git 공식 홈페이지(git-scm.com)](https://git-scm.com/)에서 운영체제에 맞는 버전을 다운로드하고 설치합니다.

## **🛠️ 1단계: 프로젝트 다운로드 및 프론트엔드 설정**

**1\. 저장소 다운로드 (Clone the repository)**

터미널을 열고 프로젝트를 다운로드할 폴더로 이동한 뒤, 아래 명령어를 입력합니다.
```
git clone \[https://github.com/halo117john/AEO-GEO\_Operations\_Dashboard.git\](https://github.com/halo117john/AEO-GEO\_Operations\_Dashboard.git)
cd AEO-GEO\_Operations\_Dashboard
```
**2\. 패키지 설치 (Install dependencies)**

대시보드 구동에 필요한 라이브러리들을 설치합니다.
```
npm install
```
**3\. 환경 변수(API 키) 설정 (.env.local)**

본 대시보드는 챗GPT와 제미나이(Gemini)에 직접 질문을 던지고, 우리 브랜드가 어떻게 언급되는지 답변을 받아오기 위해 공식 API를 사용합니다.

프로젝트 루트 경로(최상단 폴더)에 .env.local 이라는 파일을 생성하고, 아래의 안내에 따라 API 키를 발급받아 입력해 주세요. *(이 파일은 보안상 절대 깃허브에 업로드하면 안 됩니다.)*

**🔑 API 키 발급 안내**

* **OpenAI API Key:** [OpenAI API 플랫폼](https://platform.openai.com/api-keys)에 로그인한 후, 우측 상단의 'Create new secret key'를 눌러 발급받습니다. (챗GPT 응답 수집용)  
* **Gemini API Key:** [Google AI Studio](https://aistudio.google.com/app/apikey)에 접속하여 'Create API key' 버튼을 눌러 발급받습니다. (제미나이 응답 수집용)
```
# .env.local 

# [필수] OpenAI API Key
OPENAI_API_KEY=발급받은_openai_api_키를_여기에_입력하세요

# [필수] Google Gemini API Key 
GEMINI_API_KEY=발급받은_gemini_api_키를_여기에_입력하세요
```

## **⚙️ 2단계: 백엔드 크롤러 설정 (FastAPI \+ Playwright)**

프론트엔드 폴더 안(또는 크롤러가 위치한 폴더)에서 새로운 터미널 창을 열고 크롤러 환경을 세팅합니다.

**1\. 파이썬 라이브러리 설치**

크롤러 구동에 필요한 패키지들을 설치합니다.
```
pip install fastapi uvicorn pydantic playwright playwright-stealth
```
**2\. Playwright 브라우저 설치**

웹 스크래핑을 위한 크로미움 브라우저 엔진을 설치합니다.
```
playwright install chromium
```
**3\. 🚨 Buster 크롬 확장 프로그램 준비 (캡차 우회용)**

본 크롤러는 구글 검색 시 빈번하게 발생하는 캡차(reCAPTCHA)를 자동으로 풀기 위해 **크롬 확장 프로그램(Buster: Captcha Solver for Humans)** 을 사용합니다. 

## **🚀 3단계: 프로젝트 실행하기**

본 프로젝트를 정상적으로 사용하려면 **프론트엔드(Next.js)와 백엔드(Python API)를 각각 별도의 터미널에서 동시에 실행**해야 합니다.

### **터미널 1: 백엔드 크롤러 서버 실행**

파이썬 파일(main.py)이 있는 경로(\Crawler\aeo-crawler)에서 아래 명령어를 실행합니다.
```
\# 파일명이 main.py가 아닌 경우, 실행 파일 이름으로 변경해주세요.  
python main.py
```
*(성공 시 Uvicorn running on http://127.0.0.1:8000 이라는 메시지가 나타납니다.)*

### **터미널 2: 프론트엔드 대시보드 실행**

프로젝트 최상단 폴더에서 새로운 터미널 창을 열고 아래 명령어를 실행합니다.
```
npm run dev
```
### **접속하기**

두 서버가 모두 켜졌다면, 인터넷 브라우저를 열고 [http://localhost:3000](http://localhost:3000) 으로 접속하여 대시보드를 사용합니다\! 구글 AI와 네이버 AI 브리핑 수집 시 자동으로 백엔드 크롤러가 브라우저를 띄워 데이터를 수집합니다.

## **💡 주요 디렉토리 구조 (Folder Structure)**

* src/components/dashboard/: 대시보드 UI를 구성하는 핵심 컴포넌트들  
* src/app/api/: OpenAI, Gemini 등과 통신하는 프론트엔드 API 라우트  
* main.py (또는 크롤러 파이썬 파일): 구글 및 네이버 AI 브리핑을 수집하는 FastAPI 로컬 서버  
* buster\_extension/: 캡차 우회를 위한 크롬 확장 프로그램 소스 폴더
