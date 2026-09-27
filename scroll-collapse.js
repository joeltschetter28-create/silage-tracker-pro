/* Loads page only. Measures how far the header can slide up before the slim bar
   pins (the "set point"), publishes it as CSS vars, and toggles the compact
   field/storage selectors once the page is scrolled past it. */
(function(){
  const root=document.documentElement,body=document.body;
  const header=document.querySelector('header');
  const safe=document.querySelector('.head-safe');
  const bar=document.getElementById('headBar');
  if(!header||!safe||!bar)return;
  const snapOK=!!(window.CSS&&CSS.supports&&CSS.supports('scroll-snap-stop','always')&&CSS.supports('scroll-snap-type','y proximity'));
  let setPoint=0,collapsedH=0,compact=false;

  function measure(){
    const h=header.getBoundingClientRect(),b=bar.getBoundingClientRect(),s=safe.getBoundingClientRect();
    const collapse=Math.max(0,Math.round(b.top-s.bottom));
    const ch=Math.max(0,Math.round(h.height-collapse));
    if(collapse!==setPoint){setPoint=collapse;root.style.setProperty('--head-collapse',collapse+'px')}
    if(ch!==collapsedH){collapsedH=ch;root.style.setProperty('--ctx-top',ch+'px')}
  }

  function apply(){
    const loads=!!document.querySelector('#main.panel.active');
    body.classList.toggle('loads-active',loads);
    root.classList.toggle('loads-snap',loads&&snapOK&&setPoint>0);
    const y=window.scrollY||root.scrollTop||0;
    // small hysteresis so the compact state cannot flicker on the threshold
    if(loads&&setPoint>0)compact=compact?y>setPoint-8:y>=setPoint-1;
    else compact=false;
    root.classList.toggle('ctx-compact',compact);
  }

  function sync(){measure();apply()}
  window.__loadsScroll={sync:sync};

  let ticking=false;
  addEventListener('scroll',function(){
    if(ticking)return;ticking=true;
    requestAnimationFrame(function(){ticking=false;apply()});
  },{passive:true});
  addEventListener('resize',sync);
  addEventListener('orientationchange',function(){setTimeout(sync,250)});
  if(window.ResizeObserver)new ResizeObserver(sync).observe(header);
  sync();
  // Safe-area insets and image decode can settle a beat after the first paint, especially when
  // launched from the home screen rather than a fresh browser tab -- one more measurement shortly
  // after load catches that before the user's first scroll, rather than correcting mid-scroll.
  setTimeout(sync,300);
})();
