import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import './App.css'
import './landing.css'
import './studio.css'
import { CareerAiError, improveCareerText } from './lib/ai'
import { downloadPortfolioHtml } from './lib/portfolio-export'

type Template = { id: string; profession: string; role: string; professionEn: string; roleEn: string; layout: number; accent: string; pale: string }
type Portfolio = { name: string; role: string; bio: string; email: string; location: string; accent: string; templateId: string; projects: string[]; visible: Record<string, boolean>; avatarUrl?: string; slug?: string }
type AppView = 'home' | 'editor' | 'preview' | 'auth' | 'dashboard' | 'public'
type AuthMode = 'register' | 'login'
type User = { id: string; email: string; displayName: string; locale: 'ar' | 'en'; emailVerified: boolean; createdAt: string }
type SavedPortfolio = { id: string; title: string; slug?: string; templateId: string; document: Portfolio; status: 'draft' | 'published'; createdAt: string; updatedAt: string }
type ApiError = Error & { code?: string }

type SitePage = 'home' | 'about' | 'templates' | 'features' | 'pricing' | 'faq' | 'contact' | 'privacy' | 'terms' | 'not-found'
type SiteLanguage = 'en' | 'ar'
type ContentBlock = { heading: string; text: string; bullets?: string[] }
type ContentPageCopy = { title: string; description: string; eyebrow: string; heading: string; lead: string; blocks: ContentBlock[] }

const sitePagePaths: Record<Exclude<SitePage, 'not-found'>, string> = {
  home: '/', about: '/about/', templates: '/templates/', features: '/features/',
  pricing: '/pricing/', faq: '/faq/', contact: '/contact/', privacy: '/privacy/', terms: '/terms/',
}
const sitePageLabels: Record<Exclude<SitePage, 'not-found'>, { en: string; ar: string }> = {
  home: { en: 'Home', ar: 'الرئيسية' }, about: { en: 'About', ar: 'نبذة عن تقدّم' },
  templates: { en: 'Templates', ar: 'القوالب' }, features: { en: 'Features', ar: 'المميزات' },
  pricing: { en: 'Pricing', ar: 'الأسعار' }, faq: { en: 'FAQ', ar: 'الأسئلة الشائعة' },
  contact: { en: 'Contact', ar: 'التواصل' }, privacy: { en: 'Privacy', ar: 'الخصوصية' },
  terms: { en: 'Terms', ar: 'الشروط' },
}
const reservedSubdomains = new Set(['www','api','app','admin','assets','static','cdn','mail','smtp','ftp','support','help','status','docs','blog','dev','staging','preview','dashboard','auth','login','register','pricing','about','templates','features','contact','privacy','terms','taqdom'])
function isValidPortfolioSubdomain(value: string): boolean {
  return value.length >= 3 && value.length <= 30 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value) &&
    !reservedSubdomains.has(value)
}
function parsePublicRoute(pathname: string, search: string, hostname: string): string | null {
  const query = new URLSearchParams(search)
  if (query.get('p')) return query.get('p')
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (host.endsWith('.taqdom.me')) {
    const subdomain = host.slice(0, -'.taqdom.me'.length)
    if (!subdomain.includes('.') && isValidPortfolioSubdomain(subdomain)) return subdomain
  }
  const m = pathname.match(/^\/(?:en\/|ar\/)?(?:p|u)\/([^/?#]+)/)
  return m ? decodeURIComponent(m[1]) : null
}
function resolveSiteRoute(pathname: string): { page: SitePage; language: SiteLanguage; known: boolean } {
  const raw = pathname.replace(/\/index\.html$/, '/').replace(/\/+$/, '') || '/'
  const isEnglish = raw === '/en' || raw.startsWith('/en/')
  const hasLegacyArabicPrefix = raw === '/ar' || raw.startsWith('/ar/')
  const unprefixed = (isEnglish || hasLegacyArabicPrefix ? raw.replace(/^\/(?:en|ar)(?=\/|$)/, '') : raw).replace(/\/+$/, '') || '/'
  const entry = Object.entries(sitePagePaths).find(([, value]) => (value.replace(/\/+$/, '') || '/') === unprefixed)
  return {
    page: entry ? entry[0] as SitePage : (unprefixed === '/' ? 'home' : 'not-found'),
    language: isEnglish ? 'en' : 'ar',
    known: Boolean(entry),
  }
}
function localizedSitePath(language: SiteLanguage, page: SitePage): string {
  if (page === 'not-found') return language === 'ar' ? '/' : '/en/'
  const path = sitePagePaths[page]
  return language === 'ar' ? path : (page === 'home' ? '/en/' : '/en' + path)
}
function getContentPageCopy(page: SitePage, en: boolean): ContentPageCopy {
  const copy: Record<SitePage, { en: ContentPageCopy; ar: ContentPageCopy }> = {
    home: {
      en: { title: 'Taqdom — Your Vision. Our Technology.', description: 'Build a personal website and portfolio with Taqdom, a bilingual visual studio with live preview and optional AI writing assistance.', eyebrow: 'A personal website studio', heading: 'Your work deserves a place of its own.', lead: 'Create a polished online presence, shape your portfolio, and share your work with the world.', blocks: [] },
      ar: { title: 'تقدّم — مساحة رقمية لأعمالك', description: 'أنشئ موقعًا شخصيًا ومعرض أعمال باستخدام تقدّم، مع معاينة مباشرة ودعم العربية والإنجليزية ومساعدة اختيارية للكتابة.', eyebrow: 'استوديو المواقع الشخصية', heading: 'أعمالك تستحق مساحة خاصة بها.', lead: 'أنشئ حضورًا رقميًا احترافيًا، وصمّم معرض أعمالك، وشاركه مع العالم.', blocks: [] },
    },
    about: {
      en: { title: 'About Taqdom | A Free Personal Website Studio', description: 'Learn about Taqdom’s mission to make personal websites and portfolios accessible to everyone, in Arabic and English, for free.', eyebrow: 'About Taqdom', heading: 'The internet should have room for everyone.', lead: 'Taqdom is a free visual studio for building a personal website or portfolio without starting from code.', blocks: [
        { heading: 'Built for many kinds of work', text: 'From designers and developers to students, independent professionals, and small businesses, Taqdom helps people present their work in one shareable place.' },
        { heading: 'A bilingual experience', text: 'The product supports English and Modern Standard Arabic, with left-to-right and right-to-left layouts.' },
        { heading: 'Free by design', text: 'Taqdom is intended to remain free for everyone. There are no paid plans or subscriptions. Some advanced publishing capabilities are still in development.' },
      ] },
      ar: { title: 'نبذة عن تقدّم | استوديو مجاني للمواقع الشخصية', description: 'تعرّف على هدف تقدّم في إتاحة المواقع الشخصية ومعارض الأعمال للجميع مجانًا، باللغتين العربية والإنجليزية.', eyebrow: 'نبذة عن تقدّم', heading: 'يجب أن تتسع شبكة الإنترنت للجميع.', lead: 'تقدّم استوديو بصري مجاني لإنشاء موقع شخصي أو معرض أعمال دون الحاجة إلى البدء بكتابة الشيفرة.', blocks: [
        { heading: 'مناسب لمجالات متعددة', text: 'يساعد تقدّم المصممين والمطورين والطلاب والمهنيين المستقلين والمشروعات الصغيرة على عرض أعمالهم في مكان واحد يسهل مشاركته.' },
        { heading: 'تجربة ثنائية اللغة', text: 'يدعم المنتج اللغة الإنجليزية والعربية الفصحى الحديثة، مع تخطيطات من اليمين إلى اليسار ومن اليسار إلى اليمين.' },
        { heading: 'مجاني للجميع', text: 'صُمّم تقدّم ليظل متاحًا للجميع مجانًا، دون خطط مدفوعة أو اشتراكات. لا تزال بعض إمكانات النشر المتقدمة قيد التطوير.' },
      ] },
    },
    templates: {
      en: { title: 'Portfolio Templates | Taqdom', description: 'Explore portfolio starting points for design, technology, business, education, healthcare, and more. Customize your site for free.', eyebrow: 'Template library', heading: 'Find a direction. Make it your own.', lead: 'Explore starting points for different professions, then customize your content, colors, and visible sections.', blocks: [
        { heading: 'Design & creative', text: 'Visual starting points for designers, photographers, writers, and creative professionals.' },
        { heading: 'Technology & engineering', text: 'Portfolio starting points for developers, engineers, and technical specialists.' },
        { heading: 'Business & services', text: 'Personal website directions for consultants, entrepreneurs, marketers, educators, and other professionals.' },
        { heading: 'What are the 126 starting combinations?', text: 'The template library combines 14 professional categories with nine distinct visual systems. Each system has its own art direction, and each can be personalized with your content and colors.' },
      ] },
      ar: { title: 'قوالب معارض الأعمال | تقدّم', description: 'استكشف بدايات تصميمية لمعارض الأعمال في مجالات التصميم والتقنية والأعمال والتعليم والصحة وغيرها، وخصّص موقعك مجانًا.', eyebrow: 'مكتبة القوالب', heading: 'اختر اتجاهًا بصريًا واجعله يعكس هويتك.', lead: 'استكشف بدايات تصميمية لمجالات مهنية مختلفة، ثم خصّص المحتوى والألوان والأقسام الظاهرة.', blocks: [
        { heading: 'التصميم والإبداع', text: 'بدايات بصرية للمصممين والمصورين والكتّاب وغيرهم من أصحاب الأعمال الإبداعية.' },
        { heading: 'التقنية والهندسة', text: 'بدايات مناسبة لمعارض أعمال المطورين والمهندسين والمتخصصين التقنيين.' },
        { heading: 'الأعمال والخدمات', text: 'اتجاهات للمواقع الشخصية للاستشاريين ورواد الأعمال والمسوقين والمعلمين وغيرهم من المهنيين.' },
        { heading: 'ماذا تعني 126 تركيبة بداية؟', text: 'تجمع مكتبة القوالب بين 14 مجالًا مهنيًا وتسعة أنظمة بصرية مختلفة. لكل نظام اتجاه تصميم مستقل، ويمكن تخصيصه بمحتواك وألوانك.' },
      ] },
    },
    features: {
      en: { title: 'Features | Taqdom Website Studio', description: 'Discover Taqdom’s live portfolio preview, visual editing, bilingual layouts, HTML export, saved drafts, and optional AI writing assistant.', eyebrow: 'Product features', heading: 'A clearer way to shape your online presence.', lead: 'The current studio combines visual editing with practical ways to review and share your work.', blocks: [
        { heading: 'Live visual preview', text: 'Edit portfolio content and design choices while seeing a preview of the result.' },
        { heading: 'Arabic and English', text: 'Switch between English and Modern Standard Arabic, including right-to-left and left-to-right presentation.' },
        { heading: 'Optional AI writing assistance', text: 'Ask the writing assistant to improve selected headline or biography text. Review suggestions before using them.' },
        { heading: 'Portable HTML export', text: 'Download a standalone HTML version of your current portfolio for a portable copy.' },
        { heading: 'Account and saved drafts', text: 'Create an account to use the current account workspace and save portfolio drafts to the service.' },
        { heading: 'Publishing roadmap', text: 'Published portfolios can use a personal address such as yourname.taqdom.me. A managed media library is still in development.' },
      ] },
      ar: { title: 'مميزات استوديو تقدّم للمواقع الشخصية', description: 'اكتشف المعاينة المباشرة وتحرير معرض الأعمال ودعم اللغتين وتصدير HTML والمسودات المحفوظة ومساعد الكتابة الاختياري.', eyebrow: 'مميزات المنتج', heading: 'طريقة أوضح لبناء حضورك الرقمي.', lead: 'يجمع الاستوديو الحالي بين التحرير البصري وأدوات عملية لمراجعة أعمالك ومشاركتها.', blocks: [
        { heading: 'معاينة بصرية مباشرة', text: 'عدّل محتوى معرض أعمالك وخيارات التصميم مع مشاهدة المعاينة الناتجة.' },
        { heading: 'العربية والإنجليزية', text: 'انتقل بين الإنجليزية والعربية الفصحى الحديثة، مع دعم اتجاه الكتابة من اليمين إلى اليسار ومن اليسار إلى اليمين.' },
        { heading: 'مساعدة اختيارية للكتابة بالذكاء الاصطناعي', text: 'اطلب من مساعد الكتابة تحسين نص العنوان أو النبذة التي تحددها، ثم راجع الاقتراحات قبل استخدامها.' },
        { heading: 'تصدير HTML قابل للنقل', text: 'نزّل نسخة HTML مستقلة من معرض أعمالك للاحتفاظ بنسخة قابلة للنقل.' },
        { heading: 'حساب ومسودات محفوظة', text: 'أنشئ حسابًا لاستخدام مساحة العمل الحالية وحفظ مسودات معرض أعمالك على الخدمة.' },
        { heading: 'خطة تطوير النشر', text: 'يمكن نشر معرض أعمالك على عنوان شخصي مثل yourname.taqdom.me. لا تزال مكتبة الوسائط المُدارة قيد التطوير.' },
      ] },
    },
    pricing: {
      en: { title: 'Free Portfolio Builder — No Subscription | Taqdom', description: 'Taqdom is free for everyone. Create and customize a personal portfolio without paid plans or subscriptions.', eyebrow: 'Free for everyone', heading: 'Your website. Your work. No subscription.', lead: 'Taqdom is free to use. There are no paid plans and no subscription fees.', blocks: [
        { heading: 'Included at no cost', text: 'Use the current portfolio editor, preview your work, explore the available template combinations, switch between languages, and export a standalone HTML copy.' },
        { heading: 'Account features', text: 'The current account experience supports sign-in and saving portfolio drafts. Availability depends on the running service.' },
        { heading: 'No paid plans', text: 'Taqdom is intended to remain free for everyone; paid plans, billing, and subscriptions are out of scope.' },
      ] },
      ar: { title: 'منشئ معارض أعمال مجاني دون اشتراك | تقدّم', description: 'تقدّم مجاني للجميع. أنشئ معرض أعمال شخصيًا وخصّصه دون خطط مدفوعة أو رسوم اشتراك.', eyebrow: 'مجاني للجميع', heading: 'موقعك وأعمالك، دون اشتراك.', lead: 'استخدام تقدّم مجاني بالكامل؛ لا توجد خطط مدفوعة أو رسوم اشتراك.', blocks: [
        { heading: 'مميزات متاحة مجانًا', text: 'استخدم محرر معرض الأعمال الحالي، وعاين أعمالك، واستكشف تركيبات القوالب المتاحة، وانتقل بين اللغتين، وصدّر نسخة HTML مستقلة.' },
        { heading: 'مميزات الحساب', text: 'تدعم تجربة الحساب الحالية تسجيل الدخول وحفظ مسودات معارض الأعمال. يعتمد التوفر على حالة الخدمة.' },
        { heading: 'لا توجد خطط مدفوعة', text: 'يهدف تقدّم إلى البقاء مجانيًا للجميع؛ فالخطط المدفوعة والفوترة والاشتراكات خارج نطاق المشروع.' },
      ] },
    },
    faq: {
      en: { title: 'Frequently Asked Questions | Taqdom', description: 'Answers about Taqdom, free access, portfolio templates, languages, AI writing assistance, and publishing capabilities.', eyebrow: 'Help center', heading: 'Frequently asked questions.', lead: 'Straightforward answers about the product as it exists today.', blocks: [
        { heading: 'Is Taqdom free?', text: 'Yes. Taqdom is intended to stay free for everyone, with no paid plans or subscription fees.' },
        { heading: 'Do I need to know how to code?', text: 'No coding is required to edit the current portfolio fields and choose among available design starting points.' },
        { heading: 'Does it support Arabic?', text: 'Yes. The site supports English and Modern Standard Arabic, including right-to-left layouts.' },
        { heading: 'How many template starting points are available?', text: 'There are 126 profession-and-style combinations: 14 professional categories across nine distinct art-directed visual systems. You can personalize the content and color palette.' },
        { heading: 'Can I publish to my own subdomain?', text: 'Yes. When you publish a portfolio, you can choose an available username and share it at username.taqdom.me.' },
        { heading: 'How does the AI writing helper work?', text: 'It is optional. When you request an improvement, the selected headline or biography text is sent to the server-side AI endpoint for a suggestion.' },
        { heading: 'Can I export my portfolio?', text: 'The current editor can export a standalone HTML copy of the portfolio.' },
      ] },
      ar: { title: 'الأسئلة الشائعة | تقدّم', description: 'إجابات عن الاستخدام المجاني والقوالب واللغات ومساعدة الكتابة بالذكاء الاصطناعي وإمكانات النشر في تقدّم.', eyebrow: 'مركز المساعدة', heading: 'الأسئلة الشائعة.', lead: 'إجابات واضحة عن إمكانات المنتج الحالية.', blocks: [
        { heading: 'هل استخدام تقدّم مجاني؟', text: 'نعم. يهدف تقدّم إلى البقاء مجانيًا للجميع، دون خطط مدفوعة أو رسوم اشتراك.' },
        { heading: 'هل أحتاج إلى معرفة البرمجة؟', text: 'لا تحتاج إلى كتابة الشيفرة لتحرير الحقول الحالية لمعرض الأعمال والاختيار من بدايات التصميم المتاحة.' },
        { heading: 'هل يدعم الموقع اللغة العربية؟', text: 'نعم. يدعم الموقع الإنجليزية والعربية الفصحى الحديثة، بما في ذلك تخطيطات الكتابة من اليمين إلى اليسار.' },
        { heading: 'كم تركيبة تصميم متاحة؟', text: 'توجد 126 تركيبة تجمع بين 14 مجالًا مهنيًا وتسعة أنظمة بصرية مختلفة. ويمكن تخصيص المحتوى ولوحة الألوان في كل تصميم.' },
        { heading: 'هل يمكنني النشر على نطاق فرعي خاص بي؟', text: 'نعم. عند نشر معرض أعمالك، يمكنك اختيار اسم مستخدم متاح ومشاركة موقعك على عنوان username.taqdom.me.' },
        { heading: 'كيف يعمل مساعد الكتابة بالذكاء الاصطناعي؟', text: 'المساعد اختياري. عند طلب التحسين، يُرسل نص العنوان أو النبذة المحددة إلى واجهة الذكاء الاصطناعي على الخادم لتقديم اقتراح.' },
        { heading: 'هل يمكن تصدير معرض الأعمال؟', text: 'يمكن للمحرر الحالي تصدير نسخة HTML مستقلة من معرض الأعمال.' },
      ] },
    },
    contact: {
      en: { title: 'Contact Taqdom | Help and Feedback', description: 'Contact the Taqdom project through GitHub to report an issue, share feedback, or ask a product question.', eyebrow: 'Contact', heading: 'Help shape what comes next.', lead: 'Questions, bug reports, and thoughtful feedback help improve the project.', blocks: [
        { heading: 'Report a bug', text: 'Use GitHub Issues for reproducible bugs, including the page, browser, and steps needed to reproduce the problem.' },
        { heading: 'Share an idea', text: 'Open a feature request and describe the problem you are trying to solve, rather than prescribing a specific implementation.' },
        { heading: 'Security and privacy', text: 'Do not post access tokens, passwords, session cookies, or private user data in public issues. Follow the private reporting guidance in the security policy.' },
      ] },
      ar: { title: 'التواصل مع تقدّم | المساعدة والملاحظات', description: 'تواصل مع مشروع تقدّم عبر GitHub للإبلاغ عن مشكلة أو مشاركة ملاحظات أو طرح سؤال حول المنتج.', eyebrow: 'التواصل', heading: 'ساهم في تشكيل الخطوات القادمة.', lead: 'تساعد الأسئلة وتقارير الأخطاء والملاحظات المفيدة على تطوير المشروع.', blocks: [
        { heading: 'الإبلاغ عن مشكلة', text: 'استخدم GitHub Issues للإبلاغ عن الأخطاء القابلة لإعادة الإنتاج، مع ذكر الصفحة والمتصفح وخطوات إظهار المشكلة.' },
        { heading: 'مشاركة فكرة', text: 'قدّم اقتراحًا جديدًا واشرح المشكلة التي تريد حلها بدلًا من فرض طريقة تنفيذ محددة.' },
        { heading: 'الأمان والخصوصية', text: 'لا تنشر مفاتيح الوصول أو كلمات المرور أو ملفات تعريف الارتباط للجلسات أو بيانات المستخدمين الخاصة في البلاغات العامة. اتبع تعليمات الإبلاغ الخاص في سياسة الأمان.' },
      ] },
    },
    privacy: {
      en: { title: 'Privacy Notice | Taqdom', description: 'Read how Taqdom handles account information, portfolio drafts, and text submitted to its optional AI writing assistant.', eyebrow: 'Privacy', heading: 'Your work deserves careful handling.', lead: 'This notice summarizes the current product behavior; it is not a substitute for independent legal advice or a comprehensive compliance review.', blocks: [
        { heading: 'Account and portfolio data', text: 'The account service processes information you provide for your account, authentication, and saved portfolio drafts. The current account and portfolio records use Cloudflare D1.' },
        { heading: 'AI writing assistance', text: 'The AI helper is optional. Text is sent to the server-side writing endpoint only after you request an improvement. Avoid sending passwords, financial details, or other sensitive information.' },
        { heading: 'Abuse prevention and technical data', text: 'The service may process technical request information to operate the site and enforce usage limits. The current AI endpoint uses a hashed IP-derived identifier for anonymous usage quotas.' },
        { heading: 'Questions or requests', text: 'For privacy-related concerns, use the project’s contact options. Do not publish sensitive account details in a public issue.' },
      ] },
      ar: { title: 'إشعار الخصوصية | تقدّم', description: 'تعرّف على كيفية تعامل تقدّم مع بيانات الحساب ومسودات معارض الأعمال والنصوص المرسلة إلى مساعد الكتابة الاختياري.', eyebrow: 'الخصوصية', heading: 'تستحق أعمالك التعامل معها بعناية.', lead: 'يلخص هذا الإشعار سلوك المنتج الحالي، ولا يُعد بديلًا عن المشورة القانونية المستقلة أو مراجعة امتثال شاملة.', blocks: [
        { heading: 'بيانات الحساب ومعرض الأعمال', text: 'تعالج خدمة الحساب المعلومات التي تقدمها لإنشاء الحساب والمصادقة وحفظ مسودات معرض الأعمال. تُخزَّن سجلات الحسابات ومعارض الأعمال الحالية باستخدام Cloudflare D1.' },
        { heading: 'مساعدة الكتابة بالذكاء الاصطناعي', text: 'مساعد الذكاء الاصطناعي اختياري. لا يُرسل النص إلى واجهة الكتابة على الخادم إلا بعد طلبك تحسينه. تجنب إرسال كلمات المرور أو البيانات المالية أو غيرها من المعلومات الحساسة.' },
        { heading: 'منع إساءة الاستخدام والبيانات التقنية', text: 'قد تعالج الخدمة معلومات تقنية عن الطلبات لتشغيل الموقع وتطبيق حدود الاستخدام. تستخدم واجهة الذكاء الاصطناعي الحالية معرّفًا مشتقًا من عنوان IP ومحوّلًا إلى قيمة مجزأة لتحديد حصص الاستخدام المجهول.' },
        { heading: 'الأسئلة أو الطلبات', text: 'للمخاوف المتعلقة بالخصوصية، استخدم قنوات التواصل الخاصة بالمشروع. لا تنشر تفاصيل الحساب الحساسة في بلاغ عام.' },
      ] },
    },
    terms: {
      en: { title: 'Terms of Use | Taqdom', description: 'Read the basic terms for using Taqdom’s free portfolio editor, exported HTML, optional AI writing assistance, and project content.', eyebrow: 'Terms of use', heading: 'Use the studio thoughtfully.', lead: 'These plain-language terms describe the current project at a high level and are not a substitute for formal legal advice.', blocks: [
        { heading: 'Free access and availability', text: 'Taqdom is intended to be free for everyone. The service is under active development, so features may change and uninterrupted availability is not guaranteed.' },
        { heading: 'Your content', text: 'You remain responsible for the text, images, and other material you add or publish. Use assets you have permission to use and avoid including private information about others.' },
        { heading: 'AI-generated suggestions', text: 'AI writing suggestions may be inaccurate or unsuitable. Review and edit them before use; you are responsible for the final content you publish.' },
        { heading: 'Third-party services and assets', text: 'The service relies on third-party infrastructure, libraries, fonts, and some illustrative external images, which remain subject to their own terms and licenses.' },
        { heading: 'Open-source code', text: 'The project’s original code is made available under the MIT License. That license does not automatically apply to third-party images, fonts, or dependencies.' },
      ] },
      ar: { title: 'شروط الاستخدام | تقدّم', description: 'اقرأ الشروط الأساسية لاستخدام محرر معارض الأعمال المجاني ومساعدة الكتابة الاختيارية وتصدير HTML ومحتوى المشروع.', eyebrow: 'شروط الاستخدام', heading: 'استخدم الاستوديو بمسؤولية.', lead: 'توضح هذه الشروط المبسطة طبيعة المشروع الحالية على مستوى عام، ولا تحل محل المشورة القانونية الرسمية.', blocks: [
        { heading: 'الاستخدام المجاني والتوفر', text: 'يهدف تقدّم إلى البقاء مجانيًا للجميع. لا يزال تطوير الخدمة مستمرًا؛ لذلك قد تتغير المميزات ولا يُضمن استمرار التوفر دون انقطاع.' },
        { heading: 'المحتوى الخاص بك', text: 'تتحمل مسؤولية النصوص والصور والمواد الأخرى التي تضيفها أو تنشرها. استخدم مواد تملك حق استخدامها، وتجنب إدراج معلومات خاصة بأشخاص آخرين.' },
        { heading: 'اقتراحات الذكاء الاصطناعي', text: 'قد تكون الاقتراحات غير دقيقة أو غير مناسبة. راجعها وعدّلها قبل الاستخدام؛ فأنت مسؤول عن المحتوى النهائي الذي تنشره.' },
        { heading: 'الخدمات والمواد التابعة لجهات أخرى', text: 'تعتمد الخدمة على بنية تحتية ومكتبات وخطوط وبعض الصور التوضيحية الخارجية التابعة لجهات أخرى، وتظل خاضعة لشروطها وتراخيصها الخاصة.' },
        { heading: 'الكود مفتوح المصدر', text: 'الكود الأصلي للمشروع متاح بموجب ترخيص MIT. لا يشمل هذا الترخيص تلقائيًا الصور أو الخطوط أو الاعتماديات التابعة لجهات أخرى.' },
      ] },
    },
    'not-found': {
      en: { title: 'Page Not Found | Taqdom', description: 'The page you are looking for could not be found. Visit Taqdom home to continue.', eyebrow: '404 · Page not found', heading: 'This page is not here.', lead: 'The address may be incorrect or the page may have moved. Start again from the home page.', blocks: [] },
      ar: { title: 'الصفحة غير موجودة | تقدّم', description: 'تعذر العثور على الصفحة المطلوبة. انتقل إلى الصفحة الرئيسية لمتابعة استخدام تقدّم.', eyebrow: '404 · الصفحة غير موجودة', heading: 'هذه الصفحة غير متاحة.', lead: 'قد يكون العنوان غير صحيح أو ربما نُقلت الصفحة. يمكنك البدء مجددًا من الصفحة الرئيسية.', blocks: [] },
    },
  }
  return en ? copy[page].en : copy[page].ar
}

const jobs = [
  ['design', 'التصميم', 'مصمم منتجات رقمية'], ['code', 'البرمجة', 'مطوّر برمجيات'], ['photo', 'التصوير', 'مصوّر فوتوغرافي'],
  ['writing', 'الكتابة', 'كاتب ومحرر'], ['consulting', 'الاستشارات', 'مستشار أعمال'], ['education', 'التعليم', 'مدرّس'],
  ['architecture', 'العمارة', 'مهندس معماري'], ['marketing', 'التسويق', 'مسوّق رقمي'], ['health', 'الصحة', 'متخصص صحي'], ['business', 'الأعمال', 'صاحب مشروع'],
  ['law', 'القانون', 'مستشار قانوني'], ['engineering', 'الهندسة', 'مهندس'], ['people', 'الموارد البشرية', 'متخصص موارد بشرية'], ['events', 'الفعاليات', 'منظم فعاليات'],
]
const layouts = ['Nexus', 'Forma', 'Pulse', 'Lumen', 'Vertex', 'Mono', 'Eclipse', 'Zenith', 'Vortex']
const layoutsAr = [
  'نيكسس · تقنية مستقبلية',
  'فورما · تصميم طبيعي',
  'بالس · إبداع نابض',
  'لومن · بصري وطبيعي',
  'فيرتكس · تقنيات متقدمة',
  'مونو · هندسي بسيط',
  'إكليبس · كوني داكن',
  'زينيث · مستقبلي ناعم',
  'فورتيكس · سينمائي',
]
const jobEnglish: [string, string][] = [
  ['Design & creative','Digital Product Designer'], ['Technology','Software Developer'], ['Photography','Photographer'],
  ['Writing','Writer & Editor'], ['Consulting','Business Consultant'], ['Education','Educator'],
  ['Architecture','Architect'], ['Marketing','Digital Marketer'], ['Healthcare','Healthcare Professional'],
  ['Business','Founder'], ['Law','Legal Advisor'], ['Engineering','Engineer'],
  ['People & culture','People & Culture Specialist'], ['Events','Event Producer'],
]
const demoPalettes: [string, string][] = [
  ['#8b5cff','#67e5ff'], ['#e8dfc9','#78917a'], ['#ff398a','#ff8f38'],
  ['#4be1c2','#3b9c96'], ['#387dff','#5ce6ff'], ['#c6ccd7','#646c79'],
  ['#a16bff','#6d4cff'], ['#a7a4ff','#ffb7e5'], ['#ff871f','#ffc15e'],
]
const colors = ['#35b7ff','#5c9b76','#ff3b92','#42d9c3','#367dff','#b9c0cc','#9e64ff','#7a6eff','#ff861c']
const stylePales = ['#0a1b33','#f1ecdf','#291027','#e2f2e9','#071b35','#e6e8eb','#17102c','#f4f0ff','#29170d']
const templates: Template[] = jobs.flatMap((job, j) => layouts.map((_, l) => ({ id: job[0] + '-' + l, profession: job[1], role: job[2], professionEn: jobEnglish[j][0], roleEn: jobEnglish[j][1], layout: l, accent: colors[l], pale: stylePales[l] })))
const initial: Portfolio = { name:'سلمى حسن', role:'مصممة منتجات رقمية', bio:'أصمم منتجات رقمية بسيطة وقريبة من الناس. أحوّل الأفكار المعقدة إلى تجارب واضحة، وأحب العمل مع فرق تشارك هدفًا حقيقيًا.', email:'hello@example.com', location:'القاهرة، مصر', accent:'#8b5cff', templateId:'design-0', projects:['تجربة مصرفية أسهل','منصة تعلّم عربية','هوية استوديو نون'], visible:{about:true,projects:true,contact:true}, avatarUrl:'', slug:'' }
const imageUrls = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=76',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=720&q=74',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=720&q=74',
  'https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=720&q=74',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=720&q=74',
  'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=720&q=74',
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
      avatarUrl: typeof saved.avatarUrl === 'string' ? saved.avatarUrl.slice(0, 1000) : '',
      slug: typeof saved.slug === 'string' ? saved.slug.slice(0, 80) : '',
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
    avatarUrl: typeof raw.avatarUrl === 'string' ? raw.avatarUrl : (fallback.avatarUrl || ''),
    slug: typeof raw.slug === 'string' ? raw.slug : (fallback.slug || ''),
  }
}

export default function App() {
  const query = new URLSearchParams(location.search)
  const siteRoute = resolveSiteRoute(location.pathname)
  const publicRouteId = parsePublicRoute(location.pathname, location.search, location.hostname)
  const [portfolio, setPortfolio] = useState<Portfolio>(readSaved)
  const [publicIdentifier, setPublicIdentifier] = useState<string | null>(publicRouteId)
  const [view, setView] = useState<AppView>(publicRouteId ? 'public' : query.has('preview') ? 'preview' : query.has('auth') ? 'auth' : 'home')
  const [language, setLanguage] = useState<SiteLanguage>(() => query.get('lang') === 'ar' ? 'ar' : query.get('lang') === 'en' ? 'en' : siteRoute.language)
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
  const [portfolioSlug, setPortfolioSlug] = useState('')
  const [accountError, setAccountError] = useState('')
  const [accountBusy, setAccountBusy] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [inboxLoading, setInboxLoading] = useState(false)
  const [inboxMessages, setInboxMessages] = useState<Array<{ id: string; sender_name: string; sender_email: string; message: string; created_at: string }>>([])
  const en = language === 'en'
  const toggleLanguage = () => {
    const next: SiteLanguage = language === 'en' ? 'ar' : 'en'
    if (view === 'home') {
      window.location.assign(localizedSitePath(next, siteRoute.page))
      return
    }
    setLanguage(next)
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set('lang', next)
    history.replaceState({}, '', nextUrl.pathname + nextUrl.search + nextUrl.hash)
  }
  const chosen = templates.find(t => t.id === portfolio.templateId) || templates[0]
  const filtered = useMemo(() => templates.filter(t =>
    (category === 'الكل' || t.profession === category) &&
    (!search || (t.profession + t.role + t.professionEn + t.roleEn + layouts[t.layout] + layoutsAr[t.layout]).toLowerCase().includes(search.toLowerCase()))
  ), [category, search])

  useEffect(() => {
    document.documentElement.lang = language
    if (view === 'public') {
      document.title = en ? 'Portfolio | Taqdom' : 'معرض أعمال | تقدّم'
      return
    }
    const seo = getContentPageCopy(siteRoute.page, en)
    document.title = seo.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', seo.description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', seo.title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', seo.description)
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', en ? 'en_US' : 'ar')
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', new URL(localizedSitePath(language, siteRoute.page), location.origin).href)
    document.querySelector('meta[name="robots"]')?.setAttribute('content', siteRoute.page === 'not-found' || query.has('auth') || query.has('preview') || view !== 'home' ? 'noindex, follow' : 'index, follow')
  }, [language, en, view])
  useEffect(() => {
    let active = true
    // Public content pages do not need an authentication round trip.
    if (view !== 'home' || siteRoute.page !== 'home') {
      setAccountLoading(false)
      return () => { active = false }
    }
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
  const goHome = () => {
    const host = location.hostname.toLowerCase()
    if (host !== 'taqdom.me' && host.endsWith('.taqdom.me')) {
      window.location.assign('https://taqdom.me/')
      return
    }
    setPublicIdentifier(null)
    history.replaceState({}, '', location.pathname)
    setView('home')
    setAccountError('')
    window.scrollTo(0,0)
  }
  const openAuth = (mode: AuthMode) => { setAuthMode(mode); history.pushState({}, '', '?auth=' + mode + '&lang=' + language); setView('auth'); setAccountError(''); window.scrollTo(0,0) }
  const openDashboard = async () => {
    history.replaceState({}, '', location.pathname); setView('dashboard'); setAccountError(''); window.scrollTo(0,0)
    if (user) {
      try {
        const data = await apiRequest<{ portfolios: SavedPortfolio[] }>('/api/portfolios')
        setAccountPortfolios(data.portfolios)
      } catch { /* ignore */ }
    }
  }
  const publishSite = async () => {
    if (!user) { openAuth('register'); return }
    const requestedSlug = portfolioSlug.trim().toLowerCase()
    if (!isValidPortfolioSubdomain(requestedSlug)) {
      setAccountError(en
        ? 'Choose a subdomain with 3–30 lowercase letters, numbers, or hyphens. It cannot start or end with a hyphen or use a reserved name.'
        : 'اختر اسم نطاق فرعي من 3 إلى 30 حرفًا إنجليزيًا صغيرًا أو رقمًا أو شرطة. لا يمكن أن يبدأ أو ينتهي بشرطة أو يستخدم اسمًا محجوزًا.')
      return
    }
    setPublishing(true); setAccountError('')
    try {
      let savedItem: SavedPortfolio
      if (!portfolioId) {
        const result = await apiRequest<{portfolio:SavedPortfolio}>('/api/portfolios', {
          method:'POST',
          body:JSON.stringify({ title: portfolio.name || (en ? 'My portfolio' : 'موقعي الشخصي'), templateId:portfolio.templateId, slug:requestedSlug, status:'published', document:{ ...portfolio, status:'published' } })
        })
        savedItem = result.portfolio
        setPortfolioId(savedItem.id)
        setPortfolio(p => ({ ...p, slug: savedItem.slug }))
      } else {
        await apiRequest<{ok:boolean;status:'published'}>('/api/portfolios/' + portfolioId, {
          method: 'PUT',
          body: JSON.stringify({
            title: portfolio.name || (en ? 'My portfolio' : 'موقعي الشخصي'),
            templateId: portfolio.templateId,
            slug: requestedSlug,
            status: 'published',
            document: { ...portfolio, status: 'published' }
          })
        })
        savedItem = { id:portfolioId, title:portfolio.name || (en ? 'My portfolio' : 'موقعي الشخصي'), slug:requestedSlug, templateId:portfolio.templateId, document:portfolio, status:'published', createdAt:'', updatedAt:new Date().toISOString() }
      }
      setPortfolioSlug(savedItem.slug || requestedSlug)
      setSaved(true)
      setAccountPortfolios(items => [savedItem, ...items.filter(it => it.id !== savedItem.id)])
      setPublishModalOpen(true)
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      setAccountError(code === 'subdomain_taken'
        ? (en ? 'That subdomain is already in use. Choose another one.' : 'اسم النطاق ده مستخدم بالفعل. اختار اسمًا تاني.')
        : code === 'invalid_subdomain'
          ? (en ? 'That subdomain is not allowed. Check the name and try again.' : 'اسم النطاق غير صالح. راجع الاسم وحاول مرة أخرى.')
          : (en ? 'Could not publish site. Please try again.' : 'تعذر نشر الموقع. يُرجى المحاولة مجددًا.'))
    } finally {
      setPublishing(false)
    }
  }
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert(en ? 'Please select an image file.' : 'يرجى اختيار ملف صورة.')
      return
    }
    setAvatarUploading(true)
    try {
      const img = new Image()
      const reader = new FileReader()
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          img.onload = () => {
            const maxDim = 512
            let width = img.width
            let height = img.height
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width)
                width = maxDim
              } else {
                width = Math.round((width * maxDim) / height)
                height = maxDim
              }
            }
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) return reject(new Error('canvas_failed'))
            ctx.drawImage(img, 0, 0, width, height)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
            resolve(dataUrl.split(',')[1])
          }
          img.onerror = () => reject(new Error('image_load_failed'))
          img.src = reader.result as string
        }
        reader.onerror = () => reject(new Error('read_failed'))
        reader.readAsDataURL(file)
      })

      const res = await apiRequest<{ ok: boolean; id: string; url: string }>('/api/media', {
        method: 'POST',
        body: JSON.stringify({ mimeType: 'image/jpeg', base64: base64Data })
      })
      update('avatarUrl', res.url)
    } catch (err) {
      console.error('Avatar upload failed', err)
      alert(en ? 'Failed to upload photo. Please try again.' : 'فشل رفع الصورة. يُرجى المحاولة مجددًا.')
    } finally {
      setAvatarUploading(false)
    }
  }
  const signOut = async () => {
    try { await apiRequest('/api/auth/logout', { method:'POST', body:'{}' }) } catch { /* local workspace still remains available */ }
    setUser(null); setAccountPortfolios([]); setPortfolioId(null); setPortfolioSlug(''); goHome()
  }
  const handleAuthSuccess = async (nextUser: User) => {
    setUser(nextUser); setAccountError(''); setView('dashboard'); history.replaceState({}, '', location.pathname)
    try { const result = await apiRequest<{portfolios:SavedPortfolio[]}>('/api/portfolios'); setAccountPortfolios(result.portfolios) }
    catch { setAccountError(en ? 'Your account is ready, but your workspace did not load. Refresh to retry.' : 'تم إنشاء حسابك، لكن تعذر تحميل مساحة العمل. حدّث الصفحة للمحاولة مجددًا.') }
    window.scrollTo(0,0)
  }
  const createPortfolio = async () => {
    if (!user) { openAuth('register'); return }
    setAccountBusy(true); setAccountError('')
    const fresh: Portfolio = { ...initial, name:user.displayName, role:'', bio:'', email:user.email, location:'', projects:[], visible:{about:true,projects:true,contact:true}, templateId:'design-0', accent:'#8b5cff' }
    try {
      const result = await apiRequest<{portfolio:SavedPortfolio}>('/api/portfolios', { method:'POST', body:JSON.stringify({ title: en ? 'My first portfolio' : 'موقعي الشخصي', templateId:fresh.templateId, document:fresh }) })
      setPortfolio(normalisePortfolio(result.portfolio.document, fresh)); setPortfolioId(result.portfolio.id); setPortfolioSlug(result.portfolio.slug || 'site-'+result.portfolio.id.slice(0,6)); setAccountPortfolios(items => [result.portfolio, ...items]); history.replaceState({}, '', location.pathname); setView('editor'); window.scrollTo(0,0)
    } catch (error) { setAccountError(error instanceof Error && error.message === 'portfolio_limit_reached' ? (en ? 'You reached the current project limit.' : 'وصلت للحد الحالي للمشاريع.') : (en ? 'We could not create your site. Please try again.' : 'تعذر إنشاء موقعك. يُرجى المحاولة مجددًا.')) }
    finally { setAccountBusy(false) }
  }
  const openInbox = async () => {
    if (!portfolioId) return
    setInboxOpen(true)
    setInboxLoading(true)
    try {
      const res = await apiRequest<{ messages: Array<{ id: string; sender_name: string; sender_email: string; message: string; created_at: string }> }>(`/api/messages/${portfolioId}`)
      setInboxMessages(res.messages || [])
    } catch {
      setInboxMessages([])
    } finally {
      setInboxLoading(false)
    }
  }
  const openPortfolio = (item: SavedPortfolio) => {
    const next = normalisePortfolio(item.document, initial)
    setPortfolio(next); setPortfolioId(item.id); setPortfolioSlug(isValidPortfolioSubdomain(item.slug || '') ? item.slug! : 'site-'+item.id.slice(0,6)); history.replaceState({}, '', location.pathname); setView('editor'); setAccountError(''); window.scrollTo(0,0)
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
      setPortfolio(fresh); setPortfolioId(result.portfolio.id); setPortfolioSlug(result.portfolio.slug || 'site-'+result.portfolio.id.slice(0,6)); setAccountPortfolios(items=>[result.portfolio,...items]); history.replaceState({}, '', location.pathname); setView('editor'); window.scrollTo(0,0)
    } catch { setAccountError(en ? 'We could not create the project.' : 'تعذر إنشاء المشروع.') }
    finally { setAccountBusy(false) }
  }
  const preview = () => { try { localStorage.setItem('taqdom.portfolio', JSON.stringify(portfolio)) } catch { /* ignore storage failure */ } const url = new URL(location.href); url.searchParams.set('preview','1'); history.pushState({},'',url); setView('preview'); window.scrollTo(0,0) }
  const exportSite = () => downloadPortfolioHtml(portfolio, chosen, language)
  const vars = { '--accent':portfolio.accent, '--pale':chosen.pale } as CSSProperties

  const improveText = async (kind: 'bio' | 'headline') => {
    const text = kind === 'bio' ? portfolio.bio : portfolio.role
    if (!text.trim()) { setAiMessage(en ? 'Add a little text first, then ask AI to improve it.' : 'أضف بعض التفاصيل أولًا، ثم اطلب تحسين النص.'); return }
    setAiBusy(kind); setAiMessage('')
    try {
      const result = await improveCareerText({ text, kind, locale: language })
      update(kind === 'bio' ? 'bio' : 'role', result.text)
      const remaining = typeof result.remainingToday === 'number' ? (en ? ' · ' + result.remainingToday + ' AI uses left today' : ' · متبقي ' + result.remainingToday + ' محاولة متبقية اليوم') : ''
      setAiMessage((en ? 'Text improved. Review it before publishing.' : 'تم تحسين النص. يرجى مراجعته قبل النشر.') + remaining)
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

  if (view === 'public') return <PublicPortfolioPage idOrSlug={publicIdentifier || ''} language={language} onLanguage={toggleLanguage} onGoHome={goHome} onStart={()=>user ? openDashboard() : openAuth('register')} />
  if (view === 'home' && siteRoute.page !== 'home') return <ContentPage page={siteRoute.page} language={language} onLanguage={toggleLanguage} />
  if (view === 'home') return <LandingPage language={language} user={user} onLanguage={toggleLanguage} onStart={()=>user ? openDashboard() : openAuth('register')} onLogin={()=>user ? openDashboard() : openAuth('login')} onTemplate={chooseTemplate} />
  if (view === 'auth') return <AuthScreen mode={authMode} language={language} onLanguage={toggleLanguage} onBack={goHome} onMode={openAuth} onSuccess={handleAuthSuccess} />
  if (view === 'dashboard') return <Dashboard language={language} user={user} loading={accountLoading} busy={accountBusy} items={accountPortfolios} error={accountError} onLanguage={toggleLanguage} onHome={goHome} onCreate={()=>void createPortfolio()} onOpen={openPortfolio} onLogout={()=>void signOut()} onClearError={()=>setAccountError('')} />
  if (view === 'preview') return <div className="preview-screen" style={vars}><div className="preview-bar"><button onClick={()=>{history.replaceState({},'',location.pathname);setView('editor')}}>← {en?'Back to editor':'العودة للمحرر'}</button><span className="preview-status"><i/>{en?'Private preview':'معاينة خاصة'}</span><button className="small-action" onClick={exportSite}>{en?'Download HTML':'تنزيل HTML'} ↓</button></div><PortfolioCanvas data={portfolio} template={chosen} language={language}/></div>

  return <div className="app-shell editor-mode">
    <header className="topbar"><a className="brand" href="#" onClick={e=>{e.preventDefault();user?openDashboard():goHome()}}><BrandMark/><span>taqdom<span className="brand-dot">.</span></span></a>
      <div className="editor-breadcrumb">{en?'My workspace':'مساحة عملي'} <b>/</b> <strong>{portfolio.name || (en?'New portfolio':'موقعي الجديد')}</strong></div>
      <div className="top-actions"><span className={'save-indicator '+(saved?'is-saved':'')}><i/>{saved?(en?'Saved':'تم الحفظ'):(en?'Saving…':'جارٍ الحفظ…')}</span><button className="lang-switch" onClick={toggleLanguage}>{en?'العربية':'English'}</button>{user?<button className="button button-light hide-mobile" onClick={openDashboard}>{en?'Workspace':'مساحة العمل'}</button>:<button className="button button-light hide-mobile" onClick={()=>openAuth('register')}>{en?'Create account':'إنشاء حساب'}</button>}<button className="button button-dark hide-mobile" onClick={exportSite}>{en?'Export site':'نزّل الموقع'} <span>↓</span></button></div>
    </header>
    <main className="editor-layout">
      <aside className={'editor-sidebar '+(mobilePanel?'panel-open':'')}><div className="sidebar-scroll">
        <div className="editor-side-title"><div><small>{en?'YOUR PORTFOLIO':'موقعك الشخصي'}</small><h2>{en?'Make it yours':'ظبّطه بطريقتك'}</h2></div><button className="close-panel" onClick={()=>setMobilePanel(false)}>×</button></div>
        <div className="editor-group-label">{en?'01 — Profile':'01 — بياناتك'}</div>
        <div className="avatar-upload-control">
          <div className="avatar-preview-wrap">
            {portfolio.avatarUrl ? <img src={portfolio.avatarUrl} alt="Avatar" className="avatar-preview-thumb"/> : <span className="avatar-preview-empty">👤</span>}
          </div>
          <div className="avatar-upload-actions">
            <label className="avatar-upload-btn">
              {avatarUploading ? (en ? 'Uploading…' : 'جارٍ الرفع…') : (portfolio.avatarUrl ? (en ? 'Change photo' : 'تغيير الصورة') : (en ? 'Upload photo' : 'رفع صورة شخصية'))}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarFile} style={{ display: 'none' }} disabled={avatarUploading} />
            </label>
            {portfolio.avatarUrl && <button type="button" className="avatar-remove-btn" onClick={() => update('avatarUrl', '')}>{en ? 'Remove' : 'حذف'}</button>}
          </div>
        </div>
        <label className="field-label">{en?'Your name':'الاسم'}<input value={portfolio.name} onChange={e=>update('name',e.target.value)}/></label>
        <label className="field-label">{en?'What you do':'ما طبيعة عملك؟'}<input value={portfolio.role} maxLength={180} onChange={e=>update('role',e.target.value)}/></label>
        <label className="field-label subdomain-field">{en?'Your public address':'عنوان موقعك العام'}
          <div className="subdomain-input-wrap"><input value={portfolioSlug} maxLength={30} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={e=>setPortfolioSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} aria-label={en?'Your subdomain':'اسم النطاق الفرعي'}/><span>.taqdom.me</span></div>
          <small className="subdomain-help">{en?'Use a unique English username. You can change it before publishing.':'اختار اسمًا إنجليزيًا مميزًا؛ تقدر تغيّره قبل النشر.'}</small>
        </label>
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
        <div className="control-section"><div className="control-heading"><b>{en?'Choose a direction':'اختر نمط الموقع'}</b><span>{templates.length} {en?'starting points':'بداية'}</span></div><input className="search-input" value={search} onChange={e=>{setSearch(e.target.value);setShowAllTemplates(false)}} placeholder={en?'Search profession or style…':'ابحث عن مجال أو تصميم…'}/><div className="category-pills">{[{value:'الكل',ar:'الكل',en:'All'},...jobs.map((j,index)=>({value:j[1],ar:j[1],en:jobEnglish[index][0]}))].map(c=><button className={category===c.value?'active':''} key={c.value} onClick={()=>{setCategory(c.value);setShowAllTemplates(false)}}>{en?c.en:c.ar}</button>)}</div><div className="template-list">{filtered.slice(0,showAllTemplates?filtered.length:10).map(t=><button className={t.id===portfolio.templateId?'chosen':''} key={t.id} onClick={()=>update('templateId',t.id)}><span className={'template-mini template-mini-'+t.layout} style={{'--accent':t.accent,'--pale':t.pale} as CSSProperties}><i/></span><span><b>{en?t.professionEn:t.profession}</b><small>{en?layouts[t.layout]:layoutsAr[t.layout]}</small></span>{t.id===portfolio.templateId&&<b className="checkmark">✓</b>}</button>)}</div>{filtered.length>10&&<button className="show-more" onClick={()=>setShowAllTemplates(v=>!v)}>{showAllTemplates?(en?'Show fewer':'عرض أقل'):(en?'Show all '+filtered.length:'اعرض كل الـ '+filtered.length)} {showAllTemplates?'↑':'↓'}</button>}</div>
      </div><div className="sidebar-bottom"><button className="button button-primary button-wide" onClick={()=>void publishSite()} disabled={publishing}>{publishing?(en?'Publishing…':'جارٍ النشر…'):(en?'Publish site 🚀':'انشر موقعك 🚀')}</button><button className="button button-light button-wide" onClick={preview}>{en?'Preview my site':'عاين موقعي'} <span>↗</span></button><button className="button button-light button-wide" onClick={exportSite}>{en?'Export HTML':'نزّل نسخة HTML'} <span>↓</span></button><div className="local-note">{user?(saved?(en?'☁ Saved to your account':'☁ محفوظ على حسابك'):(en?'Saving to cloud…':'جارٍ الحفظ سحابيًا…')):(en?'Saved only on this device':'محفوظ على الجهاز فقط')}</div></div></aside>
      <section className="editor-workspace"><div className="editor-toolbar"><div className="toolbar-start"><button className="mobile-panel-button" onClick={()=>setMobilePanel(true)}>☷ {en?'Edit':'تعديل'}</button><div className="mode-switch"><button className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')}>▣ <span>{en?'Desktop':'الحاسوب'}</span></button><button className={device==='mobile'?'active':''} onClick={()=>setDevice('mobile')}>▯ <span>{en?'Mobile':'الهاتف'}</span></button></div></div><div className="toolbar-end"><span className="canvas-live-status"><i/> {en?'Live preview':'معاينة مباشرة'}</span>{portfolioId && <button type="button" className="button button-light toolbar-inbox" onClick={()=>void openInbox()}>📬 {en?'Inbox':'الرسائل'}</button>}<button className="button button-light toolbar-publish" onClick={preview}>{en?'Preview ↗':'معاينة ↗'}</button><button className="button button-primary toolbar-publish" onClick={()=>void publishSite()} disabled={publishing}>{publishing?(en?'Publishing…':'جارٍ النشر…'):(en?'Publish 🚀':'انشر موقعك 🚀')}</button></div></div>
        <div className="canvas-area"><div className={'canvas-browser '+(device==='mobile'?'mobile-frame':'')}><div className="canvas-browser-bar"><span className="browser-dots"><i/><i/><i/></span><span className="canvas-address">{portfolioSlug || 'your-name'}.taqdom.me</span><span className="canvas-zoom">{device==='desktop'?'100%':'390 px'}</span></div><PortfolioCanvas data={portfolio} template={chosen} language={language}/></div><p className="canvas-hint"><span>✦</span>{user?(en?'Your changes are saved to your account.':'تعديلاتك محفوظة على حسابك.'):(en?'This is a local demo. Create an account to save your project across devices.':'هذه معاينة محلية. أنشئ حسابًا لحفظ موقعك والوصول إليه من أي جهاز.')}</p></div>
      </section>
    </main>
    {publishModalOpen && (
      <div className="publish-modal-overlay" onClick={()=>setPublishModalOpen(false)}>
        <div className="publish-modal-card" onClick={e=>e.stopPropagation()}>
          <button className="close-modal" onClick={()=>setPublishModalOpen(false)}>×</button>
          <div className="modal-icon">🎉</div>
          <h3>{en?'Your site is live!':'مبروك! موقعك منشور الآن على الإنترنت'}</h3>
          <p>{en?'Anyone with this link can now view your portfolio and get in touch with you.':'يمكن لأي شخص الآن فتح الرابط، تصفح معرض أعمالك، والتواصل معك مباشرة.'}</p>
          <div className="publish-link-box">
            <input readOnly value={`https://${portfolioSlug}.taqdom.me`} id="publish-link-input"/>
            <button onClick={()=>{
              const el = document.getElementById('publish-link-input') as HTMLInputElement
              if (el) { el.select(); navigator.clipboard.writeText(el.value); alert(en?'Link copied!':'تم نسخ الرابط بنجاح!') }
            }}>{en?'Copy':'نسخ'}</button>
          </div>
          <div className="modal-actions">
            <a href={`https://${portfolioSlug}.taqdom.me`} target="_blank" rel="noopener noreferrer" className="button button-primary">{en?'Visit Public Site ↗':'زيارة موقعك الآن ↗'}</a>
            <button className="button button-light" onClick={()=>setPublishModalOpen(false)}>{en?'Done':'إغلاق'}</button>
          </div>
        </div>
      </div>
    )}
    {inboxOpen && (
      <div className="publish-modal-overlay" onClick={()=>setInboxOpen(false)}>
        <div className="publish-modal-card" onClick={e=>e.stopPropagation()} style={{ maxWidth:'560px', width:'92%' }}>
          <button className="close-modal" onClick={()=>setInboxOpen(false)}>×</button>
          <div className="modal-icon">📬</div>
          <h3>{en ? 'Visitor Messages' : 'رسائل الزوار المستلمة'}</h3>
          <p>{en ? 'Messages sent to you from your published portfolio page.' : 'الرسائل التي أرسلها لك الزوار عبر نموذج التواصل في موقعك المنشور.'}</p>
          {inboxLoading ? (
            <div style={{ padding:'24px', textAlign:'center', color:'#8b8a99' }}>{en ? 'Loading messages…' : 'جارٍ تحميل الرسائل…'}</div>
          ) : inboxMessages.length === 0 ? (
            <div style={{ padding:'24px', textAlign:'center', color:'#8b8a99' }}>{en ? 'No messages received yet.' : 'لا توجد رسائل مستلمة بعد.'}</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px', maxHeight:'320px', overflowY:'auto', textAlign: en ? 'left' : 'right', padding:'4px' }}>
              {inboxMessages.map(msg => (
                <div key={msg.id} style={{ background:'#191924', border:'1px solid #ffffff14', borderRadius:'10px', padding:'12px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                    <strong style={{ color:'#fff', fontSize:'13px' }}>{msg.sender_name || (en ? 'Anonymous visitor' : 'زائر')}</strong>
                    <small style={{ color:'#8b8a99', fontSize:'11px' }}>{msg.created_at}</small>
                  </div>
                  {msg.sender_email && <div style={{ fontSize:'12px', color:'#a78bfa', marginBottom:'6px' }}><a href={`mailto:${msg.sender_email}`} style={{ color:'inherit', textDecoration:'none' }}>✉ {msg.sender_email}</a></div>}
                  <p style={{ margin:0, fontSize:'13px', color:'#e2e0ea', whiteSpace:'pre-wrap', lineHeight:1.5 }}>{msg.message}</p>
                </div>
              ))}
            </div>
          )}
          <div className="modal-actions" style={{ marginTop:'16px' }}>
            <button className="button button-light" onClick={()=>setInboxOpen(false)}>{en ? 'Close' : 'إغلاق'}</button>
          </div>
        </div>
      </div>
    )}
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
  const featured = templates.slice(0, 9)
  const titles = layouts
  const titlesAr = ['نيكسس','فورما','بالس','لومن','فيرتكس','مونو','إكليبس','زينيث','فورتيكس']
  const styleDescriptions = en
    ? ['Neon technology and digital reality','Warm editorial craft and natural materials','Bold creative energy in vivid color','Organic photography and calm scenery','Precision engineering and luminous geometry','Architectural minimalism in monochrome','Cosmic depth and violet light','Soft futuristic gradients and sculptural forms','Cinematic contrast with molten orange']
    : ['تقنية نيون وعالم رقمي مستقبلي','حرفية تحريرية دافئة وخامات طبيعية','طاقة إبداعية جريئة وألوان نابضة','تصوير عضوي ومشاهد طبيعية هادئة','هندسة دقيقة وأشكال مضيئة','بساطة معمارية بألوان أحادية','عمق كوني وإضاءة بنفسجية','تدرجات مستقبلية ناعمة وأشكال مجسمة','تباين سينمائي ولمسات برتقالية نارية']
  return <div className="landing" dir={en?'ltr':'rtl'}>
    <header className="site-header" id="site-top"><a href="#home" className="site-brand" onClick={e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'})}}><BrandMark/><span className="brand-word-stack"><b>TAQDOM</b><small>{en?'Build Your Digital Future':'ابنِ مستقبلك الرقمي'}</small></span></a><nav className="site-nav-links" aria-label={en?'Main navigation':'التنقل الرئيسي'}><a className="nav-home" href={localizedSitePath(language,'home')}>{en?'Home':'الرئيسية'}</a><a href={localizedSitePath(language,'templates')}>{en?'Templates':'القوالب'}</a><a href={localizedSitePath(language,'features')}>{en?'Features':'المميزات'}</a><a href={localizedSitePath(language,'pricing')}>{en?'Pricing':'الأسعار'}</a><a href={localizedSitePath(language,'about')}>{en?'About':'نبذة عن تقدّم'}</a></nav><div className="site-header-actions"><span className="header-sparkle" aria-hidden="true">☼</span><span className="header-divider"/><button className="site-lang" onClick={onLanguage}>{en?'العربية':'English'}</button><button className="site-login" onClick={onLogin}>{user?(en?'Workspace':'مساحة عملي'):(en?'Log in':'دخول')}</button><button className="site-cta-small" onClick={onStart}>{en?'Get Started':'ابدأ الآن'} <span>↗</span></button></div></header>
    <main>
      <section className="lux-hero" id="home"><SpectralEngine/><div className="aurora-field" aria-hidden="true"><span className="aurora-blob blob-violet"/><span className="aurora-blob blob-blue"/><span className="aurora-blob blob-magenta"/><span className="aurora-grid"/><span className="aurora-star star-a">✳</span><span className="aurora-star star-b">✦</span><span className="aurora-star star-c">+</span></div><div className="lux-hero-copy"><div className="lux-kicker"><span className="kicker-light"/> {en?'AI-POWERED PORTFOLIO STUDIO':'استوديو إنشاء المواقع الشخصية'}</div><h1>{en?<>Your Vision.<br/>Our <em>Technology.</em></>:<>رؤيتك.<br/>بتقنية <em>متقدمة.</em></>}</h1><p>{en?'Create a stunning, professional website or portfolio in minutes — no coding skills needed. Build your personal brand and show the world what you can do.':'أنشئ موقعًا شخصيًا ومعرض أعمال احترافيًا في دقائق — دون الحاجة إلى كتابة الشيفرة. ابنِ هويتك الرقمية وأظهر للعالم قدراتك وأعمالك بأفضل صورة.'}</p><div className="lux-hero-actions"><button className="lux-primary" onClick={onStart}>{en?'Start Building Now':'ابدأ إنشاء موقعك'} <span>↗</span></button><a href="#studio" className="lux-secondary"><span className="watch-play" aria-hidden="true">▷</span>{en?'Explore the Studio':'استكشف الاستوديو'} <span>↗</span></a></div><div className="hero-proof-row"><span className="proof-live-dot"/><span>{en?'Arabic + English':'العربية والإنجليزية'}</span><span className="proof-separator">·</span><span>{en?'Desktop + mobile':'الحاسوب والهاتف'}</span><span className="proof-separator">·</span><span>{en?'No code needed':'دون الحاجة إلى كتابة الشيفرة'}</span></div></div>
        <div className="lux-hero-stage" aria-label={en?'Interactive website builder preview':'معاينة استوديو بناء المواقع'}>
          <div className="hero-crystal-float" aria-hidden="true"><span className="crystal-aura"/><img src="/taqdom-mark.svg" alt="" fetchPriority="high"/><span className="crystal-glint"/></div>
          <div className="hero-light-orbit" aria-hidden="true"/>
          <div className="aurora-orbit orbit-one"/><div className="aurora-orbit orbit-two"/><div className="aurora-orbit orbit-three"/>
          <div className={`hero-mockup demo-layout-${demoLayout}`} style={{'--demo-accent':demoPalette[0],'--demo-contrast':demoPalette[1]} as CSSProperties}>
            <div className="mockup-browser-head"><div className="mockup-window-dots"><i/><i/><i/></div><div className="mockup-address"><span className="address-lock">⌑</span> mira.taqdom.me <span className="address-live">LIVE PREVIEW</span></div><div className="mockup-browser-actions"><span>↗</span><span>•••</span></div></div>
            <div className="mockup-app-bar"><div className="mockup-mini-brand"><BrandMark/><span>TAQDOM <small>STUDIO</small></span></div><div className="mockup-app-tabs"><span className="active">Design</span><span>Layers</span><span>Assets</span></div><div className="mockup-app-right"><span className="autosave-pill"><i/> Saved</span><b>Share ↗</b></div></div>
            <div className="mockup-builder">
              <aside className="mockup-rail"><span className="selected">◫</span><span>▤</span><span>◉</span><span>Aa</span><span>⌘</span><span>⚙</span><div className="rail-avatar">M</div></aside>
              <div className="mockup-page">
                <div className="mockup-canvas-nav"><b>MIRA<span>.</span></b><span>WORK&nbsp;&nbsp; ABOUT&nbsp;&nbsp; CONTACT</span><span className="mini-nav-pill"><i/> Available</span></div>
                <div className="mockup-canvas-hero"><div className="canvas-headline"><small>INDEPENDENT DESIGNER · CAIRO</small><strong>Make room<br/><em>for wonder.</em></strong><p>Digital worlds with a little more soul.</p><span className="mockup-canvas-link">EXPLORE MY WORK <b>↗</b></span></div><div className="mockup-canvas-image"><img src={imageUrls[0]} alt={imageAlt[0]} loading="eager" fetchPriority="high" decoding="async"/><span className="image-index">01 / 04</span><i>✳</i></div></div>
                <div className="mockup-project-label"><span>SELECTED PROJECTS</span><span>SCROLL TO EXPLORE ↓</span></div>
                <div className="mockup-project-row"><div className="mockup-project-art art-one"><img src={imageUrls[3]} alt="" loading="lazy" decoding="async"/><span>Forms of feeling</span></div><div className="mockup-project-art art-two"><img src={imageUrls[1]} alt="" loading="lazy"/><span>Future, in focus</span></div><div className="mockup-project-art art-three"><img src={imageUrls[4]} alt="" loading="lazy"/><span>Objects of joy</span></div></div>
              </div>
              <aside className="mockup-inspector"><div className="inspector-title"><span>DESIGN PANEL</span><b>•••</b></div><div className="inspector-section"><span>Selected element</span><b className="inspector-selected">Hero section <i>⌄</i></b></div><div className="inspector-section"><span>Layout <small className="interactive-hint">LIVE</small></span><div className="layout-selectors">{['▦','▤','◫','▥'].map((symbol,index)=><button type="button" key={symbol} className={demoLayout===index?'picked':''} aria-label={'Preview layout '+(index+1)} aria-pressed={demoLayout===index} onClick={()=>setDemoLayout(index)}>{symbol}</button>)}</div></div><div className="inspector-section"><span>Typography</span><b className="inspector-font">Aa <small>Editorial display</small></b></div><div className="inspector-section"><span>Color system <small className="interactive-hint">LIVE</small></span><div className="inspector-colors">{demoPalettes.map(([primary,secondary],index)=><button type="button" key={primary} className={demoPaletteIndex===index?'picked':''} style={{'--swatch-a':primary,'--swatch-b':secondary} as CSSProperties} aria-label={'Use color palette '+(index+1)} aria-pressed={demoPaletteIndex===index} onClick={()=>setDemoPaletteIndex(index)}/>)}</div><small className="hex-label">{demoPalette[0].toUpperCase()}　 {demoPalette[1].toUpperCase()}</small></div><div className="inspector-section"><span>Spacing</span><div className="spacing-meter"><i/><i/><i/><i/><i/><i/></div></div><div className="inspector-footer"><span>✦ AI DESIGN ASSIST</span><i>↗</i></div></aside>
            </div>
            <div className="mockup-bottom-bar"><span><i/> Desktop canvas</span><span>Auto-layout enabled</span><span>⌘ K <small>Quick actions</small></span></div>
          </div>
          <div className="hero-phone" aria-label={en?'A mobile portfolio preview':'معاينة معرض الأعمال على الهاتف'}>
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
          <div className="hero-benefit-card benefit-templates"><span className="benefit-icon benefit-grid">▦</span><div><b>{en?'Nine signature styles':'9 أنظمة بصرية'}</b><small>{en?'126 profession combinations':'126 تركيبة مهنية'}</small></div></div>
          <div className="hero-benefit-card benefit-ai"><span className="benefit-icon benefit-spark">✧</span><div><b>{en?'AI writing assistant':'مساعد كتابة ذكي'}</b><small>{en?'Improve your content':'حسّن محتواك'}</small></div></div>
          <div className="hero-benefit-card benefit-cloud"><span className="benefit-icon benefit-cloud-glyph">☁</span><div><b>{en?'Cloud-saved drafts':'حفظ سحابي للمسودات'}</b><small>{en?'Open your work anywhere':'يمكنك الوصول إلى أعمالك من أي جهاز'}</small></div></div>
          <div className="floating-component floating-palette"><span className="ai-mini-icon">✧</span><div><b>{en?'Generate with AI':'حسّن النص بالذكاء الاصطناعي'}</b><small>{en?'Optional writing assistance':'مساعدة اختيارية للكتابة'}</small></div><span className="palette-hex">↗</span></div>
          <div className="stage-coordinate">TAQDOM / CREATIVE STUDIO</div>
        </div>
      </section>
      <section className="platform-capabilities" id="features" aria-label={en?'Taqdom capabilities':'مميزات تقدّم'}><div className="capability-item"><span className="capability-icon">▦</span><div><b>{en?'126 Starting Combinations':'126 تركيبة بداية'}</b><small>{en?'9 visual systems · 14 fields':'9 أنظمة بصرية · 14 مجالًا'}</small></div></div><div className="capability-item"><span className="capability-icon">✧</span><div><b>{en?'AI Assistant':'مساعد الذكاء الاصطناعي'}</b><small>{en?'Improve content on demand':'حسّن المحتوى عند الطلب'}</small></div></div><div className="capability-item"><span className="capability-icon">◎</span><div><b>{en?'Custom Domain':'نطاقك الخاص'}</b><small>{en?'Portfolio publishing planned':'النشر على نطاق خاص قادم'}</small></div></div><div className="capability-item"><span className="capability-icon">▣</span><div><b>{en?'Responsive Design':'تصميم متجاوب'}</b><small>{en?'Desktop, mobile, RTL / LTR':'الحاسوب والهاتف، بالعربية والإنجليزية'}</small></div></div><div className="capability-item"><span className="capability-icon">☁</span><div><b>{en?'Cloud Hosting':'استضافة سحابية'}</b><small>{en?'Edge-deployed platform':'منصة على البنية السحابية'}</small></div></div></section>
      <section className="gallery-section" id="gallery"><div className="gallery-heading"><div><div className="section-overline">{en?'THE COLLECTION · 01':'مجموعة القوالب · 01'}</div><h2>{en?<>Different paths.<br/><em>Distinct presence.</em></>:<>لكل مجال أسلوبه.<br/><em>اختر أسلوبك.</em></>}</h2></div><div className="gallery-side-copy"><p>{en?'Explore styles made for different ways of working. Each starting point can be tailored with your colors, words, and sections.':'استكشف أنماطًا تناسب مجالات العمل المختلفة. يمكنك تخصيص كل تصميم أولي بألوانك ونصوصك والأقسام التي تناسبك.'}</p><button className="gallery-all-link" onClick={onStart}>{en?'Explore all '+templates.length+' starting points':'استكشف '+templates.length+' نقطة بداية'} <span>↗</span></button></div></div>
        <div className="template-feature-panel">
          <div className="feature-collage" aria-hidden="true">
            <div className="collage-card collage-main"><img src={imageUrls[3]} alt="" loading="lazy"/><span className="collage-label">DESIGN / 01</span><strong>Make it<br/><em>memorable.</em></strong><i>↗</i></div>
            <div className="collage-card collage-side"><img src={imageUrls[1]} alt="" loading="lazy"/><span>PORTFOLIO / 02</span><b>Built to stand out.</b></div>
            <div className="collage-card collage-bottom"><img src={imageUrls[4]} alt="" loading="lazy"/><span>CREATIVE / 03</span></div>
          </div>
          <div className="template-feature-copy"><span className="template-feature-kicker">{en?'THE TEMPLATE STUDIO':'استوديو القوالب'}</span><h3>{en?'Choose Your Perfect Template':'اختر القالب الذي يعكس هويتك'}</h3><p>{en?'Explore nine signature visual systems and 126 combinations across 14 professional fields. Each direction has its own layout, palette, and character — then make it yours with your content.':'استكشف تسعة أنظمة بصرية مميزة و126 تركيبة عبر 14 مجالًا مهنيًا. لكل اتجاه تخطيطه ولوحته اللونية وشخصيته، ثم خصّصه بمحتواك.'}</p><button type="button" className="template-feature-button" onClick={()=>onTemplate(featured[0].id)}>{en?'Browse Templates':'استكشف القوالب'} <span>↗</span></button></div>
          <div className="template-category-list"><span className="category-list-heading">{en?'EXPLORE BY FIELD':'استكشف حسب المجال'}</span>{(en?[['code','Technology & IT'],['design','Design & Creative'],['marketing','Marketing & Sales'],['business','Business & Finance'],['health','Healthcare & Medicine'],['education','Education & Teaching'],['law','Law & Legal']]:[['code','التقنية والبرمجة'],['design','التصميم والإبداع'],['marketing','التسويق والمبيعات'],['business','الأعمال والتمويل'],['health','الصحة والطب'],['education','التعليم والتدريب'],['law','القانون والاستشارات']]).map(([id,label],index)=><button key={id} type="button" onClick={()=>onTemplate(id+'-0')}><span>{['⌘','✳','↗','▣','✚','⌂','⚖'][index]}</span>{label}<i>↗</i></button>)}<span className="category-list-more">{en?'+ More categories':'＋ مجالات أخرى'}</span></div>
        </div>
        <div className="lux-template-grid">{featured.map((t,i)=><button className={'lux-template-card card-layout-'+i} key={t.id} onClick={()=>onTemplate(t.id)}><div className="lux-template-visual"><img src={imageUrls[i % imageUrls.length]} alt={imageAlt[i % imageAlt.length]} loading="lazy"/><div className="template-visual-shade"/><div className="template-index">0{i+1} / TAQDOM</div><div className="template-overlay-ui"><span>{['TECH / DIGITAL REALITY','NATURAL EDITORIAL','CREATIVE ENERGY','VISUAL STORYTELLING','ADVANCED SYSTEMS','FORM / FUNCTION','COSMIC MINIMAL','SOFT FUTURE','CINEMATIC / 01'][i]}</span><b>{['Turn ideas into digital reality.','Designing better experiences.','Ideas for a brighter future.','Nature inspires better design.','Advanced solutions for modern business.','Less noise. More impact.','Ideas. Into impact.','Build your dream website.','Make it extraordinary.'][i]}</b><i>↗</i></div><div className="template-chip">{layouts[i]}</div></div><div className="lux-template-meta"><div><h3>{en?titles[i]:titlesAr[i]}</h3><p>{styleDescriptions[i]}</p></div><span className="template-open">↗</span></div></button>)}</div>
        <div className="gallery-bottom-note"><span className="gallery-note-symbol">✳</span><span>{en?'9 visual systems · 14 fields · 126 starting combinations':'9 أنظمة بصرية · 14 مجالًا · 126 تركيبة بداية'}</span><span>{en?'Every visual direction is customizable':'يمكن تخصيص كل اتجاه بصري'}</span></div>
      </section>
      <section className="studio-section" id="studio"><div className="studio-editorial"><div className="section-overline">{en?'YOUR STUDIO · 02':'استوديو التصميم · 02'}</div><h2>{en?<>Not just a template.<br/><em>A site you shape.</em></>:<>أكثر من قالب جاهز.<br/><em>موقع تصوغه بنفسك.</em></>}</h2><p>{en?'Edit your story, switch the visual direction, adjust the color, show or hide sections — and see your changes while you work.':'حرّر نبذتك، وغيّر النمط البصري، واختر الألوان، وأظهر الأقسام أو أخفها، وشاهد النتيجة مباشرة أثناء العمل.'}</p><button className="studio-link" onClick={onStart}>{en?'Step into the studio':'ادخل استوديو التصميم'} <span>↗</span></button><div className="studio-number">02<span> / 04</span></div></div>
        <div className="studio-showcase"><div className="studio-panel-top"><span className="panel-pill"><i/> LIVE STUDIO</span><span className="panel-save">{en?'Saved changes':'حفظ التعديلات'} <b>✓</b></span></div><div className="studio-control-rail"><span className="rail-selected">◫</span><span>◉</span><span>Aa</span><span>▤</span><span>⚙</span></div><div className="studio-page-preview"><div className="studio-page-nav"><b>SH.</b><span>WORK　 ABOUT　 CONTACT</span><i>↗</i></div><div className="studio-page-hero"><div><small>DESIGNER · CAIRO</small><strong>Creating for<br/><em>real life.</em></strong><p>Digital products with a little more feeling.</p><span className="preview-link-sim">DISCOVER MY WORK ↗</span></div><div className="studio-person"><img src={imageUrls[2]} alt="" loading="lazy"/></div></div><div className="studio-project-row"><img src={imageUrls[3]} alt="" loading="lazy"/><img src={imageUrls[1]} alt="" loading="lazy"/><img src={imageUrls[4]} alt="" loading="lazy"/></div></div><div className="studio-control-card color-card"><span>{en?'YOUR PALETTE':'ألوانك'}</span><div><i/><i/><i/><i/><i/></div><small>#BDFF62　#17171C</small></div><div className="studio-control-card type-card"><span>TYPE SYSTEM</span><b>Aa</b><small>Editorial / 48 px</small></div></div>
      </section>
      <section className="craft-section" id="how-it-works"><div className="craft-head"><div className="section-overline">{en?'THE PROCESS · 03':'الرحلة · 03'}</div><h2>{en?<>A considered process.<br/><em>Nothing complicated.</em></>:<>خطوات واضحة.<br/><em>نتيجة تعبّر عنك.</em></>}</h2></div><div className="craft-steps"><article><span>01</span><div className="step-glyph">◫</div><h3>{en?'Choose your direction':'اختر الاتجاه'}</h3><p>{en?'Start with a visual style that fits your work and your personality.':'ابدأ بنمط بصري يناسب مجالك وشخصيتك.'}</p></article><article><span>02</span><div className="step-glyph">✳</div><h3>{en?'Make it yours':'أضف لمستك'}</h3><p>{en?'Write your story, select your colors, and curate the sections people see.':'اكتب قصتك، واختر ألوانك، ونظّم الأقسام التي ستظهر للزوار.'}</p></article><article><span>03</span><div className="step-glyph">↗</div><h3>{en?'Share your work':'شارك أعمالك'}</h3><p>{en?'Preview your page on desktop and mobile, then export a copy to publish.':'عاين موقعك على الحاسوب والهاتف، ونزّل نسخة مستقلة جاهزة للنشر.'}</p></article></div></section>
      <section className="image-story" id="about"><div className="story-image"><img src={imageUrls[5]} alt={imageAlt[5]} loading="lazy"/><span>YOUR WORK, IN CONTEXT / 2026</span></div><div className="story-copy"><div className="section-overline">{en?'MADE FOR REAL PEOPLE':'لكل شخص لديه ما يقدّمه'}</div><h2>{en?<>Wherever you<br/>are in your story,<br/><em>make it visible.</em></>:<>أيًا كانت مرحلتك،<br/>اجعل إنجازاتك<br/><em>مرئية للجميع.</em></>}</h2><p>{en?'Your first project, your next opportunity, the business you are growing, or a career you are proud of. A little space online can make the next step feel closer.':'قد يكون ذلك مشروعك الأول، أو فرصة جديدة، أو نشاطًا تجاريًا تطوّره، أو مسيرة مهنية تفخر بها. ويمكن لمساحة رقمية بسيطة أن تقرّب خطوتك التالية.'}</p><button className="lux-primary story-cta" onClick={onStart}>{en?'Make your space':'أنشئ مساحتك'} <span>↗</span></button></div></section>
      <section className="closing-lux" id="pricing"><div className="closing-orb orb-one"/><div className="closing-orb orb-two"/><div className="section-overline">{en?'FREE FOR EVERYONE':'مجاني بالكامل للجميع'}</div><h2>{en?<>Your next chapter<br/><em>starts here.</em></>:<>خطوتك التالية<br/><em>مجانية بالكامل.</em></>}</h2><p>{en?'Every creator deserves a place online. Build and customize your portfolio for free — no paid plans, no subscription.':'يستحق كل شخص مساحة على الإنترنت. أنشئ معرض أعمال وخصّصه مجانًا، دون اشتراكات أو خطط مدفوعة.'}</p><button className="closing-button" onClick={onStart}>{en?'Build your portfolio — free':'ابدأ إنشاء موقعك مجانًا'} <span>↗</span></button><div className="closing-foot">{en?'Always free · No subscription · Arabic and English':'مجاني دائمًا · بدون اشتراك · عربي وإنجليزي'}</div></section>
      <section className="founder-support-section" aria-labelledby="founder-heading"><div className="founder-profile"><div className="founder-photo-wrap"><img className="founder-photo" src="/founder-portrait.webp" alt={en?'Portrait of the Taqdom founder':'صورة مؤسس تقدّم'} loading="lazy"/><span className="founder-photo-orbit"/></div><div className="founder-copy"><div className="section-overline">{en?'THE PERSON BEHIND TAQDOM':'الشخص وراء تقدّم'}</div><h2 id="founder-heading">{en?'Meet the founder':'مؤسس تقدّم'}</h2><p>{en?'Taqdom is built to make a polished online presence accessible to everyone, whatever their profession or starting point.':'يهدف تقدّم إلى إتاحة إنشاء حضور رقمي احترافي للجميع، بصرف النظر عن المجال أو نقطة البداية.'}</p><a className="founder-linkedin" href="https://www.linkedin.com/in/abdullah-yehia/" target="_blank" rel="noreferrer noopener"><span className="linkedin-mark">in</span>{en?'Connect with the founder on LinkedIn':'تواصل مع المؤسس على LinkedIn'} <span aria-hidden="true">↗</span></a></div></div>
        <div className="supporters-panel"><div><div className="section-overline">{en?'OPEN SOURCE & ACKNOWLEDGEMENTS':'المصدر المفتوح والتقدير'}</div><h3>{en?'Built in the open. Made for everyone.':'مشروع مفتوح لخدمة الجميع.'}</h3><p>{en?'Taqdom’s original code is distributed under the MIT License. This is a license reference, not a claim of sponsorship or endorsement by MIT.':'الكود الأصلي لمشروع تقدّم متاح بترخيص MIT. تشير كلمة MIT هنا إلى ترخيص البرمجيات، ولا تعني أن معهد ماساتشوستس للتكنولوجيا يدعم المشروع أو يرعاه.'}</p></div><a className="mit-license-card" href="https://github.com/abdullahyelsayed-cpu/taqdom/blob/main/LICENSE" target="_blank" rel="noreferrer noopener" aria-label={en?'Read the MIT License':'اقرأ ترخيص MIT'}><span className="mit-wordmark" aria-hidden="true"><b>MIT</b><i/><i/><i/><i/></span><span><b>MIT License</b><small>{en?'Open-source license':'ترخيص مفتوح المصدر'}</small></span><span className="support-arrow">↗</span></a></div></section>
    </main><footer className="lux-footer"><a href={localizedSitePath(language,'home')} className="site-brand"><BrandMark/><span className="brand-word-stack"><b>TAQDOM</b><small>{en?'Build Your Digital Future':'ابنِ مستقبلك الرقمي'}</small></span></a><span>{en?'A free space for your work.':'مساحة مجانية لأعمالك.'}</span><div><a href={localizedSitePath(language,'templates')}>{en?'Templates':'القوالب'}</a><a href={localizedSitePath(language,'features')}>{en?'Features':'المميزات'}</a><a href={localizedSitePath(language,'faq')}>{en?'FAQ':'الأسئلة الشائعة'}</a><a href={localizedSitePath(language,'contact')}>{en?'Contact':'التواصل'}</a><a href={localizedSitePath(language,'privacy')}>{en?'Privacy':'الخصوصية'}</a><a href={localizedSitePath(language,'terms')}>{en?'Terms':'الشروط'}</a><button onClick={onLogin}>{en?'Your account':'حسابك'}</button></div><small>© TAQDOM.ME · {en?'Free for everyone':'مجاني للجميع'}</small></footer>
  </div>
}


function ContentPage({ page, language, onLanguage }: { page: SitePage; language: SiteLanguage; onLanguage: () => void }) {
  const en = language === 'en'
  const copy = getContentPageCopy(page, en)
  const navPages: Exclude<SitePage, 'not-found'>[] = ['home', 'templates', 'features', 'pricing', 'about', 'faq', 'contact']
  const homeHref = localizedSitePath(language, 'home')
  const loginHref = homeHref + '?auth=login&lang=' + language
  const registerHref = homeHref + '?auth=register&lang=' + language
  const categories = en
    ? [['Design & creative', 'Designers, photographers, writers'], ['Technology & IT', 'Developers and technical specialists'], ['Business & finance', 'Consultants and entrepreneurs'], ['Education', 'Teachers and students'], ['Healthcare', 'Health professionals'], ['Architecture & engineering', 'Architects and engineers'], ['Marketing & communication', 'Marketing, content, and media']]
    : [['التصميم والإبداع', 'المصممون والمصورون والكتّاب'], ['التقنية وتكنولوجيا المعلومات', 'المطورون والمتخصصون التقنيون'], ['الأعمال والتمويل', 'الاستشاريون ورواد الأعمال'], ['التعليم', 'المعلمون والطلاب'], ['الرعاية الصحية', 'المتخصصون في الصحة'], ['العمارة والهندسة', 'المهندسون والمعماريون'], ['التسويق والتواصل', 'التسويق والمحتوى والإعلام']]
  const isFaq = page === 'faq'
  return <div className="landing content-page-shell" dir={en ? 'ltr' : 'rtl'}>
    <header className="site-header content-site-header">
      <a href={homeHref} className="site-brand"><BrandMark/><span className="brand-word-stack"><b>TAQDOM</b><small>{en ? 'Build Your Digital Future' : 'ابنِ مستقبلك الرقمي'}</small></span></a>
      <nav className="site-nav-links" aria-label={en ? 'Main navigation' : 'التنقل الرئيسي'}>
        {navPages.slice(0, 5).map(key => <a key={key} href={localizedSitePath(language, key)} aria-current={page === key ? 'page' : undefined}>{sitePageLabels[key][language]}</a>)}
      </nav>
      <div className="site-header-actions">
        <button className="site-lang" onClick={onLanguage} aria-label={en ? 'Switch language to Arabic' : 'Switch language to English'}>{en ? 'العربية' : 'English'}</button>
        <a className="site-login" href={loginHref}>{en ? 'Log in' : 'تسجيل الدخول'}</a>
        <a className="site-cta-small" href={registerHref}>{en ? 'Get Started' : 'ابدأ الآن'} <span>↗</span></a>
      </div>
    </header>
    <main className="content-main">
      <nav className="content-breadcrumbs" aria-label={en ? 'Breadcrumb' : 'مسار التنقل'}>
        <a href={homeHref}>{en ? 'Home' : 'الرئيسية'}</a><span aria-hidden="true">/</span><span aria-current="page">{page === 'not-found' ? (en ? 'Not found' : 'غير موجودة') : sitePageLabels[page][language]}</span>
      </nav>
      <section className="content-page-hero">
        <span className="content-kicker"><i/>{copy.eyebrow}</span>
        <h1>{copy.heading}</h1>
        <p>{copy.lead}</p>
        <div className="content-hero-note"><span>✧</span>{en ? 'Free for everyone · English & Arabic' : 'مجاني للجميع · العربية والإنجليزية'}</div>
      </section>
      {page === 'templates' && <section className="content-category-grid" aria-label={en ? 'Portfolio categories' : 'مجالات معارض الأعمال'}>
        {categories.map(([title, description], index) => <article className="content-category-card" key={title}><span className="content-card-index">{String(index + 1).padStart(2, '0')}</span><h2>{title}</h2><p>{description}</p></article>)}
      </section>}
      {page === 'pricing' && <section className="free-plan-panel"><div className="free-plan-orbit" aria-hidden="true"/><span className="free-plan-badge">{en ? 'NO PAYMENT REQUIRED' : 'لا يلزم الدفع'}</span><strong>{en ? '0' : '٠'} <small>{en ? 'forever' : 'دائمًا'}</small></strong><p>{en ? 'No paid tiers. No subscription. No payment card.' : 'لا توجد باقات مدفوعة أو اشتراكات أو حاجة إلى بطاقة دفع.'}</p><a className="content-primary-button" href={registerHref}>{en ? 'Create your free account' : 'أنشئ حسابك المجاني'} <span>↗</span></a></section>}
      {isFaq ? <section className="content-faq-list">{copy.blocks.map((block, index) => <details className="content-faq-item" key={block.heading} open={index === 0}><summary><span>{block.heading}</span><i>＋</i></summary><p>{block.text}</p></details>)}</section>
        : <section className="content-block-grid">{copy.blocks.map((block, index) => <article className="content-info-card" key={block.heading}><span className="content-card-index">{String(index + 1).padStart(2, '0')}</span><h2>{block.heading}</h2><p>{block.text}</p></article>)}</section>}
      {page === 'contact' && <section className="content-link-panel"><div><span className="content-kicker"><i/>{en ? 'PROJECT SUPPORT' : 'دعم المشروع'}</span><h2>{en ? 'Open a GitHub issue' : 'افتح بلاغًا على GitHub'}</h2><p>{en ? 'For bugs or feature requests, include the page, browser, and steps to reproduce. Never include secrets or private user data.' : 'للإبلاغ عن الأخطاء أو طلب ميزة، اذكر الصفحة والمتصفح وخطوات إعادة المشكلة. لا ترفق أسرارًا أو بيانات شخصية خاصة.'}</p></div><a href="https://github.com/abdullahyelsayed-cpu/taqdom/issues" target="_blank" rel="noopener noreferrer">{en ? 'Visit GitHub Issues' : 'الانتقال إلى بلاغات GitHub'} ↗</a></section>}
      <section className="content-cta-panel"><div><span className="content-kicker"><i/>{en ? 'START FOR FREE' : 'ابدأ مجانًا'}</span><h2>{en ? 'Make room for your next idea.' : 'امنح فكرتك مساحة للنمو.'}</h2><p>{en ? 'Create a portfolio, refine the details, and share your work.' : 'أنشئ معرض أعمالك، واضبط تفاصيله، وشارك أعمالك.'}</p></div><a className="content-primary-button" href={registerHref}>{en ? 'Start building' : 'ابدأ الإنشاء'} <span>↗</span></a></section>
    </main>
    <footer className="lux-footer content-site-footer">
      <a href={homeHref} className="site-brand"><BrandMark/><span className="brand-word-stack"><b>TAQDOM</b><small>{en ? 'Build Your Digital Future' : 'ابنِ مستقبلك الرقمي'}</small></span></a>
      <span>{en ? 'A free space for your work.' : 'مساحة مجانية لأعمالك.'}</span>
      <nav aria-label={en ? 'Footer navigation' : 'روابط التذييل'}>{navPages.slice(1).map(key => <a key={key} href={localizedSitePath(language, key)}>{sitePageLabels[key][language]}</a>)}<a href={localizedSitePath(language, 'privacy')}>{sitePageLabels.privacy[language]}</a><a href={localizedSitePath(language, 'terms')}>{sitePageLabels.terms[language]}</a></nav>
      <small>© TAQDOM.ME · {en ? 'Free for everyone' : 'مجاني للجميع'}</small>
    </footer>
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
    invalid_email:{ar:'أدخل بريدًا إلكترونيًا صحيحًا.',en:'Enter a valid email address.'},
    invalid_name:{ar:'أدخل اسمًا يتكون من حرفين على الأقل.',en:'Enter your name (at least 2 characters).'},
    weak_password:{ar:'يجب أن تتكون كلمة المرور من 10 أحرف على الأقل.',en:'Your password must be at least 10 characters.'},
    email_already_registered:{ar:'هذا البريد الإلكتروني مسجل بالفعل. سجّل الدخول بدلًا من ذلك.',en:'This email is already registered. Sign in instead.'},
    invalid_credentials:{ar:'البريد الإلكتروني أو كلمة المرور غير صحيحين.',en:'Email or password is incorrect.'},
    too_many_attempts:{ar:'عدد المحاولات كبير خلال فترة قصيرة. يرجى الانتظار قليلًا والمحاولة مجددًا.',en:'Too many attempts. Please wait a bit and try again.'},
  }
  const submit=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();setBusy(true);setError('');setNotice('')
    try {
      const result=await apiRequest<{user:User}>(register?'/api/auth/register':'/api/auth/login',{method:'POST',body:JSON.stringify(register?{displayName,email,password,locale:language}:{email,password})})
      setNotice(en?'Your account is ready. Opening your workspace…':'أصبح حسابك جاهزًا. جارٍ فتح مساحة العمل…')
      onSuccess(result.user)
    } catch(err) {
      const code=err instanceof Error?err.message:'request_failed'
      const mapped=errorMessages[code]
      setError(mapped?(en?mapped.en:mapped.ar):(en?'We could not connect. Please try again.':'تعذر الاتصال بالخدمة. يُرجى المحاولة مجددًا.'))
    } finally {setBusy(false)}
  }
  return <div className="auth-shell" dir={en?'ltr':'rtl'}><header className="auth-topbar"><button className="auth-brand" onClick={onBack}><BrandMark/><span>taqdom<span className="site-brand-dot">.</span></span></button><div><button className="site-lang" onClick={onLanguage}>{en?'العربية':'English'}</button><button className="auth-back" onClick={onBack}>← {en?'Back to site':'العودة للموقع'}</button></div></header>
    <main className="auth-grid"><section className="auth-visual"><img src={imageUrls[0]} alt="" fetchPriority="high"/><div className="auth-image-overlay"/><div className="auth-visual-content"><span className="auth-visual-label"><i/> TAQDOM / YOUR OWN SPACE</span><h1>{en?<>A good story<br/>deserves a<br/><em>beautiful home.</em></>:<>كل قصة مميزة<br/>تستحق مساحة<br/><em>تليق بها.</em></>}</h1><p>{en?'Your work, your direction, your next step — all in one place.':'أعمالك وأسلوبك وخطوتك التالية — جميعها في مكان واحد.'}</p><div className="auth-photo-credit">PERSONAL WEBSITES · THOUGHTFULLY MADE</div></div><div className="auth-sticker"><span>✳</span><b>{en?'Your corner of the internet':'مساحتك الخاصة على الإنترنت'}</b></div></section>
      <section className="auth-form-side"><div className="auth-form-wrap"><div className="auth-form-kicker">{en?'YOUR WORKSPACE STARTS HERE':'تبدأ مساحة عملك من هنا'}</div><h2>{register?(en?'Create your account':'أنشئ حسابك'):(en?'Welcome back':'مرحبًا بعودتك')}</h2><p className="auth-form-intro">{register?(en?'Save your work, pick up where you left off, and build a site that feels like you.':'احفظ أعمالك، وتابع العمل عليها في أي وقت، وأنشئ موقعًا يعكس هويتك.'):(en?'Sign in to open your workspace and continue building.':'سجّل الدخول إلى مساحة عملك وتابع إنشاء موقعك.')}</p>
        <form onSubmit={submit} className="auth-form">{register&&<label>{en?'Your name':'الاسم'}<input autoComplete="name" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder={en?'Enter your name':'أدخل اسمك'} minLength={2} maxLength={100} required/></label>}<label>{en?'Email address':'البريد الإلكتروني'}<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" maxLength={254} required/></label><label>{en?'Password':'كلمة المرور'}<div className="password-input-wrap"><input type={showPassword?'text':'password'} autoComplete={register?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={register?(en?'At least 10 characters':'10 أحرف على الأقل'):(en?'Enter your password':'اكتب كلمة المرور')} minLength={register?10:1} maxLength={128} required/><button type="button" onClick={()=>setShowPassword(s=>!s)}>{showPassword?(en?'Hide':'إخفاء'):(en?'Show':'إظهار')}</button></div></label>
          {register&&<p className="auth-password-hint"><span>✓</span> {en?'Use at least 10 characters. Never reuse a password.':'استخدم كلمة مرور من 10 أحرف على الأقل، ولا تُعد استخدام كلمة المرور نفسها في مواقع أخرى.'}</p>}
          {error&&<p className="auth-error" role="alert">{error}</p>}{notice&&<p className="auth-notice" role="status">{notice}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy?(en?'Please wait…':'ثواني…'):(register?(en?'Create my account':'إنشاء الحساب'):(en?'Sign in to Taqdom':'تسجيل الدخول'))}<span>↗</span></button></form>
        <div className="auth-switch">{register?(en?'Already have an account?':'عندك حساب بالفعل؟'):(en?'New to Taqdom?':'أول مرة مع تقدّم؟')} <button onClick={()=>onMode(register?'login':'register')}>{register?(en?'Sign in':'سجّل دخولك'):(en?'Create an account':'أنشئ حسابًا')}</button></div>
        <div className="auth-security-note"><span className="auth-lock">⌑</span><span>{en?'Your password is stored as a salted, one-way hash. Session cookies are HttpOnly and Secure.':'كلمة المرور بتتخزن بصيغة مشفّرة أحادية الاتجاه، وجلسة الدخول محمية بملف ارتباط آمن.'}</span></div>
        <p className="auth-legal-note">{en?'Email verification and password recovery are not available yet. Use an email you control and keep your password safe.':'لم يتوفر تأكيد البريد الإلكتروني أو استعادة كلمة المرور بعد. استخدم بريدًا يمكنك الوصول إليه، واحفظ كلمة المرور في مكان آمن.'}</p>
      </div><div className="auth-side-bottom"><span>TAQDOM.ME</span><span>{en?'Made to move you forward':'مساحة تساعدك تتقدم'}</span></div></section></main>
  </div>
}

function Dashboard({language,user,loading,busy,items,error,onLanguage,onHome,onCreate,onOpen,onLogout,onClearError}:{language:'ar'|'en';user:User|null;loading:boolean;busy:boolean;items:SavedPortfolio[];error:string;onLanguage:()=>void;onHome:()=>void;onCreate:()=>void;onOpen:(item:SavedPortfolio)=>void;onLogout:()=>void;onClearError:()=>void}) {
  const en=language==='en'
  return <div className="dashboard-shell" dir={en?'ltr':'rtl'}><header className="dashboard-top"><button className="auth-brand" onClick={onHome}><BrandMark/><span>taqdom<span className="site-brand-dot">.</span></span></button><div className="dashboard-top-actions"><button className="site-lang" onClick={onLanguage}>{en?'العربية':'English'}</button><button className="dashboard-logout" onClick={onLogout}>{en?'Sign out':'تسجيل الخروج'} ↗</button></div></header>
    <main className="dashboard-main"><div className="dashboard-welcome"><div><div className="section-overline">{en?'YOUR CREATIVE SPACE':'مساحتك الإبداعية'}</div><h1>{en?<>Good to have you,<br/><em>{user?.displayName || 'there'}.</em></>:<>مرحبًا بك،<br/><em>{user?.displayName || 'صاحب الحكاية'}.</em></>}</h1><p>{en?'Your projects live here. Open an existing site or create a new one when you are ready.':'ستجد مشروعاتك هنا. افتح موقعًا سابقًا أو أنشئ موقعًا جديدًا متى شئت.'}</p></div><div className="dashboard-welcome-art"><img src={imageUrls[3]} alt="" loading="lazy"/><div><span>TAQDOM STUDIO</span><b>{en?'Make it yours.':'اجعله معبّرًا عنك.'}</b></div></div></div>
      {error&&<div className="dashboard-error" role="status"><span>{error}</span><button onClick={onClearError}>×</button></div>}
      <div className="dashboard-project-heading"><div><span className="section-overline">{en?'YOUR PROJECTS':'مشاريعك'}</span><h2>{en?'A place for your next step':'كل مشروع له مكانه'}</h2></div><button className="dashboard-create" onClick={onCreate} disabled={busy}>{busy?(en?'Creating…':'جارٍ الإنشاء…'):(en?'＋ New website':'＋ موقع جديد')}</button></div>
      {loading?<div className="dashboard-loading"><span className="loading-orbit"/> {en?'Loading your workspace…':'جارٍ تحميل مساحة العمل…'}</div>:items.length===0?<div className="dashboard-empty"><div className="empty-art"><span>✳</span><i/><b/></div><h3>{en?'Your first website starts here.':'موقعك الأول بانتظارك.'}</h3><p>{en?'Start with a blank canvas and shape your own corner of the internet.':'ابدأ بمساحة جديدة وأنشئ حضورك الخاص على الإنترنت.'}</p><button className="dashboard-create" onClick={onCreate} disabled={busy}>{en?'Create my first site':'أنشئ موقعي الأول'} ↗</button></div>:<div className="dashboard-project-grid">{items.map((item,index)=><button className="dashboard-project-card" key={item.id} onClick={()=>onOpen(item)}><div className={'dashboard-project-cover cover-'+(index%6)}><img src={item.document?.avatarUrl || imageUrls[index%imageUrls.length]} alt="" loading="lazy"/><span className="project-draft">{item.status==='published'?(en?'Published 🌐':'منشور 🌐'):(en?'Draft 📝':'مسودة 📝')}</span><div className="cover-brand">t<span>.</span></div><div className="cover-title">{item.document?.name||item.title}<small>{item.document?.role|| (en?'Personal portfolio':'موقع شخصي')}</small></div></div><div className="dashboard-project-info"><div><h3>{item.title}</h3><p>{en?'Edited':'آخر تعديل'} · {new Date(item.updatedAt).toLocaleDateString(en?'en-GB':'ar-EG',{day:'numeric',month:'short'})}</p><small className="dashboard-project-host" dir="ltr">{isValidPortfolioSubdomain(item.slug || '') ? item.slug + '.taqdom.me' : (en ? 'Set a username in the editor' : 'حدّد اسم موقعك من المحرر')}</small></div><span>↗</span></div></button>)}</div>}
      <div className="dashboard-help-row"><span className="help-star">✳</span><div><b>{en?'Small steps. Beautiful work.':'خطوات بسيطة، وشغل يبان.'}</b><p>{en?'You can edit your content, colors, and visible sections at any time.':'تقدر تعدّل المحتوى والألوان والأقسام في أي وقت.'}</p></div><button onClick={onHome}>{en?'Explore Taqdom':'استكشف تقدّم'} ↗</button></div>
    </main><footer className="dashboard-footer"><span>taqdom<span>.</span></span><span>{en?'Your space is yours.':'المساحة دي مساحتك.'}</span><small>{user?.email}</small></footer>
  </div>
}

function PortfolioCanvas({data,template,language}:{data:Portfolio;template:Template;language:'ar'|'en'}) {
  const en=language==='en'
  const enteredProjects=data.projects.filter(name=>typeof name==='string' && name.trim().length>0)
  const projects=enteredProjects.length?enteredProjects:(en?['A calmer way to bank','Learning without limits','A brand built to grow']:['تجربة مصرفية أسهل','منصة تعلّم عربية','هوية استوديو إبداعي'])
  const portraits=[imageUrls[0],imageUrls[2],imageUrls[5]]
  const avatarSrc = data.avatarUrl || portraits[template.layout%3]
  const displayName = data.name || (en ? 'Your Name' : 'اسمك الشخصي')
  const displayRole = data.role || (en ? template.roleEn : template.role)
  const displayBio = data.bio || (en ? 'Good work starts with curiosity. I turn thoughtful ideas into work that makes everyday life a little better.' : 'أصمم منتجات رقمية بسيطة وقريبة من الناس.')
  const projectTypes = en
    ? ['Product design · 2026', 'Brand identity · 2025', 'Creative direction · 2024']
    : ['تصميم منتجات · 2026', 'هوية بصرية · 2025', 'إخراج إبداعي · 2024']
  return <article className={'portfolio-site layout-'+template.layout} data-layout={template.layout} style={{'--accent':data.accent,'--pale':template.pale} as CSSProperties}><div className="site-nav"><span className="site-monogram">{displayName.split(' ').map(s=>s[0]).join('')}</span><div><a href="#about">{en?'About':'عنّي'}</a><a href="#work">{en?'Work':'أعمالي'}</a><a href="#contact">{en?'Contact':'تواصل'}</a></div><span className="site-availability"><i/>{en?'Open to work':'متاح للعمل'}</span></div><section className="site-hero"><div className="site-copy"><small className="site-eyebrow">✳ {en?template.professionEn.toUpperCase():'أهلاً، أنا '+displayName}</small><h1>{displayName}<br/><em>{displayRole}</em></h1>{data.visible.about&&<p id="about">{displayBio}</p>}<a className="site-cta" href={'mailto:'+data.email}>{en?'Let’s work together':'خلينا نشتغل سوا'} <b>↗</b></a></div><div className="site-portrait"><div className="portrait-ring"><img className="portrait-photo" src={avatarSrc} alt={displayName} loading="lazy"/><span className="portrait-decoration">✿</span></div><div className="portrait-label">{data.location || (en?'Remote':'عن بُعد')}　·　2026</div></div></section>{data.visible.projects&&<section className="site-work" id="work"><div className="site-section-title"><div><small>01 / {en?'SELECTED WORK':'أعمال مختارة'}</small><h2>{en?'A few things I’ve made':'حاجات عملتها بحب'}</h2></div><span>{en?'More coming soon':'المزيد قريباً'} ↗</span></div><div className="site-project-grid">{projects.map((name,i)=><div className={'site-project project-'+i} key={name}><div className="site-project-art"><img src={imageUrls[(i+template.layout+1)%imageUrls.length]} alt="" loading="lazy"/><span>{['milo','nūn','else'][i%3]}</span><b>{['✳','◡','✿'][i%3]}</b></div><h3>{name}</h3><small>{projectTypes[i%projectTypes.length]}</small></div>)}</div></section>}{data.visible.contact&&<section className="site-contact" id="contact"><div><small>02 / {en?'SAY HELLO':'كلمّني'}</small><h2>{en?'Have something in mind?':'عندك فكرة حلوة؟'}</h2></div><a href={'mailto:'+data.email}>{data.email} ↗</a></section>}<footer className="site-footer"><span>© {new Date().getFullYear()} {displayName}</span><span>{en?'Made with care.':'اتعمل بحب.'}　<span style={{color:data.accent}}>✳</span></span></footer></article>
}

function PublicPortfolioPage({ idOrSlug, language, onLanguage, onGoHome, onStart }: {
  idOrSlug: string
  language: SiteLanguage
  onLanguage: () => void
  onGoHome: () => void
  onStart: () => void
}) {
  const en = language === 'en'
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ id: string; title: string; slug?: string; document: Portfolio; templateId: string; status: string } | null>(null)
  const [error, setError] = useState('')
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [message, setMessage] = useState('')
  const [msgSending, setMsgSending] = useState(false)
  const [msgSent, setMsgSent] = useState(false)
  const [msgError, setMsgError] = useState('')

  useEffect(() => {
    let active = true
    apiRequest<{ portfolio: { id: string; title: string; slug?: string; document: Portfolio; templateId: string; status: string } }>(`/api/portfolios/public/${encodeURIComponent(idOrSlug)}`)
      .then(res => {
        if (!active) return
        setData(res.portfolio)
        const portfolio = res.portfolio
        const documentData = portfolio?.document || {}
        const displayName = String(documentData.name || portfolio?.title || (en ? 'Personal Portfolio' : 'معرض أعمال')).trim()
        const role = String(documentData.role || '').trim()
        const bio = String(documentData.bio || '').replace(/\\s+/g, ' ').trim()
        const description = (bio || role || (en ? 'A personal website and portfolio made with Taqdom.' : 'موقع شخصي ومعرض أعمال على تقدّم.')).slice(0, 160)
        const host = location.hostname.toLowerCase()
        const tenantSuffix = '.taqdom.me'
        const isTenantHost = host.endsWith(tenantSuffix) && host !== 'taqdom.me' && !host.slice(0, -tenantSuffix.length).includes('.')
        const canonicalPath = isTenantHost
          ? `https://${host}/`
          : `${location.origin}/p/${encodeURIComponent(portfolio.slug || idOrSlug)}`
        const canonical = document.querySelector('link[rel="canonical"]')
        canonical?.setAttribute('href', canonicalPath)
        document.title = `${displayName} — ${en ? 'Personal Portfolio' : 'معرض أعمال'}`
        document.querySelector('meta[name="description"]')?.setAttribute('content', description)
        document.querySelector('meta[name="robots"]')?.setAttribute('content', 'index, follow, max-image-preview:large')
        document.querySelector('meta[property="og:title"]')?.setAttribute('content', displayName)
        document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
        document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonicalPath)
        document.querySelector('meta[property="og:type"]')?.setAttribute('content', 'website')
        document.querySelector('meta[property="og:locale"]')?.setAttribute('content', en ? 'en_US' : 'ar')
        const socialImage = documentData.avatarUrl
          ? new URL(documentData.avatarUrl, location.origin).href
          : new URL('/taqdom-og-card.svg', location.origin).href
        document.querySelector('meta[property="og:image"]')?.setAttribute('content', socialImage)
        document.querySelector('meta[property="og:image:alt"]')?.setAttribute('content', displayName)
        document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', displayName)
        document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description)
        document.querySelector('meta[name="twitter:image"]')?.setAttribute('content', socialImage)
      })
      .catch(() => {
        if (!active) return
        setError(en ? 'Portfolio not found or unavailable.' : 'معرض الأعمال غير موجود أو غير متاح حاليًا.')
        document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, follow')
        document.title = en ? 'Portfolio not found | Taqdom' : 'الموقع غير موجود | تقدّم'
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [idOrSlug, en])

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault()
    if (!data?.id || !message.trim()) return
    setMsgSending(true)
    setMsgError('')
    try {
      await apiRequest('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          portfolioId: data.id,
          senderName,
          senderEmail,
          message
        })
      })
      setMsgSent(true)
      setMessage('')
    } catch {
      setMsgError(en ? 'Failed to send message. Please try again.' : 'تعذر إرسال الرسالة. يرجى المحاولة مجددًا.')
    } finally {
      setMsgSending(false)
    }
  }

  if (loading) {
    return (
      <div className="public-portfolio-shell" dir={en ? 'ltr' : 'rtl'}>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
          <div className="dashboard-loading">
            <span className="loading-orbit" /> {en ? 'Loading portfolio…' : 'جارٍ تحميل موقع المعرض…'}
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="public-portfolio-shell" dir={en ? 'ltr' : 'rtl'}>
        <header className="public-top-badge">
          <button className="auth-brand" onClick={onGoHome} style={{ background: 'none', border: 0, color: '#fff', cursor: 'pointer' }}>
            <BrandMark /><span>taqdom<span className="site-brand-dot">.</span></span>
          </button>
          <button className="site-lang" onClick={onLanguage}>{en ? 'العربية' : 'English'}</button>
        </header>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh', textAlign: 'center', padding: '20px' }}>
          <div>
            <h2>{en ? 'Portfolio Not Found' : 'لم يتم العثور على الموقع'}</h2>
            <p style={{ color: '#888', margin: '12px 0 24px' }}>{error || (en ? 'This portfolio link does not exist.' : 'رابط الموقع المطلوب غير موجود أو غير منشور.')}</p>
            <button className="button button-primary" onClick={onGoHome}>{en ? 'Go to Taqdom' : 'الانتقال إلى تقدّم'}</button>
          </div>
        </div>
      </div>
    )
  }

  const chosenTemplate = templates.find(t => t.id === data.document.templateId) || templates[0]

  return (
    <div className="public-portfolio-shell" dir={en ? 'ltr' : 'rtl'}>
      <header className="public-top-badge">
        <a href="/" onClick={e => { e.preventDefault(); onGoHome() }}>
          <BrandMark />
          <span><b>{data.document.name || 'Taqdom'}</b> · {en ? 'Personal Portfolio' : 'معرض أعمال'}</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="site-lang" onClick={onLanguage} style={{ color: '#aaa', background: 'none', border: 0, cursor: 'pointer' }}>
            {en ? 'العربية' : 'English'}
          </button>
          <button className="badge-cta" onClick={onStart}>
            {en ? 'Create your own free site 🚀' : 'أنشئ موقعك مجانًا 🚀'}
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '20px 10px' }}>
        <PortfolioCanvas data={data.document} template={chosenTemplate} language={language} />

        <div style={{ maxWidth: '640px', margin: '40px auto 20px', background: '#fff', border: '1px solid #ebe9e3', borderRadius: '16px', padding: '28px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>{en ? 'Send a message' : 'تواصل مع صاحب الموقع'}</h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#666' }}>
            {en ? `Leave a message for ${data.document.name || 'the creator'}.` : `أرسل رسالة مباشرة إلى ${data.document.name || 'صاحب الموقع'}.`}
          </p>
          {msgSent ? (
            <div className="msg-success-badge">
              ✓ {en ? 'Your message has been sent successfully!' : 'تم إرسال رسالتك بنجاح! سيتم إخطار صاحب الموقع.'}
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="public-contact-form">
              <input
                type="text"
                placeholder={en ? 'Your name' : 'اسمك'}
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
                maxLength={100}
                required
              />
              <input
                type="email"
                placeholder={en ? 'Your email address' : 'بريدك الإلكتروني'}
                value={senderEmail}
                onChange={e => setSenderEmail(e.target.value)}
                maxLength={254}
                required
              />
              <textarea
                placeholder={en ? 'Your message…' : 'اكتب رسالتك هنا…'}
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                maxLength={1500}
                required
              />
              {msgError && <p style={{ color: '#d9534f', fontSize: '12px', margin: 0 }}>{msgError}</p>}
              <button type="submit" className="button button-primary" style={{ alignSelf: 'flex-start' }} disabled={msgSending}>
                {msgSending ? (en ? 'Sending…' : 'جارٍ الإرسال…') : (en ? 'Send Message ✉' : 'إرسال الرسالة ✉')}
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="public-bottom-badge">
        <span>© {new Date().getFullYear()} {data.document.name || 'Taqdom'}</span>
        <span>{en ? 'Powered by' : 'مدعوم بواسطة'} <a href="https://taqdom.me" target="_blank" rel="noreferrer">taqdom.me</a></span>
      </footer>
    </div>
  )
}
