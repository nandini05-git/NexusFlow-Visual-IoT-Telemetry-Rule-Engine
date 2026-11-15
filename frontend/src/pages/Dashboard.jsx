import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Canvas from '../components/Canvas';
import Sidebar from '../components/Sidebar';
import { checkHealth, getTelemetry, getTelemetryStats } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Database,
  RefreshCw,
  LogOut,
  User as UserIcon,
  Radio,
  BarChart3,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Sliders,
  AlertCircle,
  X,
  Gauge,
  Clock,
  Layers,
} from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Health Status
  const [healthStatus, setHealthStatus] = useState({
    status: 'checking',
    database: 'checking',
    service: '',
    error: null,
  });
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);

  // Telemetry Feed & Stats
  const [recentTelemetry, setRecentTelemetry] = useState([]);
  const [telemetryStats, setTelemetryStats] = useState(null);
  const [telemetryLoading, setTelemetryLoading] = useState(true);
  const [telemetryError, setTelemetryError] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [statsMinutes, setStatsMinutes] = useState(60);
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch Health Check
  const fetchHealth = useCallback(async () => {
    setIsRefreshingHealth(true);
    try {
      const data = await checkHealth();
      setHealthStatus({
        status: data.status === 'ok' ? 'online' : 'degraded',
        database: data.database || 'unknown',
        service: data.service || 'NexusFlow Engine',
        error: null,
      });
    } catch (err) {
      setHealthStatus({
        status: 'offline',
        database: 'unreachable',
        service: 'NexusFlow Engine',
        error: err.message || 'Cannot connect to backend',
      });
    } finally {
      setIsRefreshingHealth(false);
    }
  }, []);

  // Fetch Recent Telemetry & Stats (Refreshes every 5s)
  const fetchTelemetryData = useCallback(async () => {
    try {
      setTelemetryError(null);
      const [telRes, statsRes] = await Promise.all([
        getTelemetry(selectedDevice, 12),
        getTelemetryStats(selectedDevice, statsMinutes),
      ]);

      if (telRes && telRes.data) {
        setRecentTelemetry(telRes.data);
      }
      if (statsRes && statsRes.stats) {
        setTelemetryStats(statsRes.stats);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.warn('Telemetry fetch notice:', err.response?.data?.message || err.message);
      setTelemetryError(err.response?.data?.message || 'Unable to fetch recent telemetry records.');
    } finally {
      setTelemetryLoading(false);
    }
  }, [selectedDevice, statsMinutes]);

  // Initial loads and timers
  useEffect(() => {
    fetchHealth();
    fetchTelemetryData();

    // Auto-refresh telemetry every 5 seconds as specified
    const telemetryInterval = setInterval(() => {
      fetchTelemetryData();
    }, 5000);

    // Health check every 15 seconds
    const healthInterval = setInterval(() => {
      fetchHealth();
    }, 15000);

    return () => {
      clearInterval(telemetryInterval);
      clearInterval(healthInterval);
    };
  }, [fetchHealth, fetchTelemetryData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="nexus-app-container">
      {/* Top Navigation Header for Dashboard */}
      <header className="nexus-header">
        <div className="header-left">
          <Link to="/" className="brand-logo" title="Back to Landing Page">
            <Radio className="brand-icon" size={24} />
          </Link>
          <div>
            <h1 className="brand-title">NexusFlow</h1>
            <p className="brand-tagline">Visual IoT Telemetry & Rule Engine</p>
          </div>
          <span className="version-pill">Workspace • Day 3</span>
        </div>

        <div className="header-right">
          {/* Backend Status Badge */}
          <div
            className={`status-badge ${
              healthStatus.status === 'online'
                ? 'status-online'
                : healthStatus.status === 'checking'
                ? 'status-checking'
                : 'status-offline'
            }`}
            title={
              healthStatus.error
                ? `Error: ${healthStatus.error}`
                : `Backend: ${healthStatus.status} | DB: ${healthStatus.database}`
            }
          >
            <div className="status-indicator-dot" />
            <div className="status-text-group">
              <span className="status-label">
                {healthStatus.status === 'online' && 'Backend Online'}
                {healthStatus.status === 'checking' && 'Connecting...'}
                {healthStatus.status === 'offline' && 'Backend Offline'}
              </span>
              <span className="db-subtext">
                <Database size={11} className="inline-icon" /> DB: {healthStatus.database}
              </span>
            </div>
            <button
              onClick={fetchHealth}
              disabled={isRefreshingHealth}
              className="refresh-btn"
              title="Refresh backend status"
            >
              <RefreshCw size={13} className={isRefreshingHealth ? 'spin' : ''} />
            </button>
          </div>

          {/* Telemetry Live Feed Toggle */}
          <button
            onClick={() => setShowDataPanel(!showDataPanel)}
            className={`toggle-drawer-btn ${showDataPanel ? 'active' : ''}`}
            title="Inspect live telemetry & aggregation stats"
          >
            <Activity size={15} className="pulse-icon text-cyan" />
            <span>Recent Telemetry</span>
            {telemetryStats?.count > 0 && (
              <span className="telemetry-count-badge">{telemetryStats.count}</span>
            )}
          </button>

          {/* User Profile & Logout */}
          <div className="dashboard-user-menu">
            <div className="user-profile-tag" title={user?.email}>
              <div className="user-avatar-circle">
                <UserIcon size={14} className="text-cyan" />
              </div>
              <span className="user-display-name">{user?.name || 'Engineer'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="logout-btn"
              title="Log out of session"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="nexus-workspace">
        <Sidebar />
        <main className="nexus-canvas-container">
          <Canvas />
        </main>
      </div>

      {/* Live Telemetry & Stats Panel Drawer */}
      {showDataPanel && (
        <div className="telemetry-drawer-day3">
          <div className="drawer-header">
            <div className="drawer-title">
              <Activity size={18} className="text-cyan" />
              <div>
                <h3>Recent Telemetry & Aggregation Stats</h3>
                <span className="drawer-subtitle">
                  Auto-refreshing every 5 seconds • Protected API
                  {lastUpdated && ` (Updated ${lastUpdated.toLocaleTimeString()})`}
                </span>
              </div>
            </div>
            <button onClick={() => setShowDataPanel(false)} className="drawer-close">
              <X size={18} />
            </button>
          </div>

          <div className="drawer-filters-row">
            <div className="filter-group">
              <label>Filter Device:</label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="filter-select"
              >
                <option value="">All Ingested Devices</option>
                <option value="turbine-01">turbine-01</option>
                <option value="turbine-02">turbine-02</option>
                <option value="compressor-03">compressor-03</option>
                <option value="generator-04">generator-04</option>
                <option value="pump-05">pump-05</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Time Window:</label>
              <select
                value={statsMinutes}
                onChange={(e) => setStatsMinutes(Number(e.target.value))}
                className="filter-select"
              >
                <option value="15">Last 15 minutes</option>
                <option value="60">Last 1 hour</option>
                <option value="360">Last 6 hours</option>
                <option value="1440">Last 24 hours</option>
              </select>
            </div>

            <button
              onClick={fetchTelemetryData}
              className="btn-refresh-telemetry"
              title="Manual refresh"
            >
              <RefreshCw size={13} className={telemetryLoading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="drawer-content">
            {/* Telemetry Stats Cards */}
            <div className="stats-cards-grid">
              <div className="stat-metric-card">
                <div className="stat-card-title">
                  <BarChart3 size={14} className="text-cyan" />
                  <span>Total Ingested</span>
                </div>
                <div className="stat-card-value text-cyan">
                  {telemetryStats ? telemetryStats.count.toLocaleString() : '—'}
                </div>
                <span className="stat-card-desc">records in window</span>
              </div>

              <div className="stat-metric-card">
                <div className="stat-card-title">
                  <ArrowDownRight size={14} className="text-green" />
                  <span>Min Value</span>
                </div>
                <div className="stat-card-value text-green">
                  {telemetryStats?.min !== null ? telemetryStats?.min : '—'}
                </div>
                <span className="stat-card-desc">lowest reading</span>
              </div>

              <div className="stat-metric-card">
                <div className="stat-card-title">
                  <ArrowUpRight size={14} className="text-orange" />
                  <span>Max Value</span>
                </div>
                <div className="stat-card-value text-orange">
                  {telemetryStats?.max !== null ? telemetryStats?.max : '—'}
                </div>
                <span className="stat-card-desc">highest peak</span>
              </div>

              <div className="stat-metric-card">
                <div className="stat-card-title">
                  <TrendingUp size={14} className="text-purple" />
                  <span>Average</span>
                </div>
                <div className="stat-card-value text-purple">
                  {telemetryStats?.avg !== null ? telemetryStats?.avg : '—'}
                </div>
                <span className="stat-card-desc">mean metric value</span>
              </div>
            </div>

            {/* Error Message */}
            {telemetryError && (
              <div className="telemetry-error-box">
                <AlertCircle size={16} />
                <span>{telemetryError}</span>
              </div>
            )}

            {/* Telemetry Table */}
            {telemetryLoading && recentTelemetry.length === 0 ? (
              <div className="empty-telemetry">
                <RefreshCw size={24} className="spin text-cyan" />
                <p>Loading live telemetry from MongoDB Time-Series collection...</p>
              </div>
            ) : recentTelemetry.length === 0 ? (
              <div className="empty-telemetry">
                <Database size={28} className="text-muted" />
                <p>No telemetry records found for this filter.</p>
                <p className="subtext">
                  Run <code>npm run mock</code> in <code>/backend</code> or execute <code>npm run loadtest</code> to stream records into MongoDB!
                </p>
              </div>
            ) : (
              <div className="telemetry-table-wrapper">
                <table className="telemetry-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Device ID</th>
                      <th>Sensor</th>
                      <th>Recorded Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTelemetry.map((row) => (
                      <tr key={row._id || Math.random()}>
                        <td className="timestamp-cell">
                          <Clock size={12} className="inline-icon" />
                          <span>{new Date(row.timestamp).toLocaleTimeString()}</span>
                        </td>
                        <td>
                          <code className="device-tag">{row.metadata?.deviceId || '-'}</code>
                        </td>
                        <td>
                          <span className="sensor-tag">{row.metadata?.sensorType || '-'}</span>
                        </td>
                        <td className="font-semibold text-cyan">
                          {row.value} <span className="unit-text">{row.metadata?.unit || ''}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
