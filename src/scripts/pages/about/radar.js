(() => {
  const card = document.querySelector('.about-radar');
  if (!card || !window.ApexCharts) return;

  // Edit each group's labels and scores here.
  const groups = {
    soft: {
      title: 'Kỹ năng mềm', description: 'Giao tiếp, quản lý và phối hợp cùng đội ngũ.', max: 10,
      labels: ['Lãnh đạo', 'Giao tiếp', 'Đào tạo', 'Đồng hành', 'Chiến lược', 'Trình bày', 'Quyết định', 'Thích nghi'],
      data: [8, 8, 10, 9, 7, 9, 10, 9],
    },
    hard: {
      title: 'Chuyên môn', description: 'Kinh doanh và tối ưu hoạt động thương mại điện tử.', max: 10,
      labels: ['Vận hành', 'Quy trình', 'Dữ liệu', 'Báo cáo', 'Kinh doanh', 'Dự án', 'Hệ thống', 'Tối ưu'],
      data: [10, 9, 8, 8, 8, 8, 9, 8],
    },
    tools: {
      title: 'Công cụ', description: 'Những trợ thủ hỗ trợ công việc mỗi ngày.', max: 10,
      labels: ['Sheets', 'Excel', 'Power BI', 'Canva', 'Figma', 'AI', 'Automation'],
      data: [9, 8, 7, 7, 7, 8, 9],
    },
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const buttons = [...card.querySelectorAll('[data-radar-tab]')];
  const panel = card.querySelector('[role="tabpanel"]');
  const mount = card.querySelector('.about-radar-chart');
  const values = card.querySelector('.about-radar-values');
  const note = card.querySelector('.about-radar-note');
  let active = 'soft';
  let chart;

  const format = (value, group) => `${value} / ${group.max}`;
  const radius = (width, height) => Math.max(36, Math.min(96, (width - 156) / 2, (height - 58) / 2));
  const optionsFor = group => ({
    series: [{ name: group.title, data: [...group.data] }],
    xaxis: { categories: [...group.labels], labels: { style: { colors: group.labels.map(() => '#526887'), fontSize: '11px' } } },
    yaxis: { min: 0, max: group.max, tickAmount: 5, show: false },
    tooltip: { y: { formatter: value => format(value, group) } },
  });

  function showGroup(key) {
    active = key;
    const group = groups[key];
    for (const button of buttons) {
      const selected = button.dataset.radarTab === key;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    panel.setAttribute('aria-labelledby', `radar-tab-${key}`);
    card.querySelector('h2').textContent = group.title;
    card.querySelector('.about-radar-description').textContent = group.description;
    if (note) note.textContent = 'Thang điểm 10';
    values.replaceChildren(...group.labels.map((label, index) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const score = document.createElement('dd');
      term.textContent = label;
      score.textContent = format(group.data[index], group);
      row.append(term, score);
      return row;
    }));
  }

  function fallback() {
    card.classList.remove('is-ready');
    mount.hidden = true;
  }

  async function select(key) {
    if (key === active) return;
    showGroup(key);
    try { await chart.updateOptions(optionsFor(groups[key]), false, !reduced.matches); }
    catch { fallback(); }
  }

  mount.hidden = false;
  chart = new ApexCharts(mount, {
    ...optionsFor(groups.soft),
    chart: {
      type: 'radar', height: mount.clientHeight, fontFamily: '"Be Vietnam Pro", Arial, sans-serif', foreColor: '#526887',
      toolbar: { show: false }, parentHeightOffset: 0,
      redrawOnParentResize: false, redrawOnWindowResize: false,
      animations: { enabled: !reduced.matches, speed: 600, dynamicAnimation: { speed: 450 } },
    },
    colors: ['#4d6fa5'], stroke: { width: 2 }, fill: { opacity: .22 },
    markers: { size: 4, colors: ['#4d6fa5'], strokeColors: '#fbfcff', strokeWidth: 2, hover: { size: 6 } },
    plotOptions: { radar: { size: radius(mount.clientWidth, mount.clientHeight), offsetX: 14, polygons: { strokeColors: '#d5e2f6', connectorColors: '#d5e2f6', fill: { colors: ['#f5f8ff', '#edf3fc'] } } } },
    dataLabels: { enabled: false }, legend: { show: false }, grid: { padding: { top: 8, right: 0, bottom: 0, left: 0 } },
  });
  chart.render().then(() => {
    card.classList.add('is-ready');
    for (const button of buttons) {
      button.disabled = false;
      button.addEventListener('click', () => void select(button.dataset.radarTab));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const index = buttons.indexOf(button);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next].focus();
        void select(buttons[next].dataset.radarTab);
      });
    }
    let width = mount.clientWidth;
    let height = 0;
    new ResizeObserver(() => {
      if (Math.abs(mount.clientWidth - width) < 1 && Math.abs(mount.clientHeight - height) < 1) return;
      width = mount.clientWidth;
      height = mount.clientHeight;
      void chart.updateOptions({ chart: { height }, plotOptions: { radar: { size: radius(width, height) } } }, false, false).catch(fallback);
    }).observe(mount);
    reduced.addEventListener('change', () => {
      void chart.updateOptions({ chart: { animations: { enabled: !reduced.matches } } }, false, false).catch(fallback);
    });
  }).catch(fallback);
})();
