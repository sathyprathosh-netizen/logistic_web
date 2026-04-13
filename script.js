gsap.registerPlugin(ScrollTrigger);

/* ══════════════════════════════════════════
   CURSOR
══════════════════════════════════════════ */
const cur=document.getElementById('cur'),cur2=document.getElementById('cur2');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY});
(function loop(){rx+=(mx-rx)*.1;ry+=(my-ry)*.1;cur.style.left=mx+'px';cur.style.top=my+'px';cur2.style.left=rx+'px';cur2.style.top=ry+'px';requestAnimationFrame(loop)})();

/* ══════════════════════════════════════════
   LOADER
══════════════════════════════════════════ */
let p=0;
const ldFill=document.getElementById('ldFill'),ldNum=document.getElementById('ldNum');
const ldInt=setInterval(()=>{
  p+=Math.random()*14;
  if(p>=100){p=100;clearInterval(ldInt);setTimeout(boot,250)}
  ldFill.style.width=p+'%';ldNum.textContent=Math.floor(p);
},100);

function boot(){
  gsap.to('#loader',{opacity:0,duration:.6,ease:'power2.in',onComplete:()=>{document.getElementById('loader').style.display='none';initAll()}});
}

/* ══════════════════════════════════════════
   HERO PARTICLE CANVAS (stars/sparks)
══════════════════════════════════════════ */
function initParticles(){
  const c=document.getElementById('hero-canvas');
  const ctx=c.getContext('2d');
  function resize(){c.width=innerWidth;c.height=innerHeight}resize();
  window.addEventListener('resize',resize);
  const pts=Array.from({length:80},()=>({
    x:Math.random()*innerWidth,y:Math.random()*innerHeight,
    vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,
    r:Math.random()*1.2+.3,o:Math.random()*.5+.1
  }));
  function draw(){
    ctx.clearRect(0,0,c.width,c.height);
    pts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=c.width;if(p.x>c.width)p.x=0;
      if(p.y<0)p.y=c.height;if(p.y>c.height)p.y=0;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,138,0,${p.o})`;ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ══════════════════════════════════════════
   THREE.JS GLOBE
══════════════════════════════════════════ */
function initGlobe(){
  const wrap=document.getElementById('globe-wrap');
  let W=wrap.clientWidth,H=wrap.clientHeight;
  const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('globe-canvas'),alpha:true,antialias:true});
  renderer.setPixelRatio(window.devicePixelRatio);renderer.setSize(W,H);
  const scene=new THREE.Scene();
  const cam=new THREE.PerspectiveCamera(45,W/H,.1,100);cam.position.z=2.6;

  // Globe sphere (wireframe)
  const geo=new THREE.SphereGeometry(1,48,48);
  const wmat=new THREE.MeshBasicMaterial({color:0xE0E0E0,wireframe:true,transparent:true,opacity:.35});
  const globe=new THREE.Mesh(geo,wmat);scene.add(globe);

  // Solid core
  const core=new THREE.Mesh(new THREE.SphereGeometry(.98,32,32),new THREE.MeshBasicMaterial({color:0xF5F5F5,transparent:true,opacity:.9}));
  scene.add(core);

  // Orange ring
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.08,.003,4,80),new THREE.MeshBasicMaterial({color:0xFF8A00,transparent:true,opacity:.6}));
  ring.rotation.x=Math.PI/2;scene.add(ring);

  // City dots
  const cities=[
    [40.7,-74],[51.5,-.12],[25.2,55.3],[1.35,103.8],[-33.9,151.2],
    [-23.5,-46.6],[35.7,139.7],[28.6,77.2],[30.0,31.2],[19.1,72.9]
  ];
  const dotGeo=new THREE.SphereGeometry(.018,8,8);
  cities.forEach(([lat,lon])=>{
    const phi=(90-lat)*Math.PI/180,theta=(lon+180)*Math.PI/180;
    const x=-(Math.sin(phi)*Math.cos(theta)),z=Math.sin(phi)*Math.sin(theta),y=Math.cos(phi);
    const dot=new THREE.Mesh(dotGeo,new THREE.MeshBasicMaterial({color:0xFF8A00}));
    dot.position.set(x,y,z);scene.add(dot);
    // Pulse ring
    const pr=new THREE.Mesh(new THREE.TorusGeometry(.04,.004,4,24),new THREE.MeshBasicMaterial({color:0xFF8A00,transparent:true,opacity:.5}));
    pr.position.set(x,y,z);pr.lookAt(0,0,0);scene.add(pr);
  });

  // Arcs between cities (curved lines)
  function latLonToVec3(lat,lon,r){
    const phi=(90-lat)*Math.PI/180,theta=(lon+180)*Math.PI/180;
    return new THREE.Vector3(-(r*Math.sin(phi)*Math.cos(theta)),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta));
  }
  const pairs=[[0,1],[1,2],[2,3],[3,4],[0,5],[6,2],[7,2],[8,1],[9,3]];
  const curves=[];
  pairs.forEach(([a,b])=>{
    const p1=latLonToVec3(...cities[a],1),p2=latLonToVec3(...cities[b],1);
    const dist=p1.distanceTo(p2);
    const mid=p1.clone().add(p2).multiplyScalar(.5).normalize().multiplyScalar(1 + dist * 0.4);
    const curve=new THREE.QuadraticBezierCurve3(p1,mid,p2);
    curves.push(curve);
    const pts2=curve.getPoints(64);
    const lg=new THREE.BufferGeometry().setFromPoints(pts2);
    const lm=new THREE.LineBasicMaterial({color:0xFF8A00,transparent:true,opacity:.3});
    scene.add(new THREE.Line(lg,lm));
  });

  // Animated Pulses
  const pulseGroup=new THREE.Group(); scene.add(pulseGroup);
  const pulseGeo=new THREE.BoxGeometry(.012,.012,.012);
  const pulseMat=new THREE.MeshBasicMaterial({color:0xFF8A00});
  const pulses=[];
  
  function createPulse(curvePath){
    const pulse=new THREE.Mesh(pulseGeo,pulseMat);
    pulseGroup.add(pulse);
    return {mesh:pulse,path:curvePath,offset:Math.random(),speed:0.003 + Math.random()*0.005};
  }
  
  curves.forEach(c=>{
    for(let i=0;i<2;i++) pulses.push(createPulse(c));
  });

  let isDragging=false,prevMX=0,prevMY=0,rotX=0,rotY=0;
  renderer.domElement.addEventListener('mousedown',e=>{isDragging=true;prevMX=e.clientX;prevMY=e.clientY});
  window.addEventListener('mousemove',e=>{if(!isDragging)return;rotY+=(e.clientX-prevMX)*.005;rotX+=(e.clientY-prevMY)*.005;prevMX=e.clientX;prevMY=e.clientY});
  window.addEventListener('mouseup',()=>isDragging=false);

  let t=0;
  function animate(){
    requestAnimationFrame(animate);
    t+=.003;
    if(!isDragging){rotY+=.003}
    globe.rotation.y=rotY;globe.rotation.x=rotX;
    core.rotation.y=rotY;core.rotation.x=rotX;
    pulseGroup.rotation.y=rotY;pulseGroup.rotation.x=rotX;
    ring.rotation.y=t*.3;
    
    // Animate pulses
    pulses.forEach(p=>{
      p.offset+=p.speed;
      if(p.offset>1)p.offset=0;
      const pos=p.path.getPointAt(p.offset);
      p.mesh.position.copy(pos);
    });
    
    renderer.render(scene,cam);
  }
  animate();

  window.addEventListener('resize',()=>{const nw=wrap.clientWidth,nh=wrap.clientHeight;renderer.setSize(nw,nh);cam.aspect=nw/nh;cam.updateProjectionMatrix()});
}

/* ══════════════════════════════════════════
   THREE.JS ROTATING CUBE
══════════════════════════════════════════ */
function initCube(){
  const wrap=document.querySelector('.cube-section');
  const canvas=document.getElementById('cube-canvas');
  let W=canvas.clientWidth,H=canvas.clientHeight;
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(window.devicePixelRatio);renderer.setSize(W,H);
  const scene=new THREE.Scene();
  const cam=new THREE.PerspectiveCamera(45,W/H,.1,100);cam.position.z=3.5;

  // Main container cube (wireframe)
  const cg=new THREE.BoxGeometry(1.8,1.8,1.8);
  const wm=new THREE.EdgesGeometry(cg);
  const lm=new THREE.LineSegments(wm,new THREE.LineBasicMaterial({color:0xFF8A00,transparent:true,opacity:.7}));
  scene.add(lm);

  // Inner smaller cube
  const ig=new THREE.BoxGeometry(1.1,1.1,1.1);
  const iw=new THREE.EdgesGeometry(ig);
  const im=new THREE.LineSegments(iw,new THREE.LineBasicMaterial({color:0xFF8A00,transparent:true,opacity:.3}));
  scene.add(im);

  // Solid faces semi-transparent
  const fm=new THREE.MeshBasicMaterial({color:0xFF8A00,transparent:true,opacity:.04,side:THREE.DoubleSide,depthWrite:false});
  scene.add(new THREE.Mesh(cg,fm));

  // Orbiting ring
  const or=new THREE.Mesh(new THREE.TorusGeometry(2,.006,4,80),new THREE.MeshBasicMaterial({color:0xFF8A00,transparent:true,opacity:.35}));
  or.rotation.x=Math.PI/2;scene.add(or);

  // Floating dots
  const dg=new THREE.SphereGeometry(.04,6,6),dm=new THREE.MeshBasicMaterial({color:0xFF8A00});
  [[-1.4,0,0],[1.4,0,0],[0,1.4,0],[0,-1.4,0],[0,0,1.4],[0,0,-1.4]].forEach(pos=>{
    const d=new THREE.Mesh(dg,dm);d.position.set(...pos);scene.add(d);
  });

  let mouse={x:0,y:0};
  document.getElementById('cube-canvas').addEventListener('mousemove',e=>{
    const r=canvas.getBoundingClientRect();
    mouse.x=(e.clientX-r.left)/380-.5;
    mouse.y=(e.clientY-r.top)/380-.5;
  });

  let t=0;
  function animate(){
    requestAnimationFrame(animate);t+=.008;
    lm.rotation.y=t+mouse.x*1.5;lm.rotation.x=t*.4+mouse.y*1.5;
    im.rotation.y=-t*.7;im.rotation.x=-t*.3;
    or.rotation.z=t*.5;
    renderer.render(scene,cam);
  }
  animate();

  window.addEventListener('resize',()=>{
    const nw=wrap.clientWidth > 320 ? 320 : wrap.clientWidth;
    const nh=320; 
    renderer.setSize(nw,nh);
    cam.aspect=nw/nh;cam.updateProjectionMatrix();
  });
}

/* ══════════════════════════════════════════
   HERO TILT (about images)
══════════════════════════════════════════ */
function initTilt(){
  const el=document.getElementById('tilt-imgs');
  if(!el)return;
  el.addEventListener('mousemove',e=>{
    const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    el.style.transform=`perspective(1000px) rotateY(${x*10}deg) rotateX(${-y*10}deg)`;
    el.style.transition='transform .08s ease-out';
  });
  el.addEventListener('mouseleave',()=>{el.style.transform='none';el.style.transition='transform .5s ease'});
}

/* ══════════════════════════════════════════
   SERVICE CARD 3D TILT
══════════════════════════════════════════ */
function initCardTilts(){
  document.querySelectorAll('[data-tilt]').forEach(card=>{
    card.addEventListener('mousemove',e=>{
      const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      card.style.transform=`perspective(600px) rotateY(${x*10}deg) rotateX(${-y*10}deg) translateZ(8px)`;
      card.style.transition='transform .06s ease-out';
    });
    card.addEventListener('mouseleave',()=>{card.style.transform='none';card.style.transition='transform .5s ease'});
  });
}

/* ══════════════════════════════════════════
   LINE CHART CANVAS
══════════════════════════════════════════ */
function drawLineChart(){
  const canvas=document.getElementById('lc');
  const ctx=canvas.getContext('2d');
  const w=canvas.offsetWidth,h=70;
  canvas.width=w*devicePixelRatio;canvas.height=h*devicePixelRatio;
  ctx.scale(devicePixelRatio,devicePixelRatio);
  const pts=[.72,.75,.78,.80,.83,.85,.87,.92,.94,.96,.98,.99];
  const grad=ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,'rgba(255,138,0,.28)');grad.addColorStop(1,'rgba(255,138,0,0)');
  let prog=0;
  function frame(){
    ctx.clearRect(0,0,w,h);
    const cnt=Math.max(2,Math.floor(pts.length*prog));
    ctx.beginPath();ctx.moveTo(0,h*(1-pts[0]));
    for(let i=1;i<cnt;i++){ctx.lineTo((i/(pts.length-1))*w,h*(1-pts[i]))}
    ctx.strokeStyle='rgba(255,138,0,.85)';ctx.lineWidth=1.5;ctx.stroke();
    const lx=((cnt-1)/(pts.length-1))*w;
    ctx.lineTo(lx,h);ctx.lineTo(0,h);ctx.fillStyle=grad;ctx.fill();
    if(prog<1){prog+=.02;requestAnimationFrame(frame)}
  }
  frame();
}

/* ══════════════════════════════════════════
   COUNTER ANIMATION
══════════════════════════════════════════ */
function counter(el,target,suffix,dur=1800){
  const isFloat=target%1!==0;
  const s=performance.now();
  (function up(ts){
    const p=Math.min((ts-s)/dur,1),e=1-Math.pow(1-p,3);
    const v=target*e;
    el.textContent=(isFloat?v.toFixed(1):Math.floor(v))+`<span class="c-sfx">${suffix}</span>`;
    el.innerHTML=(isFloat?v.toFixed(1):Math.floor(v))+'<span class="c-sfx">'+suffix+'</span>';
    if(p<1)requestAnimationFrame(up);
  })(s);
}

/* ══════════════════════════════════════════
   HERO ANIMATION
══════════════════════════════════════════ */
function initHero(){
  const tl=gsap.timeline();
  tl.to('.h-tag',{opacity:1,y:0,duration:.6,ease:'power3.out'},0.1)
    .fromTo('.h1-word',{yPercent:110,skewX:-4},{yPercent:0,skewX:0,duration:.9,stagger:.14,ease:'power4.out'},0.3)
    .to('.hero-p',{opacity:1,y:0,duration:.7,ease:'power3.out'},0.9)
    .to('.hero-btns',{opacity:1,y:0,duration:.6,ease:'power3.out'},1.08)
    .to('.kpi',{opacity:1,y:0,stagger:.08,duration:.55,ease:'power3.out'},1.2)
    .from('#nav',{opacity:0,y:-18,duration:.55,ease:'power3.out'},0.15);

  gsap.to('.hero-photo',{yPercent:28,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});

  window.addEventListener('scroll',()=>{
    document.getElementById('nav').classList.toggle('on',scrollY>60);
  });

  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('nav');
  menuToggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });

  // Close menu when a link is clicked
  document.querySelectorAll('.n-links a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
    });
  });
}

/* ══════════════════════════════════════════
   SCROLL REVEALS
══════════════════════════════════════════ */
function initReveals(){
  document.querySelectorAll('.reveal').forEach(el=>{
    const fromL=el.classList.contains('from-left'),fromR=el.classList.contains('from-right');
    gsap.fromTo(el,
      {opacity:0,y:fromL||fromR?0:44,x:fromL?-44:fromR?44:0},
      {opacity:1,y:0,x:0,duration:.9,ease:'power3.out',
       scrollTrigger:{trigger:el,start:'top 88%',toggleActions:'play none none none'}}
    );
  });

  // Bars (Scale one time)
  gsap.to('.bar',{scaleY:1,duration:1.2,stagger:.08,ease:'power4.out',
    scrollTrigger:{trigger:'#barsEl',start:'top 85%',toggleActions:'play none none none'}});

  // Line chart
  ScrollTrigger.create({trigger:'#lc',start:'top 80%',once:true,onEnter:drawLineChart});

  // Analytics counters
  const cnMap={cn1:[1.5,'M'],cn2:[99,'%'],cn3:[140,'+'],cn4:[28,'K']};
  Object.entries(cnMap).forEach(([id,[t,s]])=>{
    const el=document.getElementById(id);
    ScrollTrigger.create({trigger:el,start:'top 82%',once:true,onEnter:()=>{
      const dur=1800,st=performance.now();const isF=t%1!==0;
      (function up(ts){const p=Math.min((ts-st)/dur,1),e=1-Math.pow(1-p,3);el.textContent=isF?(t*e).toFixed(1):Math.floor(t*e);if(p<1)requestAnimationFrame(up)})(st);
    }});
  });

  // Milestone counters
  document.querySelectorAll('.cnum').forEach(el=>{
    const t=parseFloat(el.dataset.t),s=el.dataset.s;
    ScrollTrigger.create({trigger:el,start:'top 82%',once:true,onEnter:()=>counter(el,t,s)});
  });
}

/* ══════════════════════════════════════════
   CTA PARALLAX TEXT
══════════════════════════════════════════ */
function initCTA(){
  gsap.fromTo('.cta-ghost',{scale:1.3,opacity:0},{scale:1,opacity:1,ease:'none',
    scrollTrigger:{trigger:'.cta-sec',start:'top 90%',end:'center center',scrub:1}});
}

/* ══════════════════════════════════════════
   INIT ALL
══════════════════════════════════════════ */
function initAll(){
  initParticles();
  initHero();
  initTilt();
  initCardTilts();
  initReveals();
  initGlobe();
  initCube();
  initCTA();

  // Section headers GSAP stagger
  gsap.utils.toArray('h2').forEach(h=>{
    gsap.from(h,{opacity:0,y:40,duration:.85,ease:'power3.out',
      scrollTrigger:{trigger:h,start:'top 88%',toggleActions:'play none none none'}});
  });

  // Solution cards fan-in
  gsap.from('.sol-card',{opacity:0,y:50,rotateX:15,stagger:.12,duration:1,ease:'power3.out',transformOrigin:'top center',
    scrollTrigger:{trigger:'.sol-grid',start:'top 82%'}});

  // Milestone counter blocks
  gsap.from('.cnt-blk',{opacity:0,x:40,stagger:.08,duration:.8,
    scrollTrigger:{trigger:'.mile-counters',start:'top 82%'}});

  // Footer reveal
  gsap.from('.ft-grid > *',{opacity:0,y:28,stagger:.1,duration:.7,
    scrollTrigger:{trigger:'footer',start:'top 88%'}});
}
