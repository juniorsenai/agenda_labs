import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import { 
  getAuth 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
  getFirestore 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDUFFiuXEIzdH3vokEAUn9UsMBSp9NyNgE",
  authDomain: "agendamento-de-laborator-3633e.firebaseapp.com",
  projectId: "agendamento-de-laborator-3633e",
  storageBucket: "agendamento-de-laborator-3633e.firebasestorage.app",
  messagingSenderId: "285596110822",
  appId: "1:285596110822:web:e8ea099b7188b70a7e5027"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); // 👈 NOVO (autenticação)
