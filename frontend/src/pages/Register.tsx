import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Lock, Phone, ShieldAlert } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  
  // Tab control: 'register' or 'login'
  const [activeTab, setActiveTab] = useState<'register' | 'login'>('register');
  
  // Common Form states
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Registration Specific states
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'login') {
      setActiveTab('login');
    } else {
      setActiveTab('register');
    }
    setError(null);
  }, [searchParams]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validations
    if (!firstName || !lastName || !mobileNumber || !age || !password) {
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    if (mobileNumber.length !== 10 || !/^\d+$/.test(mobileNumber)) {
      setError("Mobile number must be a 10-digit number.");
      setLoading(false);
      return;
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      setError("You must be 18 years or older to register.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile_number: mobileNumber,
          first_name: firstName,
          middle_name: middleName || null,
          last_name: lastName,
          age: ageNum,
          gender: gender,
          password: password
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Go to OTP verification page and pass the mobile number and the mock OTP
        navigate(`/verify-otp?mobile=${mobileNumber}&otp=${data.mock_otp || ''}`);
      } else {
        const errorMsg = Object.values(data).flat().join(' ') || "Registration failed.";
        setError(errorMsg);
      }
    } catch (err) {
      setError("Could not connect to the backend server. Please make sure Django is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!mobileNumber || !password) {
      setError("Please enter your mobile number and password.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile_number: mobileNumber,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        login(data.token, data.user);
        navigate('/home');
      } else {
        setError(data.error || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError("Could not connect to the backend server. Please make sure Django is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Header />
      
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
        <div style={{
          display: 'flex',
          maxWidth: '1000px',
          width: '100%',
          backgroundColor: 'var(--white)',
          borderRadius: '24px',
          boxShadow: 'var(--card-shadow)',
          overflow: 'hidden',
          minHeight: '650px',
          border: '1px solid rgba(128, 10, 63, 0.03)'
        }}>
          {/* Left panel quote banner */}
          <div style={{
            flex: 1.1,
            background: 'linear-gradient(135deg, var(--primary-burgundy) 0%, #5E062D 100%)',
            color: 'var(--white)',
            padding: '3rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            {/* Soft decorative background circles */}
            <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(212,163,115,0.15)', top: '-40px', left: '-40px' }}></div>
            <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', bottom: '-100px', right: '-50px' }}></div>

            <div style={{ position: 'relative', zIndex: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 600 }}>
                <Heart size={20} fill="#FFF" />
                <span>natejulva</span>
              </div>
            </div>

            <div style={{ position: 'relative', zIndex: 5, margin: '4rem 0' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontStyle: 'italic', lineHeight: 1.3, color: '#F3DFCC', marginBottom: '1.5rem' }}>
                "A perfect marriage is two imperfect people who refuse to give up on each other."
              </p>
              <div style={{ width: '40px', height: '2px', backgroundColor: 'var(--secondary-gold)', marginBottom: '1rem' }}></div>
              <p style={{ fontSize: '0.95rem', opacity: 0.8 }}>
                Join thousands of verified profiles finding true compatibility every day. Registration is quick and entirely confidential.
              </p>
            </div>

            <div style={{ position: 'relative', zIndex: 5, fontSize: '0.85rem', opacity: 0.7 }}>
              &copy; Saathi Marriage Bureau. Trusted Matchmaking.
            </div>
          </div>

          {/* Right panel form content */}
          <div style={{ flex: 1.2, padding: '3.5rem 3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            
            {/* Header selection tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(128, 10, 63, 0.08)', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
              <button 
                onClick={() => { setActiveTab('register'); setError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: activeTab === 'register' ? 'var(--primary-burgundy)' : 'var(--text-light)',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}
              >
                Create Account
                {activeTab === 'register' && (
                  <div style={{ position: 'absolute', bottom: '-9px', left: 0, right: 0, height: '3px', backgroundColor: 'var(--primary-burgundy)', borderRadius: '2px' }}></div>
                )}
              </button>
              
              <button 
                onClick={() => { setActiveTab('login'); setError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: activeTab === 'login' ? 'var(--primary-burgundy)' : 'var(--text-light)',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  marginLeft: '1rem'
                }}
              >
                Sign In
                {activeTab === 'login' && (
                  <div style={{ position: 'absolute', bottom: '-9px', left: 0, right: 0, height: '3px', backgroundColor: 'var(--primary-burgundy)', borderRadius: '2px' }}></div>
                )}
              </button>
            </div>

            {error && (
              <div style={{ 
                backgroundColor: 'var(--accent-pink)', 
                color: 'var(--accent-pink-text)', 
                padding: '0.85rem 1.25rem', 
                borderRadius: '12px', 
                fontSize: '0.9rem', 
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid rgba(178, 59, 68, 0.15)',
                fontWeight: 500
              }}>
                <ShieldAlert size={18} />
                <span>{error}</span>
              </div>
            )}

            {activeTab === 'register' ? (
              /* REGISTRATION FORM */
              <form onSubmit={handleRegisterSubmit} style={{ animation: 'fade-in 0.4s ease' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--primary-burgundy)', marginBottom: '0.5rem' }}>
                  Create your account
                </h2>
                <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Just a few details to begin your matchmaking journey.
                </p>

                {/* Grid for Name Fields */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Aarav"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Middle Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Kumar"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Sharma"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Age *</label>
                    <input 
                      type="number" 
                      min="18" 
                      max="100"
                      className="form-control" 
                      placeholder="18+"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1.5 }}>
                    <label className="form-label">Gender *</label>
                    <div className="gender-tabs">
                      {(['Male', 'Female', 'Other'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          className={`gender-tab-btn ${gender === g ? 'active' : ''}`}
                          onClick={() => setGender(g)}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Mobile Number *</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <input 
                      type="tel" 
                      maxLength={10}
                      className="form-control" 
                      style={{ paddingLeft: '2.8rem' }}
                      placeholder="10-digit mobile"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <input 
                      type="password" 
                      className="form-control" 
                      style={{ paddingLeft: '2.8rem' }}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', borderRadius: '30px', marginTop: '1rem' }}
                >
                  {loading ? "Generating OTP..." : "Send OTP"}
                </button>
              </form>
            ) : (
              /* LOGIN FORM */
              <form onSubmit={handleLoginSubmit} style={{ animation: 'fade-in 0.4s ease' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--primary-burgundy)', marginBottom: '0.5rem' }}>
                  Welcome back
                </h2>
                <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                  Enter your credentials below to access your account.
                </p>

                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <input 
                      type="tel" 
                      maxLength={10}
                      className="form-control" 
                      style={{ paddingLeft: '2.8rem' }}
                      placeholder="10-digit registered number"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <input 
                      type="password" 
                      className="form-control" 
                      style={{ paddingLeft: '2.8rem' }}
                      placeholder="Enter your account password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', borderRadius: '30px' }}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            )}
            
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
