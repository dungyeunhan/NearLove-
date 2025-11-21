<script type="module">
  // Import Firebase SDK
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

  // ===========================
  //   FIREBASE CONFIG CỦA BẠN
  // ===========================
  const firebaseConfig = {
    apiKey: "AIzaSyA_KPLBEzlAOwSH-askXXIksTjVSwa_Rlc",
    authDomain: "nearlove-web.firebaseapp.com",
    projectId: "nearlove-web",
    storageBucket: "nearlove-web.firebasestorage.app",
    messagingSenderId: "605125904584",
    appId: "1:605125904584:web:ac1b4a07957a15a73c3dfd",
    measurementId: "G-EWN185L7W2"
  };

  // Khởi động Firebase
  export const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app);
  export const db = getFirestore(app);
</script>
