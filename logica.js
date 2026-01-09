import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { auth } from "./firebase.js";

import {
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";



let unsubscribe = null;
let diaSelecionado = null;
let horarioSelecionado = null;
let usuarioLogado = null;


// CAPTURA DOS ELEMENTOS
const inputData = document.getElementById("data");

// BLOQUEAR DATAS PASSADAS
const hoje = new Date().toISOString().split("T")[0];
inputData.min = hoje;

// ESCUTA MUDANÇA DE DATA  ✅ COLOCA AQUI
inputData.addEventListener("change", () => {

  const data = inputData.value;

  atualizarCabecalhoSemana(data);
  carregarAgenda(data);
});


const btnLogin = document.getElementById("btnLogin");

btnLogin.onclick = async () => {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  try {
    await signInWithEmailAndPassword(auth, email, senha);
  } catch (e) {
    alert("Login inválido!");
  }
};

const btnLogout = document.getElementById("btnLogout");

btnLogout.onclick = async () => {
  await signOut(auth);

  usuarioLogado = null;

  document.getElementById("sistema").style.display = "none";
  document.getElementById("login").style.display = "block";
};


onAuthStateChanged(auth, user => {
  if (user) {

    usuarioLogado = {
      uid: user.uid,
      nome: user.displayName || user.email.split("@")[0],
      email: user.email
    };

    document.getElementById("login").style.display = "none";
    document.getElementById("sistema").style.display = "block";

  } else {
    document.getElementById("sistema").style.display = "none";
    document.getElementById("login").style.display = "block";
  }
});




const horarios = ["08:00", "10:00", "10:15", "12:00", "13:00", "15:00", "15:15", "17:00", "18:00", "20:15", "20:30", "22:00"];
const dias = ["Seg", "Ter", "Qua", "Qui", "Sex"];

const agendaRef = collection(db, "agendamentos");
const corpoAgenda = document.getElementById("corpo-agenda");

// Monta tabela
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

  tr.appendChild(td); // 👈 ESSENCIAL

  });

  corpoAgenda.appendChild(tr);
});

function limparTabela() {
  dias.forEach(dia => {
    horarios.forEach(hora => {
      const celula = document.getElementById(`${dia}-${hora}`);
      if (celula) {
        celula.className = "livre";
        celula.innerHTML = "";
      }
    });
  });
}

function carregarAgenda(dataSelecionada) {

  if (unsubscribe) unsubscribe(); // cancela listener antigo

  const q = query(
    agendaRef,
    where("data", "==", dataSelecionada)
  );

  unsubscribe = onSnapshot(q, snapshot => {

    limparTabela();

    snapshot.forEach(doc => {

      const dados = doc.data();
      const id = `${dados.dia}-${dados.horario}`;
      const celula = document.getElementById(id);

      if (celula) {
        celula.classList.remove("livre");
        celula.classList.add("ocupado");

        let botoes = "";

if (dados.uid === usuarioLogado.uid) {
  botoes = `
    <br>
    <button onclick="editarAgendamento('${doc.id}')">✏</button>
    <button onclick="cancelarAgendamento('${doc.id}')">❌</button>
  `;
}

celula.innerHTML = `
  <strong>${dados.professor}</strong><br>
  ${dados.turma}<br>
  ${dados.laboratorio}
  ${botoes}
`;

      }
    });
  });
}


function selecionarHorario(dia, hora) {

  document.querySelectorAll("td").forEach(td => {
    td.style.outline = "none";
  });

  const celula = document.getElementById(`${dia}-${hora}`);
  celula.style.outline = "3px solid blue";

  diaSelecionado = dia;
  horarioSelecionado = hora;
}

function atualizarCabecalhoSemana(dataSelecionada) {

  const data = new Date(dataSelecionada + "T00:00");

  // Descobre o dia da semana (0=domingo, 1=segunda...)
  const diaSemana = data.getDay();

  // Ajusta para segunda-feira
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana;

  const segunda = new Date(data);
  segunda.setDate(data.getDate() + diff);

  const dias = ["Seg", "Ter", "Qua", "Qui", "Sex"];

  dias.forEach((dia, index) => {

    const d = new Date(segunda);
    d.setDate(segunda.getDate() + index);

    const formatada = d.toLocaleDateString("pt-BR");

    document.getElementById(`th-${dia}`)
      .innerText = `${dia} - ${formatada}`;
  });
}




// Tentativa de agendamento
async function tentarAgendar(dia, horario) {
  const professor = usuarioLogado.nome;
  const turma = document.getElementById("turma").value;
  const laboratorio = document.getElementById("laboratorio").value;
  const data = document.getElementById("data").value;

if (!data) {
  alert("Selecione uma data");
  return;
}


  if (!professor || !turma) {
    alert("Preencha professor e turma");
    return;
  }

  const q = query(
    agendaRef,
    where("dia", "==", dia),
    where("horario", "==", horario),
    where("laboratorio", "==", laboratorio),
    where("data", "==", data)
  );

  const snap = await getDocs(q);

  if (!snap.empty) {
  alert("Horário já ocupado!");
  return;
  }


  await addDoc(agendaRef, {
    dia,
    horario,
    laboratorio,
    professor,
    turma,
    data,
    uid: usuarioLogado.uid,
    criadoEm: new Date()
  });
}
document.getElementById("data").onchange = (e) => {
  carregarAgenda(e.target.value);
};

document.getElementById("btnAgendar").onclick = () => {

  if (!diaSelecionado || !horarioSelecionado) {
    alert("Selecione um horário!");
    return;
  }

  tentarAgendar(diaSelecionado, horarioSelecionado);
};

import {
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


window.cancelarAgendamento = async (id) => {

  if (!confirm("Deseja cancelar este agendamento?")) return;

  await deleteDoc(doc(db, "agendamentos", id));
};


window.editarAgendamento = async (id) => {

  const novaTurma = prompt("Nova turma:");

  if (!novaTurma) return;

  await updateDoc(doc(db, "agendamentos", id), {
    turma: novaTurma
  });
};
