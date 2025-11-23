<script type="module">
  import { db } from "./firebase.js";
  import {
    collection, addDoc, serverTimestamp, query, where, getDocs
  } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

  // Tạo notification cho 1 người
  export async function pushNoti(toUid, payload){
    if(!toUid) return;
    const ref = collection(db,"notifications",toUid,"items");
    await addDoc(ref,{
      type: payload.type || "system",
      title: payload.title || "Thông báo",
      body: payload.body || "",
      icon: payload.icon || "🔔",
      fromUid: payload.fromUid || null,
      fromName: payload.fromName || null,
      fromAvatar: payload.fromAvatar || null,
      link: payload.link || null,
      isRead: false,
      createdAt: serverTimestamp()
    });
  }

  // Tạo notification cho nhiều người (ví dụ bang)
  export async function pushNotiMany(uids=[], payload){
    for(const u of uids){
      await pushNoti(u, payload);
    }
  }

  // Đếm chưa đọc (để badge)
  export async function countUnread(uid){
    const q = query(
      collection(db,"notifications",uid,"items"),
      where("isRead","==",false)
    );
    const snap = await getDocs(q);
    return snap.size;
  }
</script>
