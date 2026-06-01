import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, ShieldAlert, BadgeCheck } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export const VerifyOtp: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const mobile = searchParams.get('mobile') || '';
  const mockOtp = searchParams.get('otp') || '';

  // 6 separate inputs state
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const inputRefs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    // If no mobile number in URL, send them back to register page
    if (!mobile) {
      navigate('/register');
    }
  }, [mobile, navigate]);

  // Handle single digit input
  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return; // Allow numbers only
    
    const newOtp = [...otp];
    // Keep only the last character entered
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace key focus shift
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) return; // Valid 6-digit only

    const digits = pastedData.split('');
    setOtp(digits);
    inputRefs.current[5]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError("Please enter the full 6-digit verification code.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/auth/verify-otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile_number: mobile,
          otp: otpCode
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Wait 1.5 seconds for animation then log in
        setTimeout(() => {
          login(data.token, data.user);
          navigate('/home');
        }, 1500);
      } else {
        setError(data.error || "OTP verification failed. Please try again.");
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
      
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem' }}>
        <div style={{
          maxWidth: '500px',
          width: '100%',
          backgroundColor: 'var(--white)',
          borderRadius: '24px',
          boxShadow: 'var(--card-shadow)',
          padding: '4rem 3rem',
          textAlign: 'center',
          animation: 'fade-in 0.6s cubic-bezier(0.165, 0.84, 0.44, 1)',
          border: '1px solid rgba(128, 10, 63, 0.03)'
        }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '50%', 
              backgroundColor: 'rgba(128, 10, 63, 0.05)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--primary-burgundy)' 
            }}>
              {success ? (
                <BadgeCheck size={32} color="var(--accent-success-text)" />
              ) : (
                <KeyRound size={28} />
              )}
            </div>
          </div>

          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--primary-burgundy)', marginBottom: '0.5rem' }}>
            {success ? "Identity Verified" : "Verify your mobile"}
          </h2>
          <p style={{ color: 'var(--text-medium)', fontSize: '0.95rem', marginBottom: '2.5rem' }}>
            {success ? "Welcome to natejulva matrimonial!" : `Enter the 6-digit code we sent to ${mobile}`}
          </p>

          {/* Direct convenient help card for testing */}
          {mockOtp && !success && (
            <div style={{
              backgroundColor: 'var(--secondary-gold-light)',
              border: '1px dashed var(--secondary-gold)',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              fontSize: '0.85rem',
              color: '#8c6031',
              fontWeight: 600,
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <span>Test OTP Code:</span>
              <strong style={{ fontSize: '1rem', color: 'var(--primary-burgundy)', letterSpacing: '0.1em' }}>{mockOtp}</strong>
            </div>
          )}

          {error && (
            <div style={{ 
              backgroundColor: 'var(--accent-pink)', 
              color: 'var(--accent-pink-text)', 
              padding: '0.85rem 1.25rem', 
              borderRadius: '12px', 
              fontSize: '0.9rem', 
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              border: '1px solid rgba(178, 59, 68, 0.15)',
              fontWeight: 500
            }}>
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit}>
              {/* OTP Digits Entry Blocks */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el as HTMLInputElement; }}
                    type="text"
                    pattern="\d*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    style={{
                      width: '50px',
                      height: '58px',
                      borderRadius: '12px',
                      border: '1.5px solid rgba(128, 10, 63, 0.15)',
                      backgroundColor: 'rgba(253, 251, 247, 0.5)',
                      textAlign: 'center',
                      fontSize: '1.4rem',
                      fontWeight: 700,
                      color: 'var(--primary-burgundy)',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary-burgundy)';
                      e.target.style.backgroundColor = 'var(--white)';
                      e.target.style.boxShadow = '0 0 0 4px rgba(128, 10, 63, 0.05)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(128, 10, 63, 0.15)';
                      e.target.style.backgroundColor = 'rgba(253, 251, 247, 0.5)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                ))}
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', borderRadius: '30px', marginBottom: '1.5rem' }}
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </button>

              <div style={{ color: 'var(--text-medium)', fontSize: '0.85rem' }}>
                Didn't receive the code?{' '}
                <button 
                  type="button" 
                  onClick={() => alert(`Your code is: ${mockOtp || '123456'}`)} 
                  className="btn-text" 
                  style={{ fontSize: '0.85rem', padding: 0 }}
                >
                  Resend code
                </button>
              </div>
            </form>
          )}

          {success && (
            <div style={{ padding: '2rem 0', animation: 'scale-up 0.5s ease' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-success-text)' }}>
                Success! Redirecting you home...
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
};
