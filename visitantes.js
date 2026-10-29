/* Panóptico — Pré-cadastro de visitantes por planilha.
   Integração com o PWA privado do Google Drive; NÃO registra entrada e NÃO autoriza visita. */
(function () {
"use strict";
let preview = [];
let previewFile = "";
const LIMITE = 500, TAMANHO_MAX = 5 * 1024 * 1024, UNIDADE = "PRBBL";

function limpar(v) { return String(v ?? "").trim().replace(/\s+/g, " "); }
function canon(v) { return limpar(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase(); }
function documento(v) { return limpar(v).replace(/\D/g, ""); }
function valor(row, nomes) {
  for (const key of Object.keys(row)) if (nomes.includes(normHead(key)) && limpar(row[key])) return limpar(row[key]);
  return "";
}
function lerCSV(texto) {
  texto = String(texto).replace(/^\uFEFF/, "");
  const primeira = texto.split(/\r?\n/, 1)[0] || "";
  const sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ";" : ",";
  const linhas = [], atual = []; let campo = "", aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === '"') {
      if (aspas && texto[i + 1] === '"') { campo += '"'; i++; } else aspas = !aspas;
    } else if (c === sep && !aspas) { atual.push(campo); campo = ""; }
    else if ((c === "\n" || c === "\r") && !aspas) {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      atual.push(campo); campo = "";
      if (atual.some(v => limpar(v))) linhas.push(atual.splice(0));
      else atual.length = 0;
    } else campo += c;
  }
  if (aspas) throw new Error("CSV contém aspas não fechadas.");
  atual.push(campo); if (atual.some(v => limpar(v))) linhas.push(atual);
  if (!linhas.length) return [];
  const cabe = linhas.shift().map(limpar);
  return linhas.map(vals => Object.fromEntries(cabe.map((k, i) => [k, vals[i] ?? ""])));
}
function chavePessoa(r) {
  const base = canon(r.unidade || UNIDADE) + "|" + canon(r.interno);
  return {nome: base + "|" + canon(r.nome), doc: documento(r.documento) ? base + "|" + documento(r.documento) : ""};
}
function validarLinha(r, numero) {
  const nome = valor(r, ["nome", "nome_visitante", "nome_do_visitante", "visitante"]);
  const interno = valor(r, ["interno", "interno_visitado", "nome_do_interno", "nome_interno", "preso", "nome_do_preso"]);
  const doc = valor(r, ["documento", "cpf", "rg", "numero_documento"]);
  const parentesco = valor(r, ["parentesco", "vinculo"]);
  const tipoBruto = canon(valor(r, ["modalidade", "tipo_visita", "tipo_de_visita", "tipo"])) || "SOCIAL";
  const modalidade = tipoBruto === "VISITA SOCIAL" ? "SOCIAL" : tipoBruto === "VISITA ASSISTIDA" ? "ASSISTIDA" : tipoBruto === "VISITA INFANTIL" ? "INFANTIL" : tipoBruto;
  const dataBruta = valor(r, ["data_visita", "data_da_visita", "data"]);
  const dataVisita = dataBruta ? isoDate(dataBruta) : "";
  const turnoBruto = canon(valor(r, ["turno", "periodo", "horario"]));
  const turno = turnoBruto === "MANHÃ" || turnoBruto === "MANHA" || turnoBruto === "MATUTINO" ? "MANHA" : turnoBruto === "VESPERTINO" ? "TARDE" : turnoBruto;
  const observacoes = valor(r, ["observacoes", "observacao", "obs"]);
  let erro = "";
  if (!nome || !interno) erro = "Informe nome do visitante e interno visitado.";
  else if (nome.length > 180 || interno.length > 180 || doc.length > 40 || observacoes.length > 1000)
    erro = "Um dos campos ultrapassa o tamanho permitido.";
  else if (!["SOCIAL", "ASSISTIDA", "INFANTIL"].includes(modalidade)) erro = "Modalidade não reconhecida.";
  else if (dataBruta && !dataVisita) erro = "Data da visita inválida.";
  else if (turno && !["MANHA", "TARDE"].includes(turno)) erro = "Turno deve ser MANHA ou TARDE.";
  return {numero, nome, interno, documento: doc, parentesco, modalidade, dataVisita,
    turno, observacoes, unidade: UNIDADE, situacao: "PENDENTE_CONFERENCIA", erro};
}
function preparar(rows, existentes = []) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("A planilha não contém visitantes.");
  if (rows.length > LIMITE) throw new Error("Limite de " + LIMITE + " visitantes por lote; 50 são aceitos normalmente.");
  const headings = Object.keys(rows[0] || {}).map(normHead);
  if (!headings.some(x => ["nome", "nome_visitante", "nome_do_visitante", "visitante"].includes(x)) ||
      !headings.some(x => ["interno", "interno_visitado", "nome_do_interno", "nome_interno", "preso", "nome_do_preso"].includes(x)))
    throw new Error("A planilha precisa das colunas Nome do visitante e Interno visitado.");
  const nomes = new Set(), docs = new Set();
  for (const x of existentes) {
    const k = chavePessoa(x); nomes.add(k.nome); if (k.doc) docs.add(k.doc);
  }
  return rows.map((r,i) => {
    const item = validarLinha(r,i+2);
    if (!item.erro) {
      const k = chavePessoa(item);
      if (nomes.has(k.nome) || (k.doc && docs.has(k.doc))) item.erro = "Duplicado na lista ou já cadastrado.";
      else { nomes.add(k.nome); if (k.doc) docs.add(k.doc); }
    }
    return item;
  });
}
function downloadModeloVisitantes() {
  const cabecalho = "Nome do visitante;Documento;Interno visitado;Parentesco;Modalidade;Data da visita;Turno;Observações\n";
  const a = document.createElement("a"), url = URL.createObjectURL(new Blob(["\uFEFF",cabecalho],{type:"text/csv;charset=utf-8"}));
  a.href = url; a.download = "MODELO_VISITANTES_PANOPTICO.csv"; document.body.appendChild(a);
  a.click(); a.remove(); URL.revokeObjectURL(url);
}
function resumoPreview() {
  const validos = preview.filter(x => !x.erro).length, pendentes = preview.length - validos;
  const tbody = preview.slice(0, 100).map(x => '<tr><td>' + x.numero + '</td><td>' + esc(x.nome) +
    '</td><td>' + esc(x.interno) + '</td><td>' + esc(x.modalidade) + '</td><td>' +
    (x.erro ? '<span class="badge no">' + esc(x.erro) + '</span>' : '<span class="badge wait">Pendente de conferência</span>') +
    '</td></tr>').join("");
  $("#visitorPreview").innerHTML = '<div class="import-preview"><b>' + esc(previewFile) + '</b><p>' +
    preview.length + ' linhas · ' + validos + ' prontas · ' + pendentes +
    ' para correção/duplicadas</p><div class="table-wrap mini"><table class="table"><thead>' +
    '<tr><th>Linha</th><th>Visitante</th><th>Interno visitado</th><th>Modalidade</th><th>Conferência</th></tr></thead>' +
    '<tbody>' + tbody + '</tbody></table></div>' +
    (preview.length > 100 ? '<small>Exibindo 100 das ' + preview.length + ' linhas.</small>' : '') +
    '<small>Importação não equivale a autorização de visita ou registro de entrada.</small></div>';
  $("#visitorCommit").disabled = !validos;
}
async function selecionarListaVisitantes(ev) {
  preview = []; previewFile = ""; $("#visitorCommit").disabled = true;
  const f = ev.target.files && ev.target.files[0], output = $("#visitorPreview");
  if (!f) return;
  try {
    if (f.size > TAMANHO_MAX) throw new Error("O arquivo deve ter até 5 MB.");
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) throw new Error("Use Excel (.xlsx/.xls) ou CSV.");
    let rows;
    if (/\.csv$/i.test(f.name)) rows = lerCSV(await f.text());
    else {
      if (!window.XLSX) throw new Error("O leitor de Excel está indisponível. Use CSV ou reconecte-se.");
      const wb = XLSX.read(await f.arrayBuffer(), {type:"array", cellDates:true});
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:"", raw:true, blankrows:false});
    }
    preview = preparar(rows, state.visitantes || []);
    previewFile = f.name; resumoPreview();
  } catch (err) { output.className = "warning"; output.textContent = err.message; }
}
async function confirmarListaVisitantes() {
  if (!token || !preview.length) return toast("Entre com sua conta e selecione uma planilha.");
  const botao = $("#visitorCommit"); botao.disabled = true;
  let snapshot;
  try {
    // Releitura e revalidação antes de salvar, para evitar duplicidades entre cliques.
    await loadData();
    const candidatos = preview.filter(x => !x.erro);
    const validados = preparar(candidatos.map(x => ({
      "Nome do visitante": x.nome, "Documento": x.documento, "Interno visitado": x.interno,
      "Parentesco": x.parentesco, "Modalidade": x.modalidade, "Data da visita": x.dataVisita,
      "Turno": x.turno, "Observações": x.observacoes
    })), state.visitantes || []);
    const validos = validados.filter(x => !x.erro);
    if (!validos.length) throw new Error("Todos os visitantes já foram importados ou precisam de correção.");
    snapshot = JSON.parse(JSON.stringify(state));
    const lote = id(), agora = stamp(), responsavel = user.email || user.name || "Usuário Google";
    if (!Array.isArray(state.visitantes)) state.visitantes = [];
    state.visitantes.unshift(...validos.map(x => ({
      id: id(), lote, nome: x.nome, documento: x.documento, interno: x.interno,
      parentesco:x.parentesco, modalidade:x.modalidade, dataVisita:x.dataVisita,
      turno:x.turno, observacoes:x.observacoes, situacao:"PENDENTE_CONFERENCIA",
      unidade:UNIDADE, criadoEm:agora, criadoPor:responsavel
    })));
    await saveData("IMPORTAR_VISITANTES", validos.length + " pré-cadastro(s), lote " + lote + ", unidade " + UNIDADE);
    preview = []; previewFile = ""; toast(validos.length + " visitante(s) pré-cadastrado(s), aguardando conferência.");
    renderVisitantes();
  } catch (err) {
    if (snapshot) state = snapshot;
    toast(err.message || "Falha ao salvar visitantes. Nenhuma importação confirmada.");
    if (botao) botao.disabled = false;
  }
}
function filtrarVisitantes() {
  const q = canon($("#visitorSearch")?.value || "");
  const lista = (state.visitantes || []).filter(x => canon([x.nome,x.interno,x.modalidade,x.parentesco].join(" ")).includes(q));
  $("#visitorTable").innerHTML = lista.length ?
    '<div class="table-wrap"><table class="table"><thead><tr><th>Visitante</th><th>Interno visitado</th><th>Modalidade</th>' +
    '<th>Data/turno</th><th>Situação</th></tr></thead><tbody>' +
    lista.slice(0,500).map(x => '<tr><td>' + esc(x.nome) + '</td><td>' + esc(x.interno) +
    '</td><td>' + esc(x.modalidade) + '</td><td>' + esc(x.dataVisita || "Não informada") +
    ' ' + esc(x.turno || "") + '</td><td><span class="badge wait">Pendente de conferência</span></td></tr>').join("") +
    '</tbody></table></div>' : '<div class="empty small">Nenhum visitante encontrado.</div>';
}
function renderVisitantes() {
  const registros = Array.isArray(state.visitantes) ? state.visitantes : [];
  $("#content").innerHTML = '<div class="page-head"><div><span class="kicker">CONTROLE DE ACESSO • PRBBL</span>' +
    '<h1>Visitantes — Importação em lote</h1><p>Cadastre 50 visitantes de uma só vez, ou até 500 em cada planilha.</p></div>' +
    '<button class="btn ghost" id="visitorTemplate">Baixar modelo CSV</button></div>' +
    '<div class="panel import-panel"><div class="form compact"><label class="field"><span>Lista de visitantes</span>' +
    '<input id="visitorFile" type="file" accept=".xlsx,.xls,.csv"></label>' +
    '<div class="import-help">Obrigatórios: <b>Nome do visitante</b> e <b>Interno visitado</b>.' +
    ' Opcionais: documento, parentesco, modalidade, data, turno e observações.' +
    ' Documentos com zero inicial devem estar como <b>texto</b> na planilha.</div></div>' +
    '<div id="visitorPreview" class="empty small">Selecione uma planilha para conferir os registros.</div>' +
    '<div class="actions import-actions"><button class="btn primary" id="visitorCommit" disabled>Pré-cadastrar visitantes válidos</button></div>' +
    '<div class="import-help">Importação cria apenas <b>pré-cadastros para conferência</b>. Não autoriza visitantes,' +
    ' não registra sua entrada na PRBBL e não integra automaticamente a base D1 de produção.</div></div>' +
    '<div class="panel"><h3>Pré-cadastros salvos (' + registros.length + ')</h3>' +
    '<div class="toolbar"><label>⌕ <input id="visitorSearch" placeholder="Buscar visitante ou interno"></label></div>' +
    '<div id="visitorTable"></div></div>';
  $("#visitorTemplate").onclick = downloadModeloVisitantes;
  $("#visitorFile").onchange = selecionarListaVisitantes;
  $("#visitorCommit").onclick = confirmarListaVisitantes;
  $("#visitorSearch").oninput = filtrarVisitantes;
  filtrarVisitantes();
}
window.PAN_VISITAS_UTIL = {lerCSV, preparar, validarLinha}; // Testes de validação, sem acesso aos registros.
window.renderVisitantes = renderVisitantes;
})();