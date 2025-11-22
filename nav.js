<script type="module">
  // NAVBAR DÙNG CHUNG CHO NEARLOVE
  export function renderNav(active="home"){
    const nav = document.createElement("nav");
    nav.innerHTML = `
      <style>
        .nl-nav{
          position:fixed;left:0;right:0;bottom:0;z-index:9999;
          background:#121625;border-top:1px solid rgba(255,255,255,0.08);
          display:flex;justify-content:space-around;align-items:center;
          padding:8px 4px;font-family:Arial;
        }
        .nl-tab{
          flex:1;text-align:center;color:#c9cce1;font-size:11px;
          display:flex;flex-direction:column;gap:4px;align-items:center;
          padding:6px 0;border-radius:10px;text-decoration:none;
        }
        .nl-tab .i{font-size:18px;line-height:1;}
        .nl-tab.active{
          color:white;background:linear-gradient(135deg,#ff3d7f,#ff8ac9);
          font-weight:bold;
        }
        body{ padding-bottom:74px !important; } /* chừa chỗ menu */
      </style>

      <div class="nl-nav">
        <a class="nl-tab ${active==='home'?'active':''}" href="index.html">
          <div class="i">🏠</div><div>Home</div>
        </a>
        <a class="nl-tab ${active==='explore'?'active':''}" href="explore.html">
          <div class="i">💞</div><div>Explore</div>
        </a>
        <a class="nl-tab ${active==='match'?'active':''}" href="match.html">
          <div class="i">💗</div><div>Match</div>
        </a>
        <a class="nl-tab ${active==='vip'?'active':''}" href="vip.html">
          <div class="i">👑</div><div>VIP</div>
        </a>
        <a class="nl-tab ${active==='shop'?'active':''}" href="shop.html">
          <div class="i">🛒</div><div>Shop</div>
        </a>
        <a class="nl-tab ${active==='pet'?'active':''}" href="pet.html">
          <div class="i">🐾</div><div>Pet</div>
        </a>
        <a class="nl-tab ${active==='house'?'active':''}" href="house.html">
          <div class="i">🏠✨</div><div>House</div>
        </a>
        <a class="nl-tab ${active==='event'?'active':''}" href="event.html">
          <div class="i">🏆</div><div>Event</div>
        </a>
        <a class="nl-tab ${active==='ach'?'active':''}" href="achieve.html">
          <div class="i">🏅</div><div>Ach</div>
        </a>
        <a class="nl-tab ${active==='settings'?'active':''}" href="settings.html">
          <div class="i">⚙️</div><div>Setting</div>
        </a>
      </div>
    `;
    document.body.appendChild(nav);
  }
</script>
