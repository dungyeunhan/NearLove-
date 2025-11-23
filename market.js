<script type="module">
  import { auth, db } from "./firebase.js";
  import { ensureCoins, spendCoins, addCoins } from "./coins.js";
  import {
    doc, getDoc, setDoc, updateDoc, addDoc, collection,
    serverTimestamp, increment
  } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

  // ====== LẤY WARDROBE ======
  export async function getWardrobe(uid){
    const snap=await getDoc(doc(db,"wardrobe",uid));
    return snap.exists()?snap.data():{items:[],wearing:{}};
  }

  // ====== ĐĂNG BÁN 1 ITEM (WARDROBE) ======
  export async function createListing(item, price){
    const u=auth.currentUser;
    if(!u) return {ok:false,msg:"not logged"};
    await ensureCoins();

    // check owner item
    const w=await getWardrobe(u.uid);
    if(!w.items.some(x=>x.itemId===item.itemId)){
      return {ok:false,msg:"not owner"};
    }

    const meSnap=await getDoc(doc(db,"users",u.uid));
    const me=meSnap.data()||{};

    // remove item khỏi wardrobe trước (anti dup)
    w.items = w.items.filter(x=>x.itemId!==item.itemId);
    // nếu item đang mặc thì tháo ra
    Object.keys(w.wearing||{}).forEach(k=>{
      if(w.wearing[k]===item.itemId) w.wearing[k]=null;
    });
    await setDoc(doc(db,"wardrobe",u.uid),w,{merge:true});

    // tạo listing
    const ref=collection(db,"marketListings");
    const listing = {
      sellerUid:u.uid,
      sellerName:me.name||u.uid,
      sellerAvatar:me.avatar||"default.png",
      item:{
        itemId:item.itemId, name:item.name, icon:item.icon,
        rarity:item.rarity||"common", type:item.type||"top"
      },
      price:Number(price||0),
      status:"active",
      buyerUid:null,
      createdAt: serverTimestamp()
    };
    const docRef=await addDoc(ref, listing);

    return {ok:true,id:docRef.id};
  }

  // ====== HỦY ĐĂNG BÁN (trả lại item) ======
  export async function cancelListing(listingId){
    const u=auth.currentUser;
    if(!u) return {ok:false,msg:"not logged"};

    const lRef=doc(db,"marketListings",listingId);
    const lSnap=await getDoc(lRef);
    if(!lSnap.exists()) return {ok:false,msg:"not found"};
    const l=lSnap.data();

    if(l.sellerUid!==u.uid) return {ok:false,msg:"not seller"};
    if(l.status!=="active") return {ok:false,msg:"not active"};

    // trả item về wardrobe
    const w=await getWardrobe(u.uid);
    w.items.push(l.item);
    await setDoc(doc(db,"wardrobe",u.uid),w,{merge:true});

    await updateDoc(lRef,{
      status:"cancelled",
      soldAt: serverTimestamp()
    });

    return {ok:true};
  }

  // ====== MUA LISTING ======
  export async function buyListing(listingId){
    const u=auth.currentUser;
    if(!u) return {ok:false,msg:"not logged"};
    await ensureCoins();

    const lRef=doc(db,"marketListings",listingId);
    const lSnap=await getDoc(lRef);
    if(!lSnap.exists()) return {ok:false,msg:"not found"};
    const l=lSnap.data();

    if(l.status!=="active") return {ok:false,msg:"sold"};
    if(l.sellerUid===u.uid) return {ok:false,msg:"self buy"};

    // trừ xu người mua
    const pay = await spendCoins(l.price);
    if(!pay.ok) return {ok:false,msg:"not enough coins"};

    // cộng xu người bán
    await addCoinsToUser(l.sellerUid, l.price);

    // add item cho buyer
    const w=await getWardrobe(u.uid);
    w.items.push(l.item);
    await setDoc(doc(db,"wardrobe",u.uid),w,{merge:true});

    // update listing
    const meSnap=await getDoc(doc(db,"users",u.uid));
    const me=meSnap.data()||{};
    await updateDoc(lRef,{
      status:"sold",
      buyerUid:u.uid,
      buyerName:me.name||u.uid,
      soldAt: serverTimestamp()
    });

    // log
    await addDoc(collection(db,"tradeLogs"),{
      type:"market",
      listingId,
      sellerUid:l.sellerUid,
      buyerUid:u.uid,
      item:l.item,
      price:l.price,
      time: serverTimestamp()
    });

    return {ok:true};
  }

  async function addCoinsToUser(uid, amount){
    await updateDoc(doc(db,"users",uid),{
      coins: increment(amount)
    });
  }
</script>
