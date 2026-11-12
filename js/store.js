/**
 * METAS 2027 — STATE & DATA STORE
 * Manages hierarchical Areas -> Goals -> Activities (with unique Tags),
 * Habit Check-ins by date, and Daily Rich-Text Notes.
 */

const STORAGE_KEY = 'metas_2027_state_v1';

const AREA_COLORS = [
  { name: 'Azul Cupertino', hex: '#0071E3', soft: 'rgba(0, 113, 227, 0.12)' },
  { name: 'Verde Saúde', hex: '#28CD41', soft: 'rgba(40, 205, 65, 0.14)' },
  { name: 'Âmbar Energia', hex: '#FF9F0A', soft: 'rgba(255, 159, 10, 0.15)' },
  { name: 'Roxo Foco', hex: '#AF52DE', soft: 'rgba(175, 82, 222, 0.14)' },
  { name: 'Coral Vida', hex: '#FF2D55', soft: 'rgba(255, 45, 85, 0.13)' },
  { name: 'Turquesa Mente', hex: '#00C7BE', soft: 'rgba(0, 199, 190, 0.14)' },
  { name: 'Índigo Carreira', hex: '#5856D6', soft: 'rgba(88, 86, 214, 0.14)' }
];

function createDefaultDemoState() {
  return {
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    currentMonth: { year: 2027, month: 0 }, // 0 = Janeiro 2027
    areas: [
      {
        id: 'area-saude',
        name: 'Minha Saúde & Energia',
        color: '#28CD41',
        goals: [
          {
            id: 'goal-condicionamento',
            title: 'Atingir minha melhor forma física e disposição diária',
            description: 'Treinar com constância, correr 5km abaixo de 25min e dormir 8h.',
            activities: [
              { id: 'act-treino', name: 'Musculação ou funcional (45 min)', tag: 'TREINO' },
              { id: 'act-corrida', name: 'Corrida aeróbica ao ar livre', tag: 'CORRIDA' },
              { id: 'act-agua', name: 'Beber 3 litros de água no dia', tag: 'HIDRATAR' }
            ]
          }
        ]
      },
      {
        id: 'area-profissional',
        name: 'Vida Profissional & Carreira',
        color: '#0071E3',
        goals: [
          {
            id: 'goal-emprego',
            title: 'Conseguir um emprego melhor com bons benefícios',
            description: 'Aprimorar portfólio técnico, inglês fluente e networking estratégico.',
            activities: [
              { id: 'act-estudo', name: 'Estudo técnico aprofundado (1h)', tag: 'ESTUDO' },
              { id: 'act-ingles', name: 'Prática ativa de Inglês / Conversação', tag: 'INGLÊS' },
              { id: 'act-portfolio', name: 'Evoluir projetos práticos e GitHub', tag: 'PROJETOS' }
            ]
          }
        ]
      },
      {
        id: 'area-pessoal',
        name: 'Vida Pessoal & Mente',
        color: '#AF52DE',
        goals: [
          {
            id: 'goal-leitura',
            title: 'Ler 18 livros no ano e reduzir tempo de tela à noite',
            description: 'Cultivar presença, foco profundo e hábito de leitura diária.',
            activities: [
              { id: 'act-leitura', name: 'Ler pelo menos 15 páginas antes de dormir', tag: 'LEITURA' },
              { id: 'act-meditacao', name: '10 minutos de respiração e clareza mental', tag: 'MINDFUL' }
            ]
          }
        ]
      }
    ],
    // Format: { "2027-01-01": ["act-treino", "act-estudo"] }
    checks: {
      '2027-01-01': ['act-treino', 'act-agua', 'act-leitura', 'act-meditacao'],
      '2027-01-02': ['act-corrida', 'act-agua', 'act-estudo', 'act-ingles'],
      '2027-01-03': ['act-treino', 'act-agua', 'act-estudo', 'act-portfolio', 'act-leitura'],
      '2027-01-04': ['act-corrida', 'act-agua', 'act-ingles', 'act-meditacao'],
      '2027-01-05': ['act-treino', 'act-agua', 'act-estudo', 'act-leitura']
    },
    // Format: { "2027-01-01": { html: "...", updatedAt: "..." } }
    notes: {
      '2027-01-01': {
        html: '<h2>Primeiro dia de 2027</h2><p>Comecei o ano com clareza total sobre os três pilares prioritários: <strong>Saúde</strong>, <strong>Carreira</strong> e <strong>Mente</strong>.</p><ul><li>Treino concluído logo pela manhã</li><li>Meta de leitura iniciada com foco total</li><li>Planejamento do primeiro trimestre revisado</li></ul><blockquote>A consistência nos dias comuns constrói os resultados extraordinários do ano.</blockquote>',
        updatedAt: '2027-01-01T10:00:00.000Z'
      },
      '2027-01-03': {
        html: '<h3>Progresso no Portfólio</h3><p>Hoje dediquei 90 minutos à arquitetura do novo projeto e revisei conceitos essenciais para entrevistas técnicas.</p>',
        updatedAt: '2027-01-03T21:15:00.000Z'
      }
    }
  };
}

class MetasStore {
  constructor() {
    this.state = this.loadFromLocal();
    this.listeners = [];
  }

  loadFromLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.areas)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Uso em memória iniciado:', e);
    }
    return createDefaultDemoState();
  }

  saveToLocal() {
    this.state.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      // Fallback silencioso caso o usuário bloqueie storage
    }
    this.notify();
  }

  subscribe(fn) {
    this.listeners.push(fn);
  }

  notify() {
    for (const fn of this.listeners) {
      fn(this.state);
    }
  }

  replaceState(newState) {
    if (!newState || !Array.isArray(newState.areas)) {
      throw new Error('Formato de dados inválido no arquivo importado.');
    }
    this.state = {
      version: newState.version || '1.0.0',
      updatedAt: new Date().toISOString(),
      currentMonth: newState.currentMonth || { year: 2027, month: 0 },
      areas: newState.areas,
      checks: newState.checks || {},
      notes: newState.notes || {}
    };
    this.saveToLocal();
  }

  resetToDemo() {
    this.state = createDefaultDemoState();
    this.saveToLocal();
  }

  clearAll() {
    this.state = {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      currentMonth: { year: 2027, month: 0 },
      areas: [],
      checks: {},
      notes: {}
    };
    this.saveToLocal();
  }

  // Helpers
  uid(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  }

  normalizeTag(tag) {
    return String(tag || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_')
      .slice(0, 14);
  }

  isTagUnique(tag, ignoreActivityId = null) {
    const clean = this.normalizeTag(tag);
    if (!clean) return false;
    for (const area of this.state.areas) {
      for (const goal of area.goals) {
        for (const act of goal.activities) {
          if (act.id !== ignoreActivityId && act.tag === clean) {
            return false;
          }
        }
      }
    }
    return true;
  }

  // Flatten all activities for the Monthly Tracker table
  getAllActivities(areaFilter = 'all') {
    const list = [];
    for (const area of this.state.areas) {
      if (areaFilter !== 'all' && area.id !== areaFilter) continue;
      for (const goal of area.goals) {
        for (const act of goal.activities) {
          list.push({
            id: act.id,
            name: act.name,
            tag: act.tag,
            goalId: goal.id,
            goalTitle: goal.title,
            areaId: area.id,
            areaName: area.name,
            areaColor: area.color
          });
        }
      }
    }
    return list;
  }

  // Area CRUD
  addArea(name, color) {
    this.state.areas.push({
      id: this.uid('area'),
      name: name.trim(),
      color: color || AREA_COLORS[0].hex,
      goals: []
    });
    this.saveToLocal();
  }

  updateArea(areaId, name, color) {
    const area = this.state.areas.find(a => a.id === areaId);
    if (!area) return;
    area.name = name.trim();
    if (color) area.color = color;
    this.saveToLocal();
  }

  deleteArea(areaId) {
    this.state.areas = this.state.areas.filter(a => a.id !== areaId);
    this.saveToLocal();
  }

  // Goal CRUD
  addGoal(areaId, title, description = '') {
    const area = this.state.areas.find(a => a.id === areaId);
    if (!area) return;
    area.goals.push({
      id: this.uid('goal'),
      title: title.trim(),
      description: description.trim(),
      activities: []
    });
    this.saveToLocal();
  }

  updateGoal(areaId, goalId, title, description = '') {
    const area = this.state.areas.find(a => a.id === areaId);
    if (!area) return;
    const goal = area.goals.find(g => g.id === goalId);
    if (!goal) return;
    goal.title = title.trim();
    goal.description = description.trim();
    this.saveToLocal();
  }

  deleteGoal(areaId, goalId) {
    const area = this.state.areas.find(a => a.id === areaId);
    if (!area) return;
    area.goals = area.goals.filter(g => g.id !== goalId);
    this.saveToLocal();
  }

  // Activity + Tag CRUD
  addActivity(areaId, goalId, name, rawTag) {
    const tag = this.normalizeTag(rawTag);
    if (!this.isTagUnique(tag)) {
      throw new Error(`A Tag "${tag}" já está em uso. Escolha um identificador único.`);
    }
    const area = this.state.areas.find(a => a.id === areaId);
    if (!area) return;
    const goal = area.goals.find(g => g.id === goalId);
    if (!goal) return;
    goal.activities.push({
      id: this.uid('act'),
      name: name.trim(),
      tag
    });
    this.saveToLocal();
  }

  updateActivity(areaId, goalId, activityId, name, rawTag) {
    const tag = this.normalizeTag(rawTag);
    if (!this.isTagUnique(tag, activityId)) {
      throw new Error(`A Tag "${tag}" já está em uso por outra atividade.`);
    }
    const area = this.state.areas.find(a => a.id === areaId);
    if (!area) return;
    const goal = area.goals.find(g => g.id === goalId);
    if (!goal) return;
    const act = goal.activities.find(a => a.id === activityId);
    if (!act) return;
    act.name = name.trim();
    act.tag = tag;
    this.saveToLocal();
  }

  deleteActivity(areaId, goalId, activityId) {
    const area = this.state.areas.find(a => a.id === areaId);
    if (!area) return;
    const goal = area.goals.find(g => g.id === goalId);
    if (!goal) return;
    goal.activities = goal.activities.filter(a => a.id !== activityId);
    this.saveToLocal();
  }

  // Tracker Check-ins
  isChecked(dateKey, activityId) {
    const arr = this.state.checks[dateKey];
    return Array.isArray(arr) && arr.includes(activityId);
  }

  toggleCheck(dateKey, activityId) {
    if (!Array.isArray(this.state.checks[dateKey])) {
      this.state.checks[dateKey] = [];
    }
    const idx = this.state.checks[dateKey].indexOf(activityId);
    if (idx === -1) {
      this.state.checks[dateKey].push(activityId);
    } else {
      this.state.checks[dateKey].splice(idx, 1);
      if (this.state.checks[dateKey].length === 0) {
        delete this.state.checks[dateKey];
      }
    }
    this.saveToLocal();
  }

  // Daily Notes
  getNote(dateKey) {
    const entry = this.state.notes[dateKey];
    return entry && entry.html ? entry.html : '';
  }

  hasNote(dateKey) {
    const html = this.getNote(dateKey);
    const plain = html.replace(/<[^>]*>/g, '').trim();
    return plain.length > 0;
  }

  saveNote(dateKey, htmlContent) {
    const plain = String(htmlContent || '').replace(/<[^>]*>/g, '').trim();
    if (!plain) {
      delete this.state.notes[dateKey];
    } else {
      this.state.notes[dateKey] = {
        html: htmlContent,
        updatedAt: new Date().toISOString()
      };
    }
    this.saveToLocal();
  }

  // Month Navigation
  setMonth(year, month) {
    this.state.currentMonth = { year, month };
    this.saveToLocal();
  }
}

window.AREA_COLORS = AREA_COLORS;
window.store = new MetasStore();
