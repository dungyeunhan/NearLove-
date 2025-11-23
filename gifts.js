<script type="module">
  import { auth, db } from "./firebase.js";
  import { ensureCoins, spendCoins } from "./coins.js";
  import { pushNoti } from "./noti.js";
  import { incStat } from "./achievements.js";
  import { addSeasonPoints } from "./season.js";
  import {
    doc, getDoc, setDoc, updateDoc, addDoc, collection,
    serverTimestamp
  } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

  // ===== Gift catalog MVP =====
  export const GIFT_CATALOG = [
    { giftId:"rose", name:"Hoa hồng", icon:"🌹", price:10, vipOnly:0 },
    { giftId:"choco", name:"Socola", icon:"🍫", price:25, vipOnly:0 },
    { giftId:"bear", name:"Gấu bông", icon:"🧸", price:60, vipOnly:0 },
    { giftId:"ring", name:"Nhẫn dễ thương", icon:"💍", price:120, vipOnly:1 },
    { giftId:"crown", name:"Vương miện", icon:"👑", price:300, vipOnly:3 },
    { giftId:"yacht", name:"Du thuyền ảo", icon:"🛥️", price:900, vipOnly:5 },
  ];

  async function getInventory(uid){
    const snap=await getDoc(doc(db,"giftInventory",uid));
    if(snap.exists()) return snap.data();
    const init={items:[]};
    await setDoc(doc(db,"giftInventory",uid),init);
    return init;
  }

  // ===== Buy gift to inventory =====
  export async function buyGift(giftId, qty=1){
    const u=auth.currentUser;
    if(!u) return {ok:false,msg:"not logged"};
    await ensureCoins();

    const gift=GIFT_CATALOG.find(g=>g.giftId===giftId);
    if(!gift) return {ok:false,msg:"not found"};

    // check vipOnly
    const meSnap=await getDoc(doc(db,"users",u.uid));
    const me=meSnap.data()||{};
    if((me.vipTier||0)<(gift.vipOnly||0)){
      return {ok:false,msg:"vip required"};
    }

    const cost=gift.price*qty;
    const pay=await spendCoins(cost);
    if(!pay.ok) return {ok:false,msg:"not enough coins"};

    const inv=await getInventory(u.uid);
    inv.items=inv.items||[];

    const ex=inv.items.find(x=>x.giftId===giftId);
    if(ex) ex.qty+=qty;
    else inv.items.push({...gift, qty});

    await setDoc(doc(db,"giftInventory",u.uid),inv,{merge:true});

    // stats/season
    await incStat("coinsEarnedTotal",0); // safe trigger
    await addSeasonPoints(1);

    return {ok:true};
  }

  // ===== Send gift in chat =====
  export async function sendGift(toUid, chatId, giftId, qty=1){
    const u=auth.currentUser;
    if(!u) return {ok:false,msg:"not logged"};

    const inv=await getInventory(u.uid);
    const slot=inv.items.find(x=>x.giftId===giftId);
    if(!slot || slot.qty<qty) return {ok:false,msg:"not enough gift"};

    // giảm inventory
    slot.qty-=qty;
    inv.items = inv.items.filter(x=>x.qty>0);
    await setDoc(doc(db,"giftInventory",u.uid),inv,{merge:true});

    // lấy me
    const meSnap=await getDoc(doc(db,"users",u.uid));
    const me=meSnap.data()||{};

    const gift={giftId:slot.giftId,name:slot.name,icon:slot.icon,price:slot.price,qty};

    // add message type gift
    await addDoc(collection(db,"chats",chatId,"messages"),{
      type:"gift",
      gift,
      fromUid:u.uid,
      fromName:me.name||u.uid,
      fromAvatar:me.avatar||"default.png",
      fromVipColor:me.vipColor||"#999",
      fromVipName:me.vipName||"",
      time:serverTimestamp()
    });

    // log sent
    await addDoc(collection(db,"giftLogs",u.uid,"sent"),{
      toUid,
      ...gift,
      time:serverTimestamp()
    });

    // noti receiver
    await pushNoti(toUid,{
      type:"gift",
      icon:gift.icon,
      title:`Bạn nhận quà từ ${me.name||"ai đó"}!`,
      body:`${gift.icon} ${gift.name} x${qty}`,
      fromUid:u.uid,
      fromName:me.name||u.uid,
      fromAvatar:me.avatar||"default.png",
      link:`chat.html?u=${u.uid}`
    });

    // stats/season/achv
    await incStat("weddingGiftsSent",1);   // dùng chung stat “gifts”
    await addSeasonPoints(2);

    return {ok:true};
  }

  export async function loadMyInventory(uid){
    return await getInventory(uid);
  }
</script>
