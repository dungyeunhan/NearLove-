<script type="module">
  import { auth, db } from "./firebase.js";
  import {
    doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp
  } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

  // Lấy danh sách block của mình
  export async function getMyBlocks(){
    const u = auth.currentUser;
    if(!u) return [];
    const snap = await getDoc(doc(db,"blocks",u.uid));
    return snap.exists() ? (snap.data().blocked||[]) : [];
  }

  // Block 1 người
  export async function blockUser(targetUid){
    const u = auth.currentUser;
    if(!u || !targetUid) return;

    const ref = doc(db,"blocks",u.uid);
    await setDoc(ref,{
      blocked: arrayUnion(targetUid),
      updatedAt: serverTimestamp()
    },{merge:true});
  }

</script>
