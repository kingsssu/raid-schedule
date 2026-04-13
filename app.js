// ===== 설정 =====
const CLASSES = [
  { name: '검성', color: '#0288D1', icon: 'icons/검성.avif' },
  { name: '수호성', color: '#0D47A1', icon: 'icons/수호성.avif' },
  { name: '살성', color: '#558B2F', icon: 'icons/살성.avif' },
  { name: '궁성', color: '#1B5E20', icon: 'icons/궁성.avif' },
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
let allData = [];

document.addEventListener('DOMContentLoaded', () => {
  renderClassSelect();
  renderCalendar();
  loadData();
});

// ===== 주차 계산 =====
function getWeekDates(which) {
  const now = new Date();
  const day = now.getDay();
  let diff = day - 3;
  if (diff < 0) diff += 7;
  const wed = new Date(now);
  wed.setDate(now.getDate() - diff);
  wed.setHours(0, 0, 0, 0);
  if (which === 'next') wed.setDate(wed.getDate() + 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(wed);
    d.setDate(wed.getDate() + i);
    return d;
  });
}

function fmt(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function switchWeek(which) {
  currentWeek = which;
  document.getElementById('btnThisWeek').classList.toggle('active', which === 'this');
  document.getElementById('btnNextWeek').classList.toggle('active', which === 'next');
  selectedDays = {};
  renderCalendar();
  renderStatus();
  renderRecommend();
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
    if (i === idx) {
      b.classList.add('selected');
      b.style.background = c.color + '22';
      b.style.color = c.color;
    } else {
      b.classList.remove('selected');
      b.style.background = '#fff';
    }
  });
}

// ===== 달력 =====
function renderCalendar() {
  const dates = getWeekDates(currentWeek);
  document.getElementById('weekRange').textContent = `${fmt(dates[0])} ~ ${fmt(dates[6])}`;
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = DAY_NAMES.map(d => `<div class="cal-header">${d}</div>`).join('') +
    dates.map(d => {
      const k = fmt(d);
      return `<div class="cal-day ${selectedDays[k] ? 'selected' : ''}" onclick="toggleDay('${k}')">${d.getMonth() + 1}/${d.getDate()}</div>`;
    }).join('');
  renderTimeInputs();
}

const TIME_OPTIONS = ['18:00', '19:00', '20:00', '21:00', '22:00', '22:30', '23:00'];

function toggleDay(key) {
  selectedDays[key] ? delete selectedDays[key] : selectedDays[key] = { start: '20:00', rounds: 1 };
  renderCalendar();
}

function renderTimeInputs() {
  const keys = Object.keys(selectedDays).sort();
  document.getElementById('timeInputArea').innerHTML = keys.map(k => {
    const d = selectedDays[k];
    return `<div class="time-row">
      <label>📅 ${k.slice(5)}</label>
      <div class="time-btn-group">
        ${TIME_OPTIONS.map(t => `<button class="time-opt-btn ${d.start===t?'selected':''}" onclick="setDayTime('${k}','${t}')">${t}</button>`).join('')}
      </div>
      <div class="day-round-select">
        ${[1,2,3,4].map(n => `<button class="day-round-btn ${d.rounds===n?'selected':''}" onclick="setDayRounds('${k}',${n})">${n}판</button>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function setDayTime(key, time) {
  if (selectedDays[key]) { selectedDays[key].start = time; renderTimeInputs(); }
}

function setDayRounds(key, n) {
  if (selectedDays[key]) { selectedDays[key].rounds = n; renderTimeInputs(); }
}

// ===== 탭 =====
function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  event.target.classList.add('active');
  if (name === 'status') renderStatus();
  if (name === 'recommend') renderRecommend();
  if (name === 'manage') renderMembers();
}

// ===== 데이터 =====
function loadData() {
  const s = localStorage.getItem('raidData');
  if (s) allData = JSON.parse(s);
  if (SCRIPT_URL) {
    fetch(SCRIPT_URL)
      .then(r => r.json())
      .then(data => { allData = data; saveData(); renderStatus(); renderRecommend(); })
      .catch(() => {});
  }
}
function saveData() { localStorage.setItem('raidData', JSON.stringify(allData)); }

function submitSchedule() {
  const nick = document.getElementById('nickname').value.trim();
  if (!nick) return showMsg('닉네임을 입력해주세요!', '#e53935');
  if (selectedClass === null) return showMsg('직업을 선택해주세요!', '#e53935');
  if (!Object.keys(selectedDays).length) return showMsg('날짜를 선택해주세요!', '#e53935');

  const wk = getWeekDates(currentWeek).map(fmt);
  allData = allData.filter(d => !(d.nickname === nick && d.dates.some(dd => wk.includes(dd.date))));
  const entry = {
    nickname: nick, classIdx: selectedClass, className: CLASSES[selectedClass].name,
    dates: Object.entries(selectedDays).map(([date, info]) => ({ date, ...info })),
    submitted: new Date().toISOString()
  };
  allData.push(entry);
  saveData();
  showMsg('✅ 제출 완료! ' + nick + ' (' + CLASSES[selectedClass].name + ')', '#2e7d32');
  resetForm();

  if (SCRIPT_URL) {
    fetch(SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify(entry)
    }).then(r => r.json()).then(() => loadData()).catch(e => console.log('sync error:', e));
  }
}

function resetForm() {
  document.getElementById('nickname').value = '';
  selectedClass = null;
  selectedDays = {};
  document.querySelectorAll('.class-btn').forEach(b => {
    b.classList.remove('selected');
    b.style.background = '#fff';
  });
  renderCalendar();
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

  const counts = new Array(7).fill(0);
  let html = '<table class="status-table"><thead><tr><th>멤버</th>' +
    dates.map((d, i) => `<th>${DAY_NAMES[i]}<br><small>${d.getMonth() + 1}/${d.getDate()}</small></th>`).join('') +
    '</tr></thead><tbody>';

  wd.forEach(m => {
    const c = CLASSES[m.classIdx];
    html += `<tr style="background:${c.color}22"><td><span class="nickname-cell">${classIcon(c)} <strong>${m.nickname}</strong></span></td>`;
    keys.forEach((k, i) => {
      const dd = m.dates.find(d => d.date === k);
      if (dd) { counts[i]++; html += `<td class="available">${dd.start} 이후<br><small>${dd.rounds}판</small></td>`; }
      else html += '<td class="unavailable">—</td>';
    });
    html += '</tr>';
  });

  html += '<tr class="count-row"><td>참여 가능</td>' +
    counts.map((c, i) => `<td class="${c >= wd.length && wd.length >= 8 ? 'full' : ''}">${c}명${c >= wd.length && wd.length >= 8 ? ' 🎉' : ''}</td>`).join('') +
    '</tr></tbody></table>';
  el.innerHTML = html;
}

// ===== 추천 스케줄 =====
function renderRecommend() {
  const el = document.getElementById('recommendResult');
  const dates = getWeekDates(currentWeek), keys = dates.map(fmt);
  const wd = allData.filter(d => d.dates.some(dd => keys.includes(dd.date)));

  if (!wd.length) { el.innerHTML = '<div class="no-data">🌿 데이터가 없습니다. 먼저 스케줄을 제출해주세요.</div>'; return; }

  const stats = keys.map((k, i) => {
    const avail = [];
    let minR = 4, latestStart = '00:00';
    wd.forEach(m => { const dd = m.dates.find(d => d.date === k); if (dd) { avail.push(m.nickname); minR = Math.min(minR, dd.rounds); if (dd.start > latestStart) latestStart = dd.start; } });
    return { date: k, day: DAY_NAMES[i], dateObj: dates[i], avail, count: avail.length, maxR: avail.length ? minR : 0, time: latestStart };
  });

  let html = '<h3>🏆 최적 스케줄 추천</h3>';

  // 조합 찾기
  const combos = findCombos(stats, wd.length);
  if (combos.length) {
    combos.slice(0, 3).forEach((combo, idx) => {
      html += `<div class="recommend-card ${idx === 0 ? 'best' : ''}">
        <h4>${idx === 0 ? '⭐ 최적 추천' : '📋 옵션 ' + (idx + 1)}</h4>`;
      combo.forEach(s => {
        html += `<div class="day-info">📅 <strong>${s.day}요일</strong> (${s.date.slice(5)}) — ${s.time} 이후 ${s.rounds}판 <span class="people">${s.count}명 참여 가능</span>
        <div class="people-list">${s.avail.map(n => { const m = wd.find(d => d.nickname === n); const cc = m ? CLASSES[m.classIdx] : null; return cc ? `<span class="people-tag" style="background:${cc.color}22;color:${cc.color};border:1px solid ${cc.color}55">${n}</span>` : n; }).join(' ')}</div></div>`;
      });
      const total = combo.reduce((a, b) => a + b.rounds, 0);
      html += `<div style="margin-top:8px;color:#2e7d32;font-weight:700">합계: ${total}판 완료</div></div>`;
    });
  } else {
    html += '<div class="recommend-card"><h4>전원 참여 가능한 조합을 찾지 못했습니다</h4>';
    stats.sort((a, b) => b.count - a.count).slice(0, 4).forEach(d => {
      html += `<div class="day-info">📅 ${d.day}(${d.date.slice(5)}) — ${d.count}명 가능</div>`;
    });
    html += '</div>';
  }

  // 날짜별 요약 - 프로 카드 스타일
  html += '<div class="recommend-card"><h4>📊 날짜별 참여 현황</h4><div class="summary-grid">';
  stats.forEach(d => {
    const pct = wd.length ? (d.count / wd.length) * 100 : 0;
    const bg = pct >= 100 ? '#43a047' : pct >= 75 ? '#66bb6a' : pct >= 50 ? '#ffb74d' : pct > 0 ? '#ef5350' : '#bdbdbd';
    const hi = d.count >= wd.length && wd.length >= 8;
    html += `<div class="summary-card ${hi ? 'highlight' : ''}">
      <div class="day-label">${d.day}</div>
      <div class="day-date">${d.date.slice(5)}</div>
      <div class="count-circle" style="background:${bg}">${d.count}</div>
      <div class="count-label">${d.count}/${wd.length}명</div>
      <div class="summary-names">${d.avail.map(n => { const m = wd.find(x => x.nickname === n); const cc = m ? CLASSES[m.classIdx] : null; return cc ? `<span style="color:${cc.color};font-weight:700">${n}</span>` : n; }).join('<br>')}</div>
    </div>`;
  });
  html += '</div></div>';

  el.innerHTML = html;
}

function findCombos(stats, total) {
  const ok = stats.filter(d => d.count >= Math.min(total, 8));
  const combos = [];

  // 1일 4판
  ok.filter(d => d.maxR >= 4).forEach(d => combos.push([{ ...d, rounds: 4 }]));

  // 2일 분배
  for (let i = 0; i < ok.length; i++) {
    for (let j = i + 1; j < ok.length; j++) {
      const a = ok[i], b = ok[j];
      if (a.maxR >= 2 && b.maxR >= 2) combos.push([{ ...a, rounds: 2 }, { ...b, rounds: 2 }]);
      if (a.maxR >= 3 && b.maxR >= 1) combos.push([{ ...a, rounds: 3 }, { ...b, rounds: 1 }]);
      if (a.maxR >= 1 && b.maxR >= 3) combos.push([{ ...a, rounds: 1 }, { ...b, rounds: 3 }]);
    }
  }

  combos.sort((a, b) => {
    const mA = Math.min(...a.map(x => x.count)), mB = Math.min(...b.map(x => x.count));
    return mB !== mA ? mB - mA : a.length - b.length;
  });
  return combos;
}

// ===== 멤버 관리 =====
function deleteSelected() {
  const checks = document.querySelectorAll('.member-check:checked');
  if (!checks.length) return;
  const keys = getWeekDates(currentWeek).map(fmt);
  const wd = allData.filter(d => d.dates.some(dd => keys.includes(dd.date)));
  const del = new Set();
  checks.forEach(c => del.add(wd[+c.value]?.nickname));
  allData = allData.filter(d => !(del.has(d.nickname) && d.dates.some(dd => keys.includes(dd.date))));
  saveData();
  renderMembers();
  showMsg('🗑️ 삭제 완료', '#e53935');

  if (SCRIPT_URL) {
    fetch(SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify({ action: 'delete', nicknames: [...del], weekDates: keys })
    }).catch(e => console.log('delete sync error:', e));
  }
}

// ===== 파티 편성 (드래그앤드롭) =====
let partyData = { party1: [null,null,null,null], party2: [null,null,null,null] };

function loadParty() {
  const s = localStorage.getItem('partyData');
  if (s) partyData = JSON.parse(s);
}

function saveParty() { localStorage.setItem('partyData', JSON.stringify(partyData)); }

function renderMembers() {
  const el = document.getElementById('memberList');
  const keys = getWeekDates(currentWeek).map(fmt);
  const wd = allData.filter(d => d.dates.some(dd => keys.includes(dd.date)));

  if (!wd.length) { el.innerHTML = '<div class="no-data">등록된 멤버가 없습니다.</div>'; return; }

  el.innerHTML = wd.map((m, i) => {
    const c = CLASSES[m.classIdx];
    return `<div class="member-item">
      <input type="checkbox" value="${i}" class="member-check">
      <span class="class-dot" style="background:${c.color}"></span>
      ${classIcon(c)} <strong>${m.nickname}</strong> <small style="color:${c.color}">(${c.name})</small>
    </div>`;
  }).join('');

  loadParty();
  renderParty();
}

function renderParty() {
  const keys = getWeekDates(currentWeek).map(fmt);
  const wd = allData.filter(d => d.dates.some(dd => keys.includes(dd.date)));
  const assigned = new Set([...partyData.party1, ...partyData.party2].filter(Boolean));

  // 파티 슬롯 렌더
  ['party1', 'party2'].forEach(pid => {
    const container = document.getElementById(pid);
    container.innerHTML = partyData[pid].map((nick, i) => {
      if (nick) {
        const m = wd.find(d => d.nickname === nick);
        if (!m) { partyData[pid][i] = null; return emptySlot(pid, i); }
        const c = CLASSES[m.classIdx];
        return `<div class="party-slot filled" draggable="true" ondragstart="dragStart(event,'${nick}')" style="border-color:${c.color};background:${c.color}11">
          <img src="${c.icon}" class="slot-icon"> ${nick} <small style="color:${c.color}">${c.name}</small>
        </div>`;
      }
      return emptySlot(pid, i);
    }).join('');
  });

  // 미배치 멤버
  const unList = document.getElementById('unassignedList');
  const unassigned = wd.filter(m => !assigned.has(m.nickname));
  unList.innerHTML = unassigned.map(m => {
    const c = CLASSES[m.classIdx];
    return `<div class="drag-member" draggable="true" ondragstart="dragStart(event,'${m.nickname}')" style="border-color:${c.color}">
      <img src="${c.icon}" class="drag-icon"> ${m.nickname}
    </div>`;
  }).join('') || '<span style="color:#bdbdbd;font-size:0.85em">모두 배치됨</span>';
}

function emptySlot(pid, i) {
  return `<div class="party-slot empty" ondrop="dropToSlot(event,'${pid}',${i})" ondragover="event.preventDefault()">빈 슬롯</div>`;
}

function dragStart(e, nickname) {
  e.dataTransfer.setData('text/plain', nickname);
}

function dropMember(e, target) {
  e.preventDefault();
  const nick = e.dataTransfer.getData('text/plain');
  if (!nick) return;

  // 기존 위치에서 제거
  removeFromParty(nick);

  if (target === 'unassigned') {
    saveParty(); renderParty(); return;
  }

  // 빈 슬롯 찾아서 넣기
  const idx = partyData[target].indexOf(null);
  if (idx !== -1) {
    partyData[target][idx] = nick;
  }
  saveParty(); renderParty();
}

function dropToSlot(e, pid, slotIdx) {
  e.preventDefault();
  e.stopPropagation();
  const nick = e.dataTransfer.getData('text/plain');
  if (!nick) return;

  removeFromParty(nick);

  // 기존 슬롯에 누가 있으면 swap
  const existing = partyData[pid][slotIdx];
  partyData[pid][slotIdx] = nick;

  // 기존 멤버는 미배치로 (null 처리)
  saveParty(); renderParty();
}

function removeFromParty(nick) {
  ['party1', 'party2'].forEach(pid => {
    const idx = partyData[pid].indexOf(nick);
    if (idx !== -1) partyData[pid][idx] = null;
  });
}
