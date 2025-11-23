<script type="module">
  import { auth, db } from "./firebase.js";
  import { addCoins, ensureCoins } from "./coins.js";
  import {
    doc, getDoc, setDoc, updateDoc, serverTimestamp, increment
  } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

  // ====== Danh sách achievement NearLove MVP ======
  export const ACHV_LIST = [
    // coins
    { id:"coins_1k", name:"Tay chơi mới", icon:"💰", cond: s=> (s.coinsEarnedTotal||0)>=1000, reward:50 },
    { id:"coins_10k", name:"Đại gia chớm nở", icon:"🤑", cond: s=> (s.coinsEarnedTotal||0)>=10000, reward:300 },

    // match
    { id:"match_1", name:"Match đầu đời", icon:"💞", cond: s=> (s.matchesTotal||0)>=1, reward:30 },
    { id:"match_20", name:"Sát thủ thả tim", icon:"🔥", cond: s=> (s.matchesTotal||0)>=20, reward:200 },

    // chat
    { id:"chat_20", name:"Nói chuyện có duyên", icon:"💬", cond:s=>(s.chatsSentTotal||0)>=20, reward:40 },
    { id:"chat_200", name:"Chém gió bất bại", icon:"🗣️", cond:s=>(s.chatsSentTotal||0)>=200, reward:250 },

    // farm
    { id:"farm_5", name:"Nông dân đáng yêu", icon:"🌾", cond:s=>(s.farmHarvestTotal||0)>=5, reward:60 },
    { id:"farm_50", name:"Chủ trang trại", icon:"🚜", cond:s=>(s.farmHarvestTotal||0)>=50, reward:400 },

    // pet race
    { id:"pet_win_1", name:"Pet thắng đầu", icon:"🐾", cond:s=>(s.petRacesWin||0)>=1, reward:40 },
    { id:"pet_win_20", name:"Đua thú huyền thoại", icon:"🏁", cond:s=>(s.petRacesWin||0)>=20, reward:250 },

    // guild
    { id:"guild_m_5", name:"Người của bang", icon:"🏰", cond:s=>(s.guildMissionsDone||0)>=5, reward:80 },
    { id:"guild_m_50", name:"Trụ cột bang hội", icon:"⚔️", cond:s=>(s.guildMissionsDone||0)>=50, reward:500 },

    // wedding
    { id:"gift_1", name:"Khách mời đầu tiên", icon:"🎁", cond:s=>(s.weddingGiftsSent||0)>=1, reward:30 },
    { id:"gift_30", name:"Nhà tài trợ cưới", icon:"💎", cond:s=>(s.weddingGiftsSent||0)>=30, reward:300 },

    // travel
    { id:"trip_1", name:"Lữ khách mới", icon:"✈️", cond:s=>(s.tripsTotal||0)>=1, reward:25 },
    { id:"trip_20", name:"Phượt thủ", icon:"🧳", cond:s=>(s.tripsTotal||0)>=20, reward:200 },

    // gacha
    { id:"gacha_1", name:"Quay lần đầu", icon:"🎲", cond:s=>(s.gachaRolls||0)>=1, reward:20 },
    { id:"gacha_30", name:"Nghiện gacha", icon:"🎁", cond:s=>(s.gachaRolls||0)>=30, reward:250 },
  ];

  // ====== Tăng stats ======
  export async function incStat(key, amount=1){
    const u=auth.currentUser;
    if(!u) return;
    await ensureCoins();

    const ref=doc(db,"achievements",u.uid);
    await setDoc(ref,{
      stats: { [key]: increment(amount) },
      updatedAt: serverTimestamp()
    },{merge:true});

    // sau khi tăng → check unlock
    await checkAchievements();
  }

  // ====== Auto check & unlock ======
  export async function checkAchievements(){
    const u=auth.currentUser;
    if(!u) return;

    const ref=doc(db,"achievements",u.uid);
    const snap=await getDoc(ref);

    let data = snap.exists()?snap.data():{unlocked:{},stats:{}};
    data.unlocked = data.unlocked||{};
    data.stats = data.stats||{};

    const newUnlocked=[];
    for(const a of ACHV_LIST){
      if(data.unlocked[a.id]) continue;
      if(a.cond(data.stats)){
        data.unlocked[a.id]={
          id:a.id,name:a.name,icon:a.icon,reward:a.reward,
          unlockedAt: serverTimestamp()
        };
        newUnlocked.push(a);
      }
    }

    if(newUnlocked.length>0){
      // lưu achievements
      await setDoc(ref,{unlocked:data.unlocked},{merge:true});

      // thưởng xu
      let totalReward=newUnlocked.reduce((s,x)=>s+x.reward,0);
      await addCoins(totalReward);

      // add badge vào users.badges (top 6 gần nhất)
      const uRef=doc(db,"users",u.uid);
      const uSnap=await getDoc(uRef);
      const userData=uSnap.exists()?uSnap.data():{};
      let badges=userData.badges||[];

      newUnlocked.forEach(a=>{
        badges.unshift({id:a.id,name:a.name,icon:a.icon});
      });
      badges=badges.slice(0,6);

      await updateDoc(uRef,{badges});

      alert(`🏅 Bạn vừa mở khóa ${newUnlocked.length} thành tựu! +${totalReward} xu`);
    }
  }
</script>
