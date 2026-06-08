from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import io

# 기존에 만든 모듈 임포트
from data_processor import process_csv_data
from llm_client import generate_cmo_reports

app = FastAPI(title="GEO/AEO Tracker API")

# React 프론트엔드와의 통신을 위한 CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 운영시에는 React 서버 주소(예: "http://localhost:3000")로 제한하세요.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 응답 데이터 모델
class ReportResponse(BaseModel):
    summary_report: str
    full_report: str

@app.post("/api/analyze", response_model=ReportResponse)
async def analyze_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="CSV 파일만 업로드 가능합니다.")
    
    try:
        # 1. 파일 읽기 및 임시 저장 (메모리에서 바로 처리하기 위한 세팅)
        contents = await file.read()
        
        # 임시로 파일로 저장 (기존 process_csv_data가 파일 경로를 받기 때문)
        # 추후 data_processor.py를 수정하여 DataFrame을 직접 받도록 최적화하는 것이 좋습니다.
        temp_filepath = f"temp_{file.filename}"
        with open(temp_filepath, "wb") as f:
            f.write(contents)
            
        # 2. 데이터 분석 및 LLM 리포트 생성
        stats, qualitative_summaries = process_csv_data(temp_filepath)
        exec_report, full_report = generate_cmo_reports(stats, qualitative_summaries)
        
        # 3. 결과 반환 (JSON 형식)
        return ReportResponse(
            summary_report=exec_report,
            full_report=full_report
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 중 에러 발생: {str(e)}")