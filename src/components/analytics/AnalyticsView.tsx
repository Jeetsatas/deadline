import React from 'react';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#eab308', '#06b6d4', '#64748b'];

export const AnalyticsView: React.FC = () => {
  const { deadlines, stats } = useDeadlineStore();
  const statistics = stats();

  const nowMs = Date.now();
  const completedDeadlines = deadlines.filter((d) => d.status === 'completed');
  const overdueDeadlines = deadlines.filter(
    (d) => d.status !== 'completed' && new Date(d.dueDateTime).getTime() < nowMs
  );

  // Calculate On-Time Delivery Rate
  const onTimeDelivered = completedDeadlines.filter((d) => {
    const deliveryDate = new Date(d.finalDeliverable?.submittedAt || d.updatedAt).getTime();
    const dueDate = new Date(d.dueDateTime).getTime();
    return deliveryDate <= dueDate;
  }).length;

  const onTimeRate =
    completedDeadlines.length > 0
      ? Math.round((onTimeDelivered / completedDeadlines.length) * 100)
      : completedDeadlines.length === 0 && deadlines.length > 0
      ? 100
      : 0;

  // Calculate Average Completion Time
  let totalCompletionDays = 0;
  let completionDataPoints = 0;

  completedDeadlines.forEach((d) => {
    const startMs = new Date(d.createdAt).getTime();
    const endMs = new Date(d.finalDeliverable?.submittedAt || d.updatedAt).getTime();
    if (endMs >= startMs) {
      const days = (endMs - startMs) / (1000 * 60 * 60 * 24);
      totalCompletionDays += days;
      completionDataPoints++;
    }
  });

  const avgCompletionDays =
    completionDataPoints > 0
      ? (totalCompletionDays / completionDataPoints).toFixed(1)
      : '0.0';

  // Category Distribution
  const categoryCounts: Record<string, number> = {};
  deadlines.forEach((d) => {
    const key = (d.deliverableType || 'other').replace('_', ' ');
    categoryCounts[key] = (categoryCounts[key] || 0) + 1;
  });

  const categoryChartData = Object.entries(categoryCounts).map(([name, count]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    count,
  }));

  // Execution Approach Distribution
  const approachCounts: Record<string, number> = {
    'Prototype First': 0,
    'Output Only': 0,
    'Guided Execution': 0,
  };

  deadlines.forEach((d) => {
    if (d.executionApproach === 'prototype_first') approachCounts['Prototype First']++;
    else if (d.executionApproach === 'output_only') approachCounts['Output Only']++;
    else approachCounts['Guided Execution']++;
  });

  const approachChartData = Object.entries(approachCounts).map(([name, count]) => ({
    name,
    count,
  }));

  // Priority Breakdown
  const priorityCounts: Record<string, number> = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
  };

  deadlines.forEach((d) => {
    if (d.priority === 'critical') priorityCounts.Critical++;
    else if (d.priority === 'high') priorityCounts.High++;
    else if (d.priority === 'medium') priorityCounts.Medium++;
    else priorityCounts.Low++;
  });

  const priorityChartData = [
    { name: 'Critical', count: priorityCounts.Critical, fill: '#ef4444' },
    { name: 'High', count: priorityCounts.High, fill: '#f59e0b' },
    { name: 'Medium', count: priorityCounts.Medium, fill: '#3b82f6' },
    { name: 'Low', count: priorityCounts.Low, fill: '#10b981' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Execution Analytics & Delivery Velocity
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Authentic performance telemetry measuring delivery efficiency, on-time rates, and output distribution.
          </p>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Deadlines */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Total Projects
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {statistics.total}
          </div>
          <span className="text-[10px] text-muted-foreground">All logged commitments</span>
        </div>

        {/* Delivered / Completed */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Completed Outputs
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-500">
            {completedDeadlines.length}
          </div>
          <span className="text-[10px] text-muted-foreground">Delivered & verified</span>
        </div>

        {/* Overdue / Missed */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Overdue Deadlines
          </span>
          <div
            className={`text-2xl font-bold font-mono tracking-tight ${
              overdueDeadlines.length > 0 ? 'text-rose-500' : 'text-foreground'
            }`}
          >
            {overdueDeadlines.length}
          </div>
          <span className="text-[10px] text-muted-foreground">Requires immediate MVP</span>
        </div>

        {/* Completion Rate */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Completion Rate
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-primary">
            {statistics.deliveryRate}%
          </div>
          <span className="text-[10px] text-muted-foreground">Delivered to total ratio</span>
        </div>

        {/* On-Time Rate */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            On-Time Delivery
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-500">
            {onTimeRate}%
          </div>
          <span className="text-[10px] text-muted-foreground">Delivered before deadline</span>
        </div>

        {/* Avg Completion Time */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Avg Turnaround
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {avgCompletionDays}d
          </div>
          <span className="text-[10px] text-muted-foreground">From planning to output</span>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deliverable Category Distribution */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              Deliverable Category Breakdown
            </h3>
            <span className="text-xs text-muted-foreground">
              {categoryChartData.length} active categories
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {categoryChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: 'var(--foreground)',
                  }}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority & Risk Distribution */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              Workload by Priority Tier
            </h3>
            <span className="text-xs text-muted-foreground">
              {statistics.active} in flight
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityChartData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: 'var(--foreground)',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Execution Approach Distribution */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Execution Methodology & Strategy
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Distribution across Prototype First, Output Only, and Guided Execution approaches.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {approachChartData.map((item) => {
              const pct = statistics.total > 0 ? Math.round((item.count / statistics.total) * 100) : 0;
              return (
                <div
                  key={item.name}
                  className="p-4 rounded-xl border border-border/80 bg-secondary/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{item.name}</span>
                    <span className="font-mono text-xs text-primary font-bold">{pct}%</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-foreground">
                    {item.count}
                  </div>
                  <div className="w-full bg-border/60 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
