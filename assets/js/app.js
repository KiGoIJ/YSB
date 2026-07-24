const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const state = {
  docs: [],
};

function todayRu() {
  return new Date().toLocaleDateString('ru-RU');
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  let value = Number(bytes);
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx++;
  }
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  $$('.top-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) a.classList.add('active');
  });
}

async function loadDocs() {
  if (state.docs.length) return state.docs;
  const res = await fetch('data/documents.json');
  state.docs = await res.json();
  return state.docs;
}

function categoryList(docs) {
  return ['Все', ...Array.from(new Set(docs.map(d => d.category))).sort((a, b) => a.localeCompare(b, 'ru'))];
}

function renderDocCategories(docs) {
  const select = $('#docCategory');
  if (!select) return;
  select.innerHTML = categoryList(docs).map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function renderDocs(docs = state.docs) {
  const container = $('#docsContainer');
  if (!container) return;
  const query = ($('#docSearch')?.value || '').trim().toLowerCase();
  const category = $('#docCategory')?.value || 'Все';
  const type = $('#docType')?.value || 'Все';
  const filtered = docs.filter(doc => {
    const hay = `${doc.title} ${doc.category} ${doc.description} ${doc.type}`.toLowerCase();
    return (!query || hay.includes(query)) &&
      (category === 'Все' || doc.category === category) &&
      (type === 'Все' || doc.type === type);
  });
  $('#docsCount') && ($('#docsCount').textContent = String(filtered.length));
  container.innerHTML = filtered.map(doc => `
    <section class="doc-card">
      <div class="doc-meta">
        <span class="badge">${doc.category}</span>
        <span class="badge">${doc.type}</span>
        <span class="badge">${formatBytes(doc.size)}</span>
      </div>
      <h3>${doc.title}</h3>
      <p>${doc.description}</p>
      <div class="doc-actions">
        <a class="btn primary" href="${doc.file}" download>Скачать</a>
        <a class="btn" href="${doc.file}">Открыть</a>
      </div>
    </section>`).join('') || '<div class="notice warn"><strong>Ничего не найдено.</strong>Измените запрос или фильтр.</div>';
}

async function initDocumentsPage() {
  if (!$('#docsContainer')) return;
  const docs = await loadDocs();
  renderDocCategories(docs);
  renderDocs(docs);
  ['docSearch', 'docCategory', 'docType'].forEach(id => {
    const el = $('#' + id);
    if (el) el.addEventListener('input', () => renderDocs(docs));
  });
}

function getCounter() {
  return Number(localStorage.getItem('usbCaseCounter') || '1');
}
function setCounter(value) {
  localStorage.setItem('usbCaseCounter', String(value));
}
function nextCaseNumber(increment = false) {
  const year = '26';
  const n = getCounter();
  const value = `УСБ–${year}–${String(n).padStart(4, '0')}`;
  if (increment) setCounter(n + 1);
  return value;
}

function getFormValue(name) {
  return $(`[name="${name}"]`)?.value?.trim() || '';
}

function generateAppealText(consumeNumber = false) {
  const number = getFormValue('caseNumber') || nextCaseNumber(consumeNumber);
  const confidentiality = $('[name="confidential"]')?.checked ? 'Да' : 'Нет';
  return [
    'ОБРАЩЕНИЕ В УСБ РУ ФСБ РОССИИ ПО ЛО И ПО ГОРОДУ САНКТ-ПЕТЕРБУРГ',
    `Регистрационный номер: ${number}`,
    `Дата формирования: ${todayRu()}`,
    '',
    `Заявитель: ${getFormValue('applicant') || 'не указано'}`,
    `Подразделение / роль: ${getFormValue('unit') || 'не указано'}`,
    `Способ связи: ${getFormValue('contact') || 'не указано'}`,
    `Просьба о конфиденциальности: ${confidentiality}`,
    '',
    `Категория обращения: ${getFormValue('category') || 'не выбрана'}`,
    `На кого / по какому вопросу: ${getFormValue('target') || 'не указано'}`,
    `Дата, время и место события: ${getFormValue('eventTime') || 'не указано'}`,
    '',
    'Суть обращения:',
    getFormValue('description') || 'не указано',
    '',
    'Доказательства / материалы:',
    getFormValue('evidence') || 'не указано',
    '',
    'Свидетели:',
    getFormValue('witnesses') || 'не указано',
    '',
    'Просьба заявителя:',
    getFormValue('request') || 'проверить изложенные обстоятельства и принять решение в установленном порядке',
    '',
    'Подтверждение:',
    'Сведения изложены добросовестно. Заявитель предупрежден о недопустимости заведомо ложных сведений.'
  ].join('\n');
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function getLocalAppeals() {
  return JSON.parse(localStorage.getItem('usbAppeals') || '[]');
}
function setLocalAppeals(items) {
  localStorage.setItem('usbAppeals', JSON.stringify(items));
}
function renderLocalAppeals() {
  const body = $('#localAppealsBody');
  if (!body) return;
  const items = getLocalAppeals();
  $('#localAppealsCount') && ($('#localAppealsCount').textContent = String(items.length));
  body.innerHTML = items.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${item.number}</td>
      <td>${item.date}</td>
      <td>${item.category}</td>
      <td>${item.applicant}</td>
      <td>${item.target}</td>
      <td><button class="btn" type="button" data-view-appeal="${index}">Открыть</button></td>
    </tr>`).join('') || '<tr><td colspan="7">Пока нет локально сохраненных обращений.</td></tr>';
  $$('[data-view-appeal]').forEach(btn => btn.addEventListener('click', () => {
    const item = getLocalAppeals()[Number(btn.dataset.viewAppeal)];
    if (item) $('#generatedText').textContent = item.text;
  }));
}

function exportLocalAppealsCsv() {
  const items = getLocalAppeals();
  const header = ['№', 'Рег. номер', 'Дата', 'Категория', 'Заявитель', 'Объект', 'Текст'];
  const rows = items.map((item, idx) => [idx + 1, item.number, item.date, item.category, item.applicant, item.target, item.text]);
  const csv = [header, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
  downloadText(`Журнал_обращений_УСБ_${todayRu().replaceAll('.', '-')}.csv`, csv);
}

function initAppealPage() {
  if (!$('#appealForm')) return;
  const numberInput = $('[name="caseNumber"]');
  if (numberInput && !numberInput.value) numberInput.value = nextCaseNumber(false);
  const generated = $('#generatedText');
  const update = () => { generated.textContent = generateAppealText(false); };
  $('#appealForm').addEventListener('input', update);
  update();
  $('#generateBtn')?.addEventListener('click', update);
  $('#copyBtn')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(generated.textContent);
    $('#copyBtn').textContent = 'Скопировано';
    setTimeout(() => $('#copyBtn').textContent = 'Копировать', 1200);
  });
  $('#downloadTxtBtn')?.addEventListener('click', () => {
    const number = getFormValue('caseNumber') || nextCaseNumber(false);
    downloadText(`${number}_обращение_УСБ.txt`, generated.textContent);
  });
  $('#saveLocalBtn')?.addEventListener('click', () => {
    const text = generateAppealText(true);
    const numberMatch = text.match(/Регистрационный номер: (.+)/);
    const item = {
      number: numberMatch ? numberMatch[1].trim() : nextCaseNumber(false),
      date: todayRu(),
      category: getFormValue('category') || '',
      applicant: getFormValue('applicant') || '',
      target: getFormValue('target') || '',
      text,
    };
    const items = getLocalAppeals();
    items.unshift(item);
    setLocalAppeals(items);
    if (numberInput) numberInput.value = nextCaseNumber(false);
    generated.textContent = text;
    renderLocalAppeals();
  });
  $('#exportCsvBtn')?.addEventListener('click', exportLocalAppealsCsv);
  $('#clearLocalBtn')?.addEventListener('click', () => {
    if (confirm('Очистить локальный журнал в этом браузере?')) {
      setLocalAppeals([]);
      renderLocalAppeals();
    }
  });
  renderLocalAppeals();
}

function initQuickCase() {
  const el = $('#quickCaseNumber');
  if (!el) return;
  el.textContent = nextCaseNumber(false);
  $('#quickNextBtn')?.addEventListener('click', () => {
    el.textContent = nextCaseNumber(true);
    el.textContent = nextCaseNumber(false);
  });
}

function initRegulationLoader() {
  const target = $('#regulationSourceLink');
  if (!target) return;
  target.setAttribute('href', 'assets/docs/regulation_usb_ru_fsb_lo_spb.docx');
}

function init() {
  setActiveNav();
  initDocumentsPage();
  initAppealPage();
  initQuickCase();
  initRegulationLoader();
}

document.addEventListener('DOMContentLoaded', init);
