require('./engine.js'); const {GENS,mkRng,fx}=globalThis.SatGen;
for(const g of GENS){ const b=g.build(JSON.parse(JSON.stringify(g.practice)));
  console.log('\n['+g.ch+'] '+g.id+': '+b.qs.map(q=>q.k+'='+(q.choice?q.v:fx(q.v,q.d))).join(' | ')); }
let bad=0; for(const g of GENS){ for(let s=1;s<=400;s++){ const R=mkRng(s*7919+g.id.length); let p,b; try{p=g.rand(R); b=g.build(p);}catch(e){console.log('ERR',g.id,s,e.message);bad++;break;}
  for(const q of b.qs){ if(!q.choice && !isFinite(q.v)){console.log('NaN',g.id,s,q.k,JSON.stringify(p));bad++;} if(q.choice&&!q.opts.includes(q.v)){console.log('OPT',g.id,q.k,q.v);bad++;} }
  if(bad>20)process.exit(1);} } console.log('\nGENS',GENS.length,'bad',bad);
