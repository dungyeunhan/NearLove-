<script type="module">
  import { db } from "./firebase.js";
  import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

  // ===== Load filter của user =====
  export async function loadMyFilter(uid){
    const fSnap = await getDoc(doc(db,"filters",uid));
    if(fSnap.exists()) return fSnap.data();
    return {
      minAge:18,maxAge:40,lookingFor:"all",
      distanceKm:50,requiredInterests:[],vipOnly:false
    };
  }

  // ===== Tính điểm AI =====
  export function calcMatchScore(me, target, filter){
    let score = 0;

    // 1) Giới tính theo filter / lookingFor
    const lf = filter?.lookingFor || me.lookingFor || "all";
    if(lf!=="all" && target.gender && target.gender!==lf) return -999;

    // 2) Tuổi
    const age = target.age || 0;
    if(age < (filter.minAge||18) || age > (filter.maxAge||60)) return -999;
    score += 10;

    // 3) Interests trùng
    const a = new Set(me.interests||[]);
    const b = new Set(target.interests||[]);
    let common = 0;
    b.forEach(x=>{ if(a.has(x)) common++; });
    score += common * 8; // mỗi sở thích trùng +8

    // requiredInterests bắt buộc
    const req = filter.requiredInterests||[];
    if(req.length>0){
      const ok = req.every(x=>b.has(x));
      if(!ok) return -999;
      score += req.length*5;
    }

    // 4) Style points (gu ăn mặc hợp)
    if(me.stylePoints && target.stylePoints){
      const diff = Math.abs(me.stylePoints - target.stylePoints);
      const styleBonus = Math.max(0, 10 - diff/5);
      score += styleBonus;
    }

    // 5) Activity gần đây
    const last = target.lastActiveAt?.toDate ? target.lastActiveAt.toDate().getTime() : 0;
    if(last){
      const hours = (Date.now()-last)/3600000;
      const activeBonus = Math.max(0, 12 - hours/6); // online gần đây thì + điểm
      score += activeBonus;
    }

    // 6) Distance (nếu có lat/lng)
    if(me.lat && me.lng && target.lat && target.lng){
      const km = haversineKm(me.lat,me.lng,target.lat,target.lng);
      if(km > (filter.distanceKm||9999)) return -999;
      const distBonus = Math.max(0, 12 - km/5);
      score += distBonus;
    }

    // 7) VIP boost (ưu tiên VIP cao)
    const vip = target.vipTier || 0;
    score += vip * 2.5;   // VIP tier 6 +15 điểm

    // 8) Penalty nếu bị block / đã match / đã skip => xử lý ở explore
    return score;
  }

  function haversineKm(lat1, lon1, lat2, lon2){
    const R=6371;
    const dLat=(lat2-lat1)*Math.PI/180;
    const dLon=(lon2-lon1)*Math.PI/180;
    const a =
      Math.sin(dLat/2)**2 +
      Math.cos(lat1*Math.PI/180) *
      Math.cos(lat2*Math.PI/180) *
      Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(a));
  }
</script>
