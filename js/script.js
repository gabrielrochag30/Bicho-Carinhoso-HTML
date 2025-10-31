/* script.js — interatividade: SPA básico, menu hambúrguer, máscaras e validação */

document.addEventListener('DOMContentLoaded', () => {
  // Atualiza anos nos footers
  const y = new Date().getFullYear();
  document.getElementById('year')?.textContent = y;
  document.getElementById('year-2')?.textContent = y;
  document.getElementById('year-3')?.textContent = y;

  // Inicializa menus hambúrguer (várias instâncias)
  document.querySelectorAll('.hamburger').forEach(btn => {
    const navList = btn.nextElementSibling;
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      if (navList) navList.classList.toggle('open');
    });
  });

  // Submenu toggles (mobile)
  document.querySelectorAll('.submenu-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      const submenu = btn.parentElement.querySelector('.submenu');
      if (submenu) submenu.style.display = expanded ? 'none':'block';
    });
  });

  // SPA básico: intercepta links com data-link e carrega a main do arquivo alvo
  initSPA();

  // Botões de ação nos cards de projetos
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const project = btn.dataset.project;
    if (action === 'volunteer') {
      showToast(`Abra a página de cadastro para se voluntariar no projeto "${project}"`);
      // encaminhar para cadastro via SPA
      navigateTo('cadastro.html');
    } else if (action === 'donate') {
      showToast(`Obrigado pelo interesse em doar para "${project}" — em breve integração de pagamentos.`);
    }
  });

  // Form handling (cadastro)
  const form = document.getElementById('cadastro-form');
  if (form) {
    // input masks
    const cpf = form.querySelector('#cpf');
    const tel = form.querySelector('#telefone');
    const cep = form.querySelector('#cep');

    if (cpf) cpf.addEventListener('input', maskCPF, false);
    if (tel) tel.addEventListener('input', maskPhone, false);
    if (cep)  cep.addEventListener('input', maskCEP, false);

    // real-time validity styling
    form.querySelectorAll('input, select').forEach(f => {
      f.addEventListener('input', () => {
        if (f.checkValidity()) {
          f.classList.add('valid');
        } else {
          f.classList.remove('valid');
        }
      });
    });

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!form.checkValidity()) {
        // show validation messages
        showFormFeedback('Preencha corretamente os campos marcados.', true);
        // focus no primeiro inválido
        const firstInvalid = form.querySelector(':invalid');
        firstInvalid?.focus();
        return;
      }

      // Simular persistência (localStorage)
      const data = Object.fromEntries(new FormData(form).entries());
      let submissions = JSON.parse(localStorage.getItem('bichocarinhoso_submissions') || '[]');
      submissions.push({ ...data, createdAt: new Date().toISOString() });
      localStorage.setItem('bichocarinhoso_submissions', JSON.stringify(submissions));

      showFormFeedback('Cadastro enviado com sucesso! Obrigado por se inscrever.', false);
      showToast('Cadastro enviado ✔');
      form.reset();
      form.querySelectorAll('input').forEach(i => i.classList.remove('valid'));
    });
  }
});

/* -------------------------
   Helper: showToast
   ------------------------- */
function showToast(message, timeout = 3500) {
  const id = document.querySelector('[id^=toast]')?.id || 'toast';
  const toast = document.getElementById(id) || document.querySelector('.toast') || createToast();
  toast.hidden = false;
  toast.textContent = message;
  setTimeout(() => {
    toast.hidden = true;
  }, timeout);
}
function createToast(){
  const d = document.createElement('div');
  d.className='toast';
  d.id='toast';
  document.body.appendChild(d);
  return d;
}

/* -------------------------
   Form feedback helper
   ------------------------- */
function showFormFeedback(msg, isError = false){
  const el = document.getElementById('form-feedback');
  if (!el) {
    showToast(msg);
    return;
  }
  el.textContent = msg;
  el.style.color = isError ? '#d9534f' : 'var(--color-muted)';
  setTimeout(() => el.textContent = '', 6000);
}

/* -------------------------
   Input masks: CPF, Phone, CEP
   Simple implementations — suficientes para protótipo
   ------------------------- */
function onlyDigits(str){ return str.replace(/\D/g, ''); }

function maskCPF(e){
  const input = e.target;
  let v = onlyDigits(input.value).slice(0,11);
  if (v.length <= 3) input.value = v;
  else if (v.length <= 6) input.value = v.replace(/(\d{3})(\d+)/, '$1.$2');
  else if (v.length <= 9) input.value = v.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
  else input.value = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
}

function maskPhone(e){
  const input = e.target;
  let v = onlyDigits(input.value).slice(0,11);
  if (v.length <= 2) input.value = v;
  else if (v.length <= 6) input.value = `(${v.slice(0,2)}) ${v.slice(2)}`;
  else input.value = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7,11)}`;
}

function maskCEP(e){
  const input = e.target;
  let v = onlyDigits(input.value).slice(0,8);
  if (v.length <= 5) input.value = v;
  else input.value = v.replace(/(\d{5})(\d+)/, '$1-$2');
}

/* -------------------------
   SPA router (básico)
   - Intercepta links com data-link
   - Faz fetch do arquivo e insere o conteúdo do <main id="main">
   - Atualiza histórico
   ------------------------- */
function initSPA() {
  document.body.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[data-link]');
    if (!a) return;
    ev.preventDefault();
    const href = a.getAttribute('href');
    navigateTo(href);
  });

  window.addEventListener('popstate', (ev) => {
    const path = location.pathname.split('/').pop() || 'index.html';
    loadMain(path);
  });

  // initial load: if not index, try to load mapped content
  const initial = location.pathname.split('/').pop() || 'index.html';
  if (initial && initial !== '') loadMain(initial);
}

function navigateTo(href){
  history.pushState({}, '', href);
  loadMain(href);
  // close mobile menu if open
  document.querySelectorAll('.nav-list.open').forEach(nav => nav.classList.remove('open'));
  document.querySelectorAll('.hamburger[aria-expanded="true"]').forEach(h => h.setAttribute('aria-expanded','false'));
}

async function loadMain(href){
  try {
    const path = href.split('/').pop();
    const resp = await fetch(path, {cache:'no-store'});
    if (!resp.ok) throw new Error('Erro ao carregar página');
    const text = await resp.text();
    // extract the content of <main id="main">...</main>
    const tmp = document.createElement('div');
    tmp.innerHTML = text;
    const newMain = tmp.querySelector('#main');
    const currentMain = document.getElementById('main');
    if (newMain && currentMain) {
      currentMain.replaceWith(newMain);
      // set focus to main for accessibility
      newMain.setAttribute('tabindex','-1');
      newMain.focus();
      // re-run small init actions for newly injected content
      // e.g., buttons that use data-link, toast containers
      // (we keep showToast and other handlers globally)
    } else {
      // fallback: full navigation
      location.href = href;
    }
  } catch (err) {
    console.error(err);
    showToast('Não foi possível carregar a página (SPA). Recarregue a página.', 5000);
  }
}

/* end of script.js */
