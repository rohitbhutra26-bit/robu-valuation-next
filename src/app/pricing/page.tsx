'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, Zap, BarChart2, Brain, FileText, Search, TrendingUp, ShieldCheck, Star } from 'lucide-react';

const BILLING = [
  { id: '1m', label: '1 Month',  price: 99,  perMonth: 99,  save: null,  popular: false },
  { id: '3m', label: '3 Months', price: 259, perMonth: 86,  save: '13%', popular: false },
  { id: '6m', label: '6 Months', price: 499, perMonth: 83,  save: '17%', popular: true  },
  { id: '1y', label: '1 Year',   price: 999, perMonth: 83,  save: '17%', popular: false },
] as const;
type BillingId = typeof BILLING[number]['id'];

const FEATURES = [
  { icon: <TrendingUp size={15}/>,  label: 'Stock Analysis',      desc: 'Deep-dive valuation for any NSE/BSE stock', free: 'Unlimited',   pro: 'Unlimited'      },
  { icon: <BarChart2 size={15}/>,   label: 'Valuation Engine',    desc: 'DCF, P/E, PEG, Earnings Yield models',      free: 'All models',  pro: 'All models'     },
  { icon: <Search size={15}/>,      label: 'Stock Screener',      desc: 'Filter all NSE stocks by fundamentals',     free: 'Top 5 only',  pro: '60+ results'    },
  { icon: <Brain size={15}/>,       label: 'AI Analysis',         desc: 'Bull/Bear thesis via Gemini AI',            free: 'Rule-based',  pro: 'Full Gemini AI' },
  { icon: <FileText size={15}/>,    label: 'Export PDF',          desc: 'Download full analysis report',             free: false,         pro: true             },
  { icon: <BarChart2 size={15}/>,   label: 'Historical Chart',    desc: 'P/E & P/B going back 5+ years',             free: true,          pro: true             },
  { icon: <ShieldCheck size={15}/>, label: 'Peer Compare',        desc: 'AI-identified competitors side-by-side',    free: true,          pro: true             },
  { icon: <Star size={15}/>,        label: 'Watchlist & Portfolio',desc: 'Track stocks, import from brokers',        free: true,          pro: true             },
];

const FAQS = [
  { q: 'What payment methods are accepted?', a: 'UPI, Debit/Credit Card, Net Banking via Razorpay. All payments in ₹ INR.' },
  { q: 'Can I cancel anytime?', a: 'No auto-renewals. Pay once, access the full duration you chose.' },
  { q: 'Is this SEBI registered advice?', a: 'No. Robu Terminal is a research tool for personal use. All valuations are models — not buy/sell recommendations.' },
  { q: 'What data sources does Robu use?', a: 'NSE Bhavcopy for live prices, Yahoo Finance & Screener.in for fundamentals, Gemini AI for analysis.' },
  { q: 'Do I need an account for the free plan?', a: 'No signup needed. Open the app and start analysing any stock instantly.' },
];

// Hero SVG chart
function HeroChart() {
  return (
    <div className="relative w-full max-w-2xl mx-auto mt-10 mb-2" style={{ height: '220px', opacity: 0.7 }}>
      <svg viewBox="0 0 800 200" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00c9a7" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#00c9a7" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[40,80,120,160].map(y => <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="#2a3144" strokeWidth="1"/>)}
        <path d="M0,170 L40,158 L80,148 L120,153 L160,138 L200,122 L240,112 L280,118 L320,98 L360,82 L400,88 L440,72 L480,62 L520,68 L560,52 L600,42 L640,48 L680,32 L720,26 L760,18 L800,14 L800,200 L0,200Z" fill="url(#g1)"/>
        <path d="M0,170 L40,158 L80,148 L120,153 L160,138 L200,122 L240,112 L280,118 L320,98 L360,82 L400,88 L440,72 L480,62 L520,68 L560,52 L600,42 L640,48 L680,32 L720,26 L760,18 L800,14" fill="none" stroke="#00c9a7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="800" cy="14" r="5" fill="#00c9a7"/>
        <circle cx="800" cy="14" r="10" fill="#00c9a7" fillOpacity="0.2"/>
        {[0,40,80,120,160,200,240,280,320,360,400,440,480,520,560,600,640,680,720,760].map((x,i) => (
          <rect key={x} x={x+2} y={185+(i%3===0?0:4)} width="28" height={i%3===0?14:10} fill="#00c9a7" fillOpacity="0.12" rx="1"/>
        ))}
        <text x="12" y="38"  fill="#9498a3" fontSize="10" fontFamily="monospace">₹4,250</text>
        <text x="12" y="120" fill="#9498a3" fontSize="10" fontFamily="monospace">₹3,800</text>
        <text x="12" y="168" fill="#9498a3" fontSize="10" fontFamily="monospace">₹3,400</text>
      </svg>
      <div style={{ position:'absolute', top:'8px', right:'16px', display:'flex', flexDirection:'column', gap:'6px' }}>
        <div style={{ background:'#161b2a', border:'1px solid rgba(0,201,167,0.35)', borderRadius:'8px', padding:'6px 12px', fontSize:'12px', fontWeight:700, fontFamily:'monospace', color:'#00c9a7' }}>+34.2% ↑</div>
        <div style={{ background:'#161b2a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'6px 12px', fontSize:'12px', fontFamily:'monospace', color:'#e8eaed' }}>PE 22.4x</div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [selected, setSelected] = useState<BillingId>('6m');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const plan = BILLING.find(b => b.id === selected)!;

  const C = {
    bg:      'var(--color-terminal)',
    card:    'var(--color-card)',
    border:  'rgba(var(--color-border) / 0.6)',
    text:    'var(--color-primary)',
    muted:   'var(--color-muted)',
    green:   'var(--color-gain)',
    blue:    'var(--color-accent)',
  };

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: 'var(--font-sans)', minHeight: '100vh' }}>

      {/* ── Fixed nav ──────────────────────────────────────────────────── */}
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, borderBottom:'1px solid rgba(var(--color-border)/0.4)', backdropFilter:'blur(16px)', background:'rgba(var(--color-terminal)/0.92)' }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'0 24px', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:'10px', textDecoration:'none' }}>
            <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'rgba(77,142,255,0.15)', border:'1px solid rgba(77,142,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Zap size={14} color="#4d8eff"/>
            </div>
            <span style={{ fontWeight:800, fontSize:'14px', color: C.text }}>Robu Terminal</span>
          </Link>
          <Link href="/" style={{ fontSize:'13px', fontWeight:600, color: C.muted, textDecoration:'none' }}>← Back to app</Link>
        </div>
      </div>

      {/* ── Page content (padded for fixed nav) ────────────────────────── */}
      <div style={{ paddingTop:'56px' }}>

        {/* Hero */}
        <div style={{ textAlign:'center', padding:'64px 24px 16px', maxWidth:'800px', margin:'0 auto' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(77,142,255,0.12)', border:'1px solid rgba(77,142,255,0.25)', borderRadius:'999px', padding:'6px 16px', fontSize:'11px', fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'#4d8eff', marginBottom:'28px' }}>
            <Zap size={11}/> Simple pricing · No hidden fees
          </div>
          <h1 style={{ fontSize:'clamp(36px,6vw,60px)', fontWeight:900, lineHeight:1.05, letterSpacing:'-0.03em', marginBottom:'20px' }}>
            Free, until you&apos;re<br/>
            <span style={{ background:'linear-gradient(135deg,#00c9a7,#4d8eff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              ready to go Pro
            </span>
          </h1>
          <p style={{ fontSize:'16px', lineHeight:1.7, color: C.muted, maxWidth:'500px', margin:'0 auto' }}>
            Analyse any Indian stock for free. Unlock the full screener, Gemini AI, and PDF exports when you need more.
          </p>
          <HeroChart/>
        </div>

        {/* Billing toggle */}
        <div style={{ padding:'0 24px 24px', maxWidth:'500px', margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'4px', padding:'4px', background:'rgba(var(--color-border)/0.3)', border:'1px solid rgba(var(--color-border)/0.5)', borderRadius:'12px' }}>
            {BILLING.map(b => (
              <button key={b.id} onClick={() => setSelected(b.id)}
                style={{ position:'relative', padding:'10px 4px', borderRadius:'8px', fontSize:'11px', fontWeight:700, border:'none', cursor:'pointer', transition:'all 0.15s',
                  background: selected===b.id ? '#4d8eff' : 'transparent',
                  color: selected===b.id ? '#fff' : C.muted }}>
                {b.popular && selected!==b.id && (
                  <span style={{ position:'absolute', top:'-10px', left:'50%', transform:'translateX(-50%)', fontSize:'8px', fontWeight:900, background:'#00c9a7', color:'#0f121b', padding:'2px 6px', borderRadius:'99px', whiteSpace:'nowrap', textTransform:'uppercase', letterSpacing:'0.05em' }}>Best</span>
                )}
                <div>{b.label}</div>
                {b.save && <div style={{ fontSize:'9px', fontWeight:800, color: selected===b.id ? 'rgba(255,255,255,0.7)' : '#00c9a7', marginTop:'2px' }}>Save {b.save}</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ padding:'0 24px 80px', maxWidth:'800px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'20px' }}>

          {/* Free */}
          <div style={{ borderRadius:'20px', border:'1px solid rgba(var(--color-border)/0.5)', background: C.card, padding:'28px', display:'flex', flexDirection:'column' }}>
            <p style={{ fontSize:'11px', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color: C.muted, marginBottom:'12px' }}>Free</p>
            <div style={{ display:'flex', alignItems:'flex-end', gap:'6px', marginBottom:'8px' }}>
              <span style={{ fontSize:'48px', fontWeight:900, letterSpacing:'-0.04em', lineHeight:1, color: C.text }}>₹0</span>
              <span style={{ fontSize:'14px', color: C.muted, marginBottom:'8px' }}>forever</span>
            </div>
            <p style={{ fontSize:'13px', color: C.muted, marginBottom:'24px', lineHeight:1.6 }}>Start analysing stocks instantly. No signup needed.</p>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'10px', marginBottom:'24px' }}>
              {['Unlimited stock analysis','All valuation models','Historical P/E chart','Peer comparison','Watchlist & Portfolio'].map(f => (
                <div key={f} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={{ width:'16px', height:'16px', borderRadius:'50%', background:'rgba(0,201,167,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Check size={9} color="#00c9a7"/></div>
                  <span style={{ fontSize:'13px', fontWeight:500, color: C.text, opacity:0.85 }}>{f}</span>
                </div>
              ))}
              {['Screener — top 5 only','Rule-based AI only','No PDF export'].map(f => (
                <div key={f} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={{ width:'16px', height:'16px', borderRadius:'50%', background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><X size={9} color="rgba(255,255,255,0.25)"/></div>
                  <span style={{ fontSize:'13px', fontWeight:500, color: C.muted, opacity:0.6 }}>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/" style={{ display:'block', textAlign:'center', padding:'14px', borderRadius:'12px', border:'1px solid rgba(var(--color-border)/0.6)', fontSize:'13px', fontWeight:700, color: C.muted, textDecoration:'none', transition:'all 0.15s' }}>
              Start for free →
            </Link>
          </div>

          {/* Pro */}
          <div style={{ borderRadius:'20px', border:'1px solid rgba(77,142,255,0.4)', background:`linear-gradient(135deg, rgba(77,142,255,0.08), rgba(0,201,167,0.04))`, padding:'28px', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'180px', height:'180px', borderRadius:'50%', background:'rgba(77,142,255,0.1)', filter:'blur(40px)', pointerEvents:'none' }}/>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
              <p style={{ fontSize:'11px', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color:'#4d8eff', margin:0 }}>Pro</p>
              <span style={{ fontSize:'9px', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.06em', background:'rgba(77,142,255,0.15)', color:'#4d8eff', border:'1px solid rgba(77,142,255,0.3)', borderRadius:'99px', padding:'4px 10px' }}>Unlock All</span>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:'6px', marginBottom:'4px' }}>
              <span style={{ fontSize:'48px', fontWeight:900, letterSpacing:'-0.04em', lineHeight:1, color: C.text }}>₹{plan.price}</span>
              <span style={{ fontSize:'14px', color: C.muted, marginBottom:'8px' }}>/ {plan.label.toLowerCase()}</span>
            </div>
            {plan.perMonth < 99
              ? <p style={{ fontSize:'13px', fontWeight:700, color:'#00c9a7', marginBottom:'20px' }}>₹{plan.perMonth}/month · <span style={{ fontWeight:400, color: C.muted }}>save {plan.save} vs monthly</span></p>
              : <p style={{ fontSize:'13px', color: C.muted, marginBottom:'20px' }}>Billed once · No auto-renewal</p>
            }
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'10px', marginBottom:'24px' }}>
              {['Unlimited stock analysis','All valuation models','Historical P/E chart','AI-powered peer comparison','Watchlist & Portfolio','Full screener — 60+ stocks','Gemini AI analysis','PDF export reports'].map(f => (
                <div key={f} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={{ width:'16px', height:'16px', borderRadius:'50%', background:'rgba(77,142,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Check size={9} color="#4d8eff"/></div>
                  <span style={{ fontSize:'13px', fontWeight:500, color: C.text, opacity:0.9 }}>{f}</span>
                </div>
              ))}
            </div>
            <button style={{ width:'100%', padding:'16px', borderRadius:'12px', background:'linear-gradient(135deg,#4d8eff,#2962ff)', color:'#fff', fontSize:'14px', fontWeight:900, letterSpacing:'0.02em', border:'none', cursor:'pointer', boxShadow:'0 8px 28px rgba(77,142,255,0.4)', transition:'all 0.15s' }}>
              Get Pro — ₹{plan.price}
            </button>
            <p style={{ textAlign:'center', fontSize:'11px', color: C.muted, marginTop:'10px' }}>One-time · No auto-renewal</p>
          </div>
        </div>

        {/* Feature comparison */}
        <div style={{ padding:'0 24px 80px', maxWidth:'800px', margin:'0 auto' }}>
          <h2 style={{ fontSize:'32px', fontWeight:900, letterSpacing:'-0.03em', textAlign:'center', marginBottom:'8px' }}>Everything in the box</h2>
          <p style={{ textAlign:'center', color: C.muted, fontSize:'14px', marginBottom:'32px' }}>Free vs Pro</p>
          <div style={{ borderRadius:'16px', border:'1px solid rgba(var(--color-border)/0.5)', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 100px', padding:'12px 24px', background:'rgba(var(--color-border)/0.2)', borderBottom:'1px solid rgba(var(--color-border)/0.4)' }}>
              <span style={{ fontSize:'10px', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color: C.muted }}>Feature</span>
              <span style={{ fontSize:'10px', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color: C.muted, textAlign:'center' }}>Free</span>
              <span style={{ fontSize:'10px', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color:'#4d8eff', textAlign:'center' }}>Pro</span>
            </div>
            {FEATURES.map((f, i) => (
              <div key={f.label} style={{ display:'grid', gridTemplateColumns:'1fr 100px 100px', padding:'16px 24px', borderBottom:'1px solid rgba(var(--color-border)/0.3)', background: i%2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:'12px' }}>
                  <span style={{ color: C.muted, marginTop:'2px', flexShrink:0 }}>{f.icon}</span>
                  <div>
                    <p style={{ fontSize:'13px', fontWeight:700, color: C.text, margin:0 }}>{f.label}</p>
                    <p style={{ fontSize:'11px', color: C.muted, margin:'2px 0 0', lineHeight:1.4 }}>{f.desc}</p>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', color: C.text }}>
                  {f.free===true ? <Check size={16} color="#00c9a7"/> : f.free===false ? <X size={16} color="rgba(255,255,255,0.2)"/> : <span style={{ fontSize:'12px', fontWeight:600 }}>{f.free}</span>}
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', color: C.text }}>
                  {f.pro===true ? <Check size={16} color="#4d8eff"/> : f.pro===false ? <X size={16} color="rgba(255,255,255,0.2)"/> : <span style={{ fontSize:'12px', fontWeight:600 }}>{f.pro}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ borderTop:'1px solid rgba(var(--color-border)/0.4)', borderBottom:'1px solid rgba(var(--color-border)/0.4)', padding:'56px 24px', marginBottom:'60px' }}>
          <div style={{ maxWidth:'700px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'24px', textAlign:'center' }}>
            {[['5,000+','Stocks tracked'],['NSE + BSE','Exchange coverage'],['10+ models','Valuation methods']].map(([n,l]) => (
              <div key={l}>
                <p style={{ fontSize:'clamp(24px,4vw,40px)', fontWeight:900, letterSpacing:'-0.03em', background:'linear-gradient(135deg,#00c9a7,#4d8eff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', margin:0 }}>{n}</p>
                <p style={{ fontSize:'13px', color: C.muted, marginTop:'6px' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ padding:'0 24px 80px', maxWidth:'680px', margin:'0 auto' }}>
          <h2 style={{ fontSize:'32px', fontWeight:900, letterSpacing:'-0.03em', textAlign:'center', marginBottom:'32px' }}>FAQ</h2>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ borderRadius:'12px', border:'1px solid rgba(var(--color-border)/0.4)', marginBottom:'8px', overflow:'hidden' }}>
              <button onClick={() => setOpenFaq(openFaq===i ? null : i)}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px', padding:'16px 20px', textAlign:'left', background:'transparent', border:'none', cursor:'pointer', color: C.text }}>
                <span style={{ fontSize:'14px', fontWeight:700 }}>{faq.q}</span>
                <span style={{ fontSize:'20px', fontWeight:300, flexShrink:0, transform: openFaq===i ? 'rotate(45deg)' : 'none', transition:'transform 0.2s', color: C.muted }}>+</span>
              </button>
              {openFaq===i && (
                <div style={{ padding:'0 20px 16px', borderTop:'1px solid rgba(var(--color-border)/0.3)' }}>
                  <p style={{ fontSize:'13px', lineHeight:1.7, color: C.muted, paddingTop:'12px', margin:0 }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign:'center', padding:'0 24px 80px' }}>
          <h2 style={{ fontSize:'32px', fontWeight:900, letterSpacing:'-0.03em', marginBottom:'12px' }}>Start analysing smarter</h2>
          <p style={{ fontSize:'14px', color: C.muted, marginBottom:'28px' }}>Free forever. Go Pro when you need the full picture.</p>
          <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/" style={{ padding:'14px 32px', borderRadius:'12px', background:'linear-gradient(135deg,#4d8eff,#2962ff)', color:'#fff', fontSize:'14px', fontWeight:900, textDecoration:'none', boxShadow:'0 8px 24px rgba(77,142,255,0.35)' }}>
              Try for free →
            </Link>
            <button onClick={() => window.scrollTo({ top: 500, behavior:'smooth' })}
              style={{ padding:'14px 32px', borderRadius:'12px', border:'1px solid rgba(var(--color-border)/0.5)', background:'transparent', color: C.muted, fontSize:'14px', fontWeight:700, cursor:'pointer' }}>
              See plans
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop:'1px solid rgba(var(--color-border)/0.4)', padding:'24px', display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'12px', maxWidth:'1100px', margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'24px', height:'24px', borderRadius:'6px', background:'rgba(77,142,255,0.15)', border:'1px solid rgba(77,142,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Zap size={11} color="#4d8eff"/>
            </div>
            <span style={{ fontSize:'13px', fontWeight:900, color: C.text }}>Robu Terminal</span>
          </div>
          <p style={{ fontSize:'11px', color: C.muted, textAlign:'center', margin:0 }}>Not SEBI registered · Personal research only · Data from NSE, Yahoo Finance</p>
          <p style={{ fontSize:'11px', color: C.muted, margin:0 }}>© 2025 Robu Terminal</p>
        </div>

      </div>{/* end paddingTop wrapper */}
    </div>
  );
}
