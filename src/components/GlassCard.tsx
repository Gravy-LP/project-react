import React from 'react';

interface GlassCardProps {
  title: string;
  icon?: string;
  value?: string;
  trend?: string;
  trendUp?: boolean;
  children?: React.ReactNode;
}

export default function GlassCard({ title, icon, value, trend, trendUp = true, children }: GlassCardProps) {
  return (
    <div className="glass-card glass-panel">
      <div className="glass-card-header">
        <h3 className="glass-card-title">{title}</h3>
        {icon && <i className={`ph ${icon} glass-card-icon`} />}
      </div>

      <div className="glass-card-body">
        {value && <div className="glass-card-value">{value}</div>}

        {trend && (
          <div className={`glass-card-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
            <i className={`ph ${trendUp ? 'ph-trend-up' : 'ph-trend-down'}`} />
            <span>{trend}</span>
          </div>
        )}

        <div className="glass-card-content">
          {children}
        </div>
      </div>
    </div>
  );
}
