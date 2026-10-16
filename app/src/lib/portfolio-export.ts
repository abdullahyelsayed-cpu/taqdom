type ExportProjectDetail = { description?: string; url?: string; imageUrl?: string }
type ExportExperience = { role?: string; company?: string; period?: string; description?: string }
type ExportSocialLink = { label?: string; url?: string }

type ExportPortfolio = {
  name: string
  role: string
  bio: string
  email: string
  location: string
  accent: string
  projects: string[]
  projectDetails?: ExportProjectDetail[]
  skills?: string[]
  experience?: ExportExperience[]
  socialLinks?: ExportSocialLink[]
  visible: Record<string, boolean>
  avatarUrl?: string
  backgroundStyle?: 'signature' | 'aurora' | 'glass' | 'orbit' | 'calm'
}

type ExportTemplate = {
  profession: string
  professionEn?: string
  roleEn?: string
  layout: number
}

type PortfolioLocale = 'ar' | 'en'

const backgroundStyles = new Set(['signature', 'aurora', 'glass', 'orbit', 'calm'])

const themePalettes = [
  { page: '#071020', ink: '#f1f8ff', muted: '#a4bad6', surface: '#0d2038d9', line: '#2e5b84', hero: 'linear-gradient(130deg,#07152b,#092444 62%,#081225)', glowA: '#237bff66', glowB: '#27dfff5c', glowC: '#8057ff45', radius: '10px', body: 'radial-gradient(ellipse at 78% 5%,#237bff2c,transparent 34%),radial-gradient(ellipse at 5% 80%,#14caff16,transparent 38%),#050a16' },
  { page: '#f7f4e9', ink: '#27392d', muted: '#6b7669', surface: '#fffdf0d9', line: '#d9dfcf', hero: 'linear-gradient(135deg,#fffdf5,#e8eadb 72%,#dde5d3)', glowA: '#c5d9a870', glowB: '#e6c9a755', glowC: '#9ec3a03b', radius: '5px', body: 'radial-gradient(ellipse at 82% 4%,#d9e6c566,transparent 35%),#e9eadf' },
  { page: '#220b29', ink: '#fff3fb', muted: '#edc8df', surface: '#401132db', line: '#8d2a70', hero: 'radial-gradient(circle at 86% 24%,#ff458052,transparent 31%),linear-gradient(130deg,#2a0a35,#491032 68%,#190c22)', glowA: '#ff299b77', glowB: '#ff804b67', glowC: '#bd36ff47', radius: '5px', body: 'radial-gradient(ellipse at 82% 4%,#ff3e8d30,transparent 35%),#100816' },
  { page: '#e9f5ef', ink: '#17413b', muted: '#50766e', surface: '#fafff1d9', line: '#b9dccc', hero: 'linear-gradient(140deg,#eff9ef,#d5eee4 58%,#b9e1d8)', glowA: '#5ae1be70', glowB: '#b1e8cb72', glowC: '#52b8bd3b', radius: '17px', body: 'radial-gradient(ellipse at 87% 6%,#9ce4c96b,transparent 36%),#d9eee5' },
  { page: '#06162d', ink: '#eff8ff', muted: '#afcbed', surface: '#0a2b4bdd', line: '#2772e4', hero: 'radial-gradient(circle at 78% 33%,#3e61ff55,transparent 31%),linear-gradient(140deg,#06162e,#083354 62%,#07132b)', glowA: '#3679ff78', glowB: '#29dfff70', glowC: '#7e7bff45', radius: '7px', body: 'radial-gradient(ellipse at 78% 5%,#2868ff30,transparent 34%),#030b19' },
  { page: '#f1f3f4', ink: '#141a20', muted: '#5b656e', surface: '#ffffffd9', line: '#cbd1d5', hero: 'linear-gradient(135deg,#f7f8f9,#e5e8eb)', glowA: '#bfc8d05c', glowB: '#e0e4e776', glowC: '#9aa6b13b', radius: '0px', body: 'linear-gradient(145deg,#f2f4f5,#dce1e4)' },
  { page: '#080612', ink: '#f4efff', muted: '#b7a9d5', surface: '#17102cdb', line: '#6949a4', hero: 'radial-gradient(circle at 80% 35%,#8a56e64c,transparent 31%),linear-gradient(130deg,#06050f,#130920 67%,#1d0c34)', glowA: '#ab70ff75', glowB: '#7650e354', glowC: '#d59aff2c', radius: '10px', body: 'radial-gradient(ellipse at 80% 4%,#7947c53a,transparent 35%),#04040b' },
  { page: '#f7f5ff', ink: '#1b1d44', muted: '#6b6c91', surface: '#ffffffd9', line: '#d9d2ff', hero: 'radial-gradient(ellipse at 82% 14%,#e7bdff9c,transparent 35%),radial-gradient(ellipse at 71% 83%,#9beaff78,transparent 37%),linear-gradient(125deg,#fcfaff,#e9e9ff 54%,#fff0f8)', glowA: '#aeabff75', glowB: '#f6b8e878', glowC: '#90e5ff6b', radius: '16px', body: 'radial-gradient(ellipse at 80% 5%,#d7c9ff87,transparent 35%),#edeaff' },
  { page: '#0c0b0a', ink: '#fff4e9', muted: '#d4b79f', surface: '#28170fdf', line: '#9d521f', hero: 'radial-gradient(circle at 80% 33%,#ff811d46,transparent 32%),linear-gradient(135deg,#0a0b0d,#201108 62%,#0b0b0d)', glowA: '#ff812b75', glowB: '#ffc05962', glowC: '#fa4a1f36', radius: '7px', body: 'radial-gradient(ellipse at 80% 5%,#ff812a30,transparent 34%),#070708' },
] as const

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character)
}

function safeAccent(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#8b5cff'
}

function safeEmail(value: string): string {
  const trimmed = value.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : ''
}

function safeImageUrl(value: string | undefined): string {
  if (!value || value.length > 1_500_000) return ''
  if (/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)) return value
  try {
    const url = new URL(value, window.location.origin)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}

function safeExternalUrl(value: string | undefined): string {
  const trimmed = String(value || '').trim()
  if (!trimmed || /^(?:javascript|data|vbscript):/i.test(trimmed)) return ''
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed
  try {
    const url = new URL(candidate)
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.') ? url.href : ''
  } catch {
    return ''
  }
}

/** Export a self-contained, responsive HTML portfolio that reflects the selected visual system and atmosphere. */
export function downloadPortfolioHtml(
  portfolio: ExportPortfolio,
  template: ExportTemplate,
  locale: PortfolioLocale,
): void {
  const en = locale === 'en'
  const dir = en ? 'ltr' : 'rtl'
  const accent = safeAccent(portfolio.accent)
  const title = portfolio.name.trim() || (en ? 'My portfolio' : 'موقعي الشخصي')
  const email = safeEmail(portfolio.email)
  const layout = Number.isInteger(template.layout) && template.layout >= 0 && template.layout < themePalettes.length ? template.layout : 0
  const mood = backgroundStyles.has(portfolio.backgroundStyle || '') ? portfolio.backgroundStyle! : 'signature'
  const role = (en && template.roleEn ? template.roleEn : portfolio.role || template.profession).trim()
  const profession = en && template.professionEn ? template.professionEn : template.profession
  const avatar = safeImageUrl(portfolio.avatarUrl)
  const projects = Array.isArray(portfolio.projects)
    ? portfolio.projects.filter((project) => typeof project === 'string' && project.trim()).slice(0, 24)
    : []
  const skills = Array.isArray(portfolio.skills) ? portfolio.skills.filter((skill) => typeof skill === 'string' && skill.trim()).map(skill => skill.trim().slice(0,80)).slice(0,30) : []
  const experience = Array.isArray(portfolio.experience) ? portfolio.experience.filter(item => item && typeof item === 'object').slice(0,12) : []
  const socialLinks = Array.isArray(portfolio.socialLinks) ? portfolio.socialLinks.map(item => ({ label:String(item?.label || '').trim().slice(0,60), url:safeExternalUrl(item?.url) })).filter(item => item.label && item.url).slice(0,12) : []
  const skillsMarkup = portfolio.visible.skills && skills.length
    ? `<section id="skills" class="section skills"><p class="kicker">01 / ${en ? 'SKILLS & EXPERTISE' : 'المهارات والتخصصات'}</p><h2>${en ? 'What I bring to the table' : 'المهارات التي أقدمها'}</h2><div class="skill-tags">${skills.map((skill,index) => `<span class="skill-tag"><i>${String(index+1).padStart(2,'0')}</i>${escapeHtml(skill)}</span>`).join('')}</div></section>`
    : ''
  const experienceMarkup = portfolio.visible.experience && experience.length
    ? `<section id="experience" class="section experience"><p class="kicker">02 / ${en ? 'THE JOURNEY' : 'الخبرات المهنية'}</p><h2>${en ? 'Where I’ve made a difference' : 'محطات من رحلتي المهنية'}</h2><div class="experience-list">${experience.map((item,index) => `<article class="experience-item"><span class="experience-index">${String(index+1).padStart(2,'0')}</span><div><h3>${escapeHtml(item.role || (en ? 'Professional role' : 'خبرة مهنية'))}</h3>${item.company ? `<p class="experience-company">${escapeHtml(item.company)}</p>` : ''}${item.description ? `<p class="experience-description">${escapeHtml(item.description)}</p>` : ''}</div>${item.period ? `<span class="experience-period">${escapeHtml(item.period)}</span>` : ''}</article>`).join('')}</div></section>`
    : ''
  const socialMarkup = portfolio.visible.socials && socialLinks.length
    ? `<section id="socials" class="section socials"><div><p class="kicker">03 / ${en ? 'FIND ME ELSEWHERE' : 'روابط التواصل'}</p><h2>${en ? 'Let’s connect' : 'تواصل معي عبر المنصات'}</h2></div><div class="social-links">${socialLinks.map(item => `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)} <span>↗</span></a>`).join('')}</div></section>`
    : ''
  const projectMarkup = portfolio.visible.projects && projects.length
    ? `<section id="work" class="section work"><div class="section-heading"><div><p class="kicker">01 / ${en ? 'SELECTED WORK' : 'أعمال مختارة'}</p><h2>${en ? 'A few things I’ve made' : 'أعمال صنعتها بشغف'}</h2></div><span class="section-note">${en ? 'Selected projects' : 'مشاريع مختارة'} ↗</span></div><div class="projects">${projects.map((project, index) => {
      const detail = portfolio.projectDetails?.[index] || {}
      const cover = safeImageUrl(detail.imageUrl)
      const href = safeExternalUrl(detail.url)
      const description = typeof detail.description === 'string' ? detail.description.trim().slice(0, 600) : ''
      const artwork = cover
        ? `<div class="project-art has-photo"><img src="${escapeHtml(cover)}" alt="${escapeHtml(description || project)}" loading="lazy"></div>`
        : `<div class="project-art" aria-hidden="true"><i></i><b>${['✳', '◈', '✦'][index % 3]}</b></div>`
      return `<article class="project project-${index % 3}"><span class="project-number">${String(index + 1).padStart(2, '0')}</span>${artwork}<div><h3>${escapeHtml(project)}</h3>${description ? `<p class="project-description">${escapeHtml(description)}</p>` : ''}<small>${en ? ['Digital experience','Visual identity','Creative direction'][index % 3] : ['تجربة رقمية','هوية بصرية','توجّه إبداعي'][index % 3]}</small>${href ? `<a class="project-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${en ? 'View project' : 'عرض المشروع'} ↗</a>` : ''}</div></article>`
    }).join('')}</div></section>`
    : ''
  const aboutMarkup = portfolio.visible.about && portfolio.bio.trim()
    ? `<section id="about" class="section about"><p class="kicker">02 / ${en ? 'ABOUT' : 'نبذة عني'}</p><h2>${en ? 'Thoughtful work starts with a point of view.' : 'كل عمل مميز يبدأ برؤية.'}</h2><p class="bio">${escapeHtml(portfolio.bio)}</p>${portfolio.location.trim() ? `<p class="location">⌖ ${escapeHtml(portfolio.location)}</p>` : ''}</section>`
    : ''
  const contactMarkup = portfolio.visible.contact
    ? `<section id="contact" class="contact"><div><p class="kicker">${en ? '02 / SAY HELLO' : '03 / لنتحدث'}</p><h2>${en ? 'Have something meaningful in mind?' : 'عندك فكرة تستحق التنفيذ؟'}</h2><p>${en ? 'Tell me what you are imagining. Let’s make it real.' : 'احكي لي عن فكرتك، وخلينا نحولها لحاجة حقيقية.'}</p></div>${email ? `<a class="contact-link" href="mailto:${escapeHtml(email)}">${escapeHtml(email)} <span>↗</span></a>` : ''}</section>`
    : ''
  const heroMedia = avatar
    ? `<div class="hero-media"><div class="portrait-frame"><img src="${escapeHtml(avatar)}" alt="${escapeHtml(title)}" loading="lazy"><span>${en ? 'CREATIVE / 01' : 'إبداع / ٠١'}</span></div></div>`
    : `<div class="hero-media"><div class="visual-object" aria-hidden="true"><i></i><b>✦</b><span>${String(layout + 1).padStart(2, '0')}</span></div></div>`
  const themeRules = themePalettes.map((palette, index) => `
body.theme-${index}{--page:${palette.page};--ink:${palette.ink};--muted:${palette.muted};--surface:${palette.surface};--line:${palette.line};--hero-bg:${palette.hero};--radius:${palette.radius};--glow-a:${palette.glowA};--glow-b:${palette.glowB};--glow-c:${palette.glowC};background:${palette.body};color:var(--ink)}
body.theme-${index} .shell{background:linear-gradient(145deg, color-mix(in srgb,var(--page) 88%,white 3%),var(--page));border-color:var(--line);box-shadow:0 28px 100px #0002}
body.theme-${index} nav{border-color:var(--line);background:color-mix(in srgb,var(--page) 86%,transparent);backdrop-filter:blur(20px) saturate(140%)}
body.theme-${index} .hero{background:var(--hero-bg);border-color:var(--line)}
body.theme-${index} .project{background:var(--surface);border-color:var(--line);border-radius:var(--radius);backdrop-filter:blur(15px) saturate(135%)}
body.theme-${index} .contact{background:var(--surface);border-color:var(--line);color:var(--ink)}
body.theme-${index} .contact .kicker{color:var(--accent)}
body.theme-${index} .contact-link{color:var(--ink);border-color:var(--line)}
body.theme-${index} .site-label{color:var(--muted)}
body.theme-${index} footer{border-color:var(--line);color:var(--muted)}
`).join('')
  const designRules = `
.hero{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(210px,.82fr);gap:clamp(22px,4vw,54px);align-items:center;max-width:none;padding:clamp(42px,8vw,100px) clamp(20px,4.5vw,56px);border:1px solid var(--line);border-radius:calc(var(--radius) * 1.5);overflow:hidden;position:relative;isolation:isolate}
.hero-copy{position:relative;z-index:2;min-width:0}.hero-media{position:relative;z-index:2;display:grid;place-items:center;min-height:250px}
h1{font-size:clamp(36px,5.7vw,76px);line-height:1.02;letter-spacing:-.065em;margin:0;overflow-wrap:anywhere;color:var(--ink);text-wrap:balance}
.role{font-size:clamp(19px,2.8vw,30px);font-weight:600;color:var(--accent);margin:18px 0 0;line-height:1.3}
.hero-summary{max-width:530px;color:var(--muted);line-height:1.9;font-size:clamp(14px,1.6vw,17px);margin:19px 0 0}
.hero-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:25px}
.hero-actions a{display:inline-flex;align-items:center;gap:8px;text-decoration:none;border-radius:999px;padding:11px 16px;border:1px solid var(--line);font-size:12px;font-weight:750;color:var(--ink);background:var(--surface)}
.hero-actions .primary{background:var(--accent);color:white;border-color:var(--accent);box-shadow:0 8px 24px color-mix(in srgb,var(--accent) 30%,transparent)}
.location{font-size:12px;color:var(--muted);margin:18px 0 0}
.portrait-frame{position:relative;width:min(100%,310px);height:clamp(235px,32vw,395px);border:1px solid color-mix(in srgb,var(--accent) 64%,var(--line));border-radius:var(--radius);overflow:hidden;background:linear-gradient(140deg,var(--surface),var(--page));box-shadow:0 0 0 8px color-mix(in srgb,var(--accent) 9%,transparent),0 25px 65px #0002}
.portrait-frame img{width:100%;height:100%;object-fit:cover;display:block}
.portrait-frame>span{position:absolute;inset:auto 12px 12px auto;padding:7px 9px;border-radius:999px;border:1px solid #ffffff55;background:#11182777;color:#fff;backdrop-filter:blur(12px);font-size:8px;letter-spacing:.12em}
.visual-object{position:relative;width:min(100%,300px);aspect-ratio:1;border:1px solid color-mix(in srgb,var(--accent) 45%,transparent);border-radius:var(--radius);background:radial-gradient(circle at 40% 36%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 43%),linear-gradient(135deg,var(--surface),var(--page));box-shadow:inset 0 1px #ffffff20,0 20px 60px #0002;display:grid;place-items:center;overflow:hidden}
.visual-object:before,.visual-object:after{content:"";position:absolute;inset:16%;border:1px solid color-mix(in srgb,var(--accent) 55%,transparent);border-radius:30%;transform:rotate(35deg);box-shadow:0 0 35px color-mix(in srgb,var(--accent) 28%,transparent)}
.visual-object:after{inset:28%;transform:rotate(-20deg);border-radius:50%}
.visual-object i{width:36%;aspect-ratio:1;border-radius:38% 12% 38% 12%;background:linear-gradient(135deg,var(--accent),var(--glow-b));filter:drop-shadow(0 0 24px color-mix(in srgb,var(--accent) 60%,transparent));transform:rotate(20deg)}
.visual-object>b{position:absolute;right:14%;top:12%;font-size:clamp(25px,4vw,44px);color:var(--accent);text-shadow:0 0 18px var(--glow-b)}
.visual-object>span{position:absolute;bottom:11%;left:12%;font-size:10px;letter-spacing:.2em;color:var(--muted)}
.section{border-top:1px solid var(--line);padding:clamp(30px,5vw,62px) clamp(20px,4.5vw,56px)}
.skills .skill-tags{display:flex;flex-wrap:wrap;gap:9px}
.skill-tag{display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border:1px solid var(--line);border-radius:999px;background:var(--surface);backdrop-filter:blur(13px);font-size:12px}
.skill-tag i{font-size:9px;font-style:normal;color:var(--accent);font-weight:800}
.experience-list{display:grid;gap:10px}
.experience-item{display:grid;grid-template-columns:35px minmax(0,1fr) auto;gap:13px;align-items:start;padding:17px;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);backdrop-filter:blur(16px)}
.experience-index{display:grid;place-items:center;width:32px;height:32px;border:1px solid var(--line);border-radius:9px;color:var(--accent);font-size:10px;font-weight:800}
.experience-item h3{margin:2px 0 4px;font-size:16px;color:var(--ink)}
.experience-company{margin:0;color:var(--accent);font-size:11px;font-weight:750}
.experience-description{margin:9px 0 0;color:var(--muted);font-size:12px;line-height:1.8;white-space:pre-line}
.experience-period{font-size:10px;color:var(--muted);padding:5px 8px;border:1px solid var(--line);border-radius:999px;white-space:nowrap}
.socials{display:grid;grid-template-columns:minmax(0,.7fr) minmax(0,1.3fr);gap:22px;align-items:center}
.socials h2{margin:0}
.social-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.social-links a{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;border:1px solid var(--line);border-radius:999px;color:var(--ink);background:var(--surface);font-size:11px;text-decoration:none;overflow-wrap:anywhere}
.social-links a span{color:var(--accent);font-size:16px}
.section-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:28px}
.section-heading h2,.about h2,.contact h2{margin:0;font-size:clamp(25px,3.5vw,43px);line-height:1.12;letter-spacing:-.055em;text-wrap:balance;color:var(--ink)}
.kicker{font-size:10px;letter-spacing:.12em;font-weight:800;color:var(--accent);margin:0 0 12px}
.section-note{font-size:10px;color:var(--muted)}
.projects{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}
.project{padding:13px;border:1px solid var(--line);min-height:225px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;position:relative}
.project-number{display:inline-grid;place-items:center;width:29px;height:29px;border:1px solid var(--line);border-radius:50%;font-size:10px;color:var(--accent);font-weight:800}
.project-art{position:relative;isolation:isolate;min-height:100px;margin:12px 0;background:radial-gradient(ellipse at 73% 30%,var(--glow-b),transparent 38%),linear-gradient(130deg,color-mix(in srgb,var(--accent) 18%,var(--page)),var(--surface));border:1px solid var(--line);border-radius:calc(var(--radius) * .7);overflow:hidden}
.project-art:before{content:"";position:absolute;inset:0;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:24px 24px;opacity:.34}
.project-art:after{content:"";position:absolute;width:60%;aspect-ratio:1;right:10%;top:6%;border-radius:38%;border:1px solid color-mix(in srgb,var(--accent) 70%,transparent);transform:rotate(35deg);box-shadow:0 0 26px color-mix(in srgb,var(--accent) 20%,transparent)}
.project-art i{position:absolute;inset:22% 30%;z-index:1;background:linear-gradient(135deg,var(--accent),var(--glow-b));border-radius:48% 10% 48% 10%;filter:drop-shadow(0 0 18px color-mix(in srgb,var(--accent) 46%,transparent));transform:rotate(-17deg)}
.project-art b{position:absolute;z-index:2;bottom:5px;left:9px;font-size:22px;color:var(--ink);opacity:.85}
.project h3{font-size:17px;line-height:1.3;margin:5px 0;color:var(--ink);overflow-wrap:anywhere}
.project-art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.project-art.has-photo:before{z-index:1;background:linear-gradient(0deg,#0006,transparent 75%)}
.project-art.has-photo:after{display:none}
.project-description{font-size:12px;line-height:1.8;color:var(--muted);margin:9px 0;white-space:pre-line}
.project-link{display:inline-flex;align-items:center;gap:7px;margin-top:12px;font-size:11px;color:var(--accent);font-weight:750;text-decoration:none}
.project small{font-size:9px;color:var(--muted)}
.project-1 .project-art{border-radius:2px 2px 20px 2px}.project-1 .project-art i{border-radius:50%;transform:rotate(-8deg)}
.project-2 .project-art{border-radius:var(--radius)}.project-2 .project-art i{border-radius:5px;transform:rotate(35deg)}
.about .bio{font-size:clamp(17px,2.4vw,24px);max-width:850px;color:var(--muted);line-height:1.95;white-space:pre-line;margin:20px 0}
.about .location{margin-top:22px}
.contact{margin:22px clamp(12px,2vw,24px);border:1px solid var(--line);border-radius:calc(var(--radius) * 1.5);padding:clamp(25px,5vw,58px);display:flex;align-items:center;justify-content:space-between;gap:25px;flex-wrap:wrap;position:relative;isolation:isolate;overflow:hidden}
.contact:before{content:"";position:absolute;z-index:-1;inset:-40% 40% -40% -8%;border-radius:50%;background:radial-gradient(ellipse,var(--glow-a),transparent 65%);filter:blur(20px)}
.contact h2{max-width:650px}.contact p:not(.kicker){color:var(--muted);margin:15px 0 0;line-height:1.7}
.contact-link{display:inline-flex;align-items:center;gap:14px;max-width:100%;padding:12px 16px;border:1px solid var(--line);border-radius:999px;text-decoration:none;overflow-wrap:anywhere;font-size:12px}
.contact-link span{color:var(--accent);font-size:18px}
footer{margin:0 clamp(20px,4.5vw,56px);padding:24px 0;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;border-top:1px solid var(--line);font-size:11px}
.site-label{font-size:10px;color:var(--muted);letter-spacing:.08em}
.mood-aurora .ambient:before{opacity:1;filter:saturate(1.6);transform:scale(1.08)}
.mood-glass .shell{backdrop-filter:blur(28px) saturate(150%);-webkit-backdrop-filter:blur(28px) saturate(150%)}
.mood-glass .project,.mood-glass nav,.mood-glass .contact{backdrop-filter:blur(25px) saturate(160%);-webkit-backdrop-filter:blur(25px) saturate(160%);background-color:color-mix(in srgb,var(--surface) 76%,transparent)}
.mood-orbit .ambient:after{opacity:.42;background-size:26px 26px,26px 26px}
.mood-orbit .orbit{opacity:.95;transform:rotate(-24deg) scaleY(.43)}
.mood-calm .ambient{opacity:.4;animation:none}
.mood-calm .ambient:after{opacity:.06}
body.theme-0 .hero{grid-template-columns:minmax(0,1.15fr) minmax(190px,.85fr)}
body.theme-0 .hero:after{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(#51cfff12 1px,transparent 1px),linear-gradient(90deg,#51cfff12 1px,transparent 1px);background-size:25px 25px;mask-image:linear-gradient(120deg,#000,transparent 82%)}
body.theme-1 .hero{grid-template-columns:minmax(0,1.2fr) minmax(210px,.8fr);font-family:Georgia,"Times New Roman",serif}
body.theme-1 h1,body.theme-1 .section-heading h2,body.theme-1 .about h2,body.theme-1 .contact h2{font-family:Georgia,"Times New Roman",serif;font-weight:500}
body.theme-1 .hero-media{align-items:end}
body.theme-2 .hero{grid-template-columns:minmax(0,1fr) minmax(180px,.9fr)}
body.theme-2 h1{text-transform:uppercase;font-weight:900}
body.theme-2 .portrait-frame{transform:rotate(-3deg);border-radius:46% 4% 42% 8%}
body.theme-3 .hero{grid-template-columns:minmax(0,1.1fr) minmax(195px,.9fr);border-radius:27px}
body.theme-3 .portrait-frame{border-radius:48% 48% 48% 8%}
body.theme-4 .hero{grid-template-columns:minmax(0,1.05fr) minmax(190px,.95fr)}
body.theme-4 .visual-object{border-radius:8px}
body.theme-4 .visual-object i{border-radius:0;transform:rotate(45deg)}
body.theme-5 .hero{grid-template-columns:minmax(0,1.1fr) minmax(190px,.9fr);border-radius:0;border-bottom:2px solid var(--line)}
body.theme-5 .shell,body.theme-5 .project,body.theme-5 .contact{border-radius:0}
body.theme-5 h1{font-weight:900;letter-spacing:-.08em}
body.theme-5 .visual-object:before,body.theme-5 .visual-object:after{border-radius:0}
body.theme-6 .hero{grid-template-columns:minmax(0,1.13fr) minmax(190px,.87fr)}
body.theme-6 .visual-object{border-radius:50%}
body.theme-6 .visual-object:before,body.theme-6 .visual-object:after{border-radius:50%}
body.theme-7 .hero{grid-template-columns:minmax(0,1.15fr) minmax(190px,.85fr);border-radius:24px}
body.theme-7 .hero-actions .primary{border-radius:999px}
body.theme-7 .visual-object,body.theme-7 .project-art{background:linear-gradient(130deg,#b8c1ff,#ffc8ed,#a5efff);border-radius:24px}
body.theme-7 .visual-object:before,body.theme-7 .visual-object:after{border:0;background:linear-gradient(130deg,#9186ffba,#f39ddeb0,#74dcffbc);filter:blur(0);border-radius:46% 10% 46% 13%;box-shadow:0 15px 35px #9a91f354}
body.theme-8 .hero{grid-template-columns:minmax(0,1.12fr) minmax(190px,.88fr)}
body.theme-8 .visual-object:before,body.theme-8 .visual-object:after{border-color:#ff8b36;border-radius:50%;box-shadow:0 0 0 12px #ff851417,0 0 24px #ff751d43}
body.theme-8 .hero-actions .primary{background:linear-gradient(100deg,#ff771a,#ffb745);color:#211005}
@media(max-width:680px){.hero{grid-template-columns:1fr!important;padding:32px 21px}.hero-media{min-height:0;margin-top:12px}.portrait-frame{width:min(100%,260px);height:270px}.projects{grid-template-columns:1fr}.project{min-height:175px}.section-heading{align-items:flex-start;flex-direction:column}.contact{margin:12px 8px}footer{margin-inline:20px}.experience-item{grid-template-columns:30px minmax(0,1fr)}.experience-period{grid-column:2;justify-self:start}.socials{grid-template-columns:1fr}.social-links{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`
  const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="${layout === 1 || layout === 3 || layout === 5 || layout === 7 ? 'light' : 'dark light'}">
<meta name="description" content="${escapeHtml((portfolio.bio || role || title).replace(/\\s+/g, ' ').slice(0, 160))}">
<title>${escapeHtml(title)} — Taqdom Portfolio</title>
<style>
:root{color-scheme:light dark;--accent:${accent};font-family:Inter,"Segoe UI",Arial,sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:24px}body{margin:0;min-height:100vh;line-height:1.7;background:var(--page);color:var(--ink);padding:clamp(10px,3vw,36px)}
.shell{position:relative;isolation:isolate;overflow:hidden;width:min(1180px,100%);margin:0 auto;border:1px solid var(--line);border-radius:18px;padding:clamp(12px,2vw,24px);background:var(--page);box-shadow:0 25px 90px #0002}
.ambient{position:absolute;z-index:0;inset:0;overflow:hidden;pointer-events:none;isolation:isolate}
.ambient:before{content:"";position:absolute;inset:-12%;background:radial-gradient(ellipse at 82% 8%,var(--glow-a),transparent 38%),radial-gradient(ellipse at 12% 65%,var(--glow-b),transparent 38%),radial-gradient(ellipse at 55% 88%,var(--glow-c),transparent 42%);filter:saturate(1.3);animation:ambient-drift 17s ease-in-out infinite alternate}
.ambient:after{content:"";position:absolute;inset:0;opacity:.13;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:34px 34px;mask-image:radial-gradient(ellipse at 70% 20%,#000,transparent 75%)}
.orbit{position:absolute;z-index:0;top:6%;right:8%;width:clamp(180px,25vw,350px);aspect-ratio:1;border:1px solid color-mix(in srgb,var(--accent) 56%,transparent);border-radius:50%;transform:rotate(-25deg) scaleY(.4);box-shadow:0 0 0 17px #ffffff05,0 0 32px color-mix(in srgb,var(--accent) 22%,transparent);opacity:.47}
.shell>*:not(.ambient){position:relative;z-index:1}
@keyframes ambient-drift{from{transform:translate3d(-1%,0,0) scale(1);opacity:.55}to{transform:translate3d(1%,1%,0) scale(1.06);opacity:.9}}
${themeRules}
${designRules}
</style>
</head>
<body class="theme-${layout} mood-${mood}">
<main class="shell">
<div class="ambient" aria-hidden="true"><span class="orbit"></span></div>
<nav><a class="brand" href="#top" style="color:var(--ink);text-decoration:none;font-weight:850;letter-spacing:.12em">TAQDOM<span style="color:var(--accent)">✦</span></a><div class="nav-links">${portfolio.visible.about && portfolio.bio.trim() ? `<a href="#about">${en ? 'About' : 'نبذة'}</a>` : ''}${portfolio.visible.skills && skills.length ? `<a href="#skills">${en ? 'Skills' : 'المهارات'}</a>` : ''}${portfolio.visible.experience && experience.length ? `<a href="#experience">${en ? 'Experience' : 'الخبرات'}</a>` : ''}${portfolio.visible.projects && projects.length ? `<a href="#work">${en ? 'Work' : 'الأعمال'}</a>` : ''}${portfolio.visible.socials && socialLinks.length ? `<a href="#socials">${en ? 'Social' : 'روابطي'}</a>` : ''}${portfolio.visible.contact ? `<a href="#contact">${en ? 'Contact' : 'تواصل'}</a>` : ''}</div><span class="availability">${en ? 'Available for work' : 'متاح للعمل'}</span></nav>
<header id="top" class="hero"><div class="hero-copy"><p class="kicker">${escapeHtml(profession)} · ${en ? 'PERSONAL PORTFOLIO' : 'موقع شخصي'}</p><h1>${escapeHtml(title)}</h1><p class="role">${escapeHtml(role)}</p>${portfolio.visible.about && portfolio.bio.trim() ? `<p id="about-intro" class="hero-summary">${escapeHtml(portfolio.bio.slice(0, 240))}</p>` : ''}<div class="hero-actions">${email ? `<a class="primary" href="mailto:${escapeHtml(email)}">${en ? 'Let’s work together' : 'لنعمل معًا'} ↗</a>` : ''}${portfolio.visible.projects && projects.length ? `<a href="#work">${en ? 'Explore my work' : 'استكشف أعمالي'} ↓</a>` : ''}</div>${portfolio.location.trim() ? `<p class="location">⌖ ${escapeHtml(portfolio.location)}</p>` : ''}</div>${heroMedia}</header>
${skillsMarkup}${experienceMarkup}${projectMarkup}${aboutMarkup}${socialMarkup}${contactMarkup}
<footer><span>© ${new Date().getFullYear()} ${escapeHtml(title)}</span><span>TAQDOM · ${en ? 'Build your digital future.' : 'ابنِ مستقبلك الرقمي.'}</span></footer>
</main></body></html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = (title.toLowerCase().replace(/[^\\p{L}\\p{N}-]+/gu, '-').replace(/^-+|-+$/g, '') || 'taqdom-portfolio') + '.html'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
