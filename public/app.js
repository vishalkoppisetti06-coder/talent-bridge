/* ============================================================
   Talent Bridge v9 — Backend-Connected Frontend
   Every function name/signature matches original inline script.
   ============================================================ */
(function () {
'use strict';

/* ================== API HELPER ================== */
const TOKEN_KEY = 'tb_jwt';
window.API = {
  token: () => localStorage.getItem(TOKEN_KEY),
  setToken: t => t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY),
  async call(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && API.token()) headers.Authorization = 'Bearer ' + API.token();
    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
    return data;
  },
};

/* ================== STATE ================== */
window.State = {
  user: null, department: 'CSE', skills: [], internships: [], applications: [],
  candidates: [], myPostings: [], skillGaps: [], trends: [], trendingSkills: [],
  feedback: [], notifications: [], activities: [], documents: [], interviews: [],
  mentors: [], referrals: 0, resume: null, theme: 'light', chartType: 'bar',
  appView: 'table', lang: 'en', savedInternships: [], compareMode: false,
  compareList: [], notifFilter: 'all', wsTimer: null,
  ticker: [], filters: { type: 'all', location: 'all', matchMin: 0 },
  interviewSelectedDay: null,
  videoCallTimer: null, videoCallSeconds: 0, videoCallActive: false,
  profileViewsCount: 35, profileViewers: [],
  reset: { email: '', otp: '', resetToken: '', step: 1, role: '', channel: 'email', attempts: 0, resendTimer: null, devOtp: '', target: '' },
};

/* ================== STORAGE ================== */
window.Storage = {
  prefix: 'tb_v9_',
  get(k, f) { try { const r = localStorage.getItem(this.prefix + k); return r ? JSON.parse(r) : f; } catch (e) { return f; } },
  set(k, v) { try { localStorage.setItem(this.prefix + k, JSON.stringify(v)); } catch (e) {} },
  remove(k) { try { localStorage.removeItem(this.prefix + k); } catch (e) {} },
};

/* ================== USER REGISTRY ================== */
window.UserRegistry = {
  KEY: 'tb_v9_registry',
  getAll() { try { const r = localStorage.getItem(this.KEY); return r ? JSON.parse(r) : {}; } catch (e) { return {}; } },
  saveAll(reg) { try { localStorage.setItem(this.KEY, JSON.stringify(reg)); } catch (e) {} },
  normalize(e) { return String(e || '').trim().toLowerCase(); },
  get(e) { return this.getAll()[this.normalize(e)] || null; },
  getRole(e) { const x = this.get(e); return x ? x.role : null; },
  isRegistered(e) { return this.getRole(e) !== null; },
  register(email, role, name, _pwd, extras) {
    const reg = this.getAll();
    const key = this.normalize(email);
    const existing = reg[key] || {};
    // Merge extras instead of overwriting, so a login response with no/partial
    // extras (e.g. institution, gradYear) never wipes out what was saved at signup.
    // Only non-empty incoming values override what's already stored.
    const mergedExtras = Object.assign({}, existing.extras || {});
    Object.keys(extras || {}).forEach(k => {
      const v = extras[k];
      if (v !== undefined && v !== null && v !== '') mergedExtras[k] = v;
    });
    reg[key] = {
      role,
      name: name || existing.name || '',
      extras: mergedExtras,
      registeredAt: existing.registeredAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.saveAll(reg);
  },
  roleLabel(r) { return { student: 'Student', industry: 'Industry', academia: 'Academia' }[r] || r; },
  roleEmoji(r) { return { student: '🎓', industry: '🏢', academia: '🏛️' }[r] || '👤'; },
};

/* ================== UI HELPERS ================== */
window.UI = {
  esc(s) { const d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; },
  statusBadge(t, l) { return `<span class="status ${t}">${this.esc(l)}</span>`; },
  avatar(i, c, size) { return `<div class="avatar ${c} ${size === 'lg' ? 'lg' : ''}">${this.esc(i)}</div>`; },
  empty(msg, icon) { return `<div class="empty"><div class="empty-icon">${icon || '📭'}</div><div class="empty-text">${this.esc(msg)}</div></div>`; },
  progress(l) { return `<div class="progress"><div class="progress-fill" style="width:${Math.min(100, Math.max(0, l))}%"></div></div>`; },
  stars(r) {
    const full = Math.floor(r), half = r - full >= 0.5;
    let s = ''; for (let i = 0; i < full; i++) s += '★';
    if (half) s += '⯨';
    for (let j = full + (half ? 1 : 0); j < 5; j++) s += '☆';
    return `<span class="stars" title="${r}">${s}</span>`;
  },
  fmtDate(d) {
    const date = new Date(d), now = new Date(), diff = Math.floor((now - date) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return diff + 'd ago';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  },
  animateNumber(el, target, dur) {
    if (!el) return; dur = dur || 900;
    const start = performance.now();
    const step = now => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(target * eased);
      if (p < 1) requestAnimationFrame(step); else el.textContent = target;
    };
    requestAnimationFrame(step);
  },
};

/* ================== TOAST ================== */
window.Toast = {
  show(msg, type) {
    type = type || 'info';
    const root = document.getElementById('toast-root'); if (!root) return;
    const icons = { success: '✓', info: 'ℹ', error: '✕', warning: '⚠' };
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = `<div class="toast-icon">${icons[type] || 'ℹ'}</div><div>${UI.esc(msg)}</div>`;
    root.appendChild(el);
    setTimeout(() => { el.classList.add('exit'); setTimeout(() => el.remove(), 300); }, 4200);
  },
};

/* ================== DEPARTMENTS ================== */
window.Departments = {
  CSE: {
    name: 'Computer Science & Engineering', short: 'CSE',
    subtitle: 'B.Tech CSE Final Year · National Institute of Engineering',
    skills: [
      { id: 1, name: 'Data Structures & Algorithms', level: 90, category: 'Core CS' },
      { id: 2, name: 'Full Stack Development', level: 85, category: 'Web' },
      { id: 3, name: 'Machine Learning', level: 75, category: 'AI/ML' },
      { id: 4, name: 'Database Management', level: 80, category: 'Core CS' },
    ],
    internships: [
      { id: 1, title: 'Software Development Engineer Intern', company: 'Google India', location: 'Bangalore', skills: ['DSA', 'System Design', 'C++'], type: 'Internship', salary: '₹80,000/mo', description: 'Work on scalable backend systems and distributed computing.', posted: '2026-03-01' },
      { id: 2, title: 'Frontend Developer Intern', company: 'Microsoft', location: 'Hyderabad', skills: ['React', 'TypeScript', 'CSS'], type: 'Internship', salary: '₹65,000/mo', description: 'Build modern web applications using React and TypeScript.', posted: '2026-03-05' },
      { id: 3, title: 'Machine Learning Engineer', company: 'Amazon', location: 'Bangalore', skills: ['Python', 'TensorFlow', 'ML'], type: 'Full-time', salary: '₹18 LPA', description: 'Design and deploy ML models for recommendation systems.', posted: '2026-03-03' },
      { id: 4, title: 'Backend Developer Intern', company: 'Flipkart', location: 'Bangalore', skills: ['Java', 'Spring Boot', 'MySQL'], type: 'Internship', salary: '₹50,000/mo', description: 'Develop microservices for e-commerce platform.', posted: '2026-03-07' },
      { id: 5, title: 'Cloud Engineer', company: 'Amazon Web Services', location: 'Hyderabad', skills: ['AWS', 'Docker', 'Kubernetes'], type: 'Full-time', salary: '₹16 LPA', description: 'Build and maintain cloud infrastructure.', posted: '2026-03-02' },
      { id: 6, title: 'Data Science Intern', company: 'Microsoft', location: 'Hyderabad', skills: ['Python', 'Pandas', 'SQL'], type: 'Internship', salary: '₹55,000/mo', description: 'Analyze large datasets and build predictive models.', posted: '2026-03-09' },
    ],
    skillGaps: [
      { id: 1, skill: 'System Design', demand: 'High', supply: 25, type: 'red', recommendation: 'Introduce advanced system design elective.' },
      { id: 2, skill: 'Cloud Computing (AWS/GCP)', demand: 'High', supply: 40, type: 'amber', recommendation: 'Add hands-on cloud labs to curriculum.' },
      { id: 3, skill: 'Machine Learning', demand: 'High', supply: 88, type: 'green', recommendation: 'Excellent supply. Consider advanced AI tracks.' },
      { id: 4, skill: 'DevOps & CI/CD', demand: 'High', supply: 35, type: 'red', recommendation: 'Add workshop on Docker, Kubernetes, Jenkins.' },
    ],
    trendingSkills: [
      { name: 'Full Stack Development', value: 95 }, { name: 'Machine Learning', value: 92 },
      { name: 'Cloud Computing', value: 88 }, { name: 'React.js', value: 85 }, { name: 'System Design', value: 80 },
    ],
    feedback: [
      { company: 'Google India', quote: 'Students have strong DSA skills but need more exposure to system design and scalability.', type: 'green' },
      { company: 'Microsoft', quote: 'Excellent frontend skills. Recommend adding TypeScript and testing frameworks to curriculum.', type: 'amber' },
      { company: 'Amazon', quote: 'Impressed with ML interns. Would like more candidates with cloud deployment experience.', type: 'blue' },
    ],
    ticker: ['🎉 Priya Patel just got placed at Google India', '✨ 5 new CSE internships posted in the last hour', '📈 CSE placement rate up 6% this quarter', '🏢 Zoho just joined as an industry partner', '🎓 65 CSE students shortlisted this week'],
    quiz: [
      { q: 'What is the time complexity of binary search on a sorted array of n elements?', options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], correct: 1 },
      { q: 'Which data structure uses FIFO (First In First Out) principle?', options: ['Stack', 'Queue', 'Tree', 'Graph'], correct: 1 },
      { q: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Text Machine Language', 'Hyper Tabular Markup Language', 'None of the above'], correct: 0 },
      { q: 'What is the worst-case time complexity of QuickSort?', options: ['O(n log n)', 'O(n²)', 'O(n)', 'O(log n)'], correct: 1 },
      { q: 'Which protocol is used for secure web browsing?', options: ['HTTP', 'FTP', 'HTTPS', 'SMTP'], correct: 2 },
      { q: 'In OOP, creating a new object from a class is called?', options: ['Encapsulation', 'Inheritance', 'Instantiation', 'Abstraction'], correct: 2 },
    ],
  },
};

const _deptDefs = {
  IT: { name: 'Information Technology', short: 'IT', subtitle: 'B.Tech IT Final Year' },
  AIDS: { name: 'AI & Data Science', short: 'AI&DS', subtitle: 'B.Tech AI&DS Final Year' },
  ECE: { name: 'Electronics & Communication Engineering', short: 'ECE', subtitle: 'B.Tech ECE Final Year' },
  EEE: { name: 'Electrical & Electronics Engineering', short: 'EEE', subtitle: 'B.Tech EEE Final Year' },
  MECH: { name: 'Mechanical Engineering', short: 'MECH', subtitle: 'B.Tech MECH Final Year' },
  CIVIL: { name: 'Civil Engineering', short: 'CIVIL', subtitle: 'B.Tech Civil Final Year' },
  CHEM: { name: 'Chemical Engineering', short: 'CHEM', subtitle: 'B.Tech Chemical Final Year' },
  AERO: { name: 'Aeronautical / Aerospace Engineering', short: 'AERO', subtitle: 'B.Tech Aeronautical Final Year' },
  AUTO: { name: 'Automobile Engineering', short: 'AUTO', subtitle: 'B.Tech Automobile Final Year' },
  BIOTECH: { name: 'Biotechnology', short: 'BIOTECH', subtitle: 'B.Tech Biotechnology Final Year' },
  BME: { name: 'Biomedical Engineering', short: 'BME', subtitle: 'B.Tech Biomedical Final Year' },
  MINING: { name: 'Mining Engineering', short: 'MINING', subtitle: 'B.Tech Mining Final Year' },
  PETRO: { name: 'Petroleum Engineering', short: 'PETRO', subtitle: 'B.Tech Petroleum Final Year' },
  AGRIC: { name: 'Agricultural Engineering', short: 'AGRIC', subtitle: 'B.Tech Agricultural Final Year' },
  MARINE: { name: 'Marine Engineering', short: 'MARINE', subtitle: 'B.Tech Marine Final Year' },
  INSTRU: { name: 'Instrumentation Engineering', short: 'INSTRU', subtitle: 'B.Tech Instrumentation Final Year' },
  ROBOTICS: { name: 'Robotics & Automation', short: 'ROBOTICS', subtitle: 'B.Tech Robotics Final Year' },
  ENV: { name: 'Environmental Engineering', short: 'ENV', subtitle: 'B.Tech Environmental Final Year' },
  METALLURGY: { name: 'Metallurgical Engineering', short: 'METALLURGY', subtitle: 'B.Tech Metallurgy Final Year' },
  TEXTILE: { name: 'Textile Engineering', short: 'TEXTILE', subtitle: 'B.Tech Textile Final Year' },
  FOOD: { name: 'Food Technology', short: 'FOOD', subtitle: 'B.Tech Food Tech Final Year' },
  BSC: { name: 'B.Sc (General / Physics / Chemistry / Maths)', short: 'B.Sc', subtitle: 'B.Sc Final Year' },
  BSC_CS: { name: 'B.Sc Computer Science', short: 'B.Sc CS', subtitle: 'B.Sc CS Final Year' },
  BSC_IT: { name: 'B.Sc Information Technology', short: 'B.Sc IT', subtitle: 'B.Sc IT Final Year' },
  BCA: { name: 'BCA (Computer Applications)', short: 'BCA', subtitle: 'BCA Final Year' },
  BCOM: { name: 'B.Com (General / Honours)', short: 'B.Com', subtitle: 'B.Com Final Year' },
  BBA: { name: 'BBA (Business Administration)', short: 'BBA', subtitle: 'BBA Final Year' },
  BCOM_CS: { name: 'B.Com Computer Science', short: 'B.Com CS', subtitle: 'B.Com CS Final Year' },
  CA: { name: 'CA (Chartered Accountancy)', short: 'CA', subtitle: 'CA Final' },
  CS: { name: 'CS (Company Secretary)', short: 'CS', subtitle: 'CS Final' },
  CMA: { name: 'CMA (Cost & Management Accountancy)', short: 'CMA', subtitle: 'CMA Final' },
  BA: { name: 'B.A (General / English / History)', short: 'B.A', subtitle: 'B.A Final Year' },
  BA_ECON: { name: 'B.A Economics', short: 'B.A Econ', subtitle: 'B.A Economics Final Year' },
  BA_PSY: { name: 'B.A Psychology', short: 'B.A Psy', subtitle: 'B.A Psychology Final Year' },
  BA_JOUR: { name: 'B.A Journalism & Mass Comm.', short: 'B.A Jour', subtitle: 'B.A Journalism Final Year' },
  MBBS: { name: 'MBBS', short: 'MBBS', subtitle: 'MBBS Final Year' },
  BDS: { name: 'BDS (Dental Surgery)', short: 'BDS', subtitle: 'BDS Final Year' },
  BAMS: { name: 'BAMS (Ayurveda)', short: 'BAMS', subtitle: 'BAMS Final Year' },
  BHMS: { name: 'BHMS (Homeopathy)', short: 'BHMS', subtitle: 'BHMS Final Year' },
  BPT: { name: 'BPT (Physiotherapy)', short: 'BPT', subtitle: 'BPT Final Year' },
  BSC_NUR: { name: 'B.Sc Nursing', short: 'Nursing', subtitle: 'B.Sc Nursing Final Year' },
  BSC_PHARM: { name: 'B.Pharm', short: 'B.Pharm', subtitle: 'B.Pharm Final Year' },
  BA_LLB: { name: 'BA LLB (Integrated Law)', short: 'BA LLB', subtitle: 'BA LLB Final Year' },
  LLB: { name: 'LLB', short: 'LLB', subtitle: 'LLB Final Year' },
  BARCH: { name: 'B.Arch (Architecture)', short: 'B.Arch', subtitle: 'B.Arch Final Year' },
  BDES: { name: 'B.Des (Design)', short: 'B.Des', subtitle: 'B.Des Final Year' },
  BED: { name: 'B.Ed', short: 'B.Ed', subtitle: 'B.Ed Final Year' },
  BHM: { name: 'BHM (Hotel Management)', short: 'BHM', subtitle: 'BHM Final Year' },
  BSC_AGRI: { name: 'B.Sc Agriculture', short: 'B.Sc Agri', subtitle: 'B.Sc Agriculture Final Year' },
  BJMC: { name: 'BJMC (Journalism & Mass Comm.)', short: 'BJMC', subtitle: 'BJMC Final Year' },
  BSMS: { name: 'BSMS (Siddha Medicine)', short: 'BSMS', subtitle: 'BSMS Final Year' },
};
Object.keys(_deptDefs).forEach(code => {
  if (!Departments[code]) {
    const base = JSON.parse(JSON.stringify(Departments.CSE));
    base.name = _deptDefs[code].name;
    base.short = _deptDefs[code].short;
    base.subtitle = _deptDefs[code].subtitle;
    Departments[code] = base;
  }
});

/* ================== AI ================== */
window.AI = {
  calcMatch(cSkills, jSkills, extra) {
    extra = extra || {};
    if (!jSkills || !jSkills.length) return 50;
    const set = {}; cSkills.forEach(s => set[String(s).toLowerCase()] = true);
    const m = jSkills.filter(s => set[String(s).toLowerCase()]).length;
    const base = (m / jSkills.length) * 100;
    const expBoost = extra.experience === 'Fresher' ? 0 : 5;
    const ratingBoost = (extra.rating || 4) * 2;
    return Math.min(99, Math.round(base * 0.75 + expBoost + ratingBoost));
  },
  scoreJob(skills, job) { return this.calcMatch(skills.map(s => s.name), job.skills); },
  rankJobs(skills, jobs) {
    return jobs.map(j => Object.assign({}, j, { match: this.scoreJob(skills, j) }))
      .sort((a, b) => b.match - a.match);
  },
  insights() {
    const jobs = this.rankJobs(State.skills, State.internships);
    const topMatch = jobs[0] || { match: 0, title: '—', company: '—' };
    const avg = jobs.length ? jobs.reduce((a, j) => a + j.match, 0) / jobs.length : 0;
    const strong = State.skills.filter(s => s.level >= 85);
    const weak = State.skills.filter(s => s.level < 80);
    return {
      topMatch, avgMatch: Math.round(avg),
      strongCount: strong.length, weakCount: weak.length,
      recommendedSkill: weak[0] ? weak[0].name : (State.skills[0] ? State.skills[0].name : '—'),
    };
  },
};

/* ================== RENDER ================== */
window.Render = {
  skills() {
    const c = document.getElementById('skills-container'); if (!c) return;
    const count = document.getElementById('skill-count');
    if (count) count.textContent = State.skills.length + ' skills';
    if (!State.skills.length) { c.innerHTML = UI.empty('No skills added yet', '⚙'); return; }
    c.innerHTML = State.skills.map(s => {
      const id = s._id || s.id;
      return `<div class="skill-item">
        <div class="skill-head">
          <span class="skill-name">${UI.esc(s.name)}</span>
          <div class="skill-actions">
            <span class="skill-level">${s.level}%</span>
            <button type="button" class="skill-edit" onclick="Modal.open('skillModal','${id}')">✎</button>
            <button type="button" class="skill-del" onclick="App.deleteSkill('${id}')">✕</button>
          </div>
        </div>
        ${UI.progress(s.level)}
        <div class="skill-cat">${UI.esc(s.category)}</div>
      </div>`;
    }).join('');
    const avg = State.skills.length ? Math.round(State.skills.reduce((a, s) => a + s.level, 0) / State.skills.length) : 0;
    const grade = avg >= 90 ? 'A+' : avg >= 80 ? 'A' : avg >= 70 ? 'B+' : avg >= 60 ? 'B' : 'C';
    const el = document.getElementById('stat-skill-score');
    if (el) el.textContent = State.skills.length ? grade : '—';
  },

  internships(filter, sort) {
    filter = filter || ''; sort = sort || 'match';
    const c = document.getElementById('internships-container'); if (!c) return;
    let list = AI.rankJobs(State.skills, State.internships);
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter(j =>
        j.title.toLowerCase().indexOf(q) > -1 ||
        j.company.toLowerCase().indexOf(q) > -1 ||
        (j.skills || []).some(s => s.toLowerCase().indexOf(q) > -1)
      );
    }
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'company') list.sort((a, b) => a.company.localeCompare(b.company));
    if (!list.length) { c.innerHTML = UI.empty('No internships match', '🔍'); return; }
    c.innerHTML = list.map(job => {
      const id = job._id || job.id;
      const isTop = job.match >= 90;
      const typeClass = job.type === 'Internship' ? 'internship' : 'fulltime';
      const tags = (job.skills || []).map(s => {
        const matched = State.skills.some(sk =>
          sk.name.toLowerCase().indexOf(s.toLowerCase()) > -1 ||
          s.toLowerCase().indexOf(sk.name.toLowerCase()) > -1
        );
        return `<span class="tag ${matched ? 'matched' : ''}">${matched ? '✓ ' : ''}${UI.esc(s)}</span>`;
      }).join('');
      const isSaved = State.savedInternships.indexOf(job.id) > -1;
      return `<div class="list-item">
        <button type="button" class="save-btn ${isSaved ? 'saved' : ''}" onclick="App.toggleSave(${job.id})">${isSaved ? '★' : '☆'}</button>
        <div class="item-row">
          <div class="item-main">
            <div class="item-title-row">
              <span class="item-title">${UI.esc(job.title)}</span>
              ${isTop ? '<span class="top-match-tag">Top Match</span>' : ''}
              <span class="item-type ${typeClass}">${job.type}</span>
            </div>
            <div class="item-meta">${UI.esc(job.company)} · ${UI.esc(job.location)} · ${UI.esc(job.salary)} · ${UI.fmtDate(job.posted)}</div>
            ${job.description ? `<div class="item-desc">${UI.esc(job.description)}</div>` : ''}
            <div class="tag-row">${tags}</div>
          </div>
          <div class="item-side">
            <div class="match-badge">${job.match}% Match</div>
            <button type="button" class="apply-link" onclick="App.applyJob('${id}')">Apply →</button>
          </div>
        </div>
      </div>`;
    }).join('');
  },

  applications() {
    const tb = document.getElementById('applications-container'); if (!tb) return;
    if (!State.applications.length) { tb.innerHTML = `<tr><td colspan="5">${UI.empty('No applications yet', '📋')}</td></tr>`; return; }
    tb.innerHTML = State.applications.map(a => {
      const id = a._id || a.id;
      return `<tr>
        <td><strong>${UI.esc(a.position)}</strong></td>
        <td style="color:var(--slate-600);">${UI.esc(a.company)}</td>
        <td style="color:var(--slate-500);font-size:12px;">${UI.fmtDate(a.date)}</td>
        <td>${UI.statusBadge(a.statusType, a.status)}</td>
        <td class="right"><button type="button" class="link-danger" onclick="App.withdrawApplication('${id}')">Withdraw</button></td>
      </tr>`;
    }).join('');
  },

  kanban() {
    const c = document.getElementById('kanban-container'); if (!c) return;
    const stages = [
      { id: 'applied', label: '📥 Applied' }, { id: 'review', label: '👀 In Review' },
      { id: 'shortlist', label: '⭐ Shortlisted' }, { id: 'offer', label: '🎉 Offer' },
    ];
    c.innerHTML = stages.map(stage => {
      const apps = State.applications.filter(a => (a.stage || 'applied') === stage.id);
      const cards = apps.length ? apps.map(a => {
        const id = a._id || a.id;
        return `<div class="kanban-card" draggable="true" data-app-id="${id}" ondragstart="App.dragStart(event)" ondragend="App.dragEnd(event)">
          <div class="kanban-card-title">${UI.esc(a.position)}</div>
          <div class="kanban-card-company">${UI.esc(a.company)}</div>
          <div class="kanban-card-meta">
            <span style="font-size:10px;color:var(--slate-400);">${UI.fmtDate(a.date)}</span>
            <span class="status ${a.statusType}" style="font-size:9px;">${UI.esc(a.status)}</span>
          </div>
        </div>`;
      }).join('') : '<div style="text-align:center;padding:20px;color:var(--slate-400);font-size:12px;">Drop here</div>';
      return `<div class="kanban-col" data-stage="${stage.id}" ondragover="App.dragOver(event)" ondragleave="App.dragLeave(event)" ondrop="App.drop(event)">
        <div class="kanban-col-title">${stage.label}<span class="kanban-col-count">${apps.length}</span></div>
        <div>${cards}</div>
      </div>`;
    }).join('');
  },

  timeline() {
    const c = document.getElementById('timeline-container'); if (!c) return;
    if (!State.applications.length) { c.innerHTML = UI.empty('No activity yet', '📅'); return; }
    const sorted = State.applications.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    c.innerHTML = sorted.map(a => {
      const dot = a.statusType === 'success' ? 'success' : a.statusType === 'warning' ? 'warning' : 'info';
      const icon = a.statusType === 'success' ? '✓' : a.statusType === 'warning' ? '👀' : '📥';
      return `<div class="timeline-item">
        <div class="timeline-dot ${dot}">${icon}</div>
        <div class="timeline-title">${UI.esc(a.position)} — ${UI.esc(a.status)}</div>
        <div class="timeline-desc">${UI.esc(a.company)}</div>
        <div class="timeline-date">${UI.fmtDate(a.date)}</div>
      </div>`;
    }).join('');
  },

  candidates(filter) {
    filter = filter || 'all';
    const c = document.getElementById('candidates-container'); if (!c) return;
    let list = State.candidates.slice();
    if (State.user && State.user.role === 'industry' && State.myPostings.length) {
      const latest = State.myPostings[0];
      if (latest.skills && latest.skills.length) {
        list = list.map(cand => Object.assign({}, cand, {
          match: AI.calcMatch(cand.skills, latest.skills, { experience: cand.experience, rating: cand.rating })
        })).sort((a, b) => b.match - a.match);
      }
    } else {
      list = list.map(cand => Object.assign({}, cand, { match: cand.match || 85 }));
    }
    if (filter !== 'all') list = list.filter(x => x.match >= parseInt(filter, 10));
    if (!list.length) { c.innerHTML = UI.empty('No candidates match', '👥'); return; }
    c.innerHTML = list.map(x => {
      const tags = (x.skills || []).map(s => `<span class="tag">${UI.esc(s)}</span>`).join('');
      const checked = State.compareList.indexOf(x.id) > -1;
      const compareBox = State.compareMode
        ? `<div class="compare-checkbox ${checked ? 'checked' : ''}" onclick="event.stopPropagation(); Compare.toggle(${x.id})">${checked ? '✓' : ''}</div>`
        : '';
      return `<div class="list-item">
        <div class="item-row">
          <div class="avatar-row">
            ${compareBox}
            ${UI.avatar(x.initials, x.color)}
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="item-title">${UI.esc(x.name)}</span>${UI.stars(x.rating || 4.5)}
              </div>
              <div class="item-meta">${UI.esc(x.degree)} · ${UI.esc(x.institute)}</div>
              <div class="tag-row">${tags}</div>
            </div>
          </div>
          <div class="item-side">
            <div class="match-badge">${x.match}% Match</div>
            <button type="button" class="apply-link" onclick="App.viewProfile(${x.id})">View →</button>
          </div>
        </div>
      </div>`;
    }).join('');
  },

  myPostings() {
    const c = document.getElementById('my-postings-container'); if (!c) return;
    if (!State.myPostings.length) { c.innerHTML = UI.empty('No postings yet', '📢'); return; }
    c.innerHTML = State.myPostings.map(p => {
      const id = p._id || p.id;
      return `<div class="list-item">
        <div class="item-row">
          <div class="item-main">
            <div class="item-title-row">
              <span class="item-title">${UI.esc(p.title)}</span>${UI.statusBadge('success', p.status)}
            </div>
            <div class="item-meta">${UI.esc(p.location)} · ${UI.esc(p.type)} · Posted ${UI.fmtDate(p.posted)}</div>
          </div>
          <div class="item-side" style="flex-direction:row;align-items:center;gap:18px;">
            <div style="text-align:center;"><div style="font-size:20px;font-weight:800;">${p.applicants}</div><div style="font-size:10px;color:var(--slate-500);text-transform:uppercase;font-weight:700;">Applicants</div></div>
            <div style="text-align:center;"><div style="font-size:20px;font-weight:800;color:#047857;">${p.shortlisted}</div><div style="font-size:10px;color:var(--slate-500);text-transform:uppercase;font-weight:700;">Shortlisted</div></div>
            <button type="button" class="link-danger" onclick="App.deletePosting('${id}')">Close</button>
          </div>
        </div>
      </div>`;
    }).join('');
  },

  insights() {
    const c = document.getElementById('insights-container'); if (!c) return;
    const i = AI.insights();
    c.innerHTML = `
      <div class="insight-card" onclick="App.openTopMatchModal()" role="button" tabindex="0">
        <div class="insight-icon green">🎯</div>
        <div class="insight-title">Top Match</div>
        <div class="insight-value">${i.topMatch.match}%</div>
        <div class="insight-desc">Your best fit is <strong>${UI.esc(i.topMatch.title)}</strong> at ${UI.esc(i.topMatch.company)}</div>
      </div>
      <div class="insight-card" onclick="App.openAverageMatchModal()" role="button" tabindex="0">
        <div class="insight-icon saffron">📈</div>
        <div class="insight-title">Average Match</div>
        <div class="insight-value">${i.avgMatch}%</div>
        <div class="insight-desc">Across all ${State.internships.length} opportunities</div>
      </div>
      <div class="insight-card" onclick="App.openStrongSkillsModal()" role="button" tabindex="0">
        <div class="insight-icon blue">💪</div>
        <div class="insight-title">Strong Skills</div>
        <div class="insight-value">${i.strongCount}</div>
        <div class="insight-desc">${i.weakCount > 0 ? `Focus on improving <strong>${UI.esc(i.recommendedSkill)}</strong>` : 'All skills are strong!'}</div>
      </div>`;
  },

  skillGaps() {
    const c = document.getElementById('skill-gaps-container'); if (!c) return;
    c.innerHTML = State.skillGaps.map(g => `
      <div class="gap-item">
        <div class="gap-head">
          <span class="gap-name">${UI.esc(g.skill)}</span>
          <span class="gap-demand ${g.type}">${g.demand} · ${g.supply}%</span>
        </div>
        <div class="gap-progress"><div class="gap-fill ${g.type}" style="width:${g.supply}%"></div></div>
        <div class="gap-rec">💡 ${UI.esc(g.recommendation)}</div>
      </div>`).join('');
  },

  trends() {
    const c = document.getElementById('trends-chart'); if (!c) return;
    if (State.chartType === 'line') {
      const w = 500, h = 200;
      const max = Math.max.apply(null, State.trends.map(t => t.value));
      const min = Math.min.apply(null, State.trends.map(t => t.value)) - 10;
      const pts = State.trends.map((t, i) => ({
        x: (i / (State.trends.length - 1)) * (w - 40) + 20,
        y: h - ((t.value - min) / (max - min)) * (h - 40) - 20,
        year: t.year, value: t.value,
      }));
      const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      const area = `${path} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;
      const circles = pts.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="5" fill="white" stroke="#1e3a8a" stroke-width="2.5"/>
        <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" font-size="10" font-weight="800" fill="#1e3a8a">${p.value}%</text>
        <text x="${p.x}" y="${h - 4}" text-anchor="middle" font-size="10" font-weight="600" fill="#64748b">${p.year}</text>`).join('');
      c.innerHTML = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:220px;">
        <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1e3a8a" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0"/>
        </linearGradient></defs>
        <path d="${area}" fill="url(#areaGrad)"/>
        <path d="${path}" fill="none" stroke="#1e3a8a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${circles}</svg>`;
    } else {
      const maxB = Math.max.apply(null, State.trends.map(t => t.value));
      c.innerHTML = `<div class="bar-chart">${State.trends.map((t, i) => {
        const hh = (t.value / maxB) * 100;
        const latest = i === State.trends.length - 1;
        return `<div class="bar-wrap">
          <div class="bar ${latest ? 'active' : ''}" style="height:${hh}%;"><span class="bar-label">${t.value}%</span></div>
          <div class="bar-year">${t.year}</div>
        </div>`;
      }).join('')}</div>`;
    }
  },

  trendingSkills() {
    const c = document.getElementById('trending-skills-container'); if (!c) return;
    c.innerHTML = State.trendingSkills.map(s => `
      <div class="trend-item">
        <div class="trend-name">${UI.esc(s.name)}</div>
        <div class="trend-bar"><div class="trend-fill" style="width:${s.value}%"></div></div>
        <div class="trend-val">${s.value}%</div>
      </div>`).join('');
  },

  feedback() {
    const c = document.getElementById('feedback-container'); if (!c) return;
    c.innerHTML = State.feedback.map(f => `
      <div class="feedback-item ${f.type}">
        <div class="feedback-quote">"${UI.esc(f.quote)}"</div>
        <div class="feedback-source">— ${UI.esc(f.company)}</div>
      </div>`).join('');
  },

  activities() {
    const c = document.getElementById('activity-container'); if (!c) return;
    c.innerHTML = State.activities.map(a => `
      <div class="activity-item">
        <div class="activity-dot"></div>
        <div>
          <div class="activity-text">${UI.esc(a.text)}</div>
          <div class="activity-time">${UI.esc(a.time)}</div>
        </div>
      </div>`).join('');
  },

  stats() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) UI.animateNumber(el, v); };
    const matched = AI.rankJobs(State.skills, State.internships).filter(i => i.match >= 80).length;
    set('stat-matches', matched);
    set('stat-applications', State.applications.length);
    set('stat-views', State.profileViewsCount || 35);
    set('stat-active-jobs', State.myPostings.filter(p => p.status === 'Active').length);
    set('stat-total-applicants', State.myPostings.reduce((a, p) => a + (p.applicants || 0), 0));
    set('stat-shortlisted', State.myPostings.reduce((a, p) => a + (p.shortlisted || 0), 0));
    set('stat-hired', 8);
    const unread = State.notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = unread > 9 ? '9+' : unread;
      badge.classList.toggle('hidden', unread === 0);
    }
    if (window.Chat) Chat.updateBadge();
  },
};

/* ================== MODAL ================== */
window.Modal = {
  currentId: null,
  open(id) {
    const args = Array.prototype.slice.call(arguments, 1);
    const root = document.getElementById('modal-root');
    const tpl = this.templates[id];
    if (!tpl) { Toast.show('Modal "' + id + '" not found', 'error'); return; }
    this.currentId = id;
    const content = typeof tpl === 'function' ? tpl.apply(this, args) : tpl;
    root.innerHTML = `<div class="modal-overlay" onclick="if(event.target===this) Modal.close()">${content}</div>`;
    document.body.style.overflow = 'hidden';
    this._esc = e => { if (e.key === 'Escape') Modal.close(); };
    document.addEventListener('keydown', this._esc);
    setTimeout(() => {
      const f = root.querySelector('input:not([type=hidden]), textarea, select, button:not(.modal-close)');
      if (f) f.focus();
    }, 50);
    if (id === 'quizModal') setTimeout(() => Quiz.render(), 100);
    if (id === 'videoInterviewModal') setTimeout(() => App.startVideoCall(), 100);
  },
  close() {
    const wasVideo = this.currentId === 'videoInterviewModal';
    this.currentId = null;
    document.getElementById('modal-root').innerHTML = '';
    document.body.style.overflow = '';
    if (this._esc) document.removeEventListener('keydown', this._esc);
    if (wasVideo) App.stopVideoCall();
    if (State.reset.resendTimer) { clearInterval(State.reset.resendTimer); State.reset.resendTimer = null; }
  },
  templates: {}
};

/* ---- Modal templates ---- */
Modal.templates.genericListModal = function (title, bodyHtml) {
  return `<div class="modal modal-lg">
    <div class="modal-head"><h3 class="modal-title">${UI.esc(title)}</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body" style="padding:0;">${bodyHtml || UI.empty('Nothing here')}</div>
    <div class="modal-foot"><button type="button" class="btn btn-primary" onclick="Modal.close()">Close</button></div>
  </div>`;
};

Modal.templates.resumeModal = function () {
  const info = State.resume ? `<div class="uploaded-info">✓ Uploaded: <strong>${UI.esc(State.resume.name)}</strong> (${Math.round(State.resume.size / 1024)} KB)</div>` : '';
  const buttons = State.resume
    ? `<button type="button" class="btn btn-outline" onclick="Modal.close()">Close</button><button type="button" class="btn btn-danger" onclick="App.removeResume()">Remove</button>`
    : `<button type="button" class="btn btn-outline" onclick="Modal.close()">Cancel</button><button type="button" class="btn btn-primary" onclick="App.handleUpload()">Choose File</button>`;
  return `<div class="modal modal-md">
    <div class="modal-head"><h3 class="modal-title">Upload Resume</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body">
      ${info}
      <div id="drop-zone" class="drop-zone">
        <div class="drop-icon">📄</div>
        <div class="drop-title">Drop your resume or click to browse</div>
        <div class="drop-sub">PDF, DOC up to 5MB · AI will auto-parse</div>
      </div>
      <input type="file" id="resume-input" accept=".pdf,.doc,.docx" style="display:none;">
    </div>
    <div class="modal-foot">${buttons}</div>
  </div>`;
};

Modal.templates.parsedResumeModal = function () {
  const r = State.resume; if (!r) return `<div class="modal modal-sm"><div class="modal-body">${UI.empty('No resume uploaded')}</div></div>`;
  const p = r.parsed || {};
  return `<div class="modal modal-md">
    <div class="modal-head"><h3 class="modal-title">✅ Resume Parsed</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body">
      <div class="uploaded-info" style="margin-bottom:18px;">📄 <strong>${UI.esc(r.name)}</strong> · ${Math.round(r.size / 1024)} KB</div>
      <div class="parsed-field"><span class="parsed-label">Name</span><span class="parsed-value">${UI.esc(p.name || '—')}</span></div>
      <div class="parsed-field"><span class="parsed-label">Email</span><span class="parsed-value">${UI.esc(p.email || '—')}</span></div>
      <div class="parsed-field"><span class="parsed-label">Degree</span><span class="parsed-value">${UI.esc(p.degree || '—')}</span></div>
      <div class="parsed-field"><span class="parsed-label">Skills Found</span><span class="parsed-value">${p.skills || 0}</span></div>
    </div>
    <div class="modal-foot">
      <button type="button" class="btn btn-outline" onclick="Modal.close()">Skip</button>
      <button type="button" class="btn btn-primary" onclick="App.applyParsedSkills(); Modal.close();">Add Skills →</button>
    </div>
  </div>`;
};

Modal.templates.skillModal = function (editId) {
  const skill = editId ? State.skills.filter(s => (s._id || s.id) === editId)[0] : null;
  const isEdit = !!skill;
  const cats = ['Core CS', 'Web', 'AI/ML', 'Data Science', 'Cloud', 'Cybersecurity', 'Design', 'General', 'Programming', 'Database'];
  const catOpts = cats.map(c => `<option ${isEdit && skill.category === c ? 'selected' : ''}>${c}</option>`).join('');
  return `<div class="modal modal-md">
    <div class="modal-head"><h3 class="modal-title">${isEdit ? 'Edit Skill' : 'Add New Skill'}</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body">
      <div class="field"><label>Skill Name</label><input id="new-skill-name" type="text" maxlength="60" class="input" placeholder="e.g., React.js" value="${isEdit ? UI.esc(skill.name) : ''}"></div>
      <div class="field"><label>Category</label><select id="new-skill-category" class="input">${catOpts}</select></div>
      <div class="field">
        <label>Proficiency</label>
        <input id="new-skill-level" type="range" min="0" max="100" value="${isEdit ? skill.level : 70}" class="slider" oninput="document.getElementById('skill-level-display').textContent = this.value + '%'">
        <div id="skill-level-display" class="slider-value">${isEdit ? skill.level : 70}%</div>
      </div>
    </div>
    <div class="modal-foot">
      <button type="button" class="btn btn-outline" onclick="Modal.close()">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="App.${isEdit ? `updateSkill('${editId}')` : 'addSkill()'}">${isEdit ? 'Save' : 'Add'}</button>
    </div>
  </div>`;
};

Modal.templates.postJobModal = function () {
  return `<div class="modal modal-lg">
    <div class="modal-head"><h3 class="modal-title">Post New Opportunity</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body">
      <div class="field"><label>Field / Domain *</label>
        <select id="job-department" class="input">
          <option value="">— Select field —</option>
          <option value="CSE">Computer Science</option><option value="IT">Information Technology</option>
          <option value="AIDS">AI & Data Science</option><option value="ECE">Electronics</option>
          <option value="EEE">Electrical</option><option value="MECH">Mechanical</option>
          <option value="CIVIL">Civil</option><option value="BCOM">B.Com</option><option value="BBA">BBA</option>
        </select>
      </div>
      <div class="field"><label>Job Title *</label><input id="job-title" type="text" class="input" placeholder="e.g., Software Engineer"></div>
      <div class="field"><label>Location</label><input id="job-location" type="text" class="input" placeholder="e.g., Bangalore"></div>
      <div class="field"><label>Skills * (comma-separated)</label><textarea id="job-skills" class="input" rows="3" placeholder="React, Node.js, MongoDB"></textarea></div>
      <div class="field"><label>Description</label><textarea id="job-description" class="input" rows="2"></textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="field"><label>Type</label><select id="job-type" class="input"><option>Internship</option><option>Full-time</option><option>Part-time</option></select></div>
        <div class="field"><label>Salary</label><input id="job-salary" type="text" class="input" placeholder="₹50,000/month"></div>
      </div>
    </div>
    <div class="modal-foot">
      <button type="button" class="btn btn-outline" onclick="Modal.close()">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="App.postJob()">Post</button>
    </div>
  </div>`;
};

Modal.templates.profileModal = function (id) {
  const c = State.candidates.filter(x => x.id === id)[0];
  if (!c) return `<div class="modal modal-sm"><div class="modal-body">${UI.empty('Candidate not found')}</div></div>`;
  const tags = c.skills.map(s => `<span class="tag">${UI.esc(s)}</span>`).join('');
  return `<div class="modal modal-md">
    <div class="modal-head"><h3 class="modal-title">Candidate Profile</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body">
      <div class="profile-head">
        <div style="display:flex;justify-content:center;">${UI.avatar(c.initials, c.color, 'lg')}</div>
        <div class="profile-name">${UI.esc(c.name)}</div>
        <div class="profile-sub">${UI.esc(c.degree)} · ${UI.esc(c.institute)}</div>
        <div class="profile-meta"><div class="match-badge">${c.match || 85}% Match</div>${UI.stars(c.rating)}</div>
      </div>
      <div class="profile-row"><span class="profile-row-label">Email</span><span class="profile-row-value">${UI.esc(c.email)}</span></div>
      <div class="profile-row"><span class="profile-row-label">Experience</span><span class="profile-row-value">${UI.esc(c.experience)}</span></div>
      <div class="profile-row"><span class="profile-row-label">Location</span><span class="profile-row-value">${UI.esc(c.location)}</span></div>
      <div style="margin-top:18px;"><div class="profile-row-label" style="margin-bottom:10px;">Skills</div><div class="tag-row">${tags}</div></div>
    </div>
    <div class="modal-foot">
      <button type="button" class="btn btn-outline" onclick="Modal.close()">Close</button>
      <button type="button" class="btn btn-primary" onclick="App.shortlistCandidate(${c.id})">Shortlist</button>
    </div>
  </div>`;
};

Modal.templates.compareModal = function () {
  const list = State.compareList.map(id => State.candidates.filter(x => x.id === id)[0]).filter(Boolean);
  if (list.length < 2) return `<div class="modal modal-sm"><div class="modal-body">${UI.empty('Select at least 2')}</div></div>`;
  const bestMatch = Math.max.apply(null, list.map(c => c.match || 85));
  const bestRating = Math.max.apply(null, list.map(c => c.rating));
  const allSkills = {}; list.forEach(c => c.skills.forEach(s => allSkills[s] = true));
  const headerCells = list.map(c => `<th><div style="text-align:center;">${UI.avatar(c.initials, c.color)}<div style="font-size:12px;font-weight:700;margin-top:6px;">${UI.esc(c.name)}</div></div></th>`).join('');
  const rowMatch = list.map(c => `<td class="${(c.match || 85) === bestMatch ? 'compare-best' : ''}">${c.match || 85}%</td>`).join('');
  const rowRating = list.map(c => `<td class="${c.rating === bestRating ? 'compare-best' : ''}">${UI.stars(c.rating)} ${c.rating}</td>`).join('');
  const skillRows = Object.keys(allSkills).map(s => {
    const cells = list.map(c => `<td style="${c.skills.indexOf(s) > -1 ? 'color:#047857;font-weight:700;' : 'color:var(--slate-300);'}">${c.skills.indexOf(s) > -1 ? '✓' : '—'}</td>`).join('');
    return `<tr><td><strong>${UI.esc(s)}</strong></td>${cells}</tr>`;
  }).join('');
  return `<div class="modal modal-xl">
    <div class="modal-head"><h3 class="modal-title">⚖️ Compare</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body"><div class="scroll-thin" style="overflow-x:auto;">
      <table class="compare-table">
        <thead><tr><th>Attribute</th>${headerCells}</tr></thead>
        <tbody>
          <tr><td><strong>Match</strong></td>${rowMatch}</tr>
          <tr><td><strong>Rating</strong></td>${rowRating}</tr>
          <tr><td><strong>Experience</strong></td>${list.map(c => `<td>${UI.esc(c.experience)}</td>`).join('')}</tr>
          <tr><td><strong>Location</strong></td>${list.map(c => `<td>${UI.esc(c.location)}</td>`).join('')}</tr>
          ${skillRows}
        </tbody>
      </table>
    </div></div>
    <div class="modal-foot">
      <button type="button" class="btn btn-outline" onclick="Modal.close()">Close</button>
      <button type="button" class="btn btn-primary" onclick="Compare.clear(); Modal.close();">Clear</button>
    </div>
  </div>`;
};

Modal.templates.matchesModal = function () {
  const list = AI.rankJobs(State.skills, State.internships);
  const body = !list.length ? UI.empty('No matches found', '✨') :
    `<div class="scroll-thin" style="max-height:500px;overflow-y:auto;">${list.map(job => {
      const id = job._id || job.id;
      const typeClass = job.type === 'Internship' ? 'internship' : 'fulltime';
      const tags = job.skills.map(s => {
        const matched = State.skills.some(sk => sk.name.toLowerCase().indexOf(s.toLowerCase()) > -1 || s.toLowerCase().indexOf(sk.name.toLowerCase()) > -1);
        return `<span class="tag ${matched ? 'matched' : ''}">${matched ? '✓ ' : ''}${UI.esc(s)}</span>`;
      }).join('');
      return `<div class="list-item" style="padding:16px 18px;">
        <div class="item-row">
          <div class="item-main">
            <div class="item-title-row"><span class="item-title">${UI.esc(job.title)}</span>${job.match >= 90 ? '<span class="top-match-tag">Top Match</span>' : ''}<span class="item-type ${typeClass}">${job.type}</span></div>
            <div class="item-meta">${UI.esc(job.company)} · ${UI.esc(job.location)} · ${UI.esc(job.salary)}</div>
            <div class="tag-row">${tags}</div>
          </div>
          <div class="item-side">
            <div class="match-badge">${job.match}%</div>
            <button type="button" class="apply-link" onclick="Modal.close(); App.applyJob('${id}')">Apply →</button>
          </div>
        </div>
      </div>`;
    }).join('')}</div>`;
  return `<div class="modal modal-xl">
    <div class="modal-head"><h3 class="modal-title">✨ AI Matched Internships (${list.length})</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body" style="padding:0;">${body}</div>
    <div class="modal-foot">
      <button type="button" class="btn btn-outline" onclick="Modal.close()">Close</button>
      <button type="button" class="btn btn-primary" onclick="Modal.close(); App.switchView('student');">Go to Internships</button>
    </div>
  </div>`;
};

Modal.templates.applicationsModal = function () {
  const body = !State.applications.length ? UI.empty('No applications yet', '📋') :
    `<table class="table"><thead><tr><th>Position</th><th>Company</th><th>Date</th><th>Status</th></tr></thead><tbody>${State.applications.map(a => `
      <tr><td><strong>${UI.esc(a.position)}</strong></td><td>${UI.esc(a.company)}</td><td style="color:var(--slate-500);font-size:12px;">${UI.fmtDate(a.date)}</td><td>${UI.statusBadge(a.statusType, a.status)}</td></tr>`).join('')}</tbody></table>`;
  return `<div class="modal modal-xl">
    <div class="modal-head"><h3 class="modal-title">📋 All Applications (${State.applications.length})</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body" style="padding:0;">${body}</div>
    <div class="modal-foot"><button type="button" class="btn btn-primary" onclick="Modal.close()">Close</button></div>
  </div>`;
};

Modal.templates.viewsModal = function () {
  const count = State.profileViewsCount || 35;
  const viewers = State.profileViewers || [];
  let body = `<div style="padding:16px 22px;border-bottom:1px solid var(--slate-100);"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:12px;color:var(--slate-500);font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Total Views</span><span style="font-size:20px;font-weight:800;color:var(--purple-500);">${count}</span></div></div>`;
  body += '<div class="scroll-thin" style="max-height:500px;overflow-y:auto;">';
  if (!viewers.length) body += UI.empty('No recent viewers', '👁');
  else body += viewers.map((v, i) => `<div class="list-item" style="padding:14px 18px;"><div class="item-row" style="align-items:center;"><div class="avatar-row"><div style="font-size:11px;font-weight:800;color:var(--slate-400);width:28px;text-align:center;flex-shrink:0;">#${i + 1}</div>${UI.avatar(v.initials, v.color)}<div><div class="item-title">${UI.esc(v.name)}</div><div class="item-meta" style="margin:0;">${UI.esc(v.role)} · ${UI.fmtDate(v.time)}</div></div></div><div class="item-side"><button type="button" class="apply-link" onclick="Toast.show('Request sent to ${UI.esc(v.name)}','success')">Connect →</button></div></div></div>`).join('');
  body += '</div>';
  return `<div class="modal modal-lg">
    <div class="modal-head"><h3 class="modal-title">👁 Profile Views (${count})</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body" style="padding:0;">${body}</div>
    <div class="modal-foot"><button type="button" class="btn btn-primary" onclick="Modal.close()">Close</button></div>
  </div>`;
};

Modal.templates.skillScoreModal = function () {
  const avg = State.skills.length ? Math.round(State.skills.reduce((a, s) => a + s.level, 0) / State.skills.length) : 0;
  const grade = avg >= 90 ? 'A+' : avg >= 80 ? 'A' : avg >= 70 ? 'B+' : avg >= 60 ? 'B' : 'C';
  const byCat = {};
  State.skills.forEach(s => { if (!byCat[s.category]) byCat[s.category] = []; byCat[s.category].push(s); });
  const catHtml = Object.keys(byCat).map(cat => {
    const skills = byCat[cat];
    const catAvg = Math.round(skills.reduce((a, s) => a + s.level, 0) / skills.length);
    return `<div style="margin-bottom:18px;"><div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="font-size:13px;font-weight:700;color:var(--slate-800);">${UI.esc(cat)}</span><span style="font-size:12px;font-weight:700;color:var(--cse-700);">${catAvg}%</span></div>${UI.progress(catAvg)}<div style="margin-top:8px;font-size:12px;color:var(--slate-500);">${skills.map(s => UI.esc(s.name) + ' (' + s.level + '%)').join(' · ')}</div></div>`;
  }).join('');
  return `<div class="modal modal-md">
    <div class="modal-head"><h3 class="modal-title">⭐ Skill Score Breakdown</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body">
      <div style="text-align:center;padding:16px 0 24px;"><div style="font-size:56px;font-weight:900;color:var(--cse-700);line-height:1;">${grade}</div><div style="font-size:14px;color:var(--slate-500);margin-top:6px;">Average: ${avg}% across ${State.skills.length} skills</div></div>
      ${catHtml || UI.empty('No skills yet', '⭐')}
    </div>
    <div class="modal-foot">
      <button type="button" class="btn btn-outline" onclick="Modal.close(); Modal.open('skillModal');">+ Add Skill</button>
      <button type="button" class="btn btn-primary" onclick="Modal.close()">Close</button>
    </div>
  </div>`;
};

Modal.templates.topMatchModal = function () {
  const list = AI.rankJobs(State.skills, State.internships);
  const job = list[0];
  if (!job) return `<div class="modal modal-sm"><div class="modal-body">${UI.empty('No matches yet', '🎯')}</div></div>`;
  const id = job._id || job.id;
  const typeClass = job.type === 'Internship' ? 'internship' : 'fulltime';
  const matchedSkills = job.skills.filter(s => State.skills.some(sk => sk.name.toLowerCase().indexOf(s.toLowerCase()) > -1 || s.toLowerCase().indexOf(sk.name.toLowerCase()) > -1));
  const missingSkills = job.skills.filter(s => !State.skills.some(sk => sk.name.toLowerCase().indexOf(s.toLowerCase()) > -1 || s.toLowerCase().indexOf(sk.name.toLowerCase()) > -1));
  return `<div class="modal modal-lg">
    <div class="modal-head"><h3 class="modal-title">🎯 Your Top Match</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body">
      <div style="text-align:center;padding:8px 0 20px;"><div class="match-badge" style="font-size:18px;padding:10px 24px;">${job.match}% Match</div></div>
      <div class="item-title-row" style="margin-bottom:6px;"><span style="font-size:18px;font-weight:800;color:var(--slate-900);">${UI.esc(job.title)}</span><span class="item-type ${typeClass}">${job.type}</span></div>
      <div class="item-meta" style="margin-bottom:14px;">${UI.esc(job.company)} · ${UI.esc(job.location)} · ${UI.esc(job.salary)}</div>
      <div class="item-desc" style="font-size:13px;line-height:1.6;margin-bottom:18px;">${UI.esc(job.description)}</div>
      ${matchedSkills.length ? `<div style="margin-bottom:14px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#047857;margin-bottom:8px;">✓ Skills you have (${matchedSkills.length})</div><div class="tag-row">${matchedSkills.map(s => `<span class="tag matched">✓ ${UI.esc(s)}</span>`).join('')}</div></div>` : ''}
      ${missingSkills.length ? `<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--amber-600);margin-bottom:8px;">⚠ Skills to develop (${missingSkills.length})</div><div class="tag-row">${missingSkills.map(s => `<span class="tag">${UI.esc(s)}</span>`).join('')}</div></div>` : ''}
    </div>
    <div class="modal-foot">
      <button type="button" class="btn btn-outline" onclick="Modal.close()">Close</button>
      <button type="button" class="btn btn-primary" onclick="Modal.close(); App.applyJob('${id}')">Apply Now →</button>
    </div>
  </div>`;
};

Modal.templates.averageMatchModal = function () {
  const list = AI.rankJobs(State.skills, State.internships);
  const ranges = { '90-100%': 0, '80-89%': 0, '70-79%': 0, '60-69%': 0, 'Below 60%': 0 };
  list.forEach(j => {
    if (j.match >= 90) ranges['90-100%']++;
    else if (j.match >= 80) ranges['80-89%']++;
    else if (j.match >= 70) ranges['70-79%']++;
    else if (j.match >= 60) ranges['60-69%']++;
    else ranges['Below 60%']++;
  });
  const avg = list.length ? Math.round(list.reduce((a, j) => a + j.match, 0) / list.length) : 0;
  const bars = Object.keys(ranges).map(k => {
    const count = ranges[k], pct = list.length ? Math.round((count / list.length) * 100) : 0;
    return `<div style="margin-bottom:14px;"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;"><span style="font-weight:600;color:var(--slate-700);">${k}</span><span style="font-weight:700;color:var(--slate-800);">${count} (${pct}%)</span></div>${UI.progress(pct)}</div>`;
  }).join('');
  return `<div class="modal modal-md">
    <div class="modal-head"><h3 class="modal-title">📈 Match Analysis</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body">
      <div style="text-align:center;padding:8px 0 24px;"><div style="font-size:56px;font-weight:900;color:var(--accent-600);line-height:1;">${avg}%</div><div style="font-size:14px;color:var(--slate-500);margin-top:6px;">Average across ${list.length} opportunities</div></div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--slate-500);margin-bottom:12px;">Distribution</div>${bars}
    </div>
    <div class="modal-foot"><button type="button" class="btn btn-primary" onclick="Modal.close()">Close</button></div>
  </div>`;
};

Modal.templates.strongSkillsModal = function () {
  const strong = State.skills.filter(s => s.level >= 85);
  const medium = State.skills.filter(s => s.level >= 70 && s.level < 85);
  const weak = State.skills.filter(s => s.level < 70);
  const section = (title, color, list, icon) => {
    if (!list.length) return '';
    return `<div style="margin-bottom:20px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:${color};margin-bottom:10px;">${icon} ${title} (${list.length})</div>${list.map(s => `<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span style="font-weight:600;color:var(--slate-800);">${UI.esc(s.name)}</span><span style="font-weight:700;color:var(--slate-600);">${s.level}%</span></div>${UI.progress(s.level)}<div style="font-size:10px;color:var(--slate-400);margin-top:4px;text-transform:uppercase;">${UI.esc(s.category)}</div></div>`).join('')}</div>`;
  };
  const i = AI.insights();
  const body = section('Strong Skills', '#059669', strong, '💪') + section('Intermediate Skills', '#d97706', medium, '📊') + section('Needs Improvement', '#dc2626', weak, '🎯');
  return `<div class="modal modal-md">
    <div class="modal-head"><h3 class="modal-title">💪 Skill Strength Breakdown</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body">
      ${i.weakCount > 0 ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px;font-size:12px;color:#b45309;margin-bottom:18px;line-height:1.55;">💡 <strong>Tip:</strong> Focus on improving <strong>${UI.esc(i.recommendedSkill)}</strong></div>` : ''}
      ${body || UI.empty('No skills yet', '💪')}
    </div>
    <div class="modal-foot">
      <button type="button" class="btn btn-outline" onclick="Modal.close(); Modal.open('skillModal');">+ Add Skill</button>
      <button type="button" class="btn btn-primary" onclick="Modal.close()">Close</button>
    </div>
  </div>`;
};

Modal.templates.notificationsModal = function () {
  const icons = { match: '✨', view: '👁', success: '✅', info: 'ℹ', warning: '⚠' };
  const filters = [{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'match', label: 'Matches' }, { id: 'info', label: 'Info' }];
  let list = State.notifications;
  if (State.notifFilter === 'unread') list = list.filter(n => !n.read);
  else if (State.notifFilter !== 'all') list = list.filter(n => n.type === State.notifFilter);
  const filterBtns = filters.map(f => `<button type="button" class="notif-filter-btn ${State.notifFilter === f.id ? 'active' : ''}" onclick="App.setNotifFilter('${f.id}')">${f.label}</button>`).join('');
  const body = !list.length ? UI.empty('No notifications', '🔕') :
    `<div class="scroll-thin" style="max-height:400px;overflow-y:auto;">${list.map(n => {
      const id = n._id || n.id;
      return `<div class="notif-item ${n.read ? 'read' : 'unread'}" onclick="App.markNotifRead('${id}')"><span class="notif-icon">${icons[n.type] || 'ℹ'}</span><div style="flex:1;min-width:0;"><div class="notif-text">${UI.esc(n.text)}</div><div class="notif-time">${UI.fmtDate(n.time)}</div></div>${!n.read ? '<span class="notif-dot"></span>' : ''}</div>`;
    }).join('')}</div>`;
  return `<div class="modal modal-md">
    <div class="modal-head"><h3 class="modal-title">🔔 Notifications</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body"><div class="notif-filter">${filterBtns}</div>${body}</div>
    <div class="modal-foot">
      <button type="button" class="btn btn-outline" onclick="App.markAllRead()">Mark all read</button>
      <button type="button" class="btn btn-primary" onclick="Modal.close()">Close</button>
    </div>
  </div>`;
};

Modal.templates.docVaultModal = function () {
  const icons = { pdf: '📄', doc: '📝', img: '🖼️', cert: '🎓' };
  const list = State.documents;
  const body = !list.length ? UI.empty('No documents', '📁') :
    list.map(d => {
      const id = d._id || d.id;
      return `<div class="doc-item"><div class="doc-icon ${d.type}">${icons[d.type] || '📄'}</div><div class="doc-info"><div class="doc-name">${UI.esc(d.name)}</div><div class="doc-meta">${UI.esc(d.size)} · Uploaded ${UI.fmtDate(d.uploaded)}</div></div><button type="button" class="btn btn-ghost btn-xs" onclick="Toast.show('Downloading','info')">⬇</button><button type="button" class="btn btn-ghost btn-xs" onclick="App.deleteDoc('${id}')">🗑</button></div>`;
    }).join('');
  return `<div class="modal modal-lg">
    <div class="modal-head"><h3 class="modal-title">📁 Document Vault</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><p style="font-size:13px;color:var(--slate-500);">Store documents securely.</p><button type="button" class="btn btn-primary btn-sm" onclick="App.addFakeDoc()">+ Add</button></div>
      ${body}
    </div>
    <div class="modal-foot"><button type="button" class="btn btn-primary" onclick="Modal.close()">Done</button></div>
  </div>`;
};

Modal.templates.interviewModal = function () {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const eventDays = State.interviews.map(iv => parseInt(String(iv.date).split('-')[2] || '0', 10));
  let calDays = '';
  for (let i = 0; i < firstDay; i++) calDays += '<div class="cal-day other-month"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate();
    const hasEvent = eventDays.indexOf(d) > -1;
    const isSelected = d === State.interviewSelectedDay;
    const cls = 'cal-day' + (isToday ? ' today' : '') + (hasEvent ? ' event' : '') + (isSelected ? ' selected' : '');
    calDays += `<div class="${cls}" data-day="${d}" onclick="App.pickDay(${d})">${d}</div>`;
  }
  const interviewsHtml = State.interviews.length ? State.interviews.map(iv => {
    const id = iv._id || iv.id;
    return `<div class="doc-item"><div class="doc-icon cert">📅</div><div class="doc-info"><div class="doc-name">${UI.esc(iv.title)}</div><div class="doc-meta">${UI.esc(iv.company)} · ${UI.esc(iv.date)} at ${UI.esc(iv.time)} · ${UI.esc(iv.type)}</div></div><button type="button" class="btn btn-ghost btn-xs" onclick="App.cancelInterview('${id}')">🗑</button></div>`;
  }).join('') : UI.empty('No interviews scheduled', '📅');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const daysHeader = days.map(d => `<div style="text-align:center;font-size:11px;font-weight:700;color:var(--slate-500);padding:4px;">${d}</div>`).join('');
  const infoText = State.interviewSelectedDay ? `Selected: ${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(State.interviewSelectedDay).padStart(2, '0')}` : 'Select a day to schedule an interview';
  return `<div class="modal modal-lg">
    <div class="modal-head"><h3 class="modal-title">📅 Interview Scheduler — ${monthNames[currentMonth]} ${currentYear}</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body">
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:12px;">${daysHeader}</div>
      <div class="cal-grid" id="interview-cal-grid">${calDays}</div>
      <div id="interview-selection-info" style="margin-top:12px;font-size:13px;color:var(--slate-600);">${infoText}</div>
      <div style="margin-top:16px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--slate-500);margin-bottom:10px;">Upcoming Interviews</div>${interviewsHtml}</div>
    </div>
    <div class="modal-foot">
      <button type="button" class="btn btn-outline" onclick="Modal.close()">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="App.scheduleInterview()">Schedule</button>
    </div>
  </div>`;
};

Modal.templates.shortcutsModal = function () {
  const shortcuts = [
    { keys: ['⌘', 'K'], label: 'Global Search' }, { keys: ['?'], label: 'Shortcuts' },
    { keys: ['Esc'], label: 'Close modal' }, { keys: ['D'], label: 'Toggle Dark Mode' },
    { keys: ['T'], label: 'Tour' }, { keys: ['U'], label: 'Upload Resume' }, { keys: ['N'], label: 'Notifications' },
  ];
  return `<div class="modal modal-md">
    <div class="modal-head"><h3 class="modal-title">⌨️ Keyboard Shortcuts</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body">${shortcuts.map(s => `<div class="shortcut-item"><span class="shortcut-label">${UI.esc(s.label)}</span><span class="shortcut-keys">${s.keys.map(k => `<span class="kbd">${k}</span>`).join('')}</span></div>`).join('')}</div>
    <div class="modal-foot"><button type="button" class="btn btn-primary" onclick="Modal.close()">Got it</button></div>
  </div>`;
};

Modal.templates.pipelineModal = function () {
  const stages = ['Applied', 'Screening', 'Interview', 'Offer'];
  const html = stages.map((stage, i) => {
    const candidates = State.candidates.slice(i, i + 2);
    return `<div class="pipeline-col"><div class="pipeline-col-title">${stage}<span class="kanban-col-count">${candidates.length}</span></div>${candidates.length ? candidates.map(c => `<div class="pipeline-card"><div class="pipeline-card-name">${UI.esc(c.name)}</div><div class="pipeline-card-meta">${UI.esc(c.degree)} · ${UI.esc(c.location)}</div></div>`).join('') : '<div style="text-align:center;padding:16px;color:var(--slate-400);font-size:11px;">Empty</div>'}</div>`;
  }).join('');
  return `<div class="modal modal-xl">
    <div class="modal-head"><h3 class="modal-title">🔀 Talent Pipeline</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body"><div class="pipeline">${html}</div></div>
    <div class="modal-foot"><button type="button" class="btn btn-primary" onclick="Modal.close()">Close</button></div>
  </div>`;
};

Modal.templates.globalSearchModal = function () {
  return `<div class="modal modal-lg">
    <div class="modal-head"><h3 class="modal-title">🔍 Global Search</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body">
      <div class="search-wrap" style="margin-bottom:16px;"><span class="search-icon">🔍</span><input id="global-search-input" class="global-search-input" placeholder="Search..." oninput="App.performGlobalSearch()"></div>
      <div id="global-search-results"></div>
    </div>
  </div>`;
};

Modal.templates.mentorsModal = function () {
  const list = State.mentors.length ? State.mentors : [];
  return `<div class="modal modal-lg">
    <div class="modal-head"><h3 class="modal-title">👥 Mentor Network</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body">
      ${list.length ? list.map(m => `<div class="mentor-card"><div class="mentor-avatar avatar ${m.color}">${m.initials}</div><div class="mentor-info"><div class="mentor-name">${UI.esc(m.name)} <span style="font-size:11px;color:var(--slate-400);font-weight:500;">· ${m.rating}★</span></div><div class="mentor-title">${UI.esc(m.title)}</div><div class="mentor-tags">${m.expertise.map(e => `<span class="mentor-tag">${UI.esc(e)}</span>`).join('')}</div></div><div class="mentor-actions"><button type="button" class="btn btn-primary btn-xs" onclick="Toast.show('Request sent','success')">Connect</button></div></div>`).join('') : UI.empty('No mentors')}
    </div>
    <div class="modal-foot"><button type="button" class="btn btn-primary" onclick="Modal.close()">Close</button></div>
  </div>`;
};

Modal.templates.referralModal = function () {
  const code = (Departments[State.department] ? Departments[State.department].short : 'TB') + (State.user ? (State.user.initials || 'XX') : 'XX') + '2026';
  return `<div class="modal modal-md">
    <div class="modal-head"><h3 class="modal-title">🎁 Refer a Friend</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body">
      <div class="referral-box">
        <div class="referral-title">Invite & Earn</div>
        <div class="referral-desc">Get ₹500 per friend who completes profile.</div>
        <div class="referral-code">${code} <button type="button" class="btn btn-ghost btn-xs" style="color:#fff;" onclick="App.copyReferral('${code}')">📋</button></div>
        <div class="referral-stats">
          <div><div class="referral-stat-value">${State.referrals}</div><div class="referral-stat-label">Invited</div></div>
          <div><div class="referral-stat-value">₹${State.referrals * 500}</div><div class="referral-stat-label">Earned</div></div>
          <div><div class="referral-stat-value">3</div><div class="referral-stat-label">Joined</div></div>
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button type="button" class="btn btn-outline" onclick="App.shareReferral()">Share</button>
      <button type="button" class="btn btn-primary" onclick="App.inviteFriend()">+ Invite</button>
    </div>
  </div>`;
};

Modal.templates.quizModal = function () {
  const dept = Departments[State.department] ? Departments[State.department].short : 'CSE';
  return `<div class="modal modal-lg">
    <div class="modal-head"><h3 class="modal-title">🎯 ${dept} Skill Assessment Quiz</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body" id="quiz-body"></div>
    <div class="modal-foot">
      <button type="button" class="btn btn-outline" onclick="Modal.close()">Close</button>
      <button type="button" class="btn btn-primary" onclick="Modal.close(); setTimeout(function(){ Quiz.start(); }, 100);">Restart</button>
    </div>
  </div>`;
};

Modal.templates.videoInterviewModal = function () {
  return `<div class="modal modal-lg">
    <div class="modal-head"><h3 class="modal-title">🎥 Video Interview</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body">
      <div class="video-preview" id="video-preview-area">
        <div class="video-avatar" id="video-avatar-display">${State.user ? State.user.initials : 'AS'}</div>
        <div id="video-status-text" style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);color:#fff;font-size:12px;background:rgba(0,0,0,.5);padding:4px 12px;border-radius:20px;">Connecting...</div>
      </div>
      <div style="text-align:center;margin-bottom:8px;"><div style="font-size:15px;font-weight:800;color:var(--slate-900);">Mock Interview</div><div style="font-size:12px;color:var(--slate-500);margin-top:2px;">Practice Session</div></div>
      <div class="video-controls">
        <button type="button" class="video-control active" id="mic-btn" onclick="App.toggleMic()">🎙️</button>
        <button type="button" class="video-control active" id="cam-btn" onclick="App.toggleCam()">📹</button>
        <button type="button" class="video-control" onclick="Toast.show('Chat feature coming soon','info')">💬</button>
        <button type="button" class="video-control danger" id="end-call-btn" onclick="App.endVideoCall()">📞</button>
      </div>
      <div id="video-timer" style="text-align:center;font-size:14px;font-weight:700;color:var(--slate-600);">00:00</div>
    </div>
    <div class="modal-foot">
      <button type="button" class="btn btn-outline" onclick="Modal.close()">Leave</button>
      <button type="button" class="btn btn-primary" onclick="App.endVideoCallAndSave()">End & Save</button>
    </div>
  </div>`;
};

Modal.templates.confirmModal = function (title, message, actionFn) {
  return `<div class="modal modal-sm">
    <div class="modal-head"><h3 class="modal-title">${UI.esc(title)}</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div class="modal-body"><p style="font-size:14px;color:var(--slate-600);line-height:1.6;">${UI.esc(message)}</p></div>
    <div class="modal-foot">
      <button type="button" class="btn btn-outline" onclick="Modal.close()">Cancel</button>
      <button type="button" class="btn btn-danger" onclick="Modal.close(); ${actionFn}">Confirm</button>
    </div>
  </div>`;
};

Modal.templates.profileMenuModal = function () {
  if (!State.user) return `<div class="modal modal-sm"><div class="modal-body">${UI.empty('Not signed in')}</div></div>`;
  const role = State.user.role;
  const label = UserRegistry.roleLabel(role);
  const emoji = UserRegistry.roleEmoji(role);
  const entry = UserRegistry.get(State.user.email) || {};
  const extras = entry.extras || State.user.extras || {};
  let body = '<div class="pm-body">';
  if (role === 'student') {
    const dept = Departments[State.department] || Departments.CSE;
    const avg = State.skills.length ? Math.round(State.skills.reduce((a, s) => a + s.level, 0) / State.skills.length) : 0;
    const grade = avg >= 90 ? 'A+' : avg >= 80 ? 'A' : avg >= 70 ? 'B+' : avg >= 60 ? 'B' : 'C';
    body += `<div class="pm-info-row"><span class="pm-info-label">Field of Study</span><span class="pm-info-value">${UI.esc(dept.name)}</span></div>`;
    if (extras.gradYear) body += `<div class="pm-info-row"><span class="pm-info-label">Graduation Year</span><span class="pm-info-value">${UI.esc(extras.gradYear)}</span></div>`;
    if (extras.institution) body += `<div class="pm-info-row"><span class="pm-info-label">Institution</span><span class="pm-info-value">${UI.esc(extras.institution)}</span></div>`;
    body += `<div class="pm-info-row"><span class="pm-info-label">Skill Grade</span><span class="pm-info-value">${grade} · ${avg}%</span></div>`;
    body += `<div class="pm-stats"><div class="pm-stat student"><div class="pm-stat-value">${State.skills.length}</div><div class="pm-stat-label">Skills</div></div><div class="pm-stat student"><div class="pm-stat-value">${State.applications.length}</div><div class="pm-stat-label">Applications</div></div><div class="pm-stat student"><div class="pm-stat-value">${State.profileViewsCount || 0}</div><div class="pm-stat-label">Views</div></div></div>`;
  } else if (role === 'industry') {
    const totalApplicants = State.myPostings.reduce((a, p) => a + (p.applicants || 0), 0);
    const totalShortlisted = State.myPostings.reduce((a, p) => a + (p.shortlisted || 0), 0);
    if (extras.company) body += `<div class="pm-info-row"><span class="pm-info-label">Company</span><span class="pm-info-value">${UI.esc(extras.company)}</span></div>`;
    if (extras.designation) body += `<div class="pm-info-row"><span class="pm-info-label">Designation</span><span class="pm-info-value">${UI.esc(extras.designation)}</span></div>`;
    body += `<div class="pm-stats"><div class="pm-stat industry"><div class="pm-stat-value">${State.myPostings.filter(p => p.status === 'Active').length}</div><div class="pm-stat-label">Active Jobs</div></div><div class="pm-stat industry"><div class="pm-stat-value">${totalApplicants}</div><div class="pm-stat-label">Applicants</div></div><div class="pm-stat industry"><div class="pm-stat-value">${totalShortlisted}</div><div class="pm-stat-label">Shortlisted</div></div></div>`;
  } else {
    if (extras.institution) body += `<div class="pm-info-row"><span class="pm-info-label">Institution</span><span class="pm-info-value">${UI.esc(extras.institution)}</span></div>`;
    if (extras.designation) body += `<div class="pm-info-row"><span class="pm-info-label">Designation</span><span class="pm-info-value">${UI.esc(extras.designation)}</span></div>`;
    body += `<div class="pm-stats"><div class="pm-stat academia"><div class="pm-stat-value">82%</div><div class="pm-stat-label">Placed</div></div><div class="pm-stat academia"><div class="pm-stat-value">520+</div><div class="pm-stat-label">Internships</div></div><div class="pm-stat academia"><div class="pm-stat-value">150</div><div class="pm-stat-label">Partners</div></div></div>`;
  }
  body += '</div>';
  const badgeClass = role === 'student' ? '' : role;
  return `<div class="modal modal-md">
    <div class="pm-header ${role}">
      <div class="pm-avatar-wrap">
        <div class="pm-avatar">${State.user.initials || 'U'}</div>
        <div class="pm-role-badge ${badgeClass}">${emoji} ${label}</div>
      </div>
      <div class="pm-name">${UI.esc(State.user.name)}</div>
      <div class="pm-email">${UI.esc(State.user.email)}</div>
    </div>
    ${body}
    <div class="modal-foot">
      <button type="button" class="btn btn-outline" onclick="Tour.start(); Modal.close();">🎯 Tour</button>
      <button type="button" class="btn btn-danger" onclick="Modal.close(); Auth.logout(event);">Sign Out</button>
    </div>
  </div>`;
};

Modal.templates.forgotPasswordModal = function () {
  const step = State.reset.step;
  const email = State.reset.email;
  const role = State.reset.role;
  const roleLabel = role ? UserRegistry.roleLabel(role) : '';
  const roleEmoji = role ? UserRegistry.roleEmoji(role) : '';

  let stepBar = '<div style="display:flex;align-items:center;gap:4px;">';
  stepBar += `<div style="width:26px;height:26px;border-radius:50%;background:${step === 1 ? '#1e3a8a' : step > 1 ? '#10b981' : '#e2e8f0'};color:${step >= 1 ? '#fff' : '#64748b'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">${step > 1 ? '✓' : '1'}</div>`;
  stepBar += `<span style="font-size:11px;font-weight:700;color:${step === 1 ? '#1e3a8a' : step > 1 ? '#059669' : '#94a3b8'};">Email</span></div>`;
  stepBar += `<div style="flex:1;height:2px;background:${step > 1 ? '#10b981' : '#e2e8f0'};"></div>`;
  stepBar += '<div style="display:flex;align-items:center;gap:4px;">';
  stepBar += `<div style="width:26px;height:26px;border-radius:50%;background:${step === 2 ? '#1e3a8a' : step > 2 ? '#10b981' : '#e2e8f0'};color:${step >= 2 ? '#fff' : '#64748b'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">${step > 2 ? '✓' : '2'}</div>`;
  stepBar += `<span style="font-size:11px;font-weight:700;color:${step === 2 ? '#1e3a8a' : step > 2 ? '#059669' : '#94a3b8'};">OTP</span></div>`;
  stepBar += `<div style="flex:1;height:2px;background:${step > 2 ? '#10b981' : '#e2e8f0'};"></div>`;
  stepBar += '<div style="display:flex;align-items:center;gap:4px;">';
  stepBar += `<div style="width:26px;height:26px;border-radius:50%;background:${step === 3 ? '#1e3a8a' : '#e2e8f0'};color:${step === 3 ? '#fff' : '#64748b'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">3</div>`;
  stepBar += `<span style="font-size:11px;font-weight:700;color:${step === 3 ? '#1e3a8a' : '#94a3b8'};">Reset</span></div>`;

  let body = '';
  if (step === 1) {
    body += `<div style="text-align:center;margin-bottom:22px;">
      <div style="width:64px;height:64px;margin:0 auto 12px;border-radius:18px;background:linear-gradient(135deg,#1d4ed8,#1e3a8a);display:flex;align-items:center;justify-content:center;font-size:30px;">🔑</div>
      <h3 style="font-size:20px;font-weight:800;color:var(--slate-900);">Forgot Password?</h3>
      <p style="font-size:13px;color:var(--slate-500);margin-top:6px;">Choose how to receive your OTP.</p>
    </div>
    <div class="field"><label>Email Address <span class="req">*</span></label><input id="forgot-email" type="email" class="input" placeholder="you@example.com" value="${UI.esc(email)}"></div>
    <div class="field">
      <label>OTP Delivery Method <span class="req">*</span></label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div id="channel-email" onclick="State.reset.channel='email';Auth.renderForgotStep();" style="cursor:pointer;padding:14px;border-radius:10px;border:2px solid ${State.reset.channel === 'email' ? '#1e3a8a' : '#e2e8f0'};background:${State.reset.channel === 'email' ? '#eff6ff' : '#fff'};text-align:center;">
          <div style="font-size:24px;margin-bottom:4px;">📧</div>
          <div style="font-size:12px;font-weight:700;color:var(--slate-800);">Email</div>
        </div>
        <div id="channel-sms" onclick="State.reset.channel='sms';Auth.renderForgotStep();" style="cursor:pointer;padding:14px;border-radius:10px;border:2px solid ${State.reset.channel === 'sms' ? '#1e3a8a' : '#e2e8f0'};background:${State.reset.channel === 'sms' ? '#eff6ff' : '#fff'};text-align:center;">
          <div style="font-size:24px;margin-bottom:4px;">📱</div>
          <div style="font-size:12px;font-weight:700;color:var(--slate-800);">Phone (SMS)</div>
        </div>
      </div>
    </div>
    <div id="forgot-error" class="field-error hidden"></div>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 14px;font-size:11px;color:#1e40af;line-height:1.5;margin-top:10px;">
      💡 Use the same email you signed up with. ${State.reset.channel === 'sms' ? 'A phone number must be saved on your account.' : 'We will send a 6-digit code.'}
    </div>`;
  } else if (step === 2) {
    body += `<div style="text-align:center;margin-bottom:18px;">
      <div style="width:64px;height:64px;margin:0 auto 12px;border-radius:18px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);display:flex;align-items:center;justify-content:center;font-size:30px;">${State.reset.channel === 'sms' ? '📱' : '📧'}</div>
      <h3 style="font-size:20px;font-weight:800;color:var(--slate-900);">Verify OTP</h3>
      <p style="font-size:13px;color:var(--slate-500);margin-top:6px;">Code sent to <strong>${UI.esc(State.reset.target || email)}</strong></p>
      ${role ? `<p style="font-size:11px;color:var(--slate-400);margin-top:4px;">Account: ${roleEmoji} ${UI.esc(roleLabel)}</p>` : ''}
    </div>
    ${State.reset.devOtp ? `<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:12px 14px;font-size:12px;color:#92400e;margin-bottom:16px;text-align:center;">🔐 <strong>DEV OTP:</strong> <span style="font-family:monospace;font-size:16px;font-weight:800;letter-spacing:.15em;">${UI.esc(State.reset.devOtp)}</span></div>` : ''}
    <label style="display:block;font-size:12px;font-weight:600;color:var(--slate-700);margin-bottom:8px;text-align:center;">Enter 6-digit OTP</label>
    <div class="otp-grid" id="otp-grid">
      ${[0,1,2,3,4,5].map(i => `<input type="text" inputmode="numeric" maxlength="1" class="otp-input" data-idx="${i}" oninput="Auth.onOtpInput(this)" onkeydown="Auth.onOtpKey(event,this)" onpaste="Auth.onOtpPaste(event)">`).join('')}
    </div>
    <div id="otp-error" class="field-error hidden"></div>
    <div style="text-align:center;margin-top:12px;">
      <span style="font-size:12px;color:var(--slate-500);">Did not receive it? </span>
      <span id="resend-otp-link" style="font-size:13px;color:#1d4ed8;font-weight:600;cursor:pointer;text-decoration:underline;" onclick="Auth.resendOtp()">Resend OTP</span>
      <span id="resend-otp-timer" style="font-size:12px;color:#94a3b8;display:none;margin-left:6px;"></span>
    </div>`;
  } else {
    body += `<div style="text-align:center;margin-bottom:18px;">
      <div style="width:64px;height:64px;margin:0 auto 12px;border-radius:18px;background:linear-gradient(135deg,#059669,#10b981);display:flex;align-items:center;justify-content:center;font-size:30px;">🔐</div>
      <h3 style="font-size:20px;font-weight:800;color:var(--slate-900);">Set New Password</h3>
      <p style="font-size:13px;color:var(--slate-500);margin-top:6px;">Choose a strong password (min 6 characters).</p>
    </div>
    <div class="field"><label>New Password <span class="req">*</span></label><div class="input-wrap"><input id="forgot-new-pwd" type="password" class="input" placeholder="Min 6 characters" oninput="Auth.checkForgotPwdMatch()"><button type="button" class="input-toggle" onclick="Auth.togglePassword('forgot-new-pwd',this)">👁</button></div></div>
    <div class="field"><label>Confirm New Password <span class="req">*</span></label><div class="input-wrap"><input id="forgot-confirm-pwd" type="password" class="input" placeholder="Re-enter password" oninput="Auth.checkForgotPwdMatch()"><button type="button" class="input-toggle" onclick="Auth.togglePassword('forgot-confirm-pwd',this)">👁</button></div><div id="forgot-pwd-match-msg" class="field-error hidden"></div></div>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:10px 14px;font-size:11px;color:#047857;line-height:1.5;">✓ OTP verified for <strong>${UI.esc(email)}</strong></div>`;
  }

  let footButtons = '';
  if (step === 1) {
    footButtons = `<button type="button" class="btn btn-outline" onclick="Modal.close()">Cancel</button><button type="button" class="btn btn-primary" onclick="Auth.sendOtp()">Send OTP →</button>`;
  } else if (step === 2) {
    footButtons = `<button type="button" class="btn btn-outline" onclick="Auth.resetToStep(1)">← Back</button><button type="button" class="btn btn-primary" onclick="Auth.verifyOtp()">Verify OTP →</button>`;
  } else {
    footButtons = `<button type="button" class="btn btn-outline" onclick="Modal.close()">Cancel</button><button type="button" class="btn btn-primary" onclick="Auth.resetPassword()">Reset Password ✓</button>`;
  }

  return `<div class="modal modal-md">
    <div class="modal-head"><h3 class="modal-title">🔐 Password Reset</h3><button type="button" class="modal-close" onclick="Modal.close()">×</button></div>
    <div style="padding:14px 26px;display:flex;align-items:center;gap:8px;background:var(--slate-50);border-bottom:1px solid var(--slate-100);">${stepBar}</div>
    <div class="modal-body">${body}</div>
    <div class="modal-foot">${footButtons}</div>
  </div>`;
};

/* ================== AUTH ================== */
window.Auth = {
  currentRole: 'student',
  currentTab: 'login',

  init() {
    API.setToken(null);
    State.user = null;
    const gate = document.getElementById('auth-gate');
    const app = document.getElementById('app');
    if (gate) gate.classList.remove('hidden');
    if (app) app.classList.add('hidden');
    this.setRole('student');
    this.setTab('login');
  },

  setTab(tab) {
    this.currentTab = tab;
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
    document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
    document.getElementById('signup-form').classList.toggle('hidden', tab !== 'signup');
    this.updateFormFields();
  },

  selectRole(role) { this.setRole(role); },

  setRole(role) {
    this.currentRole = role;
    document.querySelectorAll('.role-chip').forEach(c => c.classList.toggle('active', c.dataset.role === role));
    const lr = document.getElementById('login-role'); if (lr) lr.value = role;
    const sr = document.getElementById('signup-role'); if (sr) sr.value = role;
    this.updateFormFields();
    this.revalidateEmail();
  },

  updateFormFields() {
    const role = this.currentRole;
    const loginCompany = document.getElementById('login-company-field');
    const loginInst = document.getElementById('login-institution-field');
    if (loginCompany) loginCompany.classList.toggle('hidden', role !== 'industry');
    if (loginInst) loginInst.classList.toggle('hidden', role !== 'academia');
    const suStudent = document.getElementById('signup-student-fields');
    const suIndustry = document.getElementById('signup-industry-fields');
    const suAcademia = document.getElementById('signup-academia-fields');
    if (suStudent) suStudent.classList.toggle('hidden', role !== 'student');
    if (suIndustry) suIndustry.classList.toggle('hidden', role !== 'industry');
    if (suAcademia) suAcademia.classList.toggle('hidden', role !== 'academia');
  },

  revalidateEmail() {
    ['login-email', 'signup-email'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.value) this.checkEmailRoleMatch(id);
    });
  },

  checkEmailRoleMatch(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return true;
    const email = (input.value || '').trim();
    if (!email) return true;
    const existingRole = UserRegistry.getRole(email);
    const hintId = inputId + '-role-hint';
    if (existingRole && existingRole !== this.currentRole) {
      input.classList.add('error');
      input.classList.remove('success');
      let hint = document.getElementById(hintId);
      if (!hint) { hint = document.createElement('div'); hint.id = hintId; hint.className = 'field-error'; input.parentNode.appendChild(hint); }
      hint.innerHTML = `<span>⚠</span> This email is registered as <strong>${UI.esc(UserRegistry.roleLabel(existingRole))}</strong>. Cannot use as ${UI.esc(UserRegistry.roleLabel(this.currentRole))}.`;
      return false;
    }
    input.classList.remove('error');
    const h = document.getElementById(hintId); if (h) h.remove();
    return true;
  },

  onDepartmentChange(form) {
    const el = document.getElementById(form + '-department');
    if (form === 'login' && el && el.value) State.department = el.value;
  },

  togglePassword(inputId, btn) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.type = el.type === 'password' ? 'text' : 'password';
    if (btn) btn.textContent = el.type === 'password' ? '👁' : '🙈';
  },

  checkPasswordMatch() {
    const pwd = document.getElementById('signup-password');
    const confirm = document.getElementById('signup-confirm-password');
    const msg = document.getElementById('password-match-msg');
    if (!pwd || !confirm || !msg) return;
    const p = pwd.value || '', c = confirm.value || '';
    if (!c) { msg.classList.add('hidden'); confirm.classList.remove('error', 'success'); return; }
    msg.classList.remove('hidden');
    if (p === c) {
      msg.className = 'field-success';
      msg.innerHTML = '<span>✓</span> Passwords match';
      confirm.classList.remove('error'); confirm.classList.add('success');
    } else {
      msg.className = 'field-error';
      msg.innerHTML = '<span>✕</span> Passwords do not match';
      confirm.classList.remove('success'); confirm.classList.add('error');
    }
  },

  checkForgotPwdMatch() {
    const pwd = document.getElementById('forgot-new-pwd');
    const confirm = document.getElementById('forgot-confirm-pwd');
    const msg = document.getElementById('forgot-pwd-match-msg');
    if (!pwd || !confirm || !msg) return;
    const p = pwd.value || '', c = confirm.value || '';
    if (!c) { msg.classList.add('hidden'); confirm.classList.remove('error', 'success'); return; }
    msg.classList.remove('hidden');
    if (p === c) {
      msg.className = 'field-success';
      msg.innerHTML = '<span>✓</span> Passwords match';
      confirm.classList.remove('error'); confirm.classList.add('success');
    } else {
      msg.className = 'field-error';
      msg.innerHTML = '<span>✕</span> Passwords do not match';
      confirm.classList.remove('success'); confirm.classList.add('error');
    }
  },

  async login(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('login-btn-text');
    const spinner = document.getElementById('login-spinner');
    if (btn) btn.textContent = 'Signing in...';
    if (spinner) spinner.classList.remove('hidden');
    try {
      const email = (document.getElementById('login-email').value || '').trim();
      const password = document.getElementById('login-password').value || '';
      const role = this.currentRole;
      if (!email || !password) { Toast.show('Please enter email and password', 'error'); return; }
      let department = '';
      const extras = {};
      if (role === 'industry') {
        extras.company = (document.getElementById('login-company').value || '').trim();
      } else if (role === 'academia') {
        extras.institution = (document.getElementById('login-institution').value || '').trim();
      }
      const { token, user } = await API.call('/api/auth/login', {
        method: 'POST', auth: false,
        body: { email, password, role },
      });
      API.setToken(token);
      State.user = user;
      State.department = user.department || department || 'CSE';
      Storage.set('user', user);
      Storage.set('department', State.department);
      UserRegistry.register(email, user.role, user.name, password, user.extras || {});
      await App.hydrateFromBackend();
      this.showApp();
      Toast.show('Welcome, ' + user.name + '!', 'success');
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      if (btn) btn.textContent = 'Sign In';
      if (spinner) spinner.classList.add('hidden');
    }
  },

  async signup(e) {
    if (e) e.preventDefault();
    try {
      const role = this.currentRole;
      const name = (document.getElementById('signup-name').value || '').trim();
      const email = (document.getElementById('signup-email').value || '').trim();
      const phoneEl = document.getElementById('signup-phone');
      const phone = phoneEl ? phoneEl.value || '' : '';
      const password = document.getElementById('signup-password').value || '';
      const confirmPassword = document.getElementById('signup-confirm-password').value || '';
      if (!name || !email) { Toast.show('Name and email required', 'error'); return; }
      if (password.length < 6) { Toast.show('Password must be at least 6 characters', 'error'); return; }
      if (password !== confirmPassword) { Toast.show('Passwords do not match', 'error'); return; }

      let department = '';
      const extras = {};
      if (role === 'student') {
        department = document.getElementById('signup-department').value;
        const gradYear = document.getElementById('signup-grad-year').value;
        const currentYear = document.getElementById('signup-current-year').value;
        const institution = document.getElementById('signup-institution').value;
        const cgpa = document.getElementById('signup-cgpa').value;
        if (!department || !gradYear || !currentYear || !institution) { Toast.show('Please fill all student fields', 'warning'); return; }
        extras.gradYear = gradYear; extras.currentYear = currentYear;
        extras.institution = institution; extras.cgpa = cgpa;
      } else if (role === 'industry') {
        const company = document.getElementById('signup-company').value;
        const designation = document.getElementById('signup-designation').value;
        if (!company || !designation) { Toast.show('Please fill company and designation', 'warning'); return; }
        extras.company = company; extras.designation = designation;
        extras.website = document.getElementById('signup-website').value;
        extras.hiringDomain = document.getElementById('signup-hiring-domain').value;
        extras.companySize = document.getElementById('signup-company-size').value;
      } else {
        const instName = document.getElementById('signup-academia-institution').value;
        const academiaEmail = document.getElementById('signup-academia-email').value;
        if (!instName || !academiaEmail) { Toast.show('Please fill institution and official email', 'warning'); return; }
        extras.institution = instName;
        extras.designation = document.getElementById('signup-academia-designation').value;
        extras.department = document.getElementById('signup-academia-dept').value;
        extras.officialEmail = academiaEmail;
        extras.website = document.getElementById('signup-academia-website').value;
      }

      const { token, user } = await API.call('/api/auth/signup', {
        method: 'POST', auth: false,
        body: { name, email, phone, password, role, department, extras },
      });
      API.setToken(token);
      State.user = user;
      State.department = user.department || department || 'CSE';
      Storage.set('user', user);
      Storage.set('department', State.department);
      UserRegistry.register(email, role, name, password, extras);
      await App.hydrateFromBackend();
      this.showApp();
      Toast.show('Account created! Welcome, ' + name, 'success');
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async demoLogin() {
    const role = this.currentRole;
    const email = 'demo-' + role + '@example.com';
    const password = 'demo1234';
    let department = 'CSE';
    if (role === 'student') {
      const d = document.getElementById('login-department');
      if (d && d.value) department = d.value;
    }
    const btn = document.getElementById('login-btn-text');
    const spinner = document.getElementById('login-spinner');
    if (btn) btn.textContent = 'Loading demo...';
    if (spinner) spinner.classList.remove('hidden');
    try {
      let res;
      try {
        res = await API.call('/api/auth/login', { method: 'POST', auth: false, body: { email, password, role } });
      } catch (e) {
        const extras = role === 'student'
          ? { gradYear: '2026', currentYear: 'Final Year', institution: 'National Institute of Engineering', cgpa: '8.5' }
          : role === 'industry'
            ? { company: 'Google India', designation: 'HR Manager', website: 'https://google.com', hiringDomain: 'CSE', companySize: '1000+' }
            : { institution: 'National Institute of Engineering', designation: 'Placement Officer', department: 'ENGINEERING', officialEmail: 'placement@nie.edu.in', website: 'https://nie.edu.in' };
        res = await API.call('/api/auth/signup', {
          method: 'POST', auth: false,
          body: { name: 'Demo ' + role, email, phone: '', password, role, department, extras },
        });
      }
      API.setToken(res.token);
      State.user = res.user;
      State.department = res.user.department || department;
      Storage.set('user', res.user);
      Storage.set('department', State.department);
      UserRegistry.register(email, role, res.user.name, password, res.user.extras || {});
      await App.hydrateFromBackend();
      this.showApp();
      Toast.show('Logged in as Demo ' + role, 'success');
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      if (btn) btn.textContent = 'Sign In';
      if (spinner) spinner.classList.add('hidden');
    }
  },

  logout(e) {
    if (e) e.preventDefault();
    Modal.open('confirmModal', 'Sign Out?', 'You will need to sign in again.', 'Auth.performLogout()');
  },
  performLogout() {
    API.setToken(null);
    Storage.remove('user');
    Storage.remove('department');
    State.user = null;
    if (State.wsTimer) clearInterval(State.wsTimer);
    if (window.Chat) Chat.close();
    document.getElementById('app').classList.add('hidden');
    document.getElementById('auth-gate').classList.remove('hidden');
    Auth.setTab('login');
    Toast.show('Signed out', 'info');
  },

  showApp() {
    document.getElementById('auth-gate').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('user-name').textContent = State.user.name;
    document.getElementById('user-avatar').textContent = State.user.initials;
    const roleLabels = { student: 'Student', industry: 'Industry', academia: 'Academia' };
    document.getElementById('user-role').textContent = roleLabels[State.user.role] || 'User';
    document.getElementById('session-info').textContent = State.user.email;
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const el = document.getElementById('student-greeting');
    if (el) el.innerHTML = `${greet}, ${State.user.name.split(' ')[0]} <span class="badge-verified">✓ Verified</span>`;

    if (State.user.role === 'student' && Departments[State.department]) {
      const d = Departments[State.department];
      const entry = UserRegistry.get(State.user.email);
      const extras = (entry && entry.extras) || State.user.extras || {};
      const sub = document.getElementById('student-subtitle');
      if (sub) {
        const parts = [d.name];
        if (extras.currentYear) parts.push(extras.currentYear);
        else if (extras.gradYear) parts.push('Batch of ' + extras.gradYear);
        if (extras.institution) parts.push(extras.institution);
        sub.textContent = parts.join(' · ');
      }
      const navSub = document.getElementById('navbar-dept-sub');
      if (navSub) navSub.textContent = (extras.institution || d.name) + ' · Placement';
      const st = document.getElementById('skills-card-title');
      if (st) st.textContent = '⚙ ' + d.short + ' Skills';
      const it = document.getElementById('internships-card-title');
      if (it) it.textContent = '✨ AI Recommended ' + d.short + ' Internships';
    }
    if (State.user.role === 'academia') {
      const entry = UserRegistry.get(State.user.email);
      const extras = (entry && entry.extras) || State.user.extras || {};
      const sub = document.getElementById('academia-subtitle');
      if (sub) {
        const parts = [extras.institution || 'Institution'];
        parts.push('Placement Cell');
        if (extras.designation) parts.push(extras.designation);
        sub.textContent = parts.join(' · ');
      }
    }
    App.applyRoleRestrictions(State.user.role);
    App.switchView(State.user.role === 'industry' ? 'industry' : State.user.role === 'academia' ? 'academia' : 'student', false);
    App.refreshAll();
    Realtime.start();
    Realtime.startSimulation();
    setTimeout(() => { if (window.Chat) Chat.initThreads(); }, 500);
    if (!Storage.get('tour_done', false)) setTimeout(() => Tour.start(), 800);
  },

  openForgotPassword() {
    State.reset = { email: '', otp: '', resetToken: '', step: 1, role: '', channel: 'email', attempts: 0, resendTimer: null, devOtp: '', target: '' };
    const le = document.getElementById('login-email');
    if (le && le.value) State.reset.email = le.value.trim();
    try { Modal.open('forgotPasswordModal'); } catch (e) { Toast.show('Could not open reset dialog', 'error'); }
  },

  renderForgotStep() {
    Modal.close();
    setTimeout(() => Modal.open('forgotPasswordModal'), 50);
  },

  resetToStep(step) {
    State.reset.step = step;
    if (step === 2 && State.reset.otp) State.reset.otp = '';
    Modal.close();
    setTimeout(() => Modal.open('forgotPasswordModal'), 60);
  },

  async sendOtp() {
    const emailInput = document.getElementById('forgot-email');
    const errEl = document.getElementById('forgot-error');
    const email = (emailInput ? emailInput.value : '').trim();
    if (!email) { Toast.show('Please enter your email', 'warning'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Toast.show('Invalid email', 'warning'); return; }

    const btn = document.querySelector('#modal-root .modal-foot .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
    try {
      const res = await API.call('/api/auth/otp/send', {
        method: 'POST', auth: false,
        body: { email, channel: State.reset.channel },
      });
      State.reset.email = email;
      State.reset.target = res.target;
      State.reset.devOtp = res.devOtp || '';
      State.reset.step = 2;
      State.reset.attempts = 0;
      Toast.show(`OTP sent via ${res.channel.toUpperCase()} to ${res.target}`, 'success');
      Modal.close();
      setTimeout(() => Modal.open('forgotPasswordModal'), 80);
    } catch (err) {
      if (errEl) {
        errEl.classList.remove('hidden');
        errEl.className = 'field-error';
        errEl.innerHTML = `<span>⚠</span> ${UI.esc(err.message)}`;
      }
      Toast.show(err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Send OTP →'; }
    }
  },

  onOtpInput(input) {
    const val = input.value.replace(/[^0-9]/g, '');
    input.value = val;
    input.classList.toggle('filled', !!val);
    const idx = parseInt(input.dataset.idx, 10);
    if (val && idx < 5) {
      const next = document.querySelector(`#otp-grid .otp-input[data-idx="${idx + 1}"]`);
      if (next) next.focus();
    }
    const all = document.querySelectorAll('#otp-grid .otp-input');
    let combined = '';
    all.forEach(i => combined += i.value);
    if (combined.length === 6) setTimeout(() => Auth.verifyOtp(), 150);
  },

  onOtpKey(e, input) {
    const idx = parseInt(input.dataset.idx, 10);
    if (e.key === 'Backspace' && !input.value && idx > 0) {
      const prev = document.querySelector(`#otp-grid .otp-input[data-idx="${idx - 1}"]`);
      if (prev) { prev.focus(); prev.value = ''; prev.classList.remove('filled'); }
    }
    if (e.key === 'ArrowLeft' && idx > 0) {
      const p = document.querySelector(`#otp-grid .otp-input[data-idx="${idx - 1}"]`);
      if (p) p.focus();
    }
    if (e.key === 'ArrowRight' && idx < 5) {
      const n = document.querySelector(`#otp-grid .otp-input[data-idx="${idx + 1}"]`);
      if (n) n.focus();
    }
  },

  onOtpPaste(e) {
    e.preventDefault();
    const paste = ((e.clipboardData || window.clipboardData).getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
    if (!paste) return;
    const inputs = document.querySelectorAll('#otp-grid .otp-input');
    for (let i = 0; i < paste.length && i < inputs.length; i++) {
      inputs[i].value = paste[i]; inputs[i].classList.add('filled');
    }
    if (paste.length === 6) setTimeout(() => Auth.verifyOtp(), 150);
    else if (paste.length < inputs.length) inputs[paste.length].focus();
  },

  async verifyOtp() {
    const inputs = document.querySelectorAll('#otp-grid .otp-input');
    let combined = '';
    inputs.forEach(i => combined += i.value);
    const errEl = document.getElementById('otp-error');
    if (combined.length !== 6) {
      if (errEl) { errEl.classList.remove('hidden'); errEl.className = 'field-error'; errEl.innerHTML = '<span>⚠</span> Please enter all 6 digits'; }
      return;
    }
    try {
      const res = await API.call('/api/auth/otp/verify', {
        method: 'POST', auth: false,
        body: { email: State.reset.email, otp: combined },
      });
      State.reset.resetToken = res.resetToken;
      State.reset.step = 3;
      Modal.close();
      setTimeout(() => Modal.open('forgotPasswordModal'), 80);
      Toast.show('OTP verified! Set your new password.', 'success');
    } catch (err) {
      State.reset.attempts++;
      if (errEl) {
        errEl.classList.remove('hidden'); errEl.className = 'field-error';
        errEl.innerHTML = `<span>✕</span> ${UI.esc(err.message)}`;
      }
      Toast.show(err.message, 'error');
      const grid = document.getElementById('otp-grid');
      if (grid) {
        grid.style.transition = 'transform .1s';
        grid.style.transform = 'translateX(-6px)';
        setTimeout(() => grid.style.transform = 'translateX(6px)', 80);
        setTimeout(() => grid.style.transform = '', 160);
      }
    }
  },

  async resendOtp() {
    const link = document.getElementById('resend-otp-link');
    const timer = document.getElementById('resend-otp-timer');
    if (link && link.dataset.disabled === 'true') return;
    try {
      const res = await API.call('/api/auth/otp/send', {
        method: 'POST', auth: false,
        body: { email: State.reset.email, channel: State.reset.channel },
      });
      State.reset.devOtp = res.devOtp || '';
      const monoSpans = document.querySelectorAll('#modal-root span[style*="monospace"]');
      monoSpans.forEach(s => { if (/^[0-9]{6}$/.test(s.textContent)) s.textContent = State.reset.devOtp; });
      Toast.show('New OTP sent!', 'success');
      const inputs = document.querySelectorAll('#otp-grid .otp-input');
      inputs.forEach(i => { i.value = ''; i.classList.remove('filled'); });
      if (inputs[0]) inputs[0].focus();
      let remaining = 30;
      if (link) { link.dataset.disabled = 'true'; link.style.color = '#94a3b8'; link.style.cursor = 'not-allowed'; link.style.textDecoration = 'none'; }
      if (timer) { timer.style.display = 'inline'; timer.textContent = `Resend in ${remaining}s`; }
      if (State.reset.resendTimer) clearInterval(State.reset.resendTimer);
      State.reset.resendTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(State.reset.resendTimer); State.reset.resendTimer = null;
          if (link) { link.dataset.disabled = 'false'; link.style.color = '#1d4ed8'; link.style.cursor = 'pointer'; link.style.textDecoration = 'underline'; }
          if (timer) timer.style.display = 'none';
        } else if (timer) timer.textContent = `Resend in ${remaining}s`;
      }, 1000);
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  async resetPassword() {
    const pwdEl = document.getElementById('forgot-new-pwd');
    const confirmEl = document.getElementById('forgot-confirm-pwd');
    const matchMsg = document.getElementById('forgot-pwd-match-msg');
    const pwd = (pwdEl ? pwdEl.value : '') || '';
    const confirm = (confirmEl ? confirmEl.value : '') || '';
    if (pwd.length < 6) { Toast.show('Password must be at least 6 characters', 'warning'); return; }
    if (pwd !== confirm) {
      if (matchMsg) { matchMsg.classList.remove('hidden'); matchMsg.className = 'field-error'; matchMsg.innerHTML = '<span>✕</span> Passwords do not match'; }
      return;
    }
    try {
      await API.call('/api/auth/password/reset', {
        method: 'POST', auth: false,
        body: { resetToken: State.reset.resetToken, newPassword: pwd },
      });
      const email = State.reset.email;
      Modal.close();
      const le = document.getElementById('login-email'); if (le) le.value = email;
      const lp = document.getElementById('login-password'); if (lp) lp.value = '';
      Toast.show('Password reset successfully! Please sign in.', 'success');
      Auth.setTab('login');
    } catch (err) { Toast.show(err.message, 'error'); }
  },
};

/* ================== QUIZ ================== */
window.Quiz = {
  current: 0, answers: [], score: 0, active: false,
  start() { this.current = 0; this.answers = []; this.score = 0; this.active = true; Modal.open('quizModal'); },
  render() {
    const body = document.getElementById('quiz-body'); if (!body) return;
    const quiz = (Departments[State.department] ? Departments[State.department].quiz : Departments.CSE.quiz);
    if (this.current >= quiz.length) { this.showResults(); return; }
    const q = quiz[this.current];
    const progress = quiz.map((_, i) => {
      let cls = 'quiz-progress-seg';
      if (i < Quiz.answers.length) cls += Quiz.answers[i] === quiz[i].correct ? ' correct' : ' wrong';
      else if (i === Quiz.current) cls += ' active';
      return `<div class="${cls}"></div>`;
    }).join('');
    const letters = ['A', 'B', 'C', 'D'];
    const options = q.options.map((opt, i) => `<button type="button" class="quiz-option" onclick="Quiz.answer(${i})" data-idx="${i}"><span class="quiz-option-letter">${letters[i]}</span><span>${UI.esc(opt)}</span></button>`).join('');
    body.innerHTML = `<div class="quiz-progress">${progress}</div><div class="quiz-question">Q${this.current + 1}. ${UI.esc(q.q)}</div><div class="quiz-options">${options}</div>`;
  },
  answer(idx) {
    const quiz = (Departments[State.department] ? Departments[State.department].quiz : Departments.CSE.quiz);
    const q = quiz[this.current];
    if (idx === q.correct) this.score++;
    this.answers.push(idx);
    document.querySelectorAll('.quiz-option').forEach(btn => {
      btn.classList.add('disabled');
      const i = parseInt(btn.dataset.idx, 10);
      if (i === q.correct) btn.classList.add('correct');
      else if (i === idx) btn.classList.add('wrong');
    });
    setTimeout(() => { this.current++; this.render(); }, 1200);
  },
  showResults() {
    const body = document.getElementById('quiz-body');
    const quiz = (Departments[State.department] ? Departments[State.department].quiz : Departments.CSE.quiz);
    const total = quiz.length;
    const pct = Math.round((this.score / total) * 100);
    const grade = pct >= 80 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'D';
    const badge = pct >= 80 ? '🥇 Expert' : pct >= 60 ? '🥈 Advanced' : pct >= 40 ? '🥉 Intermediate' : '📚 Beginner';
    body.innerHTML = `<div style="text-align:center;padding:20px 0;">
      <div style="font-size:64px;margin-bottom:12px;">${pct >= 60 ? '🎉' : '💪'}</div>
      <h3 style="font-size:22px;font-weight:800;color:var(--slate-900);margin-bottom:6px;">${this.score} / ${total} Correct</h3>
      <p style="font-size:14px;color:var(--slate-500);margin-bottom:20px;">${badge} · Grade ${grade}</p>
      <div style="background:var(--slate-50);border-radius:12px;padding:20px;margin-bottom:16px;">
        <div style="font-size:40px;font-weight:900;color:var(--cse-700);">${pct}%</div>
        <div style="font-size:12px;color:var(--slate-500);text-transform:uppercase;font-weight:700;margin-top:4px;">Score</div>
      </div>
    </div>`;
    if (pct >= 60) Toast.show('Excellent!', 'success');
  },
};

/* ================== COMPARE ================== */
window.Compare = {
  toggleMode() {
    State.compareMode = !State.compareMode;
    State.compareList = [];
    const btn = document.getElementById('compare-toggle-btn');
    if (btn) {
      btn.textContent = State.compareMode ? '✖ Exit Compare' : '⚖️ Compare';
      btn.classList.toggle('btn-primary', State.compareMode);
      btn.classList.toggle('btn-outline', !State.compareMode);
    }
    Render.candidates(); this.renderBar();
    Toast.show(State.compareMode ? 'Select up to 3 candidates' : 'Compare mode off', 'info');
  },
  toggle(id) {
    const idx = State.compareList.indexOf(id);
    if (idx > -1) State.compareList.splice(idx, 1);
    else {
      if (State.compareList.length >= 3) { Toast.show('Max 3 candidates', 'warning'); return; }
      State.compareList.push(id);
    }
    Render.candidates(); this.renderBar();
  },
  renderBar() {
    const root = document.getElementById('compare-bar-root'); if (!root) return;
    if (!State.compareList.length) { root.innerHTML = ''; return; }
    const names = State.compareList.map(id => {
      const c = State.candidates.filter(x => x.id === id)[0];
      return c ? (c.name.split(' ')[1] || c.name) : '';
    }).join(', ');
    root.innerHTML = `<div class="compare-bar">
      <span class="compare-bar-text">📊 ${State.compareList.length}: ${UI.esc(names)}</span>
      <div class="compare-bar-actions">
        <button type="button" class="compare-btn ghost" onclick="Compare.clear()">Clear</button>
        <button type="button" class="compare-btn primary" onclick="Compare.open()">Compare →</button>
      </div>
    </div>`;
  },
  clear() { State.compareList = []; Render.candidates(); this.renderBar(); },
  open() {
    if (State.compareList.length < 2) { Toast.show('Select at least 2', 'warning'); return; }
    Modal.open('compareModal');
  },
};

/* ================== TOUR ================== */
window.Tour = {
  steps: [
    { selector: '[data-tour="student-tab"]', title: 'Welcome!', text: 'This is the Student Dashboard.' },
    { selector: '[data-tour="upload-resume"]', title: 'Upload Resume', text: 'AI will parse it and suggest skills.' },
    { selector: '[data-tour="add-skill"]', title: 'Add Your Skills', text: 'Better AI matching.' },
    { selector: '[data-tour="skills-list"]', title: 'Track Skills', text: 'Edit or delete anytime.' },
    { selector: '[data-tour="internships-list"]', title: 'AI Matched', text: 'Click Apply to submit.' },
    { selector: '[data-tour="notif-bell"]', title: 'Stay Updated', text: 'Real-time notifications.' },
  ],
  currentStep: 0,
  start() { this.currentStep = 0; this.show(); },
  show() {
    const root = document.getElementById('tour-root'); if (!root) return;
    const step = this.steps[this.currentStep];
    const target = document.querySelector(step.selector);
    if (!target) { this.next(); return; }
    const rect = target.getBoundingClientRect();
    const pad = 8;
    const hl = `left:${rect.left - pad}px;top:${rect.top - pad}px;width:${rect.width + pad * 2}px;height:${rect.height + pad * 2}px;`;
    let tipTop = rect.bottom + 20;
    const tipLeft = Math.max(20, Math.min(rect.left, window.innerWidth - 360));
    if (tipTop > window.innerHeight - 220) tipTop = rect.top - 220;
    if (tipTop < 20) tipTop = 20;
    const total = this.steps.length;
    root.innerHTML = `<div class="tour-overlay"></div>
      <div class="tour-highlight" style="${hl}"></div>
      <div class="tour-tip" style="left:${tipLeft}px;top:${tipTop}px;">
        <div class="tour-step">Step ${this.currentStep + 1} of ${total}</div>
        <div class="tour-title">${UI.esc(step.title)}</div>
        <div class="tour-text">${UI.esc(step.text)}</div>
        <div class="tour-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="Tour.skip()">Skip</button>
          ${this.currentStep > 0 ? '<button type="button" class="btn btn-outline btn-sm" onclick="Tour.prev()">Back</button>' : ''}
          <button type="button" class="btn btn-primary btn-sm" onclick="Tour.next()">${this.currentStep === total - 1 ? 'Finish' : 'Next →'}</button>
        </div>
      </div>`;
    try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
  },
  next() { if (this.currentStep >= this.steps.length - 1) { this.end(); return; } this.currentStep++; this.show(); },
  prev() { if (this.currentStep > 0) { this.currentStep--; this.show(); } },
  skip() { this.end(); },
  end() { document.getElementById('tour-root').innerHTML = ''; Storage.set('tour_done', true); Toast.show('Tour complete! 🎉', 'success'); },
};

/* ================== CHAT ================== */
window.Chat = {
  open: false, activeThread: null, threads: {}, showEmoji: false,
  emojis: ['😀', '😂', '😍', '👍', '🎉', '🔥', '💯', '🙏', '👏', '❤️', '😊', '🤝', '✨', '✅', '💼', '🎓'],
  quickReplies: ['Thanks!', 'Got it', 'Will do', 'Let me check', 'Sounds great', '👍'],
  seedContacts() {
    const role = State.user ? State.user.role : 'student';
    if (role === 'student') return [
      { id: 'c1', name: 'Placement Officer', initials: 'PO', color: 'purple', role: 'Academia', online: true },
      { id: 'c2', name: 'Company Recruiter', initials: 'CR', color: 'green', role: 'Industry', online: true },
      { id: 'c3', name: 'HR Team', initials: 'HR', color: 'blue', role: 'Industry', online: false },
      { id: 'c4', name: 'Senior Mentor', initials: 'SM', color: 'orange', role: 'Alumni', online: true },
    ];
    if (role === 'industry') return [
      { id: 'i1', name: 'Student Applicant', initials: 'SA', color: 'green', role: 'Student', online: true },
      { id: 'i2', name: 'Top Candidate', initials: 'TC', color: 'purple', role: 'Student', online: true },
      { id: 'i3', name: 'Placement Cell', initials: 'PC', color: 'blue', role: 'Academia', online: true },
    ];
    return [
      { id: 'a1', name: 'Industry Partner', initials: 'IP', color: 'green', role: 'Industry', online: true },
      { id: 'a2', name: 'Company HR', initials: 'CH', color: 'blue', role: 'Industry', online: true },
      { id: 'a3', name: 'Student Representative', initials: 'SR', color: 'purple', role: 'Student', online: true },
    ];
  },
  initThreads() {
    const contacts = this.seedContacts();
    this.threads = {};
    const saved = Storage.get('chat_threads', null);
    contacts.forEach(c => {
      if (saved && saved[c.id]) this.threads[c.id] = { contact: c, messages: saved[c.id].messages || [] };
      else {
        const greeting = c.role === 'Industry' ? 'We are hiring for multiple roles. Feel free to ask!' : c.role === 'Academia' ? 'Reach out for placement support.' : 'Happy to help with career guidance!';
        this.threads[c.id] = { contact: c, messages: [{ from: 'them', text: 'Hi! Welcome to Talent Bridge chat.', time: '10:00 AM' }, { from: 'them', text: greeting, time: '10:01 AM' }] };
      }
    });
  },
  save() { const toSave = {}; Object.keys(this.threads).forEach(k => { toSave[k] = { messages: Chat.threads[k].messages }; }); Storage.set('chat_threads', toSave); },
  openPanel() { this.open = true; if (!Object.keys(this.threads).length) this.initThreads(); this.render(); this.updateBadge(); },
  close() { this.open = false; const p = document.getElementById('chat-panel-root'); if (p) p.innerHTML = ''; },
  toggle() { if (this.open) this.close(); else this.openPanel(); },
  unreadCount() { let t = 0; Object.keys(this.threads).forEach(k => t += this.threads[k].messages.filter(m => m.unread).length); return t; },
  updateBadge() {
    const b = document.getElementById('chat-badge'); if (!b) return;
    const c = this.unreadCount();
    if (c > 0) { b.textContent = c > 9 ? '9+' : c; b.classList.remove('hidden'); }
    else b.classList.add('hidden');
  },
  render() {
    const root = document.getElementById('chat-panel-root'); if (!root) return;
    if (!this.open) { root.innerHTML = ''; return; }
    const threadKeys = Object.keys(this.threads); const self = this;
    const threadList = threadKeys.map(k => {
      const t = self.threads[k]; const last = t.messages[t.messages.length - 1];
      const unread = t.messages.filter(m => m.unread).length;
      const isActive = self.activeThread === t.contact.id;
      return `<div class="chat-thread ${isActive ? 'active' : ''}" onclick="Chat.selectThread('${t.contact.id}')">
        ${UI.avatar(t.contact.initials, t.contact.color)}
        <div class="chat-thread-info"><div class="chat-thread-name">${UI.esc(t.contact.name)}</div><div class="chat-thread-preview">${UI.esc(last ? last.text : 'No messages')}</div></div>
        ${unread ? '<span class="chat-thread-dot"></span>' : ''}
      </div>`;
    }).join('');
    let convHtml = '';
    if (this.activeThread && this.threads[this.activeThread]) {
      const t = this.threads[this.activeThread];
      const msgs = t.messages.map(m => `<div class="chat-msg ${m.from}">${UI.esc(m.text)}<span class="chat-msg-time">${UI.esc(m.time)}</span></div>`).join('');
      const emojiBar = this.showEmoji ? `<div class="chat-emoji-bar">${this.emojis.map(e => `<span class="chat-emoji" onclick="Chat.insertEmoji('${e}')">${e}</span>`).join('')}</div>` : '';
      const quickBar = !this.showEmoji ? `<div style="padding:6px 12px 0;display:flex;gap:6px;flex-wrap:wrap;background:#fff;">${this.quickReplies.map(q => `<button type="button" class="btn btn-outline btn-xs" onclick="Chat.sendQuick('${q}')">${q}</button>`).join('')}</div>` : '';
      convHtml = `<div class="chat-conv">
        <div class="chat-conv-head">
          <span class="chat-back" onclick="Chat.selectThread(null)">←</span>
          ${UI.avatar(t.contact.initials, t.contact.color)}
          <div style="flex:1;min-width:0;"><div class="chat-conv-name">${UI.esc(t.contact.name)}</div><div class="chat-conv-status">${t.contact.online ? '● Online' : '○ Offline'}</div></div>
          <button type="button" class="btn btn-ghost btn-xs" onclick="Chat.clearHistory()">🗑</button>
        </div>
        <div class="chat-msgs" id="chat-msgs">${msgs}</div>
        ${emojiBar}${quickBar}
        <div class="chat-input-row">
          <button type="button" class="chat-attach" onclick="Chat.toggleEmoji()">😊</button>
          <button type="button" class="chat-attach" onclick="Chat.attachFile()">📎</button>
          <input class="chat-input" id="chat-input" placeholder="Type a message..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();Chat.send();}">
          <button type="button" class="chat-send" onclick="Chat.send()">➤</button>
        </div>
      </div>`;
    } else {
      convHtml = `<div class="chat-empty"><div style="font-size:44px;margin-bottom:12px;">💬</div><div style="font-weight:700;color:var(--slate-700);margin-bottom:4px;">Your Messages</div>Select a conversation to start chatting</div>`;
    }
    const sidebarHtml = !this.activeThread ? `<div class="chat-sidebar" id="chat-sidebar"><div class="chat-tab active">All Chats</div></div>` : '';
    root.innerHTML = `<div class="chat-panel">
      <div class="chat-head">
        <div class="chat-head-title">💬 Messages <span style="font-size:11px;font-weight:600;opacity:.7;">(${threadKeys.length})</span></div>
        <div class="chat-head-actions"><button type="button" class="chat-head-btn" onclick="Chat.closeAll()">⨯</button><button type="button" class="chat-head-btn" onclick="Chat.close()">✕</button></div>
      </div>
      <div class="chat-body">${sidebarHtml}<div class="chat-list">${this.activeThread ? '' : `<div class="chat-thread-list">${threadList}</div>`}${convHtml}</div></div>
    </div>`;
    setTimeout(() => { const m = document.getElementById('chat-msgs'); if (m) m.scrollTop = m.scrollHeight; }, 50);
  },
  selectThread(id) {
    this.activeThread = id; this.showEmoji = false;
    if (id && this.threads[id]) this.threads[id].messages.forEach(m => m.unread = false);
    this.save(); this.render(); this.updateBadge();
    const inp = document.getElementById('chat-input'); if (inp) inp.focus();
  },
  toggleEmoji() { this.showEmoji = !this.showEmoji; this.render(); },
  insertEmoji(e) { const i = document.getElementById('chat-input'); if (i) { i.value += ' ' + e; i.focus(); } },
  attachFile() { Toast.show('File attachment coming soon', 'info'); },
  sendQuick(text) { const i = document.getElementById('chat-input'); if (i) i.value = text; this.send(); },
  send() {
    const inp = document.getElementById('chat-input'); if (!inp) return;
    const text = inp.value.trim(); if (!text || !this.activeThread) return;
    const t = this.threads[this.activeThread];
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    t.messages.push({ from: 'out', text, time: now });
    inp.value = ''; this.save(); this.render();
    setTimeout(() => {
      const replies = ['Got it, thanks!', 'Sure, I will get back to you.', 'That sounds good.', 'Let me check and confirm.', '👍', 'Great question!', 'Thanks for reaching out!', 'Noted. Will follow up.', 'Yes, absolutely!', 'Could you share more details?'];
      t.messages.push({ from: 'them', text: replies[Math.floor(Math.random() * replies.length)], time: now, unread: false });
      this.save(); this.render(); this.updateBadge();
    }, 1200 + Math.random() * 1500);
  },
  clearHistory() { if (!this.activeThread) return; Modal.open('confirmModal', 'Clear Chat?', 'This will delete all messages in this conversation.', 'Chat.performClear()'); },
  performClear() { if (!this.activeThread) return; this.threads[this.activeThread].messages = []; this.save(); this.render(); Toast.show('Chat cleared', 'info'); },
  closeAll() { Object.keys(this.threads).forEach(k => this.threads[k].messages.forEach(m => m.unread = false)); this.activeThread = null; this.save(); this.render(); this.updateBadge(); },
};

/* ================== REALTIME ================== */
window.Realtime = {
  start() {
    const scroll = document.getElementById('ticker-scroll'); if (!scroll) return;
    const content = State.ticker.map(t => `<span>${UI.esc(t)}</span>`).join('');
    scroll.innerHTML = content + content;
  },
  pushEvent(text) { State.ticker.unshift(text); if (State.ticker.length > 12) State.ticker.pop(); this.start(); },
  startSimulation() {
    if (State.wsTimer) clearInterval(State.wsTimer);
    State.wsTimer = setInterval(() => {
      if (!State.user || !State.candidates.length) return;
      const events = [
        `🎉 ${State.candidates[Math.floor(Math.random() * State.candidates.length)].name} was just shortlisted`,
        `✨ New internship posted: ${State.internships[Math.floor(Math.random() * State.internships.length)].title}`,
        `📈 Placement rate updated: ${82 + Math.floor(Math.random() * 3)}%`,
      ];
      this.pushEvent(events[Math.floor(Math.random() * events.length)]);
    }, 8000);
  },
};

/* ================== APP ================== */
window.App = {
  async hydrateFromBackend() {
    if (!State.user) return;
    try {
      const [skills, apps, notifs, docs] = await Promise.all([
        API.call('/api/skills').catch(() => []),
        API.call('/api/applications').catch(() => []),
        API.call('/api/notifications').catch(() => []),
        API.call('/api/documents').catch(() => []),
      ]);
      State.skills = (skills || []).map(s => ({ _id: s._id, id: s._id, name: s.name, level: s.level, category: s.category }));
      State.applications = apps || [];
      State.notifications = notifs || [];
      State.documents = (docs || []).map(d => ({ _id: d._id, id: d._id, name: d.name, type: d.type, size: d.size, uploaded: d.uploaded }));

      try {
        const me = await API.call('/api/auth/me');
        if (me && me.user) {
          State.user = Object.assign({}, State.user, me.user);
          State.savedInternships = me.user.savedInternships || [];
          State.referrals = me.user.referrals || 0;
          State.profileViewsCount = me.user.profileViews || 35;
        }
      } catch (e) {}

      try {
        const mentors = await API.call('/api/mentors', { auth: false });
        State.mentors = mentors || [];
      } catch (e) {}

      try {
        if (State.user.role === 'industry') {
          const mine = await API.call('/api/jobs/mine');
          State.myPostings = mine || [];
        }
      } catch (e) {}

      this.loadDepartmentData(State.department || 'CSE');

      State.candidates = [
        { id: 1, name: 'Ananya Sharma', initials: 'AS', degree: 'B.Tech CSE', institute: 'National Institute of Engineering', skills: ['DSA', 'Full Stack', 'ML'], color: 'green', experience: '2 years coding', location: 'Delhi', email: 'ananya@nie.edu.in', rating: 4.8 },
        { id: 2, name: 'Rahul Verma', initials: 'RV', degree: 'B.Tech MECH', institute: 'IIT Delhi', skills: ['CAD', 'SolidWorks', 'ANSYS'], color: 'blue', experience: '1 year internship', location: 'Mumbai', email: 'rahul@iitd.ac.in', rating: 4.3 },
        { id: 3, name: 'Priya Patel', initials: 'PP', degree: 'B.Tech ECE', institute: 'IIT Bombay', skills: ['VLSI', 'DSP', 'Embedded'], color: 'purple', experience: '3 years research', location: 'Pune', email: 'priya@iitb.ac.in', rating: 4.7 },
        { id: 4, name: 'Arjun Mehta', initials: 'AM', degree: 'B.Com', institute: 'NIT Trichy', skills: ['Accounting', 'Tally', 'Excel'], color: 'orange', experience: 'Fresher', location: 'Chennai', email: 'arjun@nitt.edu', rating: 4.1 },
        { id: 5, name: 'Sneha Reddy', initials: 'SR', degree: 'B.Tech CIVIL', institute: 'IIIT Hyderabad', skills: ['STAAD Pro', 'AutoCAD', 'Surveying'], color: 'green', experience: '2 years', location: 'Hyderabad', email: 'sneha@iiit.ac.in', rating: 4.6 },
      ];

      try {
        const backendJobs = await API.call('/api/jobs', { auth: false });
        if (backendJobs && backendJobs.length) {
          const mapped = backendJobs.map(j => ({
            id: j._id, _id: j._id, title: j.title, company: j.company || 'Company',
            location: j.location || 'Remote', skills: j.skills || [],
            type: j.type || 'Internship', salary: j.salary || 'Negotiable',
            description: j.description || '', posted: j.posted,
          }));
          State.internships = mapped.concat(State.internships);
        }
      } catch (e) {}
    } catch (e) { console.error('hydrate', e); }
  },

  loadDepartmentData(dept) {
    if (!Departments[dept]) dept = 'CSE';
    const d = Departments[dept];
    if (!State.skills.length) State.skills = JSON.parse(JSON.stringify(d.skills));
    if (!State.internships.length) State.internships = JSON.parse(JSON.stringify(d.internships));
    State.skillGaps = JSON.parse(JSON.stringify(d.skillGaps));
    State.trendingSkills = JSON.parse(JSON.stringify(d.trendingSkills));
    State.feedback = JSON.parse(JSON.stringify(d.feedback));
    State.ticker = JSON.parse(JSON.stringify(d.ticker));
    State.trends = State.trends.length ? State.trends : [
      { year: "'22", value: 58 }, { year: "'23", value: 65 }, { year: "'24", value: 72 },
      { year: "'25", value: 78 }, { year: "'26", value: 82 },
    ];
    State.activities = State.activities.length ? State.activities : [
      { text: 'Priya Patel applied for SDE Intern at Google', time: '2 min ago' },
      { text: 'Microsoft posted a new internship', time: '15 min ago' },
      { text: 'Rahul Verma was shortlisted by Flipkart', time: '1 hour ago' },
      { text: 'Amazon viewed 8 candidate profiles', time: '2 hours ago' },
      { text: 'New industry partner joined: Zoho', time: '3 hours ago' },
    ];
    State.department = dept;
  },

  refreshAll() {
    Render.skills(); Render.internships(); Render.applications(); Render.kanban();
    Render.timeline(); Render.candidates(); Render.myPostings(); Render.insights();
    Render.skillGaps(); Render.trends(); Render.trendingSkills(); Render.feedback();
    Render.activities(); Render.stats();
  },

  refresh() { this.refreshAll(); },

  init() {
    State.theme = Storage.get('theme', 'light');
    this.applyTheme();
    this.bindEvents();
    this.setupNetworkListeners();
    Auth.init();
    console.log('%c✅ Talent Bridge v9 — Backend connected', 'color:#1e3a8a;font-weight:bold;');
  },

  bindEvents() {
    document.addEventListener('change', e => { if (e.target && e.target.id === 'resume-input') this.processResume(e.target.files[0]); });
    document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#drop-zone')) { const i = document.getElementById('resume-input'); if (i) i.click(); } });
    document.addEventListener('dragover', e => { const dz = e.target.closest && e.target.closest('#drop-zone'); if (dz) { e.preventDefault(); dz.classList.add('drag'); } });
    document.addEventListener('dragleave', e => { const dz = e.target.closest && e.target.closest('#drop-zone'); if (dz) dz.classList.remove('drag'); });
    document.addEventListener('drop', e => { const dz = e.target.closest && e.target.closest('#drop-zone'); if (dz) { e.preventDefault(); dz.classList.remove('drag'); if (e.dataTransfer.files[0]) this.processResume(e.dataTransfer.files[0]); } });
    document.addEventListener('input', e => { if (e.target && (e.target.id === 'login-email' || e.target.id === 'signup-email')) Auth.checkEmailRoleMatch(e.target.id); });
    document.addEventListener('blur', e => { if (e.target && (e.target.id === 'login-email' || e.target.id === 'signup-email')) Auth.checkEmailRoleMatch(e.target.id); }, true);
    document.addEventListener('keydown', e => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(document.activeElement.tagName) > -1;
      if (typing && e.key !== 'Escape') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); this.openGlobalSearch(); return; }
      if (e.key === '?' && !typing) { e.preventDefault(); Modal.open('shortcutsModal'); return; }
      if (e.key === 'Escape') return;
      if (e.key === 'd' && !typing) this.toggleTheme();
      if (e.key === 't' && !typing) Tour.start();
      if (e.key === 'u' && !typing) Modal.open('resumeModal');
      if (e.key === 'n' && !typing) this.openNotifications();
    });
    window.addEventListener('resize', () => Render.trends());
  },
  setupNetworkListeners() {
    const update = () => { const b = document.getElementById('offline-banner'); if (b) b.classList.toggle('hidden', navigator.onLine); };
    window.addEventListener('online', () => { update(); Toast.show('Back online', 'success'); });
    window.addEventListener('offline', () => { update(); Toast.show('Offline', 'warning'); });
    update();
  },
  switchView(view, updateHash) {
    if (State.user && State.user.role && view !== State.user.role) { Toast.show('Access restricted', 'warning'); return; }
    if (updateHash === undefined) updateHash = true;
    document.querySelectorAll('.view').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById('view-' + view);
    if (target) target.classList.remove('hidden');
    document.querySelectorAll('[data-nav]').forEach(btn => btn.classList.toggle('active', btn.dataset.nav === view));
    if (updateHash) { try { history.replaceState(null, '', '#' + view); } catch (e) {} }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => Render.trends(), 100);
  },
  toggleTheme() {
    State.theme = State.theme === 'light' ? 'dark' : 'light';
    this.applyTheme(); Storage.set('theme', State.theme);
    const icon = document.getElementById('theme-icon'); if (icon) icon.textContent = State.theme === 'dark' ? '☀️' : '🌙';
    Toast.show((State.theme === 'dark' ? '🌙 Dark' : '☀️ Light') + ' mode', 'info');
  },
  applyTheme() {
    document.documentElement.setAttribute('data-theme', State.theme);
    const icon = document.getElementById('theme-icon'); if (icon) icon.textContent = State.theme === 'dark' ? '☀️' : '🌙';
  },
  applyRoleRestrictions(role) {
    document.querySelectorAll('.navbar-tabs .nav-tab').forEach(tab => {
      const r = tab.getAttribute('data-nav');
      if (r === role) { tab.style.display = ''; tab.classList.add('active'); }
      else { tab.style.display = 'none'; tab.classList.remove('active'); }
    });
    document.querySelectorAll('.mobile-tabs .mobile-tab').forEach(tab => {
      const r = tab.getAttribute('data-nav');
      tab.style.display = r === role ? '' : 'none';
    });
    const mt = document.querySelector('.mobile-tabs'); if (mt) mt.style.display = 'none';
  },
  setAppView(view, btn) {
    State.appView = view;
    document.getElementById('applications-table-wrap').classList.toggle('hidden', view !== 'table');
    document.getElementById('applications-kanban-wrap').classList.toggle('hidden', view !== 'kanban');
    document.getElementById('applications-timeline-wrap').classList.toggle('hidden', view !== 'timeline');
    document.querySelectorAll('#view-student .segmented-item').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (view === 'kanban') Render.kanban();
    if (view === 'timeline') Render.timeline();
  },
  setChartType(type) {
    State.chartType = type;
    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
    const b = document.getElementById('chart-' + type); if (b) b.classList.add('active');
    Render.trends();
  },
  openProfileMenu() { Modal.open('profileMenuModal'); },
  openDocVault() { Modal.open('docVaultModal'); },
  openMatchesModal() { Modal.open('matchesModal'); },
  openApplicationsModal() { Modal.open('applicationsModal'); },
  openViewsModal() { Modal.open('viewsModal'); },
  openSkillScoreModal() { Modal.open('skillScoreModal'); },
  openTopMatchModal() { Modal.open('topMatchModal'); },
  openAverageMatchModal() { Modal.open('averageMatchModal'); },
  openStrongSkillsModal() { Modal.open('strongSkillsModal'); },
  openNotifications() { Modal.open('notificationsModal'); },

  async markAllRead() {
    try { await API.call('/api/notifications/read-all', { method: 'PATCH' }); } catch (e) {}
    State.notifications.forEach(n => n.read = true);
    Render.stats();
    Modal.close();
    setTimeout(() => Modal.open('notificationsModal'), 50);
  },
  async markNotifRead(id) {
    try { await API.call('/api/notifications/' + id + '/read', { method: 'PATCH' }); } catch (e) {}
    const n = State.notifications.filter(x => (x._id || x.id) === id)[0];
    if (n) n.read = true;
    Render.stats();
    Modal.close();
    setTimeout(() => Modal.open('notificationsModal'), 50);
  },
  setNotifFilter(f) { State.notifFilter = f; Modal.close(); setTimeout(() => Modal.open('notificationsModal'), 50); },

  openIndustryStat(type) {
    const titles = { active: '📢 Active Postings', applicants: '👥 Total Applicants', shortlisted: '⭐ Shortlisted Candidates', hired: '🎉 Hired This Year' };
    let body = '';
    if (type === 'active') {
      body = State.myPostings.length
        ? State.myPostings.map(p => `<div class="list-item"><div class="item-row"><div class="item-main"><div class="item-title-row"><span class="item-title">${UI.esc(p.title)}</span>${UI.statusBadge('success', p.status)}</div><div class="item-meta">${UI.esc(p.location)} · ${UI.esc(p.type)}</div></div><div class="item-side"><div class="match-badge">${p.applicants} applicants</div></div></div></div>`).join('')
        : UI.empty('No active postings', '📢');
    } else if (type === 'applicants') {
      body = State.candidates.slice(0, 6).map(c => `<div class="list-item"><div class="item-row" style="align-items:center;"><div class="avatar-row">${UI.avatar(c.initials, c.color)}<div><div class="item-title">${UI.esc(c.name)}</div><div class="item-meta" style="margin:0;">${UI.esc(c.degree)}</div></div></div><div class="item-side"><button type="button" class="apply-link" onclick="Modal.close(); setTimeout(function(){ Modal.open('profileModal',${c.id}); },50);">View →</button></div></div></div>`).join('');
    } else if (type === 'shortlisted') {
      body = State.candidates.slice(1, 5).map(c => `<div class="list-item"><div class="item-row" style="align-items:center;"><div class="avatar-row">${UI.avatar(c.initials, c.color)}<div><div class="item-title">${UI.esc(c.name)}</div><div class="item-meta" style="margin:0;">${UI.esc(c.degree)} · ${UI.esc(c.institute)}</div></div></div><div class="item-side">${UI.stars(c.rating)}</div></div></div>`).join('');
    } else {
      body = State.candidates.slice(0, 4).map(c => `<div class="list-item"><div class="item-row" style="align-items:center;"><div class="avatar-row">${UI.avatar(c.initials, c.color)}<div><div class="item-title">${UI.esc(c.name)}</div><div class="item-meta" style="margin:0;">Hired · ${UI.esc(c.degree)}</div></div></div></div></div>`).join('');
    }
    Modal.open('genericListModal', titles[type], body);
  },

  openAcademiaStat(type) {
    let body = '';
    if (type === 'placement') {
      body = `<div style="padding:20px;"><div style="text-align:center;margin-bottom:20px;"><div style="font-size:48px;font-weight:900;color:#047857;">82%</div><div style="font-size:13px;color:var(--slate-500);">Overall placement rate</div></div>${State.trends.map(t => `<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span style="font-weight:600;">${t.year}</span><span style="font-weight:700;">${t.value}%</span></div>${UI.progress(t.value)}</div>`).join('')}</div>`;
    } else if (type === 'internships') {
      body = State.internships.map(j => `<div class="list-item"><div class="item-row"><div class="item-main"><div class="item-title">${UI.esc(j.title)}</div><div class="item-meta">${UI.esc(j.company)} · ${UI.esc(j.location)}</div></div><div class="item-side"><span class="match-badge">${UI.esc(j.type)}</span></div></div></div>`).join('');
    } else if (type === 'partners') {
      const partners = ['Google India', 'Microsoft', 'Amazon', 'Tata Motors', 'L&T', 'Infosys', 'TCS', 'Wipro', 'Deloitte', 'KPMG'];
      body = partners.map((p, i) => `<div class="list-item"><div class="item-row" style="align-items:center;"><div class="avatar-row">${UI.avatar(p.split(' ').map(w => w[0]).join('').slice(0, 2), ['green', 'blue', 'purple', 'orange'][i % 4])}<div><div class="item-title">${UI.esc(p)}</div><div class="item-meta" style="margin:0;">Active industry partner</div></div></div></div></div>`).join('');
    } else {
      body = `<div style="padding:20px;text-align:center;"><div style="font-size:48px;font-weight:900;color:var(--accent-600);">₹6.8 LPA</div><div style="font-size:13px;color:var(--slate-500);margin-bottom:20px;">Average package</div></div><div style="padding:0 20px 20px;">${[['Highest Package', '₹12.5 LPA', '#047857'], ['Median Package', '₹6.5 LPA', 'var(--blue-500)'], ['Lowest Package', '₹3.5 LPA', 'var(--slate-500)']].map(r => `<div class="profile-row"><span class="profile-row-label">${r[0]}</span><span class="profile-row-value" style="color:${r[2]};">${r[1]}</span></div>`).join('')}</div>`;
    }
    const titles = { placement: '📈 Placement Analytics', internships: '💼 Internships Facilitated', partners: '🏢 Industry Partners', package: '💰 Package Breakdown' };
    Modal.open('genericListModal', titles[type], body);
  },

  openGlobalSearch() {
    Modal.open('globalSearchModal');
    setTimeout(() => { const i = document.getElementById('global-search-input'); if (i) { i.focus(); App.performGlobalSearch(); } }, 100);
  },

  performGlobalSearch() {
    const input = document.getElementById('global-search-input');
    const results = document.getElementById('global-search-results');
    if (!input || !results) return;
    const q = input.value.trim().toLowerCase();
    if (!q) { results.innerHTML = '<p style="font-size:12px;color:var(--slate-400);text-align:center;padding:20px;">Type to search...</p>'; return; }
    const items = [];
    State.internships.forEach(j => {
      if (j.title.toLowerCase().indexOf(q) > -1 || j.company.toLowerCase().indexOf(q) > -1)
        items.push({ type: 'Internship', icon: '💼', label: j.title + ' · ' + j.company, action: "App.switchView('student'); Modal.close();" });
    });
    State.candidates.forEach(c => {
      if (c.name.toLowerCase().indexOf(q) > -1 || c.institute.toLowerCase().indexOf(q) > -1)
        items.push({ type: 'Candidate', icon: '👤', label: c.name + ' · ' + c.degree, action: `Modal.close(); setTimeout(function(){ Modal.open('profileModal',${c.id}); },50);` });
    });
    State.mentors.forEach(m => {
      if (m.name.toLowerCase().indexOf(q) > -1 || m.expertise.join(' ').toLowerCase().indexOf(q) > -1)
        items.push({ type: 'Mentor', icon: '👥', label: m.name + ' · ' + m.title, action: "Modal.close(); setTimeout(function(){ Modal.open('mentorsModal'); },50);" });
    });
    if (!items.length) { results.innerHTML = `<p style="font-size:13px;color:var(--slate-400);text-align:center;padding:20px;">No results for "${UI.esc(q)}"</p>`; return; }
    results.innerHTML = items.slice(0, 10).map(r => `<div class="search-result" onclick="${r.action}"><span class="search-result-icon">${r.icon}</span><span>${UI.esc(r.label)}</span><span class="search-result-type">${r.type}</span></div>`).join('');
  },

  async addSkill() {
    const name = document.getElementById('new-skill-name').value.trim();
    const category = document.getElementById('new-skill-category').value;
    const level = parseInt(document.getElementById('new-skill-level').value, 10);
    if (!name) { Toast.show('Skill name required', 'error'); return; }
    try {
      const s = await API.call('/api/skills', { method: 'POST', body: { name, level, category } });
      State.skills.push({ _id: s._id, id: s._id, name: s.name, level: s.level, category: s.category });
      Render.skills(); Render.stats(); Render.internships(); Render.insights();
      Modal.close();
      Toast.show(`Skill "${name}" added`, 'success');
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  async updateSkill(id) {
    const name = document.getElementById('new-skill-name').value.trim();
    const category = document.getElementById('new-skill-category').value;
    const level = parseInt(document.getElementById('new-skill-level').value, 10);
    if (!name) { Toast.show('Skill name required', 'error'); return; }
    try {
      await API.call('/api/skills/' + id, { method: 'PUT', body: { name, level, category } });
      const skill = State.skills.find(s => (s._id || s.id) === id);
      if (skill) { skill.name = name; skill.level = level; skill.category = category; }
      Render.skills(); Render.stats(); Render.internships(); Render.insights();
      Modal.close();
      Toast.show('Skill updated', 'success');
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  deleteSkill(id) {
    const skill = State.skills.find(s => (s._id || s.id) === id);
    if (!skill) return;
    Modal.open('confirmModal', 'Delete Skill?', `Remove "${skill.name}" from your profile?`, `App.performDeleteSkill('${id}')`);
  },

  async performDeleteSkill(id) {
    try {
      await API.call('/api/skills/' + id, { method: 'DELETE' });
      State.skills = State.skills.filter(s => (s._id || s.id) !== id);
      Render.skills(); Render.stats(); Render.internships(); Render.insights();
      Toast.show('Skill deleted', 'info');
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  async applyParsedSkills() {
    if (!State.resume || !State.resume.parsed || !State.resume.parsed.skillList) { Toast.show('No parsed skills', 'warning'); return; }
    let added = 0;
    for (const sk of State.resume.parsed.skillList) {
      if (State.skills.some(s => s.name.toLowerCase() === sk.name.toLowerCase())) continue;
      try {
        const s = await API.call('/api/skills', { method: 'POST', body: sk });
        State.skills.push({ _id: s._id, id: s._id, name: s.name, level: s.level, category: s.category });
        added++;
      } catch (e) {}
    }
    Render.skills(); Render.stats(); Render.internships(); Render.insights();
    Toast.show(`Added ${added} skills`, 'success');
  },

  filterInternships() {
    const s = document.getElementById('internship-search');
    const so = document.getElementById('internship-sort');
    Render.internships(s ? s.value : '', so ? so.value : 'match');
  },

  toggleSave(id) {
    const idx = State.savedInternships.indexOf(id);
    if (idx > -1) { State.savedInternships.splice(idx, 1); Toast.show('Removed from saved', 'info'); }
    else { State.savedInternships.push(id); Toast.show('Saved ⭐', 'success'); }
    API.call('/api/users/me', { method: 'PUT', body: { savedInternships: State.savedInternships } }).catch(() => {});
    const s = document.getElementById('internship-search');
    const so = document.getElementById('internship-sort');
    Render.internships(s ? s.value : '', so ? so.value : 'match');
  },

  async applyJob(id) {
    const job = State.internships.find(j => (j._id || j.id) === id);
    if (!job) return;
    try {
      const app = await API.call('/api/applications', {
        method: 'POST',
        body: { jobId: id, position: job.title, company: job.company },
      });
      State.applications.unshift(app);
      Render.applications(); Render.kanban(); Render.timeline(); Render.stats();
      Toast.show(`Applied to "${job.title}"!`, 'success');
      try {
        const notifs = await API.call('/api/notifications');
        State.notifications = notifs || State.notifications;
        Render.stats();
      } catch (e) {}
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  withdrawApplication(id) { Modal.open('confirmModal', 'Withdraw Application?', 'This cannot be undone.', `App.performWithdraw('${id}')`); },

  async performWithdraw(id) {
    try {
      await API.call('/api/applications/' + id, { method: 'DELETE' });
      State.applications = State.applications.filter(a => (a._id || a.id) !== id);
      Render.applications(); Render.kanban(); Render.timeline(); Render.stats();
      Toast.show('Application withdrawn', 'info');
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  dragStart(e) { const c = e.target.closest('.kanban-card'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.appId); c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; },
  dragEnd(e) { const c = e.target.closest('.kanban-card'); if (c) c.classList.remove('dragging'); document.querySelectorAll('.kanban-col').forEach(x => x.classList.remove('drag-over')); },
  dragOver(e) { e.preventDefault(); if (e.currentTarget) { e.currentTarget.classList.add('drag-over'); e.dataTransfer.dropEffect = 'move'; } },
  dragLeave(e) { if (e.currentTarget) e.currentTarget.classList.remove('drag-over'); },
  async drop(e) {
    e.preventDefault();
    const col = e.currentTarget; col.classList.remove('drag-over');
    const appId = e.dataTransfer.getData('text/plain');
    const newStage = col.dataset.stage;
    const map = {
      applied: { status: 'Applied', statusType: 'info' },
      review: { status: 'In Review', statusType: 'warning' },
      shortlist: { status: 'Shortlisted', statusType: 'success' },
      offer: { status: 'Offered', statusType: 'success' },
    };
    if (!map[newStage]) return;
    const app = State.applications.find(a => (a._id || a.id) === appId);
    if (!app) return;
    app.stage = newStage; app.status = map[newStage].status; app.statusType = map[newStage].statusType;
    try { await API.call('/api/applications/' + appId, { method: 'PATCH', body: { stage: app.stage, status: app.status, statusType: app.statusType } }); } catch (e) {}
    Render.kanban(); Render.applications(); Render.timeline();
    Toast.show('Moved to ' + app.status, 'success');
  },

  exportFullReport() {
    const report = { generatedAt: new Date().toISOString(), department: State.department, skillGaps: State.skillGaps, trendingSkills: State.trendingSkills, trends: State.trends, feedback: State.feedback, insights: AI.insights() };
    this.downloadFile(JSON.stringify(report, null, 2), 'talent-bridge-report-' + Date.now() + '.json', 'application/json');
    Toast.show('JSON report exported!', 'success');
  },
  downloadReport() { this.exportFullReport(); },
  downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  processResume(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { Toast.show('File too large (max 5MB)', 'error'); return; }
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) { Toast.show('Only PDF/DOC allowed', 'error'); return; }
    const parsed = {
      name: State.user ? State.user.name : 'Student',
      email: State.user ? State.user.email : 'student@example.com',
      degree: 'Graduate', skills: 3,
      skillList: State.skills.slice(0, 2).map(s => ({ name: s.name, level: s.level, category: s.category })).concat([{ name: 'Communication', level: 75, category: 'General' }]),
    };
    State.resume = { name: file.name, size: file.size, uploadedAt: new Date().toISOString(), parsed };
    API.call('/api/users/me', { method: 'PUT', body: { resume: State.resume } }).catch(() => {});
    Modal.close();
    setTimeout(() => Modal.open('parsedResumeModal'), 300);
  },
  handleUpload() { const i = document.getElementById('resume-input'); if (i) i.click(); },
  removeResume() {
    State.resume = null;
    API.call('/api/users/me', { method: 'PUT', body: { resume: null } }).catch(() => {});
    Modal.close();
    Toast.show('Resume removed', 'info');
  },

  async quickPostJob() {
    const dept = document.getElementById('quick-job-dept').value;
    const title = document.getElementById('quick-job-title').value.trim();
    const skillsRaw = document.getElementById('quick-job-skills').value.trim();
    if (!title || !skillsRaw) { Toast.show('Fill required fields', 'error'); return; }
    const btn = document.getElementById('quick-post-btn'); const orig = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Matching...'; btn.disabled = true;
    try {
      const skills = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
      const job = await API.call('/api/jobs', {
        method: 'POST',
        body: { title, department: dept || 'CSE', location: 'Not specified', type: 'Internship', skills },
      });
      State.myPostings.unshift({ _id: job._id, id: job._id, title: job.title, location: job.location, type: job.type, applicants: 0, shortlisted: 0, status: 'Active', posted: job.posted, skills: job.skills });
      Render.myPostings(); Render.stats(); Render.candidates();
      document.getElementById('quick-job-title').value = '';
      document.getElementById('quick-job-skills').value = '';
      const matched = State.candidates.filter(c => AI.calcMatch(c.skills, skills, { experience: c.experience, rating: c.rating }) >= 80).length;
      Toast.show(`✨ ${matched} candidates matched!`, 'success');
    } catch (err) { Toast.show(err.message, 'error'); }
    finally { btn.innerHTML = orig; btn.disabled = false; }
  },

  async postJob() {
    const dept = document.getElementById('job-department').value;
    const title = document.getElementById('job-title').value.trim();
    const location = document.getElementById('job-location').value.trim() || 'Not specified';
    const skillsRaw = document.getElementById('job-skills').value.trim();
    const description = document.getElementById('job-description').value.trim();
    const type = document.getElementById('job-type').value;
    const salary = document.getElementById('job-salary').value.trim() || 'Negotiable';
    if (!title || !skillsRaw) { Toast.show('Title and skills required', 'error'); return; }
    try {
      const skills = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
      const job = await API.call('/api/jobs', { method: 'POST', body: { title, department: dept || 'CSE', location, type, salary, description, skills } });
      State.myPostings.unshift({ _id: job._id, id: job._id, title: job.title, location: job.location, type: job.type, applicants: 0, shortlisted: 0, status: 'Active', posted: job.posted, skills: job.skills });
      Render.myPostings(); Render.stats(); Render.candidates();
      Modal.close();
      Toast.show(`"${title}" posted!`, 'success');
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  deletePosting(id) { Modal.open('confirmModal', 'Close Posting?', 'This will remove it from active postings.', `App.performDeletePosting('${id}')`); },
  async performDeletePosting(id) {
    try { await API.call('/api/jobs/' + id, { method: 'DELETE' }); } catch (e) {}
    State.myPostings = State.myPostings.filter(p => (p._id || p.id) !== id);
    Render.myPostings(); Render.stats();
    Toast.show('Posting closed', 'info');
  },

  filterCandidates() { const f = document.getElementById('candidate-filter').value; Render.candidates(f); },
  viewProfile(id) { Modal.open('profileModal', id); },

  async shortlistCandidate(id) {
    const c = State.candidates.find(x => x.id === id);
    if (!c) return;
    Modal.close();
    try {
      await API.call('/api/notifications', { method: 'POST', body: { text: 'You shortlisted ' + c.name, type: 'success' } });
      const notifs = await API.call('/api/notifications');
      State.notifications = notifs || State.notifications;
    } catch (e) {}
    Render.stats();
    Toast.show(c.name + ' shortlisted!', 'success');
  },

  async addFakeDoc() {
    const docs = ['Degree Certificate.pdf', 'Resume.pdf', 'Internship Certificate.pdf', 'Marksheet.pdf'];
    const name = docs[Math.floor(Math.random() * docs.length)];
    try {
      const d = await API.call('/api/documents', { method: 'POST', body: { name, type: name.endsWith('.pdf') ? 'pdf' : 'doc', size: (Math.random() * 2 + 0.5).toFixed(1) + ' MB' } });
      State.documents.unshift({ _id: d._id, id: d._id, name: d.name, type: d.type, size: d.size, uploaded: d.uploaded });
      Modal.close();
      setTimeout(() => Modal.open('docVaultModal'), 50);
      Toast.show('Document added', 'success');
    } catch (err) { Toast.show(err.message, 'error'); }
  },
  async deleteDoc(id) {
    try { await API.call('/api/documents/' + id, { method: 'DELETE' }); } catch (e) {}
    State.documents = State.documents.filter(d => (d._id || d.id) !== id);
    Modal.close();
    setTimeout(() => Modal.open('docVaultModal'), 50);
    Toast.show('Document deleted', 'info');
  },

  openInterviewModal() { State.interviewSelectedDay = null; try { Modal.open('interviewModal'); } catch (e) { Toast.show('Could not open scheduler', 'error'); } },
  pickDay(d) {
    State.interviewSelectedDay = d;
    const grid = document.getElementById('interview-cal-grid');
    if (!grid) return;
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const eventDays = State.interviews.map(iv => parseInt(String(iv.date).split('-')[2] || '0', 10));
    let calDays = '';
    for (let i = 0; i < firstDay; i++) calDays += '<div class="cal-day other-month"></div>';
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === today.getDate();
      const hasEvent = eventDays.indexOf(day) > -1;
      const isSelected = day === State.interviewSelectedDay;
      const cls = 'cal-day' + (isToday ? ' today' : '') + (hasEvent ? ' event' : '') + (isSelected ? ' selected' : '');
      calDays += `<div class="${cls}" data-day="${day}" onclick="App.pickDay(${day})">${day}</div>`;
    }
    grid.innerHTML = calDays;
    const info = document.getElementById('interview-selection-info');
    if (info) {
      info.textContent = State.interviewSelectedDay
        ? `Selected: ${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(State.interviewSelectedDay).padStart(2, '0')}`
        : 'Select a day to schedule an interview';
    }
  },
  scheduleInterview() {
    if (!State.interviewSelectedDay) { Toast.show('Please select a day first', 'warning'); return; }
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(State.interviewSelectedDay).padStart(2, '0')}`;
    const jobTitle = State.myPostings.length ? State.myPostings[0].title : 'Interview';
    State.interviews.push({ id: Date.now(), title: jobTitle, company: 'New Company', date: dateStr, time: '11:00 AM', type: 'Video Call' });
    State.interviewSelectedDay = null;
    Modal.close();
    setTimeout(() => App.openInterviewModal(), 50);
    Toast.show(`Interview scheduled for ${dateStr}!`, 'success');
  },
  cancelInterview(id) { Modal.open('confirmModal', 'Cancel Interview?', 'Remove from schedule?', `App.performCancelInterview(${id})`); },
  performCancelInterview(id) {
    State.interviews = State.interviews.filter(iv => (iv._id || iv.id) !== id);
    Modal.close();
    setTimeout(() => App.openInterviewModal(), 50);
    Toast.show('Interview cancelled', 'info');
  },

  openVideoInterviewModal() { Modal.open('videoInterviewModal'); },
  startVideoCall() {
    State.videoCallSeconds = 0; State.videoCallActive = true;
    const st = document.getElementById('video-status-text');
    const timer = document.getElementById('video-timer');
    if (timer) timer.textContent = '00:00';
    if (st) st.textContent = 'Connecting...';
    setTimeout(() => { if (State.videoCallActive && st) st.textContent = 'Connected'; App.startVideoTimer(); }, 1500);
  },
  startVideoTimer() {
    if (State.videoCallTimer) clearInterval(State.videoCallTimer);
    State.videoCallTimer = setInterval(() => {
      if (!State.videoCallActive) return;
      State.videoCallSeconds++;
      const m = String(Math.floor(State.videoCallSeconds / 60)).padStart(2, '0');
      const s = String(State.videoCallSeconds % 60).padStart(2, '0');
      const t = document.getElementById('video-timer'); if (t) t.textContent = m + ':' + s;
    }, 1000);
  },
  stopVideoCall() {
    State.videoCallActive = false;
    if (State.videoCallTimer) clearInterval(State.videoCallTimer);
    State.videoCallTimer = null; State.videoCallSeconds = 0;
  },
  toggleMic() { const b = document.getElementById('mic-btn'); if (b) b.classList.toggle('active'); },
  toggleCam() { const b = document.getElementById('cam-btn'); if (b) b.classList.toggle('active'); },
  endVideoCall() { this.stopVideoCall(); Toast.show('Call ended', 'info'); },
  endVideoCallAndSave() { this.stopVideoCall(); Modal.close(); Toast.show('Notes saved. Call ended.', 'success'); },
  copyReferral(code) { try { navigator.clipboard.writeText(code); Toast.show('Referral code copied!', 'success'); } catch (e) { Toast.show('Code: ' + code, 'info'); } },
  shareReferral() { Toast.show('Share link copied!', 'success'); },
  async inviteFriend() {
    State.referrals++;
    try { await API.call('/api/users/me', { method: 'PUT', body: { referrals: State.referrals } }); } catch (e) {}
    Modal.close();
    setTimeout(() => Modal.open('referralModal'), 50);
    Toast.show('Invitation sent!', 'success');
  },
};

/* ================== BOOT ================== */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}

})();