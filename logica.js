import { db, auth } from "./firebase.js";
import {
  collection, addDoc, query, where,
  onSnapshot, deleteDoc,
  doc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let unsubscribe = null;
let diaSelecionado = null;
let horarioSelecionado = null;
let usuarioLogado = null;

/* 🔐 PROTEÇÃO */
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

/* DATA */
const inputData = document.getElementById("data");
const hoje = new Date().toISOString().split("T")[0];
inputData.min = hoje;

inputData.addEventListener("change", () => {
  atualizarCabecalhoSemana(inputData.value);
  carregarAgendaSemana(inputData.value);
});

/* TABELA */
const horarios = ["08:00","10:00","10:15","12:00","13:00",
"15:00","15:15","17:00","18:00","20:15","20:30","22:00"];

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

/* UTIL */
function limparTabela() {
  dias.forEach(dia => {
    horarios.forEach(hora => {
      const c = document.getElementById(`${dia}-${hora}`);
      c.className = "livre";
      c.innerHTML = "";
    });
  });
}

/* 📅 SEMANA */
function obterSemana(data){

  const base = new Date(data+"T00:00");
  const diaSemana = base.getDay();

  const diff = diaSemana===0 ? -6 : 1-diaSemana;
  base.setDate(base.getDate()+diff);

  const segunda = new Date(base);
  const sexta = new Date(base);
  sexta.setDate(base.getDate()+4);

  return {
    inicio: segunda.toISOString().split("T")[0],
    fim: sexta.toISOString().split("T")[0]
  };
}

/* CARREGAR SEMANA */
function carregarAgendaSemana(data){

  if (unsubscribe) unsubscribe();

  const {inicio, fim} = obterSemana(data);

  const q = query(
    agendaRef,
    where("data", ">=", inicio),
    where("data", "<=", fim)
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

      c.className="ocupado";
      c.innerHTML = `
      <strong>${d.professor}</strong><br>
      ${d.turma}<br>${d.laboratorio}
      ${botoes}
      `;
    });
  });
}

function selecionarHorario(dia,hora){
  diaSelecionado = dia;
  horarioSelecionado = hora;
}

/* AGENDAR */
async function tentarAgendar(){

  const turma = document.getElementById("turma").value;
  const laboratorio = document.getElementById("laboratorio").value;

  if(!diaSelecionado||!horarioSelecionado)
    return alert("Selecione horário");

  const dataReal = calcularDataReal(diaSelecionado);

  await addDoc(agendaRef,{
    dia:diaSelecionado,
    horario:horarioSelecionado,
    laboratorio,
    professor:usuarioLogado.nome,
    turma,
    data:dataReal,
    uid:usuarioLogado.uid,
    criadoEm:new Date()
  });
}

/* DATA REAL */
function calcularDataReal(dia){

  const base = new Date(inputData.value+"T00:00");
  const mapa = {Seg:1,Ter:2,Qua:3,Qui:4,Sex:5};

  const diff = mapa[dia]-base.getDay();
  base.setDate(base.getDate()+diff);

  return base.toISOString().split("T")[0];
}

document.getElementById("btnAgendar").onclick = tentarAgendar;

/* EDITAR */
window.editarAgendamento = async id => {
  const nova = prompt("Nova turma:");
  if(!nova)return;

  await updateDoc(doc(db,"agendamentos",id),{
    turma:nova
  });
}

/* CANCELAR */
window.cancelarAgendamento = async id => {
  if(!confirm("Cancelar agendamento?"))return;
  await deleteDoc(doc(db,"agendamentos",id));
}

/* CABEÇALHO */
function atualizarCabecalhoSemana(data){

  const base = new Date(data+"T00:00");
  const dSemana = base.getDay();
  const diff = dSemana===0?-6:1-dSemana;
  base.setDate(base.getDate()+diff);

  ["Seg","Ter","Qua","Qui","Sex"].forEach((d,i)=>{
    const dt = new Date(base);
    dt.setDate(base.getDate()+i);
    document.getElementById(`th-${d}`)
    .innerText = `${d} - ${dt.toLocaleDateString("pt-BR")}`;
  });
}
