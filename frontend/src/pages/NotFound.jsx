import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0f1d',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: '#131d36',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        borderRadius: '16px',
        padding: '40px 32px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'rgba(56, 189, 248, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: '#38bdf8'
        }}>
          <Compass size={32} />
        </div>
        <div style={{
          fontSize: '3.5rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          marginBottom: '12px'
        }}>
          404
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>
          Page Not Found
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '24px', lineHeight: 1.6 }}>
          The telemetry route or canvas resource you requested does not exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link
            to="/dashboard"
            style={{
              background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Home size={15} />
            Go to Dashboard
          </Link>
          <Link
            to="/"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#cbd5e1',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={15} />
            Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
}
