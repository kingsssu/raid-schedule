// ===== 설정 =====
const CLASSES = [
  { name: '검성',  color: '#0288D1', icon: 'icons/검성.avif' },
  { name: '수호성', color: '#0D47A1', icon: 'icons/수호성.avif' },
  { name: '살성',  color: '#558B2F', icon: 'icons/살성.avif' },
  { name: '궁성',  color: '#1B5E20', icon: 'icons/궁성.avif' },
  { name: '호법성', color: '#E65100', icon: 'icons/호법성.avif' },
  { name: '치유성', color: '#F9A825', icon: 'icons/치유성.avif' },
  { name: '마도성', color: '#6A1B9A', icon: 'icons/마도성.avif' },
  { name: '정령성', color: '#AD1457', icon: 'icons/정령성.avif' }
];
function classIcon(c) { return `<img src="${c.icon}" alt="${c.name}" class="class-icon-img">`; }

const DAY_NAMES = ['수', '목', '금', '토', '일', '월', '화'];
let SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxIVc1_vWe1AYoP2YZRrIYirD1j9a5pVJbeeq40qe8f0pkxnHtcqMyfd6nywfG_HvTa/exec';

let currentWeek = 'this';
let selectedClass = null;
let selectedDays = {};
let selectedPartyId = null;
let allData = [];

document.addEventListener('DOMContentLoaded', () => {
  loadParties();
  renderClassSelect();
  renderPartySelect();
  renderCalendar();
  loadData();
});

// ===== 파티 데이터 =====
const PARTY_COLORS = [
  '#e53935', '#1e88e5', '#43a047', '#fb8c00',
  '#8e24aa', '#00acc1', '#f06292', '#6d4c41'
];

// forces: [{ id, name, color, parties: [{id, name, slots:[nick|null x4]}, {id, name, slots:[...]}] }]
let forces = [];

function newForce(idx) {
  const color = PARTY_COLORS[idx % PARTY_COLORS.length];
  const fid = 'f' + Date.now() + idx;
  return {
    id: fid, name: (idx + 1) + '포스', color,
    parties: [
      { id: fid + '_p1', name: '1파티', slots: new Array(4).fill(null) },
      { id: fid + '_p2', name: '2파티', slots: new Array(4).fill(null) }
    ]
  };
}

function loadParties() {
  const s = localStorage.getItem('forcesData');
  forces = s ? JSON.parse(s) : [newForce(0)];
  forces.forEach((f, fi) => {
    if (!f.color) f.color = PARTY_COLORS[fi % PARTY_COLORS.length];
    if (!f.parties) f.parties = [
      { id: f.id + '_p1', name: '1파티', slots: new Array(4).fill(null) },
      { id: f.id + '_p2', name: '2파티', slots: new Array(4).fill(null) }
    ];
    f.parties.forEach(p => {
      if (!p.slots) p.slots = new Array(4).fill(null);
      while (p.slots.length < 4) p.slots.push(null);
      if (p.slots.length > 4) p.slots = p.slots.slice(0, 4);
    });
  });
}
function saveParties() { localStorage.setItem('forcesData', JSON.stringify(forces)); }

function addParty() {
  const name = prompt('포스 이름을 입력하세요', (forces.length + 1) + '포스');
  if (name === null) return;
  const f = newForce(forces.length);
  f.name = name.trim() || f.name;
  forces.push(f);
  saveParties();
  renderPartySelect();
  renderPartyBoard();
  renderPartyConfigList();
}

function deleteParty(fid) {
  if (forces.length === 1) return alert('포스가 최소 1개 필요합니다.');
  if (!confirm('포스를 삭제할까요?')) return;
  forces = forces.filter(f => f.id !== fid);
  if (selectedPartyId && !forces.some(f => f.parties.some(p => p.id === selectedPartyId))) selectedPartyId = null;
  saveParties();
  renderPartySelect();
  renderPartyBoard();
  renderPartyConfigList();
}

function renameParty(fid, el) {
  const f = forces.find(x => x.id === fid);
  if (!f) return;
  const input = document.createElement('input');
  input.value = f.name; input.className = 'party-name-input';
  el.replaceWith(input); input.focus(); input.select();
  const done = () => {
    f.name = input.value.trim() || f.name;
    saveParties(); renderPartySelect(); renderPartyBoard(); renderPartyConfigList();
  };
  input.onblur = done;
  input.onkeydown = e => { if (e.key === 'Enter') input.blur(); };
}

// ===== 주차 계산 =====
function getWeekDates(which) {
  const now = new Date();
  const day = now.getDay();
  let diff = day - 3; if (diff < 0) diff += 7;
  const wed = new Date(now); wed.setDate(now.getDate() - diff); wed.setHours(0,0,0,0);
  if (which === 'next') wed.setDate(wed.getDate() + 7);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(wed); d.setDate(wed.getDate() + i); return d; });
}
function fmt(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }

function switchWeek(which) {
  currentWeek = which;
  document.getElementById('btnThisWeek').classList.toggle('active', which === 'this');
  document.getElementById('btnNextWeek').classList.toggle('active', which === 'next');
  selectedDays = {};
  renderCalendar();
  renderStatus();
  renderRecommend();
  // 현재 열린 탭도 갱신
  const activeTab = document.querySelector('.tab-content.active')?.id;
  if (activeTab === 'tab-manage') renderMembers();
  if (activeTab === 'tab-party') { renderPartyBoard(); renderMemberPool(); }
}

// ===== 직업 선택 =====
function renderClassSelect() {
  document.getElementById('classSelect').innerHTML = CLASSES.map((c, i) =>
    `<button class="class-btn" style="border-color:${c.color};color:${c.color}" onclick="selectClass(${i})" id="cls-${i}">
      ${classIcon(c)}<span class="class-name">${c.name}</span>
    </button>`
  ).join('');
}
function selectClass(idx) {
  selectedClass = idx;
  document.querySelectorAll('.class-btn').forEach((b, i) => {
    const c = CLASSES[i];
    b.classList.toggle('selected', i === idx);
    b.style.background = i === idx ? c.color + '22' : '#fff';
  });
}

function renderPartySelect() {
  const el = document.getElementById('partySelect');
  if (!el) return;
  el.innerHTML = forces.map(f =>
    `<div class="party-sel-item ${selectedPartyId === f.id ? 'selected' : ''}"
      style="--pc:${f.color};${selectedPartyId === f.id ? `background:${f.color};border-color:${f.color};color:#fff` : `border-color:${f.color};color:${f.color}`}"
      onclick="selectParty('${f.id}')">
      <span class="party-sel-dot" style="background:${selectedPartyId === f.id ? '#fff' : f.color}"></span>
      <span id="fname-${f.id}">${f.name}</span>
      <button class="party-sel-edit" onclick="event.stopPropagation();renamePartyInline('${f.id}')">✏️</button>
      <button class="party-sel-del" onclick="event.stopPropagation();deleteParty('${f.id}')">✕</button>
    </div>`
  ).join('') +
  `<button class="party-add-btn" onclick="addParty()">＋ 포스 추가</button>`;
}
function selectParty(id) { selectedPartyId = id; renderPartySelect(); }

function renamePartyInline(fid) {
  const f = forces.find(x => x.id === fid);
  if (!f) return;
  const span = document.getElementById('fname-' + fid);
  if (!span) return;
  const input = document.createElement('input');
  input.value = f.name;
  input.className = 'party-name-input';
  input.style.width = '80px';
  span.replaceWith(input);
  input.focus(); input.select();
  const done = () => {
    f.name = input.value.trim() || f.name;
    saveParties(); renderPartySelect(); renderPartyBoard(); renderPartyConfigList();
  };
  input.onblur = done;
  input.onkeydown = e => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = f.name; input.blur(); } };
}

// ===== 달력 =====
function renderCalendar() {
  const dates = getWeekDates(currentWeek);
  document.getElementById('weekRange').textContent = `${fmt(dates[0])} ~ ${fmt(dates[6])}`;
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = DAY_NAMES.map(d => `<div class="cal-header">${d}</div>`).join('') +
    dates.map(d => {
      const k = fmt(d);
      return `<div class="cal-day ${selectedDays[k] ? 'selected' : ''}" onclick="toggleDay('${k}')">${d.getMonth()+1}/${d.getDate()}</div>`;
    }).join('');
  renderTimeInputs();
}

// 30분 단위 시간 옵션 생성
function genTimeOptions() {
  const opts = [];
  for (let h = 0; h < 24; h++)
    for (let m of [0, 30])
      opts.push(String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0'));
  return opts;
}
const TIME_OPTIONS = genTimeOptions();

function toggleDay(key) {
  selectedDays[key] ? delete selectedDays[key] : selectedDays[key] = { start: '20:00', rounds: 1 };
  renderCalendar();
}

function renderTimeInputs() {
  const keys = Object.keys(selectedDays).sort();
  document.getElementById('timeInputArea').innerHTML = keys.map(k => {
    const d = selectedDays[k];
    // 현재 선택 시간 기준 앞뒤 표시 (스크롤 가능 드롭다운)
    return `<div class="time-row">
      <label>📅 ${k.slice(5)}</label>
      <select class="time-select" onchange="setDayTime('${k}',this.value)">
        ${TIME_OPTIONS.map(t => `<option value="${t}" ${d.start===t?'selected':''}>${t}</option>`).join('')}
      </select>
      <div class="day-round-select">
        ${[1,2,3,4].map(n => `<button class="day-round-btn ${d.rounds===n?'selected':''}" onclick="setDayRounds('${k}',${n})">${n}판</button>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function setDayTime(key, time) { if (selectedDays[key]) { selectedDays[key].start = time; renderTimeInputs(); } }
function setDayRounds(key, n) { if (selectedDays[key]) { selectedDays[key].rounds = n; renderTimeInputs(); } }

// ===== 탭 =====
function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  event.target.classList.add('active');
  if (name === 'status') renderStatus();
  if (name === 'recommend') renderRecommend();
  if (name === 'manage') renderMembers();
  if (name === 'party') { renderPartyConfigList(); renderPartyBoard(); renderMemberPool(); }
}

// ===== 데이터 =====
function loadData() {
  const s = localStorage.getItem('raidData');
  if (s) { allData = JSON.parse(s); applyAssignments(); }
  if (SCRIPT_URL) {
    fetch(SCRIPT_URL)
      .then(r => r.json())
      .then(data => { allData = data; applyAssignments(); saveData(); renderStatus(); renderRecommend(); })
      .catch(() => {});
  }
}
function saveData() { localStorage.setItem('raidData', JSON.stringify(allData)); }

function submitSchedule() {
  const nick = document.getElementById('nickname').value.trim();
  if (!nick) return showMsg('닉네임을 입력해주세요!', '#e53935');
  if (selectedClass === null) return showMsg('직업을 선택해주세요!', '#e53935');
  if (!selectedPartyId) return showMsg('파티를 선택해주세요!', '#e53935');
  if (!Object.keys(selectedDays).length) return showMsg('날짜를 선택해주세요!', '#e53935');

  const wk = getWeekDates(currentWeek).map(fmt);
  allData = allData.filter(d => !(d.nickname === nick && d.dates.some(dd => wk.includes(dd.date))));
  const entry = {
    nickname: nick, classIdx: selectedClass, className: CLASSES[selectedClass].name,
    partyId: selectedPartyId,
    partyName: forces.find(f => f.id === selectedPartyId)?.name || '',
    dates: Object.entries(selectedDays).map(([date, info]) => ({ date, ...info })),
    submitted: new Date().toISOString()
  };
  allData.push(entry);
  // 배정 정보 저장
  const assignments = JSON.parse(localStorage.getItem('partyAssignments') || '{}');
  assignments[nick] = selectedPartyId;
  localStorage.setItem('partyAssignments', JSON.stringify(assignments));
  saveData();
  showMsg('✅ 제출 완료! ' + nick + ' (' + CLASSES[selectedClass].name + ') — ' + entry.partyName, '#2e7d32');
  resetForm();

  if (SCRIPT_URL) {
    fetch(SCRIPT_URL, { method: 'POST', redirect: 'follow', body: JSON.stringify(entry) })
      .then(r => r.json()).then(() => loadData()).catch(e => console.log('sync error:', e));
  }
}

function resetForm() {
  document.getElementById('nickname').value = '';
  selectedClass = null; selectedDays = {}; selectedPartyId = null;
  document.querySelectorAll('.class-btn').forEach(b => { b.classList.remove('selected'); b.style.background = '#fff'; });
  renderCalendar();
  renderPartySelect();
}

function showMsg(msg, color) {
  const el = document.getElementById('submitMsg');
  el.textContent = msg; el.style.color = color;
  setTimeout(() => el.textContent = '', 3000);
}

// ===== 현황표 =====
function renderStatus() {
  const el = document.getElementById('statusTable');
  const dates = getWeekDates(currentWeek), keys = dates.map(fmt);
  const wd = allData.filter(d => d.dates.some(dd => keys.includes(dd.date)));
  if (!wd.length) { el.innerHTML = '<div class="no-data">🌿 아직 제출된 데이터가 없습니다</div>'; return; }

  // 포스 > 파티별 그룹
  const partyGroups = {};
  wd.forEach(m => {
    const pid = m.partyId || 'none';
    if (!partyGroups[pid]) partyGroups[pid] = [];
    partyGroups[pid].push(m);
  });

  let html = '';
  const renderTable = (members, title, color, showAssign = false) => {
    const counts = new Array(7).fill(0);
    let t = `<div class="status-party-block"><div class="status-party-title" style="border-left-color:${color||'#66bb6a'};color:${color||'#33691e'}">${title}</div>`;
    t += '<table class="status-table"><thead><tr><th>멤버</th>' +
      dates.map((d, i) => `<th>${DAY_NAMES[i]}<br><small>${d.getMonth()+1}/${d.getDate()}</small></th>`).join('') +
      (showAssign ? '<th>포스 배정</th>' : '') +
      '</tr></thead><tbody>';
    members.forEach(m => {
      const c = CLASSES[m.classIdx];
      t += `<tr style="background:${c.color}22"><td><span class="nickname-cell">${classIcon(c)} <strong>${m.nickname}</strong></span></td>`;
      keys.forEach((k, i) => {
        const dd = m.dates.find(d => d.date === k);
        if (dd) { counts[i]++; t += `<td class="available">${dd.start} 이후<br><small>${dd.rounds}판</small></td>`; }
        else t += '<td class="unavailable">—</td>';
      });
      if (showAssign) {
        const opts = forces.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
        t += `<td><select class="assign-select" onchange="assignToForce('${m.nickname}',this.value)">
          <option value="">-- 선택 --</option>${opts}
        </select></td>`;
      }
      t += '</tr>';
    });
    t += '<tr class="count-row"><td>참여 가능</td>' +
      counts.map(c => `<td>${c}명</td>`).join('') +
      (showAssign ? '<td></td>' : '') +
      '</tr></tbody></table></div>';
    return t;
  };

  forces.forEach(f => {
    if (partyGroups[f.id]) html += renderTable(partyGroups[f.id], `⚔️ ${f.name}`, f.color);
  });
  if (partyGroups['none']) html += renderTable(partyGroups['none'], '📋 미분류', '#9e9e9e', true);

  el.innerHTML = html;
}

function assignToForce(nickname, forceId) {
  if (!forceId) return;
  // 배정 정보 별도 저장
  const assignments = JSON.parse(localStorage.getItem('partyAssignments') || '{}');
  assignments[nickname] = forceId;
  localStorage.setItem('partyAssignments', JSON.stringify(assignments));
  // allData에 반영
  applyAssignments();
  saveData();
  renderStatus();
}

function applyAssignments() {
  const assignments = JSON.parse(localStorage.getItem('partyAssignments') || '{}');
  allData.forEach(m => {
    if (assignments[m.nickname]) {
      m.partyId = assignments[m.nickname];
      m.partyName = forces.find(f => f.id === assignments[m.nickname])?.name || '';
    }
  });
}

// ===== 추천 스케줄 =====
function renderRecommend() {
  const el = document.getElementById('recommendResult');
  const dates = getWeekDates(currentWeek), keys = dates.map(fmt);
  const allWd = allData.filter(d => d.dates.some(dd => keys.includes(dd.date)));
  if (!allWd.length) { el.innerHTML = '<div class="no-data">🌿 데이터가 없습니다. 먼저 스케줄을 제출해주세요.</div>'; return; }

  const renderForceRecommend = (wd, title, color) => {
    const stats = keys.map((k, i) => {
      const avail = []; let minR = 4, latestStart = '00:00';
      wd.forEach(m => { const dd = m.dates.find(d => d.date === k); if (dd) { avail.push(m.nickname); minR = Math.min(minR, dd.rounds); if (dd.start > latestStart) latestStart = dd.start; } });
      return { date: k, day: DAY_NAMES[i], avail, count: avail.length, maxR: avail.length ? minR : 0, time: latestStart };
    });

    let h = `<div class="status-party-title" style="border-left-color:${color};color:${color};margin-bottom:12px">⚔️ ${title}</div>`;
    const combos = findCombos(stats, wd.length);
    if (combos.length) {
      combos.slice(0, 2).forEach((combo, idx) => {
        h += `<div class="recommend-card ${idx===0?'best':''}"><h4>${idx===0?'⭐ 최적 추천':'📋 옵션 2'}</h4>`;
        combo.forEach(s => {
          h += `<div class="day-info">📅 <strong>${s.day}요일</strong> (${s.date.slice(5)}) — ${s.time} 이후 ${s.rounds}판 <span class="people">${s.count}명</span>
          <div class="people-list">${s.avail.map(n => { const m=wd.find(d=>d.nickname===n); const cc=m?CLASSES[m.classIdx]:null; return cc?`<span class="people-tag" style="background:${cc.color}22;color:${cc.color};border:1px solid ${cc.color}55">${n}</span>`:n; }).join(' ')}</div></div>`;
        });
        h += `<div style="margin-top:8px;color:#2e7d32;font-weight:700">합계: ${combo.reduce((a,b)=>a+b.rounds,0)}판</div></div>`;
      });
    } else {
      h += '<div class="recommend-card"><h4>전원 참여 가능한 조합 없음</h4>';
      stats.sort((a,b)=>b.count-a.count).slice(0,4).forEach(d => { h += `<div class="day-info">📅 ${d.day}(${d.date.slice(5)}) — ${d.count}명</div>`; });
      h += '</div>';
    }

    h += '<div class="recommend-card"><h4>📊 날짜별 현황</h4><div class="summary-grid">';
    stats.forEach(d => {
      const pct = wd.length ? (d.count/wd.length)*100 : 0;
      const bg = pct>=100?'#43a047':pct>=75?'#66bb6a':pct>=50?'#ffb74d':pct>0?'#ef5350':'#bdbdbd';
      h += `<div class="summary-card">
        <div class="day-label">${d.day}</div><div class="day-date">${d.date.slice(5)}</div>
        <div class="count-circle" style="background:${bg}">${d.count}</div>
        <div class="count-label">${d.count}/${wd.length}명</div>
        <div class="summary-names">${d.avail.map(n => { const m=wd.find(x=>x.nickname===n); const cc=m?CLASSES[m.classIdx]:null; return cc?`<span style="color:${cc.color};font-weight:700">${n}</span>`:n; }).join('<br>')}</div>
      </div>`;
    });
    h += '</div></div>';
    return `<div class="recommend-force-block" style="border-color:${color}40">${h}</div>`;
  };

  let html = '<h3>🏆 포스별 최적 스케줄 추천</h3>';
  forces.forEach(f => {
    const wd = allWd.filter(m => m.partyId === f.id);
    if (wd.length) html += renderForceRecommend(wd, f.name, f.color);
  });
  const unassigned = allWd.filter(m => !forces.some(f => f.id === m.partyId));
  if (unassigned.length) html += renderForceRecommend(unassigned, '미분류', '#9e9e9e');

  el.innerHTML = html;
}

function findCombos(stats, total) {
  const ok = stats.filter(d => d.count >= Math.min(total, 8));
  const combos = [];
  ok.filter(d => d.maxR >= 4).forEach(d => combos.push([{...d, rounds:4}]));
  for (let i = 0; i < ok.length; i++) for (let j = i+1; j < ok.length; j++) {
    const a=ok[i], b=ok[j];
    if (a.maxR>=2&&b.maxR>=2) combos.push([{...a,rounds:2},{...b,rounds:2}]);
    if (a.maxR>=3&&b.maxR>=1) combos.push([{...a,rounds:3},{...b,rounds:1}]);
    if (a.maxR>=1&&b.maxR>=3) combos.push([{...a,rounds:1},{...b,rounds:3}]);
  }
  combos.sort((a,b) => { const mA=Math.min(...a.map(x=>x.count)), mB=Math.min(...b.map(x=>x.count)); return mB!==mA?mB-mA:a.length-b.length; });
  return combos;
}

// ===== 멤버 관리 =====
function renderMembers() {
  const el = document.getElementById('memberList');
  const keys = getWeekDates(currentWeek).map(fmt);
  const wd = allData.filter(d => d.dates.some(dd => keys.includes(dd.date)));
  if (!wd.length) { el.innerHTML = '<div class="no-data">등록된 멤버가 없습니다.</div>'; return; }

  const memberItem = (m, i) => {
    const c = CLASSES[m.classIdx];
    return `<div class="member-item">
      <input type="checkbox" value="${i}" class="member-check">
      <span class="class-dot" style="background:${c.color}"></span>
      ${classIcon(c)} <strong>${m.nickname}</strong>
      <small style="color:${c.color}">(${c.name})</small>
    </div>`;
  };

  let html = '';
  forces.forEach(f => {
    const members = wd.map((m, i) => ({m, i})).filter(({m}) => m.partyId === f.id);
    if (!members.length) return;
    html += `<div class="member-group-title" style="border-left-color:${f.color};color:${f.color}">⚔️ ${f.name}</div>`;
    html += members.map(({m, i}) => memberItem(m, i)).join('');
  });
  const unassigned = wd.map((m, i) => ({m, i})).filter(({m}) => !forces.some(f => f.id === m.partyId));
  if (unassigned.length) {
    html += `<div class="member-group-title" style="border-left-color:#9e9e9e;color:#9e9e9e">📋 미분류</div>`;
    html += unassigned.map(({m, i}) => memberItem(m, i)).join('');
  }
  el.innerHTML = html;
}

function deleteSelected() {
  const checks = document.querySelectorAll('.member-check:checked');
  if (!checks.length) return;
  const keys = getWeekDates(currentWeek).map(fmt);
  const wd = allData.filter(d => d.dates.some(dd => keys.includes(dd.date)));
  const del = new Set(); checks.forEach(c => del.add(wd[+c.value]?.nickname));
  allData = allData.filter(d => !(del.has(d.nickname) && d.dates.some(dd => keys.includes(dd.date))));
  saveData(); renderMembers();
  showMsg('🗑️ 삭제 완료', '#e53935');
  if (SCRIPT_URL) {
    fetch(SCRIPT_URL, { method:'POST', redirect:'follow', body: JSON.stringify({ action:'delete', nicknames:[...del], weekDates:keys }) })
      .catch(e => console.log('delete sync error:', e));
  }
}

// ===== 파티 편성 탭 =====
function renderPartyConfigList() {
  const el = document.getElementById('partyConfigList');
  if (!el) return;
  el.innerHTML = forces.map(f =>
    `<div class="party-cfg-item" style="border-color:${f.color};color:${f.color}">
      <span class="party-sel-dot" style="background:${f.color}"></span>
      <span class="party-cfg-name" ondblclick="renameParty('${f.id}', this)">${f.name}</span>
      <button class="party-tab-del" onclick="deleteParty('${f.id}')">✕</button>
    </div>`
  ).join('');
}

function renderPartyBoard() {
  const el = document.getElementById('partyBoardArea');
  if (!el) return;
  const keys = getWeekDates(currentWeek).map(fmt);
  const wd = allData.filter(d => d.dates.some(dd => keys.includes(dd.date)));

  el.innerHTML = forces.map(f => {
    const partyBoxes = f.parties.map(p => {
      const slots = Array.from({ length: 4 }, (_, i) => {
        const nick = p.slots[i];
        if (nick) {
          const m = wd.find(d => d.nickname === nick);
          const c = m ? CLASSES[m.classIdx] : null;
          const timeInfo = m ? getAvailTime(m, keys) : '';
          return `<div class="pslot filled" draggable="true"
            ondragstart="dragMember(event,'${nick}')"
            ondrop="dropToSlot(event,'${f.id}','${p.id}',${i})" ondragover="event.preventDefault()"
            style="${c ? `border-color:${c.color};background:${c.color}11` : ''}">
            <div class="pslot-row">
              ${c ? `<img src="${c.icon}" class="slot-icon">` : ''}
              <span>${nick}</span>
              <button class="slot-remove" onclick="removeSlot('${f.id}','${p.id}',${i})">✕</button>
            </div>
            ${timeInfo ? `<small class="slot-time">${timeInfo}</small>` : ''}
          </div>`;
        }
        return `<div class="pslot empty"
          ondrop="dropToSlot(event,'${f.id}','${p.id}',${i})" ondragover="event.preventDefault()">빈 슬롯</div>`;
      });
      return `<div class="inner-party-box">
        <div class="inner-party-title">${p.name} <small>${p.slots.filter(Boolean).length}/4</small></div>
        <div class="pslot-grid">${slots.join('')}</div>
      </div>`;
    }).join('');

    return `<div class="party-board-box" style="border-color:${f.color}60">
      <div class="party-board-title" style="color:${f.color};border-bottom-color:${f.color}30">${f.name}</div>
      <div class="force-inner">${partyBoxes}</div>
    </div>`;
  }).join('');
}

function renderMemberPool() {
  const el = document.getElementById('memberPool');
  if (!el) return;
  const keys = getWeekDates(currentWeek).map(fmt);
  const wd = allData.filter(d => d.dates.some(dd => keys.includes(dd.date)));
  if (!wd.length) { el.innerHTML = '<span style="color:#bdbdbd">등록된 멤버가 없습니다</span>'; return; }
  el.innerHTML = wd.map(m => {
    const c = CLASSES[m.classIdx];
    const timeInfo = getAvailTime(m, keys);
    const pName = forces.find(f => f.id === m.partyId)?.name || m.partyName || '';
    return `<div class="pool-member" draggable="true" ondragstart="dragMember(event,'${m.nickname}')" style="border-color:${c.color}">
      <img src="${c.icon}" class="drag-icon">
      <span>${m.nickname}</span>
      ${pName ? `<small class="pool-party" style="color:${c.color}">${pName}</small>` : ''}
      ${timeInfo ? `<small class="pool-time" style="color:${c.color}">${timeInfo}</small>` : ''}
    </div>`;
  }).join('');
}

function getAvailTime(m, keys) {
  const avail = m.dates.filter(d => keys.includes(d.date));
  if (!avail.length) return '';
  const times = avail.map(d => d.start).sort();
  return times[0] + (avail.length > 1 ? ` 외 ${avail.length-1}일` : '');
}

let draggingNick = null;
function dragMember(e, nick) { draggingNick = nick; e.dataTransfer.setData('text/plain', nick); }

function dropToSlot(e, fid, pid, slotIdx) {
  e.preventDefault(); e.stopPropagation();
  const nick = e.dataTransfer.getData('text/plain') || draggingNick;
  if (!nick) return;
  const f = forces.find(x => x.id === fid);
  const p = f?.parties.find(x => x.id === pid);
  if (!p) return;
  // 기존 위치에서 제거
  forces.forEach(ff => ff.parties.forEach(pp => { pp.slots = pp.slots.map(s => s === nick ? null : s); }));
  if (!p.slots[slotIdx]) {
    p.slots[slotIdx] = nick;
  } else {
    const empty = p.slots.findIndex(s => !s);
    if (empty !== -1) p.slots[empty] = nick;
    else p.slots[slotIdx] = nick;
  }
  saveParties(); renderPartyBoard();
}

function dropToPool(e) {
  e.preventDefault();
  const nick = e.dataTransfer.getData('text/plain') || draggingNick;
  if (!nick) return;
  forces.forEach(f => f.parties.forEach(p => { p.slots = p.slots.map(s => s === nick ? null : s); }));
  saveParties(); renderPartyBoard();
}

function removeSlot(fid, pid, slotIdx) {
  const f = forces.find(x => x.id === fid);
  const p = f?.parties.find(x => x.id === pid);
  if (!p) return;
  p.slots[slotIdx] = null;
  saveParties(); renderPartyBoard();
}
