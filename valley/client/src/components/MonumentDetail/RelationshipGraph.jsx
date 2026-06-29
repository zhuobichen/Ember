import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export function RelationshipGraph({ relationships }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !relationships || !relationships.nodes || relationships.nodes.length === 0) {
      return;
    }

    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    const categories = (relationships.categories || []).map((cat, i) => {
      const colors = ['#d4a574', '#e87878', '#5fb8a8', '#8a8580', '#6b5b8a'];
      return { name: cat.name, itemStyle: { color: colors[i % colors.length] } };
    });

    const nodes = relationships.nodes.map(node => ({
      name: node.name,
      value: node.value || 0,
      symbolSize: node.symbolSize || 30,
      category: node.category || 3,
      draggable: true
    }));

    const links = relationships.links.map(link => ({
      source: link.source,
      target: link.target,
      value: link.value || 0,
      lineStyle: {
        width: Math.max(1, Math.min(10, (link.value || 0) / 50))
      }
    }));

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          if (params.dataType === 'node') {
            return `${params.name}<br/>消息数: ${params.value}`;
          }
          return `${params.data.source} → ${params.data.target}<br/>互动数: ${params.data.value}`;
        },
        backgroundColor: 'rgba(21, 21, 31, 0.95)',
        borderColor: '#2a2a3a',
        textStyle: { color: '#e8e4d8' }
      },
      legend: {
        data: categories.map(c => c.name),
        textStyle: { color: '#8a8580' },
        bottom: 0
      },
      series: [{
        type: 'graph',
        layout: 'force',
        data: nodes,
        links: links,
        categories: categories,
        roam: true,
        label: {
          show: true,
          position: 'right',
          color: '#e8e4d8',
          fontSize: 12
        },
        lineStyle: {
          color: 'source',
          curveness: 0.3,
          opacity: 0.6
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 2 }
        },
        force: {
          repulsion: 200,
          edgeLength: [80, 200],
          gravity: 0.1
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
  }, [relationships]);

  if (!relationships || !relationships.nodes || relationships.nodes.length === 0) {
    return null;
  }

  return (
    <div className="md-section">
      <h2 className="md-section-title">关系图谱</h2>
      <div ref={chartRef} className="md-chart md-graph"></div>
    </div>
  );
}
