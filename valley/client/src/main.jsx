import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api.js';
import { MonumentDetail } from './components/MonumentDetail/index.jsx';
import './styles.css';

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return <div className={`toast toast-${type}`}>{message}</div>;
}

function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  const ToastComponent = toast ? (
    <Toast message={toast.message} type={toast.type} onClose={hideToast} />
  ) : null;

  return { showToast, ToastComponent };
}

function PageWrapper({ children }) {
  const location = useLocation();
  const [key, setKey] = useState(location.pathname);

  useEffect(() => {
    setKey(location.pathname);
  }, [location.pathname]);

  return <div key={key} className="page-enter">{children}</div>;
}

function Navbar() {
  const [alias, setAlias] = useState(localStorage.getItem('alias'));
  const navigate = useNavigate();

  useEffect(() => {
    const handleStorage = () => setAlias(localStorage.getItem('alias'));
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
            <Link to="/profile" style={{ color: 'var(--accent2)', fontFamily: 'monospace' }}>{alias}</Link>
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

function HomePage() {
  const [monuments, setMonuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('latest');
  const [hasPuzzle, setHasPuzzle] = useState('');
  const [stats, setStats] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    setStatsLoading(true);
    api.getMonumentStats().then(data => {
      setStats(data);
      setStatsLoading(false);
    }).catch(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    setFeaturedLoading(true);
    api.getFeaturedMonuments(6).then(data => {
      setFeatured(data);
      setFeaturedLoading(false);
    }).catch(() => setFeaturedLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getMonuments({ page, search, sort, hasPuzzle }).then(data => {
      setMonuments(data.monuments || []);
      setPagination(data.pagination || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [page, search, sort, hasPuzzle]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setPage(1);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(value);
    }, 300);
  };

  const handleSortChange = (e) => {
    setPage(1);
    setSort(e.target.value);
  };

  const togglePuzzleFilter = (value) => {
    setPage(1);
    setHasPuzzle(hasPuzzle === value ? '' : value);
  };

  return (
    <div className="container">
      {ToastComponent}
      <h1 className="page-title">纪念碑谷</h1>
      <p className="page-subtitle">人永远都值得被记得和记住。在这里，每一座纪念碑都是一个人生。</p>

      {!statsLoading && stats && (
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-num">{stats.totalMonuments}</div>
            <div className="stat-label">纪念碑</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{stats.totalViews}</div>
            <div className="stat-label">总浏览</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{stats.totalLikes}</div>
            <div className="stat-label">总点赞</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{stats.totalUsers}</div>
            <div className="stat-label">旅人</div>
          </div>
        </div>
      )}

      {!featuredLoading && featured.length > 0 && (
        <div className="featured-section">
          <div className="featured-title">精选纪念碑</div>
          <div className="monument-grid">
            {featured.map(m => (
              <Link to={`/monument/${m.id}`} key={m.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="monument-card">
                  <div className="mc-title">{m.title}</div>
                  {m.subtitle && <div className="mc-subtitle">{m.subtitle}</div>}
                  <div className="mc-meta">
                    <span>{m.views} 浏览</span>
                    <span className="mc-likes">♥ {m.likes || 0}</span>
                    {m.has_puzzle ? <span className="mc-lock">谜题</span> : <span>开放</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="search-bar">
        <input
          type="text"
          placeholder="搜索纪念碑标题..."
          onChange={handleSearchChange}
          defaultValue={search}
        />
        <select className="sort-select" value={sort} onChange={handleSortChange}>
          <option value="latest">最新发布</option>
          <option value="views">最多浏览</option>
          <option value="likes">最多点赞</option>
          <option value="random">随机发现</option>
        </select>
      </div>

      <div className="filter-tags">
        <button
          className={`filter-tag ${hasPuzzle === '' ? 'active' : ''}`}
          onClick={() => togglePuzzleFilter('')}
        >
          全部
        </button>
        <button
          className={`filter-tag ${hasPuzzle === '0' ? 'active' : ''}`}
          onClick={() => togglePuzzleFilter('0')}
        >
          开放浏览
        </button>
        <button
          className={`filter-tag ${hasPuzzle === '1' ? 'active' : ''}`}
          onClick={() => togglePuzzleFilter('1')}
        >
          有谜题
        </button>
      </div>

      {loading ? (
        <div className="loading-wrapper">
          <div className="loader"></div>
          <p>加载中...</p>
        </div>
      ) : monuments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◇</div>
          <p>{search ? '没有找到匹配的纪念碑' : '纪念碑谷还没有纪念碑'}</p>
          <p style={{ marginTop: '1rem' }}>
            {search ? '试试其他关键词' : (
              <Link to="/register">注册</Link>
            )}
            {!search && ' 后上传第一座纪念碑'}
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
                    <span>{m.views} 浏览</span>
                    <span className="mc-likes">♥ {m.likes || 0}</span>
                    {m.has_puzzle ? <span className="mc-lock">谜题</span> : <span>开放</span>}
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

function RegisterPage() {
  const [password, setPassword] = useState('');
  const [alias, setAlias] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    api.register(password, alias || undefined).then(data => {
      api.setToken(data.token);
      localStorage.setItem('alias', data.alias);
      setSuccess(`注册成功！你的代号是：${data.alias}`);
      setTimeout(() => navigate('/'), 2000);
    }).catch(err => setError(err.message));
  };

  return (
    <div className="container" style={{ maxWidth: '400px' }}>
      <h1 className="page-title">注册</h1>
      <p className="page-subtitle">注册后你将获得一个匿名代号，不存储任何个人信息。</p>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>别名（可选，2-20位，不填则随机生成）</label>
          <input
            type="text"
            value={alias}
            onChange={e => setAlias(e.target.value)}
            placeholder="如：行走的风"
            maxLength={20}
          />
        </div>
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

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alias, setAlias] = useState('');
  const [aliasEditing, setAliasEditing] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!api.getToken()) {
      navigate('/login');
      return;
    }
    api.getMe().then(data => {
      setUser(data);
      setAlias(data.alias);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      navigate('/login');
    });
  }, [navigate]);

  const handleUpdateAlias = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    api.updateAlias(alias).then(data => {
      localStorage.setItem('alias', data.alias);
      setUser({ ...user, alias: data.alias });
      setAliasEditing(false);
      showToast('别名修改成功', 'success');
    }).catch(err => setError(err.message));
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }
    api.updatePassword(oldPassword, newPassword).then(() => {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('密码修改成功', 'success');
    }).catch(err => setError(err.message));
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading-wrapper">
          <div className="loader"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '500px' }}>
      {ToastComponent}
      <h1 className="page-title">个人资料</h1>
      <p className="page-subtitle">管理你的账号信息。</p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="profile-section">
        <h3>基本信息</h3>
        {aliasEditing ? (
          <form onSubmit={handleUpdateAlias}>
            <div className="form-group">
              <label>别名</label>
              <input
                type="text"
                value={alias}
                onChange={e => setAlias(e.target.value)}
                maxLength={20}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn-primary">保存</button>
              <button type="button" className="btn-outline" onClick={() => { setAliasEditing(false); setAlias(user.alias); }}>取消</button>
            </div>
          </form>
        ) : (
          <>
            <div className="profile-info">
              <span className="profile-info-label">别名</span>
              <span className="profile-info-value">{user.alias}</span>
            </div>
            <div className="profile-info" style={{ marginTop: '0.5rem' }}>
              <span className="profile-info-label">注册时间</span>
              <span className="profile-info-value">{new Date(user.created_at).toLocaleDateString('zh-CN')}</span>
            </div>
            <button className="btn-outline" style={{ marginTop: '1rem' }} onClick={() => setAliasEditing(true)}>
              修改别名
            </button>
          </>
        )}
      </div>

      <div className="profile-section">
        <h3>修改密码</h3>
        <form onSubmit={handleUpdatePassword}>
          <div className="form-group">
            <label>原密码</label>
            <input
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              placeholder="输入原密码"
            />
          </div>
          <div className="form-group">
            <label>新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="至少6位"
            />
          </div>
          <div className="form-group">
            <label>确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
            />
          </div>
          <button type="submit" className="btn-primary">修改密码</button>
        </form>
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link to="/my">查看我的纪念碑 →</Link>
      </div>
    </div>
  );
}

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

function ShareModal({ monument, onClose }) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  const shareUrl = `${window.location.origin}/monument/${monument.id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      api.shareMonument(monument.id).catch(() => {});
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      api.shareMonument(monument.id).catch(() => {});
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const width = 600;
    const height = 314;
    canvas.width = width;
    canvas.height = height;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a0a0f');
    gradient.addColorStop(1, '#15151f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const glowGrad = ctx.createRadialGradient(width / 2, 0, 0, width / 2, 0, width);
    glowGrad.addColorStop(0, 'rgba(212, 165, 116, 0.1)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#d4a574';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('纪念碑谷', width / 2, 50);

    ctx.fillStyle = '#e8e4d8';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.textAlign = 'center';
    const title = monument.title || '一个人的纪念碑';
    const maxWidth = 500;
    let displayTitle = title;
    if (ctx.measureText(title).width > maxWidth) {
      let truncated = title;
      while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
      }
      displayTitle = truncated + '...';
    }
    ctx.fillText(displayTitle, width / 2, 110);

    if (monument.subtitle) {
      ctx.fillStyle = '#8a8580';
      ctx.font = '16px Georgia, serif';
      let subtitle = monument.subtitle;
      if (ctx.measureText(subtitle).width > 450) {
        let truncated = subtitle;
        while (ctx.measureText(truncated + '...').width > 450 && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        subtitle = truncated + '...';
      }
      ctx.fillText(subtitle, width / 2, 145);
    }

    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 30, 170);
    ctx.lineTo(width / 2 + 30, 170);
    ctx.stroke();

    ctx.fillStyle = '#8a8580';
    ctx.font = '14px monospace';
    ctx.fillText(`${monument.views || 0} 次浏览  ·  ${monument.likes || 0} 次点赞`, width / 2, 200);

    if (monument.has_puzzle || monument.puzzleQuestion) {
      ctx.fillStyle = '#d4a574';
      ctx.font = '14px monospace';
      ctx.fillText('❓ 谜题守护', width / 2, 230);
    }

    ctx.fillStyle = '#5fb8a8';
    ctx.font = 'italic 13px Georgia, serif';
    ctx.fillText('人永远都值得被记得和记住', width / 2, height - 30);

    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  }, [monument]);

  const downloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `monument-${monument.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    api.shareMonument(monument.id).catch(() => {});
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 className="modal-title">分享纪念碑</h2>

        <div className="share-link-box">
          <input type="text" value={shareUrl} readOnly />
          <button className="btn-primary" onClick={copyLink}>
            {copied ? '已复制' : '复制链接'}
          </button>
        </div>

        <canvas ref={canvasRef} className="share-card-canvas" />

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button className="btn-outline" onClick={downloadCard}>
            下载分享卡片
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const { showToast, ToastComponent } = useToast();

  const loadData = useCallback((ans) => {
    setLoading(true);
    api.getMonument(id, ans).then(data => {
      setMonument(data);
      setLikeCount(data.likes || 0);
      setLoading(false);
      if (!data.locked) {
        api.getComments(id).then(setComments).catch(() => {});
        api.getBottles(id).then(setBottles).catch(() => {});
        api.getLikeStatus(id).then(likeData => {
          setLiked(likeData.liked);
          setLikeCount(likeData.likes);
        }).catch(() => {});
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
      showToast('漂流瓶已投递', 'success');
    }).catch(err => setError(err.message));
  };

  const handleLike = () => {
    if (!api.getToken()) {
      const localLikes = JSON.parse(localStorage.getItem('liked_monuments') || '[]');
      const isLiked = localLikes.includes(Number(id));
      if (isLiked) {
        const filtered = localLikes.filter(x => x !== Number(id));
        localStorage.setItem('liked_monuments', JSON.stringify(filtered));
        setLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        localLikes.push(Number(id));
        localStorage.setItem('liked_monuments', JSON.stringify(localLikes));
        setLiked(true);
        setLikeCount(prev => prev + 1);
      }
      api.toggleLike(id).then(data => {
        setLiked(data.liked);
        setLikeCount(data.likes);
      }).catch(() => {});
    } else {
      api.toggleLike(id).then(data => {
        setLiked(data.liked);
        setLikeCount(data.likes);
      }).catch(err => showToast(err.message, 'error'));
    }
  };

  const handleShare = () => {
    setShowShare(true);
  };

  useEffect(() => {
    if (!api.getToken() && monument && !monument.locked) {
      const localLikes = JSON.parse(localStorage.getItem('liked_monuments') || '[]');
      if (localLikes.includes(Number(id))) {
        setLiked(true);
      }
    }
  }, [id, monument]);

  if (loading) {
    return (
      <div className="container">
        <div className="loading-wrapper">
          <div className="loader"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (error && !monument) {
    return <div className="container"><div className="alert alert-error">{error}</div></div>;
  }

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

  return (
    <div className="container">
      {ToastComponent}
      {showShare && monument && (
        <ShareModal monument={monument} onClose={() => setShowShare(false)} />
      )}
      <div className="monument-detail">
        <h1>{monument.title}</h1>
        {monument.subtitle && <p style={{ textAlign: 'center', color: 'var(--muted)' }}>{monument.subtitle}</p>}

        <div className="action-bar">
          <button className={`like-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
            ♥ {liked ? '已点赞' : '点赞'} ({likeCount})
          </button>
          <button className="share-btn" onClick={handleShare}>
            ↗ 分享 ({monument.shares || 0})
          </button>
          <span style={{ color: 'var(--muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
            👁 {monument.views} 次浏览
          </span>
        </div>

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

        {tab === 'monument' && (
          <div className="md-content-wrapper">
            <MonumentDetail content={monument.content} />
          </div>
        )}

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

function MyMonumentsPage() {
  const [monuments, setMonuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (!api.getToken()) {
      navigate('/login');
      return;
    }
    api.getMyMonuments().then(data => {
      setMonuments(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [navigate]);

  const handleDelete = (id) => {
    if (!confirm('确定删除这座纪念碑？此操作不可撤销。')) return;
    api.deleteMonument(id).then(() => {
      setMonuments(monuments.filter(m => m.id !== id));
      showToast('删除成功', 'success');
    }).catch(err => showToast(err.message, 'error'));
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading-wrapper">
          <div className="loader"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {ToastComponent}
      <h1 className="page-title">我的纪念碑</h1>
      <p className="page-subtitle">管理你上传的纪念碑。</p>
      {monuments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◇</div>
          <p>你还没有上传纪念碑</p>
          <p style={{ marginTop: '1rem' }}><Link to="/upload">上传第一座</Link></p>
        </div>
      ) : (
        <div className="monument-grid">
          {monuments.map(m => (
            <div className="monument-card" key={m.id}>
              <div className="mc-title" onClick={() => navigate(`/monument/${m.id}`)} style={{ cursor: 'pointer' }}>{m.title}</div>
              <div className="mc-meta">
                <span>{m.views} 浏览</span>
                <span className="mc-likes">♥ {m.likes || 0}</span>
                {m.has_puzzle ? <span className="mc-lock">谜题</span> : <span>开放</span>}
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

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
        <Route path="/register" element={<PageWrapper><RegisterPage /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
        <Route path="/profile" element={<PageWrapper><ProfilePage /></PageWrapper>} />
        <Route path="/upload" element={<PageWrapper><UploadPage /></PageWrapper>} />
        <Route path="/monument/:id" element={<PageWrapper><MonumentDetailPage /></PageWrapper>} />
        <Route path="/my" element={<PageWrapper><MyMonumentsPage /></PageWrapper>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(<App />);
