<script type="module">
  import { auth, db } from "./firebase.js";
  import { VIP_TIERS } from "./vip.js";
  import {
    doc, getDoc, setDoc, updateDoc, collection, addDoc,
    query, where, orderBy, limit, getDocs, serverTimestamp, increment
  } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

  // ====== CONFIG ADMIN UID LIST ======
  export const ADMIN_UIDS = [
    "PUT_YOUR_UID_HERE"
  ];

  export function isAdmin(uid){
    return ADMIN_UIDS.includes(uid);
  }

  export async function requireAdmin(){
    const u = auth.currentUser;
    if(!u) return false;
    if(!isAdmin(u.uid)) return false;
    return true;
  }

  // ====== LOG ADMIN ACTION ======
  export async function logAdmin(action, targetUid=null, payload={}){
    const u=auth.currentUser;
    if(!u) return;
    const meSnap = await getDoc(doc(db,"users",u.uid));
    const me = meSnap.exists()?meSnap.data():{};
    await addDoc(collection(db,"adminLogs"),{
      adminUid: u.uid,
      adminName: me.name||u.uid,
      action,
      targetUid,
      payload,
      time: serverTimestamp()
    });
  }

  // ====== BAN / UNBAN ======
  export async function banUser(uid, reason=""){
    const u=auth.currentUser;
    if(!u) return;

    const meSnap = await getDoc(doc(db,"users",u.uid));
    const me = meSnap.exists()?meSnap.data():{};

    await setDoc(doc(db,"bans",uid),{
      isBanned:true,
      reason,
      adminUid:u.uid,
      adminName:me.name||u.uid,
      bannedAt: serverTimestamp(),
      expiresAt: null
    },{merge:true});

    await updateDoc(doc(db,"users",uid),{
      isBanned:true,
      bannedReason:reason
    }).catch(()=>{});

    await logAdmin("ban", uid, {reason});
  }

  export async function unbanUser(uid){
    await setDoc(doc(db,"bans",uid),{
      isBanned:false,
      unbannedAt: serverTimestamp()
    },{merge:true});

    await updateDoc(doc(db,"users",uid),{
      isBanned:false,
      bannedReason:""
    }).catch(()=>{});

    await logAdmin("unban", uid, {});
  }

  // ====== SET VIP BY ADMIN ======
  export async function adminSetVip(uid, tier, days=30){
    const t=VIP_TIERS[tier]||VIP_TIERS[0];
    const now=Date.now();
    const newExp = now + days*24*60*60*1000;

    await updateDoc(doc(db,"users",uid),{
      vipTier:tier,
      vipName:t.name,
      vipColor:t.color,
      vipExpireAt:new Date(newExp),
      updatedAt: serverTimestamp()
    });

    await logAdmin("setVip", uid, {tier, days});
  }

  // ====== REVIEW REPORT ======
  export async function reviewReport(reportId, status, adminNote=""){
    await updateDoc(doc(db,"reports",reportId),{
      status,
      adminNote,
      reviewedAt: serverTimestamp()
    });
    await logAdmin("reviewReport", null, {reportId, status, adminNote});
  }

  // ====== RESET WAR WEEK (TOP5 thưởng xong) ======
  export async function resetWarWeek(){
    const q = query(collection(db,"guilds"), orderBy("warPoints","desc"));
    const snap = await getDocs(q);
    const guilds=[];
    snap.forEach(d=>guilds.push({id:d.id,...d.data()}));

    // reset hết warPoints (MVP)
    for(const g of guilds){
      await updateDoc(doc(db,"guilds",g.id),{
        warPoints:0
      }).catch(()=>{});
    }

    await logAdmin("resetWar", null, {count:guilds.length});
  }

  // ====== SEARCH USER QUICK ======
  export async function searchUsersByName(keyword){
    const q = query(collection(db,"users"), orderBy("name"), limit(50));
    const snap = await getDocs(q);
    const list=[];
    snap.forEach(d=>{
      const u=d.data();
      if((u.name||"").toLowerCase().includes(keyword.toLowerCase())){
        list.push({uid:d.id,...u});
      }
    });
    return list;
  }
</script>
