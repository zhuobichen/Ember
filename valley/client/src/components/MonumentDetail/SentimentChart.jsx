import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export function SentimentChart({ sentiment }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !sentiment) {
      return;
    }

    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    const byYear = sentiment.byYear || [];
    const years = byYear.map(item => item.year);
    const scores = byYear.map(item => (item.score * 100).toFixed(1));

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const data = params[0];
          const val = parseFloat(data.value);
          const type = val >= 0 ? '正面' : '负面';
          return `${data.name}年<br/>情感倾向: ${type}<br/>情感指数: ${val}%`;
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
        data: years,
        axisLine: { lineStyle: { color: '#2a2a3a' } },
        axisLabel: { color: '#8a8580' }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#2a2a3a' } },
        axisLabel: {
          color: '#8a8580',
          formatter: '{value}%'
        },
        splitLine: { lineStyle: { color: '#2a2a3a' } }
      },
      series: [{
        type: 'line',
        data: scores,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: '#d4a574',
          width: 2
        },
        itemStyle: {
          color: '#d4a574'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(212, 165, 116, 0.3)' },
            { offset: 1, color: 'rgba(212, 165, 116, 0.02)' }
          ])
        },
        markLine: {
          silent: true,
          data: [{ yAxis: 0 }],
          lineStyle: { color: '#2a2a3a', type: 'dashed' },
          label: { show: false }
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
  }, [sentiment]);

  if (!sentiment) {
    return null;
  }

  const { positiveCount, negativeCount, neutralCount } = sentiment;

  return (
    <div className="md-section">
      <h2 className="md-section-title">情感分析</h2>
      <div className="md-sentiment-overview">
        <div className="md-sentiment-card md-sentiment-positive">
          <div className="md-sentiment-num">{positiveCount || 0}</div>
          <div className="md-sentiment-label">正面消息</div>
        </div>
        <div className="md-sentiment-card md-sentiment-neutral">
          <div className="md-sentiment-num">{neutralCount || 0}</div>
          <div className="md-sentiment-label">中性消息</div>
        </div>
        <div className="md-sentiment-card md-sentiment-negative">
          <div className="md-sentiment-num">{negativeCount || 0}</div>
          <div className="md-sentiment-label">负面消息</div>
        </div>
      </div>
      {sentiment.byYear && sentiment.byYear.length > 0 && (
        <div ref={chartRef} className="md-chart md-sentiment-chart"></div>
      )}
    </div>
  );
}
