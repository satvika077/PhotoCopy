import { useEffect, useMemo, useState } from 'react';

const API_URL = 'http://localhost:5000';
const defaultCoords = { latitude: 28.7041, longitude: 77.1025 };
const initialOrderForm = {
  shopId: '',
  documentName: 'assignment.pdf',
  numberOfCopies: 20,
  colorMode: 'BW',
  sides: 'single',
  paperSize: 'A4',
  paperType: 'normal',
  binding: 'none',
  lamination: false,
  specialRequirements: 'Urgent deliver by evening',
};

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: 'demo@quickprint.app', password: 'demo123', role: 'customer' });
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('quickprint-user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('quickprint-token') || '');
  const [shops, setShops] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [orderForm, setOrderForm] = useState(initialOrderForm);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedShop = useMemo(
    () => shops.find((shop) => shop.id === selectedShopId) || shops[0],
    [selectedShopId, shops]
  );

  useEffect(() => {
    fetchNearbyShops();
  }, []);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchNearbyShops = async () => {
    setLoading(true);
    const coords = await getCurrentLocation();
    const response = await fetch(
      `${API_URL}/api/shops/nearby?latitude=${coords.latitude}&longitude=${coords.longitude}&radius=10`
    );
    const data = await response.json();
    setShops(data.shops || []);
    if (data.shops?.[0]) setSelectedShopId(data.shops[0].id);
    setLoading(false);
  };

  const fetchOrders = async () => {
    if (!user) return;
    const response = await fetch(`${API_URL}/api/orders?customerId=${user.id}`);
    const data = await response.json();
    setOrders(data.orders || []);
  };

  const getCurrentLocation = () =>
    new Promise((resolve) => {
      navigator.geolocation?.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => resolve(defaultCoords)
      );
    });

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    const url = `${API_URL}/api/auth/${authMode === 'login' ? 'login' : 'register'}`;
    const payload =
      authMode === 'login'
        ? { email: authForm.email, password: authForm.password, role: authForm.role }
        : { name: authForm.name, email: authForm.email, password: authForm.password, role: authForm.role };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || 'Authentication failed');
      return;
    }

    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('quickprint-user', JSON.stringify(data.user));
    localStorage.setItem('quickprint-token', data.token);
    setMessage(`${authMode === 'login' ? 'Logged in' : 'Account created'} successfully.`);
  };

  const handleOrderSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      setMessage('Please log in before placing an order.');
      return;
    }

    const payload = {
      customerId: user.id,
      shopId: selectedShopId,
      ...orderForm,
      numberOfCopies: Number(orderForm.numberOfCopies),
      lamination: Boolean(orderForm.lamination),
    };

    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || 'Order could not be placed.');
      return;
    }

    setMessage(`Order ${data.order.id} placed successfully.`);
    setOrderForm({ ...initialOrderForm, shopId: selectedShopId });
    fetchOrders();
  };

  const handleLogout = () => {
    localStorage.removeItem('quickprint-user');
    localStorage.removeItem('quickprint-token');
    setUser(null);
    setToken('');
    setMessage('Logged out.');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">MVP Demo</p>
          <h1>QuickPrint</h1>
        </div>
        <div className="topbar-actions">
          {user ? (
            <>
              <span>{user.name}</span>
              <button className="secondary-btn" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <span>Customer Login</span>
          )}
        </div>
      </header>

      <main className="content-grid">
        <section className="panel auth-panel">
          <h2>{authMode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <div className="toggle-row">
            <button className={authMode === 'login' ? 'toggle active' : 'toggle'} onClick={() => setAuthMode('login')}>
              Login
            </button>
            <button className={authMode === 'register' ? 'toggle active' : 'toggle'} onClick={() => setAuthMode('register')}>
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="stack-form">
            {authMode === 'register' && (
              <input
                type="text"
                placeholder="Full name"
                value={authForm.name}
                onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
            />
            <select value={authForm.role} onChange={(event) => setAuthForm({ ...authForm, role: event.target.value })}>
              <option value="customer">Customer</option>
              <option value="shop_owner">Shop Owner</option>
            </select>
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>
        </section>

        <section className="panel shop-panel">
          <h2>Nearby shops</h2>
          {loading ? <p>Loading shops...</p> : null}
          <div className="shop-list">
            {shops.map((shop) => (
              <button
                key={shop.id}
                className={selectedShopId === shop.id ? 'shop-card selected' : 'shop-card'}
                onClick={() => setSelectedShopId(shop.id)}
              >
                <div className="shop-row">
                  <strong>{shop.name}</strong>
                  <span>⭐ {shop.rating}</span>
                </div>
                <p>{shop.address}</p>
                <div className="shop-row">
                  <span>{shop.distanceKm} km away</span>
                  <span>₹{shop.estimatedPrice}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="panel order-panel">
          <h2>Place order</h2>
          <form onSubmit={handleOrderSubmit} className="stack-form form-grid">
            <label>
              Document name
              <input
                type="text"
                value={orderForm.documentName}
                onChange={(event) => setOrderForm({ ...orderForm, documentName: event.target.value })}
              />
            </label>
            <label>
              Copies
              <input
                type="number"
                min="1"
                value={orderForm.numberOfCopies}
                onChange={(event) => setOrderForm({ ...orderForm, numberOfCopies: event.target.value })}
              />
            </label>
            <label>
              Color mode
              <select value={orderForm.colorMode} onChange={(event) => setOrderForm({ ...orderForm, colorMode: event.target.value })}>
                <option value="BW">B&W</option>
                <option value="Color">Color</option>
              </select>
            </label>
            <label>
              Sides
              <select value={orderForm.sides} onChange={(event) => setOrderForm({ ...orderForm, sides: event.target.value })}>
                <option value="single">Single</option>
                <option value="double">Double</option>
              </select>
            </label>
            <label>
              Paper size
              <select value={orderForm.paperSize} onChange={(event) => setOrderForm({ ...orderForm, paperSize: event.target.value })}>
                <option value="A4">A4</option>
                <option value="A3">A3</option>
                <option value="Legal">Legal</option>
              </select>
            </label>
            <label>
              Paper type
              <select value={orderForm.paperType} onChange={(event) => setOrderForm({ ...orderForm, paperType: event.target.value })}>
                <option value="normal">Normal</option>
                <option value="glossy">Glossy</option>
                <option value="matte">Matte</option>
              </select>
            </label>
            <label>
              Binding
              <select value={orderForm.binding} onChange={(event) => setOrderForm({ ...orderForm, binding: event.target.value })}>
                <option value="none">None</option>
                <option value="spiral">Spiral</option>
                <option value="comb">Comb</option>
                <option value="staple">Staple</option>
              </select>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={orderForm.lamination}
                onChange={(event) => setOrderForm({ ...orderForm, lamination: event.target.checked })}
              />
              Lamination
            </label>
            <label className="full-span">
              Special requirements
              <textarea
                rows="3"
                value={orderForm.specialRequirements}
                onChange={(event) => setOrderForm({ ...orderForm, specialRequirements: event.target.value })}
              />
            </label>

            <div className="summary-box full-span">
              <strong>Selected shop:</strong> {selectedShop?.name || 'Choose a shop'}
              <br />
              <strong>Estimated cost:</strong> ₹{selectedShop ? selectedShop.estimatedPrice : 0}
            </div>

            <button className="primary-btn full-span" type="submit">Confirm order</button>
          </form>
        </section>

        <section className="panel orders-panel">
          <h2>Recent orders</h2>
          {orders.length === 0 ? <p>No orders yet.</p> : null}
          <div className="order-list">
            {orders.map((order) => (
              <article key={order.id} className="order-item">
                <div className="order-row">
                  <strong>{order.id}</strong>
                  <span className="status-pill">{order.status}</span>
                </div>
                <p>{order.shopName}</p>
                <p>{order.documentName}</p>
                <div className="order-row">
                  <span>₹{order.totalCost}</span>
                  <span>{order.estimatedCompletionTime}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {message ? <div className="toast">{message}</div> : null}
    </div>
  );
}

export default App;
