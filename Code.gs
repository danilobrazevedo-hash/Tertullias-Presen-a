/**
 * Tertúlias · Presença — servidor em Google Apps Script.
 * Guarda tudo numa Planilha Google com três abas:
 *   Tertulias  : Data | Tema | Quem conduz | Palavra-chave | Liberada
 *   Respostas  : Respondido em | Data | Tema | Nome | Resposta | Motivo | ID
 *   Pessoas    : ID | Nome | Cadastrado em | Atualizado em
 *
 * Primeira vez: rode a função `configurar` pelo editor (menu Executar).
 * Depois publique em Implantar > Nova implantação > App da Web
 *   (Executar como: Eu · Quem pode acessar: Qualquer pessoa).
 */

const TZ = 'America/Sao_Paulo';
const ABRE_AS = '20:15';      // respostas abrem às 20h15 da quinta
const DIAS_DEPOIS = 7;        // e ficam abertas por mais 7 dias
const STATUS = { presente: 'Presente', falta: 'Falta', justificada: 'Falta justificada' };

// ---------- entrada ----------
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.action === 'dados') return saida(dados(String(p.id || '')));
    return saida({ ok: true, app: 'tertulias' });
  } catch (err) { return saida({ erro: String(err.message || err) }); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (b.action === 'nome') return saida(salvarNome(b));
    if (b.action === 'responder') return saida(responder(b));
    return saida({ erro: 'Ação desconhecida.' });
  } catch (err) {
    return saida({ erro: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function saida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- utilidades ----------
function aba(nome) { return SpreadsheetApp.getActive().getSheetByName(nome); }
function dia(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}
function norm(s) { return String(s || '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' '); }
function verdadeiro(v) { return v === true || /^(sim|s|true|x|1)$/i.test(String(v || '').trim()); }
function agoraTxt() { return Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm:ss'); }
function hoje() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function diasAtras(n) { return Utilities.formatDate(new Date(Date.now() - n * 864e5), TZ, 'yyyy-MM-dd'); }

function tertulias() {
  const v = aba('Tertulias').getDataRange().getValues().slice(1);
  return v.map(r => ({ data: dia(r[0]), tema: String(r[1] || '').trim() || 'Tema a definir', quem: String(r[2] || '').trim(),
                       codigo: String(r[3] || '').trim(), liberada: verdadeiro(r[4]) }))
          .filter(t => t.data).sort((a, b) => a.data < b.data ? -1 : 1);
}

function aberta(t) {
  if (t.liberada) return true;
  const h = hoje();
  if (t.data === h) return Utilities.formatDate(new Date(), TZ, 'HH:mm') >= ABRE_AS;
  return t.data < h && t.data >= diasAtras(DIAS_DEPOIS);
}

function pessoaPorId(id) {
  const sh = aba('Pessoas'); const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][0]) === id) return { linha: i + 1, id: id, nome: String(v[i][1] || '') };
  return null;
}

// ---------- ações ----------
function dados(id) {
  const lista = tertulias().map(t => ({ data: t.data, tema: t.tema, quem: t.quem, temCodigo: !!t.codigo, liberada: t.liberada }));
  const respostas = {};
  let nome = '';
  if (id) {
    const p = pessoaPorId(id); if (p) nome = p.nome;
    const v = aba('Respostas').getDataRange().getValues();
    for (let i = 1; i < v.length; i++) {
      if (String(v[i][6]) !== id) continue;
      const st = Object.keys(STATUS).find(k => STATUS[k] === v[i][4]);
      if (st) respostas[dia(v[i][1])] = { status: st, motivo: String(v[i][5] || ''), em: v[i][0] instanceof Date ? Utilities.formatDate(v[i][0], TZ, 'dd/MM HH:mm') : String(v[i][0] || '') };
    }
  }
  return { ok: true, tertulias: lista, respostas: respostas, nome: nome, hoje: hoje(), abreAs: ABRE_AS };
}

function salvarNome(b) {
  const nome = String(b.nome || '').replace(/\s+/g, ' ').trim();
  let id = String(b.id || '').trim();
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) throw new Error('Identificador inválido.');
  if (nome.split(' ').filter(p => p.length >= 2).length < 2) throw new Error('Digite nome e sobrenome.');
  if (nome.length > 80) throw new Error('Nome muito longo.');
  const sh = aba('Pessoas'); const v = sh.getDataRange().getValues();
  // mesma pessoa em outro celular: reaproveita o cadastro pelo nome
  for (let i = 1; i < v.length; i++) {
    if (norm(v[i][1]) === norm(nome) && String(v[i][0]) !== id && !b.renomear) {
      return { ok: true, id: String(v[i][0]), nome: String(v[i][1]) };
    }
  }
  const p = pessoaPorId(id);
  if (p) {
    sh.getRange(p.linha, 2).setValue(nome); sh.getRange(p.linha, 4).setValue(agoraTxt());
    const r = aba('Respostas'); const rv = r.getDataRange().getValues();
    for (let i = 1; i < rv.length; i++) if (String(rv[i][6]) === id) r.getRange(i + 1, 4).setValue(nome);
  } else {
    sh.appendRow([id, nome, agoraTxt(), agoraTxt()]);
  }
  return { ok: true, id: id, nome: nome };
}

function responder(b) {
  const id = String(b.id || '').trim();
  const p = pessoaPorId(id);
  if (!p) throw new Error('Cadastre seu nome antes de responder.');
  const t = tertulias().find(x => x.data === String(b.data || ''));
  if (!t) throw new Error('Tertúlia não encontrada.');
  if (!aberta(t)) throw new Error(t.data >= hoje() ? 'As respostas abrem às 20h15 do dia da tertúlia.' : 'O prazo para responder esta tertúlia terminou.');
  const st = String(b.status || '');
  if (!STATUS[st]) throw new Error('Resposta inválida.');
  const motivo = st === 'justificada' ? String(b.motivo || '').trim().slice(0, 500) : '';
  if (st === 'justificada' && motivo.length < 3) throw new Error('Escreva o motivo da falta.');
  if (st === 'presente' && t.codigo && norm(b.codigo) !== norm(t.codigo)) throw new Error('Palavra-chave incorreta. Confira com o organizador.');

  const sh = aba('Respostas'); const v = sh.getDataRange().getValues();
  const linha = [agoraTxt(), t.data, t.tema, p.nome, STATUS[st], motivo, id];
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][6]) === id && dia(v[i][1]) === t.data) { sh.getRange(i + 1, 1, 1, 7).setValues([linha]); return { ok: true }; }
  }
  sh.appendRow(linha);
  return { ok: true };
}

// ---------- configuração inicial (rodar uma vez) ----------
function configurar() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TZ);
  const cria = (nome, cab) => {
    let sh = ss.getSheetByName(nome);
    if (!sh) sh = ss.insertSheet(nome);
    if (sh.getLastRow() === 0) { sh.appendRow(cab); sh.setFrozenRows(1); sh.getRange(1, 1, 1, cab.length).setFontWeight('bold').setBackground('#12326E').setFontColor('#FFFFFF'); }
    return sh;
  };
  const t = cria('Tertulias', ['Data', 'Tema', 'Quem conduz', 'Palavra-chave', 'Liberada']);
  cria('Respostas', ['Respondido em', 'Data', 'Tema', 'Nome', 'Resposta', 'Motivo', 'ID']);
  cria('Pessoas', ['ID', 'Nome', 'Cadastrado em', 'Atualizado em']);
  ['Respostas', 'Pessoas'].forEach(n => ss.getSheetByName(n).getRange('B:B').setNumberFormat('@'));
  const pagina1 = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
  if (pagina1 && ss.getSheets().length > 3 && pagina1.getLastRow() === 0) ss.deleteSheet(pagina1);

  if (t.getLastRow() <= 1) {
    const linhas = [];
    const d = new Date(2026, 10, 26); // 26/11/2026
    const fim = new Date(2027, 11, 31);
    while (d <= fim) { linhas.push([new Date(d), 'Tema a definir', '', '', false]); d.setDate(d.getDate() + 7); }
    t.getRange(2, 1, linhas.length, 5).setValues(linhas);
    t.getRange(2, 1, linhas.length, 1).setNumberFormat('dd/mm/yyyy');
    t.getRange(2, 5, linhas.length, 1).insertCheckboxes();
    t.getRange(2, 5).setValue(true); // 26/11/2026 liberada para teste
    t.setColumnWidth(2, 340);
  }
}
