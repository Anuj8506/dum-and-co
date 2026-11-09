import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChefHat, UserRound, Settings2, CookingPot } from 'lucide-react';
import { useApp } from '../utils/AppContext';
import { authService } from '../services/authService';
import api from '../services/api';

function loginDestination(next) {
  if (!next?.startsWith('/')) return '/';
  try {
    const origin = window.location.origin;
    const url = new URL(next, origin);
    if (url.origin === origin && !url.pathname.startsWith('//')) {
      return url.pathname + url.search + url.hash;
    }
  } catch {
    return '/';
  }
  return '/';
}

export default function LoginPage({ register = false }) {
  const { setUser, notify } = useApp();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    consent: false,
    marketingOptIn: false,
  });
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    if (register) return;
    const controller = new AbortController();
    api
      .get('/health', { signal: controller.signal })
      .then(({ demo }) => setDemoEnabled(demo === true))
      .catch(() => {});
    return () => controller.abort();
  }, [register]);
  const submit = async (e, demoEmail) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await (register
        ? authService.register(form)
        : authService.login(demoEmail ? { email: demoEmail, password: 'DumCoDemo2026!' } : form));
      setUser(result.user);
      notify(`Welcome${register ? ' to the table' : ' back'}, ${result.user.name}.`);
      navigate(result.user.role === 'customer' ? loginDestination(params.get('next')) : '/kitchen');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const field = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  return (
    <main className="auth-page">
      <div className="auth-story">
        <CookingPot size={40} />
        <h1>
          A seat at
          <br />
          our table.
        </h1>
        <p>
          Good food. Familiar faces.
          <br />A little more Hyderabad in your day.
        </p>
        <img src="/images/hero.jpg" alt="Biryani prepared in our kitchen" />
      </div>
      <div className="auth-form">
        <div className="eyebrow">WELCOME TO DUM & CO.</div>
        <h2>{register ? 'Come on in.' : 'Good to see you.'}</h2>
        <p>
          {register
            ? 'Create your account and make yourself at home.'
            : 'Sign in for your favourites, fresh from the kitchen.'}
        </p>
        <form onSubmit={submit}>
          {register && (
            <label>
              Your name
              <input
                required
                autoComplete="name"
                minLength={2}
                maxLength={80}
                value={form.name}
                onChange={(e) => field('name', e.target.value)}
              />
            </label>
          )}
          <label>
            Email address
            <input
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => field('email', e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              minLength={register ? 10 : 1}
              maxLength={128}
              value={form.password}
              onChange={(e) => field('password', e.target.value)}
              placeholder={register ? 'At least 10 characters' : 'Your password'}
            />
          </label>
          {register && (
            <>
              <label className="checkbox-label">
                <input
                  required
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => field('consent', e.target.checked)}
                />
                I agree to storage of my account and order details to fulfil orders. Please use
                fictional details in this demo.
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.marketingOptIn}
                  onChange={(e) => field('marketingOptIn', e.target.checked)}
                />
                Send me occasional offers. Optional, and off by default.
              </label>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button full" disabled={busy}>
            {busy ? 'One moment…' : register ? 'Create account' : 'Sign in'}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? 'Already part of the family?' : 'First time here?'}{' '}
          <Link to={register ? '/login' : '/register'}>
            {register ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
        {!register && demoEnabled && (
          <div className="demo-accounts">
            <div className="eyebrow">TAKE A LOOK AROUND</div>
            <p>Use a seeded demo account. No personal details needed.</p>
            <div>
              {[
                ['guest@dumco.example', 'Customer', UserRound],
                ['kitchen@dumco.example', 'Kitchen', ChefHat],
                ['admin@dumco.example', 'Manager', Settings2],
              ].map(([email, name, Icon]) => (
                <button key={email} disabled={busy} onClick={(e) => submit(e, email)}>
                  <Icon size={18} />
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
