import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminLayout } from '../components/AdminLayout';
import { BarChart, TrendingUp, Users } from 'lucide-react';
import axios from 'axios';
import Chart from 'chart.js/auto';
import { API_URL } from '../config';

interface ReportsData {
  registrations_by_month: { month: string; count: number }[];
  gender_distribution: { Male: number; Female: number; Other: number };
  membership_distribution: { Premium: number; Free: number };
  active_status_distribution: { Active: number; Suspended: number };
}

export const AdminReports: React.FC = () => {
  const navigate = useNavigate();
  const { adminToken } = useAdminAuth();
  
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Canvas references for Chart.js
  const registrationChartRef = useRef<HTMLCanvasElement | null>(null);
  const genderChartRef = useRef<HTMLCanvasElement | null>(null);
  const membershipChartRef = useRef<HTMLCanvasElement | null>(null);
  const activeStatusChartRef = useRef<HTMLCanvasElement | null>(null);

  // References to holds Chart instances for destruction on unmount
  const registrationChartInst = useRef<Chart | null>(null);
  const genderChartInst = useRef<Chart | null>(null);
  const membershipChartInst = useRef<Chart | null>(null);
  const activeStatusChartInst = useRef<Chart | null>(null);

  useEffect(() => {
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchReportsData();
  }, [adminToken, navigate]);

  const fetchReportsData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/admin/reports/`, {
        headers: { 'Authorization': `Token ${adminToken}` }
      });
      setData(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch reporting analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!data) return;

    // 1. Monthly Registration Line Chart
    if (registrationChartRef.current) {
      if (registrationChartInst.current) registrationChartInst.current.destroy();
      
      registrationChartInst.current = new Chart(registrationChartRef.current, {
        type: 'line',
        data: {
          labels: data.registrations_by_month.map(item => item.month),
          datasets: [{
            label: 'New Registrations',
            data: data.registrations_by_month.map(item => item.count),
            borderColor: '#800A3F',
            backgroundColor: 'rgba(128, 10, 63, 0.05)',
            tension: 0.3,
            fill: true,
            borderWidth: 3,
            pointBackgroundColor: '#800A3F',
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 }
            }
          }
        }
      });
    }

    // 2. Gender Distribution Doughnut Chart
    if (genderChartRef.current) {
      if (genderChartInst.current) genderChartInst.current.destroy();

      genderChartInst.current = new Chart(genderChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Male', 'Female', 'Other'],
          datasets: [{
            data: [
              data.gender_distribution.Male,
              data.gender_distribution.Female,
              data.gender_distribution.Other
            ],
            backgroundColor: ['#1A73E8', '#D93025', '#9AA0A6'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    // 3. Premium vs Free Doughnut Chart
    if (membershipChartRef.current) {
      if (membershipChartInst.current) membershipChartInst.current.destroy();

      membershipChartInst.current = new Chart(membershipChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Premium', 'Free (Standard)'],
          datasets: [{
            data: [
              data.membership_distribution.Premium,
              data.membership_distribution.Free
            ],
            backgroundColor: ['#D4A373', '#E6F4EA'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    // 4. Active vs Suspended Bar Chart
    if (activeStatusChartRef.current) {
      if (activeStatusChartInst.current) activeStatusChartInst.current.destroy();

      activeStatusChartInst.current = new Chart(activeStatusChartRef.current, {
        type: 'bar',
        data: {
          labels: ['Active Accounts', 'Suspended Accounts'],
          datasets: [{
            data: [
              data.active_status_distribution.Active,
              data.active_status_distribution.Suspended
            ],
            backgroundColor: ['#137333', '#B23B44'],
            borderWidth: 0,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 }
            }
          }
        }
      });
    }

    // Cleanup on unmount
    return () => {
      if (registrationChartInst.current) registrationChartInst.current.destroy();
      if (genderChartInst.current) genderChartInst.current.destroy();
      if (membershipChartInst.current) membershipChartInst.current.destroy();
      if (activeStatusChartInst.current) activeStatusChartInst.current.destroy();
    };
  }, [data]);

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ color: 'var(--primary-burgundy)', fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            Compiling analytical reports data...
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-pink-text)' }}>
          {error || 'Error loading reports data.'}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ marginBottom: '2.5rem', animation: 'fade-in 0.5s ease' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--primary-burgundy)', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
          Statistical Reports
        </h1>
        <p style={{ color: 'var(--text-medium)', fontSize: '1rem', margin: 0 }}>
          Interactive visualizations summarizing user growth, gender ratios, subscription tiers, and engagement status.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Registration Line Chart Card */}
        <div className="premium-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <TrendingUp size={20} style={{ color: 'var(--primary-burgundy)' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text-dark)', margin: 0 }}>
              Monthly User Registration Trend (Last 6 Months)
            </h3>
          </div>
          <div style={{ height: '320px', position: 'relative' }}>
            <canvas ref={registrationChartRef} />
          </div>
        </div>

        {/* 3-Column Distribution Charts Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem'
        }}>
          {/* Gender Ratio Card */}
          <div className="premium-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '380px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Users size={18} style={{ color: 'var(--primary-burgundy)' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--text-dark)', margin: 0 }}>
                Gender Distribution Ratio
              </h3>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <canvas ref={genderChartRef} />
            </div>
          </div>

          {/* Premium Subscription Distribution */}
          <div className="premium-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '380px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <BarChart size={18} style={{ color: 'var(--primary-burgundy)' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--text-dark)', margin: 0 }}>
                Membership Subscription Levels
              </h3>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <canvas ref={membershipChartRef} />
            </div>
          </div>

          {/* Account Status Distribution */}
          <div className="premium-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '380px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <BarChart size={18} style={{ color: 'var(--primary-burgundy)' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--text-dark)', margin: 0 }}>
                Account Active vs Suspended Status
              </h3>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <canvas ref={activeStatusChartRef} />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
