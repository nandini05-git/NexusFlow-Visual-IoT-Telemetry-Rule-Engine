import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Canvas from '../components/Canvas';
import Sidebar from '../components/Sidebar';
import { checkHealth, getTelemetry } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Server,
  Database,
  RefreshCw,
  LogOut,
  User as UserIcon,
  Radio,
  Sliders,
  ChevronDown,
} from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [healthStatus, setHealthStatus] = useState({
    status: 'checking',
    database: 'checking',
    service: '',
    error: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentTelemetry, setRecentTelemetry] = useState([]);
  const [showDataDrawer, setShowDataDrawer] = useState(false);

  const fetchHealth = useCallback(async () => {
    setIsRefreshing(true);
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
      setIsRefreshing(false);
    }
  }, []);

  const fetchRecentTelemetry = useCallback(async () => {
    try {
      const res = await getTelemetry('turbine-01', 5);
      if (res && res.data) {
        setRecentTelemetry(res.data);
      }
    } catch (err) {
      console.debug('Telemetry query notice:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchRecentTelemetry();
    const interval = setInterval(() => {
      fetchHealth();
      fetchRecentTelemetry();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchHealth, fetchRecentTelemetry]);

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
          <span className="version-pill">Workspace • Day 2</span>
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
              disabled={isRefreshing}
              className="refresh-btn"
              title="Refresh backend status"
            >
              <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
            </button>
          </div>

          {/* Telemetry Feed Toggle */}
          <button
            onClick={() => setShowDataDrawer(!showDataDrawer)}
            className="toggle-drawer-btn"
            title="Inspect latest ingested telemetry"
          >
            <Activity size={15} />
            <span>Telemetry Feed</span>
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

      {/* Drawer for Live Telemetry Inspection */}
      {showDataDrawer && (
        <div className="telemetry-drawer">
          <div className="drawer-header">
            <div className="drawer-title">
              <Activity size={16} className="text-cyan" />
              <h3>Recent Ingested Telemetry</h3>
            </div>
            <button onClick={() => setShowDataDrawer(false)} className="drawer-close">
              ×
            </button>
          </div>
          <div className="drawer-content">
            {recentTelemetry.length === 0 ? (
              <div className="empty-telemetry">
                <p>No telemetry recorded yet in database.</p>
                <p className="subtext">
                  Run <code>npm run mock</code> in <code>/backend</code> to stream turbine sensor readings!
                </p>
              </div>
            ) : (
              <div className="telemetry-table-wrapper">
                <table className="telemetry-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Device</th>
                      <th>Sensor</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTelemetry.map((row) => (
                      <tr key={row._id || Math.random()}>
                        <td>{new Date(row.timestamp).toLocaleTimeString()}</td>
                        <td>
                          <code>{row.metadata?.deviceId || '-'}</code>
                        </td>
                        <td>{row.metadata?.sensorType || '-'}</td>
                        <td className="font-semibold text-cyan">
                          {row.value} {row.metadata?.unit || ''}
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
