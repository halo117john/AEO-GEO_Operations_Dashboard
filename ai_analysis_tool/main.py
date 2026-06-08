from data_processor import process_csv_data
from llm_client import generate_cmo_reports

def main():
    # 첨부해주신 파일명으로 세팅
    csv_file = "ai_responses_export_2026-05-20.csv" 
    
    print("--- 1. 데이터 파싱 및 요약 진행 ---")
    stats, qualitative_summaries = process_csv_data(csv_file)
    
    print("\n--- 2. CMO 전략 리포트 생성 중 ---")
    exec_report, full_report = generate_cmo_reports(stats, qualitative_summaries)
    
    print("\n--- 3. 결과물 파일 저장 ---")
    with open("CMO_Daily_Report_Summary.md", "w", encoding="utf-8") as f:
        f.write("# 데일리 리포트 (핵심 요약본)\n\n" + exec_report)
        
    with open("CMO_Daily_Report_Full.md", "w", encoding="utf-8") as f:
        f.write("# 데일리 리포트 (전문)\n\n" + full_report)
        
    print("✅ 리포트 생성이 완료되었습니다. 폴더를 확인해주세요.")

if __name__ == "__main__":
    main()