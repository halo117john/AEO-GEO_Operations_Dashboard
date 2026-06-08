from openai import OpenAI
from prompts import MAP_SYSTEM_PROMPT, CMO_SYSTEM_PROMPT

# LM Studio의 Local Server 주소 (포트 1234)
client = OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")

def summarize_single_row(prompt_text, response_text):
    """Map: 개별 응답 요약 (길이 강제 제한)"""
    user_content = f"[프롬프트]: {prompt_text}\n[응답 내용]: {response_text}"
    try:
        response = client.chat.completions.create(
            model="eeve-korean",
            messages=[
                {"role": "system", "content": MAP_SYSTEM_PROMPT},
                {"role": "user", "content": user_content}
            ],
            temperature=0.3,
            max_tokens=100  # [핵심] 요약본 길이를 약 40~50단어로 물리적 강제 제한
        )
        return response.choices[0].message.contentx
    except Exception as e:
        return f"요약 실패: {str(e)}"

def generate_cmo_reports(stats_summary, combined_summaries):
    """최종 리포트 생성 (4096 토큰 에러 방지 안전장치 추가)"""
    
    # [핵심] 4096 토큰 제한 방어를 위해 문자열 길이 강제 절사 (1토큰 ≒ 2~3글자)
    max_chars = 4000
    if len(combined_summaries) > max_chars:
        combined_summaries = combined_summaries[:max_chars] + "\n...[토큰 제한으로 이하 생략]..."

    user_content = f"---정량 데이터 통계---\n{stats_summary}\n\n---AI 응답 요약(정성)---\n{combined_summaries}"
    
    # 1. 전문(Full Report) 생성
    full_prompt = "제공된 데이터를 바탕으로 상세한 '전문(Full Report)'을 작성하세요."
    full_response = client.chat.completions.create(
        model="eeve-korean",
        messages=[
            {"role": "system", "content": CMO_SYSTEM_PROMPT},
            {"role": "user", "content": user_content + "\n\n" + full_prompt}
        ],
        temperature=0.5
    )
    full_content = full_response.choices[0].message.content
    
    # 2. 요약본(Executive Summary) 생성
    exec_prompt = "작성된 내용을 바탕으로 바쁜 경영진을 위해 핵심 결론과 3가지 액션 플랜만 1페이지 이내의 불릿 포인트(*)로 요약하세요."
    exec_response = client.chat.completions.create(
        model="eeve-korean",
        messages=[
            {"role": "system", "content": CMO_SYSTEM_PROMPT},
            {"role": "assistant", "content": full_content},
            {"role": "user", "content": exec_prompt}
        ],
        temperature=0.3
    )
    
    return exec_response.choices[0].message.content, full_content