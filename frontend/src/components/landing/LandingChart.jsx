import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function LandingChart({ theme = 'dark' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    const isLight = theme === 'light';
    const chartGradient = context.createLinearGradient(0, 0, 0, 260);
    chartGradient.addColorStop(0, isLight ? 'rgba(14, 165, 233, 0.42)' : 'rgba(34, 197, 94, 0.42)');
    chartGradient.addColorStop(1, 'rgba(14, 165, 233, 0)');

    const chart = new Chart(context, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Portfolio',
            data: [24, 29, 31, 37, 43, 51, 58],
            borderColor: isLight ? '#0284c7' : '#22c55e',
            backgroundColor: chartGradient,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: isLight ? '#0f172a' : '#020617',
            pointBorderColor: isLight ? '#0284c7' : '#22c55e',
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isLight ? 'rgba(15, 23, 42, 0.95)' : 'rgba(2, 6, 23, 0.96)',
            titleColor: '#f8fafc',
            bodyColor: '#e2e8f0',
            borderColor: isLight ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.18)',
            borderWidth: 1,
            displayColors: false
          }
        },
        scales: {
          x: {
            ticks: { color: isLight ? '#475569' : '#94a3b8' },
            grid: { color: isLight ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.12)' }
          },
          y: {
            ticks: { color: isLight ? '#475569' : '#94a3b8' },
            grid: { color: isLight ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.12)' }
          }
        }
      }
    });

    return () => chart.destroy();
  }, [theme]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}
