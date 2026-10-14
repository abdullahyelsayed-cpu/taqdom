type ExportPortfolio = {
  name: string
  role: string
  bio: string
  email: string
  location: string
  accent: string
  projects: string[]
  visible: Record<string, boolean>
}

type ExportTemplate = { profession: string }
type PortfolioLocale = 'ar' | 'en'

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
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#e76f51'
}

function safeEmail(value: string): string {
  const trimmed = value.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : ''
}

/** Export a standalone, responsive portfolio with locale-aware direction and escaped user content. */
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
  const projects = Array.isArray(portfolio.projects)
    ? portfolio.projects.filter((project) => typeof project === 'string' && project.trim()).slice(0, 24)
    : []
  const projectMarkup = portfolio.visible.projects && projects.length
    ? `<section id="work" class="section"><p class="kicker">01 / ${en ? 'SELECTED WORK' : 'أعمال مختارة'}</p><h2>${en ? 'Selected work' : 'أعمال مختارة'}</h2><div class="projects">${projects.map((project, index) => `<article class="project"><span class="project-number">${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(project)}</h3></article>`).join('')}</div></section>`
    : ''
  const aboutMarkup = portfolio.visible.about && portfolio.bio.trim()
    ? `<section id="about" class="section about"><p class="kicker">02 / ${en ? 'ABOUT' : 'نبذة'}</p><h2>${en ? 'A little about me' : 'نبذة عني'}</h2><p class="bio">${escapeHtml(portfolio.bio)}</p></section>`
    : ''
  const contactMarkup = portfolio.visible.contact
    ? `<section id="contact" class="contact"><div><p class="kicker">${en ? 'HAVE A PROJECT IN MIND?' : 'هل لديك فكرة؟'}</p><h2>${en ? 'Let’s make something meaningful.' : 'خلينا نعمل حاجة لها معنى.'}</h2></div>${email ? `<a class="contact-link" href="mailto:${escapeHtml(email)}">${escapeHtml(email)} ↗</a>` : ''}</section>`
    : ''
  const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="description" content="${escapeHtml(portfolio.role || title)} — ${escapeHtml(title)}">
<title>${escapeHtml(title)} — Taqdom Portfolio</title>
<style>
:root{color-scheme:light;--accent:${accent};--ink:#212720;--muted:#686f67;--paper:#f7f7f2;--line:#e5e8e0;font-family:Inter,"Segoe UI",Arial,sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);line-height:1.7}
.shell{width:min(1040px,100% - 40px);margin:0 auto;padding:clamp(24px,6vw,70px) 0}
nav{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:0 0 18px;border-bottom:1px solid var(--line)}
.brand{font-weight:750;font-size:14px;letter-spacing:.02em}.nav-links{display:flex;flex-wrap:wrap;gap:18px}.nav-links a,.availability{font-size:12px;color:var(--muted);text-decoration:none}
.availability:before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:#40956c;margin-inline-end:7px}
.hero{padding:clamp(56px,12vw,138px) 0 clamp(60px,10vw,110px);max-width:880px}
.kicker{font-size:11px;letter-spacing:.12em;font-weight:700;color:var(--accent);margin:0 0 15px}
h1{font-size:clamp(42px,9vw,96px);line-height:1.05;letter-spacing:-.055em;margin:0;max-width:900px;overflow-wrap:anywhere}
.role{font-size:clamp(21px,3vw,32px);font-weight:500;color:var(--accent);margin:20px 0 0}
.location{font-size:13px;color:var(--muted);margin:16px 0 0}
.section{border-top:1px solid var(--line);padding:clamp(28px,5vw,52px) 0}
h2{font-size:clamp(25px,4vw,38px);letter-spacing:-.025em;line-height:1.2;margin:0 0 24px}
.projects{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:12px}
.project{background:white;border:1px solid var(--line);border-radius:16px;padding:20px;min-height:150px;display:flex;flex-direction:column;justify-content:space-between}
.project-number{font-size:12px;color:var(--accent);font-weight:700}.project h3{font-size:19px;margin:38px 0 0;overflow-wrap:anywhere}
.bio{font-size:clamp(17px,2.5vw,22px);line-height:1.9;color:var(--muted);max-width:720px;white-space:pre-line}
.contact{margin:26px 0;background:#202d23;color:white;border-radius:22px;padding:clamp(24px,5vw,52px);display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}
.contact .kicker{color:#b7ceba}.contact h2{max-width:580px;margin-bottom:0}.contact-link{color:white;border:1px solid #ffffff45;padding:10px 15px;border-radius:999px;text-decoration:none;overflow-wrap:anywhere}
footer{padding-top:23px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;color:var(--muted);font-size:12px;border-top:1px solid var(--line)}
a:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
@media(max-width:600px){.shell{width:calc(100% - 28px)}.nav-links{gap:10px}.availability{display:none}.contact{align-items:flex-start;flex-direction:column}.hero{padding-top:70px}}
</style>
</head>
<body><main class="shell">
<nav><a class="brand" href="#top" style="color:inherit;text-decoration:none">TAQDOM<span style="color:var(--accent)">.</span></a><div class="nav-links">${portfolio.visible.about && portfolio.bio.trim() ? `<a href="#about">${en ? 'About' : 'نبذة'}</a>` : ''}${portfolio.visible.projects && projects.length ? `<a href="#work">${en ? 'Work' : 'الأعمال'}</a>` : ''}${portfolio.visible.contact ? `<a href="#contact">${en ? 'Contact' : 'تواصل'}</a>` : ''}</div><span class="availability">${en ? 'Open to opportunities' : 'متاح للفرص'}</span></nav>
<header id="top" class="hero"><p class="kicker">${escapeHtml(template.profession)} · ${en ? 'PERSONAL PORTFOLIO' : 'موقع شخصي'}</p><h1>${escapeHtml(title)}</h1><p class="role">${escapeHtml(portfolio.role)}</p>${portfolio.location.trim() ? `<p class="location">${escapeHtml(portfolio.location)}</p>` : ''}</header>
${projectMarkup}${aboutMarkup}${contactMarkup}
<footer><span>© ${new Date().getFullYear()} ${escapeHtml(title)}</span><span>${en ? 'Built with Taqdom' : 'صُنع باستخدام تقدّم'} · taqdom.me</span></footer>
</main></body></html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = (title.toLowerCase().replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-+|-+$/g, '') || 'taqdom-portfolio') + '.html'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
