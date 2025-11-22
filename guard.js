<script type="module">
  import { auth } from "./firebase.js";
  import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

  // Gọi hàm này ở mọi trang cần login
  export function requireAuth(){
    onAuthStateChanged(auth, (user)=>{
      if(!user){
        alert("Bạn chưa đăng nhập!");
        window.location.href="login.html";
      }
    });
  }
</script>
