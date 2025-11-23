<script type="module">
  import { auth, db } from "./firebase.js";
  import { spendCoins, ensureCoins } from "./coins.js";
  import {
    doc, getDoc, updateDoc, serverTimestamp
  } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

  export const VIP_TIERS = {
    0:{name:"Free", price:0, color:"#999"},
    1:{name:"Nông Dân", price:99000, color:"#8BC34A"},
    2:{name:"Công Nhân", price:199000, color:"#03A9F4"},
    3:{name:"Doanh Nhân", price:399000, color:"#FF9800"},
    4:{name:"Thương Gia", price:599000, color:"#9C27B0"},
    5:{name:"Hoàng Gia", price:999000, color:"#E91E63"},
    6:{name:"Đế Vương", price:1999000, color:"#FFD700"},
  };

  export async function getMyVip(){
    const u=auth.currentUser;
    if(!u) return VIP_TIERS[0];
    const snap=await getDoc(doc(db,"users",u.uid));
    if(!snap.exists()) return VIP_TIERS[0];

    const data=snap.data();
    const tier = data.vipTier||0;
    const exp  = data.vipExpireAt?.toDate ? data.vipExpireAt.toDate().getTime() : 0;

    // hết hạn => set free
    if(tier>0 && exp && Date.now()>exp){
      await updateDoc(doc(db,"users",u.uid),{
        vipTier:0, vipName:"Free", vipColor:VIP_TIERS[0].color, vipExpireAt:null
      });
      return VIP_TIERS[0];
    }
    return VIP_TIERS[tier]||VIP_TIERS[0];
  }

  export async function buyVip(tier){
    const u=auth.currentUser;
    if(!u) throw new Error("not logged");
    await ensureCoins();

    const t=VIP_TIERS[tier];
    if(!t || tier<=0) return {ok:false,msg:"tier invalid"};

    // trừ xu
    const res=await spendCoins(t.price);
    if(!res.ok) return {ok:false,msg:"not enough coins"};

    const ref=doc(db,"users",u.uid);
    const snap=await getDoc(ref);
    const data=snap.data()||{};
    const curTier=data.vipTier||0;
    const curExp=data.vipExpireAt?.toDate?data.vipExpireAt.toDate().getTime():0;

    const now=Date.now();
    const add30 = 30*24*60*60*1000;

    // Nếu đang VIP và mua tiếp => cộng dồn ngày
    let newExp = (curExp>now?curExp:now) + add30;

    // Nếu nâng tier cao hơn => lên tier đó
    const newTier = tier>=curTier ? tier : curTier;

    await updateDoc(ref,{
      vipTier:newTier,
      vipName:VIP_TIERS[newTier].name,
      vipColor:VIP_TIERS[newTier].color,
      vipExpireAt:new Date(newExp),
      updatedAt: serverTimestamp()
    });

    return {ok:true,newTier,newExp};
  }

  export function requireVip(minTier, userData){
    const tier=userData?.vipTier||0;
    const exp=userData?.vipExpireAt?.toDate?userData.vipExpireAt.toDate().getTime():0;
    if(tier<minTier) return false;
    if(exp && Date.now()>exp) return false;
    return true;
  }
</script>
