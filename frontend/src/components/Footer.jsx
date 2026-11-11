import React from 'react';
import { Radio, Github, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="public-footer">
      <div className="footer-container">
        <div className="footer-brand-section">
          <div className="footer-logo-row">
            <div className="brand-logo-xs">
              <Radio size={16} />
            </div>
            <span className="footer-brand-name">NexusFlow</span>
          </div>
          <p className="footer-tagline">
            Visual IoT Telemetry & Rule Engine — High-speed MongoDB Time-Series ingestion with reactive node pipelines.
          </p>
        </div>

        <div className="footer-links-group">
          <div className="footer-column">
            <h4>Platform</h4>
            <a href="#features">Visual Graph Builder</a>
            <a href="#how-it-works">Time-Series Storage</a>
            <Link to="/dashboard">Interactive Canvas</Link>
          </div>
          <div className="footer-column">
            <h4>Resources</h4>
            <Link to="/login">Sign In</Link>
            <Link to="/register">Create Account</Link>
            <a href="https://github.com/nandini05-git/NexusFlow-Visual-IoT-Telemetry-Rule-Engine" target="_blank" rel="noreferrer">
              GitHub Repository
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 NexusFlow. Built for Advanced MERN Stack IoT Engineering.</p>
        <span className="footer-status-pill">Day 2 • Production Ready</span>
      </div>
    </footer>
  );
}
