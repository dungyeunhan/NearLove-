<script type="module">
  import { auth, db } from "./firebase.js";
  import { ensureCoins, addCoins } from "./coins.js";
  import { pushNoti } from "./noti.js";
  import { addSeasonPoints } from "./season.js";
  import {
    doc, getDoc, setDoc, updateDoc, collection, addDoc,
    serverTimestamp, increment
  } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

  // ===== Load event =====
  export async function getEvent(eventId){
    const snap = await getDoc(doc(db,"events",eventId));
    return snap.exists()?snap.data():null;
  }

  // ===== Ensure progress =====
  export async function ensureEventProgress(eventId, uid){
    const ref=doc(db,"eventProgress",eventId,"users",uid);
    const snap=await getDoc(ref);
    if(snap.exists()) return snap.data();
    const init={stats:{eventChat:0,eventGift:0,eventGameWin:0},claimed:{}};
    await setDoc(ref, init);
    return init;
  }

  // ===== Increase event stat =====
  export async function incEventStat(eventId, key, amount=1){
    const u=auth.currentUser;
    if(!u) return;

    const ref=doc(db,"eventProgress",eventId,"users",u.uid);
    await setDoc(ref,{
      stats:{ [key]: increment(amount) },
      updatedAt: serverTimestamp()
    },{merge:true});

    await addSeasonPoints(1); // event cũng cộng season nhẹ
  }

  // ===== Claim quest =====
  export async function claimQuest(eventId, quest){
    const u=auth.currentUser;
    if(!u) return {ok:false,msg:"not logged"};
    await ensureCoins();

    const p=await ensureEventProgress(eventId,u.uid);
    const claimed=p.claimed||{};
    if(claimed[quest.id]) return {ok:false,msg:"claimed"};

    const cur = p.stats?.[quest.statKey] || 0;
    if(cur < quest.need) return {ok:false,msg:"not enough"};

    claimed[quest.id]=true;
    await setDoc(doc(db,"eventProgress",eventId,"users",u.uid),{claimed},{merge:true});

    if(quest.rewardCoins){
      await addCoins(quest.rewardCoins);
    }

    await pushNoti(u.uid,{
      type:"system", icon:"🎉",
      title:"Nhận thưởng event!",
      body:`${quest.title} +${quest.rewardCoins||0} xu`,
      link:`event_room.html?e=${eventId}`
    });

    return {ok:true};
  }

  // ===== Create event (admin MVP) =====
  export async function adminCreateEvent(event){
    await setDoc(doc(db,"events",event.id),{
      ...event,
      createdAt: serverTimestamp(),
      isActive:true
    });
  }
</script>
