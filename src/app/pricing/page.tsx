'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, Zap, BarChart2, Brain, FileText, Search, TrendingUp, ShieldCheck, Star } from 'lucide-react';

const BILLING = [
  { id: '1m', label: '1 Month',  price: 99,  perMonth: 99, save: null,  popular: false },
  { id: '3m', label: '3 Months', price: 259, perMonth: 86, save: '13%', popular: false },
  { id: '6m', label: '6 Months', price: 499, perMonth: 83, save: '17%', popular: true  },
  { id: '1y', label: '1 Year',   price: 999, perMonth: 83, save: '17%', popular: false },
] as const;
type BillingId = typeof BILLING[number]['id'];

const FEATURES = [
  { label: 'Stock Analysis',       desc: 'Deep-dive valuation for any NSE/BSE stock', free: 'Unlimited',  pro: 'Unlimited'     },
  { label: 'Valuation Engine',     desc: 'DCF, P/E, PEG, Earnings Yield models',      free: 'All models', pro: 'All models'    },
  { label: 'Stock Screener',       desc: 'Filter all NSE stocks by fundamentals',     free: 'Top 5 only', pro: '60+ results'   },
  { label: 'AI Analysis',          desc: 'Bull/Bear thesis via Gemini AI',            free: 'Rule-based', pro: 'Full Gemini AI'},
  { label: 'Export PDF',           desc: 'Download full analysis report',             free: false,        pro: true            },
  { label: 'Historical Chart',     desc: 'P/E & P/B going back 5+ years',             free: true,         pro: true            },
  { label: 'Peer Compare',         desc: 'AI-identified competitors side-by-side',    free: true,         pro: true            },
  { label: 'Watchlist & Portfolio',desc: 'Track stocks, import from brokers',         free: true,         pro: true            },
];

const FAQS = [
  { q: 'What payment methods are accepted?',  a: 'UPI, Debit/Credit Card, Net Banking via Razorpay. All payments in ₹ INR.' },
  { q: 'Can I cancel anytime?',               a: 'No auto-renewals. Pay once, access the full duration you chose.' },
  { q: 'Is this SEBI registered advice?',     a: 'No. Robu is a personal research tool. All valuations are models — not buy/sell recommendations.' },
  { q: 'What data sources does Robu use?',    a: 'NSE Bhavcopy for live prices, Yahoo Finance for fundamentals, Gemini AI for analysis.' },
  { q: 'Do I need an account for free plan?', a: 'No signup needed. Open the app and start analysing any stock instantly.' },
];

export default function PricingPage() {
  const [selected, setSelected] = useState<BillingId>('6m');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const plan = BILLING.find(b => b.id === selected)!;

  // ── THE FIX: self-contained scroll container ──────────────────────────────
  // position:fixed + overflow-y:scroll creates its OWN scroll context,
  // completely independent of body/html CSS. Nothing can break this.
  const scrollContainer: React.CSSProperties = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    overflowY: 'scroll',
    overflowX: 'hidden',
    background: '#0f121b',
    color: '#e8eaed',
    fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
    WebkitOverflowScrolling: 'touch',
  };

  const green  = '#00c9a7';
  const blue   = '#4d8eff';
  const muted  = 'rgba(232,234,237,0.5)';
  const card   = '#161b2a';
  const border = 'rgba(255,255,255,0.08)';

  return (
    <div style={scrollContainer}>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 600px) {
          .p-cards { grid-template-columns: 1fr !important; }
          .p-hero h1 { font-size: 32px !important; }
          .p-billing { max-width: 100% !important; }
          .p-table-wrap { overflow-x: auto; }
          .p-table-inner { min-width: 460px; }
          .p-stats { grid-template-columns: repeat(3,1fr) !important; gap: 12px !important; }
          .p-cta-btns { flex-direction: column !important; }
          .p-footer-inner { flex-direction: column !important; text-align: center; gap: 8px !important; }
        }
      `}</style>

      {/* Nav */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(15,18,27,0.92)', backdropFilter:'blur(16px)', borderBottom:`1px solid ${border}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 16px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
            <div style={{ width:28, height:28, borderRadius:8, background:'rgba(77,142,255,0.15)', border:'1px solid rgba(77,142,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Zap size={14} color={blue}/>
            </div>
            <span style={{ fontWeight:800, fontSize:14, color:'#e8eaed' }}>Robu</span>
          </Link>
          <Link href="/" style={{ fontSize:13, fontWeight:600, color:muted, textDecoration:'none' }}>← Back to app</Link>
        </div>
      </div>

      {/* Hero */}
      <div className="p-hero" style={{ textAlign:'center', padding:'72px 16px 24px', maxWidth:780, margin:'0 auto' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(77,142,255,0.12)', border:'1px solid rgba(77,142,255,0.25)', borderRadius:999, padding:'6px 16px', fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:blue, marginBottom:28 }}>
          <Zap size={11}/> Simple pricing · No hidden fees
        </div>
        <h1 style={{ fontSize:'clamp(38px,6vw,64px)', fontWeight:900, lineHeight:1.04, letterSpacing:'-0.03em', marginBottom:20 }}>
          Free, until you&apos;re<br/>
          <span style={{ background:`linear-gradient(135deg,${green},${blue})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            ready to go Pro
          </span>
        </h1>
        <p style={{ fontSize:16, lineHeight:1.7, color:muted, maxWidth:480, margin:'0 auto 32px' }}>
          Analyse any Indian stock for free. Unlock the full screener, Gemini AI, and PDF exports when you need more.
        </p>
        {/* Mini chart */}
        <div style={{ position:'relative', width:'100%', maxWidth:680, margin:'0 auto', height:180, opacity:0.65 }}>
          <svg viewBox="0 0 680 160" style={{ width:'100%', height:'100%' }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={green} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={green} stopOpacity="0"/>
              </linearGradient>
            </defs>
            {[30,60,90,120].map(y=><line key={y} x1="0" y1={y} x2="680" y2={y} stroke="#2a3144" strokeWidth="1"/>)}
            <path d="M0,145 L34,136 L68,126 L102,131 L136,118 L170,104 L204,95 L238,100 L272,83 L306,70 L340,75 L374,61 L408,52 L442,57 L476,43 L510,35 L544,40 L578,27 L612,21 L646,15 L680,11 L680,160 L0,160Z" fill="url(#cg)"/>
            <path d="M0,145 L34,136 L68,126 L102,131 L136,118 L170,104 L204,95 L238,100 L272,83 L306,70 L340,75 L374,61 L408,52 L442,57 L476,43 L510,35 L544,40 L578,27 L612,21 L646,15 L680,11" fill="none" stroke={green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="680" cy="11" r="5" fill={green}/>
            <circle cx="680" cy="11" r="10" fill={green} fillOpacity="0.2"/>
          </svg>
          <div style={{ position:'absolute', top:8, right:8, display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ background:card, border:`1px solid rgba(0,201,167,0.3)`, borderRadius:8, padding:'5px 12px', fontSize:12, fontWeight:700, fontFamily:'monospace', color:green }}>+34.2% ↑</div>
            <div style={{ background:card, border:`1px solid ${border}`, borderRadius:8, padding:'5px 12px', fontSize:12, fontFamily:'monospace', color:'#e8eaed' }}>PE 22.4x</div>
          </div>
        </div>
      </div>

      {/* Billing toggle */}
      <div style={{ padding:'0 24px 28px', maxWidth:480, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4, padding:4, background:'rgba(255,255,255,0.04)', border:`1px solid ${border}`, borderRadius:12 }}>
          {BILLING.map(b=>(
            <button key={b.id} onClick={()=>setSelected(b.id)}
              style={{ position:'relative', padding:'10px 4px', borderRadius:8, fontSize:11, fontWeight:700, border:'none', cursor:'pointer', transition:'all 0.15s',
                background: selected===b.id ? blue : 'transparent', color: selected===b.id ? '#fff' : muted }}>
              {b.popular && selected!==b.id && (
                <span style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', fontSize:8, fontWeight:900, background:green, color:'#0f121b', padding:'2px 6px', borderRadius:99, whiteSpace:'nowrap', textTransform:'uppercase' }}>Best</span>
              )}
              <div>{b.label}</div>
              {b.save && <div style={{ fontSize:9, fontWeight:800, color: selected===b.id ? 'rgba(255,255,255,0.7)' : green, marginTop:2 }}>Save {b.save}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="p-cards" style={{ padding:'0 16px 80px', maxWidth:800, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20 }}>
        {/* Free */}
        <div style={{ borderRadius:20, border:`1px solid ${border}`, background:card, padding:28, display:'flex', flexDirection:'column' }}>
          <p style={{ fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color:muted, margin:'0 0 12px' }}>Free</p>
          <div style={{ display:'flex', alignItems:'flex-end', gap:6, marginBottom:8 }}>
            <span style={{ fontSize:48, fontWeight:900, letterSpacing:'-0.04em', lineHeight:1, color:'#e8eaed' }}>₹0</span>
            <span style={{ fontSize:14, color:muted, marginBottom:8 }}>forever</span>
          </div>
          <p style={{ fontSize:13, color:muted, marginBottom:24, lineHeight:1.6 }}>Start analysing stocks instantly. No signup needed.</p>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
            {['Basic stock analysis (5 stocks/day)','Limited valuation tools','Historical P/E chart','Peer comparison (basic)','Watchlist (up to 10 stocks)'].map(f=>(
              <div key={f} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:16, height:16, borderRadius:'50%', background:'rgba(0,201,167,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Check size={9} color={green}/></div>
                <span style={{ fontSize:13, color:'#e8eaed', opacity:0.85 }}>{f}</span>
              </div>
            ))}
            {['Screener — top 5 results only','Rule-based AI (no Gemini)','No PDF export'].map(f=>(
              <div key={f} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:16, height:16, borderRadius:'50%', background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><X size={9} color="rgba(255,255,255,0.2)"/></div>
                <span style={{ fontSize:13, color:muted, opacity:0.6 }}>{f}</span>
              </div>
            ))}
          </div>
          <Link href="/" style={{ display:'block', textAlign:'center', padding:14, borderRadius:12, border:`1px solid ${border}`, fontSize:13, fontWeight:700, color:muted, textDecoration:'none' }}>Start for free →</Link>
        </div>

        {/* Pro */}
        <div style={{ borderRadius:20, border:'1px solid rgba(77,142,255,0.4)', background:'linear-gradient(135deg,rgba(77,142,255,0.08),rgba(0,201,167,0.04))', padding:28, display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-40, right:-40, width:180, height:180, borderRadius:'50%', background:'rgba(77,142,255,0.1)', filter:'blur(40px)', pointerEvents:'none' }}/>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <p style={{ fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color:blue, margin:0 }}>Pro</p>
            <span style={{ fontSize:9, fontWeight:900, textTransform:'uppercase', background:'rgba(77,142,255,0.15)', color:blue, border:'1px solid rgba(77,142,255,0.3)', borderRadius:99, padding:'4px 10px', letterSpacing:'0.06em' }}>Unlock All</span>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:6, marginBottom:4 }}>
            <span style={{ fontSize:48, fontWeight:900, letterSpacing:'-0.04em', lineHeight:1, color:'#e8eaed' }}>₹{plan.price}</span>
            <span style={{ fontSize:14, color:muted, marginBottom:8 }}>/ {plan.label.toLowerCase()}</span>
          </div>
          {plan.perMonth < 99
            ? <p style={{ fontSize:13, fontWeight:700, color:green, marginBottom:20 }}>₹{plan.perMonth}/month · <span style={{ fontWeight:400, color:muted }}>save {plan.save}</span></p>
            : <p style={{ fontSize:13, color:muted, marginBottom:20 }}>Billed once · No auto-renewal</p>
          }
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
            {['Unlimited stock analysis','All valuation models','Historical P/E chart','AI-powered peer comparison','Watchlist & Portfolio','Full screener — 60+ stocks','Gemini AI analysis','PDF export reports'].map(f=>(
              <div key={f} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:16, height:16, borderRadius:'50%', background:'rgba(77,142,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Check size={9} color={blue}/></div>
                <span style={{ fontSize:13, color:'#e8eaed', opacity:0.9 }}>{f}</span>
              </div>
            ))}
          </div>
          <button style={{ width:'100%', padding:16, borderRadius:12, background:`linear-gradient(135deg,${blue},#2962ff)`, color:'#fff', fontSize:14, fontWeight:900, border:'none', cursor:'pointer', boxShadow:'0 8px 28px rgba(77,142,255,0.4)' }}>
            Get Pro — ₹{plan.price}
          </button>
          <p style={{ textAlign:'center', fontSize:11, color:muted, marginTop:10 }}>One-time · No auto-renewal</p>
        </div>
      </div>

      {/* Feature table */}
      <div style={{ padding:'0 24px 80px', maxWidth:800, margin:'0 auto' }}>
        <h2 style={{ fontSize:32, fontWeight:900, letterSpacing:'-0.03em', textAlign:'center', marginBottom:8 }}>Everything in the box</h2>
        <p style={{ textAlign:'center', color:muted, fontSize:14, marginBottom:32 }}>Free vs Pro — side by side</p>
        <div style={{ borderRadius:16, border:`1px solid ${border}`, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 100px', padding:'12px 24px', background:'rgba(255,255,255,0.03)', borderBottom:`1px solid ${border}` }}>
            <span style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color:muted }}>Feature</span>
            <span style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color:muted, textAlign:'center' }}>Free</span>
            <span style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color:blue, textAlign:'center' }}>Pro</span>
          </div>
          {FEATURES.map((f,i)=>(
            <div key={f.label} style={{ display:'grid', gridTemplateColumns:'1fr 100px 100px', padding:'14px 24px', borderBottom:`1px solid ${border}`, background: i%2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'#e8eaed', margin:0 }}>{f.label}</p>
                <p style={{ fontSize:11, color:muted, margin:'2px 0 0' }}>{f.desc}</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                {f.free===true ? <Check size={16} color={green}/> : f.free===false ? <X size={16} color="rgba(255,255,255,0.2)"/> : <span style={{ fontSize:12, fontWeight:600, color:'#e8eaed' }}>{f.free}</span>}
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                {f.pro===true ? <Check size={16} color={blue}/> : f.pro===false ? <X size={16} color="rgba(255,255,255,0.2)"/> : <span style={{ fontSize:12, fontWeight:600, color:'#e8eaed' }}>{f.pro}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ borderTop:`1px solid ${border}`, borderBottom:`1px solid ${border}`, padding:'56px 24px', marginBottom:60 }}>
        <div style={{ maxWidth:700, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24, textAlign:'center' }}>
          {[['5,000+','Stocks tracked'],['NSE + BSE','Exchange coverage'],['10+ models','Valuation methods']].map(([n,l])=>(
            <div key={l as string}>
              <p style={{ fontSize:'clamp(24px,4vw,40px)', fontWeight:900, letterSpacing:'-0.03em', background:`linear-gradient(135deg,${green},${blue})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', margin:0 }}>{n}</p>
              <p style={{ fontSize:13, color:muted, marginTop:6 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ padding:'0 24px 80px', maxWidth:680, margin:'0 auto' }}>
        <h2 style={{ fontSize:32, fontWeight:900, letterSpacing:'-0.03em', textAlign:'center', marginBottom:32 }}>Frequently asked questions</h2>
        {FAQS.map((faq,i)=>(
          <div key={i} style={{ borderRadius:12, border:`1px solid ${border}`, marginBottom:8, overflow:'hidden' }}>
            <button onClick={()=>setOpenFaq(openFaq===i ? null : i)}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, padding:'16px 20px', textAlign:'left', background:'transparent', border:'none', cursor:'pointer', color:'#e8eaed' }}>
              <span style={{ fontSize:14, fontWeight:700 }}>{faq.q}</span>
              <span style={{ fontSize:20, fontWeight:300, flexShrink:0, transition:'transform 0.2s', transform: openFaq===i ? 'rotate(45deg)' : 'none', color:muted }}>+</span>
            </button>
            {openFaq===i && (
              <div style={{ padding:'0 20px 16px', borderTop:`1px solid ${border}` }}>
                <p style={{ fontSize:13, lineHeight:1.7, color:muted, paddingTop:12, margin:0 }}>{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ textAlign:'center', padding:'0 24px 80px' }}>
        <h2 style={{ fontSize:32, fontWeight:900, letterSpacing:'-0.03em', marginBottom:12 }}>Start analysing smarter</h2>
        <p style={{ fontSize:14, color:muted, marginBottom:28 }}>Free forever. Go Pro when you need the full picture.</p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <Link href="/" style={{ padding:'14px 32px', borderRadius:12, background:`linear-gradient(135deg,${blue},#2962ff)`, color:'#fff', fontSize:14, fontWeight:900, textDecoration:'none', boxShadow:'0 8px 24px rgba(77,142,255,0.35)' }}>
            Try for free →
          </Link>
          <button onClick={()=>{ const el = document.querySelector('[data-billing]'); el?.scrollIntoView({behavior:'smooth'}); }}
            style={{ padding:'14px 32px', borderRadius:12, border:`1px solid ${border}`, background:'transparent', color:muted, fontSize:14, fontWeight:700, cursor:'pointer' }}>
            See plans
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop:`1px solid ${border}`, padding:'24px', display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12, maxWidth:1100, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:24, height:24, borderRadius:6, background:'rgba(77,142,255,0.15)', border:'1px solid rgba(77,142,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Zap size={11} color={blue}/>
          </div>
          <span style={{ fontSize:13, fontWeight:900, color:'#e8eaed' }}>Robu</span>
        </div>
        <p style={{ fontSize:11, color:muted, textAlign:'center', margin:0 }}>Not SEBI registered · Personal research only · Data from NSE, Yahoo Finance</p>
        <p style={{ fontSize:11, color:muted, margin:0 }}>© 2025 Robu</p>
      </div>

    </div>
  );
}
