import { useState } from 'react';
import { MdEmail, MdArrowBack } from 'react-icons/md';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1500);
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .auth-input:focus {
          outline: none;
          border-color: #1e40af !important;
          box-shadow: 0 0 0 3px rgba(192,57,43,0.12) !important;
          background: #fff !important;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fdf0ef 0%, #fff5f5 40%, #f4f6f9 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}>
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440 }}>
          <div style={{
            background: '#fff',
            borderRadius: 20,
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 60px rgba(0,0,0,0.10), 0 4px 16px rgba(192,57,43,0.08)',
            padding: '40px 36px 36px',
            animation: 'fadeIn 0.3s ease',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{
                width: 68, height: 68, borderRadius: 18,
                background: '#fff', border: '2px solid #f5c6c2',
                boxShadow: '0 4px 16px rgba(192,57,43,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <img src="/logo.svg" alt="Manufacturing ERP" style={{ width: 48, height: 48, objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1c2833', letterSpacing: '-0.4px' }}>
                {sent ? 'Check Your Email' : 'Forgot Password?'}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
                {sent ? 'We sent a password reset link to your email' : 'Enter your email to reset your password'}
              </div>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                padding: '10px 14px', marginBottom: 18,
                fontSize: 13, color: '#dc2626', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                ⚠️ {error}
              </div>
            )}

            {sent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
                  If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
                </div>
                <a href="/login" style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '13px 20px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                  color: '#fff',
                  border: 'none', borderRadius: 12,
                  fontSize: 15, fontWeight: 700, textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(185,28,28,0.35)',
                }}>
                  <MdArrowBack size={18} /> Back to Login
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', pointerEvents: 'none' }}>
                      <MdEmail size={17} />
                    </span>
                    <input
                      className="auth-input"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@manufacturingerp.in"
                      autoComplete="email"
                      style={{
                        width: '100%',
                        padding: '11px 12px 11px 38px',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: 10,
                        fontSize: 14,
                        color: '#1c2833',
                        background: '#f9fafb',
                        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '13px 20px',
                    background: loading ? '#e5e7eb' : 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                    color: loading ? '#9ca3af' : '#fff',
                    border: 'none', borderRadius: 12,
                    fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: loading ? 'none' : '0 4px 14px rgba(185,28,28,0.35)',
                    transition: 'all 0.15s',
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{ width: 16, height: 16, border: '2px solid #9ca3af', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      Sending…
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <a href="/login" style={{ fontSize: 13, color: '#1e40af', fontWeight: 600, textDecoration: 'none' }}>
                    ← Back to Login
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
