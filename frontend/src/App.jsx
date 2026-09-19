import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const defaultCoords = { latitude: 28.7041, longitude: 77.1025 };
const initialOrderForm = {
  shopId: '', documentName: '', numberOfCopies: 1, colorMode: 'BW', sides: 'single',
  paperSize: 'A4', paperType: 'normal', binding: 'none', lamination: false, specialRequirements: '',
};
const statuses = ['placed', 'accepted', 'processing', 'ready', 'completed'];

function App() {
  const [view, setView] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('quickprint-theme') === 'dark');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: 'demo@quickprint.app', password: 'demo123', role: 'customer' });
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('quickprint-user') || 'null'));
  const [shops, setShops] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [orderForm, setOrderForm] = useState(initialOrderForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');

  const selectedShop = shops.find((shop) => shop.id === selectedShopId) || shops[0];
  const estimatedPrice = useMemo(() => {
    if (!selectedShop) return 0;
    const copies = Number(orderForm.numberOfCopies) || 1;
    const pricing = selectedShop.pricing;
    let total = copies * (orderForm.colorMode === 'Color' ? pricing.colorPerPage : pricing.bwPerPage);
    if (orderForm.paperSize === 'A3') total += copies * pricing.a3Surcharge;
    if (orderForm.paperType === 'glossy') total += copies * pricing.glossySurcharge;
    if (orderForm.paperType === 'matte') total += copies * pricing.matteSurcharge;
    total += { spiral: pricing.spiralCost, comb: pricing.combCost, staple: 15, none: 0 }[orderForm.binding] || 0;
    if (orderForm.lamination) total += copies * pricing.laminationPerPage;
    if (orderForm.specialRequirements.toLowerCase().includes('urgent')) total *= 1.2;
    return Number(total.toFixed(2));
  }, [orderForm, selectedShop]);

  useEffect(() => { fetchNearbyShops(); }, []);
  useEffect(() => { if (user) fetchOrders(user.id); }, [user]);
  useEffect(() => { if (!message) return undefined; const timer = setTimeout(() => setMessage(''), 3500); return () => clearTimeout(timer); }, [message]);
  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); localStorage.setItem('quickprint-theme', darkMode ? 'dark' : 'light'); }, [darkMode]);

  const notify = (text) => setMessage(text);
  const getLocation = () => new Promise((resolve) => navigator.geolocation?.getCurrentPosition(
    (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
    () => resolve(defaultCoords)
  ) || resolve(defaultCoords));

  async function fetchNearbyShops() {
    setLoading(true);
    try {
      const coords = await getLocation();
      const response = await fetch(`${API_URL}/api/shops/nearby?latitude=${coords.latitude}&longitude=${coords.longitude}&radius=10`);
      const data = await response.json();
      setShops(data.shops || []);
      if (data.shops?.[0]) setSelectedShopId(data.shops[0].id);
    } catch { notify('Could not load shops. Is the backend running?'); }
    finally { setLoading(false); }
  }

  async function fetchOrders(customerId = user?.id) {
    if (!customerId) return;
    try { const response = await fetch(`${API_URL}/api/orders?customerId=${customerId}`); const data = await response.json(); setOrders(data.orders || []); }
    catch { notify('Could not refresh orders.'); }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault(); setAuthLoading(true);
    const endpoint = authMode === 'login' ? 'login' : 'register';
    const payload = authMode === 'login' ? { email: authForm.email, password: authForm.password, role: authForm.role } : authForm;
    try {
      const response = await fetch(`${API_URL}/api/auth/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Authentication failed');
      setUser(data.user); localStorage.setItem('quickprint-user', JSON.stringify(data.user)); localStorage.setItem('quickprint-token', data.token); notify(`${authMode === 'login' ? 'Welcome back' : 'Account created'}, ${data.user.name}!`);
    } catch (error) { notify(error.message); } finally { setAuthLoading(false); }
  }

  async function handleOrderSubmit(event) {
    event.preventDefault();
    if (!user) { notify('Please log in before placing an order.'); setView('login'); return; }
    if (!selectedShopId) { notify('Select a shop first.'); setView('shops'); return; }
    try {
      const response = await fetch(`${API_URL}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: user.id, ...orderForm, shopId: selectedShopId, documentName: orderForm.documentName || selectedFile?.name || 'uploaded-document.pdf', numberOfCopies: Number(orderForm.numberOfCopies) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Order could not be placed.');
      setOrders((current) => [data.order, ...current.filter((order) => order.id !== data.order.id)]);
      setOrderForm({ ...initialOrderForm, shopId: selectedShopId }); setSelectedFile(null); notify(`Order ${data.order.id} placed successfully.`); setView('tracking');
    } catch (error) { notify(error.message); }
  }

  function selectShop(shop) { setSelectedShopId(shop.id); setOrderForm((current) => ({ ...current, shopId: shop.id })); notify(`${shop.name} selected.`); setView('home'); }
  function logout() { setUser(null); setOrders([]); localStorage.removeItem('quickprint-user'); localStorage.removeItem('quickprint-token'); notify('Logged out.'); }
  function navigate(nextView) { setView(nextView); setMenuOpen(false); }
  const strength = authForm.password.length >= 10 ? 'Strong' : authForm.password.length >= 6 ? 'Medium' : 'Weak';
  const filteredOrders = historyFilter === 'all' ? orders : orders.filter((order) => order.status === historyFilter);

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => navigate('home')} aria-label="QuickPrint home"><span className="brand-mark">Q</span><span><b>QuickPrint</b><small>Print smarter. Live better.</small></span></button>
      <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}>☰</button>
      <nav className={menuOpen ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">
        {[['home', 'Home'], ['shops', 'Shops'], ['tracking', 'Tracking'], ['history', 'Order history'], ['dashboard', 'Dashboard']].map(([key, label]) => <button key={key} className={view === key ? 'nav-link active' : 'nav-link'} onClick={() => navigate(key)}>{label}</button>)}
        <button className="theme-button" onClick={() => setDarkMode(!darkMode)} aria-label="Toggle dark mode">{darkMode ? '☀️' : '🌙'}</button>
        {user ? <><span className="session-name">Hi, {user.name}</span><button className="secondary-btn" onClick={logout}>Logout</button></> : <button className="primary-btn nav-cta" onClick={() => navigate('login')}>Sign in</button>}
      </nav>
    </header>

    <main className="page-transition" key={view}>
      {view === 'login' && <Login user={user} mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} loading={authLoading} strength={strength} submit={handleAuthSubmit} />}
      {view === 'home' && <Home user={user} form={orderForm} setForm={setOrderForm} file={selectedFile} setFile={setSelectedFile} shop={selectedShop} price={estimatedPrice} submit={handleOrderSubmit} navigate={navigate} />}
      {view === 'shops' && <Shops shops={shops} loading={loading} selectedId={selectedShopId} select={selectShop} />}
      {view === 'tracking' && <Tracking orders={orders} />}
      {view === 'history' && <History orders={filteredOrders} filter={historyFilter} setFilter={setHistoryFilter} />}
      {view === 'dashboard' && <Dashboard user={user} orders={orders} navigate={navigate} />}
    </main>
    {message && <div className="toast" role="status" aria-live="polite"><span>✓</span>{message}<button onClick={() => setMessage('')} aria-label="Dismiss notification">×</button></div>}
  </div>;
}

function Login({ user, mode, setMode, form, setForm, loading, strength, submit }) {
  return <section className="auth-page"><div className="auth-copy"><span className="eyebrow">Your neighborhood print network</span><h1>Skip the queue.<br /><span>Print with ease.</span></h1><p>Upload your document, compare nearby shops, and collect it when it is ready.</p><div className="feature-list"><span>✓ Transparent pricing</span><span>✓ Real-time tracking</span><span>✓ Local shops, one app</span></div></div><div className="panel auth-card"><h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2><p className="muted">{mode === 'login' ? 'Sign in to continue your print journey.' : 'Join QuickPrint in less than a minute.'}</p><div className="toggle-row"><button className={mode === 'login' ? 'toggle active' : 'toggle'} onClick={() => setMode('login')}>Login</button><button className={mode === 'register' ? 'toggle active' : 'toggle'} onClick={() => setMode('register')}>Register</button></div><form onSubmit={submit} className="stack-form">{mode === 'register' && <input aria-label="Full name" required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}<input aria-label="Email" required type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><input aria-label="Password" required minLength="6" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />{(mode === 'register' || form.password) && <div className={`strength ${strength.toLowerCase()}`}><span>Password strength: {strength}</span><i /></div>}<select aria-label="Account type" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="customer">Customer</option><option value="shop_owner">Shop owner</option></select><button className="primary-btn" disabled={loading}>{loading ? <><span className="spinner" /> Signing in…</> : mode === 'login' ? 'Sign in' : 'Create account'}</button></form>{user && <p className="muted">Signed in as {user.name}</p>}</div></section>;
}

function Home({ user, form, setForm, file, setFile, shop, price, submit, navigate }) {
  const update = (key, value) => setForm({ ...form, [key]: value });
  return <section className="home-page"><div className="hero"><div><span className="eyebrow">Fast, simple, local</span><h1>Make printing<br /><span>the easy part.</span></h1><p>Upload once. Choose your shop. Pick up on your time.</p><button className="primary-btn" onClick={() => document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth' })}>Start an order <span>→</span></button></div><div className="hero-art" aria-hidden="true"><div className="paper-card">📄<strong>Your print<br />is ready!</strong><small>QuickPrint · 2 min ago</small></div><div className="floating-dot">✓</div></div></div><div className="steps"><span className="current"><b>1</b> Upload</span><i /><span><b>2</b> Choose shop</span><i /><span><b>3</b> Collect</span></div><form id="order-form" className="panel order-builder" onSubmit={submit}><div className="section-heading"><div><span className="eyebrow">Step 1 of 3</span><h2>Tell us what to print</h2></div><span className="required-note">* Required</span></div><label className="dropzone"><input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => { const picked = e.target.files?.[0]; setFile(picked); if (picked) update('documentName', picked.name); }} /><span className="upload-icon">↑</span><strong>{file ? file.name : 'Drop your document here'}</strong><small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ready to print` : 'PDF, DOCX, JPG or PNG · max 10 MB'}</small></label><div className="form-grid"><label>Number of copies<input type="number" min="1" max="1000" value={form.numberOfCopies} onChange={(e) => update('numberOfCopies', e.target.value)} /></label><label>Color mode<select value={form.colorMode} onChange={(e) => update('colorMode', e.target.value)}><option value="BW">Black & white</option><option value="Color">Color</option></select></label><label>Paper size<select value={form.paperSize} onChange={(e) => update('paperSize', e.target.value)}><option>A4</option><option>A3</option><option>Legal</option></select></label><label>Sides<select value={form.sides} onChange={(e) => update('sides', e.target.value)}><option value="single">Single-sided</option><option value="double">Double-sided</option></select></label><label>Paper type<select value={form.paperType} onChange={(e) => update('paperType', e.target.value)}><option value="normal">Normal</option><option value="glossy">Glossy</option><option value="matte">Matte</option></select></label><label>Binding<select value={form.binding} onChange={(e) => update('binding', e.target.value)}><option value="none">None</option><option value="spiral">Spiral</option><option value="comb">Comb</option><option value="staple">Staple</option></select></label><label className="check-label"><input type="checkbox" checked={form.lamination} onChange={(e) => update('lamination', e.target.checked)} /> Add lamination</label><label className="full-span">Special requirements<textarea rows="2" placeholder="Any instructions? (optional)" value={form.specialRequirements} onChange={(e) => update('specialRequirements', e.target.value)} /></label></div><div className="order-footer"><div><small>Estimated total</small><strong className="price-pop">₹{price}</strong>{shop && <span className="muted">at {shop.name}</span>}</div><button type="button" className="secondary-btn" onClick={() => navigate('shops')}>Choose a shop</button><button className="primary-btn" type="submit">Place order <span>→</span></button></div></form></section>;
}

function Shops({ shops, loading, selectedId, select }) { return <section className="content-page"><div className="page-heading"><div><span className="eyebrow">Step 2 of 3</span><h1>Find your print shop</h1><p>Compare transparent prices from trusted shops near you.</p></div><div className="map-placeholder" aria-label="Shop map"><span>⌖</span><small>Nearby shops</small>{shops.slice(0, 4).map((shop, i) => <i key={shop.id} className={`map-pin pin-${i + 1} ${selectedId === shop.id ? 'pin-selected' : ''}`}>●</i>)}</div></div><div className="shop-grid">{loading ? [1, 2, 3].map((i) => <div className="shop-card skeleton-card" key={i}><div className="skeleton" /><div className="skeleton short" /><div className="skeleton" /></div>) : shops.map((shop) => <article className={selectedId === shop.id ? 'shop-card selected' : 'shop-card'} key={shop.id}><div className="shop-avatar">{shop.name.charAt(0)}</div><div className="shop-info"><div className="shop-title"><h3>{shop.name}</h3><span>★ {shop.rating}</span></div><p>{shop.address}</p><small>Open {shop.openingTime} – {shop.closingTime} · {shop.distanceKm} km away</small><div className="shop-bottom"><strong>From ₹{shop.estimatedPrice}</strong><button className="primary-btn small-btn" onClick={() => select(shop)}>{selectedId === shop.id ? 'Selected ✓' : 'Select shop'}</button></div></div></article>)}</div></section>; }

function Tracking({ orders }) { return <section className="content-page"><div className="page-heading"><div><span className="eyebrow">Step 3 of 3</span><h1>Track your orders</h1><p>We will keep you posted from counter to collection.</p></div></div>{orders.length ? <div className="tracking-grid">{orders.map((order) => { const active = Math.max(0, statuses.indexOf(order.status)); return <article className="panel tracking-card" key={order.id}><div className="order-row"><div><span className="eyebrow">{order.id}</span><h2>{order.shopName}</h2></div><span className="status-pill">{order.status}</span></div><p className="muted">{order.documentName} · {order.numberOfCopies} copies · ₹{order.totalCost}</p><div className="progress-track">{statuses.map((status, index) => <div className={index <= active ? 'progress-step done' : 'progress-step'} key={status}><span>{index <= active ? '✓' : index + 1}</span><small>{status}</small></div>)}</div><div className="eta"><span>⏱ Estimated completion</span><strong>{order.estimatedCompletionTime || '45 mins'}</strong></div></article>; })}</div> : <Empty title="No active orders" text="Place your first order to see live tracking here." />}</section>; }

function History({ orders, filter, setFilter }) { return <section className="content-page"><div className="page-heading"><div><span className="eyebrow">Your activity</span><h1>Order history</h1><p>Every print job, all in one place.</p></div><select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All orders</option>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>{orders.length ? <div className="history-list">{orders.map((order) => <article className="panel history-row" key={order.id}><div className="history-icon">▤</div><div><strong>{order.id}</strong><p>{order.shopName} · {order.documentName}</p><small>{new Date(order.createdAt).toLocaleString()}</small></div><span className="status-pill">{order.status}</span><strong>₹{order.totalCost}</strong></article>)}</div> : <Empty title="No matching orders" text="Your completed and active orders will appear here." />}</section>; }

function Dashboard({ user, orders, navigate }) { const name = user?.name || 'there'; return <section className="content-page"><div className="dashboard-heading"><div><span className="eyebrow">Your workspace</span><h1>Good to see you, {name}!</h1><p>Manage your printing journey from one simple dashboard.</p></div><button className="primary-btn" onClick={() => navigate('home')}>＋ New order</button></div><div className="stat-grid"><div className="stat-card"><span>Total orders</span><strong>{orders.length}</strong><small>All time</small></div><div className="stat-card"><span>Active orders</span><strong>{orders.filter((o) => !['completed', 'cancelled'].includes(o.status)).length}</strong><small>In progress</small></div><div className="stat-card"><span>Total spent</span><strong>₹{orders.reduce((sum, o) => sum + Number(o.totalCost || 0), 0).toFixed(0)}</strong><small>Across all shops</small></div></div><div className="quick-actions panel"><h2>Quick actions</h2><button onClick={() => navigate('home')}>📄 Start a new print order <span>→</span></button><button onClick={() => navigate('shops')}>⌖ Explore nearby shops <span>→</span></button><button onClick={() => navigate('history')}>▤ View order history <span>→</span></button></div></section>; }

function Empty({ title, text }) { return <div className="empty-state panel"><div>✦</div><h2>{title}</h2><p>{text}</p></div>; }
export default App;
