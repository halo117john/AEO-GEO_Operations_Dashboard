import pandas as pd
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
from llm_client import summarize_single_row

def process_csv_data(filepath):
    df = pd.read_csv(filepath)
    
    # 1. 정량 데이터 통계
    avg_visibility = df['가시성 점수'].astype(float).mean() if '가시성 점수' in df.columns else 0
    sentiment_counts = df['감성'].value_counts().to_dict() if '감성' in df.columns else {}
    
    stats_summary = f"""
    * 총 분석 데이터 수: {len(df)}건
    * 평균 가시성 점수: {avg_visibility:.1f}점
    * 감성 분포: {sentiment_counts}
    """
    
    # 2. 정성 데이터 요약 (Multi-threading 병렬 처리 적용)
    summaries = [None] * len(df) # 순서 보장을 위한 리스트 초기화
    print("AI 응답 내용 요약을 시작합니다. (병렬 처리 중...)")
    
    # 한 번에 4개씩 동시에 API 요청 (LM Studio 성능에 따라 max_workers 조절 가능)
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {}
        for index, row in df.iterrows():
            prompt = str(row.get('프롬프트', ''))
            response = str(row.get('응답 내용', ''))
            
            # 텍스트 절사 (길이 추가 축소)
            if len(response) > 600:
                response = response[:300] + "\n...\n" + response[-300:]
                
            # 쓰레드풀에 작업 예약
            future = executor.submit(summarize_single_row, prompt, response)
            futures[future] = index
            
        # 진행률 표시 (완료되는 순서대로 캐치하되, 결과는 원래 인덱스 위치에 저장)
        for future in tqdm(as_completed(futures), total=len(df)):
            index = futures[future]
            summaries[index] = f"사례 {index+1}: {future.result()}"
            
    combined_summaries = "\n".join(summaries)
    
    return stats_summary, combined_summaries