const SALARY = 2500;
const GOAL = 4800;
const MONTHS = 12;
const MONTHLY_GOAL = GOAL / MONTHS; // 400
const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const DEFAULTS = [
  { id:'aluguel',     label:'Aluguel',           value:800,  min:600,  max:1200, color:'#6b7280', tip:'Custo fixo — difícil de reduzir no curto prazo.' },
  { id:'super',       label:'Supermercado',       value:750,  min:400,  max:900,  color:'#d97706', tip:'Planejamento de compras pode reduzir em até R$150.' },
  { id:'transporte',  label:'Transporte',         value:250,  min:100,  max:350,  color:'#7c3aed', tip:'Carona ou transporte público ajudam a reduzir.' },
  { id:'internet',    label:'Internet e celular', value:150,  min:80,   max:200,  color:'#0284c7', tip:'Renegociar plano ou combinar com familiar reduz o custo.' },
  { id:'lazer',       label:'Lazer',              value:350,  min:50,   max:500,  color:'#db2777', tip:'Lazer gratuito (parques, streamings compartilhados) ajuda muito.' },
  { id:'assinaturas', label:'Assinaturas',        value:100,  min:0,    max:200,  color:'#059669', tip:'Cancele assinaturas não usadas — economia imediata.' },
];

let categories = DEFAULTS.map(c => ({ ...c }));
let barChartInstance = null;
let lineChartInstance = null;

const fmt = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function getBalance() {
  const total = categories.reduce((s, c) => s + c.value, 0);
  return SALARY - total;
}

function buildSliders() {
  const container = document.getElementById('sliders-container');
  container.innerHTML = '';
  categories.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'slider-row';
    const pct = ((cat.value - cat.min) / (cat.max - cat.min)) * 100;
    row.innerHTML = `
      <div class="slider-top">
        <div class="slider-name">
          <span class="slider-dot" style="background:${cat.color}"></span>
          <span>${cat.label}</span>
        </div>
        <span class="slider-val mono" style="color:${cat.color}" id="val-${cat.id}">${fmt(cat.value)}</span>
      </div>
      <input type="range" min="${cat.min}" max="${cat.max}" step="10" value="${cat.value}"
        id="range-${cat.id}" style="color:${cat.color};
        background: linear-gradient(to right, ${cat.color} ${pct}%, #e5e7eb ${pct}%)" />
      <div class="slider-limits">
        <span>${fmt(cat.min)}</span><span>${fmt(cat.max)}</span>
      </div>
      <p class="slider-tip">💡 ${cat.tip}</p>
    `;
    container.appendChild(row);

    const input = row.querySelector('input');
    input.addEventListener('input', () => {
      const val = Number(input.value);
      cat.value = val;
      const p = ((val - cat.min) / (cat.max - cat.min)) * 100;
      input.style.background = `linear-gradient(to right, ${cat.color} ${p}%, #e5e7eb ${p}%)`;
      document.getElementById(`val-${cat.id}`).textContent = fmt(val);
      updateAll();
    });
  });
}

function updateSummary() {
  const total = categories.reduce((s, c) => s + c.value, 0);
  const balance = SALARY - total;
  const savings12 = Math.max(balance, 0) * 12;
  const pct = Math.min((savings12 / GOAL) * 100, 100);
  const canReach = balance >= MONTHLY_GOAL;

  // Balance card
  const card = document.getElementById('balanceCard');
  card.className = 'card balance-card ' + (balance >= 0 ? (canReach ? 'ok' : '') : 'bad');
  document.getElementById('balanceValue').textContent = fmt(balance);

  // Savings / progress
  document.getElementById('savings12').textContent = fmt(savings12);
  const bar = document.getElementById('progressBar');
  bar.style.width = pct + '%';
  bar.className = 'progress-bar' + (canReach ? '' : ' bad');

  const status = document.getElementById('goalStatus');
  if (canReach) {
    status.textContent = `✅ Meta atingida! Sobram ${fmt(savings12 - GOAL)}`;
  } else if (balance <= 0) {
    status.textContent = '❌ Saldo negativo — revise as despesas.';
  } else {
    status.textContent = `⚠️ Faltam ${fmt(GOAL - savings12)} após 12 meses`;
  }

  // Stats
  document.getElementById('statTotal').textContent = fmt(total);
  document.getElementById('statMonths').textContent = balance > 0 ? `${Math.ceil(GOAL / balance)} meses` : '—';
  document.getElementById('statPctSpent').textContent = ((total / SALARY) * 100).toFixed(1) + '%';
  document.getElementById('statPctSaved').textContent = balance > 0 ? ((balance / SALARY) * 100).toFixed(1) + '%' : '0%';
}

function updateBarChart() {
  const labels = categories.map(c => c.label);
  const data = categories.map(c => c.value);
  const colors = categories.map(c => c.color);

  if (barChartInstance) {
    barChartInstance.data.datasets[0].data = data;
    barChartInstance.update();
    return;
  }

  const ctx = document.getElementById('barChart').getContext('2d');
  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderRadius: 4, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.raw) } } },
      scales: {
        x: { ticks: { font: { size: 10 }, maxRotation: 30 }, grid: { display: false } },
        y: { ticks: { font: { size: 10 }, callback: v => `R$${v}` }, grid: { color: '#f0f0f0' } }
      }
    }
  });
}

function updateLineChart() {
  const balance = getBalance();
  document.getElementById('lineBalance').textContent = fmt(balance);

  const accumulated = MONTH_LABELS.map((_, i) => Math.min((i + 1) * Math.max(balance, 0), GOAL));

  // Milestones
  const ms = document.getElementById('milestones');
  ms.innerHTML = [3, 6, 9, 12].map(m => `
    <div class="milestone">
      <p class="milestone-label">${m}º mês</p>
      <p class="milestone-value">${fmt(Math.min(m * Math.max(balance, 0), GOAL))}</p>
    </div>
  `).join('');

  if (lineChartInstance) {
    lineChartInstance.data.datasets[0].data = accumulated;
    lineChartInstance.update();
    return;
  }

  const ctx = document.getElementById('lineChart').getContext('2d');
  lineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: MONTH_LABELS,
      datasets: [
        {
          label: 'Economia acumulada',
          data: accumulated,
          borderColor: '#52b788', backgroundColor: 'rgba(82,183,136,0.1)',
          borderWidth: 2.5, pointRadius: 4, fill: true, tension: 0.3
        },
        {
          label: 'Meta R$ 4.800',
          data: Array(12).fill(GOAL),
          borderColor: '#2d6a4f', borderDash: [6, 3],
          borderWidth: 1.5, pointRadius: 0, fill: false
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => fmt(ctx.raw) } }
      },
      scales: {
        x: { ticks: { font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { font: { size: 10 }, callback: v => `R$${(v/1000).toFixed(1)}k` }, grid: { color: '#f0f0f0' } }
      }
    }
  });
}

function updateScenarioTable() {
  const balance = getBalance();
  const scenarios = [
    { label: 'Orçamento original',           saldo: 100 },
    { label: 'Orçamento atual (simulado)',    saldo: balance },
    { label: 'Meta mínima necessária',        saldo: 400 },
    { label: 'Economia agressiva (−R$300)',   saldo: balance + 300 },
  ];
  const tbody = document.getElementById('scenarioBody');
  tbody.innerHTML = scenarios.map(s => {
    const ok = s.saldo >= MONTHLY_GOAL;
    return `
      <tr>
        <td>${s.label}</td>
        <td class="right">${fmt(s.saldo)}</td>
        <td class="right">${fmt(Math.max(s.saldo, 0) * 12)}</td>
        <td class="right">${s.saldo > 0 ? Math.ceil(GOAL / s.saldo) + ' meses' : '—'}</td>
        <td class="right"><span class="${ok ? 'badge-ok' : 'badge-bad'}">${ok ? '✓ Atinge' : '✗ Não atinge'}</span></td>
      </tr>
    `;
  }).join('');
}

function updateAll() {
  updateSummary();
  updateBarChart();
  updateLineChart();
  updateScenarioTable();
}

// TABS
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    // re-render charts after tab switch (canvas size may have changed)
    setTimeout(updateAll, 50);
  });
});

// RESET
document.getElementById('btnReset').addEventListener('click', () => {
  categories = DEFAULTS.map(c => ({ ...c }));
  if (barChartInstance) { barChartInstance.destroy(); barChartInstance = null; }
  if (lineChartInstance) { lineChartInstance.destroy(); lineChartInstance = null; }
  buildSliders();
  updateAll();
});

// INIT
buildSliders();
updateAll();