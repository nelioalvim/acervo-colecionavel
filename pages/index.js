import { useState, useMemo, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── Neo Geo AES console icon ────────────────────────────────────────────────
function NeoGeoIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{display:'block',flexShrink:0}}>
      <rect x="4" y="20" width="56" height="32" rx="3" fill="#c4c4bb" stroke="#3a3a36" strokeWidth="1.5"/>
      <rect x="10" y="14" width="44" height="10" rx="2" fill="#2b2b28" stroke="#000" strokeWidth="1"/>
      <rect x="14" y="17" width="36" height="4" rx="1" fill="#1a1a18"/>
      <rect x="8" y="40" width="14" height="6" rx="1" fill="#3a3a36"/>
      <rect x="42" y="40" width="14" height="6" rx="1" fill="#3a3a36"/>
      <circle cx="56" cy="46" r="2" fill="#c9963a"/>
      <rect x="6" y="48" width="52" height="2" fill="#8a8a82"/>
    </svg>
  )
}

const STATUS_OPTIONS = ['', 'ok', 'pane', 'vender']
const GAME_SUBCATEGORIES = [
  'Atari 2600','Atari 7800','Nintendo NES / Famicom','Super Nintendo (SNES)',
  'Sega Master System','Mega Drive / Genesis','Nintendo 64','Nintendo Wii',
  'Nintendo Switch','PlayStation (PS1)','PlayStation 2 (PS2)','PlayStation 3 (PS3)',
  'PlayStation 4 (PS4)','PlayStation 5 (PS5)','Xbox One','Neo Geo AES',
  'Neo Geo MVS','Neo Geo Mini','PSP','Outros'
]
const fmtBRL = (v) => v != null && v !== '' ? `R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—'
const fmtExt = (v) => v != null && v !== '' ? `US$ ${Number(v).toLocaleString('en-US',{minimumFractionDigits:2})}` : '—'
const statusStyle = {
  ok:     { bg:'#1a3a2a', color:'#4ade80', label:'✔ OK' },
  pane:   { bg:'#2a1a1a', color:'#f87171', label:'⚡ PANE' },
  vender: { bg:'#2a2500', color:'#fbbf24', label:'↑ VENDER' },
  '':     { bg:'transparent', color:'#6b7280', label:'—' },
}

const fromDB = (row) => ({
  id: row.id, name: row.name, category: row.category,
  subcategory: row.subcategory || '', acquisition: row.acquisition,
  status: row.status || '', marketExt: row.market_ext ?? '', marketBR: row.market_br ?? '',
})

const toDB = (item) => ({
  name: item.name, category: item.category, subcategory: item.subcategory || '',
  acquisition: item.acquisition || null, status: item.status || '',
  market_ext: item.marketExt !== '' ? Number(item.marketExt) : null,
  market_br: item.marketBR !== '' ? Number(item.marketBR) : null,
})

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Preencha email e senha.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email ou senha incorretos.')
    else onLogin()
    setLoading(false)
  }

  const iStyle = { width:'100%', background:'#0d1117', border:'1px solid #2a3040', color:'#e2d9c8', padding:'12px 14px', borderRadius:6, fontFamily:"'Courier New',monospace", fontSize:14, boxSizing:'border-box' }

  return (
    <div style={{minHeight:'100vh',background:'#0d1117',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Courier New',monospace"}}>
      <div style={{background:'#161b27',border:'1px solid #c9963a',borderRadius:12,padding:40,width:'100%',maxWidth:400}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{display:'flex',justifyContent:'center',marginBottom:12}}><NeoGeoIcon size={48}/></div>
          <h1 style={{margin:0,fontSize:22,fontWeight:900,letterSpacing:3,color:'#c9963a',textTransform:'uppercase'}}>Acervo Colecionável</h1>
          <p style={{margin:'8px 0 0',color:'#6b7280',fontSize:12,letterSpacing:2}}>ÁREA RESTRITA</p>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div>
            <div style={{fontSize:10,color:'#6b7280',letterSpacing:2,marginBottom:6}}>EMAIL</div>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleLogin()}
              placeholder="seu@email.com" style={iStyle}/>
          </div>
          <div>
            <div style={{fontSize:10,color:'#6b7280',letterSpacing:2,marginBottom:6}}>SENHA</div>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleLogin()}
              placeholder="••••••••" style={iStyle}/>
          </div>

          {error && <div style={{background:'#2a1a1a',border:'1px solid #4a2020',borderRadius:6,padding:'10px 14px',color:'#f87171',fontSize:13}}>{error}</div>}

          <button onClick={handleLogin} disabled={loading}
            style={{background:'linear-gradient(135deg,#c9963a,#e8b44a)',color:'#0d1117',border:'none',padding:'14px',borderRadius:8,fontFamily:"'Courier New',monospace",fontWeight:700,fontSize:14,cursor:loading?'not-allowed':'pointer',letterSpacing:1,marginTop:8,opacity:loading?0.7:1}}>
            {loading ? '⟳ ENTRANDO...' : '🔑 ENTRAR'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Price Panel ───────────────────────────────────────────────────────────────
function PricePanel({ item, onApply, onClose }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState({ marketBR: '', marketExt: '' })

  const search = async () => {
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await fetch('/api/search-price-detail', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName: item.name }),
      })
      const data = await res.json()
      setResult(data)
      setDraft({ marketBR: data.marketBR?.price ?? '', marketExt: data.marketExt?.price ?? '' })
    } catch { setError('Erro ao buscar. Tente novamente.') }
    setLoading(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#161b27',border:'1px solid #c9963a',borderRadius:12,width:'100%',maxWidth:560,padding:28,fontFamily:"'Courier New',monospace"}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
          <div>
            <div style={{fontSize:10,color:'#c9963a',letterSpacing:3,marginBottom:4}}>PESQUISA DE PREÇOS · IA + WEB</div>
            <div style={{fontSize:16,fontWeight:700,color:'#e2d9c8'}}>{item.name}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#6b7280',fontSize:20,cursor:'pointer'}}>✕</button>
        </div>
        {!result && !loading && (
          <div style={{textAlign:'center',padding:'20px 0'}}>
            <p style={{color:'#8a7f6f',fontSize:13,marginBottom:20,lineHeight:1.6}}>A IA irá pesquisar no <strong style={{color:'#e2d9c8'}}>Mercado Livre</strong>.</p>
            <button onClick={search} style={{background:'linear-gradient(135deg,#c9963a,#e8b44a)',color:'#0d1117',border:'none',padding:'12px 32px',borderRadius:8,fontFamily:'inherit',fontWeight:700,fontSize:14,cursor:'pointer'}}>🔍 PESQUISAR AGORA</button>
          </div>
        )}
        {loading && (
          <div style={{textAlign:'center',padding:'30px 0'}}>
            <div style={{fontSize:28,marginBottom:12,display:'inline-block',animation:'spin 1s linear infinite'}}>⟳</div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            <div style={{color:'#c9963a',fontSize:13,letterSpacing:2}}>BUSCANDO PREÇOS...</div>
          </div>
        )}
        {error && <div style={{background:'#2a1a1a',border:'1px solid #4a2020',borderRadius:8,padding:16,color:'#f87171',fontSize:13}}>{error}<br/><button onClick={search} style={{marginTop:10,background:'#2a3040',color:'#e2d9c8',border:'none',padding:'6px 16px',borderRadius:5,fontFamily:'inherit',fontSize:12,cursor:'pointer'}}>Tentar novamente</button></div>}
        {result && (
          <div>
            {result.summary && <div style={{background:'#1a2030',borderLeft:'3px solid #c9963a',padding:'10px 14px',borderRadius:'0 6px 6px 0',marginBottom:18,fontSize:12,color:'#a0968a',lineHeight:1.6}}>{result.summary}</div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr',gap:12,marginBottom:18}}>
              {[
                {key:'marketBR',label:'🇧🇷 MERCADO BR',color:'#4ade80',fmt:fmtBRL,data:result.marketBR},
              ].map(col => (
                <div key={col.key} style={{background:'#0d1117',border:`1px solid ${col.color}22`,borderRadius:8,padding:14}}>
                  <div style={{fontSize:10,color:col.color,letterSpacing:2,marginBottom:8}}>{col.label}</div>
                  <div style={{fontSize:10,color:'#6b7280',marginBottom:4}}>{col.data?.source}</div>
                  <div style={{fontSize:18,fontWeight:700,color:col.color,marginBottom:6}}>{col.data?.price!=null?col.fmt(col.data.price):'Não encontrado'}</div>
                  {col.data?.note && <div style={{fontSize:11,color:'#6b7280',lineHeight:1.5}}>{col.data.note}</div>}
                  <div style={{marginTop:10}}>
                    <div style={{fontSize:10,color:'#6b7280',marginBottom:4}}>Ajustar valor:</div>
                    <input type="number" value={draft[col.key]} onChange={e=>setDraft(p=>({...p,[col.key]:e.target.value}))}
                      style={{background:'#161b27',border:'1px solid #2a3040',color:col.color,padding:'5px 8px',borderRadius:4,fontFamily:'inherit',fontSize:13,width:'100%'}}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{onApply(draft);onClose();}} style={{flex:1,background:'#c9963a',color:'#0d1117',border:'none',padding:10,borderRadius:7,fontFamily:'inherit',fontWeight:700,fontSize:13,cursor:'pointer'}}>✔ APLICAR AO ACERVO</button>
              <button onClick={search} style={{background:'#1a2030',color:'#a0968a',border:'1px solid #2a3040',padding:'10px 16px',borderRadius:7,fontFamily:'inherit',fontSize:12,cursor:'pointer'}}>↺ BUSCAR DE NOVO</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function Home() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})
  const [filterCat, setFilterCat] = useState('Todos')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterSubcat, setFilterSubcat] = useState('todos')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({name:'',category:'Consoles e Afins',subcategory:'',acquisition:'',status:'',marketExt:'',marketBR:''})
  const [pricePanel, setPricePanel] = useState(null)
  const [bulkUpdate, setBulkUpdate] = useState(null)
  const [hideValues, setHideValues] = useState(false)
  const [saving, setSaving] = useState(false)

  // Check session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load items when logged in
  useEffect(() => {
    if (!session) return
    const load = async () => {
      const { data, error } = await supabase.from('items').select('*').order('id')
      if (!error && data) setItems(data.map(fromDB))
      setLoading(false)
    }
    load()
  }, [session])

  const CATEGORIES = useMemo(() => ['Todos', ...Array.from(new Set((items||[]).map(i => i.category)))], [items])

  const filtered = useMemo(() => (items||[]).filter(it => {
    const catOk = filterCat === 'Todos' || it.category === filterCat
    const subcatOk = filterCat !== 'Jogos' || filterSubcat === 'todos' || it.subcategory === filterSubcat
    const stOk = filterStatus === 'todos' || it.status === filterStatus
    const srOk = it.name.toLowerCase().includes(search.toLowerCase())
    return catOk && subcatOk && stOk && srOk
  }), [items, filterCat, filterStatus, filterSubcat, search])

  const grouped = useMemo(() => {
    const g = {}
    filtered.forEach(it => { if (!g[it.category]) g[it.category] = []; g[it.category].push(it) })
    return g
  }, [filtered])

  const totalAcquisition = (items||[]).reduce((s,it) => s+(it.acquisition||0), 0)
  const totalBR = (items||[]).reduce((s,it) => s+(it.marketBR?Number(it.marketBR):0), 0)
  const toSell = (items||[]).filter(it => it.status==='vender').length
  const okCount = (items||[]).filter(it => it.status==='ok').length

  // Subtotals based on filtered items
  const isFiltered = filterCat !== 'Todos' || filterStatus !== 'todos' || filterSubcat !== 'todos' || search !== ''
  const subAcquisition = filtered.reduce((s,it) => s+(it.acquisition||0), 0)
  const subBR = filtered.reduce((s,it) => s+(it.marketBR?Number(it.marketBR):0), 0)
  const subCount = filtered.length

  const updateItem = async (id, patch) => {
    setItems(prev => prev.map(it => it.id===id ? {...it,...patch} : it))
    const dbPatch = toDB({...((items||[]).find(i=>i.id===id)||{}), ...patch})
    await supabase.from('items').update(dbPatch).eq('id', id)
  }

  const startEdit = (it) => { setEditId(it.id); setEditData({...it}) }
  const cancelEdit = () => setEditId(null)
  const saveEdit = async () => {
    setSaving(true)
    await updateItem(editId, editData)
    setEditId(null)
    setSaving(false)
  }

  const deleteItem = async (id) => {
    if (!confirm('Remover este item?')) return
    setItems(prev => prev.filter(it => it.id!==id))
    await supabase.from('items').delete().eq('id', id)
  }

  const addItem = async () => {
    if (!newItem.name) return
    const dbItem = toDB({...newItem, acquisition: newItem.acquisition===''?null:Number(newItem.acquisition)})
    const { data } = await supabase.from('items').insert(dbItem).select().single()
    if (data) setItems(prev => [...prev, fromDB(data)])
    setNewItem({name:'',category:'Consoles e Afins',subcategory:'',acquisition:'',status:'',marketExt:'',marketBR:''})
    setShowAdd(false)
  }

  const applyPrices = async (itemId, draft) => {
    const patch = {}
    if (draft.marketBR !== '') patch.marketBR = draft.marketBR
    await updateItem(itemId, patch)
  }

  const runBulkUpdate = async () => {
    const allItems = [...(items||[])]
    setBulkUpdate({ running:true, current:0, done:0, total:allItems.length, log:[] })
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i]
      setBulkUpdate(prev => ({...prev, current:i+1, log:[...prev.log,{id:item.id,name:item.name,status:'buscando'}]}))
      try {
        const res = await fetch('/api/search-price', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ itemName: item.name }),
        })
        const result = await res.json()
        const patch = {}
        if (result.marketBR != null) patch.marketBR = result.marketBR
        if (Object.keys(patch).length) await updateItem(item.id, patch)
        setBulkUpdate(prev => ({...prev, done:prev.done+1, log:prev.log.map(l=>l.id===item.id?{...l,status:'ok',marketBR:result.marketBR}:l)}))
      } catch {
        setBulkUpdate(prev => ({...prev, done:prev.done+1, log:prev.log.map(l=>l.id===item.id?{...l,status:'ok',marketBR:null}:l)}))
      }
    }
    setBulkUpdate(prev => ({...prev, running:false}))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const iStyle = {background:'#161b27',border:'1px solid #2a3040',color:'#e2d9c8',padding:'8px 14px',borderRadius:6,fontFamily:"'Courier New',monospace",fontSize:13}
  const cInput = (color) => ({background:'#0d1117',border:'1px solid #2a3040',color,padding:'4px 8px',borderRadius:4,fontFamily:'inherit',fontSize:13,width:110})

  // Auth loading
  if (authLoading) return (
    <div style={{minHeight:'100vh',background:'#0d1117',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Courier New',monospace",color:'#c9963a',fontSize:14,letterSpacing:2}}>
      ⟳ VERIFICANDO ACESSO...
    </div>
  )

  // Not logged in
  if (!session) return <LoginScreen onLogin={() => {}} />

  // Loading items
  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0d1117',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Courier New',monospace",color:'#c9963a',fontSize:14,letterSpacing:2}}>
      ⟳ CARREGANDO ACERVO...
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0d1117',color:'#e2d9c8',fontFamily:"'Courier New',monospace"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:#0d1117}::-webkit-scrollbar-thumb{background:#2a3040;border-radius:3px}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}select option{background:#0d1117;color:#e2d9c8}`}</style>

      {pricePanel && <PricePanel item={pricePanel} onApply={(d)=>applyPrices(pricePanel.id,d)} onClose={()=>setPricePanel(null)}/>}

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#1a1f2e,#0d1117)',borderBottom:'2px solid #c9963a',padding:'24px 32px'}}>
        <div style={{maxWidth:1300,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:6}}>
              <NeoGeoIcon size={32}/>
              <h1 style={{margin:0,fontSize:26,fontWeight:900,letterSpacing:3,color:'#c9963a',textTransform:'uppercase'}}>Acervo Colecionável</h1>
            </div>
            <p style={{margin:0,color:'#8a7f6f',fontSize:12,letterSpacing:2}}>CONTROLE DE ITENS · PREÇOS DE AQUISIÇÃO E MERCADO · IA</p>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#4ade80'}}/>
            <span style={{fontSize:10,color:'#6b7280',letterSpacing:1}}>SUPABASE · DADOS NA NUVEM</span>
            {saving && <span style={{fontSize:10,color:'#fbbf24',marginLeft:4}}>⟳ salvando...</span>}
            <button onClick={handleLogout} style={{marginLeft:12,background:'none',border:'1px solid #2a3040',color:'#6b7280',padding:'4px 12px',borderRadius:4,fontFamily:'inherit',fontSize:10,cursor:'pointer',letterSpacing:1}}>⏻ SAIR</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{background:'#161b27',borderBottom:'1px solid #2a3040',padding:'14px 32px'}}>
        <div style={{maxWidth:1300,margin:'0 auto',display:'flex',gap:32,flexWrap:'wrap',alignItems:'center'}}>
          {[
            {label:'ITENS NO ACERVO',value:(items||[]).length,color:'#c9963a',hide:false},
            {label:'INVESTIDO',value:`R$ ${totalAcquisition.toLocaleString('pt-BR',{minimumFractionDigits:2})}`,color:'#60a5fa',hide:true},
            {label:'VALOR BR ATUALIZADO',value:totalBR>0?`R$ ${totalBR.toLocaleString('pt-BR',{minimumFractionDigits:2})}`:'—',color:'#4ade80',hide:true},
            {label:'PARA VENDER',value:toSell,color:'#fbbf24',hide:false},
            {label:'STATUS OK',value:okCount,color:'#a78bfa',hide:false},
          ].map(s => (
            <div key={s.label}>
              <div style={{fontSize:10,color:'#6b7280',letterSpacing:2,marginBottom:2}}>{s.label}</div>
              <div style={{fontSize:18,fontWeight:700,color:s.color,filter:s.hide&&hideValues?'blur(6px)':'none',userSelect:s.hide&&hideValues?'none':'auto',transition:'filter 0.2s'}}>{s.value}</div>
            </div>
          ))}
          <button onClick={()=>setHideValues(v=>!v)} style={{marginLeft:8,background:'none',border:'1px solid #2a3040',color:hideValues?'#c9963a':'#6b7280',padding:'5px 10px',borderRadius:4,fontFamily:'inherit',fontSize:13,cursor:'pointer'}}>
            {hideValues?'👁 EXIBIR':'🙈 OCULTAR'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{maxWidth:1300,margin:'20px auto',padding:'0 32px',display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
        <input placeholder="🔍 Buscar item..." value={search} onChange={e=>setSearch(e.target.value)} style={{...iStyle,width:220}}/>
        <select value={filterCat} onChange={e=>{setFilterCat(e.target.value);setFilterSubcat('todos')}} style={iStyle}>
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
        {filterCat==='Jogos' && (
          <select value={filterSubcat} onChange={e=>setFilterSubcat(e.target.value)} style={iStyle}>
            <option value="todos">Todos os consoles</option>
            {GAME_SUBCATEGORIES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={iStyle}>
          <option value="todos">Todos os status</option>
          <option value="ok">✔ OK</option>
          <option value="pane">⚡ Pane</option>
          <option value="vender">↑ Para Vender</option>
          <option value="">Sem status</option>
        </select>
        <div style={{marginLeft:'auto',display:'flex',gap:10}}>
          <button onClick={runBulkUpdate} disabled={bulkUpdate?.running}
            style={{background:bulkUpdate?.running?'#2a3040':'linear-gradient(135deg,#1a3a5a,#2a5a8a)',color:bulkUpdate?.running?'#6b7280':'#60d4fa',border:'1px solid #2a5a8a',padding:'8px 18px',borderRadius:6,fontFamily:'inherit',fontWeight:700,fontSize:13,cursor:bulkUpdate?.running?'not-allowed':'pointer'}}>
            {bulkUpdate?.running?`⟳ ATUALIZANDO ${bulkUpdate.current}/${bulkUpdate.total}...`:'🔄 ATUALIZAR TODOS OS PREÇOS'}
          </button>
          <button onClick={()=>setShowAdd(true)} style={{background:'#c9963a',color:'#0d1117',border:'none',padding:'8px 20px',borderRadius:6,fontFamily:'inherit',fontWeight:700,fontSize:13,cursor:'pointer'}}>+ NOVO ITEM</button>
        </div>
      </div>

      {/* Subtotal bar — only shown when filtered */}
      {isFiltered && (
        <div style={{maxWidth:1300,margin:'-8px auto 16px',padding:'0 32px'}}>
          <div style={{background:'#1a1f2e',border:'1px solid #2a3040',borderRadius:8,padding:'12px 20px',display:'flex',gap:32,flexWrap:'wrap',alignItems:'center'}}>
            <div style={{fontSize:10,color:'#c9963a',letterSpacing:2,fontWeight:700}}>▸ SUBTOTAL DO FILTRO</div>
            <div>
              <div style={{fontSize:10,color:'#6b7280',letterSpacing:2,marginBottom:2}}>ITENS</div>
              <div style={{fontSize:16,fontWeight:700,color:'#c9963a'}}>{subCount}</div>
            </div>
            <div>
              <div style={{fontSize:10,color:'#6b7280',letterSpacing:2,marginBottom:2}}>INVESTIDO</div>
              <div style={{fontSize:16,fontWeight:700,color:'#60a5fa',filter:hideValues?'blur(6px)':'none',transition:'filter 0.2s'}}>
                R$ {subAcquisition.toLocaleString('pt-BR',{minimumFractionDigits:2})}
              </div>
            </div>
            <div>
              <div style={{fontSize:10,color:'#6b7280',letterSpacing:2,marginBottom:2}}>VALOR BR</div>
              <div style={{fontSize:16,fontWeight:700,color:'#4ade80',filter:hideValues?'blur(6px)':'none',transition:'filter 0.2s'}}>
                {subBR > 0 ? `R$ ${subBR.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk progress */}
      {bulkUpdate && (
        <div style={{maxWidth:1300,margin:'0 auto 16px',padding:'0 32px'}}>
          <div style={{background:'#161b27',border:'1px solid #2a5a8a',borderRadius:8,padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <span style={{fontSize:11,color:'#60d4fa',letterSpacing:2,fontWeight:700}}>
                {bulkUpdate.running?'⟳ ATUALIZANDO PREÇOS...':'✔ ATUALIZAÇÃO CONCLUÍDA'}
                <span style={{color:'#6b7280',fontWeight:400,marginLeft:16}}>{bulkUpdate.done}/{bulkUpdate.total} itens</span>
              </span>
              {!bulkUpdate.running && <button onClick={()=>setBulkUpdate(null)} style={{background:'none',border:'none',color:'#6b7280',fontSize:16,cursor:'pointer'}}>✕</button>}
            </div>
            <div style={{background:'#0d1117',borderRadius:4,height:6,marginBottom:14,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${(bulkUpdate.done/bulkUpdate.total)*100}%`,background:'linear-gradient(90deg,#2a5a8a,#60d4fa)',borderRadius:4,transition:'width 0.4s ease'}}/>
            </div>
            <div style={{maxHeight:160,overflowY:'auto',display:'flex',flexDirection:'column',gap:4}}>
              {[...bulkUpdate.log].reverse().map((l,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,fontSize:12}}>
                  <span style={{width:60,color:l.status==='ok'?'#4ade80':'#fbbf24',fontWeight:700}}>{l.status==='ok'?'✔ OK':'⟳ ...'}</span>
                  <span style={{color:'#e2d9c8',flex:1}}>{l.name}</span>
                  {l.status==='ok' && <span style={{color:'#6b7280',fontSize:11}}>{l.marketBR!=null?`BR: R$${Number(l.marketBR).toLocaleString('pt-BR',{minimumFractionDigits:2})}`:'BR: —'}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div style={{maxWidth:1300,margin:'0 auto 16px',padding:'0 32px'}}>
          <div style={{background:'#161b27',border:'1px solid #c9963a',borderRadius:8,padding:20}}>
            <div style={{fontSize:12,color:'#c9963a',letterSpacing:2,marginBottom:14,fontWeight:700}}>NOVO ITEM</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <input placeholder="Nome do item" value={newItem.name} onChange={e=>setNewItem(p=>({...p,name:e.target.value}))} style={{...iStyle,width:220}}/>
              <select value={newItem.category} onChange={e=>setNewItem(p=>({...p,category:e.target.value,subcategory:''}))} style={iStyle}>
                {['Consoles e Afins','Portáteis','Acessórios e Periféricos','Jogos'].map(c=><option key={c}>{c}</option>)}
              </select>
              {newItem.category==='Jogos' && (
                <select value={newItem.subcategory} onChange={e=>setNewItem(p=>({...p,subcategory:e.target.value}))} style={iStyle}>
                  <option value="">-- Selecione o console --</option>
                  {GAME_SUBCATEGORIES.map(s=><option key={s}>{s}</option>)}
                </select>
              )}
              <input placeholder="Preço aquisição (R$)" type="number" value={newItem.acquisition} onChange={e=>setNewItem(p=>({...p,acquisition:e.target.value}))} style={{...iStyle,width:160}}/>
              <select value={newItem.status} onChange={e=>setNewItem(p=>({...p,status:e.target.value}))} style={iStyle}>
                <option value="">Sem status</option><option value="ok">OK</option><option value="pane">PANE</option><option value="vender">VENDER</option>
              </select>
              <button onClick={addItem} style={{background:'#4ade80',color:'#0d1117',border:'none',padding:'7px 18px',borderRadius:5,fontFamily:'inherit',fontWeight:700,fontSize:13,cursor:'pointer'}}>SALVAR</button>
              <button onClick={()=>setShowAdd(false)} style={{background:'#2a3040',color:'#e2d9c8',border:'none',padding:'7px 18px',borderRadius:5,fontFamily:'inherit',fontSize:13,cursor:'pointer'}}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{maxWidth:1300,margin:'0 auto',padding:'0 32px 40px'}}>
        {Object.entries(grouped).map(([cat,catItems])=>(
          <div key={cat} style={{marginBottom:32}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
              <span style={{fontSize:10,color:'#c9963a',letterSpacing:3,fontWeight:700,textTransform:'uppercase'}}>{cat}</span>
              <div style={{flex:1,height:1,background:'#2a3040'}}/>
              <span style={{fontSize:10,color:'#6b7280'}}>{catItems.length} item(ns)</span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #2a3040'}}>
                    {['ITEM','STATUS','PREÇO AQUISIÇÃO','MERCADO BR (R$)','AÇÕES'].map(h=>(
                      <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:10,color:'#6b7280',letterSpacing:2,fontWeight:600,whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catItems.map((it,idx)=>{
                    const isEditing = editId===it.id
                    const st = statusStyle[it.status]||statusStyle['']
                    return (
                      <tr key={it.id} style={{borderBottom:'1px solid #1a2030',background:idx%2===0?'transparent':'#0f1520'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#161b27'}
                        onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'transparent':'#0f1520'}>
                        <td style={{padding:'10px 12px',fontWeight:500,color:it.status==='vender'?'#9ca3af':'#e2d9c8'}}>
                          {isEditing?(
                            <div style={{display:'flex',flexDirection:'column',gap:4}}>
                              <input value={editData.name} onChange={e=>setEditData(p=>({...p,name:e.target.value}))} style={{...cInput('#e2d9c8'),border:'1px solid #c9963a',width:200}}/>
                              {editData.category==='Jogos' && (
                                <select value={editData.subcategory||''} onChange={e=>setEditData(p=>({...p,subcategory:e.target.value}))} style={{background:'#0d1117',border:'1px solid #2a3040',color:'#a78bfa',padding:'3px 6px',borderRadius:4,fontFamily:'inherit',fontSize:11}}>
                                  <option value="">-- console --</option>
                                  {GAME_SUBCATEGORIES.map(s=><option key={s}>{s}</option>)}
                                </select>
                              )}
                            </div>
                          ):(
                            <div>
                              <div>{it.name}</div>
                              {it.category==='Jogos'&&it.subcategory&&<div style={{fontSize:10,color:'#a78bfa',marginTop:2,letterSpacing:1}}>▸ {it.subcategory}</div>}
                            </div>
                          )}
                        </td>
                        <td style={{padding:'10px 12px'}}>
                          {isEditing?(
                            <select value={editData.status} onChange={e=>setEditData(p=>({...p,status:e.target.value}))} style={{background:'#0d1117',border:'1px solid #2a3040',color:'#e2d9c8',padding:'4px 8px',borderRadius:4,fontFamily:'inherit',fontSize:12}}>
                              {STATUS_OPTIONS.map(s=><option key={s} value={s}>{statusStyle[s]?.label||'—'}</option>)}
                            </select>
                          ):(
                            <select value={it.status} onChange={e=>updateItem(it.id,{status:e.target.value})}
                              style={{background:st.bg,color:st.color,border:`1px solid ${st.color}40`,padding:'3px 8px',borderRadius:4,fontFamily:'inherit',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                              {STATUS_OPTIONS.map(s=><option key={s} value={s} style={{background:'#0d1117',color:'#e2d9c8'}}>{statusStyle[s]?.label||'—'}</option>)}
                            </select>
                          )}
                        </td>
                        <td style={{padding:'10px 12px',color:'#60a5fa',fontWeight:600}}>
                          {isEditing?<input type="number" value={editData.acquisition??''} onChange={e=>setEditData(p=>({...p,acquisition:e.target.value===''?null:Number(e.target.value)}))} style={cInput('#60a5fa')}/>:fmtBRL(it.acquisition)}
                        </td>
                        <td style={{padding:'10px 12px',color:'#4ade80',fontWeight:600}}>
                          {isEditing?<input type="number" value={editData.marketBR} onChange={e=>setEditData(p=>({...p,marketBR:e.target.value}))} style={cInput('#4ade80')}/>:fmtBRL(it.marketBR||null)}
                        </td>
                        <td style={{padding:'10px 12px',whiteSpace:'nowrap'}}>
                          {isEditing?(
                            <>
                              <button onClick={saveEdit} style={{background:'#4ade80',color:'#0d1117',border:'none',padding:'4px 12px',borderRadius:4,fontFamily:'inherit',fontWeight:700,fontSize:12,cursor:'pointer',marginRight:6}}>✔</button>
                              <button onClick={cancelEdit} style={{background:'#2a3040',color:'#e2d9c8',border:'none',padding:'4px 12px',borderRadius:4,fontFamily:'inherit',fontSize:12,cursor:'pointer'}}>✕</button>
                            </>
                          ):(
                            <>
                              <button onClick={()=>setPricePanel(it)} style={{background:'#1a2a1a',color:'#c9963a',border:'1px solid #3a3010',padding:'4px 10px',borderRadius:4,fontFamily:'inherit',fontSize:12,cursor:'pointer',marginRight:4}}>🔍</button>
                              <button onClick={()=>startEdit(it)} style={{background:'#1a2a3a',color:'#60a5fa',border:'1px solid #2a4060',padding:'4px 10px',borderRadius:4,fontFamily:'inherit',fontSize:12,cursor:'pointer',marginRight:4}}>✏</button>
                              <button onClick={()=>deleteItem(it.id)} style={{background:'#2a1a1a',color:'#f87171',border:'1px solid #4a2020',padding:'4px 10px',borderRadius:4,fontFamily:'inherit',fontSize:12,cursor:'pointer'}}>🗑</button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {Object.keys(grouped).length===0 && (
          <div style={{textAlign:'center',padding:60,color:'#6b7280'}}>
            <div style={{display:'flex',justifyContent:'center',marginBottom:12,opacity:0.6}}><NeoGeoIcon size={40}/></div>
            <div style={{fontSize:14,letterSpacing:2}}>NENHUM ITEM ENCONTRADO</div>
          </div>
        )}
      </div>
    </div>
  )
}
