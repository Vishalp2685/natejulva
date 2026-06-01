import React from 'react';
import { Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{ 
      backgroundColor: '#FAF7F2', 
      borderTop: '1px solid rgba(128, 10, 63, 0.05)', 
      padding: '2.5rem 1rem', 
      textAlign: 'center',
      marginTop: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-burgundy)', fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        <Heart fill="#800A3F" size={16} />
        <span>natejulva</span>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
        &copy; {new Date().getFullYear()} Saathi Marriage Bureau. All rights reserved.
      </p>
    </footer>
  );
};
