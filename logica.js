import { db, auth } from "./firebase.js";

import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ===============================
   VARIÁVEIS GLOBAIS
================================ */
let unsubscribe = null;
let diaSelecionado = null;
let horarioSelecionado = null;
let usuarioLogado = null;
let semanaBaseSelecionada = null;
let laboratorioSelecionado = null;

/* ===============================
   FUNÇÕES DE DATA
================================ */
function calcularSemanaBase(data) {
  const d = new Date(data + "T00:00");
  const diaSemana = d.getDay(); // 0=Dom, 1=Seg
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

/* ===============================
   AUTENTICAÇÃO / PROTEÇÃO
================================ */
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    usuarioLogado = {
      uid: user.uid,
      nome: user.displayName || user.email.split("@")[0],
      email: user.email
    };
    document.getElementById("sistema").style.display = "block";
  }
});

/* LOGOUT */
document.getElementById("btnLogout").onclick = async () => {
  await signOut(auth);
  window.location.href = "index.html";
};

/* ===============================
   INPUT DATA
================================ */
const inputData = document.getElementById("data");
const hoje = new Date().toISOString().split("T")[0];
inputData.min = hoje;

inputData.addEventListener("change", () => {
  semanaBaseSelecionada = calcularSemanaBase(inputData.value);
  atualizarCabecalhoSemana(inputData.value);
  carregarAgenda();
});

/* ===============================
   SELECT LABORATÓRIO
================================ */
const selectLab = document.getElementById("laboratorio");

selectLab.addEventListener("change", () => {
  laboratorioSelecionado = selectLab.value;
  carregarAgenda();
});

/* ===============================
   TABELA
================================ */
const horarios = [
  "08:00","10:00","10:15","12:00","13:00",
  "15:00","15:15","17:00","18:00","20:15","20:30","22:00"
];

const dias = ["Seg","Ter","Qua","Qui","Sex"];
const agendaRef = collection(db, "agendamentos");
const corpoAgenda = document.getElementById("corpo-agenda");

horarios.forEach(hora => {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${hora}</td>`;

  dias.forEach(dia => {
    const td = document.createElement("td");
    td.classList.add("livre");
    td.id = `${dia}-${hora}`;

    td.onclick = () => {
      if (td.classList.contains("ocupado")) return;
      selecionarHorario(dia, hora);
    };

    tr.appendChild(td);
  });

  corpoAgenda.appendChild(tr);
});

/* ===============================
   FUNÇÕES DA TABELA
================================ */
function limparTabela() {
  dias.forEach(dia => {
    horarios.forEach(hora => {
      const c = document.getElementById(`${dia}-${hora}`);
      c.className = "livre";
      c.innerHTML = "";
    });
  });
}

function carregarAgenda() {
  if (!semanaBaseSelecionada || !laboratorioSelecionado) {
    limparTabela();
    return;
  }

  if (unsubscribe) unsubscribe();

  const q = query(
    agendaRef,
    where("semanaBase", "==", semanaBaseSelecionada),
    where("laboratorio", "==", laboratorioSelecionado)
  );

  unsubscribe = onSnapshot(q, snap => {
    limparTabela();

    snap.forEach(docu => {
      const d = docu.data();
      const c = document.getElementById(`${d.dia}-${d.horario}`);

      let botoes = "";

      if (d.uid === usuarioLogado.uid) {
        botoes = `
          <br>
          <button onclick="editarAgendamento('${docu.id}')">✏</button>
          <button onclick="cancelarAgendamento('${docu.id}')">❌</button>
        `;
      }

      c.className = "ocupado";
      c.innerHTML = `
        <strong>${d.professor}</strong><br>
        ${d.turma}<br>${d.laboratorio}
        ${botoes}
      `;
    });
  });
}

function selecionarHorario(dia, hora) {
  diaSelecionado = dia;
  horarioSelecionado = hora;
}

/* ===============================
   AGENDAR
================================ */
async function tentarAgendar() {
  const turma = document.getElementById("turma").value;
  const laboratorio = document.getElementById("laboratorio").value;
  const data = document.getElementById("data").value;

  if (!diaSelecionado || !horarioSelecionado)
    return alert("Selecione um horário");

  if (!data)
    return alert("Selecione uma data");

  if (!laboratorio)
    return alert("Selecione um laboratório");

  await addDoc(agendaRef, {
    dia: diaSelecionado,
    horario: horarioSelecionado,
    laboratorio,
    professor: usuarioLogado.nome,
    turma,
    data,
    semanaBase: calcularSemanaBase(data),
    uid: usuarioLogado.uid,
    criadoEm: new Date()
  });
}

document.getElementById("btnAgendar").onclick = tentarAgendar;

/* ===============================
   EDITAR / CANCELAR
================================ */
window.editarAgendamento = async id => {
  const nova = prompt("Nova turma:");
  if (!nova) return;

  await updateDoc(doc(db, "agendamentos", id), {
    turma: nova
  });
};

window.cancelarAgendamento = async id => {
  if (!confirm("Cancelar agendamento?")) return;
  await deleteDoc(doc(db, "agendamentos", id));
};

/* ===============================
   CABEÇALHO DA SEMANA
================================ */
function atualizarCabecalhoSemana(data) {
  const base = new Date(data + "T00:00");
  const dSemana = base.getDay();
  const diff = dSemana === 0 ? -6 : 1 - dSemana;
  base.setDate(base.getDate() + diff);

  ["Seg","Ter","Qua","Qui","Sex"].forEach((d, i) => {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    document.getElementById(`th-${d}`).innerText =
      `${d} - ${dt.toLocaleDateString("pt-BR")}`;
  });
}


/*==========================
          DOWNLOAD
============================*/
function baixarCSV(conteudo, nomeArquivo) {
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}


//RELATORIO
document.getElementById("btnRelatorio").onclick = gerarRelatorioMensal;

async function gerarRelatorioMensal() {

  const dataSelecionada = document.getElementById("data").value;
  const laboratorio = document.getElementById("laboratorio").value;

  if (!dataSelecionada)
    return alert("Selecione uma data para o relatório");

  if (!laboratorio)
    return alert("Selecione um laboratório");

  // 🔹 Cálculo correto do mês
  const base = new Date(dataSelecionada + "T00:00");
  const ano = base.getFullYear();
  const mes = base.getMonth();

  const inicioMes = new Date(ano, mes, 1);
  const fimMes = new Date(ano, mes + 1, 0); // último dia real do mês

  const inicioStr = inicioMes.toISOString().split("T")[0];
  const fimStr = fimMes.toISOString().split("T")[0];

  console.log("Relatório:", inicioStr, fimStr, laboratorio);

  const q = query(
    agendaRef,
    where("laboratorio", "==", laboratorio),
    where("data", ">=", inicioStr),
    where("data", "<=", fimStr)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    alert("Nenhum agendamento encontrado neste mês");
    return;
  }

  let csv = "Data;Dia;Horário;Laboratório;Professor;Turma\n";

  snap.forEach(docu => {
    const d = docu.data();
    csv += `${d.data};${d.dia};${d.horario};${d.laboratorio};${d.professor};${d.turma}\n`;
  });

  baixarCSV(csv, `relatorio_${laboratorio}_${ano}_${mes+1}.csv`);
}


