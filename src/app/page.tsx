'use client';

import { useState } from 'react';
import './globals.css';
import { Newspaper, Send, Layout, Settings, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const handleGenerate = async () => {
    if (!url) return alert('Vui lòng nhập URL tin tức!');
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ url }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.caption) setCaption(data.caption);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!caption) return alert('Vui lòng soạn nội dung trước!');
    setPosting(true);
    // Logic gọi API đăng bài...
    setTimeout(() => {
      setPosting(false);
      alert('Đã đăng bài thành công (Mô phỏng)!');
    }, 2000);
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1 className="logo">SOCIAL AUTO-BOT</h1>
        <div className="actions">
          <button className="btn btn-primary" id="btn-sync-accounts">Connect Account</button>
        </div>
      </header>

      <div className="grid">
        <div className="card">
          <p className="card-title">Total Posts</p>
          <p className="card-value">24</p>
        </div>
        <div className="card">
          <p className="card-title">Platforms Active</p>
          <p className="card-value">4</p>
        </div>
        <div className="card">
          <p className="card-title">AI Generated</p>
          <p className="card-value">18</p>
        </div>
      </div>

      <section className="composer-section">
        <h2 className="card-title" style={{ color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layout size={20} /> Content Composer
        </h2>
        
        <label htmlFor="news-url" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#999' }}>
          Fetch from News URL
        </label>
        <input 
          type="text" 
          id="news-url" 
          className="input-field" 
          placeholder="https://news.ycombinator.com/item?id=..." 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleGenerate} 
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Newspaper size={18} />} 
            {loading ? 'Generating...' : 'Generate from AI'}
          </button>
          <button className="btn" style={{ background: '#222', color: 'white', border: '1px solid #333' }}>
            Customize Image
          </button>
        </div>

        <label htmlFor="caption" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#999' }}>
          Post Caption
        </label>
        <textarea 
          id="caption" 
          className="input-field" 
          rows={5} 
          placeholder="What's on your mind?"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        ></textarea>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={handlePublish} 
            disabled={posting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {posting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {posting ? 'Publishing...' : 'Publish Now'}
          </button>
        </div>
      </section>

      <section style={{ marginTop: '3rem' }}>
        <h2 className="card-title" style={{ color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={20} /> Recent Schedules
        </h2>
        <div className="card" style={{ padding: '0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #222' }}>
                <th style={{ padding: '1rem' }}>Content Preview</th>
                <th style={{ padding: '1rem' }}>Platform</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #222' }}>
                <td style={{ padding: '1rem', color: '#999' }}>Tiêu đề tin tức mới nhất về công nghệ AI...</td>
                <td style={{ padding: '1rem' }}>FB, IG, X</td>
                <td style={{ padding: '1rem' }}><span style={{ color: '#10b981' }}>Posted</span></td>
                <td style={{ padding: '1rem', color: '#999' }}>2 giờ trước</td>
              </tr>
              <tr>
                <td style={{ padding: '1rem', color: '#999' }}>Bản cập nhật mới nhất từ thị trường tài chính...</td>
                <td style={{ padding: '1rem' }}>FB, X</td>
                <td style={{ padding: '1rem' }}>Scheduled</td>
                <td style={{ padding: '1rem', color: '#999' }}>Hôm nay, 21:00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
