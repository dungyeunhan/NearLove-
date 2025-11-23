<script type="module">
  import { db } from "./firebase.js";
  import {
    collection, addDoc, serverTimestamp, doc, updateDoc
  } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

  // Gửi thông báo cho 1 user
  export async function pushNoti(toUid, payload){
    const ref = collection(db, "notifications", toUid, "items");
    await addDoc(ref, {
      ...payload,
      read: false,
      createdAt: serverTimestamp()
    });
  }

  // Đánh dấu đã đọc
  export async function markRead(uid, notiId){
    await updateDoc(doc(db,"notifications",uid,"items",notiId), { read:true });
  }
</script>
