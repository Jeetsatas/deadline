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
} from 'recharts';
import { BarChart3, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { deadlines, stats } = useDeadlineStore();
  const statistics = stats();

  // Priority data
  const priorityCount: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  deadlines.forEach((d) => {
    if (priorityCount[d.priority] !== undefined) priorityCount[d.priority]++;
  });

  const priorityChartData = [
    { name: 'Critical', count: priorityCount.critical, fill: '#ef4444' },
    { name: 'High', count: priorityCount.high, fill: '#f59e0b' },
    { name: 'Medium', count: priorityCount.medium, fill: '#3b82f6' },
    { name: 'Low', count: priorityCount.low, fill: '#10b981' },
  ];

  // Category data
  const categoryCount: Record<string, number> = {};
  deadlines.forEach((d) => {
    const type = d.deliverableType || 'other';
    categoryCount[type] = (categoryCount[type] || 0) + 1;
  });

  const categoryChartData = Object.entries(categoryCount).map(([key, val]) => ({
    name: key.replace('_', ' '),
    count: val,
  }));

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#eab308'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Execution Velocity & Analytics
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Measure delivery rates, output throughput, and workload distribution.
          </p>
        </div>
      </div>

      {/* Top Velocity Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Delivery Rate
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
            {statistics.deliveryRate}%
          </div>
          <p className="text-[11px] text-muted-foreground">
            {statistics.completed} out of {statistics.total} projects delivered
          </p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Active In Flight
            </span>
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-primary">
            {statistics.active}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Projects currently being executed
          </p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Overdue Risk
            </span>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-red-500">
            {statistics.overdue}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Projects requiring emergency scope trimming
          </p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Target Deliverables
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
            {statistics.completed}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Completed outputs in Deliverable Hub
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution Chart */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Deadlines by Priority
            </h3>
            <p className="text-xs text-muted-foreground">
              Distribution of current projects across priority bands.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deliverable Types Breakdown */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Deliverable Categories
            </h3>
            <p className="text-xs text-muted-foreground">
              Breakdown by output medium (prototypes, software, papers, etc.)
            </p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {categoryChartData.length === 0 ? (
              <p className="text-xs text-muted-foreground">No deliverable data available</p>
            ) : (
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
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                    fontSize={11}
                  >
                    {categoryChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
