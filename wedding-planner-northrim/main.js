import { BRAND, ACCESS } from './config.js';

const { useState, useMemo, useEffect, useRef } = React;

const STORAGE_KEY = 'weddingPlannerApp_v1';

const DEFAULT_CATEGORIES = [
  { id: 'venue', name: 'Venue', percent: 28 },
  { id: 'photography', name: 'Photography', percent: 18 },
  { id: 'planner', name: 'Planner/Coordinator', percent: 8 },
  { id: 'catering', name: 'Catering & Cake', percent: 18 },
  { id: 'attire', name: 'Attire & Beauty', percent: 6 },
  { id: 'florals', name: 'Florals & Decor', percent: 7 },
  { id: 'music', name: 'Music/DJ/Band', percent: 6 },
  { id: 'video', name: 'Videography', percent: 5 },
  { id: 'stationery', name: 'Stationery', percent: 1.5 },
  { id: 'transport', name: 'Transportation', percent: 1.5 },
  { id: 'officiant', name: 'Officiant & License', percent: 0.5 },
  { id: 'misc', name: 'Contingency/Misc', percent: 0.5 },
];
const DEFAULT_TASKS = [
  { title: 'Set budget & priorities', dueInDays: 0 },
  { title: 'Create guest list (draft)', dueInDays: 7 },
  { title: 'Book venue', dueInDays: 14 },
  { title: 'Book photographer', dueInDays: 21 },
  { title: 'Book planner/coordinator (optional)', dueInDays: 21 },
  { title: 'Research catering options', dueInDays: 28 },
  { title: 'Engagement session (optional)', dueInDays: 45 },
  { title: 'Reserve DJ/Band', dueInDays: 30 },
  { title: 'Design & send save-the-dates', dueInDays: 60 },
  { title: 'Book florist', dueInDays: 60 },
  { title: 'Book videographer (if desired)', dueInDays: 60 },
  { title: 'Plan ceremony details & officiant', dueInDays: 75 },
  { title: 'Transportation logistics', dueInDays: 90 },
  { title: 'Finalize timeline', dueInDays: 120 },
  { title: 'Final payments & confirmations', dueInDays: 150 },
];

const EMPTY_VENDOR = {
  id: '',
  name: '',
  category: 'photography',
  contactName: '',
  website: '',
  phone: '',
  email: '',
  quotedCost: '',
  depositPaid: '',
  status: 'researching',
  dueDate: '',
  notes: '',
};

const money = (n)=> isNaN(n)||n==null? '—' : `$${Number(n).toLocaleString()}`;
const fmt = (n)=> isNaN(n)||n==null? '—' : Number(n).toLocaleString();
const clamp01 = (x)=> Math.max(0, Math.min(1, x));
const isoInDays = (days)=> { const d=new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };
const phoneFmt = (s)=>{ if(!s) return ''; const d=s.replace(/\D/g,'').slice(0,10); const m=d.match(/(\d{0,3})(\d{0,3})(\d{0,4})/); if(!m) return s; return [m[1]&&`(${m[1]})`, m[2]&&` ${m[2]}`, m[3]&&`-${m[3]}`].filter(Boolean).join(''); };

function computeTotals(state){
  const byCategory = Object.fromEntries(state.categories.map(c=>[c.id,{ suggested: Math.round((state.totalBudget||0)*(c.percent/100)), planned:0}]));
  let totalPlanned = 0;
  for(const v of state.vendors){
    const cost = parseFloat(v.quotedCost)||0;
    totalPlanned += cost;
    if(!byCategory[v.category]) byCategory[v.category] = { suggested: 0, planned: 0 };
    byCategory[v.category].planned += cost;
  }
  const remainingOverall = Math.max(0, (state.totalBudget||0) - totalPlanned);
  return { byCategory, totalPlanned, remainingOverall };
}

function App(){
  const [active, setActive] = useState('checklist');
  const [state, setState] = useState(()=>{
    const saved = localStorage.getItem(STORAGE_KEY);
    if(saved){
      try { return JSON.parse(saved); } catch(e){}
    }
    return {
      createdAt: new Date().toISOString(),
      coupleNames: '',
      weddingDate: '',
      totalBudget: 30000,
      categories: DEFAULT_CATEGORIES,
      tasks: DEFAULT_TASKS.map((t,i)=>({ id: `t_${i}`, title: t.title, done:false, dueDate: t.dueInDays? isoInDays(t.dueInDays):'', notes:'', pinned: i<5 })),
      vendors: [],
    };
  });
  useEffect(()=>{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  const totals = useMemo(()=> computeTotals(state), [state]);

  return (
    React.createElement(React.Fragment, null,
      React.createElement('div', {className:'container', style:{paddingTop:'14px'}},
        React.createElement('div', {style:{display:'flex',gap:'8px',alignItems:'center',justifyContent:'space-between'}},
          React.createElement('div', {style:{display:'flex',gap:'8px',flexWrap:'wrap'}},
            ['checklist','vendors','budget','settings'].map(id =>
              React.createElement('button', {
                key:id, className:`tab ${active===id?'active':''}`, onClick:()=>setActive(id)
              }, id[0].toUpperCase()+id.slice(1))
            )
          ),
          React.createElement('div', {style:{display:'flex',gap:'6px',flexWrap:'wrap'}},
            KPI('Budget', money(state.totalBudget)),
            KPI('Planned', money(totals.totalPlanned)),
            KPI('Remaining', money(totals.remainingOverall)),
            ExportButton(state),
            ImportButton((d)=>setState(d)),
            React.createElement('button', {className:'btn light', onClick:()=>{ if(confirm('Reset everything?')){ localStorage.removeItem(STORAGE_KEY); location.reload(); } }}, 'Reset')
          )
        )
      ),
      active==='checklist' && React.createElement(ChecklistTab, {state, setState}),
      active==='vendors' && React.createElement(VendorsTab, {state, setState, totals}),
      active==='budget' && React.createElement(BudgetTab, {state, setState, totals}),
      active==='settings' && React.createElement(SettingsTab, {state, setState}),
    )
  );
}

function KPI(label, value){
  return React.createElement('div',{className:'kpi'}, React.createElement('div',{className:'small'},label), React.createElement('div',{style:{fontWeight:700}},value));
}

function Card(title, children){
  return React.createElement('div',{className:'card'}, React.createElement('h3',null,title), React.createElement('div',{style:{marginTop:'8px'}}, children));
}

/*** Checklist ***/
function ChecklistTab({state,setState}){
  const [newTask, setNewTask] = useState('');
  const [due, setDue] = useState('');
  const toggle = (id)=> setState({...state, tasks: state.tasks.map(t=> t.id===id? {...t, done:!t.done} : t)});
  const remove = (id)=> setState({...state, tasks: state.tasks.filter(t=> t.id!==id)});
  const add = ()=>{
    if(!newTask.trim()) return;
    setState({...state, tasks: [{ id:`t_${Date.now()}`, title:newTask.trim(), done:false, dueDate:due, notes:'', pinned:false }, ...state.tasks]});
    setNewTask(''); setDue('');
  };
  const byDue = (a,b)=> (a.dueDate||'zzz').localeCompare(b.dueDate||'zzz');
  const pin = state.tasks.filter(t=>t.pinned && !t.done).sort(byDue);
  const todo = state.tasks.filter(t=>!t.pinned && !t.done).sort(byDue);
  const done = state.tasks.filter(t=>t.done).sort(byDue);

  return React.createElement('div',{className:'container grid', style:{marginTop:'16px', gridTemplateColumns:'2fr 1fr'}},
    React.createElement('div',{className:'grid'},
      Card('Today\'s Focus',
        React.createElement(React.Fragment,null,
          React.createElement('div',{style:{display:'flex',gap:'8px',flexWrap:'wrap'}},
            React.createElement('input',{className:'input', placeholder:'Add a task…', value:newTask, onChange:e=>setNewTask(e.target.value), style:{flex:'1 1 280px'}}),
            React.createElement('input',{type:'date', className:'input', value:due, onChange:e=>setDue(e.target.value), style:{width:'180px'}}),
            React.createElement('button',{className:'btn', onClick:add},'Add')
          ),
          React.createElement('div',{className:'grid grid-2', style:{marginTop:'10px'}}, pin.map(t =>
            React.createElement(TaskItem,{key:t.id, t, onToggle:()=>toggle(t.id), onRemove:()=>remove(t.id), onUpdate:(p)=>updateTask(state,setState,t.id,p)})
          ))
        )
      ),
      Card('To-Do',
        React.createElement('div',{className:'grid grid-2'}, todo.map(t =>
          React.createElement(TaskItem,{key:t.id, t, onToggle:()=>toggle(t.id), onRemove:()=>remove(t.id), onUpdate:(p)=>updateTask(state,setState,t.id,p)})
        ))
      ),
      Card('Completed',
        React.createElement('div',{className:'grid grid-2'}, done.map(t =>
          React.createElement(TaskItem,{key:t.id, t, onToggle:()=>toggle(t.id), onRemove:()=>remove(t.id), onUpdate:(p)=>updateTask(state,setState,t.id,p)})
        ))
      )
    ),
    React.createElement('div',null,
      Card('Quick Tips', React.createElement('ul',{className:'small', style:{margin:0,paddingLeft:'18px',lineHeight:1.6}},
        React.createElement('li',null,'Pin 3–5 tasks to keep daily focus tight.'),
        React.createElement('li',null,'Book Venue & Photography early — they anchor the rest.'),
        React.createElement('li',null,'Use the Vendors tab to store contacts and quotes.'),
        React.createElement('li',null,'Budget updates automatically as you add vendors & costs.')
      )),
      Card('Key Info',
        React.createElement('div',{className:'grid'},
          Labeled('Couple', React.createElement('input',{className:'input', value:state.coupleNames, onChange:e=>setState({...state, coupleNames:e.target.value}), placeholder:'Alex & Sam'})),
          Labeled('Wedding Date', React.createElement('input',{type:'date', className:'input', value:state.weddingDate, onChange:e=>setState({...state, weddingDate:e.target.value})}))
        )
      )
    )
  );
}

function TaskItem({t,onToggle,onRemove,onUpdate}){
  return React.createElement('div',{className:'card', style:{borderColor: t.done? '#bbf7d0' : undefined, background: t.done? '#f0fdf4': undefined }},
    React.createElement('div',{style:{display:'flex',gap:'10px'}},
      React.createElement('input',{type:'checkbox', checked:t.done, onChange:onToggle, style:{marginTop:'6px'}}),
      React.createElement('div',{style:{flex:'1 1 auto'}},
        React.createElement('input',{className:'input', value:t.title, onChange:e=>onUpdate({title:e.target.value})}),
        React.createElement('div',{className:'small', style:{display:'flex',gap:'6px',alignItems:'center',marginTop:'6px'}},
          React.createElement('input',{type:'date', className:'input', value:t.dueDate||'', onChange:e=>onUpdate({dueDate:e.target.value}), style:{maxWidth:'180px'}}),
          React.createElement('button',{className:'btn light', onClick:()=>onUpdate({ pinned: !t.pinned })}, t.pinned? 'Unpin':'Pin'),
          React.createElement('button',{className:'btn light', onClick:onRemove}, 'Delete')
        ),
        React.createElement('textarea',{className:'input', rows:2, placeholder:'Notes…', value:t.notes, onChange:e=>onUpdate({notes:e.target.value}), style:{marginTop:'6px'}})
      )
    )
  );
}

function updateTask(state,setState,id,patch){
  setState({...state, tasks: state.tasks.map(t=> t.id===id? {...t, ...patch} : t)});
}

/*** Vendors ***/
function VendorsTab({state,setState,totals}){
  const [draft, setDraft] = useState({...EMPTY_VENDOR, id:`v_${Date.now()}`});
  const categories = state.categories;
  const add = ()=>{
    if(!draft.name.trim()) return;
    const v = {...draft, quotedCost: parseFloat(draft.quotedCost)||0, depositPaid: parseFloat(draft.depositPaid)||0, phone: phoneFmt(draft.phone)};
    setState({...state, vendors: [v, ...state.vendors]});
    setDraft({...EMPTY_VENDOR, id:`v_${Date.now()}`});
  };
  const remove = (id)=> setState({...state, vendors: state.vendors.filter(v=>v.id!==id)});
  const update = (id,patch)=> setState({...state, vendors: state.vendors.map(v=> v.id===id? {...v, ...patch} : v)});

  const grouped = useMemo(()=>{
    const m={}; categories.forEach(c=>m[c.id]=[]); state.vendors.forEach(v=>{ if(!m[v.category]) m[v.category]=[]; m[v.category].push(v); }); return m;
  }, [state.vendors, categories]);

  return React.createElement('div',{className:'container grid', style:{marginTop:'16px', gridTemplateColumns:'2fr 1fr'}},
    React.createElement('div',{className:'grid'},
      Card('Add Vendor',
        React.createElement('div',{className:'grid grid-2'},
          Labeled('Vendor Name', React.createElement('input',{className:'input', value:draft.name, onChange:e=>setDraft({...draft, name:e.target.value}), placeholder:'Wildflower Events'})),
          Labeled('Category', React.createElement('select',{className:'input', value:draft.category, onChange:e=>setDraft({...draft, category:e.target.value})}, categories.map(c=> React.createElement('option',{key:c.id, value:c.id}, c.name)))),
          Labeled('Contact Name', React.createElement('input',{className:'input', value:draft.contactName, onChange:e=>setDraft({...draft, contactName:e.target.value})})),
          Labeled('Website', React.createElement('input',{className:'input', value:draft.website, onChange:e=>setDraft({...draft, website:e.target.value}), placeholder:'https://...'})),
          Labeled('Phone', React.createElement('input',{className:'input', value:draft.phone, onChange:e=>setDraft({...draft, phone:e.target.value})})),
          Labeled('Email', React.createElement('input',{className:'input', value:draft.email, onChange:e=>setDraft({...draft, email:e.target.value})})),
          Labeled('Quoted Cost', React.createElement('input',{type:'number', className:'input', value:draft.quotedCost, onChange:e=>setDraft({...draft, quotedCost:e.target.value})})),
          Labeled('Deposit Paid', React.createElement('input',{type:'number', className:'input', value:draft.depositPaid, onChange:e=>setDraft({...draft, depositPaid:e.target.value})})),
          Labeled('Due Date', React.createElement('input',{type:'date', className:'input', value:draft.dueDate, onChange:e=>setDraft({...draft, dueDate:e.target.value})})),
          Labeled('Status', React.createElement('select',{className:'input', value:draft.status, onChange:e=>setDraft({...draft, status:e.target.value})},
            React.createElement('option',{value:'researching'},'Researching'),
            React.createElement('option',{value:'shortlisted'},'Shortlisted'),
            React.createElement('option',{value:'booked'},'Booked'),
            React.createElement('option',{value:'paid'},'Paid')
          )),
          React.createElement('div',{style:{gridColumn:'1 / -1', display:'flex', justifyContent:'flex-end'}}, React.createElement('button',{className:'btn', onClick:add},'Add Vendor'))
        )
      ),
      Card('Vendors by Category',
        React.createElement('div',null,
          state.categories.map(c =>
            React.createElement('div',{key:c.id, className:'card', style:{padding:'10px', marginBottom:'10px'}},
              React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'baseline'}},
                React.createElement('strong',null,c.name),
                React.createElement('div',{className:'small'}, `${money(totals.byCategory[c.id]?.planned||0)} planned • Remaining ${money(Math.max(0,(totals.byCategory[c.id]?.suggested||0)-(totals.byCategory[c.id]?.planned||0)))} / Suggest ${money(totals.byCategory[c.id]?.suggested||0)}`)
              ),
              React.createElement('div',null,
                (grouped[c.id]||[]).map(v => React.createElement(VendorRow,{key:v.id, v, onRemove:()=>remove(v.id), onUpdate:(p)=>update(v.id,p)})),
                (!grouped[c.id]||grouped[c.id].length===0) && React.createElement('div',{className:'small'},'No vendors added yet.')
              )
            )
          )
        )
      )
    ),
    React.createElement('div',null,
      Card('Quick Stats',
        React.createElement('div',null,
          Row('Vendors', fmt(state.vendors.length)),
          Row('Booked', fmt(state.vendors.filter(v=> v.status==='booked'||v.status==='paid').length)),
          Row('Planned Spend', money(totals.totalPlanned)),
          Row('Remaining Budget', money(totals.remainingOverall))
        )
      ),
      Card('Shortlist tip', React.createElement('div',{className:'small'}, 'Use notes to store links & quotes. Mark as “Shortlisted” until booked.'))
    )
  );
}

function VendorRow({v,onRemove,onUpdate}){
  return React.createElement('div',{className:'card'},
    React.createElement('div',{style:{display:'flex',gap:'10px'}},
      React.createElement('div',{style:{flex:'1 1 auto'}},
        React.createElement('div',null, React.createElement('strong',null,v.name)),
        React.createElement('div',{className:'small'},
          (v.website? React.createElement('a',{href:v.website, target:'_blank', rel:'noreferrer'},'Website') : null),
          (v.email? React.createElement(React.Fragment,null, v.website?' • ':null, React.createElement('a',{href:`mailto:${v.email}`},'Email')): null),
          (v.phone? React.createElement(React.Fragment,null, (v.website||v.email)?' • ':null, React.createElement('a',{href:`tel:${v.phone}`}, 'Call')): null)
        ),
        v.notes? React.createElement('div',{className:'small', style:{marginTop:'6px',whiteSpace:'pre-wrap'}}, v.notes) : null
      ),
      React.createElement('div', {style:{width:'260px'}},
        Row('Quoted', money(v.quotedCost)),
        Row('Deposit', money(v.depositPaid)),
        Labeled('Status', React.createElement('select',{className:'input', value:v.status, onChange:e=>onUpdate({status:e.target.value})},
          React.createElement('option',{value:'researching'},'Researching'),
          React.createElement('option',{value:'shortlisted'},'Shortlisted'),
          React.createElement('option',{value:'booked'},'Booked'),
          React.createElement('option',{value:'paid'},'Paid')
        )),
        Labeled('Due', React.createElement('input',{type:'date', className:'input', value:v.dueDate||'', onChange:e=>onUpdate({dueDate:e.target.value})})),
        React.createElement('div',{style:{marginTop:'6px',display:'flex',justifyContent:'flex-end'}}, React.createElement('button',{className:'btn light', onClick:onRemove},'Remove'))
      )
    )
  );
}

/*** Budget ***/
function BudgetTab({state,setState,totals}){
  const updateCat = (id,patch)=> setState({...state, categories: state.categories.map(c=> c.id===id? {...c, ...patch} : c)});
  const frac = (state.totalBudget? totals.totalPlanned/state.totalBudget : 0);
  return React.createElement('div',{className:'container grid', style:{marginTop:'16px', gridTemplateColumns:'2fr 1fr'}},
    React.createElement('div',null,
      Card('Budget Overview',
        React.createElement(React.Fragment,null,
          React.createElement('div',{className:'grid grid-3'},
            Labeled('Total Budget', React.createElement('input',{type:'number', className:'input', value:state.totalBudget, onChange:e=>setState({...state, totalBudget: parseFloat(e.target.value)||0})})),
            Metric('Planned', money(totals.totalPlanned)),
            Metric('Remaining', money(totals.remainingOverall))
          ),
          React.createElement('div',{className:'progress', style:{marginTop:'10px'}}, React.createElement('div',{style:{width: `${Math.round(Math.max(0,Math.min(1,frac))*100)}%`}}))
        )
      ),
      Card('Category Allocation (editable)',
        React.createElement('div',{style:{overflowX:'auto'}},
          React.createElement('table',{className:'table'},
            React.createElement('thead',null,
              React.createElement('tr',null,
                React.createElement('th',null,'Category'),
                React.createElement('th',null,'%'),
                React.createElement('th',null,'Suggested'),
                React.createElement('th',null,'Planned'),
                React.createElement('th',null,'Remaining')
              )
            ),
            React.createElement('tbody',null,
              state.categories.map(c=>{
                const row = totals.byCategory[c.id] || {suggested:0, planned:0};
                const remaining = Math.max(0, row.suggested - row.planned);
                return React.createElement('tr',{key:c.id},
                  React.createElement('td',null, React.createElement('strong',null,c.name)),
                  React.createElement('td',null, React.createElement('input',{type:'number', className:'input', value:c.percent, onChange:e=>updateCat(c.id, {percent: parseFloat(e.target.value)||0}), style:{maxWidth:'90px'}})),
                  React.createElement('td',null, money(row.suggested)),
                  React.createElement('td',null, money(row.planned)),
                  React.createElement('td',null, money(remaining)),
                );
              })
            )
          )
        )
      )
    ),
    React.createElement('div',null,
      Card('Guardrails & Notes', React.createElement('ul',{className:'small', style:{margin:0,paddingLeft:'18px',lineHeight:1.6}},
        React.createElement('li',null,'If any category exceeds suggested, Remaining shows $0 — rebalance as needed.'),
        React.createElement('li',null,'Deposits help track cash flow; add due dates to avoid surprises.'),
        React.createElement('li',null,'Use Vendors tab to add costs; this table updates automatically.')
      )),
      Card('Category Totals',
        React.createElement('div',null,
          state.categories.map(c=>{
            const row = totals.byCategory[c.id] || {suggested:0, planned:0};
            const pct = (state.totalBudget? Math.max(0,Math.min(1,row.planned/state.totalBudget)) : 0);
            return React.createElement('div',{key:c.id, style:{marginBottom:'8px'}},
              React.createElement('div',{className:'small', style:{display:'flex',justifyContent:'space-between'}},
                React.createElement('span',null,c.name),
                React.createElement('span',null,money(row.planned))
              ),
              React.createElement('div',{className:'progress'}, React.createElement('div',{style:{width:`${Math.round(pct*100)}%`}}))
            );
          })
        )
      )
    )
  );
}

function Metric(label, value){
  return React.createElement('div',{className:'kpi'}, React.createElement('div',{className:'small'},label), React.createElement('div',{style:{fontWeight:700}},value));
}
function Row(label, value){
  return React.createElement('div',{className:'small', style:{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}, React.createElement('span',null,label), React.createElement('strong',null,value));
}
function Labeled(label, node){
  return React.createElement('label', {className:'small'}, React.createElement('div',{className:'small', style:{marginBottom:'4px', color:'var(--sub)'}}, label), node);
}

/*** Settings ***/
function SettingsTab({state,setState}){
  const [name,setName] = useState('');
  const [pct,setPct] = useState(5);
  const add = ()=>{
    if(!name.trim()) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    if(state.categories.some(c=>c.id===id)){ alert('Category exists'); return; }
    setState({...state, categories: [...state.categories, {id, name:name.trim(), percent: parseFloat(pct)||0}] });
    setName(''); setPct(5);
  };
  const remove = (id)=>{
    if(!confirm('Remove this category?')) return;
    setState({...state, categories: state.categories.filter(c=>c.id!==id), vendors: state.vendors.map(v=> v.category===id? {...v, category:'misc'} : v)});
  };
  return React.createElement('div',{className:'container grid', style:{marginTop:'16px', gridTemplateColumns:'1fr 1fr'}},
    Card('Profile',
      React.createElement('div',{className:'grid'},
        Labeled('Couple Names', React.createElement('input',{className:'input', value:state.coupleNames, onChange:e=>setState({...state, coupleNames:e.target.value}), placeholder:'Alex & Sam'})),
        Labeled('Wedding Date', React.createElement('input',{type:'date', className:'input', value:state.weddingDate, onChange:e=>setState({...state, weddingDate:e.target.value})}))
      )
    ),
    Card('Categories',
      React.createElement(React.Fragment,null,
        React.createElement('div',{className:'grid grid-3'},
          React.createElement('input',{className:'input', placeholder:'New category (e.g., Favors)', value:name, onChange:e=>setName(e.target.value), style:{gridColumn:'1/3'}}),
          React.createElement('input',{type:'number', className:'input', value:pct, onChange:e=>setPct(e.target.value)})
        ),
        React.createElement('div',{style:{display:'flex',justifyContent:'flex-end',marginTop:'8px'}}, React.createElement('button',{className:'btn', onClick:add},'Add Category')),
        React.createElement('div',{className:'small', style:{marginTop:'8px'}}, 'Existing:'),
        React.createElement('div',null,
          state.categories.map(c=> React.createElement('div',{key:c.id, className:'card', style:{display:'flex',alignItems:'center',justifyContent:'space-between'}},
            React.createElement('div',null, `${c.name} (${c.percent}%)`),
            React.createElement('button',{className:'btn light', onClick:()=>remove(c.id)}, 'Remove')
          ))
        )
      )
    ),
    Card('Data',
      React.createElement('div',{className:'small'},
        'Your data is stored locally in your browser. Export/Import to back up or move devices.',
        React.createElement('div',{style:{marginTop:'8px',display:'flex',gap:'8px'}}, ExportButton(useAppState()), ImportButton(d=>setState(d)))
      )
    ),
    Card('About',
      React.createElement('div',{className:'small'},
        React.createElement('p',null, 'This tool was crafted by North Rim Photography for engaged couples. One-time purchase, no subscriptions.'),
        React.createElement('p',null, 'Ideas to extend for your paid version: user accounts, cloud sync, multi-device support, planner/collab access, reminders via email/SMS, printable timelines, vendor recs by region.')
      )
    )
  );
}

// simple shared state pass-through for Export button in Settings
function useAppState(){ return React.useContext?.(null) || {}; }

function ExportButton(state){
  const onExport = ()=>{
    try{
      const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wedding-planner-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }catch(e){ alert('Export failed'); }
  };
  return React.createElement('button',{className:'btn light', onClick:onExport}, 'Export');
}

function ImportButton(onImport){
  const ref = React.useRef(null);
  const onChange = e => {
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{ const data = JSON.parse(reader.result); onImport?.(data); }catch(e){ alert('Invalid file'); }
    };
    reader.readAsText(file);
  };
  return React.createElement(React.Fragment,null,
    React.createElement('input',{type:'file', accept:'application/json', className:'hidden', ref:ref, onChange}),
    React.createElement('button',{className:'btn light', onClick:()=>ref.current?.click()}, 'Import')
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(React.createElement(App));
