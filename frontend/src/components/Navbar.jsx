import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Radio, ArrowRight, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="public-navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="brand-link">
          <div className="brand-logo-small">
            <Radio size={20} className="text-white" />
          </div>
          <span className="brand-name">NexusFlow</span>
          <span className="brand-badge">IoT Engine</span>
        </Link>

        {/* Navigation Links */}
        <nav className="nav-menu">
          <a href="#features" className="nav-link">
            Features
          </a>
          <a href="#how-it-works" className="nav-link">
            How It Works
          </a>
          <a href="#architecture" className="nav-link">
            Architecture
          </a>
        </nav>

        {/* Auth CTA Actions */}
        <div className="nav-actions">
          {isAuthenticated ? (
            <div className="auth-profile-group">
              <Link to="/dashboard" className="btn-secondary-sm">
                Dashboard
              </Link>
              <div className="user-pill" title={user?.email}>
                <UserIcon size={14} className="text-cyan" />
                <span className="user-name-text">{user?.name || 'Engineer'}</span>
              </div>
              <button onClick={handleLogout} className="btn-logout-icon" title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="guest-actions">
              <Link to="/login" className="btn-ghost-sm">
                Log In
              </Link>
              <Link to="/register" className="btn-primary-sm">
                <span>Get Started</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
