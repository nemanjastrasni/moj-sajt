/* eslint-disable @typescript-eslint/no-require-imports -- Exercise component effects with deterministic event targets and hook state. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test,beforeEach,afterEach}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module')
const React=require('react'),original=Module._load
let active,nextId=0,desktop=false,timers,win,doc
const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]))
const hooks={
 useId:()=>{const h=active,i=h.cursor++;return h.slots[i]??(h.slots[i]='preview-'+(++nextId))},
 useState:initial=>{const h=active,i=h.cursor++;if(!(i in h.slots))h.slots[i]=typeof initial==='function'?initial():initial;return[h.slots[i],value=>{const next=typeof value==='function'?value(h.slots[i]):value;if(!Object.is(next,h.slots[i])){h.slots[i]=next;h.dirty=true}}]},
 useRef:initial=>{const h=active,i=h.cursor++;return h.slots[i]??(h.slots[i]={current:initial})},
 useCallback:(fn,deps)=>{const h=active,i=h.cursor++,old=h.slots[i];if(!old||!same(old.deps,deps))h.slots[i]={deps,fn};return h.slots[i].fn},
 useEffect:(effect,deps)=>{const h=active,i=h.cursor++,old=h.slots[i];if(!old||!same(old.deps,deps))h.pending.push(()=>{old?.cleanup?.();h.slots[i]={deps,cleanup:effect()}})},
}
Module._load=function(request,parent,main){
 if(request==='react')return{...React,...hooks}
 if(request==='react-dom')return{createPortal:content=>content}
 if(request==='@/app/components/UiText')return{useI18n:()=>({t:(s,values)=>s.replace('{chord}',values?.chord||'')})}
 if(request==='./useChordVariants')return{useChordVariants:()=>[]}
 return original.call(this,request,parent,main)
}
let Chord
try{Chord=require('../app/components/Chord.tsx').default}finally{Module._load=original}
class TrackedTarget extends EventTarget{
 listeners=new Map()
 addEventListener(type,fn,options){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);super.addEventListener(type,fn,options)}
 removeEventListener(type,fn,options){this.listeners.get(type)?.delete(fn);super.removeEventListener(type,fn,options)}
 count(type){return this.listeners.get(type)?.size||0}
}
function mount(chord='Am'){
 const h={slots:[],cursor:0,pending:[],dirty:true,tree:null}
 h.flush=()=>{let iterations=0;while(h.dirty){assert.ok(++iterations<20,'render must settle');h.dirty=false;h.cursor=0;h.pending=[];active=h;h.tree=Chord({chord,size:18});active=null;h.pending.forEach(effect=>effect())}return h.tree}
 h.close=()=>h.slots.forEach(slot=>slot?.cleanup?.())
 h.flush();return h
}
const click=h=>{h.tree.props.onClick({stopPropagation(){}});h.flush()}
beforeEach(()=>{
 desktop=false;timers=new Map();win=new TrackedTarget();doc=new TrackedTarget()
 win.matchMedia=()=>({matches:desktop});win.setTimeout=fn=>{const id=timers.size+1;timers.set(id,fn);return id};win.clearTimeout=id=>timers.delete(id)
 global.window=win;global.document=doc
})
afterEach(()=>{delete global.window;delete global.document})
test('75 closed chords register no resize or preview coordination listeners during initial mounting',()=>{
 const chords=Array.from({length:75},()=>mount())
 assert.equal(win.count('resize'),0);assert.equal(win.count('chord-preview-open'),0);assert.equal(doc.count('pointerdown'),0)
 assert.ok(chords.every(h=>h.tree.props['aria-expanded']===false));chords.forEach(h=>h.close())
})
test('touch opens one preview, another chord closes it, and Escape releases active subscriptions',()=>{
 const first=mount('Am'),second=mount('C');click(first)
 assert.equal(first.tree.props['aria-expanded'],true);assert.equal(win.count('chord-preview-open'),1)
 click(second);first.flush()
 assert.equal(first.tree.props['aria-expanded'],false);assert.equal(second.tree.props['aria-expanded'],true)
 assert.equal(win.count('chord-preview-open'),1);assert.equal(win.count('resize'),1)
 second.tree.props.onKeyDown({key:'Escape'});second.flush()
 assert.equal(win.count('chord-preview-open'),0);assert.equal(win.count('resize'),0)
 first.close();second.close()
})
test('hover detects the current pointer capability without a mount-time update and click pins the preview',()=>{
 const chord=mount();chord.tree.props.onMouseEnter();chord.flush();assert.equal(chord.tree.props['aria-expanded'],false)
 desktop=true;chord.tree.props.onMouseEnter();chord.flush();assert.equal(chord.tree.props['aria-expanded'],true)
 chord.tree.props.onMouseLeave();assert.equal(timers.size,1)
 click(chord);assert.equal(timers.size,0)
 chord.tree.props.onMouseLeave();assert.equal(timers.size,0)
 chord.close();assert.equal(win.count('resize'),0);assert.equal(doc.count('pointerdown'),0)
})
