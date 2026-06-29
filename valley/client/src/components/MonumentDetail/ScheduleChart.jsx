import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export function ScheduleChart({ schedule }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !schedule || !schedule.hourlyDistribution) {
      return;
    }

    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    const hours = [];
    const data = [];
    for (let i = 0; i < 24; i++) {
      hours.push(`${i}时`);
      data.push(schedule.hourlyDistribution[i] || 0);
    }

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          return `${params[0].name}<br/>消息数: ${params[0].value}`;
        },
        backgroundColor: 'rgba(21, 21, 31, 0.95)',
        borderColor: '#2a2a3a',
        textStyle: { color: '#e8e4d8' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: hours,
        axisLine: { lineStyle: { color: '#2a2a3a' } },
        axisLabel: {
          color: '#8a8580',
          interval: 2,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#2a2a3a' } },
        axisLabel: { color: '#8a8580' },
        splitLine: { lineStyle: { color: '#2a2a3a' } }
      },
      series: [{
        type: 'bar',
        data: data.map((value, index) => {
          const isNight = (index >= 23 || index <= 5);
          const isActive = index === schedule.mostActiveHour;
          return {
            value,
            itemStyle: {
              color: isActive
                ? '#d4a574'
                : isNight
                ? '#6b5b8a'
                : '#5fb8a8'
            }
          };
        }),
        barWidth: '60%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0]
        }
      }]
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [schedule]);

  if (!schedule || !schedule.hourlyDistribution) {
    return null;
  }

  const { mostActiveHour, lateNightRatio, isNightOwl } = schedule;

  return (
    <div className="md-section">
      <h2 className="md-section-title">作息分布</h2>
      <div ref={chartRef} className="md-chart md-schedule-chart"></div>
      <div className="md-schedule-info">
        <div className="md-schedule-info-item">
          <span className="md-schedule-info-label">最活跃时段</span>
          <span className="md-schedule-info-value">{mostActiveHour}:00</span>
        </div>
        <div className="md-schedule-info-item">
          <span className="md-schedule-info-label">深夜消息占比</span>
          <span className="md-schedule-info-value">{((lateNightRatio || 0) * 100).toFixed(1)}%</span>
        </div>
        <div className="md-schedule-info-item">
          <span className="md-schedule-info-label">是否夜猫子</span>
          <span className="md-schedule-info-value">{isNightOwl ? '是' : '否'}</span>
        </div>
        <div className="md-schedule-info-item">
          <span className="md-schedule-info-label">统计时段</span>
          <span className="md-schedule-info-value">24小时</span>
        </div>
      </div>
    </div>
  );
}
