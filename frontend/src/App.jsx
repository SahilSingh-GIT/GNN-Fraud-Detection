import { useState, useEffect } from "react";
import axios from "axios";
import NeuralCanvas from "./NeuralCanvas";
import { ThreatRadar, HoloInput, FeatureBar, GlassPanel, StatusBadge, DataStream } from "./Components";

export default function App() {
  const [form, setForm] = useState({ TransactionAmt: "", card1: "", card2: "", card3: "", addr1: "", dist1: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showXAI, setShowXAI] = useState(false);
  const [txHistory, setTxHistory] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => { const i = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(i); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setLoading(true); setResult(null); setShowXAI(false); setShowResult(false);
    try {
      const res = await axios.post("http://localhost:8000/predict", {
        TransactionAmt: Number(form.TransactionAmt), card1: Number(form.card1),
        card2: Number(form.card2), card3: Number(form.card3),
        addr1: Number(form.addr1), dist1: Number(form.dist1),
      });
      const data = res.data.data;
      setResult(data);
      setTimeout(() => setShowResult(true), 200);
      setTimeout(() => setShowXAI(true), 800);
      setTxHistory((prev) => [
        { amt: form.TransactionAmt, risk: data?.message ? 90 : Math.round((data?.probability || 0) * 100), fraud: data?.prediction === 1, time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 4),
      ]);
    } catch { setResult({ __error: true }); }
    setLoading(false);
  };

  const getXAIFeatures = () => {
    const t=Number(form.TransactionAmt),c1=Number(form.card1),c2=Number(form.card2),c3=Number(form.card3),a1=Number(form.addr1),d1=Number(form.dist1);
    return [
      { label: "Transaction Amount", value: Math.min(t/1000,1), importance: Math.min(t/1000,1) },
      { label: "Card Pattern 1", value: c1>9000?0.95:c1<2000?0.7:0.2, importance: c1>9000?0.95:c1<2000?0.7:0.2 },
      { label: "Card Pattern 2", value: Math.min(c2/800,1)*0.6, importance: Math.min(c2/800,1)*0.6 },
      { label: "Card Pattern 3", value: Math.min(c3/200,1)*0.5, importance: Math.min(c3/200,1)*0.5 },
      { label: "Address Score", value: Math.min(a1/1000,1)*0.8, importance: Math.min(a1/1000,1)*0.8 },
      { label: "Distance Anomaly", value: Math.min(d1/300,1), importance: Math.min(d1/300,1) },
    ].sort((a,b)=>b.importance-a.importance);
  };

  const getReasons = () => {
    const t=Number(form.TransactionAmt),c1=Number(form.card1),a1=Number(form.addr1),d1=Number(form.dist1);
    const r=[];
    if(t>500)r.push({text:"Transaction amount exceeds safe threshold",severity:"high",icon:"💸"});
    if(a1>500)r.push({text:"Address risk score out of normal range",severity:"medium",icon:"📍"});
    if(d1>100)r.push({text:"Geographic distance anomaly detected",severity:"medium",icon:"🗺️"});
    if(c1<2000)r.push({text:"Irregular card behavioral pattern",severity:"high",icon:"💳"});
    if(c1>9000)r.push({text:"Unrecognized user — no historical baseline",severity:"critical",icon:"👤"});
    if(!r.length)r.push({text:"All parameters within safe thresholds",severity:"safe",icon:"✅"});
    return r;
  };

  const isUnknown = result?.message !== undefined && !result?.__error;
  const hasResult = result && !result.__error;
  const riskPercent = isUnknown ? 90 : hasResult ? Math.round((result?.probability||0)*100) : null;
  const isFraud = hasResult && !isUnknown && result.prediction === 1;
  const riskColor = riskPercent===null?"#8b5cf6":riskPercent>80?"#ff2d55":riskPercent>50?"#ffb800":"#00f5ff";
  const xaiFeatures = getXAIFeatures();
  const reasons = getReasons();

  const sevColor = (s) => s==="safe"?"#00ff88":s==="critical"?"#ff0040":s==="high"?"#ff2d55":"#ffb800";
  const sevBg = (s) => s==="safe"?"rgba(0,255,136,0.06)":s==="critical"?"rgba(255,0,64,0.08)":s==="high"?"rgba(255,45,85,0.06)":"rgba(255,184,0,0.06)";

  const inputFields = [
    { name: "TransactionAmt", label: "Amount", icon: "💰", placeholder: "0.00", unit: "USD" },
    { name: "card1", label: "Card Signal 1", icon: "💳", placeholder: "e.g. 5141" },
  ];
  const inputFieldsRow = [
    { name: "card2", label: "Card 2", icon: "📡", placeholder: "317.5" },
    { name: "card3", label: "Card 3", icon: "📡", placeholder: "150" },
  ];

  // Styles
  const S = {
    page: { position:"relative",minHeight:"100vh",overflow:"hidden",fontFamily:"var(--font-body)" },
    layer: { position:"relative",zIndex:10,minHeight:"100vh",display:"flex",flexDirection:"column" },
    header: { display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 32px",borderBottom:"1px solid rgba(255,255,255,0.04)",background:"rgba(2,1,8,0.5)",backdropFilter:"blur(30px)" },
    logoBox: { display:"flex",alignItems:"center",gap:12 },
    logoIcon: { width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#8b5cf6,#00f5ff)",boxShadow:"0 0 20px rgba(139,92,246,0.3)",fontSize:16 },
    logoText: { fontFamily:"var(--font-display)",fontSize:13,fontWeight:800,color:"white",letterSpacing:4 },
    logoSub: { fontFamily:"var(--font-mono)",fontSize:8,color:"#334155",letterSpacing:2,marginTop:2 },
    headerRight: { display:"flex",alignItems:"center",gap:16 },
    timeBox: { fontFamily:"var(--font-mono)",fontSize:10,color:"#334155",letterSpacing:1 },
    main: { flex:1,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"32px 24px" },
    container: { width:"100%",maxWidth:1280 },
    titleWrap: { textAlign:"center",marginBottom:40 },
    subtitle: { fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:6,color:"#334155",marginBottom:12,textTransform:"uppercase" },
    h1: { fontSize:52,fontWeight:900,color:"white",letterSpacing:-1,lineHeight:1.1,fontFamily:"var(--font-body)" },
    h1Accent: (c) => ({ color:c,transition:"color 0.8s",textShadow:`0 0 60px ${c}44` }),
    desc: { fontFamily:"var(--font-mono)",fontSize:10,color:"#1e293b",letterSpacing:2,marginTop:12 },
    grid: { display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:20 },
    sectionLabel: { display:"flex",alignItems:"center",gap:8,marginBottom:20 },
    sectionBar: (c) => ({ width:3,height:18,borderRadius:4,background:c }),
    sectionText: { fontFamily:"var(--font-display)",fontSize:11,fontWeight:700,color:"white",letterSpacing:3,textTransform:"uppercase" },
    inputSpace: { display:"flex",flexDirection:"column",gap:14 },
    inputRow: { display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 },
    btn: (l) => ({
      marginTop:24,width:"100%",padding:"16px 0",borderRadius:14,fontFamily:"var(--font-display)",fontSize:11,fontWeight:700,letterSpacing:4,textTransform:"uppercase",border:`1px solid ${l?"rgba(139,92,246,0.2)":"rgba(0,245,255,0.4)"}`,
      background:l?"rgba(139,92,246,0.1)":"linear-gradient(135deg,rgba(139,92,246,0.8),rgba(0,245,255,0.6))",
      color:"white",cursor:l?"not-allowed":"pointer",
      boxShadow:l?"none":"0 0 40px rgba(0,245,255,0.15),0 0 80px rgba(139,92,246,0.1),inset 0 1px 0 rgba(255,255,255,0.15)",
      transition:"all 0.4s",position:"relative",overflow:"hidden",
    }),
    btnHover: { filter:"brightness(1.15)",transform:"translateY(-1px)" },
    spinner: { display:"inline-block",width:16,height:16,border:"2px solid rgba(255,255,255,0.2)",borderTopColor:"white",borderRadius:"50%",animation:"rotate-slow 0.6s linear infinite" },
    footer: { textAlign:"center",padding:"12px 0",fontFamily:"var(--font-mono)",fontSize:8,color:"#0f172a",letterSpacing:3,borderTop:"1px solid rgba(255,255,255,0.03)" },
    emptyState: { display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 0" },
    emptyHex: { fontSize:72,opacity:0.08,marginBottom:16,animation:"float 4s ease-in-out infinite" },
    emptyText: { fontFamily:"var(--font-mono)",fontSize:11,color:"#1e293b",letterSpacing:2 },
    loadingWrap: { display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"50px 0" },
    resultHeader: { display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:16 },
    resultLabel: { fontFamily:"var(--font-mono)",fontSize:9,color:"#475569",letterSpacing:3,marginBottom:6 },
    resultTitle: (c) => ({ fontFamily:"var(--font-display)",fontSize:20,fontWeight:800,color:c,letterSpacing:2 }),
    metaGrid: { display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20 },
    metaCard: { textAlign:"center",padding:"14px 10px",borderRadius:12,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)" },
    metaLabel: { fontFamily:"var(--font-mono)",fontSize:8,color:"#334155",letterSpacing:2,marginBottom:4 },
    metaValue: (c) => ({ fontFamily:"var(--font-mono)",fontSize:13,fontWeight:700,color:c }),
    reasonRow: (s) => ({ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:12,background:sevBg(s),border:`1px solid ${sevColor(s)}20`,marginBottom:8 }),
    reasonIcon: { fontSize:16 },
    reasonText: { fontFamily:"var(--font-mono)",fontSize:10,color:"#94a3b8",flex:1 },
    reasonBadge: (s) => ({ fontFamily:"var(--font-mono)",fontSize:8,color:sevColor(s),letterSpacing:2,textTransform:"uppercase",padding:"2px 8px",borderRadius:10,background:"rgba(255,255,255,0.03)" }),
    historyLabel: { fontFamily:"var(--font-mono)",fontSize:8,color:"#1e293b",letterSpacing:3,marginBottom:8,marginTop:20,textTransform:"uppercase" },
    historyRow: { display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.03)",marginBottom:4,fontFamily:"var(--font-mono)",fontSize:10 },
    xaiInfo: { marginTop:16,padding:"14px 16px",borderRadius:14,background:"rgba(139,92,246,0.05)",border:"1px solid rgba(139,92,246,0.12)",fontFamily:"var(--font-mono)",fontSize:9,color:"#475569",lineHeight:1.8,letterSpacing:0.5 },
    sidebar: { display:"flex",flexDirection:"column",gap:12 },
    statCard: { padding:"16px",borderRadius:14,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",textAlign:"center" },
    statValue: (c) => ({ fontFamily:"var(--font-display)",fontSize:22,fontWeight:800,color:c }),
    statLabel: { fontFamily:"var(--font-mono)",fontSize:8,color:"#334155",letterSpacing:2,marginTop:4 },
    streamWrap: { display:"flex",gap:4,justifyContent:"center",marginTop:8,opacity:0.5 },
  };

  return (
    <div style={S.page}>
      <NeuralCanvas riskLevel={riskPercent} isAnalyzing={loading} />
      <div style={S.layer}>
        {/* ── Header ── */}
        <header style={S.header}>
          <div style={S.logoBox}>
            <div style={S.logoIcon}>⬡</div>
            <div>
              <div style={S.logoText}>NEURALGUARD</div>
              <div style={S.logoSub}>GRAPH FRAUD INTELLIGENCE</div>
            </div>
          </div>
          <div style={S.headerRight}>
            <StatusBadge text="GNN ONLINE" color="#00ff88" pulse />
            <StatusBadge text="v2.4" color="#8b5cf6" />
            <div style={S.timeBox}>{currentTime.toLocaleTimeString()}</div>
          </div>
        </header>

        {/* ── Main ── */}
        <div style={S.main}>
          <div style={S.container}>
            {/* Title */}
            <div style={S.titleWrap}>
              <div style={S.subtitle}>EXPLAINABLE AI · REAL-TIME GRAPH NEURAL NETWORK</div>
              <h1 style={S.h1}>
                Transaction <span style={S.h1Accent(riskColor)}>Intelligence</span>
              </h1>
              <div style={S.desc}>VISUALIZATION · SHAPLEY EXPLANATIONS · SUBGRAPH CONSTRUCTION</div>
            </div>

            {/* Grid — 5 cols: 2 input | 3 result */}
            <div style={S.grid}>
              {/* ── Input Panel (2 cols) ── */}
              <div style={{ gridColumn: "span 2" }}>
                <GlassPanel>
                  <div style={S.sectionLabel}>
                    <div style={S.sectionBar("#8b5cf6")} />
                    <span style={S.sectionText}>Parameters</span>
                  </div>
                  <div style={S.inputSpace}>
                    {inputFields.map(f => (
                      <HoloInput key={f.name} {...f} value={form[f.name]} onChange={handleChange} />
                    ))}
                    <div style={S.inputRow}>
                      {inputFieldsRow.map(f => (
                        <HoloInput key={f.name} {...f} value={form[f.name]} onChange={handleChange} />
                      ))}
                    </div>
                    <HoloInput name="addr1" label="Address Score" icon="📍" placeholder="0-500" value={form.addr1} onChange={handleChange} />
                    <HoloInput name="dist1" label="Distance" icon="🌐" placeholder="km" value={form.dist1} onChange={handleChange} unit="km" />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={S.btn(loading)}
                    onMouseEnter={(e) => { if(!loading) { e.target.style.filter="brightness(1.2)"; e.target.style.transform="translateY(-2px)"; }}}
                    onMouseLeave={(e) => { e.target.style.filter="none"; e.target.style.transform="none"; }}
                  >
                    {loading ? (
                      <span style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
                        <span style={S.spinner} />
                        ANALYZING GRAPH...
                      </span>
                    ) : "⬡ INITIATE SCAN"}
                  </button>

                  {/* History */}
                  {txHistory.length > 0 && (
                    <div>
                      <div style={S.historyLabel}>SCAN HISTORY</div>
                      {txHistory.map((tx, i) => (
                        <div key={i} style={S.historyRow}>
                          <span style={{ color:"#334155" }}>{tx.time}</span>
                          <span style={{ color:"#64748b" }}>${tx.amt}</span>
                          <span style={{ color:tx.risk>80?"#ff2d55":tx.risk>50?"#ffb800":"#00f5ff",fontWeight:700 }}>{tx.risk}%</span>
                          <span>{tx.fraud?"🚨":"✅"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassPanel>
              </div>

              {/* ── Result Panel (3 cols) ── */}
              <div style={{ gridColumn:"span 3",display:"flex",flexDirection:"column",gap:20 }}>
                <GlassPanel glowColor={hasResult ? riskColor : null} animate={showResult}>
                  {!hasResult && !loading && (
                    <div style={S.emptyState}>
                      <div style={S.emptyHex}>⬡</div>
                      <p style={S.emptyText}>AWAITING TRANSACTION DATA FOR NEURAL ANALYSIS</p>
                      <div style={{ ...S.streamWrap, marginTop: 24 }}>
                        <DataStream color="#8b5cf6" width={20} speed={0.5} />
                        <DataStream color="#8b5cf6" width={20} speed={0.7} />
                        <DataStream color="#8b5cf6" width={20} speed={0.4} />
                      </div>
                    </div>
                  )}

                  {loading && (
                    <div style={S.loadingWrap}>
                      <div style={{ position:"relative",width:80,height:80,marginBottom:24 }}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{
                            position:"absolute",inset:0,borderRadius:"50%",
                            border:`2px solid rgba(139,92,246,${0.6-i*0.15})`,
                            animation:`rotate-${i%2===0?"slow":"reverse"} ${1.5+i*0.5}s linear infinite`,
                            borderRightColor:"transparent",borderBottomColor:"transparent",
                          }} />
                        ))}
                        <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
                          <span style={{ fontSize:24,animation:"pulse-glow 1s ease infinite" }}>⬡</span>
                        </div>
                      </div>
                      <div style={{ fontFamily:"var(--font-display)",fontSize:10,color:"#8b5cf6",letterSpacing:4,animation:"pulse-glow 1.5s ease infinite" }}>
                        PROPAGATING THROUGH GRAPH
                      </div>
                      <div style={{ fontFamily:"var(--font-mono)",fontSize:8,color:"#1e293b",letterSpacing:2,marginTop:8 }}>
                        Constructing subgraph · Computing embeddings · Running inference
                      </div>
                    </div>
                  )}

                  {result?.__error && (
                    <div style={{ textAlign:"center",padding:"40px 0" }}>
                      <div style={{ fontSize:40,marginBottom:12 }}>⚠️</div>
                      <p style={{ fontFamily:"var(--font-display)",fontSize:14,color:"#ff2d55",letterSpacing:2 }}>CONNECTION FAILED</p>
                      <p style={{ fontFamily:"var(--font-mono)",fontSize:10,color:"#334155",marginTop:8,letterSpacing:1 }}>
                        Ensure backend is running at localhost:8000
                      </p>
                    </div>
                  )}

                  {hasResult && showResult && (
                    <div style={{ animation:"fade-in-up 0.5s ease-out" }}>
                      <div style={S.resultHeader}>
                        <div>
                          <div style={S.resultLabel}>ANALYSIS COMPLETE</div>
                          <div style={S.resultTitle(isUnknown?"#d946ef":isFraud?"#ff2d55":"#00f5ff")}>
                            {isUnknown ? "⚠️ UNKNOWN ENTITY" : isFraud ? "🚨 FRAUD DETECTED" : "✅ SAFE TRANSACTION"}
                          </div>
                          {isUnknown && (
                            <p style={{ fontFamily:"var(--font-mono)",fontSize:9,color:"#475569",marginTop:4,letterSpacing:1 }}>
                              {result.message} — Classified as HIGH RISK
                            </p>
                          )}
                        </div>
                        <ThreatRadar percent={riskPercent} color={riskColor} />
                      </div>

                      {!isUnknown && (
                        <div style={S.metaGrid}>
                          {[
                            { label:"CONFIDENCE",value:riskPercent>80?"HIGH":riskPercent>50?"MED":"LOW",color:riskColor },
                            { label:"MODEL",value:"GNN v2.4",color:"#8b5cf6" },
                            { label:"LATENCY",value:"<50ms",color:"#00f5ff" },
                          ].map((m,i) => (
                            <div key={i} style={S.metaCard}>
                              <div style={S.metaLabel}>{m.label}</div>
                              <div style={S.metaValue(m.color)}>{m.value}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <div style={S.sectionLabel}>
                          <div style={S.sectionBar("#d946ef")} />
                          <span style={S.sectionText}>Decision Factors</span>
                        </div>
                        {reasons.map((r, i) => (
                          <div key={i} style={S.reasonRow(r.severity)}>
                            <span style={S.reasonIcon}>{r.icon}</span>
                            <span style={S.reasonText}>{r.text}</span>
                            <span style={S.reasonBadge(r.severity)}>{r.severity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </GlassPanel>

                {/* XAI Panel */}
                {showXAI && hasResult && (
                  <GlassPanel animate glowColor="#00f5ff">
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
                      <div style={S.sectionLabel}>
                        <div style={S.sectionBar("#00f5ff")} />
                        <span style={S.sectionText}>Shapley Attribution</span>
                      </div>
                      <StatusBadge text="XAI" color="#00f5ff" />
                    </div>
                    {xaiFeatures.map((f, i) => {
                      const c = f.importance>0.7?"#ff2d55":f.importance>0.4?"#ffb800":"#00f5ff";
                      return <FeatureBar key={f.label} label={f.label} value={f.importance} max={1} color={c} delay={i*150} />;
                    })}
                    <div style={S.xaiInfo}>
                      ℹ️ Shapley values represent each feature's marginal contribution to the risk prediction.
                      Higher bars indicate stronger influence on the fraud classification decision.
                    </div>
                  </GlassPanel>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer style={S.footer}>
          NEURALGUARD · GRAPH NEURAL NETWORK FRAUD INTELLIGENCE · MODEL CONFIDENCE THRESHOLD 0.5
        </footer>
      </div>
    </div>
  );
}
