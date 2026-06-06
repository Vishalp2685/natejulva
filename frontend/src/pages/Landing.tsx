import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Sparkles, Heart } from 'lucide-react';
import { Header } from '../components/Header';
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
    <div className="app-container" style={{ backgroundColor: '#FFFDF9' }}>
      <Header />
      
      <main className="main-content" style={{ padding: 0 }}>
        {/* Luxury Hero Banner Section */}
        <div style={{
          background: `linear-gradient(rgba(128, 10, 63, 0.4), rgba(128, 10, 63, 0.7)), url(${heroWedding})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--white)',
          textAlign: 'center',
          padding: '2rem',
          position: 'relative'
        }}>
          <div style={{ width: '100%', maxWidth: '800px', animation: 'fade-in 0.8s ease', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ 
              background: 'rgba(212, 163, 115, 0.25)', 
              backdropFilter: 'blur(4px)',
              padding: '0.4rem 1.2rem', 
              borderRadius: '20px', 
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#FFF',
              border: '1px solid rgba(212, 163, 115, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginBottom: '1rem'
            }}>
              <ShieldCheck size={14} />
              A TRUSTED BUREAU
            </span>
            <h1 style={{ 
              fontFamily: 'var(--font-serif)', 
              fontSize: 'clamp(2.5rem, 8vw, 4rem)', 
              fontWeight: 700, 
              lineHeight: 1.1,
              marginBottom: '1rem',
              textShadow: '0 2px 10px rgba(0,0,0,0.3)'
            }}>
              Where two souls<br/>become one.
            </h1>
            <p style={{ 
              fontSize: 'clamp(1rem, 4vw, 1.25rem)', 
              maxWidth: '600px', 
              margin: '0 auto 2rem auto',
              opacity: 0.95,
              fontFamily: 'var(--font-body)',
              textShadow: '0 1px 4px rgba(0,0,0,0.3)'
            }}>
              A premium matchmaking experience crafted for meaningful, lifelong unions.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '1rem', maxWidth: '400px' }}>
              <button 
                onClick={() => navigate('/register')} 
                className="btn btn-primary"
                style={{ 
                  padding: '1rem', 
                  fontSize: '1rem', 
                  borderRadius: '30px',
                  background: 'var(--primary-burgundy)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
                  width: '100%'
                }}
              >
                Create your profile — Free
              </button>
              <button 
                onClick={() => navigate('/register?tab=login')} 
                className="btn btn-outline"
                style={{ 
                  padding: '1rem', 
                  fontSize: '1rem', 
                  borderRadius: '30px', 
                  border: '1px solid rgba(255,255,255,0.4)',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  color: 'var(--white)',
                  backdropFilter: 'blur(5px)',
                  width: '100%'
                }}
              >
                I already have an account
              </button>
            </div>
          </div>
        </div>

        {/* Brand Value Propositions */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 1.5rem', backgroundColor: '#FFFDF9' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ width: '40px', height: '1.5px', backgroundColor: 'var(--text-light)', margin: '0 auto 1.5rem auto', opacity: 0.5 }}></div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: '#2B1D24', marginBottom: '1rem' }}>
              Crafted with care.
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-medium)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.5 }}>
              Verified profiles, private conversations, and a dedicated team to guide your journey.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px', margin: '0 auto' }}>
            
            <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', borderRadius: '20px', backgroundColor: 'var(--white)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ 
                backgroundColor: '#FFDCA8', 
                color: '#D27B2A', 
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <ShieldCheck size={20} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.4rem', color: '#2B1D24' }}>Verified profiles</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-medium)', margin: 0 }}>
                Every profile is manually approved by our team.
              </p>
            </div>

            <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', borderRadius: '20px', backgroundColor: 'var(--white)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ 
                backgroundColor: '#FFDCA8', 
                color: '#D27B2A', 
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <Heart size={20} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.4rem', color: '#2B1D24' }}>Meaningful matches</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-medium)', margin: 0 }}>
                Filters that go deeper than surface attributes.
              </p>
            </div>

            <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', borderRadius: '20px', backgroundColor: 'var(--white)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ 
                backgroundColor: '#FFDCA8', 
                color: '#D27B2A', 
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <Sparkles size={20} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.4rem', color: '#2B1D24' }}>Premium support</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-medium)', margin: 0 }}>
                Dedicated advisors at every step of the way.
              </p>
            </div>

          </div>
        </div>

        {/* Footer replacement embedded in Landing directly based on image design */}
        <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: '#FFFDF9' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', color: 'var(--primary-burgundy)', fontWeight: 700, fontSize: '1.2rem' }}>
            <Heart size={16} fill="var(--primary-burgundy)" /> Saaथी
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-medium)' }}>
            © 2026 Saathi Marriage Bureau. All rights reserved.
          </div>
        </div>
      </main>
    </div>
  );
};
