import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import './App.css'
import './landing.css'
import { CareerAiError, improveCareerText } from './lib/ai'
import { downloadPortfolioHtml } from './lib/portfolio-export'

type Template = { id: string; profession: string; role: string; layout: number; accent: string; pale: string }
type Portfolio = { name: string; role: string; bio: string; email: string; location: string; accent: string; templateId: string; projects: string[]; visible: Record<string, boolean> }
type AppView = 'home' | 'editor' | 'preview' | 'auth' | 'dashboard'
type AuthMode = 'register' | 'login'
type User = { id: string; email: string; displayName: string; locale: 'ar' | 'en'; emailVerified: boolean; createdAt: string }
type SavedPortfolio = { id: string; title: string; templateId: string; document: Portfolio; status: 'draft' | 'published'; createdAt: string; updatedAt: string }
type ApiError = Error & { code?: string }

const jobs = [
  ['design', 'التصميم', 'مصمم منتجات رقمية'], ['code', 'البرمجة', 'مطوّر برمجيات'], ['photo', 'التصوير', 'مصوّر فوتوغرافي'],
  ['writing', 'الكتابة', 'كاتب ومحرر'], ['consulting', 'الاستشارات', 'مستشار أعمال'], ['education', 'التعليم', 'مدرّس'],
  ['architecture', 'العمارة', 'مهندس معماري'], ['marketing', 'التسويق', 'مسوّق رقمي'], ['health', 'الصحة', 'متخصص صحي'], ['business', 'الأعمال', 'صاحب مشروع'],
  ['law', 'القانون', 'مستشار قانوني'], ['engineering', 'الهندسة', 'مهندس'], ['people', 'الموارد البشرية', 'متخصص موارد بشرية'], ['events', 'الفعاليات', 'منظم فعاليات'],
]
const layouts = ['Editorial', 'Canvas', 'Orbit', 'Studio', 'Minimal']
const demoPalettes: [string, string][] = [['#8b5cff','#67e5ff'], ['#67e5ff','#4f81ff'], ['#fc75d9','#9b75ff'], ['#9fffc0','#67e5ff'], ['#ffbb78','#fc75d9']]
const colors = ['#8b5cff','#61dfff','#fa75d5','#b4a0ff','#5e83ff','#ff9e72','#7de5bb','#d7a5ff','#f1a8d8','#f7d78c']
const templates: Template[] = jobs.flatMap((job, j) => layouts.map((_, l) => ({ id: job[0] + '-' + l, profession: job[1], role: job[2], layout: l, accent: colors[(j + l * 2) % colors.length], pale: ['#f8e8dd','#e9e7ff','#dff1ea','#fff0ce','#e4edf1'][(j + l) % 5] })))
const initial: Portfolio = { name:'سلمى حسن', role:'مصممة منتجات رقمية', bio:'أصمم منتجات رقمية بسيطة وقريبة من الناس. أحوّل الأفكار المعقدة إلى تجارب واضحة، وأحب العمل مع فرق تشارك هدفًا حقيقيًا.', email:'hello@example.com', location:'القاهرة، مصر', accent:'#8b5cff', templateId:'design-0', projects:['تجربة مصرفية أسهل','منصة تعلّم عربية','هوية استوديو نون'], visible:{about:true,projects:true,contact:true} }
const imageUrls = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=88',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1000&q=85',
]
const imageAlt = ['صورة استرشادية لواجهة شخصية إبداعية','مساحة عمل رقمية حديثة','صورة شخصية استرشادية','لوحة ألوان وتصميم بصري','مشهد بصري ملهم','فريق يعمل على مشروع']

function readSaved(): Portfolio {
  try {
    const saved = JSON.parse(localStorage.getItem('taqdom.portfolio') || '{}') as Partial<Portfolio>
    const visible = saved.visible && typeof saved.visible === 'object' ? saved.visible : {}
    const projects = Array.isArray(saved.projects) ? saved.projects.filter((item): item is string => typeof item === 'string').slice(0, 24) : initial.projects
    return {
      ...initial, ...saved,
      name: typeof saved.name === 'string' ? saved.name.slice(0,120) : initial.name,
      role: typeof saved.role === 'string' ? saved.role.slice(0,180) : initial.role,
      bio: typeof saved.bio === 'string' ? saved.bio.slice(0,2400) : initial.bio,
      email: typeof saved.email === 'string' ? saved.email.slice(0,254) : initial.email,
      location: typeof saved.location === 'string' ? saved.location.slice(0,160) : initial.location,
      accent: typeof saved.accent === 'string' && /^#[0-9a-f]{6}$/i.test(saved.accent) ? saved.accent : initial.accent,
      templateId: typeof saved.templateId === 'string' && templates.some(t => t.id === saved.templateId) ? saved.templateId : initial.templateId,
      projects,
      visible: { about: typeof visible.about === 'boolean' ? visible.about : initial.visible.about, projects: typeof visible.projects === 'boolean' ? visible.projects : initial.visible.projects, contact: typeof visible.contact === 'boolean' ? visible.contact : initial.visible.contact },
    }
  } catch { return initial }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin', cache: 'no-store' })
  const payload = await response.json().catch(() => ({})) as { error?: string } & T
  if (!response.ok) {
    const error = new Error(payload.error || 'request_failed') as ApiError
    error.code = payload.error || 'request_failed'
    throw error
  }
  return payload
}
function normalisePortfolio(value: unknown, fallback: Portfolio): Portfolio {
  if (!value || typeof value !== 'object') return fallback
  const raw = value as Partial<Portfolio>
  return {
    ...fallback, ...raw,
    name: typeof raw.name === 'string' ? raw.name : fallback.name,
    role: typeof raw.role === 'string' ? raw.role : fallback.role,
    bio: typeof raw.bio === 'string' ? raw.bio : fallback.bio,
    email: typeof raw.email === 'string' ? raw.email : fallback.email,
    location: typeof raw.location === 'string' ? raw.location : fallback.location,
    accent: typeof raw.accent === 'string' && /^#[0-9a-f]{6}$/i.test(raw.accent) ? raw.accent : fallback.accent,
    templateId: typeof raw.templateId === 'string' && templates.some(t => t.id === raw.templateId) ? raw.templateId : fallback.templateId,
    projects: Array.isArray(raw.projects) ? raw.projects.filter((p): p is string => typeof p === 'string').slice(0,24) : fallback.projects,
    visible: { ...fallback.visible, ...(raw.visible && typeof raw.visible === 'object' ? raw.visible : {}) },
  }
}

export default function App() {
  const query = new URLSearchParams(location.search)
  const [portfolio, setPortfolio] = useState<Portfolio>(readSaved)
  const [view, setView] = useState<AppView>(query.has('preview') ? 'preview' : query.has('auth') ? 'auth' : 'home')
  const [language, setLanguage] = useState<'ar'|'en'>(query.get('lang') === 'en' ? 'en' : 'ar')
  const [authMode, setAuthMode] = useState<AuthMode>(query.get('auth') === 'login' ? 'login' : 'register')
  const [category, setCategory] = useState('الكل')
  const [search, setSearch] = useState('')
  const [saved, setSaved] = useState(true)
  const [mobilePanel, setMobilePanel] = useState(false)
  const [showAllTemplates, setShowAllTemplates] = useState(false)
  const [device, setDevice] = useState<'desktop'|'mobile'>('desktop')
  const [aiBusy, setAiBusy] = useState<'bio'|'headline'|null>(null)
  const [aiMessage, setAiMessage] = useState('')
  const [user, setUser] = useState<User|null>(null)
  const [accountLoading, setAccountLoading] = useState(true)
  const [accountPortfolios, setAccountPortfolios] = useState<SavedPortfolio[]>([])
  const [portfolioId, setPortfolioId] = useState<string|null>(null)
  const [accountError, setAccountError] = useState('')
  const [accountBusy, setAccountBusy] = useState(false)
  const en = language === 'en'
  const chosen = templates.find(t => t.id === portfolio.templateId) || templates[0]
  const filtered = useMemo(() => templates.filter(t => (category === 'الكل' || t.profession === category) && (!search || (t.profession + t.role + layouts[t.layout]).toLowerCase().includes(search.toLowerCase()))), [category, search])

  useEffect(() => { document.documentElement.lang = language; document.documentElement.dir = en ? 'ltr' : 'rtl' }, [language, en])
  useEffect(() => {
    let active = true
    apiRequest<{user:User}>('/api/auth/me').then(async result => {
      if (!active) return
      setUser(result.user)
      try { const data = await apiRequest<{portfolios:SavedPortfolio[]}>('/api/portfolios'); if (active) setAccountPortfolios(data.portfolios) }
      catch { if (active) setAccountError(en ? 'Could not load your saved sites.' : 'تعذر تحميل مواقعك المحفوظة.') }
    }).catch(() => { if (active) setUser(null) }).finally(() => { if (active) setAccountLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (view === 'preview') return
    setSaved(false)
    const id = window.setTimeout(async () => {
      try { localStorage.setItem('taqdom.portfolio', JSON.stringify(portfolio)) } catch { /* browser storage may be disabled */ }
      if (view === 'editor' && user && portfolioId) {
        try {
          await apiRequest('/api/portfolios/' + portfolioId, { method:'PUT', body:JSON.stringify({ title: portfolio.name || (en ? 'My portfolio' : 'موقعي الشخصي'), templateId:portfolio.templateId, document:portfolio }) })
          setSaved(true)
        } catch { setSaved(false); setAccountError(en ? 'Cloud save failed. Your latest edit remains on this device.' : 'فشل الحفظ السحابي. آخر تعديل ما زال محفوظًا على الجهاز.') }
      } else {
        setSaved(true)
      }
    }, 450)
    return () => window.clearTimeout(id)
  }, [portfolio, view, user, portfolioId])

  const update = (key: keyof Portfolio, value: unknown) => setPortfolio(p => ({ ...p, [key]: value }))
  const goHome = () => { history.replaceState({}, '', location.pathname); setView('home'); setAccountError(''); window.scrollTo(0,0) }
  const openAuth = (mode: AuthMode) => { setAuthMode(mode); history.pushState({}, '', '?auth=' + mode + (en ? '&lang=en' : '')); setView('auth'); setAccountError(''); window.scrollTo(0,0) }
  const openDashboard = () => { history.replaceState({}, '', location.pathname); setView('dashboard'); setAccountError(''); window.scrollTo(0,0) }
  const signOut = async () => {
    try { await apiRequest('/api/auth/logout', { method:'POST', body:'{}' }) } catch { /* local workspace still remains available */ }
    setUser(null); setAccountPortfolios([]); setPortfolioId(null); goHome()
  }
  const handleAuthSuccess = async (nextUser: User) => {
    setUser(nextUser); setAccountError(''); setView('dashboard'); history.replaceState({}, '', location.pathname)
    try { const result = await apiRequest<{portfolios:SavedPortfolio[]}>('/api/portfolios'); setAccountPortfolios(result.portfolios) }
    catch { setAccountError(en ? 'Your account is ready, but your workspace did not load. Refresh to retry.' : 'حسابك اتعمل، لكن تعذر تحميل مساحة العمل. حدّث الصفحة وحاول تاني.') }
    window.scrollTo(0,0)
  }
  const createPortfolio = async () => {
    if (!user) { openAuth('register'); return }
    setAccountBusy(true); setAccountError('')
    const fresh: Portfolio = { ...initial, name:user.displayName, role:'', bio:'', email:user.email, location:'', projects:[], visible:{about:true,projects:true,contact:true}, templateId:'design-0', accent:'#8b5cff' }
    try {
      const result = await apiRequest<{portfolio:SavedPortfolio}>('/api/portfolios', { method:'POST', body:JSON.stringify({ title: en ? 'My first portfolio' : 'موقعي الشخصي', templateId:fresh.templateId, document:fresh }) })
      setPortfolio(normalisePortfolio(result.portfolio.document, fresh)); setPortfolioId(result.portfolio.id); setAccountPortfolios(items => [result.portfolio, ...items]); history.replaceState({}, '', location.pathname); setView('editor'); window.scrollTo(0,0)
    } catch (error) { setAccountError(error instanceof Error && error.message === 'portfolio_limit_reached' ? (en ? 'You reached the current project limit.' : 'وصلت للحد الحالي للمشاريع.') : (en ? 'We could not create your site. Please try again.' : 'ما قدرناش ننشئ موقعك دلوقتي. جرّب تاني.')) }
    finally { setAccountBusy(false) }
  }
  const openPortfolio = (item: SavedPortfolio) => {
    const next = normalisePortfolio(item.document, initial)
    setPortfolio(next); setPortfolioId(item.id); history.replaceState({}, '', location.pathname); setView('editor'); setAccountError(''); window.scrollTo(0,0)
  }
  const chooseTemplate = (id: string) => {
    setPortfolio(p => ({...p, templateId:id}))
    if (user) { setPortfolioId(null); void createPortfolioWithTemplate(id) }
    else { history.replaceState({}, '', location.pathname); setView('editor'); window.scrollTo(0,0) }
  }
  const createPortfolioWithTemplate = async (templateId: string) => {
    if (!user) { openAuth('register'); return }
    setAccountBusy(true); setAccountError('')
    const fresh: Portfolio = { ...initial, name:user.displayName, role:'', bio:'', email:user.email, location:'', projects:[], visible:{about:true,projects:true,contact:true}, templateId, accent:templates.find(t=>t.id===templateId)?.accent || '#8b5cff' }
    try {
      const result = await apiRequest<{portfolio:SavedPortfolio}>('/api/portfolios', { method:'POST', body:JSON.stringify({ title: en ? 'My portfolio' : 'موقعي الشخصي', templateId, document:fresh }) })
      setPortfolio(fresh); setPortfolioId(result.portfolio.id); setAccountPortfolios(items=>[result.portfolio,...items]); history.replaceState({}, '', location.pathname); setView('editor'); window.scrollTo(0,0)
    } catch { setAccountError(en ? 'We could not create the project.' : 'تعذر إنشاء المشروع.') }
    finally { setAccountBusy(false) }
  }
  const preview = () => { try { localStorage.setItem('taqdom.portfolio', JSON.stringify(portfolio)) } catch { /* ignore storage failure */ } const url = new URL(location.href); url.searchParams.set('preview','1'); history.pushState({},'',url); setView('preview'); window.scrollTo(0,0) }
  const exportSite = () => downloadPortfolioHtml(portfolio, chosen, language)
  const vars = { '--accent':portfolio.accent, '--pale':chosen.pale } as CSSProperties

  const improveText = async (kind: 'bio' | 'headline') => {
    const text = kind === 'bio' ? portfolio.bio : portfolio.role
    if (!text.trim()) { setAiMessage(en ? 'Add a little text first, then ask AI to improve it.' : 'اكتب شوية تفاصيل الأول، وبعدها اطلب تحسين النص.'); return }
    setAiBusy(kind); setAiMessage('')
    try {
      const result = await improveCareerText({ text, kind, locale: language })
      update(kind === 'bio' ? 'bio' : 'role', result.text)
      const remaining = typeof result.remainingToday === 'number' ? (en ? ' · ' + result.remainingToday + ' AI uses left today' : ' · متبقي ' + result.remainingToday + ' محاولات اليوم') : ''
      setAiMessage((en ? 'Text improved. Review it before publishing.' : 'تم تحسين النص. راجعه قبل النشر.') + remaining)
    } catch (error) {
      const code = error instanceof CareerAiError ? error.code : 'network_error'
      const messages: Record<string, { ar: string; en: string }> = {
        text_too_short: { ar:'النص قصير جدًا. أضف تفاصيل أكثر.', en:'The text is too short. Add a little more detail.' },
        text_too_long: { ar:'النص أطول من الحد المسموح.', en:'The text exceeds the allowed length.' },
        daily_limit_reached: { ar:'وصلت للحد اليومي للتجربة. جرّب غدًا.', en:'You reached today’s AI limit. Try again tomorrow.' },
        daily_capacity_reached: { ar:'مساعد الكتابة مشغول حاليًا. جرّب لاحقًا.', en:'The writing assistant is busy. Please try later.' },
        service_not_configured: { ar:'مساعد الكتابة غير مهيأ حاليًا.', en:'The writing assistant is not configured yet.' },
        quota_service_unavailable: { ar:'تعذر التحقق من حد الاستخدام. لم يُرسل الطلب.', en:'Usage limits could not be checked. The request was not sent.' },
        request_timeout: { ar:'الطلب استغرق وقتًا طويلًا. جرّب مرة أخرى.', en:'The request timed out. Please try again.' },
        invalid_response: { ar:'وصل رد غير مفهوم من الخدمة.', en:'The service returned an invalid response.' },
        network_error: { ar:'تعذر الاتصال بمساعد الكتابة. يمكنك متابعة التحرير بشكل طبيعي.', en:'Could not connect to the writing assistant. You can keep editing normally.' },
      }
      const message = messages[code] || { ar:'لم نتمكن من تحسين النص حاليًا.', en:'We could not improve the text right now.' }
      setAiMessage(en ? message.en : message.ar)
    } finally { setAiBusy(null) }
  }

  if (view === 'home') return <LandingPage language={language} user={user} onLanguage={()=>setLanguage(en?'ar':'en')} onStart={()=>user ? openDashboard() : openAuth('register')} onLogin={()=>user ? openDashboard() : openAuth('login')} onTemplate={chooseTemplate} />
  if (view === 'auth') return <AuthScreen mode={authMode} language={language} onLanguage={()=>setLanguage(en?'ar':'en')} onBack={goHome} onMode={openAuth} onSuccess={handleAuthSuccess} />
  if (view === 'dashboard') return <Dashboard language={language} user={user} loading={accountLoading} busy={accountBusy} items={accountPortfolios} error={accountError} onLanguage={()=>setLanguage(en?'ar':'en')} onHome={goHome} onCreate={()=>void createPortfolio()} onOpen={openPortfolio} onLogout={()=>void signOut()} onClearError={()=>setAccountError('')} />
  if (view === 'preview') return <div className="preview-screen" style={vars}><div className="preview-bar"><button onClick={()=>{history.replaceState({},'',location.pathname);setView('editor')}}>← {en?'Back to editor':'العودة للمحرر'}</button><span className="preview-status"><i/>{en?'Private preview':'معاينة خاصة'}</span><button className="small-action" onClick={exportSite}>{en?'Download HTML':'تنزيل HTML'} ↓</button></div><PortfolioCanvas data={portfolio} template={chosen} language={language}/></div>

  return <div className="app-shell editor-mode">
    <header className="topbar"><a className="brand" href="#" onClick={e=>{e.preventDefault();user?openDashboard():goHome()}}><BrandMark/><span>taqdom<span className="brand-dot">.</span></span></a>
      <div className="editor-breadcrumb">{en?'My workspace':'مساحة عملي'} <b>/</b> <strong>{portfolio.name || (en?'New portfolio':'موقعي الجديد')}</strong></div>
      <div className="top-actions"><span className={'save-indicator '+(saved?'is-saved':'')}><i/>{saved?(en?'Saved':'تم الحفظ'):(en?'Saving…':'جارٍ الحفظ…')}</span><button className="lang-switch" onClick={()=>setLanguage(en?'ar':'en')}>{en?'عربي':'EN'}</button>{user?<button className="button button-light hide-mobile" onClick={openDashboard}>{en?'Workspace':'مساحة العمل'}</button>:<button className="button button-light hide-mobile" onClick={()=>openAuth('register')}>{en?'Create account':'إنشاء حساب'}</button>}<button className="button button-dark hide-mobile" onClick={exportSite}>{en?'Export site':'نزّل الموقع'} <span>↓</span></button></div>
    </header>
    <main className="editor-layout">
      <aside className={'editor-sidebar '+(mobilePanel?'panel-open':'')}><div className="sidebar-scroll">
        <div className="editor-side-title"><div><small>{en?'YOUR PORTFOLIO':'موقعك الشخصي'}</small><h2>{en?'Make it yours':'ظبّطه بطريقتك'}</h2></div><button className="close-panel" onClick={()=>setMobilePanel(false)}>×</button></div>
        <div className="editor-group-label">{en?'01 — Profile':'01 — بياناتك'}</div>
        <label className="field-label">{en?'Your name':'اسمك'}<input value={portfolio.name} onChange={e=>update('name',e.target.value)}/></label>
        <label className="field-label">{en?'What you do':'بتشتغل إيه؟'}<input value={portfolio.role} maxLength={180} onChange={e=>update('role',e.target.value)}/></label>
        <button type="button" className="ai-action" disabled={aiBusy!==null} onClick={()=>void improveText('headline')}>{aiBusy==='headline'?'✳ '+(en?'Improving…':'جارٍ التحسين…'):'✦ '+(en?'Improve headline with AI':'حسّن المسمى بالذكاء الاصطناعي')}</button>
        <label className="field-label">{en?'About you':'نبذة عنك'}<textarea value={portfolio.bio} rows={4} maxLength={2400} onChange={e=>update('bio',e.target.value)}/><small className="field-counter">{portfolio.bio.length}/2400</small></label>
        <button type="button" className="ai-action" disabled={aiBusy!==null} onClick={()=>void improveText('bio')}>{aiBusy==='bio'?'✳ '+(en?'Improving…':'جارٍ التحسين…'):'✦ '+(en?'Improve bio with AI':'حسّن النبذة بالذكاء الاصطناعي')}</button>
        <p className={'ai-status '+(aiMessage?'has-message':'')} aria-live="polite">{aiMessage || (en?'AI only runs when you click. Review every suggestion.':'الذكاء الاصطناعي لا يعمل إلا بطلبك. راجع كل اقتراح.')}</p>
        <label className="field-label">{en?'Contact email':'إيميل التواصل'}<input type="email" value={portfolio.email} onChange={e=>update('email',e.target.value)}/></label>
        <label className="field-label">{en?'Location':'مكانك'}<input value={portfolio.location} onChange={e=>update('location',e.target.value)}/></label>
        <div className="editor-group-label">{en?'02 — Visual identity':'02 — الهوية البصرية'}</div>
        <div className="control-section"><div className="control-heading"><b>{en?'Accent color':'اللون الأساسي'}</b><span>{portfolio.accent}</span></div><div className="color-options">{colors.map(c=><button className={portfolio.accent===c?'selected':''} key={c} style={{background:c}} aria-label={'Use '+c} onClick={()=>update('accent',c)}/>)}<label className="custom-color"><span>＋</span><input type="color" value={portfolio.accent} onChange={e=>update('accent',e.target.value)} aria-label="لون مخصص"/></label></div></div>
        <div className="control-section"><div className="control-heading"><b>{en?'Visible sections':'الأقسام الظاهرة'}</b></div>{[['about',en?'About me':'عني'],['projects',en?'Selected work':'أعمال مختارة'],['contact',en?'Contact':'تواصل معي']].map(([key,label])=><label className="toggle-row" key={key}><span>{label}</span><input type="checkbox" checked={Boolean(portfolio.visible[key])} onChange={e=>update('visible',{...portfolio.visible,[key]:e.target.checked})}/><i/></label>)}</div>
        <div className="control-section"><div className="control-heading"><b>{en?'Project names':'أسماء المشاريع'}</b></div>{portfolio.projects.map((project,index)=><label className="field-label project-field" key={index}>{en?'Project '+(index+1):'مشروع '+(index+1)}<input value={project} onChange={e=>update('projects',portfolio.projects.map((p,i)=>i===index?e.target.value:p))}/></label>)}<button className="add-project" onClick={()=>update('projects',[...portfolio.projects,''])}>＋ {en?'Add project':'إضافة مشروع'}</button></div>
        <div className="editor-group-label">{en?'03 — Templates':'03 — القوالب'}</div>
        <div className="control-section"><div className="control-heading"><b>{en?'Choose a direction':'اختار شكل الموقع'}</b><span>{templates.length} {en?'starting points':'بداية'}</span></div><input className="search-input" value={search} onChange={e=>{setSearch(e.target.value);setShowAllTemplates(false)}} placeholder={en?'Search profession or style…':'ابحث عن مجال أو تصميم…'}/><div className="category-pills">{['الكل',...jobs.map(j=>j[1])].map(c=><button className={category===c?'active':''} key={c} onClick={()=>{setCategory(c);setShowAllTemplates(false)}}>{c}</button>)}</div><div className="template-list">{filtered.slice(0,showAllTemplates?filtered.length:10).map(t=><button className={t.id===portfolio.templateId?'chosen':''} key={t.id} onClick={()=>update('templateId',t.id)}><span className="template-mini" style={{'--accent':t.accent,'--pale':t.pale} as CSSProperties}><i/></span><span><b>{t.profession}</b><small>{layouts[t.layout]}</small></span>{t.id===portfolio.templateId&&<b className="checkmark">✓</b>}</button>)}</div>{filtered.length>10&&<button className="show-more" onClick={()=>setShowAllTemplates(v=>!v)}>{showAllTemplates?(en?'Show fewer':'عرض أقل'):(en?'Show all '+filtered.length:'اعرض كل الـ '+filtered.length)} {showAllTemplates?'↑':'↓'}</button>}</div>
      </div><div className="sidebar-bottom"><button className="button button-primary button-wide" onClick={preview}>{en?'Preview my site':'عاين موقعي'} <span>↗</span></button><button className="button button-light button-wide" onClick={exportSite}>{en?'Export HTML':'نزّل نسخة HTML'} <span>↓</span></button><div className="local-note">{user?(saved?(en?'☁ Saved to your account':'☁ محفوظ على حسابك'):(en?'Saving to cloud…':'جارٍ الحفظ سحابيًا…')):(en?'Saved only on this device':'محفوظ على الجهاز فقط')}</div></div></aside>
      <section className="editor-workspace"><div className="editor-toolbar"><div className="toolbar-start"><button className="mobile-panel-button" onClick={()=>setMobilePanel(true)}>☷ {en?'Edit':'تعديل'}</button><div className="mode-switch"><button className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')}>▣ <span>{en?'Desktop':'كمبيوتر'}</span></button><button className={device==='mobile'?'active':''} onClick={()=>setDevice('mobile')}>▯ <span>{en?'Mobile':'موبايل'}</span></button></div></div><div className="toolbar-end"><span className="canvas-live-status"><i/> {en?'Live preview':'معاينة مباشرة'}</span><button className="button button-primary toolbar-publish" onClick={preview}>{en?'Preview ↗':'معاينة ↗'}</button></div></div>
        <div className="canvas-area"><div className={'canvas-browser '+(device==='mobile'?'mobile-frame':'')}><div className="canvas-browser-bar"><span className="browser-dots"><i/><i/><i/></span><span className="canvas-address">{(portfolio.name.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/gi,'-').replace(/^-|-$/g,'')||'my-portfolio')}.taqdom.me</span><span className="canvas-zoom">{device==='desktop'?'100%':'390 px'}</span></div><PortfolioCanvas data={portfolio} template={chosen} language={language}/></div><p className="canvas-hint"><span>✦</span>{user?(en?'Your changes are saved to your account.':'تعديلاتك محفوظة على حسابك.'):(en?'This is a local demo. Create an account to save your project across devices.':'دي تجربة محلية. أنشئ حساب عشان تحفظ موقعك وتفتحه من أي جهاز.')}</p></div>
      </section>
    </main>
  </div>
}

function BrandMark() {
  return <svg className="taqdom-brand-glyph" viewBox="0 0 48 48" role="img" aria-label="Taqdom">
    <defs>
      <linearGradient id="taqdom-glyph-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d7c3ff"/><stop offset=".43" stopColor="#9368ff"/><stop offset=".78" stopColor="#4a7fff"/><stop offset="1" stopColor="#68eaff"/></linearGradient>
      <linearGradient id="taqdom-glyph-side" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a38bff"/><stop offset="1" stopColor="#25c9fb"/></linearGradient>
      <linearGradient id="taqdom-glyph-shadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7350db"/><stop offset="1" stopColor="#182c8b"/></linearGradient>
    </defs>
    <path d="M7 10 31 10 41 1 17 1Z" fill="#d9c9ff"/>
    <path d="M7 10 31 10 26 18 12 18Z" fill="url(#taqdom-glyph-gradient)"/>
    <path d="M31 10 41 1 36 12 26 18Z" fill="#5266ff"/>
    <path d="M14 18 27 18 23 27 23 37 18 45 13 34 13 22Z" fill="url(#taqdom-glyph-gradient)"/>
    <path d="M23 27 27 18 33 24 25 45 18 45 23 37Z" fill="url(#taqdom-glyph-side)"/>
    <path d="M13 22 18 30 18 45 13 34Z" fill="url(#taqdom-glyph-shadow)"/>
    <path d="M15 13 25 13 23 16 13 16Z" fill="#ffffff" opacity=".7"/>
    <path d="M29 9 36 3 33 10 27 14Z" fill="#7defff" opacity=".9"/>
  </svg>
}

function SpectralEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas?.parentElement
    const context = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !host || !context) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let width = 1
    let height = 1
    let frame = 0
    let time = 0
    let pointer = { x: -1000, y: -1000, active: false }
    let particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number; phase: number; hue: number }> = []

    const seedParticles = () => {
      const count = Math.min(84, Math.max(24, Math.round((width * height) / 22500)))
      particles = Array.from({ length: count }, (_, index) => ({
        x: (index * 0.61803398875 % 1) * width,
        y: (index * 0.7548776662 % 1) * height,
        vx: Math.sin(index * 12.3) * 0.12,
        vy: Math.cos(index * 5.7) * 0.1,
        radius: 0.7 + ((index * 7) % 10) / 10,
        phase: index * 1.71,
        hue: [260, 196, 292, 228][index % 4],
      }))
    }

    const resize = () => {
      const rect = host.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      seedParticles()
      draw(0, true)
    }

    const draw = (elapsed: number, staticFrame = false) => {
      context.clearRect(0, 0, width, height)
      const phase = staticFrame ? 0 : elapsed * 0.00019
      const sky = context.createLinearGradient(0, height * 0.08, width, height * 0.92)
      sky.addColorStop(0, 'rgba(145, 89, 255, 0.025)')
      sky.addColorStop(0.52, 'rgba(57, 194, 255, 0.018)')
      sky.addColorStop(1, 'rgba(239, 87, 218, 0.025)')
      context.fillStyle = sky
      context.fillRect(0, 0, width, height)

      // Four fine spectral currents create depth without a heavy WebGL dependency.
      for (let ribbon = 0; ribbon < 4; ribbon++) {
        const center = height * (0.2 + ribbon * 0.195)
        const amplitude = Math.min(height * 0.095, 95) * (0.65 + ribbon * 0.09)
        const grad = context.createLinearGradient(0, center - amplitude, width, center + amplitude)
        grad.addColorStop(0, 'rgba(171, 117, 255, 0)')
        grad.addColorStop(0.22, 'rgba(157, 109, 255, 0.12)')
        grad.addColorStop(0.52, 'rgba(102, 224, 255, 0.16)')
        grad.addColorStop(0.78, 'rgba(240, 120, 244, 0.105)')
        grad.addColorStop(1, 'rgba(171, 117, 255, 0)')
        context.beginPath()
        for (let segment = 0; segment <= 72; segment++) {
          const x = width * segment / 72
          const normalized = x / width
          const wave = Math.sin(normalized * Math.PI * (1.45 + ribbon * 0.18) + phase * (ribbon % 2 ? -1 : 1) + ribbon * 1.5)
            + 0.42 * Math.sin(normalized * Math.PI * 3.8 - phase * 1.4 + ribbon)
          const y = center + wave * amplitude * 0.53
          if (segment === 0) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        context.strokeStyle = grad
        context.lineWidth = ribbon === 1 ? 1.15 : 0.7
        context.shadowColor = ribbon % 2 ? '#67e5ff' : '#a783ff'
        context.shadowBlur = ribbon === 1 ? 14 : 8
        context.stroke()
      }
      context.shadowBlur = 0

      const pointerX = pointer.x
      const pointerY = pointer.y
      for (const particle of particles) {
        if (!staticFrame) {
          particle.x += particle.vx + Math.sin(phase * 3 + particle.phase) * 0.16
          particle.y += particle.vy + Math.cos(phase * 2 + particle.phase) * 0.09
          if (pointer.active) {
            const dx = particle.x - pointerX
            const dy = particle.y - pointerY
            const distance = Math.sqrt(dx * dx + dy * dy)
            if (distance > 0 && distance < 175) {
              const force = (175 - distance) / 175 * 0.23
              particle.x += dx / distance * force
              particle.y += dy / distance * force
            }
          }
          if (particle.x < -15) particle.x = width + 15
          if (particle.x > width + 15) particle.x = -15
          if (particle.y < -15) particle.y = height + 15
          if (particle.y > height + 15) particle.y = -15
        }
      }

      // Sparse connections form a living constellation; only near neighbours connect.
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance > 122) continue
          const alpha = (1 - distance / 122) * 0.18
          context.beginPath()
          context.moveTo(a.x, a.y)
          context.lineTo(b.x, b.y)
          context.strokeStyle = 'rgba(166, 157, 255, ' + alpha.toFixed(3) + ')'
          context.lineWidth = 0.6
          context.stroke()
        }
      }

      for (const particle of particles) {
        const pulse = staticFrame ? 0.55 : 0.35 + (Math.sin(phase * 7 + particle.phase) + 1) * 0.27
        context.beginPath()
        context.arc(particle.x, particle.y, particle.radius + pulse * 0.45, 0, Math.PI * 2)
        context.fillStyle = 'hsla(' + particle.hue + ', 100%, 84%, ' + (0.24 + pulse * 0.44).toFixed(3) + ')'
        context.shadowColor = 'hsla(' + particle.hue + ', 100%, 72%, 0.8)'
        context.shadowBlur = particle.radius > 1.2 ? 9 : 4
        context.fill()
      }
      context.shadowBlur = 0
    }

    const animate = (stamp: number) => {
      if (document.visibilityState === 'hidden') { frame = 0; return }
      time = stamp
      draw(time)
      frame = window.requestAnimationFrame(animate)
    }
    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top, active: true }
    }
    const onPointerLeave = () => { pointer.active = false; pointer.x = -1000; pointer.y = -1000 }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (frame) window.cancelAnimationFrame(frame)
        frame = 0
      } else if (!reducedMotion.matches && !frame) {
        frame = window.requestAnimationFrame(animate)
      }
    }
    const onMotionPreference = () => {
      if (reducedMotion.matches) {
        if (frame) window.cancelAnimationFrame(frame)
        frame = 0
        draw(0, true)
      } else if (document.visibilityState !== 'hidden' && !frame) {
        frame = window.requestAnimationFrame(animate)
      }
    }

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    observer?.observe(host)
    resize()
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('blur', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibility)
    reducedMotion.addEventListener?.('change', onMotionPreference)
    if (!reducedMotion.matches) frame = window.requestAnimationFrame(animate)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('blur', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      reducedMotion.removeEventListener?.('change', onMotionPreference)
    }
  }, [])

  return <canvas ref={canvasRef} className="spectral-engine-canvas" aria-hidden="true" />
}

function LandingPage({language,user,onLanguage,onStart,onLogin,onTemplate}:{language:'ar'|'en';user:User|null;onLanguage:()=>void;onStart:()=>void;onLogin:()=>void;onTemplate:(id:string)=>void}) {
  const en=language==='en'
  const [demoPaletteIndex, setDemoPaletteIndex] = useState(0)
  const [demoLayout, setDemoLayout] = useState(0)
  const demoPalette = demoPalettes[demoPaletteIndex] || demoPalettes[0]
  const featured=[templates[0],templates[7],templates[15],templates[23],templates[31],templates[39]]
  const titles=en?['The designer','The storyteller','The maker','The independent','The builder','The founder']:['مصمم بذوق خاص','حكاية بصور','أفكار بتتحرك','شغل مستقل','مهندس التفاصيل','صاحب مشروع']
  return <div className="landing" dir={en?'ltr':'rtl'}>
    <header className="site-header" id="site-top"><a href="#home" className="site-brand" onClick={e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'})}}><BrandMark/><span className="brand-word-stack"><b>TAQDOM</b><small>{en?'Build Your Digital Future':'ابني مستقبلك الرقمي'}</small></span></a><nav className="site-nav-links" aria-label={en?'Main navigation':'التنقل الرئيسي'}><a className="nav-home" href="#home">{en?'Home':'الرئيسية'}</a><a href="#gallery">{en?'Templates':'القوالب'}</a><a href="#features">{en?'Features':'المميزات'}</a><a href="#pricing">{en?'Pricing':'الأسعار'}</a><a href="#about">{en?'About':'عن تقدّم'}</a></nav><div className="site-header-actions"><span className="header-sparkle" aria-hidden="true">☼</span><span className="header-divider"/><button className="site-lang" onClick={onLanguage}>{en?'عربي':'عربي'}</button><button className="site-login" onClick={onLogin}>{user?(en?'Workspace':'مساحة عملي'):(en?'Log in':'دخول')}</button><button className="site-cta-small" onClick={onStart}>{en?'Get Started':'ابدأ الآن'} <span>↗</span></button></div></header>
    <main>
      <section className="lux-hero" id="home"><SpectralEngine/><div className="aurora-field" aria-hidden="true"><span className="aurora-blob blob-violet"/><span className="aurora-blob blob-blue"/><span className="aurora-blob blob-magenta"/><span className="aurora-grid"/><span className="aurora-star star-a">✳</span><span className="aurora-star star-b">✦</span><span className="aurora-star star-c">+</span></div><div className="lux-hero-copy"><div className="lux-kicker"><span className="kicker-light"/> {en?'AI-POWERED PORTFOLIO STUDIO':'استوديو صناعة المواقع الشخصية'}</div><h1>{en?<>Your Vision.<br/>Our <em>Technology.</em></>:<>رؤيتك.<br/>بتكنولوجيا <em>تتقدّم.</em></>}</h1><p>{en?'Create a stunning, professional website or portfolio in minutes — no coding skills needed. Build your personal brand and show the world what you can do.':'أنشئ موقعًا شخصيًا وبورتفوليو احترافيًا في دقائق — من غير كتابة كود. ابنِ هويتك الرقمية وخلّي العالم يشوف شغلك بأفضل صورة.'}</p><div className="lux-hero-actions"><button className="lux-primary" onClick={onStart}>{en?'Start Building Now':'ابدأ بناء موقعك'} <span>↗</span></button><a href="#studio" className="lux-secondary"><span className="watch-play" aria-hidden="true">▷</span>{en?'Explore the Studio':'استكشف الاستوديو'} <span>↗</span></a></div><div className="hero-proof-row"><span className="proof-live-dot"/><span>{en?'Arabic + English':'عربي وإنجليزي'}</span><span className="proof-separator">·</span><span>{en?'Desktop + mobile':'كمبيوتر وموبايل'}</span><span className="proof-separator">·</span><span>{en?'No code needed':'من غير كود'}</span></div></div>
        <div className="lux-hero-stage" aria-label={en?'Interactive website builder preview':'معاينة استوديو بناء المواقع'}>
          <div className="aurora-orbit orbit-one"/><div className="aurora-orbit orbit-two"/><div className="aurora-orbit orbit-three"/>
          <div className={`hero-mockup demo-layout-${demoLayout}`} style={{'--demo-accent':demoPalette[0],'--demo-contrast':demoPalette[1]} as CSSProperties}>
            <div className="mockup-browser-head"><div className="mockup-window-dots"><i/><i/><i/></div><div className="mockup-address"><span className="address-lock">⌑</span> mira.taqdom.me <span className="address-live">LIVE PREVIEW</span></div><div className="mockup-browser-actions"><span>↗</span><span>•••</span></div></div>
            <div className="mockup-app-bar"><div className="mockup-mini-brand"><BrandMark/><span>TAQDOM <small>STUDIO</small></span></div><div className="mockup-app-tabs"><span className="active">Design</span><span>Layers</span><span>Assets</span></div><div className="mockup-app-right"><span className="autosave-pill"><i/> Saved</span><b>Share ↗</b></div></div>
            <div className="mockup-builder">
              <aside className="mockup-rail"><span className="selected">◫</span><span>▤</span><span>◉</span><span>Aa</span><span>⌘</span><span>⚙</span><div className="rail-avatar">M</div></aside>
              <div className="mockup-page">
                <div className="mockup-canvas-nav"><b>MIRA<span>.</span></b><span>WORK&nbsp;&nbsp; ABOUT&nbsp;&nbsp; CONTACT</span><span className="mini-nav-pill"><i/> Available</span></div>
                <div className="mockup-canvas-hero"><div className="canvas-headline"><small>INDEPENDENT DESIGNER · CAIRO</small><strong>Make room<br/><em>for wonder.</em></strong><p>Digital worlds with a little more soul.</p><span className="mockup-canvas-link">EXPLORE MY WORK <b>↗</b></span></div><div className="mockup-canvas-image"><img src={imageUrls[0]} alt={imageAlt[0]} loading="lazy"/><span className="image-index">01 / 04</span><i>✳</i></div></div>
                <div className="mockup-project-label"><span>SELECTED PROJECTS</span><span>SCROLL TO EXPLORE ↓</span></div>
                <div className="mockup-project-row"><div className="mockup-project-art art-one"><img src={imageUrls[3]} alt="" loading="lazy"/><span>Forms of feeling</span></div><div className="mockup-project-art art-two"><img src={imageUrls[1]} alt="" loading="lazy"/><span>Future, in focus</span></div><div className="mockup-project-art art-three"><img src={imageUrls[4]} alt="" loading="lazy"/><span>Objects of joy</span></div></div>
              </div>
              <aside className="mockup-inspector"><div className="inspector-title"><span>DESIGN PANEL</span><b>•••</b></div><div className="inspector-section"><span>Selected element</span><b className="inspector-selected">Hero section <i>⌄</i></b></div><div className="inspector-section"><span>Layout <small className="interactive-hint">LIVE</small></span><div className="layout-selectors">{['▦','▤','◫','▥'].map((symbol,index)=><button type="button" key={symbol} className={demoLayout===index?'picked':''} aria-label={'Preview layout '+(index+1)} aria-pressed={demoLayout===index} onClick={()=>setDemoLayout(index)}>{symbol}</button>)}</div></div><div className="inspector-section"><span>Typography</span><b className="inspector-font">Aa <small>Editorial display</small></b></div><div className="inspector-section"><span>Color system <small className="interactive-hint">LIVE</small></span><div className="inspector-colors">{demoPalettes.map(([primary,secondary],index)=><button type="button" key={primary} className={demoPaletteIndex===index?'picked':''} style={{'--swatch-a':primary,'--swatch-b':secondary} as CSSProperties} aria-label={'Use color palette '+(index+1)} aria-pressed={demoPaletteIndex===index} onClick={()=>setDemoPaletteIndex(index)}/>)}</div><small className="hex-label">{demoPalette[0].toUpperCase()}　 {demoPalette[1].toUpperCase()}</small></div><div className="inspector-section"><span>Spacing</span><div className="spacing-meter"><i/><i/><i/><i/><i/><i/></div></div><div className="inspector-footer"><span>✦ AI DESIGN ASSIST</span><i>↗</i></div></aside>
            </div>
            <div className="mockup-bottom-bar"><span><i/> Desktop canvas</span><span>Auto-layout enabled</span><span>⌘ K <small>Quick actions</small></span></div>
          </div>
          <div className="hero-phone" aria-label={en?'A mobile portfolio preview':'معاينة البورتفوليو على الموبايل'}>
            <div className="phone-device">
              <div className="phone-island"><i/></div>
              <div className="phone-screen">
                <div className="phone-status"><span>9:41</span><span>◔ ◈ ▰</span></div>
                <div className="phone-nav"><b>TAQDOM<span>.</span></b><span>☰</span></div>
                <div className="phone-photo"><img src={imageUrls[2]} alt={imageAlt[2]} loading="lazy"/><span>DESIGNER · CAIRO</span></div>
                <div className="phone-content"><small>PORTFOLIO / 2026</small><strong>Build Your<br/><em>Portfolio.</em></strong><p>Let your work speak before you do.</p><span className="phone-button">Get Started ↗</span></div>
                <div className="phone-projects"><img src={imageUrls[3]} alt="" loading="lazy"/><img src={imageUrls[4]} alt="" loading="lazy"/><img src={imageUrls[1]} alt="" loading="lazy"/></div>
                <div className="phone-bottom"><i/><i/><i/><i/></div>
              </div>
            </div>
          </div>
          <div className="hero-benefit-card benefit-templates"><span className="benefit-icon benefit-grid">▦</span><div><b>{en?'Modern templates':'قوالب احترافية'}</b><small>{en?'70+ starting combinations':'أكثر من 70 تركيبة بداية'}</small></div></div>
          <div className="hero-benefit-card benefit-ai"><span className="benefit-icon benefit-spark">✧</span><div><b>{en?'AI writing assistant':'مساعد كتابة ذكي'}</b><small>{en?'Improve your content':'حسّن محتواك'}</small></div></div>
          <div className="hero-benefit-card benefit-cloud"><span className="benefit-icon benefit-cloud-glyph">☁</span><div><b>{en?'Cloud-saved drafts':'حفظ سحابي للمسودات'}</b><small>{en?'Open your work anywhere':'افتح شغلك من أي جهاز'}</small></div></div>
          <div className="floating-component floating-palette"><span className="palette-swatch" style={{background:'linear-gradient(135deg,'+demoPalette[0]+','+demoPalette[1]+')'}}/> <div><b>{en?'Color system':'منظومة الألوان'}</b><small>{en?'Live art direction':'اتجاه بصري مباشر'}</small></div><span className="palette-hex">{demoPalette[0].toUpperCase()}</span></div>
          <div className="floating-component floating-published"><span className="published-icon">↗</span><div><b>{en?'Ready for the world':'جاهز للعالم'}</b><small>{en?'Responsive by design':'متجاوب تلقائيًا'}</small></div><span className="published-check">✓</span></div>
          <div className="stage-coordinate">30°02'40.8"N&nbsp; 31°14'08.2"E</div>
        </div>
      </section>
      <section className="platform-capabilities" id="features" aria-label={en?'Taqdom capabilities':'مميزات تقدّم'}><div className="capability-item"><span className="capability-icon">▦</span><div><b>{en?'70+ Starting Points':'أكثر من 70 تركيبة'}</b><small>{en?'Across professional categories':'لمجالات مهنية متنوعة'}</small></div></div><div className="capability-item"><span className="capability-icon">✧</span><div><b>{en?'AI Writing Assistant':'مساعد الكتابة الذكي'}</b><small>{en?'Optional, on demand':'بناءً على طلبك'}</small></div></div><div className="capability-item"><span className="capability-icon">◉</span><div><b>{en?'Live Design Controls':'تحكم بصري مباشر'}</b><small>{en?'See edits as you work':'شوف التعديل لحظة بلحظة'}</small></div></div><div className="capability-item"><span className="capability-icon capability-language">ع<span>↔</span>A</span><div><b>{en?'Arabic + English':'العربية والإنجليزية'}</b><small>{en?'RTL and LTR layouts':'دعم الاتجاهين'}</small></div></div><div className="capability-item"><span className="capability-icon">☁</span><div><b>{en?'Cloud-Saved Drafts':'مسودات محفوظة سحابيًا'}</b><small>{en?'With your account':'مع حسابك الشخصي'}</small></div></div></section>
      <section className="gallery-section" id="gallery"><div className="gallery-heading"><div><div className="section-overline">{en?'THE COLLECTION · 01':'مجموعة القوالب · 01'}</div><h2>{en?<>Different paths.<br/><em>Distinct presence.</em></>:<>كل مجال له لغته.<br/><em>اختار لغتك.</em></>}</h2></div><div className="gallery-side-copy"><p>{en?'Explore styles made for different ways of working. Each starting point can be tailored with your colors, words, and sections.':'استكشف أشكال مختلفة تناسب طرق شغل مختلفة. كل بداية تقدر تشكّلها بألوانك وكلامك والأقسام اللي تناسبك.'}</p><button className="gallery-all-link" onClick={onStart}>{en?'Explore all '+templates.length+' starting points':'استكشف '+templates.length+' نقطة بداية'} <span>↗</span></button></div></div>
        <div className="lux-template-grid">{featured.map((t,i)=><button className={'lux-template-card card-layout-'+i} key={t.id} onClick={()=>onTemplate(t.id)}><div className="lux-template-visual"><img src={imageUrls[i]} alt={imageAlt[i]} loading="lazy"/><div className="template-visual-shade"/><div className="template-index">0{i+1} / TAQDOM</div><div className="template-overlay-ui"><span>{['STUDIO / PERSONAL','THE VISUAL JOURNAL','MADE TO BUILD','INDEPENDENT / 01','FORM MEETS FUNCTION','A BRAND OF ONE'][i]}</span><b>{['Shape the unseen.','Collect the moments.','Think. Make. Repeat.','Room for your ideas.','Built with intention.','Your next chapter.'][i]}</b><i>↗</i></div><div className="template-chip">{t.profession}</div></div><div className="lux-template-meta"><div><h3>{titles[i]}</h3><p>{en?['Editorial and expressive','Warm, visual and reflective','Clean, thoughtful and modern','Confident, understated and clear','Structured, precise and refined','Personal, bold and distinctive'][i]:['تحريري وجريء','بصري ودافئ','نظيف وعملي','واثق وهادئ','دقيق ومنظم','شخصي ولافت'][i]}</p></div><span className="template-open">↗</span></div></button>)}</div>
        <div className="gallery-bottom-note"><span className="gallery-note-symbol">✳</span><span>{en?'70 profession-and-layout combinations to begin with':'70 تركيبة من المجالات والتصميمات لتبدأ منها'}</span><span>{en?'More visual systems are being developed':'وتطوير مستمر لأنظمة التصميم'}</span></div>
      </section>
      <section className="studio-section" id="studio"><div className="studio-editorial"><div className="section-overline">{en?'YOUR STUDIO · 02':'استوديو التصميم · 02'}</div><h2>{en?<>Not just a template.<br/><em>A site you shape.</em></>:<>مش مجرد قالب.<br/><em>موقع بتشكّله بإيدك.</em></>}</h2><p>{en?'Edit your story, switch the visual direction, adjust the color, show or hide sections — and see your changes while you work.':'عدّل قصتك، غيّر شكل الموقع، اختار اللون، أظهر الأقسام أو اخفيها — وشوف النتيجة لحظة بلحظة وإنت بتشتغل.'}</p><button className="studio-link" onClick={onStart}>{en?'Step into the studio':'ادخل استوديو التصميم'} <span>↗</span></button><div className="studio-number">02<span> / 04</span></div></div>
        <div className="studio-showcase"><div className="studio-panel-top"><span className="panel-pill"><i/> LIVE STUDIO</span><span className="panel-save">{en?'Saved changes':'حفظ التعديلات'} <b>✓</b></span></div><div className="studio-control-rail"><span className="rail-selected">◫</span><span>◉</span><span>Aa</span><span>▤</span><span>⚙</span></div><div className="studio-page-preview"><div className="studio-page-nav"><b>SH.</b><span>WORK　 ABOUT　 CONTACT</span><i>↗</i></div><div className="studio-page-hero"><div><small>DESIGNER · CAIRO</small><strong>Creating for<br/><em>real life.</em></strong><p>Digital products with a little more feeling.</p><span className="preview-link-sim">DISCOVER MY WORK ↗</span></div><div className="studio-person"><img src={imageUrls[2]} alt="" loading="lazy"/></div></div><div className="studio-project-row"><img src={imageUrls[3]} alt="" loading="lazy"/><img src={imageUrls[1]} alt="" loading="lazy"/><img src={imageUrls[4]} alt="" loading="lazy"/></div></div><div className="studio-control-card color-card"><span>{en?'YOUR PALETTE':'ألوانك'}</span><div><i/><i/><i/><i/><i/></div><small>#BDFF62　#17171C</small></div><div className="studio-control-card type-card"><span>TYPE SYSTEM</span><b>Aa</b><small>Editorial / 48 px</small></div></div>
      </section>
      <section className="craft-section" id="how-it-works"><div className="craft-head"><div className="section-overline">{en?'THE PROCESS · 03':'الرحلة · 03'}</div><h2>{en?<>A considered process.<br/><em>Nothing complicated.</em></>:<>خطوات بسيطة.<br/><em>نتيجة تليق بيك.</em></>}</h2></div><div className="craft-steps"><article><span>01</span><div className="step-glyph">◫</div><h3>{en?'Choose your direction':'اختار الاتجاه'}</h3><p>{en?'Start with a visual style that fits your work and your personality.':'ابدأ بشكل بصري قريب من مجالك وشخصيتك.'}</p></article><article><span>02</span><div className="step-glyph">✳</div><h3>{en?'Make it yours':'ضيف لمستك'}</h3><p>{en?'Write your story, select your colors, and curate the sections people see.':'اكتب قصتك، اختار ألوانك، ورتّب الأقسام اللي الناس هتشوفها.'}</p></article><article><span>03</span><div className="step-glyph">↗</div><h3>{en?'Share your work':'شارك شغلك'}</h3><p>{en?'Preview your page on desktop and mobile, then export a copy to publish.':'عاين موقعك على الكمبيوتر والموبايل، ونزّل نسخة جاهزة للنشر.'}</p></article></div></section>
      <section className="image-story" id="about"><div className="story-image"><img src={imageUrls[5]} alt={imageAlt[5]} loading="lazy"/><span>YOUR WORK, IN CONTEXT / 2026</span></div><div className="story-copy"><div className="section-overline">{en?'MADE FOR REAL PEOPLE':'لكل شخص عنده حاجة يقدّمها'}</div><h2>{en?<>Wherever you<br/>are in your story,<br/><em>make it visible.</em></>:<>مهما كانت خطوتك،<br/>خلّي اللي بتعمله<br/><em>يبان للناس.</em></>}</h2><p>{en?'Your first project, your next opportunity, the business you are growing, or a career you are proud of. A little space online can make the next step feel closer.':'أول مشروع، فرصة جديدة، بيزنس بتكبره، أو مشوار مهني فخور بيه. مساحة صغيرة على الإنترنت ممكن تقرّب منك الخطوة الجاية.'}</p><button className="lux-primary story-cta" onClick={onStart}>{en?'Make your space':'اعمل مساحتك'} <span>↗</span></button></div></section>
      <section className="closing-lux" id="pricing"><div className="closing-orb orb-one"/><div className="closing-orb orb-two"/><div className="section-overline">{en?'PLANS & PRICING · IN DEVELOPMENT':'الخطط والأسعار قيد التجهيز'}</div><h2>{en?<>Your next chapter<br/><em>starts here.</em></>:<>الخطوة الجاية<br/><em>تبدأ من هنا.</em></>}</h2><p>{en?'We are shaping the launch plans now. Create an account to follow the next steps — paid plans are not active yet.':'بنجهّز خطط الإطلاق حاليًا. أنشئ حسابًا لمتابعة الخطوات القادمة — الاشتراكات المدفوعة غير مفعّلة حتى الآن.'}</p><button className="closing-button" onClick={onStart}>{en?'Build your portfolio':'ابدأ موقعك دلوقتي'} <span>↗</span></button><div className="closing-foot">{en?'No code needed · Arabic and English · Pricing to be announced':'من غير كود · عربي وإنجليزي · الأسعار سيُعلن عنها لاحقًا'}</div></section>
    </main><footer className="lux-footer"><a href="#" className="site-brand" onClick={e=>{e.preventDefault();window.scrollTo(0,0)}}><BrandMark/><span>taqdom<span className="site-brand-dot">.</span></span></a><span>{en?'A little more room for your work.':'مساحة أكبر لشغلك.'}</span><div><a href="#gallery">{en?'Templates':'القوالب'}</a><a href="#studio">{en?'Studio':'المحرر'}</a><button onClick={onLogin}>{en?'Your account':'حسابك'}</button></div><small>© TAQDOM.ME · 2026</small></footer>
  </div>
}

function AuthScreen({mode,language,onLanguage,onBack,onMode,onSuccess}:{mode:AuthMode;language:'ar'|'en';onLanguage:()=>void;onBack:()=>void;onMode:(mode:AuthMode)=>void;onSuccess:(user:User)=>void}) {
  const en=language==='en'
  const [displayName,setDisplayName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [showPassword,setShowPassword]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const register=mode==='register'
  const errorMessages:Record<string,{ar:string;en:string}> = {
    invalid_email:{ar:'اكتب بريد إلكتروني صحيح.',en:'Enter a valid email address.'},
    invalid_name:{ar:'اكتب اسمك (حرفين على الأقل).',en:'Enter your name (at least 2 characters).'},
    weak_password:{ar:'كلمة المرور لازم تكون 10 أحرف على الأقل.',en:'Your password must be at least 10 characters.'},
    email_already_registered:{ar:'البريد ده مسجّل بالفعل. سجّل دخولك بدلًا من ذلك.',en:'This email is already registered. Sign in instead.'},
    invalid_credentials:{ar:'البريد أو كلمة المرور غير صحيحة.',en:'Email or password is incorrect.'},
    too_many_attempts:{ar:'محاولات كتير في وقت قصير. استنى شوية وحاول تاني.',en:'Too many attempts. Please wait a bit and try again.'},
  }
  const submit=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();setBusy(true);setError('');setNotice('')
    try {
      const result=await apiRequest<{user:User}>(register?'/api/auth/register':'/api/auth/login',{method:'POST',body:JSON.stringify(register?{displayName,email,password,locale:language}:{email,password})})
      setNotice(en?'Your account is ready. Opening your workspace…':'حسابك جاهز. بنفتح مساحة العمل…')
      onSuccess(result.user)
    } catch(err) {
      const code=err instanceof Error?err.message:'request_failed'
      const mapped=errorMessages[code]
      setError(mapped?(en?mapped.en:mapped.ar):(en?'We could not connect. Please try again.':'تعذر الاتصال بالخدمة. حاول مرة تانية.'))
    } finally {setBusy(false)}
  }
  return <div className="auth-shell" dir={en?'ltr':'rtl'}><header className="auth-topbar"><button className="auth-brand" onClick={onBack}><BrandMark/><span>taqdom<span className="site-brand-dot">.</span></span></button><div><button className="site-lang" onClick={onLanguage}>{en?'عربي':'EN'}</button><button className="auth-back" onClick={onBack}>← {en?'Back to site':'العودة للموقع'}</button></div></header>
    <main className="auth-grid"><section className="auth-visual"><img src={imageUrls[0]} alt="" fetchPriority="high"/><div className="auth-image-overlay"/><div className="auth-visual-content"><span className="auth-visual-label"><i/> TAQDOM / YOUR OWN SPACE</span><h1>{en?<>A good story<br/>deserves a<br/><em>beautiful home.</em></>:<>كل حكاية حلوة<br/>تستحق مكان<br/><em>يليق بيها.</em></>}</h1><p>{en?'Your work, your direction, your next step — all in one place.':'شغلك، وطريقتك، وخطوتك الجاية — كلهم في مكان واحد.'}</p><div className="auth-photo-credit">PERSONAL WEBSITES · THOUGHTFULLY MADE</div></div><div className="auth-sticker"><span>✳</span><b>{en?'Your corner of the internet':'مساحتك الخاصة على الإنترنت'}</b></div></section>
      <section className="auth-form-side"><div className="auth-form-wrap"><div className="auth-form-kicker">{en?'YOUR WORKSPACE STARTS HERE':'مساحتك بتبدأ من هنا'}</div><h2>{register?(en?'Create your account':'أنشئ حسابك'):(en?'Welcome back':'أهلًا بعودتك')}</h2><p className="auth-form-intro">{register?(en?'Save your work, pick up where you left off, and build a site that feels like you.':'احفظ شغلك، وارجع كمّل في أي وقت، وابني موقع يشبهك فعلًا.'):(en?'Sign in to open your workspace and continue building.':'سجّل دخولك وافتح مساحة العمل وكمّل موقعك.')}</p>
        <form onSubmit={submit} className="auth-form">{register&&<label>{en?'Your name':'اسمك'}<input autoComplete="name" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder={en?'e.g. Abdullah Yehia':'مثال: عبدالله يحيى'} minLength={2} maxLength={100} required/></label>}<label>{en?'Email address':'البريد الإلكتروني'}<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" maxLength={254} required/></label><label>{en?'Password':'كلمة المرور'}<div className="password-input-wrap"><input type={showPassword?'text':'password'} autoComplete={register?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={register?(en?'At least 10 characters':'10 أحرف على الأقل'):(en?'Enter your password':'اكتب كلمة المرور')} minLength={register?10:1} maxLength={128} required/><button type="button" onClick={()=>setShowPassword(s=>!s)}>{showPassword?(en?'Hide':'إخفاء'):(en?'Show':'إظهار')}</button></div></label>
          {register&&<p className="auth-password-hint"><span>✓</span> {en?'Use at least 10 characters. Never reuse a password.':'استخدم 10 أحرف على الأقل، ومتستخدمش كلمة مرور بتستعملها في مكان تاني.'}</p>}
          {error&&<p className="auth-error" role="alert">{error}</p>}{notice&&<p className="auth-notice" role="status">{notice}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy?(en?'Please wait…':'ثواني…'):(register?(en?'Create my account':'إنشاء الحساب'):(en?'Sign in to Taqdom':'تسجيل الدخول'))}<span>↗</span></button></form>
        <div className="auth-switch">{register?(en?'Already have an account?':'عندك حساب بالفعل؟'):(en?'New to Taqdom?':'أول مرة مع تقدّم؟')} <button onClick={()=>onMode(register?'login':'register')}>{register?(en?'Sign in':'سجّل دخولك'):(en?'Create an account':'أنشئ حسابًا')}</button></div>
        <div className="auth-security-note"><span className="auth-lock">⌑</span><span>{en?'Your password is stored as a salted, one-way hash. Session cookies are HttpOnly and Secure.':'كلمة المرور بتتخزن بصيغة مشفّرة أحادية الاتجاه، وجلسة الدخول محمية بملف ارتباط آمن.'}</span></div>
        <p className="auth-legal-note">{en?'Email verification and password recovery are not available yet. Use an email you control and keep your password safe.':'تأكيد البريد واستعادة كلمة المرور لسه مش متاحين. استخدم بريد تقدر توصله، واحفظ كلمة المرور في مكان آمن.'}</p>
      </div><div className="auth-side-bottom"><span>TAQDOM.ME</span><span>{en?'Made to move you forward':'مساحة تساعدك تتقدم'}</span></div></section></main>
  </div>
}

function Dashboard({language,user,loading,busy,items,error,onLanguage,onHome,onCreate,onOpen,onLogout,onClearError}:{language:'ar'|'en';user:User|null;loading:boolean;busy:boolean;items:SavedPortfolio[];error:string;onLanguage:()=>void;onHome:()=>void;onCreate:()=>void;onOpen:(item:SavedPortfolio)=>void;onLogout:()=>void;onClearError:()=>void}) {
  const en=language==='en'
  return <div className="dashboard-shell" dir={en?'ltr':'rtl'}><header className="dashboard-top"><button className="auth-brand" onClick={onHome}><BrandMark/><span>taqdom<span className="site-brand-dot">.</span></span></button><div className="dashboard-top-actions"><button className="site-lang" onClick={onLanguage}>{en?'عربي':'EN'}</button><button className="dashboard-logout" onClick={onLogout}>{en?'Sign out':'تسجيل الخروج'} ↗</button></div></header>
    <main className="dashboard-main"><div className="dashboard-welcome"><div><div className="section-overline">{en?'YOUR CREATIVE SPACE':'مساحتك الإبداعية'}</div><h1>{en?<>Good to have you,<br/><em>{user?.displayName || 'there'}.</em></>:<>أهلًا بيك،<br/><em>{user?.displayName || 'صاحب الحكاية'}.</em></>}</h1><p>{en?'Your projects live here. Open an existing site or create a new one when you are ready.':'مشاريعك هتكون هنا. افتح موقع موجود أو ابدأ موقع جديد وقت ما تحب.'}</p></div><div className="dashboard-welcome-art"><img src={imageUrls[3]} alt="" loading="lazy"/><div><span>TAQDOM STUDIO</span><b>{en?'Make it yours.':'خلّيه يشبهك.'}</b></div></div></div>
      {error&&<div className="dashboard-error" role="status"><span>{error}</span><button onClick={onClearError}>×</button></div>}
      <div className="dashboard-project-heading"><div><span className="section-overline">{en?'YOUR PROJECTS':'مشاريعك'}</span><h2>{en?'A place for your next step':'كل مشروع له مكانه'}</h2></div><button className="dashboard-create" onClick={onCreate} disabled={busy}>{busy?(en?'Creating…':'جارٍ الإنشاء…'):(en?'＋ New website':'＋ موقع جديد')}</button></div>
      {loading?<div className="dashboard-loading"><span className="loading-orbit"/> {en?'Loading your workspace…':'بنحمّل مساحة العمل…'}</div>:items.length===0?<div className="dashboard-empty"><div className="empty-art"><span>✳</span><i/><b/></div><h3>{en?'Your first website starts here.':'موقعك الأول مستنيك.'}</h3><p>{en?'Start with a blank canvas and shape your own corner of the internet.':'ابدأ بمساحة جديدة وشكّل ركنك الخاص على الإنترنت.'}</p><button className="dashboard-create" onClick={onCreate} disabled={busy}>{en?'Create my first site':'أنشئ أول موقع ليا'} ↗</button></div>:<div className="dashboard-project-grid">{items.map((item,index)=><button className="dashboard-project-card" key={item.id} onClick={()=>onOpen(item)}><div className={'dashboard-project-cover cover-'+(index%6)}><img src={imageUrls[index%imageUrls.length]} alt="" loading="lazy"/><span className="project-draft">{item.status==='published'?(en?'Published':'منشور'):(en?'Draft':'مسودة')}</span><div className="cover-brand">t<span>.</span></div><div className="cover-title">{item.document?.name||item.title}<small>{item.document?.role|| (en?'Personal portfolio':'موقع شخصي')}</small></div></div><div className="dashboard-project-info"><div><h3>{item.title}</h3><p>{en?'Edited':'آخر تعديل'} · {new Date(item.updatedAt).toLocaleDateString(en?'en-GB':'ar-EG',{day:'numeric',month:'short'})}</p></div><span>↗</span></div></button>)}</div>}
      <div className="dashboard-help-row"><span className="help-star">✳</span><div><b>{en?'Small steps. Beautiful work.':'خطوات بسيطة، وشغل يبان.'}</b><p>{en?'You can edit your content, colors, and visible sections at any time.':'تقدر تعدّل المحتوى والألوان والأقسام في أي وقت.'}</p></div><button onClick={onHome}>{en?'Explore Taqdom':'استكشف تقدّم'} ↗</button></div>
    </main><footer className="dashboard-footer"><span>taqdom<span>.</span></span><span>{en?'Your space is yours.':'المساحة دي مساحتك.'}</span><small>{user?.email}</small></footer>
  </div>
}

function PortfolioCanvas({data,template,language}:{data:Portfolio;template:Template;language:'ar'|'en'}) {
  const en=language==='en'
  const projects=en?['A calmer way to bank','Learning without limits','A brand built to grow']:data.projects
  const portraits=[imageUrls[0],imageUrls[2],imageUrls[5]]
  return <article className={'portfolio-site layout-'+template.layout} style={{'--accent':data.accent,'--pale':template.pale} as CSSProperties}><div className="site-nav"><span className="site-monogram">{data.name.split(' ').map(s=>s[0]).join('')}</span><div><a href="#about">{en?'About':'عنّي'}</a><a href="#work">{en?'Work':'أعمالي'}</a><a href="#contact">{en?'Contact':'تواصل'}</a></div><span className="site-availability"><i/>{en?'Open to work':'متاح للعمل'}</span></div><section className="site-hero"><div className="site-copy"><small className="site-eyebrow">✳ {en?template.profession.toUpperCase():'أهلاً، أنا '+data.name}</small><h1>{en?'Creating with care.':data.name}<br/><em>{en?'Making it matter.':data.role}</em></h1>{data.visible.about&&<p id="about">{en?'Good work starts with curiosity. I turn thoughtful ideas into work that makes everyday life a little better.':data.bio}</p>}<a className="site-cta" href={'mailto:'+data.email}>{en?'Let’s work together':'خلينا نشتغل سوا'} <b>↗</b></a></div><div className="site-portrait"><div className="portrait-ring"><img className="portrait-photo" src={portraits[template.layout%3]} alt="" loading="lazy"/><span className="portrait-decoration">✿</span></div><div className="portrait-label">{data.location}　·　2026</div></div></section>{data.visible.projects&&<section className="site-work" id="work"><div className="site-section-title"><div><small>01 / {en?'SELECTED WORK':'أعمال مختارة'}</small><h2>{en?'A few things I’ve made':'حاجات عملتها بحب'}</h2></div><span>{en?'More coming soon':'المزيد قريباً'} ↗</span></div><div className="site-project-grid">{projects.map((name,i)=><div className={'site-project project-'+i} key={name}><div className="site-project-art"><img src={imageUrls[(i+template.layout+1)%imageUrls.length]} alt="" loading="lazy"/><span>{['milo','nūn','else'][i%3]}</span><b>{['✳','◡','✿'][i%3]}</b></div><h3>{name}</h3><small>{['Product design · 2026','Branding · 2025','Creative direction · 2024'][i%3]}</small></div>)}</div></section>}{data.visible.contact&&<section className="site-contact" id="contact"><div><small>02 / {en?'SAY HELLO':'كلمّني'}</small><h2>{en?'Have something in mind?':'عندك فكرة حلوة؟'}</h2></div><a href={'mailto:'+data.email}>{data.email} ↗</a></section>}<footer className="site-footer"><span>© {new Date().getFullYear()} {data.name}</span><span>{en?'Made with care.':'اتعمل بحب.'}　<span style={{color:data.accent}}>✳</span></span></footer></article>
}
