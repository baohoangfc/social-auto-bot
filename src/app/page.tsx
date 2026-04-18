'use client';

import { useState, useEffect } from 'react';
import './globals.css';
import { Newspaper, Send, Layout, Loader2, Calendar, Globe, Sparkles, Twitter, Facebook } from 'lucide-react';

export default function Dashboard() {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  
  // News Aggregator State
  const [sources, setSources] = useState<any[]>([]);
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [fetchingNews, setFetchingNews] = useState(false);

  const isErrorCaption = caption.includes('[HỆ THỐNG BẬN]');

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    const res = await fetch('/api/news/list');
    const data = await res.json();
    if (data.sources) setSources(data.sources);
  };

  const fetchArticles = async (sourceId: string) => {
    setFetchingNews(true);
    try {
      const res = await fetch(`/api/news/list?sourceId=${sourceId}`);
      const data = await res.json();
      if (data.items) setArticles(data.items);
      setSelectedSource(data.source);
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingNews(false);
    }
  };

  const handleGenerate = async (newsUrl?: string) => {
    const targetUrl = newsUrl || url;
    if (!targetUrl) return alert('Vui lòng nhập hoặc chọn URL tin tức!');
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ url: targetUrl }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        setCaption(`⚠️ [LỖI] ${data.error || 'Không thể xử lý tin tức'}\n\nChi tiết: ${data.detail || 'Lỗi kết nối hoặc trang web chặn bot.'}`);
        return;
      }
      if (data.caption) setCaption(data.caption);
    } catch (err: any) {
      console.error(err);
      setCaption(`⚠️ [LỖI HỆ THỐNG] Không thể xử lý tin tức này.\n\nChi tiết: ${err.message || 'Lỗi kết nối hoặc trang web chặn bot.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishOrSchedule = async () => {
    if (!caption) return alert('Vui lòng soạn nội dung trước!');
    setPosting(true);
    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: caption,
          scheduledFor: scheduleTime || null,
          status: scheduleTime ? 'scheduled' : 'posted'
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        const hints = Array.isArray(data.hints) ? `\n\nGợi ý:\n- ${data.hints.join('\n- ')}` : '';
        const details = Array.isArray(data.details)
          ? `\n\nChi tiết:\n- ${data.details.map((d: { platform: string; error?: string }) => `${d.platform}: ${d.error || 'Unknown error'}`).join('\n- ')}`
          : '';
        alert(`${data.error || 'Đăng bài thất bại'}${hints}${details}`);
        return;
      }
      if (data.success) {
        if (data.partialFailure && Array.isArray(data.results)) {
          const failed = data.results.filter((r: { status: string }) => r.status === 'failed');
          const hints = Array.isArray(data.hints) && data.hints.length > 0
            ? `\n\nGợi ý:\n- ${data.hints.join('\n- ')}`
            : '';
          alert(
            `Đăng thành công một phần. Nền tảng lỗi: ${failed
              .map((f: { platform: string }) => f.platform)
              .join(', ') || 'không xác định'}${hints}`
          );
        } else {
          alert(scheduleTime ? `Đã hẹn giờ đăng bài vào ${scheduleTime}!` : 'Đã đăng bài thành công!');
        }
        setCaption('');
        setUrl('');
        setScheduleTime('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <div>
          <h1 className="logo">SOCIAL AUTO-BOT</h1>
          <p className="hero-subtitle">Auto create & publish social content in one place</p>
        </div>
        <div className="actions">
          <button className="btn btn-ghost"><Globe size={16} /> Global Feed</button>
          <button className="btn btn-primary"><Sparkles size={16} /> Connect Account</button>
        </div>
      </header>

      <section className="stats-row">
        <div className="stat-card">
          <p>Publishing Channels</p>
          <strong>X + Facebook</strong>
        </div>
        <div className="stat-card">
          <p>Mode</p>
          <strong>Manual + Schedule</strong>
        </div>
        <div className="stat-card">
          <p>AI Engine</p>
          <strong>Gemini Captioning</strong>
        </div>
      </section>

      {/* News Aggregator Section */}
      <section className="composer-section composer-section-plain">
        <h2 className="card-title card-title-main">
          <Globe size={20} /> International News Browser
        </h2>
        <div className="source-row">
          {sources.map(s => (
            <div 
              key={s.id} 
              onClick={() => fetchArticles(s.id)}
              className={`card ${selectedSource?.id === s.id ? 'active-source' : ''}`}
              style={{ minWidth: '150px', cursor: 'pointer', textAlign: 'center', padding: '1rem' }}
            >
              <img src={s.icon} alt={s.name} style={{ width: '24px', height: '24px', marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{s.name}</p>
            </div>
          ))}
        </div>

        {articles.length > 0 && (
          <div className="grid" style={{ marginTop: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {articles.slice(0, 6).map((item, idx) => (
              <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</h3>
                  <p style={{ fontSize: '0.75rem', color: '#999' }}>{new Date(item.pubDate).toLocaleDateString()}</p>
                </div>
                <button 
                  className="btn btn-primary" 
                  style={{ marginTop: '1rem', fontSize: '0.8rem', padding: '0.5rem' }}
                  onClick={() => handleGenerate(item.link)}
                >
                  Pick & Generate
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="composer-section">
        <h2 className="card-title card-title-main">
          <Layout size={20} /> Content Composer
        </h2>
        <div className="platform-pills">
          <span><Twitter size={14} /> X</span>
          <span><Facebook size={14} /> Facebook</span>
        </div>
        
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#999' }}>
          Fetch from News URL
        </label>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Hoặc dán link tin tức vào đây..." 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button className="btn btn-primary" onClick={() => handleGenerate()} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Newspaper size={18} />} {loading ? 'Generating...' : 'Generate from AI'}
          </button>
        </div>

        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#999' }}>
          Post Caption
        </label>
        <textarea 
          className="input-field" 
          rows={5} 
          placeholder="AI sẽ soạn nội dung tại đây..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        ></textarea>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid #222', paddingTop: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#999' }}>
              <Calendar size={16} /> Schedule Time
            </label>
            <input 
              type="datetime-local" 
              className="input-field" 
              style={{ marginBottom: 0 }}
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handlePublishOrSchedule} 
            disabled={posting || isErrorCaption || !caption}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', marginTop: '1.5rem' }}
          >
            {posting ? <Loader2 className="animate-spin" /> : <Send size={18} />} {scheduleTime ? 'Schedule Post' : 'Publish Now'}
          </button>
        </div>
      </section>

      <style jsx>{`
        .active-source {
          border-color: #3b82f6 !important;
          background: rgba(59, 130, 246, 0.1) !important;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
