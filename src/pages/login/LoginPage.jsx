import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff, MdLogin, MdArrowForward, MdWarning, MdFlashOn, MdAdjust, MdBarChart, MdTrendingUp, MdTrackChanges, MdSecurity } from 'react-icons/md';
import { useAuth } from '../../auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        @keyframes spin { 
          to { transform: rotate(360deg); } 
        }
        
        @keyframes fadeInUp { 
          from { opacity: 0; transform: translateY(30px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .login-wrapper {
          min-height: 100vh;
          display: flex;
          background: linear-gradient(135deg, #eff6ff 0%, #f0f7ff 50%, #eef2ff 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* Left Side - Branding */
        .left-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px 36px;
          position: relative;
          background: linear-gradient(135deg, #ffffff 0%, #fef2f2 50%, #fee2e2 100%);
          overflow: hidden;
          border-right: 1px solid rgba(30, 64, 175, 0.1);
        }

        .left-panel::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: 
            radial-gradient(circle at 20% 30%, rgba(30, 64, 175, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.05) 0%, transparent 50%);
        }

        .brand-content {
          position: relative;
          z-index: 1;
          text-align: center;
          animation: fadeInUp 0.8s ease;
          max-width: 400px;
        }

        .brand-logo {
          width: 80px;
          height: 80px;
          background: white;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          box-shadow: 
            0 12px 28px rgba(30, 64, 175, 0.15),
            0 0 0 1px rgba(30, 64, 175, 0.1);
          animation: float 6s ease-in-out infinite;
          position: relative;
          transition: transform 0.4s ease;
        }

        .brand-logo:hover { transform: scale(1.05); }

        .brand-logo img {
          width: 52px;
          height: 52px;
          object-fit: contain;
        }

        .brand-title {
          font-size: 26px;
          font-weight: 900;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
          line-height: 1.1;
          background: linear-gradient(135deg, #1a202c 0%, #4a5568 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .brand-subtitle {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 3px;
          margin-bottom: 16px;
          color: #1e40af;
          background: rgba(192, 57, 43, 0.08);
          display: inline-block;
          padding: 5px 14px;
          border-radius: 20px;
        }

        .brand-description {
          font-size: 13px;
          line-height: 1.6;
          max-width: 340px;
          margin: 0 auto 24px;
          font-weight: 500;
          color: #4a5568;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          max-width: 340px;
          margin: 0 auto;
        }

        .stat-card {
          background: white;
          border: 1.5px solid rgba(30, 64, 175, 0.15);
          border-radius: 12px;
          padding: 14px 8px;
          text-align: center;
          transition: all 0.3s ease;
          box-shadow: 0 3px 8px rgba(192, 57, 43, 0.07);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .stat-card:hover {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          transform: translateY(-3px);
          border-color: rgba(192, 57, 43, 0.3);
          box-shadow: 0 6px 18px rgba(192, 57, 43, 0.13);
        }

        .stat-number {
          font-size: 22px;
          font-weight: 900;
          margin-bottom: 4px;
          display: block;
        }

        .stat-label {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #64748b;
        }

        .decorative-dots {
          position: absolute;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
        }

        .dot {
          width: 7px;
          height: 7px;
          background: #1e40af;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 0 8px rgba(192, 57, 43, 0.3);
        }

        .dot:nth-child(2) { animation-delay: 0.3s; }
        .dot:nth-child(3) { animation-delay: 0.6s; }

        /* Right Side - Login Form */
        .right-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 28px;
          position: relative;
        }

        .floating-shape {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .shape-1 {
          top: -80px; right: -80px;
          width: 220px; height: 220px;
          background: radial-gradient(circle, rgba(192,57,43,0.07) 0%, transparent 70%);
          animation: float 10s ease-in-out infinite;
        }

        .shape-2 {
          bottom: -60px; left: -60px;
          width: 180px; height: 180px;
          background: radial-gradient(circle, rgba(243,156,18,0.07) 0%, transparent 70%);
          animation: float 12s ease-in-out infinite;
          animation-delay: 2s;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          background: rgba(255, 255, 255, 0.97);
          backdrop-filter: blur(20px);
          border-radius: 22px;
          padding: 32px 30px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255,255,255,0.5) inset;
          border: 1px solid rgba(226, 232, 240, 0.6);
          animation: fadeInUp 0.6s ease;
          position: relative;
          z-index: 1;
        }

        .login-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .login-title {
          font-size: 22px;
          font-weight: 800;
          color: #1a202c;
          margin-bottom: 6px;
          letter-spacing: -0.3px;
        }

        .login-subtitle {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        .error-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          border: 1.5px solid #f87171;
          border-radius: 12px;
          color: #dc2626;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 18px;
          animation: slideInLeft 0.4s ease;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
          margin-left: 2px;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
          transition: color 0.3s ease;
        }

        .form-input {
          width: 100%;
          padding: 10px 14px 10px 40px;
          font-size: 13px;
          font-weight: 500;
          color: #1a202c;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 11px;
          outline: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
        }

        .form-input:focus {
          background: #fff;
          border-color: #1e40af;
          box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
          transform: translateY(-1px);
        }

        .toggle-password {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          border-radius: 7px;
          transition: all 0.2s ease;
        }

        .toggle-password:hover {
          background: #f3f4f6;
          color: #1e40af;
        }

        .form-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
        }

        .checkbox-wrapper {
          display: flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
          user-select: none;
        }

        .checkbox-input {
          width: 15px;
          height: 15px;
          cursor: pointer;
          accent-color: #1e40af;
        }

        .checkbox-label {
          font-size: 12px;
          color: #4b5563;
          font-weight: 500;
        }

        .forgot-link {
          font-size: 12px;
          color: #64748b;
          text-decoration: none;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 3px;
          transition: all 0.2s ease;
          position: relative;
        }

        .forgot-link::after {
          content: '';
          position: absolute;
          bottom: -2px; left: 0;
          width: 0; height: 2px;
          background: #1e40af;
          transition: width 0.3s ease;
        }

        .forgot-link:hover { color: #1e40af; }
        .forgot-link:hover::after { width: calc(100% - 18px); }

        .submit-btn {
          width: 100%;
          padding: 11px 18px;
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          background: linear-gradient(135deg, #1e40af 0%, #e74c3c 100%);
          border: none;
          border-radius: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 6px 18px rgba(192, 57, 43, 0.32);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          position: relative;
          overflow: hidden;
        }

        .submit-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          transition: left 0.5s;
        }

        .submit-btn:hover:not(:disabled)::before { left: 100%; }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 26px rgba(192, 57, 43, 0.42);
        }

        .submit-btn:active:not(:disabled) { transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .spinner {
          width: 17px;
          height: 17px;
          border: 2.5px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        .login-footer {
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
        }

        .footer-text {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .left-panel { display: none; }
          .right-panel { flex: 1; }
        }

        @media (max-width: 640px) {
          .login-card {
            padding: 24px 20px;
            border-radius: 18px;
          }
          .login-title { font-size: 20px; }
          .form-options {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
        }
      `}</style>

      <div className="login-wrapper">
        {/* Left Panel - Branding */}
        <div className="left-panel">
          <div className="brand-content">
            <div className="brand-logo">
              <img src="/logo.svg" alt="MANUFACTURING ERP" />
            </div>
            <h1 className="brand-title">MANUFACTURING ERP</h1>
            <div className="brand-subtitle">ERP PLATFORM</div>
            <p className="brand-description">
              Transforming manufacturing operations through intelligent automation and seamless integration
            </p>
            
            <div className="stats-grid">
              <div className="stat-card">
                <MdBarChart size={32} color="#1e40af" />
                <span className="stat-label">Smart Analytics</span>
              </div>
              <div className="stat-card">
                <MdFlashOn size={32} color="#1e40af" />
                <span className="stat-label">Fast Performance</span>
              </div>
              <div className="stat-card">
                <MdAdjust size={32} color="#1e40af" />
                <span className="stat-label">Goal Driven</span>
              </div>
            </div>
          </div>
          <div className="decorative-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="right-panel">
          <div className="floating-shape shape-1"></div>
          <div className="floating-shape shape-2"></div>

          <div className="login-card">
            <div className="login-header">
              <h2 className="login-title">Welcome Back</h2>
              <p className="login-subtitle">Sign in to access your dashboard</p>
            </div>

            {error && (
              <div className="error-alert">
                <MdWarning size={20} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin}>
              {/* Email Field */}
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your Email id"
                    autoComplete="off"
                  />
                  <MdEmail className="input-icon" size={20} />
                </div>
              </div>

              {/* Password Field */}
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="new-password"
                    style={{ paddingRight: '52px' }}
                  />
                  <MdLock className="input-icon" size={20} />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPass(!showPass)}
                  >
                    {showPass ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="form-options">
                <Link to="/forgot-password" className="forgot-link">
                  Forgot password?
                  <MdArrowForward size={16} />
                </Link>
              </div>

              {/* Submit Button */}
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <MdLogin size={22} />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            <div className="login-footer">
              {/* Quick-fill admin credentials */}
              <button
                type="button"
                onClick={() => { setEmail('admin@manufacturingerp.com'); setPassword('admin123'); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  marginBottom: '14px',
                  background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '11px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#1e40af'; e.currentTarget.style.background='linear-gradient(135deg,#fef2f2,#fee2e2)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.background='linear-gradient(135deg,#f8fafc,#f1f5f9)'; }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#1e40af,#172554)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <MdSecurity size={17} color="#fff" />
                  </div>
                  <div style={{ textAlign:'left' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>Admin Login</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>Click to autofill credentials</div>
                  </div>
                </div>
                <div style={{ width:28, height:28, borderRadius:8, background:'rgba(192,57,43,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <MdArrowForward size={16} color="#1e40af" />
                </div>
              </button>
              <p className="footer-text">
                © 2026 MANUFACTURING ERP. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
