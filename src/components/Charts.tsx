import React from 'react';

interface ChartDataItem {
  name: string;
  value: number;
}

interface LineChartProps {
  data: ChartDataItem[];
  color?: string;
  height?: number;
  label?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  color = '#3b82f6',
  height = 200,
  label = 'Value',
}) => {
  if (!data || data.length === 0) return <div className="text-sm text-gray-400 py-6 text-center">No data available</div>;

  const maxVal = Math.max(...data.map((d) => d.value), 1) * 1.1; // adding padding on top
  const padding = 40;
  const chartHeight = height - padding * 2;
  const chartWidth = 500;
  
  // Calculate points
  const points = data.map((d, index) => {
    const x = padding + (index * (chartWidth - padding * 2)) / (data.length - 1 || 1);
    const y = height - padding - (d.value / maxVal) * chartHeight;
    return { x, y, name: d.name, value: d.value };
  });

  const pathD = points.length > 0
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
    : '';

  // Area under path
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : '';

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${chartWidth} ${height}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id={`areaGrad_${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = height - padding - ratio * chartHeight;
          const valLabel = Math.round(ratio * maxVal);
          return (
            <g key={i} className="opacity-15">
              <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
              <text x={padding - 8} y={y + 4} fill="#64748b" fontSize="10" className="text-right" textAnchor="end">{valLabel}</text>
            </g>
          );
        })}

        {/* X Axis labels */}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={height - padding + 18} fill="#64748b" fontSize="9" textAnchor="middle" className="opacity-80">
            {p.name}
          </text>
        ))}

        {/* Filled Area */}
        {areaD && (
          <path d={areaD} fill={`url(#areaGrad_${color.replace('#', '')})`} />
        )}

        {/* Main Line */}
        {pathD && (
          <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Circle Dots and Values */}
        {points.map((p, i) => (
          <g key={i} className="group cursor-pointer">
            <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke={color} strokeWidth="3" />
            <circle cx={p.x} cy={p.y} r="10" fill={color} className="opacity-0 hover:opacity-15 transition-opacity" />
            {/* Tooltip on SVG hover */}
            <title>{`${p.name}: ${p.value} ${label}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
};

interface BarChartProps {
  data: ChartDataItem[];
  color?: string;
  height?: number;
  label?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  color = '#10b981',
  height = 200,
  label = 'Count',
}) => {
  if (!data || data.length === 0) return <div className="text-sm text-gray-400 py-6 text-center">No statistical data</div>;

  const maxVal = Math.max(...data.map((d) => d.value), 1) * 1.1;
  const padding = 40;
  const chartHeight = height - padding * 2;
  const chartWidth = 500;
  const availWidth = chartWidth - padding * 2;
  const barGap = 12;
  const barWidth = Math.max(8, (availWidth - barGap * (data.length - 1)) / data.length);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${chartWidth} ${height}`} className="w-full overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = height - padding - ratio * chartHeight;
          const valLabel = Math.round(ratio * maxVal);
          return (
            <g key={i} className="opacity-15">
              <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#64748b" strokeWidth="1" />
              <text x={padding - 8} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end">{valLabel}</text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x = padding + i * (barWidth + barGap);
          const barH = (d.value / maxVal) * chartHeight;
          const y = height - padding - barH;

          return (
            <g key={i} className="group cursor-pointer">
              {/* Rounded Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(2, barH)}
                fill={color}
                rx={Math.min(4, barWidth / 2)}
                className="hover:opacity-85 transition-all"
              />
              
              {/* Value Label on top of Bar */}
              {d.value > 0 && (
                <text x={x + barWidth / 2} y={y - 6} fill="#334155" fontSize="9" fontWeight="600" textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.value}
                </text>
              )}

              {/* X Axis labels */}
              <text x={x + barWidth / 2} y={height - padding + 18} fill="#64748b" fontSize="9" textAnchor="middle" className="font-sans font-medium">
                {d.name.length > 8 ? `${d.name.substring(0, 7)}...` : d.name}
              </text>

              <title>{`${d.name}: ${d.value} ${label}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
