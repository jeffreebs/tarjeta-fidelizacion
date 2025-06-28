// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAs7xtSig8FBtYgIFT7QoSZjLz6T1kVLOc",
  authDomain: "tarjetabody.firebaseapp.com",
  projectId: "tarjetabody",
  storageBucket: "tarjetabody.appspot.com",
  messagingSenderId: "492167418760",
  appId: "1:492167418760:web:9ac557aeae630c5709063d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
