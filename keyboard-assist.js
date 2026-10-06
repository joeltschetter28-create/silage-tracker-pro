/* Keeps the text box you're typing in above the on-screen keyboard.
   Publishes the keyboard's height as --kb (and the hidden strip above the visible area as --vv-top), so bottom
   sheets can sit on top of the keyboard, then scrolls the focused box into the visible area if it is covered.
   Only reacts to the keyboard opening/resizing, never to your own scrolling, so it won't fight you while typing. */
(function(){
  const root=document.documentElement,vv=window.visualViewport;
  const TEXT=/^(text|number|search|email|tel|url|password|date|datetime-local|time|month|week)$/i;
  const isTextBox=el=>!!el&&(el.tagName==='TEXTAREA'||el.isContentEditable||(el.tagName==='INPUT'&&TEXT.test(el.getAttribute('type')||'text')));
  let active=null,raf=0;
  function measure(){
    if(!vv){root.style.setProperty('--kb','0px');root.style.setProperty('--vv-top','0px');root.classList.remove('kb-open');return 0}
    const layoutH=root.clientHeight||innerHeight;
    const top=Math.max(0,Math.round(vv.offsetTop)),kb=Math.max(0,Math.round(layoutH-vv.height-vv.offsetTop));
    const open=kb>80&&!!active;
    root.style.setProperty('--kb',(open?kb:0)+'px');root.style.setProperty('--vv-top',(open?top:0)+'px');
    root.classList.toggle('kb-open',open);
    return open?kb:0;
  }
  function topCover(inModal,visTop){
    if(inModal)return visTop;
    const h=document.querySelector('header');
    const b=h?h.getBoundingClientRect().bottom:0;
    return Math.max(visTop,b);
  }
  function reveal(el){
    if(!el||document.activeElement!==el||!el.isConnected)return;
    const visTop=vv?vv.offsetTop:0,visBottom=vv?vv.offsetTop+vv.height:innerHeight;
    const box=el.closest('.modal-box');
    const top=topCover(!!box,visTop)+10,bottom=visBottom-12;
    const r=el.getBoundingClientRect();
    if(r.top>=top&&r.bottom<=bottom)return;            // already in view: leave it alone
    const delta=(r.top+r.height/2)-(top+(bottom-top)/2); // put the box in the middle of what's visible
    if(box&&box.scrollHeight>box.clientHeight){box.scrollTop+=delta}
    else if(!box){window.scrollBy(0,delta)}
  }
  function refresh(){raf=0;measure();if(active)reveal(active)}
  function soon(){if(!raf)raf=requestAnimationFrame(refresh)}
  document.addEventListener('focusin',e=>{
    if(!isTextBox(e.target))return;
    active=e.target;
    // The keyboard animates in over a few hundred ms; check as it lands and once more after.
    setTimeout(soon,60);setTimeout(soon,320);setTimeout(soon,650);
  });
  document.addEventListener('focusout',()=>{setTimeout(()=>{if(!isTextBox(document.activeElement)){active=null;measure()}},120)});
  if(vv)vv.addEventListener('resize',soon);
  measure();
})();
