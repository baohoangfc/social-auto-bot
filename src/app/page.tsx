'use client';

import { useEffect, useMemo, useState } from 'react';
import NextImage from 'next/image';
import './globals.css';
import {
  Newspaper,
  Send,
  Layout,
  Loader2,
  Calendar,
  Globe,
  Sparkles,
  MessageCircle,
  Users,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import type { NewsSource } from '@/lib/news/sources';
import type { RssArticle } from '@/lib/news/scraper';

type FacebookPageRecord = {
  _id?: string;
  pageId: string;
  pageName: string;
  pageAccessToken?: string;
  profilePicture?: string;
  category?: string;
  isActive: boolean;
  contentProfile?: {
    topic?: string;
    tone?: string;
    language?: string;
    prompt?: string;
    hashtags?: string[];
    sourceIds?: string[];
  };
  postingSettings?: {
    autoPost?: boolean;
    requireApproval?: boolean;
    defaultScheduleTimes?: string[];
  };
};

type FacebookPageForm = {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  category: string;
  isActive: boolean;
  topic: string;
  tone: string;
  language: string;
  prompt: string;
  hashtags: string;
};

type SourcesResponse = { sources?: NewsSource[] };
type ArticlesResponse = { source?: NewsSource; items?: RssArticle[] };
type GenerateResponse = { caption?: string; title?: string; sourceUrl?: string; imageDataUrl?: string | null; error?: string; detail?: string };
type PostResult = { platform: string; pageId?: string; pageName?: string; status: string; error?: string };
type PostResponse = {
  success?: boolean;
  error?: string;
  hints?: string[];
  details?: PostResult[];
  results?: PostResult[];
  partialFailure?: boolean;
};

type FacebookPagesResponse = {
  success?: boolean;
  pages?: FacebookPageRecord[];
  page?: FacebookPageRecord;
  error?: string;
};

const emptyPageForm: FacebookPageForm = {
  pageId: '',
  pageName: '',
  pageAccessToken: '',
  category: '',
  isActive: true,
  topic: '',
  tone: 'Chuyên nghiệp, rõ ràng, thu hút',
  language: 'Tiếng Việt',
  prompt: '',
  hashtags: '#BreakingNews, #FacebookPage',
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Lỗi kết nối hoặc trang web chặn bot.';
}

function getResultLabel(result: PostResult) {
  if (result.pageName || result.pageId) return `${result.pageName || result.pageId}`;
  return result.platform;
}

export default function Dashboard() {
  const [url, setUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');

  const [facebookPages, setFacebookPages] = useState<FacebookPageRecord[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [pageForm, setPageForm] = useState<FacebookPageForm>(emptyPageForm);
  const [savingPage, setSavingPage] = useState(false);

  const [sources, setSources] = useState<NewsSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<NewsSource | null>(null);
  const [articles, setArticles] = useState<RssArticle[]>([]);
  const [fetchingNews, setFetchingNews] = useState(false);

  const activePages = useMemo(() => facebookPages.filter((page) => page.isActive), [facebookPages]);
  const primarySelectedPage = useMemo(
    () => activePages.find((page) => page.pageId === selectedPageIds[0]),
    [activePages, selectedPageIds]
  );
  const isErrorCaption = caption.includes('[HỆ THỐNG BẬN]');

  useEffect(() => {
    fetchSources();
    fetchFacebookPages();
  }, []);

  const fetchSources = async () => {
    const res = await fetch('/api/news/list');
    const data = (await res.json()) as SourcesResponse;
    if (data.sources) setSources(data.sources);
  };

  const fetchFacebookPages = async () => {
    const res = await fetch('/api/facebook-pages');
    const data = (await res.json()) as FacebookPagesResponse;
    if (data.pages) {
      setFacebookPages(data.pages);
      setSelectedPageIds((current) => {
        const validIds = new Set(data.pages?.filter((page) => page.isActive).map((page) => page.pageId));
        const kept = current.filter((pageId) => validIds.has(pageId));
        return kept.length > 0 ? kept : data.pages?.filter((page) => page.isActive).slice(0, 1).map((page) => page.pageId) || [];
      });
    }
  };

  const fetchArticles = async (sourceId: string) => {
    setFetchingNews(true);
    try {
      const res = await fetch(`/api/news/list?sourceId=${sourceId}`);
      const data = (await res.json()) as ArticlesResponse;
      if (data.items) setArticles(data.items);
      setSelectedSource(data.source || null);
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingNews(false);
    }
  };

  const toggleSelectedPage = (pageId: string) => {
    setSelectedPageIds((current) => (
      current.includes(pageId)
        ? current.filter((id) => id !== pageId)
        : [...current, pageId]
    ));
  };

  const handleSaveFacebookPage = async () => {
    if (!pageForm.pageId || !pageForm.pageName || !pageForm.pageAccessToken) {
      return alert('Vui lòng nhập Page ID, Page Name và Page Access Token.');
    }

    setSavingPage(true);
    try {
      const res = await fetch('/api/facebook-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: pageForm.pageId,
          pageName: pageForm.pageName,
          pageAccessToken: pageForm.pageAccessToken,
          category: pageForm.category,
          isActive: pageForm.isActive,
          contentProfile: {
            topic: pageForm.topic,
            tone: pageForm.tone,
            language: pageForm.language,
            prompt: pageForm.prompt,
            hashtags: pageForm.hashtags,
          },
        }),
      });
      const data = (await res.json()) as FacebookPagesResponse;
      if (!res.ok || data.success === false) {
        alert(data.error || 'Không thể lưu Facebook Page.');
        return;
      }
      setPageForm(emptyPageForm);
      await fetchFacebookPages();
      alert('Đã lưu Facebook Page.');
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(err));
    } finally {
      setSavingPage(false);
    }
  };

  const handleEditPage = (page: FacebookPageRecord) => {
    setPageForm({
      pageId: page.pageId,
      pageName: page.pageName,
      pageAccessToken: page.pageAccessToken || '',
      category: page.category || '',
      isActive: page.isActive,
      topic: page.contentProfile?.topic || '',
      tone: page.contentProfile?.tone || 'Chuyên nghiệp, rõ ràng, thu hút',
      language: page.contentProfile?.language || 'Tiếng Việt',
      prompt: page.contentProfile?.prompt || '',
      hashtags: page.contentProfile?.hashtags?.join(', ') || '',
    });
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa Facebook Page này khỏi hệ thống?')) return;
    const res = await fetch(`/api/facebook-pages?pageId=${encodeURIComponent(pageId)}`, { method: 'DELETE' });
    const data = (await res.json()) as FacebookPagesResponse;
    if (!res.ok || data.success === false) {
      alert(data.error || 'Không thể xóa Page.');
      return;
    }
    await fetchFacebookPages();
  };

  const handleGenerate = async (newsUrl?: string) => {
    const targetUrl = newsUrl || url;
    if (!targetUrl) return alert('Vui lòng nhập hoặc chọn URL tin tức!');
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ url: targetUrl, pageId: primarySelectedPage?.pageId }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = (await res.json()) as GenerateResponse;
      if (!res.ok) {
        setCaption(`⚠️ [LỖI] ${data.error || 'Không thể xử lý tin tức'}\n\nChi tiết: ${data.detail || 'Lỗi kết nối hoặc trang web chặn bot.'}`);
        return;
      }
      if (data.caption) setCaption(data.caption);
      if (data.sourceUrl) {
        setSourceUrl(data.sourceUrl);
        setUrl(data.sourceUrl);
      }
      setImageDataUrl(data.imageDataUrl ?? null);
    } catch (err) {
      console.error(err);
      setCaption(`⚠️ [LỖI HỆ THỐNG] Không thể xử lý tin tức này.\n\nChi tiết: ${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishOrSchedule = async () => {
    if (!caption) return alert('Vui lòng soạn nội dung trước!');
    if (selectedPageIds.length === 0) return alert('Vui lòng chọn ít nhất một Facebook Page để đăng bài.');
    setPosting(true);
    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: caption,
          sourceUrl: sourceUrl || url || null,
          mediaUrls: imageDataUrl ? [imageDataUrl] : [],
          scheduledFor: scheduleTime || null,
          status: scheduleTime ? 'scheduled' : 'posted',
          targets: selectedPageIds.map((pageId) => ({ platform: 'facebook', pageId })),
        }),
      });
      const data = (await res.json()) as PostResponse;
      if (!res.ok || data.success === false) {
        const hints = Array.isArray(data.hints) ? `\n\nGợi ý:\n- ${data.hints.join('\n- ')}` : '';
        const details = Array.isArray(data.details)
          ? `\n\nChi tiết:\n- ${data.details.map((d) => `${getResultLabel(d)}: ${d.error || 'Unknown error'}`).join('\n- ')}`
          : '';
        alert(`${data.error || 'Đăng bài thất bại'}${hints}${details}`);
        return;
      }
      if (data.success) {
        if (data.partialFailure && Array.isArray(data.results)) {
          const failed = data.results.filter((r) => r.status === 'failed');
          const hints = Array.isArray(data.hints) && data.hints.length > 0
            ? `\n\nGợi ý:\n- ${data.hints.join('\n- ')}`
            : '';
          alert(
            `Đăng thành công một phần. Page lỗi: ${failed
              .map(getResultLabel)
              .join(', ') || 'không xác định'}${hints}`
          );
        } else {
          alert(scheduleTime ? `Đã hẹn giờ đăng bài vào ${scheduleTime}!` : 'Đã đăng bài thành công!');
        }
        setCaption('');
        setUrl('');
        setSourceUrl('');
        setImageDataUrl(null);
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
          <p className="hero-subtitle">Quản trị nhiều Facebook Page, tạo content riêng và publish đúng Page</p>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={fetchFacebookPages}><RefreshCw size={16} /> Refresh Pages</button>
          <button className="btn btn-primary" onClick={() => document.getElementById('facebook-pages')?.scrollIntoView({ behavior: 'smooth' })}><Sparkles size={16} /> Connect Page</button>
        </div>
      </header>

      <section className="stats-row">
        <div className="stat-card">
          <p>Facebook Pages</p>
          <strong>{facebookPages.length} connected</strong>
        </div>
        <div className="stat-card">
          <p>Selected Targets</p>
          <strong>{selectedPageIds.length} page(s)</strong>
        </div>
        <div className="stat-card">
          <p>AI Engine</p>
          <strong>Gemini + Page Profile</strong>
        </div>
      </section>

      <section className="composer-section" id="facebook-pages">
        <h2 className="card-title card-title-main">
          <Users size={20} /> Facebook Page Manager
        </h2>
        <div className="grid" style={{ gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(320px, 1.1fr)' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <label className="field-label">Page ID</label>
            <input className="input-field" value={pageForm.pageId} onChange={(e) => setPageForm({ ...pageForm, pageId: e.target.value })} placeholder="123456789" />
            <label className="field-label">Page Name</label>
            <input className="input-field" value={pageForm.pageName} onChange={(e) => setPageForm({ ...pageForm, pageName: e.target.value })} placeholder="Tên Facebook Page" />
            <label className="field-label">Page Access Token</label>
            <input className="input-field" type="password" value={pageForm.pageAccessToken} onChange={(e) => setPageForm({ ...pageForm, pageAccessToken: e.target.value })} placeholder="EAAB..." />
            <label className="field-label">Category</label>
            <input className="input-field" value={pageForm.category} onChange={(e) => setPageForm({ ...pageForm, category: e.target.value })} placeholder="News, Business, Community..." />
            <label className="checkbox-row">
              <input type="checkbox" checked={pageForm.isActive} onChange={(e) => setPageForm({ ...pageForm, isActive: e.target.checked })} /> Active Page
            </label>
          </div>

          <div className="card" style={{ padding: '1rem' }}>
            <label className="field-label">Content Topic</label>
            <input className="input-field" value={pageForm.topic} onChange={(e) => setPageForm({ ...pageForm, topic: e.target.value })} placeholder="Ví dụ: AI news, crypto, local food..." />
            <label className="field-label">Tone</label>
            <input className="input-field" value={pageForm.tone} onChange={(e) => setPageForm({ ...pageForm, tone: e.target.value })} />
            <label className="field-label">Language</label>
            <input className="input-field" value={pageForm.language} onChange={(e) => setPageForm({ ...pageForm, language: e.target.value })} />
            <label className="field-label">Hashtags</label>
            <input className="input-field" value={pageForm.hashtags} onChange={(e) => setPageForm({ ...pageForm, hashtags: e.target.value })} placeholder="#AI, #News" />
            <label className="field-label">Prompt riêng</label>
            <textarea className="input-field" rows={3} value={pageForm.prompt} onChange={(e) => setPageForm({ ...pageForm, prompt: e.target.value })} placeholder="Quy định riêng khi AI viết cho Page này..." />
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleSaveFacebookPage} disabled={savingPage}>
                {savingPage ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />} Save Page
              </button>
              <button className="btn btn-ghost" onClick={() => setPageForm(emptyPageForm)}>Clear</button>
            </div>
          </div>
        </div>

        <div className="page-list">
          {facebookPages.length === 0 ? (
            <p style={{ color: '#999', marginTop: '1rem' }}>Chưa có Facebook Page. Hãy thêm Page ID và Page Access Token để bắt đầu.</p>
          ) : facebookPages.map((page) => (
            <div key={page.pageId} className={`page-card ${selectedPageIds.includes(page.pageId) ? 'selected-page' : ''}`}>
              <div>
                <strong>{page.pageName}</strong>
                <p>{page.category || 'No category'} · {page.isActive ? 'Active' : 'Inactive'}</p>
                <p>Topic: {page.contentProfile?.topic || 'Chưa cấu hình'} · Tone: {page.contentProfile?.tone || 'Default'}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => toggleSelectedPage(page.pageId)} disabled={!page.isActive}>
                  {selectedPageIds.includes(page.pageId) ? 'Unselect' : 'Select'}
                </button>
                <button className="btn btn-ghost" onClick={() => handleEditPage(page)}>Edit</button>
                <button className="btn btn-ghost" onClick={() => handleDeletePage(page.pageId)}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="composer-section composer-section-plain">
        <h2 className="card-title card-title-main">
          <Globe size={20} /> International News Browser
        </h2>
        <div className="source-row">
          {sources.map((s) => (
            <div
              key={s.id}
              onClick={() => fetchArticles(s.id)}
              className={`card ${selectedSource?.id === s.id ? 'active-source' : ''}`}
              style={{ minWidth: '150px', cursor: 'pointer', textAlign: 'center', padding: '1rem' }}
            >
              <span aria-hidden="true" style={{ display: 'inline-flex', marginBottom: '0.5rem' }}><ImageIcon size={24} /></span>
              <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{s.name}</p>
            </div>
          ))}
        </div>

        {fetchingNews && (
          <p style={{ color: '#999', marginTop: '1rem' }}>Đang tải tin tức...</p>
        )}

        {articles.length > 0 && (
          <div className="grid" style={{ marginTop: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {articles.slice(0, 6).map((item, idx) => (
              <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</h3>
                  <p style={{ fontSize: '0.75rem', color: '#999' }}>{item.pubDate ? new Date(item.pubDate).toLocaleDateString() : 'Không rõ ngày'}</p>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '1rem', fontSize: '0.8rem', padding: '0.5rem' }}
                  onClick={() => handleGenerate(item.link)}
                >
                  Pick & Generate{primarySelectedPage ? ` for ${primarySelectedPage.pageName}` : ''}
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
          <span><MessageCircle size={14} /> Facebook Pages</span>
          {selectedPageIds.length > 0 ? <span><Users size={14} /> {selectedPageIds.length} selected</span> : <span><Users size={14} /> Chưa chọn Page</span>}
        </div>

        <div className="target-grid">
          {activePages.map((page) => (
            <label key={page.pageId} className={`target-pill ${selectedPageIds.includes(page.pageId) ? 'target-pill-active' : ''}`}>
              <input type="checkbox" checked={selectedPageIds.includes(page.pageId)} onChange={() => toggleSelectedPage(page.pageId)} />
              <span>{page.pageName}</span>
            </label>
          ))}
        </div>

        <label className="field-label">Fetch from News URL</label>
        <input
          type="text"
          className="input-field"
          placeholder="Hoặc dán link tin tức vào đây..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button className="btn btn-primary" onClick={() => handleGenerate()} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Newspaper size={18} />} {loading ? 'Generating...' : `Generate${primarySelectedPage ? ` for ${primarySelectedPage.pageName}` : ''}`}
          </button>
        </div>

        <label className="field-label">Post Caption</label>
        <textarea
          className="input-field"
          rows={5}
          placeholder="AI sẽ soạn nội dung tại đây..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        ></textarea>

        {imageDataUrl && (
          <div style={{ marginTop: '1rem' }}>
            <label className="field-label">
              <ImageIcon size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
              AI Generated Image
            </label>
            <NextImage
              src={imageDataUrl}
              alt="AI generated preview"
              width={512}
              height={280}
              unoptimized
              style={{ maxWidth: '100%', height: 'auto', maxHeight: '280px', borderRadius: '8px', border: '1px solid #222', objectFit: 'contain' }}
            />
          </div>
        )}

        {sourceUrl && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#777' }}>
            Source: {sourceUrl}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid #222', paddingTop: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
            disabled={posting || isErrorCaption || !caption || selectedPageIds.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', marginTop: '1.5rem' }}
          >
            {posting ? <Loader2 className="animate-spin" /> : <Send size={18} />} {scheduleTime ? 'Schedule to Pages' : 'Publish to Pages'}
          </button>
        </div>
      </section>

      <style jsx>{`
        .active-source {
          border-color: #3b82f6 !important;
          background: rgba(59, 130, 246, 0.1) !important;
        }
        .selected-page {
          border-color: #3b82f6 !important;
          background: rgba(59, 130, 246, 0.12) !important;
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
