import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── hooks ─── */
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

function useScroll() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return scrollY;
}

/* ─── data ─── */
const testimonials = [
  { name: 'Dott.ssa M. Ferretti', role: 'Medicina Generale', text: 'Ho eliminato completamente le telefonate per le prenotazioni. I pazienti sono più soddisfatti e io ho più tempo.', avatar: 'MF' },
  { name: 'Studio Ortopedico Bianchi', role: 'Ortopedia', text: 'La rubrica che si costruisce da sola è geniale. Ogni paziente ha il suo profilo senza che io faccia nulla.', avatar: 'OB' },
  { name: 'Dr. L. Conti', role: 'Fisioterapia', text: 'Finalmente gestisco tutto dal telefono. Il long-press per le azioni rapide è incredibilmente comodo.', avatar: 'LC' },
];

export default function LandingPage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const scrollY = useScroll();
  const navigate = useNavigate();

  useEffect(() => {
    const move = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  // Parallax calcs
  const heroMockupRotateX = Math.max(0, 15 - scrollY * 0.05);
  const heroMockupScale = Math.min(1.05, 0.9 + scrollY * 0.0005);
  const heroMockupTranslateY = scrollY * 0.2;

  const bgOffsetY = scrollY * 0.5;

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#030712', color: '#f8fafc', overflowX: 'hidden', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        ::selection{background:#6366f140;color:#e0e7ff}
        
        .reveal{opacity:0;transform:translateY(40px);transition:all 0.8s cubic-bezier(0.16, 1, 0.3, 1)}
        .reveal.visible{opacity:1;transform:translateY(0)}
        
        .btn-primary {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          border: 1px solid #8b5cf655;
          border-radius: 999px;
          color: white;
          cursor: pointer;
          font-weight: 600;
          padding: 14px 36px;
          transition: all 0.3s ease;
          box-shadow: 0 10px 25px -5px #6366f166;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .btn-primary:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 20px 35px -5px #6366f188;
        }

        .btn-secondary {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 999px;
          color: white;
          cursor: pointer;
          font-weight: 500;
          padding: 14px 36px;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.2);
        }

        .glass-panel {
          background: linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.7));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          backdrop-filter: blur(20px);
          box-shadow: 0 30px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
        }

        .gradient-text {
          background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #2dd4bf 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .bento-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: auto auto;
          gap: 24px;
        }
        .bento-item {
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
          position: relative;
        }
        .bento-item:hover {
          transform: translateY(-8px);
        }

        @keyframes float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-20px) } }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.4; transform: scale(1) } 50% { opacity: 0.6; transform: scale(1.05) } }

        @media (max-width: 1024px) {
          .bento-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .bento-grid { grid-template-columns: 1fr; }
          .hero-title { font-size: clamp(2.5rem, 10vw, 4rem)!important; }
          .nav-links { display: none!important; }
        }
      `}</style>

      {/* Dynamic Cursor Glow */}
      <div style={{
        position: 'fixed', top: mousePos.y - 250, left: mousePos.x - 250,
        width: 500, height: 500, borderRadius: '50%', pointerEvents: 'none', zIndex: 9999,
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 60%)',
        transition: 'top 0.1s ease-out, left 0.1s ease-out',
        mixBlendMode: 'screen'
      }} />

      {/* Navigation */}
      <nav style={{
        position: 'fixed', top: 0, width: '100%', height: '80px', zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 5%',
        background: scrollY > 20 ? 'rgba(3, 7, 18, 0.8)' : 'transparent',
        backdropFilter: scrollY > 20 ? 'blur(20px)' : 'none',
        borderBottom: scrollY > 20 ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 800, fontSize: '1.4rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #2dd4bf)', borderRadius: '12px', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem' }}>
            <i className="ph ph-calendar-check" />
          </div>
          <span style={{ letterSpacing: '-0.02em' }}>AptBooker</span>
        </div>
        <div className="nav-links" style={{ display: 'flex', gap: 40, fontWeight: 500, color: '#94a3b8' }}>
          <a href="#features" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>Funzionalità</a>
          <a href="#dashboard" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>L'Interfaccia</a>
          <a href="#testimonials" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>Dicono di noi</a>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button className="btn-secondary" onClick={() => navigate('/login')} style={{ padding: '10px 24px' }}>Accedi</button>
          <button className="btn-primary" onClick={() => navigate('/login')} style={{ padding: '10px 24px' }}>Inizia Ora</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        position: 'relative', minHeight: '130vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', paddingTop: '180px', overflow: 'hidden'
      }}>
        {/* Massive Background Blobs */}
        <div style={{ position: 'absolute', top: `${-100 + bgOffsetY}px`, left: '10%', width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 60%)', filter: 'blur(80px)', animation: 'pulse-glow 8s infinite alternate', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: `${200 + bgOffsetY * 0.8}px`, right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(45,212,191,0.15) 0%, transparent 60%)', filter: 'blur(60px)', animation: 'pulse-glow 10s infinite alternate-reverse', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '900px', padding: '0 5%' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', padding: '6px 16px', borderRadius: '999px', color: '#a5b4fc', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '32px' }}>
            <span style={{ position: 'relative', display: 'flex', height: 8, width: 8 }}><span style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', background: '#818cf8', opacity: 0.75 }}></span><span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', height: 8, width: 8, background: '#818cf8' }}></span></span>
            AptBooker v2.0 è live
          </div>

          <h1 className="hero-title" style={{ fontSize: '5.5rem', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.04em', marginBottom: '32px' }}>
            Meno chiamate.<br />Più <span className="gradient-text">pazienti.</span>
          </h1>

          <p style={{ fontSize: '1.25rem', color: '#94a3b8', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 48px' }}>
            Prenotazioni automatiche. Calendario Real-Time. Rubrica intelligente. Il tuo studio, ovunque tu sia.
          </p>

          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ fontSize: '1.1rem', padding: '18px 40px' }} onClick={() => navigate('/login')}>
              Inizia Gratuitamente <i className="ph ph-arrow-right" />
            </button>
            <button className="btn-secondary" style={{ fontSize: '1.1rem', padding: '18px 40px' }}>
              <i className="ph ph-play-circle" /> Guarda il Demo
            </button>
          </div>
        </div>

        {/* 3D Dashboard Mockup with Parallax */}
        <div style={{
          marginTop: '80px',
          perspective: '1200px',
          width: '100%',
          maxWidth: '1100px',
          padding: '0 5%',
          zIndex: 10,
          position: 'relative'
        }}>
          <div style={{
            transform: `rotateX(${heroMockupRotateX}deg) scale(${heroMockupScale}) translateY(${heroMockupTranslateY}px)`,
            transformStyle: 'preserve-3d',
            transition: 'transform 0.1s linear',
            willChange: 'transform'
          }}>
            <div className="glass-panel" style={{
              padding: 0, overflow: 'hidden',
              boxShadow: '0 50px 100px -20px rgba(99,102,241,0.25), 0 30px 60px -30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
            }}>
              {/* Browser Header */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
                </div>
                <div style={{ margin: '0 auto', background: 'rgba(0,0,0,0.2)', padding: '6px 120px', borderRadius: 8, color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ph ph-lock-key" /> aptbooker.com/dashboard
                </div>
              </div>

              {/* App Content */}
              <div style={{ display: 'flex', height: '600px' }}>
                {/* Sidebar */}
                <div style={{ width: '240px', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ height: 32, width: '80%', background: 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 24 }} />
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: i === 1 ? 'rgba(99,102,241,0.15)' : 'transparent', borderRadius: 8 }}>
                      <div style={{ width: 20, height: 20, background: i === 1 ? '#818cf8' : 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                      <div style={{ height: 14, width: '60%', background: i === 1 ? '#c7d2fe' : 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                    </div>
                  ))}
                </div>
                {/* Main Area */}
                <div style={{ flex: 1, padding: '40px', background: 'rgba(15,23,42,0.4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
                    <div>
                      <div style={{ height: 28, width: 200, background: 'rgba(255,255,255,0.9)', borderRadius: 6, marginBottom: 12 }} />
                      <div style={{ height: 16, width: 300, background: 'rgba(255,255,255,0.4)', borderRadius: 4 }} />
                    </div>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #2dd4bf)' }} />
                  </div>

                  {/* Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
                    {[
                      { color: '#6366f1', value: '12', label: 'Appuntamenti Oggi' },
                      { color: '#f59e0b', value: '5', label: 'Richieste in Attesa' },
                      { color: '#10b981', value: '1.2k', label: 'Pazienti in Rubrica' }
                    ].map(stat => (
                      <div key={stat.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 24 }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: stat.color, marginBottom: 8 }}>{stat.value}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* List */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 24 }}>
                    <div style={{ height: 20, width: 150, background: 'rgba(255,255,255,0.6)', borderRadius: 4, marginBottom: 24 }} />
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i !== 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                          <div>
                            <div style={{ height: 16, width: 120, background: 'rgba(255,255,255,0.8)', borderRadius: 4, marginBottom: 8 }} />
                            <div style={{ height: 12, width: 80, background: 'rgba(255,255,255,0.3)', borderRadius: 4 }} />
                          </div>
                        </div>
                        <div style={{ padding: '6px 12px', borderRadius: 999, background: i === 1 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${i === 1 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
                          <div style={{ height: 10, width: 60, background: i === 1 ? '#fcd34d' : '#6ee7b7', borderRadius: 2 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15,23,42,0.3)', padding: '40px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', flexWrap: 'wrap', gap: 40, padding: '0 5%' }}>
          {[
            { n: '10k+', l: 'Prenotazioni Gestite' },
            { n: '99.9%', l: 'Uptime Garantito' },
            { n: 'Zero', l: 'Doppioni in Rubrica' },
            { n: '< 1s', l: 'Sync in Tempo Reale' }
          ].map(stat => (
            <div key={stat.l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', marginBottom: 8 }}>{stat.n}</div>
              <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" style={{ padding: '160px 5%', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '20%', right: '-20%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0 }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <div className="bento-grid">
            {/* Large Card: Real Time Calendar */}
            <div className="glass-panel bento-item" style={{ gridColumn: '1 / -1', padding: 0, display: 'flex', overflow: 'hidden', height: '400px', flexWrap: 'wrap' }}>
              <div style={{ padding: '48px', flex: '1 1 300px', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99,102,241,0.1)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 20 }}>
                  <i className="ph ph-lightning" />
                </div>
                <h3 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>Sync Immediata.</h3>
                <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Tutto si aggiorna istantaneamente. Zero attese.</p>
              </div>

              <div style={{ flex: '1 1 500px', position: 'relative', background: 'rgba(0,0,0,0.2)', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                {/* Visual Representation of Real Time Sync */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '120%', height: '120%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
                  {/* Fake Phone */}
                  <div style={{ width: 140, height: 280, background: '#0f172a', borderRadius: 24, border: '4px solid #1e293b', padding: 12, position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                    <div style={{ width: '40%', height: 4, background: '#334155', borderRadius: 2, margin: '0 auto 16px' }} />
                    <div style={{ height: 40, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 8, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 'bold' }}>Accetta</div>
                    <div style={{ height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }} />
                  </div>

                  {/* Connection lines */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {[1, 2, 3].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#2dd4bf', animation: `pulse-glow 1s infinite ${i * 0.2}s` }} />)}
                  </div>

                  {/* Fake Desktop Calendar */}
                  <div style={{ width: 220, height: 280, background: '#0f172a', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', padding: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, height: '100%' }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                        <div key={i} style={{ background: i === 6 ? '#2dd4bf' : 'rgba(255,255,255,0.05)', borderRadius: 4, opacity: i === 6 ? 1 : 0.5, transition: 'all 0.3s' }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Medium Card 1: Patients */}
            <div className="glass-panel bento-item" style={{ gridColumn: 'span 2', padding: 0, display: 'flex', overflow: 'hidden', height: '320px' }}>
              <div style={{ padding: '40px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>Rubrica Auto.</h3>
                <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Si costruisce da sola ad ogni prenotazione.</p>
              </div>
              <div style={{ flex: 1, position: 'relative', background: 'rgba(16,185,129,0.05)' }}>
                {/* Floating profile cards */}
                <div style={{ position: 'absolute', top: 40, left: 20, right: -20, background: '#1e293b', padding: 16, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', gap: 12, alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ef4444' }} />
                  <div><div style={{ width: 100, height: 8, background: '#fff', borderRadius: 4, marginBottom: 6 }} /><div style={{ width: 60, height: 6, background: 'rgba(255,255,255,0.5)', borderRadius: 4 }} /></div>
                </div>
                <div style={{ position: 'absolute', top: 110, left: 40, right: -40, background: '#0f172a', padding: 16, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', gap: 12, alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)', zIndex: 2 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6' }} />
                  <div><div style={{ width: 120, height: 8, background: '#fff', borderRadius: 4, marginBottom: 6 }} /><div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.5)', borderRadius: 4 }} /></div>
                </div>
                <div style={{ position: 'absolute', top: 180, left: 60, right: -60, background: '#1e293b', padding: 16, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', gap: 12, alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)', zIndex: 3 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#10b981' }} />
                  <div><div style={{ width: 90, height: 8, background: '#fff', borderRadius: 4, marginBottom: 6 }} /><div style={{ width: 50, height: 6, background: 'rgba(255,255,255,0.5)', borderRadius: 4 }} /></div>
                </div>
              </div>
            </div>

            {/* Small Card: Mobile */}
            <div className="glass-panel bento-item" style={{ gridColumn: 'span 1', padding: 0, position: 'relative', overflow: 'hidden', height: '320px', display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ position: 'absolute', top: 32, left: 32, zIndex: 10 }}>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4, letterSpacing: '-0.02em' }}>100% Mobile</h3>
              </div>
              <div style={{ width: '80%', height: '70%', background: '#0f172a', margin: '0 auto -20px', borderRadius: '24px 24px 0 0', border: '4px solid #334155', borderBottom: 'none', position: 'relative', overflow: 'hidden' }}>
                {/* Mock Mobile UI */}
                <div style={{ padding: 16, paddingTop: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.1)' }} />
                  </div>
                  <div style={{ width: '100%', height: 100, background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))', borderRadius: 12, marginBottom: 16 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ width: '50%', height: 60, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }} />
                    <div style={{ width: '50%', height: 60, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" style={{ padding: '100px 5%', background: 'linear-gradient(to bottom, transparent, rgba(15,23,42,0.5), transparent)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, marginBottom: 16 }}>Dicono di noi</h2>
            <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>I professionisti che hanno già rivoluzionato il loro metodo di lavoro.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
            {testimonials.map((t, i) => (
              <div key={i} className="glass-panel" style={{ padding: '32px', position: 'relative' }}>
                <i className="ph-fill ph-quotes" style={{ position: 'absolute', top: 32, right: 32, fontSize: '3rem', color: 'rgba(255,255,255,0.03)' }} />
                <p style={{ fontSize: '1.1rem', color: '#e2e8f0', lineHeight: 1.6, marginBottom: 32, position: 'relative', zIndex: 1 }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{t.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Epic CTA */}
      <section style={{ padding: '160px 5%', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100vw', height: '100%', background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%)', zIndex: 0 }} />

        <div className="glass-panel" style={{ maxWidth: '1000px', margin: '0 auto', padding: '80px 5%', textAlign: 'center', position: 'relative', zIndex: 10, background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ width: 80, height: 80, background: 'rgba(99,102,241,0.1)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: '#818cf8', margin: '0 auto 32px' }}>
            <i className="ph ph-rocket-launch" />
          </div>
          <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 900, marginBottom: 24, letterSpacing: '-0.02em' }}>
            Pronto a trasformare<br />il tuo studio?
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.2rem', marginBottom: 48, maxWidth: '500px', margin: '0 auto 48px' }}>
            Unisciti ai professionisti che hanno smesso di rispondere al telefono e hanno iniziato a lavorare meglio.
          </p>
          <button className="btn-primary" style={{ fontSize: '1.2rem', padding: '20px 48px' }} onClick={() => navigate('/login')}>
            Crea il tuo account gratuito
          </button>
          <div style={{ marginTop: 24, color: '#64748b', fontSize: '0.9rem' }}>Nessuna carta di credito richiesta. Setup in 2 minuti.</div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '40px 5%', background: '#030712' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 800, fontSize: '1.2rem' }}>
            <div style={{ background: '#6366f1', borderRadius: '8px', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1rem' }}>
              <i className="ph ph-calendar-check" />
            </div>
            <span>AptBooker</span>
          </div>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
            © 2026 AptBooker. Fatto con ❤️ per i professionisti della salute.
          </div>
        </div>
      </footer>
    </div>
  );
}
