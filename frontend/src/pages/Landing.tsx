import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Sparkles, Heart } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import heroWedding from '../assets/hero_wedding.jpg';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="app-container">
      <Header />
      
      <main className="main-content">
        {/* Luxury Hero Banner Section */}
        <div style={{
          background: `linear-gradient(rgba(128, 10, 63, 0.65), rgba(128, 10, 63, 0.4)), url(${heroWedding})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          height: '68vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--white)',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div style={{ maxWidth: '800px', animation: 'fade-in 0.8s ease' }}>
            <span style={{ 
              background: 'rgba(212, 163, 115, 0.25)', 
              backdropFilter: 'blur(4px)',
              padding: '0.4rem 1.2rem', 
              borderRadius: '20px', 
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#F4D2B2',
              border: '1px solid rgba(212, 163, 115, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginBottom: '1.5rem'
            }}>
              <ShieldCheck size={14} />
              A TRUSTED MATCHMAKING EXPERIENCE
            </span>
            <h1 style={{ 
              fontFamily: 'var(--font-serif)', 
              fontSize: '3.8rem', 
              fontWeight: 700, 
              lineHeight: 1.15,
              marginBottom: '1rem',
              textShadow: '0 2px 10px rgba(0,0,0,0.3)'
            }}>
              Where two souls <br/><span style={{ color: '#D4A373', fontStyle: 'italic' }}>become one.</span>
            </h1>
            <p style={{ 
              fontSize: '1.25rem', 
              maxWidth: '600px', 
              margin: '0 auto 2.5rem auto',
              opacity: 0.95,
              fontFamily: 'var(--font-body)',
              textShadow: '0 1px 4px rgba(0,0,0,0.3)'
            }}>
              A premium matchmaking experience crafted for meaningful, lifelong unions.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
              <button 
                onClick={() => navigate('/register')} 
                className="btn btn-primary"
                style={{ 
                  padding: '1rem 2.5rem', 
                  fontSize: '1.05rem', 
                  borderRadius: '30px',
                  background: 'linear-gradient(135deg, #a31d56 0%, var(--primary-burgundy) 100%)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
                }}
              >
                Create your profile — Free
              </button>
              <button 
                onClick={() => navigate('/register?tab=login')} 
                className="btn btn-outline"
                style={{ 
                  padding: '1rem 2.5rem', 
                  fontSize: '1.05rem', 
                  borderRadius: '30px', 
                  border: '1.5px solid var(--white)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'var(--white)',
                  backdropFilter: 'blur(5px)'
                }}
              >
                I already have an account
              </button>
            </div>
          </div>
        </div>

        {/* Brand Value Propositions */}
        <div style={{ maxWidth: '1200px', margin: 'calc(-4rem + 45px) auto 4rem auto', padding: '0 2rem', position: 'relative', zIndex: 10 }}>
          <div className="grid-cols-3">
            
            <div className="premium-card" style={{ display: 'flex', gap: '1.2rem', alignItems: 'flex-start' }}>
              <div style={{ 
                backgroundColor: 'rgba(212, 163, 115, 0.15)', 
                color: 'var(--primary-burgundy)', 
                padding: '0.8rem', 
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.4rem', color: 'var(--primary-burgundy)' }}>Verified profiles</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-medium)', lineHeight: 1.45 }}>
                  Every single profile is manually verified and approved by our expert team.
                </p>
              </div>
            </div>

            <div className="premium-card" style={{ display: 'flex', gap: '1.2rem', alignItems: 'flex-start' }}>
              <div style={{ 
                backgroundColor: 'rgba(212, 163, 115, 0.15)', 
                color: 'var(--primary-burgundy)', 
                padding: '0.8rem', 
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Heart fill="#800A3F" size={26} color="var(--primary-burgundy)" />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.4rem', color: 'var(--primary-burgundy)' }}>Meaningful matches</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-medium)', lineHeight: 1.45 }}>
                  Go deeper than surface level. Discover partners aligned with your lifestyle and family values.
                </p>
              </div>
            </div>

            <div className="premium-card" style={{ display: 'flex', gap: '1.2rem', alignItems: 'flex-start' }}>
              <div style={{ 
                backgroundColor: 'rgba(212, 163, 115, 0.15)', 
                color: 'var(--primary-burgundy)', 
                padding: '0.8rem', 
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={26} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.4rem', color: 'var(--primary-burgundy)' }}>Premium support</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-medium)', lineHeight: 1.45 }}>
                  Dedicated family advisors are ready to guide you at every step of your matrimonial journey.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Premium Philosophy Section */}
        <section style={{ maxWidth: '900px', margin: '6rem auto 8rem auto', padding: '0 2rem', textAlign: 'center' }}>
          <div style={{ width: '40px', height: '1.5px', backgroundColor: 'var(--secondary-gold)', margin: '0 auto 1.5rem auto' }}></div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 600, color: 'var(--primary-burgundy)', marginBottom: '1.2rem' }}>
            Crafted with Care & Premium Discretion
          </h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-medium)', lineHeight: 1.7, marginBottom: '2.5rem' }}>
            Natejulva is a boutique matrimonial service designed for individuals who appreciate refined quality. We connect hearts, families, and cultures with utmost confidentiality, bringing you trusted matches curated by experts and refined by high-end technology.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-dark)' }}>
              <CheckCircle2 size={16} color="var(--secondary-gold)" /> Private & Secure Chats
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-dark)' }}>
              <CheckCircle2 size={16} color="var(--secondary-gold)" /> Direct Verification Badge
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-dark)' }}>
              <CheckCircle2 size={16} color="var(--secondary-gold)" /> Complete Family Alignment
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
