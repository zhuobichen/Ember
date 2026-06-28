import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';
import './styles.css';

// ========== 导航栏 ==========
function Navbar() {
  const [alias, setAlias] = useState(localStorage.getItem('alias'));
  const navigate = useNavigate();

  const logout = () => {
    api.clearToken();
    localStorage.removeItem('alias');
    setAlias(null);
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">纪念碑谷</Link>
      <div className="navbar-links">
        <Link to="/">浏览</Link>
        {alias ? (
          <>
            <Link to="/upload">上传</Link>
            <Link to="/my">我的</Link>
            <span style={{ color: 'var(--accent2)', fontFamily: 'monospace' }}>{alias}</span>
            <button onClick={logout}>登出</button>
          </>
        ) : (
          <>
            <Link to="/login">登录</Link>
            <Link to="/register">注册</Link>
          </>
        )}
      </div>
    </nav>
  );
}

// ========== 首页 - 纪念碑列表 ==========
function HomePage() {
  const [monuments, setMonuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    setLoading(true);
    api.getMonuments(page).then(data => {
      setMonuments(data.monuments || []);
      setPagination(data.pagination || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [page]);

  return (
    <div className="container">
      <h1 className="page-title">纪念碑谷</h1>
      <p className="page-subtitle">人永远都值得被记得和记住。在这里，每一座纪念碑都是一个人生。</p>

      {loading ? (
        <div className="empty-state"><div className="empty-icon">...</div><p>加载中</p></div>
      ) : monuments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">[]</div>
          <p>纪念碑谷还没有纪念碑</p>
          <p style={{ marginTop: '1rem' }}>
            <Link to="/register">注册</Link> 后上传第一座纪念碑
          </p>
        </div>
      ) : (
        <>
          <div className="monument-grid">
            {monuments.map(m => (
              <Link to={`/monument/${m.id}`} key={m.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="monument-card">
                  <div className="mc-title">{m.title}</div>
                  {m.subtitle && <div className="mc-subtitle">{m.subtitle}</div>}
                  <div className="mc-meta">
                    <span>{m.views} 次浏览</span>
                    {m.has_puzzle ? <span className="mc-lock">谜题守护</span> : <span>开放</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {pagination.pages > 1 && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              {page > 1 && <button className="btn-outline" onClick={() => setPage(page - 1)}>上一页</button>}
              <span style={{ margin: '0 1rem', color: 'var(--muted)' }}>{page} / {pagination.pages}</span>
              {page < pagination.pages && <button className="btn-outline" onClick={() => setPage(page + 1)}>下一页</button>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ========== 注册页 ==========
function RegisterPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    api.register(password).then(data => {
      api.setToken(data.token);
      localStorage.setItem('alias', data.alias);
      setSuccess(`注册成功！你的代号是：${data.alias}`);
      setTimeout(() => navigate('/'), 2000);
    }).catch(err => setError(err.message));
  };

  return (
    <div className="container" style={{ maxWidth: '400px' }}>
      <h1 className="page-title">注册</h1>
      <p className="page-subtitle">注册后你将获得一个随机匿名代号，不存储任何个人信息。</p>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>密码（至少6位）</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="设置密码" />
        </div>
        <button type="submit" className="btn-primary">注册</button>
      </form>
      <p style={{ marginTop: '1rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
        已有账号？<Link to="/login">登录</Link>
      </p>
    </div>
  );
}

// ========== 登录页 ==========
function LoginPage() {
  const [alias, setAlias] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    api.login(alias, password).then(data => {
      api.setToken(data.token);
      localStorage.setItem('alias', data.alias);
      navigate('/');
    }).catch(err => setError(err.message));
  };

  return (
    <div className="container" style={{ maxWidth: '400px' }}>
      <h1 className="page-title">登录</h1>
      <p className="page-subtitle">用你的匿名代号和密码登录。</p>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>代号</label>
          <input type="text" value={alias} onChange={e => setAlias(e.target.value)} placeholder="如：旅人#3F2A" />
        </div>
        <div className="form-group">
          <label>密码</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" />
        </div>
        <button type="submit" className="btn-primary">登录</button>
      </form>
      <p style={{ marginTop: '1rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
        没有账号？<Link to="/register">注册</Link>
      </p>
    </div>
  );
}

// ========== 上传纪念碑页 ==========
function UploadPage() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [puzzleQ, setPuzzleQ] = useState('');
  const [puzzleA, setPuzzleA] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('请选择 monument.json 文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('subtitle', subtitle);
    if (puzzleQ) formData.append('puzzleQuestion', puzzleQ);
    if (puzzleA) formData.append('puzzleAnswer', puzzleA);

    api.uploadMonument(formData).then(data => {
      setSuccess('纪念碑上传成功！');
      setTimeout(() => navigate(`/monument/${data.id}`), 1500);
    }).catch(err => setError(err.message));
  };

  return (
    <div className="container" style={{ maxWidth: '500px' }}>
      <h1 className="page-title">上传纪念碑</h1>
      <p className="page-subtitle">将本地生成的 monument.json 上传到纪念碑谷。原始聊天记录不会上传。</p>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>monument.json 文件</label>
          <input type="file" accept=".json" onChange={e => setFile(e.target.files[0])} />
        </div>
        <div className="form-group">
          <label>标题（可选）</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="一个人的纪念碑" />
        </div>
        <div className="form-group">
          <label>副标题（可选）</label>
          <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="一句话简介" />
        </div>
        <div className="form-group">
          <label>谜题问题（可选，设谜后需答题才能查看）</label>
          <input type="text" value={puzzleQ} onChange={e => setPuzzleQ(e.target.value)} placeholder="如：我最喜欢的一句话是？" />
        </div>
        <div className="form-group">
          <label>谜题答案</label>
          <input type="text" value={puzzleA} onChange={e => setPuzzleA(e.target.value)} placeholder="答案" />
        </div>
        <button type="submit" className="btn-primary">上传</button>
      </form>
    </div>
  );
}

// ========== 纪念碑详情页 ==========
function MonumentDetailPage() {
  const { id } = useParams();
  const [monument, setMonument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [comments, setComments] = useState([]);
  const [bottles, setBottles] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newBottle, setNewBottle] = useState('');
  const [tab, setTab] = useState('monument');

  const loadData = useCallback((ans) => {
    setLoading(true);
    api.getMonument(id, ans).then(data => {
      setMonument(data);
      setLoading(false);
      if (!data.locked) {
        api.getComments(id).then(setComments).catch(() => {});
        api.getBottles(id).then(setBottles).catch(() => {});
      }
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAnswer = (e) => {
    e.preventDefault();
    setError('');
    loadData(answer);
  };

  const handleComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    api.addComment(id, newComment).then(c => {
      setComments([c, ...comments]);
      setNewComment('');
    }).catch(err => setError(err.message));
  };

  const handleBottle = (e) => {
    e.preventDefault();
    if (!newBottle.trim()) return;
    api.addBottle(id, newBottle).then(() => {
      setNewBottle('');
      alert('漂流瓶已投递');
    }).catch(err => setError(err.message));
  };

  if (loading) {
    return <div className="container"><div className="empty-state"><p>加载中...</p></div></div>;
  }

  if (error && !monument) {
    return <div className="container"><div className="alert alert-error">{error}</div></div>;
  }

  // 谜题锁定状态
  if (monument?.locked) {
    return (
      <div className="container">
        <div className="monument-detail">
          <h1>{monument.title}</h1>
          {monument.subtitle && <p style={{ textAlign: 'center', color: 'var(--muted)' }}>{monument.subtitle}</p>}
          <div className="puzzle-box">
            <div className="puzzle-icon">[?]</div>
            <p>这座纪念碑被谜题守护</p>
            <div className="puzzle-question">{monument.puzzleQuestion}</div>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleAnswer} style={{ maxWidth: '400px', margin: '0 auto' }}>
              <input type="text" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="输入答案" />
              <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>解锁</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 解锁状态 - 展示完整纪念碑
  return (
    <div className="container">
      <div className="monument-detail">
        <h1>{monument.title}</h1>
        {monument.subtitle && <p style={{ textAlign: 'center', color: 'var(--muted)' }}>{monument.subtitle}</p>}

        {/* 标签切换 */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', margin: '2rem 0', borderBottom: '1px solid var(--rule)' }}>
          {['monument', 'comments', 'bottles'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none',
                color: tab === t ? 'var(--accent)' : 'var(--muted)',
                borderBottom: tab === t ? '2px solid var(--accent)' : 'none',
                padding: '0.5rem 1rem',
                borderRadius: 0
              }}
            >
              {t === 'monument' ? '纪念碑' : t === 'comments' ? `评论 (${comments.length})` : `漂流瓶 (${bottles.length})`}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* 纪念碑内容 */}
        {tab === 'monument' && (
          <div className="epitaph">
            {monument.content?.epitaph || monument.htmlContent || '（无内容）'}
          </div>
        )}

        {/* 评论 */}
        {tab === 'comments' && (
          <div>
            <form onSubmit={handleComment} style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
              <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="留下你的话..." />
              <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>发送</button>
            </form>
            {comments.length === 0 ? (
              <div className="empty-state"><p>还没有评论</p></div>
            ) : (
              comments.map(c => (
                <div className="comment-item" key={c.id}>
                  <div className="comment-author">{c.author_alias || '匿名'}</div>
                  <div className="comment-content">{c.content}</div>
                  <div className="comment-time">{new Date(c.created_at).toLocaleString('zh-CN')}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 漂流瓶 */}
        {tab === 'bottles' && (
          <div>
            <form onSubmit={handleBottle} style={{ marginBottom: '1.5rem' }}>
              <textarea
                value={newBottle}
                onChange={e => setNewBottle(e.target.value)}
                placeholder="写一个漂流瓶，投递给这座纪念碑..."
                rows="3"
                style={{ marginBottom: '0.5rem' }}
              />
              <button type="submit" className="btn-outline">投递漂流瓶</button>
            </form>
            {bottles.length === 0 ? (
              <div className="empty-state"><p>还没有漂流瓶</p></div>
            ) : (
              bottles.map(b => (
                <div className="bottle-item" key={b.id}>
                  <div style={{ color: 'var(--ink)', fontSize: '0.9rem' }}>{b.message}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
                    {new Date(b.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ========== 我的纪念碑 ==========
function MyMonumentsPage() {
  const [monuments, setMonuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getMyMonuments().then(data => {
      setMonuments(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleDelete = (id) => {
    if (!confirm('确定删除这座纪念碑？此操作不可撤销。')) return;
    api.deleteMonument(id).then(() => {
      setMonuments(monuments.filter(m => m.id !== id));
    }).catch(err => alert(err.message));
  };

  if (loading) return <div className="container"><p>加载中...</p></div>;

  return (
    <div className="container">
      <h1 className="page-title">我的纪念碑</h1>
      <p className="page-subtitle">管理你上传的纪念碑。</p>
      {monuments.length === 0 ? (
        <div className="empty-state">
          <p>你还没有上传纪念碑</p>
          <p style={{ marginTop: '1rem' }}><Link to="/upload">上传第一座</Link></p>
        </div>
      ) : (
        <div className="monument-grid">
          {monuments.map(m => (
            <div className="monument-card" key={m.id}>
              <div className="mc-title" onClick={() => navigate(`/monument/${m.id}`)} style={{ cursor: 'pointer' }}>{m.title}</div>
              <div className="mc-meta">
                <span>{m.views} 次浏览</span>
                {m.has_puzzle ? <span className="mc-lock">谜题守护</span> : <span>开放</span>}
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }} onClick={() => navigate(`/monument/${m.id}`)}>查看</button>
                <button className="btn-danger" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }} onClick={() => handleDelete(m.id)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== 主应用 ==========
function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/monument/:id" element={<MonumentDetailPage />} />
        <Route path="/my" element={<MyMonumentsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(<App />);
