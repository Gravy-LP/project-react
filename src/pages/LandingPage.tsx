import { useEffect, useRef, useState } from 'react';

/* ─── tiny hook: animate on scroll ─── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

/* ─── data ─── */
const features = [
  { icon: '📅', title: 'Calendario Intelligente', desc: 'Vista mensile e giornaliera con drag-and-drop. Ogni appuntamento sempre a portata di mano.' },
  { icon: '🔔', title: 'Richieste in Tempo Reale', desc: 'Le nuove prenotazioni arrivano istantaneamente. Accetta o rifiuta con un tap, anche da mobile.' },
  { icon: '👥', title: 'Rubrica Pazienti', desc: 'Profili costruiti automaticamente dal flusso di prenotazione. Zero doppioni, zero caos.' },
  { icon: '📊', title: 'Dashboard Clinica', desc: 'Overview immediata: prossimi appuntamenti e richieste in attesa, tutto in un colpo d\'occhio.' },
  { icon: '📱', title: 'Mobile First', desc: 'Ottimizzato per smartphone. Gesture di long-press per azioni rapide, ovunque tu sia.' },
  { icon: '⚡', title: 'Sync Real-Time', desc: 'Powered by Supabase. Ogni modifica si propaga in millisecondi su tutti i dispositivi.' },
];

const steps = [
  { n: '01', title: 'Il paziente prenota', desc: 'Tramite il tuo link personalizzato, senza telefonate.' },
  { n: '02', title: 'Ricevi la notifica', desc: 'Il sistema ti avvisa in real-time e aggiunge la richiesta alla coda.' },
  { n: '03', title: 'Accetti con un tap', desc: 'Conferma o rifiuta. Il calendario si aggiorna automaticamente.' },
];

const testimonials = [
  { name: 'Dott.ssa M. Ferretti', role: 'Medicina Generale', text: 'Ho eliminato completamente le telefonate per le prenotazioni. I pazienti sono più soddisfatti e io ho più tempo.' },
  { name: 'Studio Ortopedico Bianchi', role: 'Ortopedia', text: 'La rubrica che si costruisce da sola è geniale. Ogni paziente ha il suo profilo senza che io faccia nulla.' },
  { name: 'Dr. L. Conti', role: 'Fisioterapia', text: 'Finalmente gestisco tutto dal telefono. Il long-press per le azioni rapide è incredibilmente comodo.' },
];

/* ─── styles (all inline so zero external deps) ─── */
const G = {
  '--c1': '#6366f1',
  '--c2': '#8b5cf6',
  '--c3': '#06b6d4',
} as React.CSSProperties;

export default function LandingPage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#080b14', color: '#e2e8f0', overflowX: 'hidden', ...G }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        ::selection{background:#6366f133;color:#a5b4fc}
        .lp-reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease}
        .lp-reveal.lp-visible{opacity:1;transform:translateY(0)}
        .lp-card-hover{transition:transform .3s ease,box-shadow .3s ease}
        .lp-card-hover:hover{transform:translateY(-6px);box-shadow:0 20px 60px #6366f133}
        .lp-btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:12px;color:#fff;cursor:pointer;font-size:1rem;font-weight:600;padding:14px 32px;transition:all .25s ease;letter-spacing:.01em}
        .lp-btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 40px #6366f155}
        .lp-btn-ghost{background:transparent;border:1.5px solid #ffffff22;border-radius:12px;color:#e2e8f0;cursor:pointer;font-size:1rem;font-weight:500;padding:13px 28px;transition:all .25s ease}
        .lp-btn-ghost:hover{border-color:#6366f1;color:#a5b4fc}
        .lp-tag{background:#6366f115;border:1px solid #6366f133;border-radius:999px;color:#a5b4fc;display:inline-block;font-size:.8rem;font-weight:600;letter-spacing:.08em;padding:6px 16px;text-transform:uppercase}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
        @keyframes pulse-ring{0%{transform:scale(.9);opacity:.7}70%{transform:scale(1.3);opacity:0}100%{opacity:0}}
        @keyframes gradient-shift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes spin-slow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes appear{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:768px){
          .lp-hero-title{font-size:clamp(2.2rem,9vw,4rem)!important}
          .lp-features-grid{grid-template-columns:1fr!important}
          .lp-steps{flex-direction:column!important}
          .lp-testi-grid{grid-template-columns:1fr!important}
          .lp-nav-links{display:none!important}
          .lp-hero-btns{flex-direction:column!important;align-items:stretch!important}
        }
      `}</style>

      {/* ── CURSOR GLOW ── */}
      <div style={{
        position: 'fixed', top: mousePos.y - 200, left: mousePos.x - 200,
        width: 400, height: 400, borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(circle, #6366f118 0%, transparent 70%)',
        transition: 'top .1s ease, left .1s ease',
      }} />

      {/* ── NAV ── */}
      <nav style={{
        alignItems: 'center', backdropFilter: 'blur(20px)', background: '#080b14cc',
        borderBottom: '1px solid #ffffff0a', display: 'flex', justifyContent: 'space-between',
        padding: '0 5%', position: 'fixed', top: 0, width: '100%', zIndex: 100, height: 68,
      }}>
        <div style={{ alignItems: 'center', display: 'flex', gap: 10, fontWeight: 800, fontSize: '1.2rem' }}>
          <span style={{ fontSize: '1.5rem' }}>📅</span>
          <span style={{ background: 'linear-gradient(135deg,#a5b4fc,#67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AptBooker</span>
        </div>
        <div className="lp-nav-links" style={{ alignItems: 'center', display: 'flex', gap: 32 }}>
          {['Funzionalità', 'Come Funziona', 'Testimonianze'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/\s+/g, '-').replace('à', 'a')}`}
              style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '.95rem', fontWeight: 500, transition: 'color .2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#a5b4fc')}
              onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>{l}</a>
          ))}
        </div>
        <button className="lp-btn-primary" style={{ fontSize: '.9rem', padding: '10px 22px' }}>Inizia Gratis →</button>
      </nav>

      {/* ── HERO ── */}
      <section style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', padding: '120px 5% 80px', position: 'relative', textAlign: 'center' }}>
        {/* bg orbs */}
        <div style={{ animation: 'float 6s ease-in-out infinite', background: 'radial-gradient(circle, #6366f130, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', height: 600, left: '-10%', position: 'absolute', top: '5%', width: 600 }} />
        <div style={{ animation: 'float 8s ease-in-out infinite reverse', background: 'radial-gradient(circle, #8b5cf630, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', height: 500, position: 'absolute', right: '-5%', top: '20%', width: 500 }} />
        <div style={{ animation: 'float 7s ease-in-out infinite 2s', background: 'radial-gradient(circle, #06b6d420, transparent 70%)', borderRadius: '50%', bottom: '10%', filter: 'blur(80px)', height: 400, left: '30%', position: 'absolute', width: 400 }} />

        <div style={{ animation: 'appear .8s ease both', position: 'relative', zIndex: 1, maxWidth: 860 }}>
          <span className="lp-tag" style={{ marginBottom: 24, display: 'inline-block' }}>✨ Gestione Clinica del Futuro</span>

          <h1 className="lp-hero-title" style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #67e8f9 100%)',
            backgroundSize: '200% 200%', animation: 'gradient-shift 4s ease infinite',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontSize: 'clamp(3rem, 6vw, 5.5rem)', fontWeight: 900, lineHeight: 1.1,
            letterSpacing: '-.03em', marginBottom: 24,
          }}>
            Il tuo studio medico,<br />finalmente senza caos.
          </h1>

          <p style={{ color: '#94a3b8', fontSize: 'clamp(1rem, 2vw, 1.25rem)', fontWeight: 400, lineHeight: 1.7, marginBottom: 48, maxWidth: 620, margin: '0 auto 48px' }}>
            AptBooker gestisce prenotazioni, pazienti e calendario in un'unica dashboard glassmorphica. Real-time, mobile-first, zero telefonate.
          </p>

          <div className="lp-hero-btns" style={{ alignItems: 'center', display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="lp-btn-primary" style={{ fontSize: '1.05rem', padding: '16px 36px' }}>Prova Gratis 14 giorni →</button>
            <button className="lp-btn-ghost" style={{ fontSize: '1.05rem', padding: '15px 32px' }}>▶ Guarda il Demo</button>
          </div>

          <p style={{ color: '#475569', fontSize: '.85rem', marginTop: 20 }}>Nessuna carta di credito richiesta · Setup in 2 minuti</p>
        </div>

        {/* mock dashboard preview */}
        <div style={{ animation: 'appear 1.2s ease both .3s', marginTop: 80, maxWidth: 900, position: 'relative', width: '100%', zIndex: 1 }}>
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            border: '1px solid #ffffff12', borderRadius: 20,
            boxShadow: '0 40px 120px #6366f140, 0 0 0 1px #ffffff08',
            overflow: 'hidden', padding: 24,
          }}>
            {/* fake top bar */}
            <div style={{ alignItems: 'center', borderBottom: '1px solid #ffffff0a', display: 'flex', gap: 8, marginBottom: 20, paddingBottom: 16 }}>
              {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} style={{ background: c, borderRadius: '50%', height: 12, width: 12 }} />)}
              <div style={{ background: '#ffffff08', borderRadius: 6, flex: 1, height: 24, marginLeft: 12 }} />
            </div>
            {/* fake content grid */}
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {[
                { label: 'Prossimi Appuntamenti', count: '8', color: '#6366f1', items: ['Mario Rossi — 09:00', 'Laura Bianchi — 10:30', 'Giuseppe Verdi — 14:00'] },
                { label: 'Nuove Richieste', count: '3', color: '#f59e0b', items: ['Anna Neri — In attesa', 'Luca Gallo — In attesa', 'Sofia Martini — In attesa'] },
                { label: 'Pazienti Totali', count: '142', color: '#10b981', items: ['Aggiunto oggi: 2', 'Questa settimana: 8', 'Questo mese: 31'] },
              ].map(card => (
                <div key={card.label} style={{ background: '#ffffff06', border: '1px solid #ffffff0a', borderRadius: 12, padding: 16 }}>
                  <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ color: '#64748b', fontSize: '.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{card.label}</span>
                    <span style={{ background: card.color + '22', borderRadius: 8, color: card.color, fontSize: '.8rem', fontWeight: 700, padding: '3px 10px' }}>{card.count}</span>
                  </div>
                  {card.items.map(item => (
                    <div key={item} style={{ alignItems: 'center', borderRadius: 6, color: '#94a3b8', display: 'flex', fontSize: '.8rem', gap: 8, marginBottom: 6, padding: '5px 8px' }}>
                      <div style={{ background: card.color, borderRadius: '50%', flexShrink: 0, height: 6, width: 6 }} />
                      {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* glow under mockup */}
          <div style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4)', borderRadius: '50%', bottom: -40, filter: 'blur(40px)', height: 80, left: '10%', opacity: .4, position: 'absolute', width: '80%' }} />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <FeatureSection />

      {/* ── HOW IT WORKS ── */}
      <HowItWorks steps={steps} />

      {/* ── TESTIMONIALS ── */}
      <TestimonialsSection testimonials={testimonials} />

      {/* ── CTA ── */}
      <CTASection />

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid #ffffff08', color: '#475569', fontSize: '.85rem', padding: '32px 5%', textAlign: 'center' }}>
        <p>© 2026 AptBooker · Fatto con ❤️ per i professionisti della salute</p>
      </footer>
    </div>
  );
}

/* ── FEATURE SECTION ── */
function FeatureSection() {
  const { ref, visible } = useReveal();
  return (
    <section id="funzionalita" style={{ padding: '100px 5%', position: 'relative' }}>
      <div style={{ background: 'radial-gradient(circle, #8b5cf620, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)', height: 600, left: '50%', position: 'absolute', top: '10%', transform: 'translateX(-50%)', width: 600 }} />
      <div style={{ margin: '0 auto', maxWidth: 1100, position: 'relative' }}>
        <div ref={ref} className={`lp-reveal${visible ? ' lp-visible' : ''}`} style={{ marginBottom: 64, textAlign: 'center' }}>
          <span className="lp-tag" style={{ marginBottom: 16, display: 'inline-block' }}>Funzionalità</span>
          <h2 style={{ color: '#f1f5f9', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.2 }}>
            Tutto ciò che serve,<br /><span style={{ background: 'linear-gradient(135deg,#a5b4fc,#67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>niente di superfluo.</span>
          </h2>
        </div>
        <div className="lp-features-grid" style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {features.map((f, i) => <FeatureCard key={f.title} f={f} delay={i * 100} />)}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ f, delay }: { f: typeof features[0]; delay: number }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`lp-reveal lp-card-hover${visible ? ' lp-visible' : ''}`}
      style={{
        transitionDelay: `${delay}ms`,
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        border: '1px solid #ffffff0d', borderRadius: 16, padding: '28px 24px',
      }}>
      <div style={{ fontSize: '2rem', marginBottom: 14 }}>{f.icon}</div>
      <h3 style={{ color: '#f1f5f9', fontSize: '1.05rem', fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
      <p style={{ color: '#64748b', fontSize: '.9rem', lineHeight: 1.65 }}>{f.desc}</p>
    </div>
  );
}

/* ── HOW IT WORKS ── */
function HowItWorks({ steps }: { steps: { n: string; title: string; desc: string }[] }) {
  const { ref, visible } = useReveal();
  return (
    <section id="come-funziona" style={{ padding: '100px 5%', background: '#0a0d1a' }}>
      <div style={{ margin: '0 auto', maxWidth: 1000, textAlign: 'center' }}>
        <div ref={ref} className={`lp-reveal${visible ? ' lp-visible' : ''}`} style={{ marginBottom: 64 }}>
          <span className="lp-tag" style={{ marginBottom: 16, display: 'inline-block' }}>Come Funziona</span>
          <h2 style={{ color: '#f1f5f9', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
            Tre passi verso la <span style={{ background: 'linear-gradient(135deg,#a5b4fc,#67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>semplicità.</span>
          </h2>
        </div>
        <div className="lp-steps" style={{ alignItems: 'stretch', display: 'flex', gap: 24, justifyContent: 'center' }}>
          {steps.map((s, i) => <StepCard key={s.n} s={s} delay={i * 150} />)}
        </div>
      </div>
    </section>
  );
}

function StepCard({ s, delay }: { s: { n: string; title: string; desc: string }; delay: number }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`lp-reveal${visible ? ' lp-visible' : ''}`}
      style={{
        transitionDelay: `${delay}ms`, flex: 1,
        background: 'linear-gradient(135deg,#0f172a,#1e293b)',
        border: '1px solid #ffffff0d', borderRadius: 20, padding: '36px 28px', position: 'relative',
      }}>
      <div style={{
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        borderRadius: 12, color: '#fff', display: 'inline-block',
        fontSize: '.7rem', fontWeight: 800, letterSpacing: '.1em',
        marginBottom: 20, padding: '6px 14px',
      }}>{s.n}</div>
      <h3 style={{ color: '#f1f5f9', fontSize: '1.15rem', fontWeight: 700, marginBottom: 12 }}>{s.title}</h3>
      <p style={{ color: '#64748b', fontSize: '.9rem', lineHeight: 1.65 }}>{s.desc}</p>
    </div>
  );
}

/* ── TESTIMONIALS ── */
function TestimonialsSection({ testimonials }: { testimonials: { name: string; role: string; text: string }[] }) {
  const { ref, visible } = useReveal();
  return (
    <section id="testimonianze" style={{ padding: '100px 5%', position: 'relative' }}>
      <div style={{ margin: '0 auto', maxWidth: 1100 }}>
        <div ref={ref} className={`lp-reveal${visible ? ' lp-visible' : ''}`} style={{ marginBottom: 64, textAlign: 'center' }}>
          <span className="lp-tag" style={{ marginBottom: 16, display: 'inline-block' }}>Testimonianze</span>
          <h2 style={{ color: '#f1f5f9', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
            Già <span style={{ background: 'linear-gradient(135deg,#a5b4fc,#67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>amato</span> dai medici.
          </h2>
        </div>
        <div className="lp-testi-grid" style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(3,1fr)' }}>
          {testimonials.map((t, i) => <TestiCard key={t.name} t={t} delay={i * 120} />)}
        </div>
      </div>
    </section>
  );
}

function TestiCard({ t, delay }: { t: { name: string; role: string; text: string }; delay: number }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`lp-reveal lp-card-hover${visible ? ' lp-visible' : ''}`}
      style={{
        transitionDelay: `${delay}ms`,
        background: 'linear-gradient(135deg,#0f172a,#1e293b)',
        border: '1px solid #ffffff0d', borderRadius: 16, padding: '28px 24px',
      }}>
      <div style={{ color: '#6366f1', fontSize: '1.5rem', marginBottom: 16 }}>❝</div>
      <p style={{ color: '#cbd5e1', fontSize: '.95rem', lineHeight: 1.7, marginBottom: 24 }}>{t.text}</p>
      <div style={{ alignItems: 'center', display: 'flex', gap: 12 }}>
        <div style={{
          alignItems: 'center', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          borderRadius: '50%', color: '#fff', display: 'flex', flexShrink: 0,
          fontSize: '.85rem', fontWeight: 700, height: 40, justifyContent: 'center', width: 40,
        }}>{t.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
        <div>
          <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '.9rem' }}>{t.name}</div>
          <div style={{ color: '#475569', fontSize: '.8rem' }}>{t.role}</div>
        </div>
      </div>
    </div>
  );
}

/* ── CTA ── */
function CTASection() {
  const { ref, visible } = useReveal();
  return (
    <section style={{ padding: '100px 5%' }}>
      <div ref={ref} className={`lp-reveal${visible ? ' lp-visible' : ''}`}
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
          border: '1px solid #6366f130', borderRadius: 24, margin: '0 auto',
          maxWidth: 800, padding: '80px 48px', position: 'relative', textAlign: 'center', overflow: 'hidden',
        }}>
        <div style={{ background: 'radial-gradient(circle,#6366f140,transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', height: 400, left: '50%', position: 'absolute', top: '50%', transform: 'translate(-50%,-50%)', width: 400 }} />
        <span className="lp-tag" style={{ marginBottom: 20, display: 'inline-block', position: 'relative' }}>Inizia Oggi</span>
        <h2 style={{ color: '#f1f5f9', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.2, marginBottom: 20, position: 'relative' }}>
          Pronto a trasformare<br />il tuo studio?
        </h2>
        <p style={{ color: '#64748b', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 40, position: 'relative' }}>
          14 giorni gratuiti, nessuna carta di credito. Setup in 2 minuti.
        </p>
        <div style={{ alignItems: 'center', display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
          <button className="lp-btn-primary" style={{ fontSize: '1.05rem', padding: '16px 40px' }}>Inizia Gratis →</button>
          <button className="lp-btn-ghost">Parla con noi</button>
        </div>
      </div>
    </section>
  );
}
