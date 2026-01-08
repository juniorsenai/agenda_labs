import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const form = document.getElementById("formAgendamento");
const agenda = document.getElementById("agenda");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const dados = {
    professor: professor.value,
    turma: turma.value,
    laboratorio: laboratorio.value,
    data: data.value,
    inicio: inicio.value,
    fim: fim.value
  };

  await addDoc(collection(db, "agendamentos"), dados);
  form.reset();
});

onSnapshot(collection(db, "agendamentos"), (snapshot) => {
  agenda.innerHTML = "";
  snapshot.forEach(doc => {
    const a = doc.data();
    agenda.innerHTML += `
      <li>
        <strong>${a.laboratorio}</strong><br>
        ${a.data} | ${a.inicio} - ${a.fim}<br>
        ${a.professor} (${a.turma})
      </li>
    `;
  });
});
