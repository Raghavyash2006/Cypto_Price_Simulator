import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function PortfolioChart() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Portfolio XP',
            data: [14, 24, 33, 28, 41, 52, 60],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            fill: true,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
          y: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(148, 163, 184, 0.1)' } }
        }
      }
    });

    return () => chart.destroy();
  }, []);

  return <canvas ref={canvasRef} height="120" />;
}