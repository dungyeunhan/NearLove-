<script type="module">
  import { auth, db } from "./firebase.js";
  import { pushNoti } from "./noti.js";
  import { addSeasonPoints } from "./season.js";
  import {
    doc, getDoc, setDoc, updateDoc, addDoc, collection,
    serverTimestamp, increment, arrayUnion, arrayRemove, query, where, getDocs, deleteDoc
  } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

  // ===== CREATE POST =====
  export async function createPost(text, imageUrl=""){
    const u=auth.currentUser;
    if(!u) return {ok:false,msg:"not logged"};

    const meSnap=await getDoc(doc(db,"users",u.uid));
    const me=meSnap.data()||{};

    await addDoc(collection(db,"posts"),{
      uid:u.uid,
      name:me.name||u.uid,
      avatar:me.avatar||"default.png",
      vipTier:me.vipTier||0,
      vipColor:me.vipColor||"#999",
      text:text.trim(),
      imageUrl:imageUrl.trim(),
      likesCount:0,
      commentsCount:0,
      likedBy:[],
      createdAt:serverTimestamp()
    });

    await addSeasonPoints(2);
    return {ok:true};
  }

  // ===== LIKE / UNLIKE =====
  export async function toggleLike(postId){
    const u=auth.currentUser;
    if(!u) return {ok:false,msg:"not logged"};
    const ref=doc(db,"posts",postId);
    const snap=await getDoc(ref);
    if(!snap.exists()) return {ok:false,msg:"not found"};

    const p=snap.data();
    const liked = (p.likedBy||[]).includes(u.uid);

    await updateDoc(ref,{
      likedBy: liked?arrayRemove(u.uid):arrayUnion(u.uid),
      likesCount: increment(liked?-1:1)
    });

    // noti cho chủ post khi người khác like
    if(!liked && p.uid!==u.uid){
      const meSnap=await getDoc(doc(db,"users",u.uid));
      const me=meSnap.data()||{};
      await pushNoti(p.uid,{
        type:"system", icon:"❤️",
        title:"Ai đó đã thích bài của bạn",
        body:`${me.name||"Ai đó"} vừa thả tim bài viết.`,
        fromUid:u.uid, fromName:me.name, fromAvatar:me.avatar,
        link:"feed.html"
      });
    }

    await addSeasonPoints(1);
    return {ok:true, liked:!liked};
  }

  // ===== ADD COMMENT =====
  export async function addComment(postId, text){
    const u=auth.currentUser;
    if(!u) return {ok:false,msg:"not logged"};

    const meSnap=await getDoc(doc(db,"users",u.uid));
    const me=meSnap.data()||{};

    await addDoc(collection(db,"posts",postId,"comments"),{
      uid:u.uid,
      name:me.name||u.uid,
      avatar:me.avatar||"default.png",
      text:text.trim(),
      createdAt:serverTimestamp()
    });

    await updateDoc(doc(db,"posts",postId),{
      commentsCount: increment(1)
    });

    // noti chủ post
    const pSnap=await getDoc(doc(db,"posts",postId));
    const p=pSnap.data()||{};
    if(p.uid && p.uid!==u.uid){
      await pushNoti(p.uid,{
        type:"system", icon:"💬",
        title:"Bình luận mới",
        body:`${me.name||"Ai đó"}: ${text.slice(0,60)}`,
        fromUid:u.uid, fromName:me.name, fromAvatar:me.avatar,
        link:"feed.html"
      });
    }

    await addSeasonPoints(1);
    return {ok:true};
  }

  // ===== CREATE STORY (24h) =====
  export async function createStory(text, imageUrl=""){
    const u=auth.currentUser;
    if(!u) return {ok:false,msg:"not logged"};

    const meSnap=await getDoc(doc(db,"users",u.uid));
    const me=meSnap.data()||{};

    const now=Date.now();
    const expireAt=new Date(now + 24*60*60*1000);

    await addDoc(collection(db,"stories"),{
      uid:u.uid,
      name:me.name||u.uid,
      avatar:me.avatar||"default.png",
      vipTier:me.vipTier||0,
      vipColor:me.vipColor||"#999",
      text:text.trim(),
      imageUrl:imageUrl.trim(),
      createdAt:serverTimestamp(),
      expireAt
    });

    await addSeasonPoints(1);
    return {ok:true};
  }

  // ===== CLEANUP EXPIRED STORIES (client MVP) =====
  export async function cleanupStories(){
    const q=query(collection(db,"stories"), where("expireAt","<=", new Date()));
    const snap=await getDocs(q);
    for(const d of snap.docs){
      await deleteDoc(doc(db,"stories",d.id));
    }
  }
</script>
