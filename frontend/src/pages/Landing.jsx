import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  Layers,
  Database,
  Cpu,
  Zap,
  Activity,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Server,
  Code2,
  Workflow,
  Sparkles,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Layers,
    title: 'Visual Graph Builder',
    description:
      'Compose reactive telemetry pipelines using a browser-based drag-and-drop React Flow canvas. No manual hardcoding required.',
    badge: 'No-Code Canvas',
    color: '#38bdf8',
  },
  {
    icon: Database,
    title: 'Time-Series Storage',
    description:
      'Native MongoDB Time-Series collections optimized for high-ingest, append-only sensor data with sub-second granularity.',
    badge: 'MongoDB 5.0+',
    color: '#22c55e',
  },
  {
    icon: Cpu,
    title: 'Real-Time Rule Engine',
    description:
      'Evaluate conditions, mathematical operators, and threshold triggers in memory as millions of telemetry points pour in.',
    badge: 'Event-Driven',
    color: '#a855f7',
  },
  {
    icon: Activity,
    title: 'Live Dashboards',
    description:
      'Inspect live turbine and sensor streams in real time with continuous health diagnostics and instant visual wire states.',
    badge: 'WebSocket Stream',
    color: '#f97316',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Connect Sensors',
    subtitle: 'High-Throughput Ingestion',
    description:
      'Stream IoT device readings via high-frequency REST ingestion or WebSockets directly into MongoDB Time-Series collections.',
    icon: Server,
  },
  {
    number: '02',
    title: 'Build Rule Graph',
    subtitle: 'Drag & Drop Processing',
    description:
      'Connect Data Source nodes to Math Operation processors (thresholds, moving averages) on the visual interactive canvas.',
    icon: Workflow,
  },
  {
    number: '03',
    title: 'Get Instant Alerts',
    subtitle: 'Automated Actuators',
    description:
      'Trigger webhooks, cooling actuators, and emergency alerts instantly when machine readings breach critical operating thresholds.',
    icon: Zap,
  },
];

export default function Landing() {
  return (
    <div className="landing-page-wrapper">
      <Navbar />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-backdrop-glow" />
        <div className="hero-content">
          <div className="hero-pill-tag">
            <Sparkles size={14} className="text-cyan" />
            <span>Advanced MERN Stack IoT Engineering</span>
          </div>

          <h1 className="hero-headline">
            Build IoT Telemetry Rules <br />
            <span className="gradient-text">Visually With Zero Code</span>
          </h1>

          <p className="hero-subheading">
            Hardcoding IoT business logic wastes engineering cycles. NexusFlow compiles visual drag-and-drop node pipelines into high-speed event streams running atop native MongoDB Time-Series collections.
          </p>

          <div className="hero-cta-group">
            <Link to="/register" className="btn-hero-primary">
              <span>Get Started Free</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn-hero-secondary">
              <span>Sign In to Dashboard</span>
            </Link>
          </div>

          {/* Quick Stats Banner */}
          <div className="hero-stats-row">
            <div className="stat-card">
              <span className="stat-value">5,000+</span>
              <span className="stat-label">Writes / Sec Ingest</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-card">
              <span className="stat-value">&lt; 5ms</span>
              <span className="stat-label">Rule Evaluation Latency</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-card">
              <span className="stat-value">100%</span>
              <span className="stat-label">Visual MERN Stack</span>
            </div>
          </div>
        </div>

        {/* Live Canvas Preview Card */}
        <div className="hero-preview-container">
          <div className="mock-window-frame">
            <div className="window-dots">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
              <span className="window-title">nexusflow-canvas-preview — turbine-01</span>
            </div>
            <div className="mock-canvas-view">
              <div className="mock-node node-cyan">
                <div className="mock-node-header">
                  <Database size={14} />
                  <span>Turbine-01 (Temp)</span>
                </div>
                <div className="mock-node-body">
                  <span className="mock-value">76.4 °C</span>
                  <span className="mock-tag">Source Node</span>
                </div>
              </div>

              <div className="mock-wire animated-wire" />

              <div className="mock-node node-purple">
                <div className="mock-node-header">
                  <Cpu size={14} />
                  <span>Threshold Rule</span>
                </div>
                <div className="mock-node-body">
                  <span className="mock-value">&gt; 80.0 °C</span>
                  <span className="mock-tag tag-purple">Evaluator</span>
                </div>
              </div>

              <div className="mock-wire animated-wire wire-orange" />

              <div className="mock-node node-orange">
                <div className="mock-node-header">
                  <Zap size={14} />
                  <span>Cooling Actuator</span>
                </div>
                <div className="mock-node-body">
                  <span className="mock-value">Status: Standby</span>
                  <span className="mock-tag tag-orange">Trigger Node</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <span className="section-eyebrow">Enterprise Capabilities</span>
          <h2 className="section-title">Engineered for Industrial Telemetry</h2>
          <p className="section-desc">
            Everything your operations team needs to model, ingest, and respond to massive IoT data streams without developer intervention.
          </p>
        </div>

        <div className="features-grid">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="feature-card">
                <div className="feature-top">
                  <div
                    className="feature-icon-box"
                    style={{ backgroundColor: `${feature.color}15`, color: feature.color }}
                  >
                    <Icon size={24} />
                  </div>
                  <span className="feature-badge" style={{ color: feature.color }}>
                    {feature.badge}
                  </span>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-section">
        <div className="section-header">
          <span className="section-eyebrow">Visual Workflow</span>
          <h2 className="section-title">How NexusFlow Works</h2>
          <p className="section-desc">
            From sensor signal to automated factory intervention in three seamless steps.
          </p>
        </div>

        <div className="steps-container">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="step-card">
                <div className="step-header">
                  <span className="step-number">{step.number}</span>
                  <div className="step-icon-wrapper">
                    <Icon size={20} />
                  </div>
                </div>
                <span className="step-subtitle">{step.subtitle}</span>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Call To Action Banner */}
      <section className="cta-banner-section">
        <div className="cta-banner-card">
          <div className="cta-text">
            <h2>Ready to Automate Your IoT Telemetry?</h2>
            <p>
              Log into your NexusFlow workspace, configure your rule canvas, and connect your sensors in minutes.
            </p>
          </div>
          <div className="cta-buttons">
            <Link to="/register" className="btn-cta-primary">
              <span>Create Account</span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn-cta-secondary">
              <span>Existing User Sign In</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
