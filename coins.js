<script type="module">
  import { auth, db } from "./firebase.js";
  import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
  import {
    doc, getDoc, setDoc, updateDoc, serverTimestamp
  } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

  // ====== TIỆN ÍCH XU DÙNG CHUNG ======

  // Lấy user hiện tại + tạo coins mặc định nếu chưa có
  export async function ensureCoins() {
    const user = auth.currentUser;
    if (!user) return null;

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        coins: 1200,
        vipTier: 0,
        createdAt: serverTimestamp()
      });
      return 1200;
    }

    const d = snap.data();
    if (d.coins == null) {
      await updateDoc(ref, { coins: 1200 });
      return 1200;
    }
    return d.coins;
  }

  // Đọc coins hiện tại
  export async function getCoins() {
    const user = auth.currentUser;
    if (!user) return 0;
    const snap = await getDoc(doc(db, "users", user.uid));
    return snap.exists() ? (snap.data().coins || 0) : 0;
  }

  // Cộng coins
  export async function addCoins(amount) {
    const user = auth.currentUser;
    if (!user) return 0;

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const cur = snap.exists() ? (snap.data().coins || 0) : 0;

    const next = cur + amount;
    await updateDoc(ref, { coins: next });
    return next;
  }

  // Trừ coins
  export async function spendCoins(amount) {
    const user = auth.currentUser;
    if (!user) return { ok:false, coins:0 };

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const cur = snap.exists() ? (snap.data().coins || 0) : 0;

    if (cur < amount) return { ok:false, coins:cur };

    const next = cur - amount;
    await updateDoc(ref, { coins: next });
    return { ok:true, coins:next };
  }

  // ====== ĐIỂM DANH HẰNG NGÀY ======
  export async function dailyCheckin() {
    const user = auth.currentUser;
    if (!user) return { ok:false, msg:"Chưa đăng nhập." };

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const d = snap.data() || {};

    const last = d.lastCheckin?.toDate ? d.lastCheckin.toDate() : null;
    const now = new Date();

    // So sánh theo ngày (YYYY-MM-DD)
    const lastDay = last ? last.toISOString().slice(0,10) : null;
    const today = now.toISOString().slice(0,10);

    if (lastDay === today) {
      return { ok:false, msg:"Hôm nay bạn đã điểm danh rồi 😄" };
    }

    const reward = 200; // thưởng mỗi ngày
    const newCoins = (d.coins || 0) + reward;

    await updateDoc(ref, {
      coins: newCoins,
      lastCheckin: serverTimestamp()
    });

    return { ok:true, reward, coins:newCoins };
  }
</script>
