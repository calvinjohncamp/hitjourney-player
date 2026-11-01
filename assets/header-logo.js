(() => {
  'use strict';
  const defaults = {type:'headerLogo',src:'/assets/mr-dj-logo.png',color:'#85ACC9',width:104,rotation:0,ratio:5079/1129,djAlign:'center',wavesAlign:'center'};
  const hex = value => /^#[\da-f]{6}$/i.test(value);
  function source(value) {
    try {
      const url=new URL(value,location.href);
      return ['https:','http:','blob:'].includes(url.protocol) ? value : defaults.src;
    } catch (_) {return defaults.src;}
  }
  const clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;
  const alignment=value=>['top','center','bottom'].includes(value)?value:'center';
  function normalize(value={}) {
    return {type:'headerLogo',src:source(String(value.src||defaults.src)),color:hex(String(value.color))?value.color.toUpperCase():defaults.color,
      width:clamp(value.width,40,240,defaults.width),rotation:clamp(value.rotation,-180,180,0),ratio:clamp(value.ratio,.1,20,defaults.ratio),djAlign:alignment(value.djAlign),wavesAlign:alignment(value.wavesAlign)};
  }
  // In the 1829×294 HitJourney artwork, the flat letter baseline is y=230.
  // The tails of j/y extend to y=294; round letters slightly overshoot the baseline.
  const HIT_BASELINE=230/294;
  const HIT_ASPECT=1829/294;
  const HIT_DESKTOP_HEIGHT=58;
  let count=0;
  function create(header,config,{preview=false}={}) {
    header.classList.add('hj-branding-header');
    const link=document.createElement('a');
    link.className='hj-dj-logo';link.href='/dj.html';link.setAttribute('aria-label','Mr. DJ öffnen');
    const id='hj-dj-tint-'+(++count);
    link.innerHTML='<svg class="hj-dj-logo-defs" aria-hidden="true"><defs><filter id="'+id+'" color-interpolation-filters="sRGB"><feFlood/><feComposite in2="SourceAlpha" operator="in"/></filter></defs></svg><img class="hj-dj-logo-image" alt="" draggable="false">';
    link.querySelector('img').style.filter='url(#'+id+')';
    link.addEventListener('click',event=>{
      event.preventDefault();
      if(preview) return;
      if(window.HJFocus) window.HJFocus.navigate('/dj.html');
      else location.assign('/dj.html');
    });
    header.append(link);
    let current=config,geometry={bh:0};
    const reference=header.querySelector('.hj-branding-left img');
    const waves=header.querySelector('.hj-branding-right img');
    function alignLogos() {
      if(!header.isConnected || !header.clientWidth)return;
      const style=getComputedStyle(header);
      const number=value=>parseFloat(value)||0;
      const referenceRect=reference?.getBoundingClientRect();
      const referenceHeight=referenceRect?.height || number(reference && getComputedStyle(reference).maxHeight) || 32;
      const wavesHeight=waves?.getBoundingClientRect().height || number(waves && getComputedStyle(waves).maxHeight) || 10;
      // Reserve the same space for all alignments. Moving either companion logo
      // must not move HitJourney or change the header height.
      const baselineHeight=referenceHeight*HIT_BASELINE;
      const clearance=Math.max(0,geometry.bh-baselineHeight,wavesHeight-baselineHeight);
      const needed=referenceHeight+2*clearance+number(style.paddingTop)+number(style.paddingBottom)+number(style.borderBottomWidth);
      header.style.setProperty('--dj-header-height',needed.toFixed(3)+'px');
      const headerRect=header.getBoundingClientRect();
      const referenceTop=referenceRect?.height?reference.getBoundingClientRect().top-headerRect.top-header.clientTop:
        number(style.paddingTop)+(header.clientHeight-number(style.paddingTop)-number(style.paddingBottom)-referenceHeight)/2;
      const offset=(align,height)=>align==='top'?0:align==='bottom'?baselineHeight-height:(referenceHeight-height)/2;
      header.style.setProperty('--dj-logo-top',(referenceTop+offset(current.djAlign,geometry.bh)).toFixed(3)+'px');
      header.style.setProperty('--dj-waves-top',(referenceTop+offset(current.wavesAlign,wavesHeight)).toFixed(3)+'px');
      header.style.setProperty('--dj-waves-right',style.paddingRight);
    }
    let alignmentFrame=0;
    const scheduleAlignment=()=>{cancelAnimationFrame(alignmentFrame);alignmentFrame=requestAnimationFrame(alignLogos);};
    function update(value) {
      const cfg=normalize(value);current=cfg;
      let w=cfg.width*Math.min(1,cfg.ratio),h=w/cfg.ratio;
      const rad=cfg.rotation*Math.PI/180;
      let bw=Math.abs(w*Math.cos(rad))+Math.abs(h*Math.sin(rad));
      let bh=Math.abs(w*Math.sin(rad))+Math.abs(h*Math.cos(rad));
      // Treat the configured size as the desktop preference. Keep the complete
      // (possibly rotated) symbol subordinate to HitJourney, then shrink both
      // at the same ratio. Solve the side-slot equation explicitly to avoid a
      // ResizeObserver feedback loop between the logo width and HitJourney's slot.
      const desktopHitWidth=HIT_DESKTOP_HEIGHT*HIT_ASPECT;
      const hierarchy=Math.min(1,desktopHitWidth*.6/bw,HIT_DESKTOP_HEIGHT*.7/bh);
      const baseBoxWidth=bw*hierarchy;
      const style=getComputedStyle(header);
      const contentWidth=Math.max(1,header.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0));
      const maxHitHeight=parseFloat(reference && getComputedStyle(reference).maxHeight)||32;
      const sideSlot=Math.max(1,contentWidth/2-24)/(1+baseBoxWidth/(2*desktopHitWidth));
      const hitWidth=Math.min(desktopHitWidth,maxHitHeight*HIT_ASPECT,sideSlot);
      const scale=hierarchy*hitWidth/desktopHitWidth;
      w*=scale;h*=scale;bw*=scale;bh*=scale;
      for(const [key,val] of Object.entries({'box-width':bw+'px','box-height':bh+'px',width:w+'px',height:h+'px',angle:cfg.rotation+'deg'})) header.style.setProperty('--dj-logo-'+key,val);
      geometry={bh};
      alignLogos();
      link.querySelector('feFlood').setAttribute('flood-color',cfg.color);
      const img=link.querySelector('img');
      if(img.getAttribute('src')!==cfg.src) img.src=cfg.src;
      return cfg;
    }
    update(config);
    const scaleSignature=()=>{
      const style=getComputedStyle(header);
      return [header.clientWidth,style.paddingLeft,style.paddingRight,reference && getComputedStyle(reference).maxHeight].join('|');
    };
    let lastScale=scaleSignature();
    const refreshSize=()=>{
      const next=scaleSignature();
      if(next!==lastScale){lastScale=next;update(current);}
      else scheduleAlignment();
    };
    const observer=new ResizeObserver(refreshSize);
    window.addEventListener('resize',refreshSize);
    observer.observe(header);
    for(const img of [reference,waves])if(img){observer.observe(img);img.addEventListener('load',scheduleAlignment);img.addEventListener('error',scheduleAlignment);}
    return {link,update};
  }
  async function read() {
    const key=typeof SB_KEY==='undefined'?SB_ANON:SB_KEY;
    const res=await fetch(SB_URL+'/rest/v1/home_layout?select=id,cells&row_order=eq.-7&limit=1',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});
    if(!res.ok) throw new Error('Logo konnte nicht geladen werden (HTTP '+res.status+').');
    const rows=await res.json();
    const row=rows[0];
    if(row && row.cells?.[0]?.type!=='headerLogo') throw new Error('Logo-Speicherplatz ist bereits belegt.');
    return {id:row?.id||null,config:normalize(row?.cells?.[0]||defaults)};
  }
  window.HJHeaderLogo={defaults,normalize,hex,create,read};
  const header=document.getElementById('mainHeader');
  if(header) {
    document.getElementById('logoHome')?.classList.add('hj-branding-left');
    document.getElementById('makingWaves')?.classList.add('hj-branding-right');
    const view=create(header,defaults);
    read().then(saved=>view.update(saved.config)).catch(error=>console.warn('[HitJourney Logo]',error.message));
    window.addEventListener('storage',event=>{if(event.key==='hj-header-logo-saved') read().then(saved=>view.update(saved.config)).catch(()=>{});});
    window.addEventListener('focus',()=>read().then(saved=>view.update(saved.config)).catch(()=>{}));
  }
})();
