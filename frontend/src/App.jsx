import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

function AeoTracker() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState({ summary: '', full: '' });
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleAnalyze = async () => {
    if (!file) {
      alert("CSV 파일을 선택해주세요.");
      return;
    }

    setLoading(true);
    setError('');
    
    // FormData에 파일 담기
    const formData = new FormData();
    formData.append('file', file);

    try {
      // FastAPI 백엔드로 POST 요청 (주소 확인 필요)
      const response = await fetch('http://localhost:8000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('서버 분석 중 에러가 발생했습니다.');
      }

      const data = await response.json();
      setReport({
        summary: data.summary_report,
        full: data.full_report
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>GEO/AEO Tracker AI 분석 툴</h1>
      
      <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc' }}>
        <input type="file" accept=".csv" onChange={handleFileChange} />
        <button 
          onClick={handleAnalyze} 
          disabled={loading}
          style={{ marginLeft: '10px', padding: '5px 15px' }}
        >
          {loading ? 'AI 분석 중...' : '분석 시작'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {report.summary && (
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* 핵심 요약본 렌더링 */}
          <div style={{ flex: 1, padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            <h2>📊 데일리 리포트 (핵심 요약)</h2>
            <hr />
            <ReactMarkdown>{report.summary}</ReactMarkdown>
          </div>

          {/* 전문 렌더링 */}
          <div style={{ flex: 1, padding: '20px', backgroundColor: '#f0f4f8', borderRadius: '8px' }}>
            <h2>📝 데일리 리포트 (전문)</h2>
            <hr />
            <ReactMarkdown>{report.full}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

export default AeoTracker;