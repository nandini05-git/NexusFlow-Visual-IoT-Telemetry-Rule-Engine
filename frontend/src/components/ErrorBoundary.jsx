import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
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
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '560px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={28} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.6 }}>
              An unexpected render issue occurred in the telemetry workspace. Your rule configurations remain safe on the server.
            </p>
            {this.state.error && (
              <pre style={{
                background: '#0b1120',
                padding: '12px',
                borderRadius: '6px',
                color: '#fca5a5',
                fontSize: '0.78rem',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '20px',
                fontFamily: 'monospace'
              }}>
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={15} />
                Return to Workspace
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
