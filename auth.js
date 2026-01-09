import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

window.login = async function(){

  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  const erro = document.getElementById('msgErro');

  try{
    await signInWithEmailAndPassword(auth, email, senha);
    window.location.href = "sistema.html";
  }catch{
    erro.style.display = "block";
    erro.innerText = "Email ou senha inválidos";
  }
}
