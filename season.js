<script type="module">
  import { auth, db } from "./firebase.js";
  import { addCoins, ensureCoins } from "./coins.js";
  import {
    doc, getDoc, setDoc, updateDoc, collection, addDoc,
    serverTimestamp, increment
  } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

  // ===== get current season =====
  export async function getCurrentSeason(){
    const snap = await getDoc(doc(db,"seasonCurrent","main"));
    if(!snap.exists()){
      // fallback tạo mùa hiện tại (MVP)
      const now=new Date();
      const seasonId = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
      const start=new Date(now.getFullYear(), now.getMonth(), 1);
      const end=new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59);

      await setDoc(doc(db,"seasonCurrent","main"),{
        seasonId,
        name:`Season ${seasonId}`,
        startAt:start,
        endAt:end,
        isActive:true
      });
      return {seasonId, name:`Season ${seasonId}`, startAt:start, endAt:end, isActive:true};
    }
    return snap.data();
  }

  // ===== ensure season milestones exists =====
  export async function ensureMilestones(seasonId){
    const ref=doc(db,"seasonMilestones",seasonId);
    const snap=await getDoc(ref);
    if(snap.exists()) return snap.data();

    const free=[
      {id:"f1", pts:50,  rewardCoins:30,  rewardItem:{type:"badge", name:"Tân thủ mùa", icon:"🌱"}},
      {id:"f2", pts:150, rewardCoins:80,  rewardItem:{type:"decor", name:"Cờ mùa", icon:"🎏"}},
      {id:"f3", pts:300, rewardCoins:150, rewardItem:{type:"fashion", name:"Áo season free", icon:"👕"}},
      {id:"f4", pts:600, rewardCoins:250, rewardItem:{type:"pet", name:"Pet season", icon:"🐣"}},
    ];
    const vip=[
      {id:"v1", pts:50,  rewardCoins:60,  rewardItem:{type:"badge", name:"VIP khởi động", icon:"✨"}},
      {id:"v2", pts:150, rewardCoins:150, rewardItem:{type:"fashion", name:"Outfit VIP mùa", icon:"🧥"}},
      {id:"v3", pts:300, rewardCoins:300, rewardItem:{type:"decor", name:"Thảm VIP", icon:"🪄"}},
      {id:"v4", pts:600, rewardCoins:600, rewardItem:{type:"skin", name:"Skin Đế Vương", icon:"👑"}},
    ];

    await setDoc(ref,{free,vip,createdAt:serverTimestamp()});
    return {free,vip};
  }

  // ===== add season points (gọi ở gameplay) =====
  export async function addSeasonPoints(amount=1){
    const u=auth.currentUser;
    if(!u) return;
    const season=await getCurrentSeason();
    if(!season.isActive) return;

    const meSnap=await getDoc(doc(db,"users",u.uid));
    const me=meSnap.exists()?meSnap.data():{};

    const ref=doc(db,"seasonPoints",season.seasonId,"users",u.uid);
    await setDoc(ref,{
      uid:u.uid,
      name:me.name||u.uid,
      avatar:me.avatar||"default.png",
      vipTier:me.vipTier||0,
      points: increment(amount),
      updatedAt: serverTimestamp()
    },{merge:true});
  }

  // ===== get my season points =====
  export async function getMySeasonPoints(seasonId, uid){
    const snap=await getDoc(doc(db,"seasonPoints",seasonId,"users",uid));
    return snap.exists()? (snap.data().points||0) : 0;
  }

  // ===== claim milestone =====
  export async function claimMilestone(seasonId, lane, milestone){
    const u=auth.currentUser;
    if(!u) return {ok:false,msg:"not logged"};
    await ensureCoins();

    const pts = await getMySeasonPoints(seasonId, u.uid);
    if(pts < milestone.pts) return {ok:false,msg:"not enough points"};

    const passRef=doc(db,"seasonPass",seasonId,"users",u.uid);
    const passSnap=await getDoc(passRef);
    const pass = passSnap.exists()?passSnap.data():{claimedFree:{},claimedVip:{}};

    const claimedLane = lane==="vip" ? pass.claimedVip : pass.claimedFree;
    if(claimedLane[milestone.id]) return {ok:false,msg:"claimed"};

    claimedLane[milestone.id]=true;

    await setDoc(passRef, pass, {merge:true});

    // thưởng xu
    if(milestone.rewardCoins){
      await addCoins(milestone.rewardCoins);
    }

    // thưởng item MVP: lưu vào users.badges / wardrobe / houses tùy type
    await grantItem(u.uid, milestone.rewardItem);

    return {ok:true};
  }

  async function grantItem(uid, item){
    if(!item) return;
    const uRef=doc(db,"users",uid);
    const uSnap=await getDoc(uRef);
    const u=uSnap.exists()?uSnap.data():{};

    if(item.type==="badge"){
      const badges=u.badges||[];
      badges.unshift({id:`season_${Date.now()}`, name:item.name, icon:item.icon});
      await updateDoc(uRef,{badges:badges.slice(0,6)});
    }

    if(item.type==="fashion"){
      // add vào wardrobe.items
      const wRef=doc(db,"wardrobe",uid);
      const wSnap=await getDoc(wRef);
      const w=wSnap.exists()?wSnap.data():{items:[],wearing:{},stylePoints:0};
      w.items=w.items||[];
      w.items.push({
        itemId:`season_${item.name}`,
        name:item.name, icon:item.icon, type:"top", rarity:"rare", pts:10
      });
      await setDoc(wRef,{items:w.items},{merge:true});
    }

    if(item.type==="decor"){
      const hRef=doc(db,"houses",uid);
      const hSnap=await getDoc(hRef);
      const h=hSnap.exists()?hSnap.data():{decor:[]};
      h.decor=h.decor||[];
      h.decor.push({
        itemId:`season_${item.name}`, name:item.name, icon:item.icon,
        x:160,y:180
      });
      await setDoc(hRef,{decor:h.decor},{merge:true});
    }

    if(item.type==="pet"){
      // nâng pet/cho pet mới (MVP cho exp)
      await updateDoc(uRef,{"activePet.exp": increment(50)}).catch(()=>{});
    }

    if(item.type==="skin"){
      // skin MVP = badge VIP đặc biệt
      const badges=u.badges||[];
      badges.unshift({id:`skin_${Date.now()}`, name:item.name, icon:item.icon});
      await updateDoc(uRef,{badges:badges.slice(0,6)});
    }
  }
</script>
    
