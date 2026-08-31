import React, { useState, useEffect, useMemo } from "react";
import { storage } from './storage.js'
import { Plus, Trash2, Wallet, CreditCard, X, ChevronLeft, ChevronRight } from "lucide-react";

const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);
const toISO = (d) => d.toISOString().slice(0, 10);
const todayISO = toISO(new Date());

// ── CICLO ────────────────────────────────────────────────────────────
//   Semanas de GASTO  : SIEMPRE del día 12 de un mes al día 11 del mes
//                       siguiente (fijo, automático según el mes que se
//                       esté viendo — no requiere configuración).
//   Fecha de PAGO     : día 30 (o último día del mes si es más corto) del
//                       mes en que termina el ciclo de gasto.
//   Semanas de APARTO : el usuario elige a mano, cada ciclo, el viernes de
//                       entrada y el viernes final; pueden ser más o menos
//                       de 4 semanas (ver apartadoRangos).

// year/month (0-indexado) = año y mes del día 12 en que arranca el ciclo de gasto.
function getCicloFromCycleMonth(year, month) {
  const inicio = new Date(year, month, 12);
  const finMes = month + 1 > 11 ? 0 : month + 1;
  const finYear = month + 1 > 11 ? year + 1 : year;
  const finGasto = new Date(finYear, finMes, 11);
  const maxDay = new Date(finYear, finMes + 1, 0).getDate();
  const pago = new Date(finYear, finMes, Math.min(30, maxDay));
  const label = pago.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  return {
    cycleYear: year,
    cycleMonth: month,
    inicio: toISO(inicio),
    finGasto: toISO(finGasto),
    pago: toISO(pago),
    label: label.charAt(0).toUpperCase() + label.slice(1),
  };
}

// Para compatibilidad con el resto del código (presupuesto usa periodo.inicio y periodo.fin)
function getPeriodoFromCiclo(c) {
  return { inicio: c.inicio, fin: c.finGasto, pago: c.pago, label: c.label };
}

// Dado hoy, encuentra el mes de ciclo activo (el día 12 que da inicio al
// ciclo de gasto que contiene la fecha de hoy).
function getCicloActivoMes() {
  const today = new Date(todayISO + "T00:00:00");
  if (today.getDate() >= 12) return { year: today.getFullYear(), month: today.getMonth() };
  const m = today.getMonth() - 1;
  return m < 0 ? { year: today.getFullYear() - 1, month: 11 } : { year: today.getFullYear(), month: m };
}

// Desplaza un mes de ciclo N meses calendario
function shiftCycleMonth(year, month, n) {
  const total = year * 12 + month + n;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

// Viernes más cercano (hacia adelante o atrás, el que quede más cerca) a una fecha ISO.
function nearestFriday(iso) {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay(); // 0=domingo … 5=viernes … 6=sábado
  const adelante = (5 - day + 7) % 7;
  const atras = (day - 5 + 7) % 7;
  d.setDate(d.getDate() + (adelante <= atras ? adelante : -atras));
  return toISO(d);
}

// Rango de apartados por default (antes de que el usuario elija uno propio
// para este ciclo): viernes más cercano a mitad de ciclo → viernes más
// cercano a la fecha de pago.
function defaultApartadoRange(ciclo) {
  const mitad = new Date(ciclo.inicio + "T00:00:00");
  mitad.setDate(mitad.getDate() + 16);
  let start = nearestFriday(toISO(mitad));
  let end = nearestFriday(ciclo.pago);
  if (start > end) [start, end] = [end, start];
  return { start, end };
}

function getWeekRanges(inicioISO, finISO) {
  const start = new Date(inicioISO + "T00:00:00");
  const end = new Date(finISO + "T00:00:00");
  const weeks = [];
  let cursor = new Date(start);
  let idx = 1;
  while (cursor <= end) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const actualEnd = weekEnd > end ? end : weekEnd;
    weeks.push({ idx, start: toISO(cursor), end: toISO(actualEnd) });
    cursor = new Date(actualEnd);
    cursor.setDate(cursor.getDate() + 1);
    idx++;
  }
  return weeks;
}

// El presupuesto de una subcategoría varía por mes: budgetOverrides guarda
// el monto específico de cada mes (clave "YYYY-MM", tomada de ciclo.pago);
// sub.budget queda como valor por defecto para los meses sin override.
function budgetFor(sub, monthKey) { return Number(sub.budgetOverrides?.[monthKey] ?? sub.budget ?? 0); }

function getSubcatName(bc, catId, subId) { return bc.find((c) => c.id === catId)?.subcategories.find((s) => s.id === subId)?.name || null; }

function CompromisoRow({ c, budgetCategories, onTogglePaidCompromiso, onDeleteCompromiso }) {
  const subName = getSubcatName(budgetCategories, c.categoryId, c.subcategoryId);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0 4px 12px", fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: c.paid ? "#A39E8F" : "#7A7568" }}>
        <input type="checkbox" checked={!!c.paid} onChange={() => onTogglePaidCompromiso(c)} style={{ width: 14, height: 14, margin: 0 }} title={c.paid ? "Marcar como pendiente" : "Marcar como pagado"} />
        <span style={{ textDecoration: c.paid ? "line-through" : "none" }}>→ {c.label}</span>
        <span style={{ fontSize: 10, color: "#A39E8F" }}>({subName || "sin categoría"})</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontWeight: 600, textDecoration: c.paid ? "line-through" : "none", color: c.paid ? "#A39E8F" : "#1C2541" }}>{fmt(c.amount)}</span>
        <button onClick={() => onDeleteCompromiso(c.id)} style={{ background: "none", border: "none", color: "#C9BFA8" }}><X size={12} /></button>
      </div>
    </div>
  );
}
function getCatName(bc, catId) { return bc.find((c) => c.id === catId)?.name || null; }

const ACCOUNT_TYPES = ["Débito", "Crédito"];
const ACCOUNT_COLORS = ["#6B8F71", "#C9A04D", "#D87554", "#5B7DB1", "#8C6BAE", "#B1645B", "#4F9DA6", "#A6A15B"];

export default function FinanzasApp() {
  const [accounts, setAccounts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [budgetCategories, setBudgetCategories] = useState([]);
  const [incomeTemplate, setIncomeTemplate] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [apartadoRangos, setApartadoRangos] = useState({});
  const [monthOffset, setMonthOffset] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("presupuesto");
  const [showAddMov, setShowAddMov] = useState(false);
  const [editingMov, setEditingMov] = useState(null);
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      let acc = [], mov = [], bc = [], inc = [], asg = [];
      try {
        // Cada colección se lee de su propia fila en Supabase — un fallo de
        // red en una no afecta a las demás, y nunca se escribe nada aquí:
        // esta pantalla solo lee.
        const getJSON = async (key) => {
          try { const r = await storage.get(key); return { ok: true, data: r ? JSON.parse(r.value) : [] }; }
          catch { return { ok: false, data: [] }; }
        };
        const [accR, movR, bcR, incR, asgR, arR] = await Promise.all([
          getJSON("accounts"),
          getJSON("movements"),
          getJSON("budgetCategories"),
          getJSON("incomeTemplate"),
          getJSON("asignaciones"),
          (async () => { try { const r = await storage.get("apartadoRangos"); return { ok: true, data: r ? JSON.parse(r.value) : {} }; } catch { return { ok: false, data: {} }; } })(),
        ]);
        acc = accR.data; mov = movR.data; bc = bcR.data; inc = incR.data; asg = asgR.data;
        setApartadoRangos(arR.data);

        const allOk = accR.ok && movR.ok && bcR.ok && incR.ok && asgR.ok;
        if (!allOk) {
          setError("Algunos datos no se pudieron cargar (falla de red). Recarga la página.");
        }
      } finally {
        // Garantiza que la pantalla de "Cargando…" siempre se destrabe,
        // incluso si algo falla de forma inesperada arriba.
        setAccounts(acc);
        setMovements(mov);
        setBudgetCategories(bc);
        setIncomeTemplate(inc);
        setAsignaciones(asg);
        setLoaded(true);
      }
    })();
  }, []);

  const saveApartadoRango = (pagoISO, start, end) => {
    const n = { ...apartadoRangos, [pagoISO]: { start, end } };
    setApartadoRangos(n);
    persist("apartadoRangos", n);
  };

  const persist = async (key, value) => {
    try {
      await storage.set(key, JSON.stringify(value));
    } catch (e) {
      setError(`No se pudo guardar (${key}). Verifica tu conexión.`);
    }
  };

  const persistMovements = async (fullArray) => {
    try {
      await storage.set("movements", JSON.stringify(fullArray));
    } catch (e) {
      setError("No se pudo guardar el movimiento. Verifica tu conexión.");
    }
  };

  const addAccount = (a) => { const n = [...accounts, { ...a, id: "acc_" + Date.now() }]; setAccounts(n); persist("accounts", n); };
  const deleteAccount = (id) => { const n = accounts.filter((a) => a.id !== id); setAccounts(n); persist("accounts", n); };
  const addMovement = (m) => { const n = [...movements, { ...m, id: "mov_" + Date.now() }]; setMovements(n); persistMovements(n); };
  const deleteMovement = (id) => {
    const n = movements.filter((m) => m.id !== id);
    setMovements(n); persistMovements(n);
  };
  const updateMovement = (id, patch) => {
    const target = movements.find((m) => m.id === id);
    if (!target) return;
    const n = movements.map((m) => m.id === id ? { ...m, ...patch } : m);
    setMovements(n);
    persistMovements(n);
  };
  const addIncomeTemplate = (i) => { const n = [...incomeTemplate, { ...i, id: "inc_" + Date.now() }]; setIncomeTemplate(n); persist("incomeTemplate", n); };
  const deleteIncomeTemplate = (id) => { const n = incomeTemplate.filter((i) => i.id !== id); setIncomeTemplate(n); persist("incomeTemplate", n); const na = asignaciones.filter((a) => a.incomeTemplateId !== id); setAsignaciones(na); persist("asignaciones", na); };
  const addAsignacion = (a) => { const n = [...asignaciones, { ...a, id: "asg_" + Date.now() }]; setAsignaciones(n); persist("asignaciones", n); };
  const deleteAsignacion = (id) => { const n = asignaciones.filter((a) => a.id !== id); setAsignaciones(n); persist("asignaciones", n); };

  // Compromisos de efectivo: gastos proyectados en débito por semana
  const [compromisos, setCompromisos] = useState([]);
  useEffect(() => {
    (async () => {
      try { const r = await storage.get("compromisos"); setCompromisos(r ? JSON.parse(r.value) : []); } catch { setCompromisos([]); }
    })();
  }, []);
  const addCompromiso = (c) => { const n = [...compromisos, { ...c, id: "com_" + Date.now(), paid: false, movementId: null }]; setCompromisos(n); persist("compromisos", n); };
  const deleteCompromiso = (id) => {
    const target = compromisos.find((c) => c.id === id);
    const n = compromisos.filter((c) => c.id !== id);
    setCompromisos(n); persist("compromisos", n);
    if (target?.movementId) {
      const nMov = movements.filter((m) => m.id !== target.movementId);
      setMovements(nMov); persistMovements(nMov);
    }
  };
  // Marca/desmarca un compromiso de débito como pagado. Al pagarlo, crea el
  // gasto real correspondiente (deja de ser "programado" en Presupuesto);
  // al desmarcarlo, elimina ese gasto y vuelve a quedar como programado.
  const toggleCompromisoPaid = (c) => {
    if (!c.paid) {
      const accountId = incomeTemplate.find((i) => i.id === c.incomeTemplateId)?.accountId;
      const movId = "mov_" + Date.now();
      const nMov = [...movements, { id: movId, kind: "gasto", amount: c.amount, accountId, categoryId: c.categoryId, subcategoryId: c.subcategoryId, label: c.label, date: todayISO }];
      setMovements(nMov); persistMovements(nMov);
      const nComp = compromisos.map((x) => x.id === c.id ? { ...x, paid: true, movementId: movId } : x);
      setCompromisos(nComp); persist("compromisos", nComp);
    } else {
      const nMov = movements.filter((m) => m.id !== c.movementId);
      setMovements(nMov); persistMovements(nMov);
      const nComp = compromisos.map((x) => x.id === c.id ? { ...x, paid: false, movementId: null } : x);
      setCompromisos(nComp); persist("compromisos", nComp);
    }
  };
  const updateSubcategoryBudget = (catId, subId, monthKey, b) => { const n = budgetCategories.map((c) => c.id === catId ? { ...c, subcategories: c.subcategories.map((s) => s.id === subId ? { ...s, budgetOverrides: { ...(s.budgetOverrides || {}), [monthKey]: b } } : s) } : c); setBudgetCategories(n); persist("budgetCategories", n); };
  const addSubcategory = (catId, name, budget) => { const n = budgetCategories.map((c) => c.id === catId ? { ...c, subcategories: [...c.subcategories, { id: "sub_" + Date.now(), name, budget }] } : c); setBudgetCategories(n); persist("budgetCategories", n); };
  const deleteSubcategory = (catId, subId) => {
    const enUso = movements.filter((m) => m.subcategoryId === subId).length;
    const enCompromiso = compromisos.filter((c) => c.subcategoryId === subId && !c.paid).length;
    if (enUso > 0 || enCompromiso > 0) {
      const partes = [];
      if (enUso > 0) partes.push(`${enUso} gasto${enUso === 1 ? "" : "s"}`);
      if (enCompromiso > 0) partes.push(`${enCompromiso} gasto${enCompromiso === 1 ? "" : "s"} programado${enCompromiso === 1 ? "" : "s"} en Apartados`);
      setError(`No se puede eliminar: ${partes.join(" y ")} está${(enUso + enCompromiso) === 1 ? "" : "n"} asignado${(enUso + enCompromiso) === 1 ? "" : "s"} a esta subcategoría. Reasígnalos primero y vuelve a intentar.`);
      return;
    }
    const n = budgetCategories.map((c) => c.id === catId ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subId) } : c); setBudgetCategories(n); persist("budgetCategories", n);
  };
  const addCategory = (name) => { const n = [...budgetCategories, { id: "cat_" + Date.now(), name, subcategories: [] }]; setBudgetCategories(n); persist("budgetCategories", n); };
  const deleteCategory = (catId) => {
    const enUso = movements.filter((m) => m.categoryId === catId).length;
    const enCompromiso = compromisos.filter((c) => c.categoryId === catId && !c.paid).length;
    if (enUso > 0 || enCompromiso > 0) {
      const partes = [];
      if (enUso > 0) partes.push(`${enUso} gasto${enUso === 1 ? "" : "s"}`);
      if (enCompromiso > 0) partes.push(`${enCompromiso} gasto${enCompromiso === 1 ? "" : "s"} programado${enCompromiso === 1 ? "" : "s"} en Apartados`);
      setError(`No se puede eliminar: ${partes.join(" y ")} está${(enUso + enCompromiso) === 1 ? "" : "n"} asignado${(enUso + enCompromiso) === 1 ? "" : "s"} a esta categoría. Reasígnalos primero y vuelve a intentar.`);
      return;
    }
    const n = budgetCategories.filter((c) => c.id !== catId); setBudgetCategories(n); persist("budgetCategories", n);
  };

  // El ciclo de gasto es fijo (12 del mes → 11 del mes siguiente) y se
  // desplaza por monthOffset meses calendario (±1 = un mes antes/después)
  // para poder navegar el historial.
  const cicloMesBase = useMemo(() => getCicloActivoMes(), []);
  const cicloMesActivo = useMemo(() => shiftCycleMonth(cicloMesBase.year, cicloMesBase.month, monthOffset), [cicloMesBase, monthOffset]);
  const ciclo = useMemo(() => getCicloFromCycleMonth(cicloMesActivo.year, cicloMesActivo.month), [cicloMesActivo]);
  const periodo = useMemo(() => getPeriodoFromCiclo(ciclo), [ciclo]);
  const semanasGasto = useMemo(() => getWeekRanges(ciclo.inicio, ciclo.finGasto), [ciclo]);
  // El rango de apartados (viernes de entrada/final) lo elige el usuario a
  // mano por ciclo; mientras no lo haya configurado usamos un default.
  const apartadoRango = useMemo(() => apartadoRangos[ciclo.pago] || defaultApartadoRange(ciclo), [apartadoRangos, ciclo]);
  const semanasApartado = useMemo(() => getWeekRanges(apartadoRango.start, apartadoRango.end), [apartadoRango]);


  if (!loaded) return <div style={{ minHeight: "100vh", background: "#F7F4EC", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: "#1C2541" }}>Cargando…</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EC", fontFamily: "system-ui, -apple-system, sans-serif", color: "#1C2541" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap'); .dp{font-family:'Fraunces',serif} *{box-sizing:border-box} button{cursor:pointer;font-family:inherit}`}</style>
      <div style={{ background: "#1C2541", color: "#F7F4EC", padding: "24px 20px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.6, letterSpacing: 1, textTransform: "uppercase" }}>Finanzas personales</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              <button onClick={() => setMonthOffset((o) => o - 1)} style={{ background: "none", border: "none", color: "#F7F4EC", opacity: 0.7, padding: 4, display: "flex" }}><ChevronLeft size={18} /></button>
              <div className="dp" style={{ fontSize: 16, fontWeight: 600, flex: 1, textAlign: "center" }}>{ciclo.label}</div>
              <button onClick={() => setMonthOffset((o) => o + 1)} style={{ background: "none", border: "none", color: "#F7F4EC", opacity: 0.7, padding: 4, display: "flex" }}><ChevronRight size={18} /></button>
              {monthOffset !== 0 && <button onClick={() => setMonthOffset(0)} style={{ background: "none", border: "none", color: "#D87554", fontSize: 11, fontWeight: 600, marginLeft: 4, whiteSpace: "nowrap" }}>Hoy</button>}
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8, textAlign: "center" }}>
              Gasto {new Date(ciclo.inicio+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})} – {new Date(ciclo.finGasto+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})} · Pago {new Date(ciclo.pago+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.6, marginBottom: 4 }}>
              <span>{new Date(ciclo.inicio+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})}</span>
              <span>Pago {new Date(ciclo.pago+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})}</span>
            </div>
            <div style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.15)", borderRadius: 3 }}>
              {(() => {
                const s = new Date(ciclo.inicio+"T00:00:00").getTime();
                const e = new Date(ciclo.pago+"T00:00:00").getTime();
                const t = new Date(todayISO+"T00:00:00").getTime();
                const pct = Math.max(0, Math.min(100, ((t-s)/(e-s))*100));
                const inRange = todayISO >= ciclo.inicio && todayISO <= ciclo.pago;
                return (<>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "#D87554", borderRadius: 3 }} />
                  {inRange && <div style={{ position: "absolute", left: `${pct}%`, top: -3, width: 12, height: 12, background: "#D87554", borderRadius: "50%", transform: "translateX(-50%)", border: "2px solid #1C2541" }} />}
                </>);
              })()}
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 20, overflowX: "auto" }}>
            {[["presupuesto","Presupuesto"],["apartados","Apartados"],["cuentas","Cuentas"]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{ flex: "0 0 auto", padding: "10px 14px", background: "transparent", border: "none", borderBottom: tab === id ? "2px solid #D87554" : "2px solid transparent", color: tab === id ? "#F7F4EC" : "rgba(247,244,236,0.5)", fontWeight: tab === id ? 600 : 400, fontSize: 13, whiteSpace: "nowrap" }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 20px 100px" }}>
        {error && <div style={{ background: "#B1645B", color: "#fff", padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 13, display: "flex", justifyContent: "space-between" }}>{error}<button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#fff" }}><X size={14} /></button></div>}
        {tab === "presupuesto" && <PresupuestoView budgetCategories={budgetCategories} movements={movements} compromisos={compromisos} accounts={accounts} periodo={periodo} ciclo={ciclo} onUpdateBudget={updateSubcategoryBudget} onAddSubcategory={addSubcategory} onDeleteSubcategory={deleteSubcategory} onAddCategory={addCategory} onDeleteCategory={deleteCategory} onDelete={deleteMovement} onEdit={setEditingMov} />}
        {tab === "apartados" && <ApartadosView key={ciclo.pago} accounts={accounts} movements={movements} budgetCategories={budgetCategories} incomeTemplate={incomeTemplate} asignaciones={asignaciones} compromisos={compromisos} ciclo={ciclo} semanasApartado={semanasApartado} apartadoRango={apartadoRango} onSaveApartadoRango={(start, end) => saveApartadoRango(ciclo.pago, start, end)} onAddIncome={addIncomeTemplate} onDeleteIncome={deleteIncomeTemplate} onAddAsignacion={addAsignacion} onDeleteAsignacion={deleteAsignacion} onAddCompromiso={addCompromiso} onDeleteCompromiso={deleteCompromiso} onTogglePaidCompromiso={toggleCompromisoPaid} />}
        {tab === "cuentas" && <CuentasView accounts={accounts} movements={movements} budgetCategories={budgetCategories} ciclo={ciclo} semanasGasto={semanasGasto} onAddAccount={() => setShowAddAcc(true)} onDeleteAccount={deleteAccount} />}
      </div>

      {accounts.length > 0 && <button onClick={() => setShowAddMov(true)} style={{ position: "fixed", bottom: 24, right: 24, width: 56, height: 56, borderRadius: "50%", background: "#D87554", color: "#fff", border: "none", boxShadow: "0 4px 14px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={26} /></button>}
      {showAddMov && <AddMovementModal accounts={accounts} budgetCategories={budgetCategories} ciclo={ciclo} onClose={() => setShowAddMov(false)} onSave={(m) => { addMovement(m); setShowAddMov(false); }} />}
      {editingMov && <AddMovementModal accounts={accounts} budgetCategories={budgetCategories} ciclo={ciclo} initial={editingMov} onClose={() => setEditingMov(null)} onSave={(m) => { updateMovement(editingMov.id, m); setEditingMov(null); }} />}
      {showAddAcc && <AddAccountModal onClose={() => setShowAddAcc(false)} onSave={(a) => { addAccount(a); setShowAddAcc(false); }} />}
    </div>
  );
}

function PresupuestoView({ budgetCategories, movements, compromisos, accounts, periodo, ciclo, onUpdateBudget, onAddSubcategory, onDeleteSubcategory, onAddCategory, onDeleteCategory, onDelete, onEdit }) {
  const [openCat, setOpenCat] = useState(null);
  const [openSub, setOpenSub] = useState(null);
  const [editingSub, setEditingSub] = useState(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [addingSubTo, setAddingSubTo] = useState(null);
  const [showAllMovs, setShowAllMovs] = useState(false);
  const monthKey = ciclo.pago.slice(0, 7);
  const periodMovs = useMemo(() => movements.filter((m) => m.kind === "gasto" && m.date >= ciclo.inicio && m.date <= ciclo.finGasto), [movements, ciclo]);
  // Gastos cuya categoría/subcategoría ya no existe (p. ej. se borró la
  // categoría después de asignarles el gasto) — quedan "huérfanos" y antes
  // se mostraban en blanco sin explicación.
  const sinCategoria = useMemo(() => periodMovs.filter((m) => {
    const cat = budgetCategories.find((c) => c.id === m.categoryId);
    return !cat || !cat.subcategories.some((s) => s.id === m.subcategoryId);
  }), [periodMovs, budgetCategories]);
  // Compromisos de débito (Apartados) todavía sin pagar de este mismo ciclo:
  // cuentan como "programado" — spending anticipado que aún no es un gasto real.
  const programados = useMemo(() => (compromisos || []).filter((c) => c.pagoISO === ciclo.pago && !c.paid), [compromisos, ciclo]);
  const gastoPorSub = (subId) => periodMovs.filter((m) => m.subcategoryId === subId).reduce((s, m) => s + Number(m.amount), 0);
  const gastoPorCat = (catId) => periodMovs.filter((m) => m.categoryId === catId).reduce((s, m) => s + Number(m.amount), 0);
  const programadoPorSub = (subId) => programados.filter((c) => c.subcategoryId === subId).reduce((s, c) => s + Number(c.amount), 0);
  const programadoPorCat = (catId) => programados.filter((c) => c.categoryId === catId).reduce((s, c) => s + Number(c.amount), 0);
  const presupuestoPorCat = (cat) => cat.subcategories.reduce((s, sub) => s + budgetFor(sub, monthKey), 0);
  const totalPresupuesto = budgetCategories.reduce((s, c) => s + presupuestoPorCat(c), 0);
  const totalGastado = periodMovs.reduce((s, m) => s + Number(m.amount), 0);
  const totalProgramado = programados.reduce((s, c) => s + Number(c.amount), 0);

  const MovRow = ({ m }) => {
    const acc = accounts.find((a) => a.id === m.accountId);
    const cat = budgetCategories.find((c) => c.id === m.categoryId);
    const sub = cat?.subcategories.find((s) => s.id === m.subcategoryId);
    const huerfano = !cat || !sub;
    return (
      <div onClick={() => onEdit(m)} style={{ padding: "8px 16px", borderTop: "1px solid #F7F4EC", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: acc?.color || "#ccc", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{m.label || sub?.name || "—"}</div>
            <div style={{ fontSize: 11, color: "#A39E8F" }}>
              {new Date(m.date+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})} · {acc?.name || "—"}
              {huerfano && <span style={{ color: "#C9A04D", fontWeight: 600 }}> · {!cat ? "Sin categoría" : "Sin subcategoría"}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#B1645B" }}>−{fmt(m.amount)}</div>
          <button onClick={(e) => { e.stopPropagation(); onDelete(m.id); }} style={{ background: "none", border: "none", color: "#C9BFA8", padding: 2 }}><Trash2 size={13} /></button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ background: "#fff", border: "1px solid #E5DFD0", borderRadius: 14, padding: 16, marginBottom: 18, display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: "#A39E8F", textTransform: "uppercase", letterSpacing: 0.5 }}>Presupuestado</div>
          <div className="dp" style={{ fontSize: 22, fontWeight: 600, marginTop: 2 }}>{fmt(totalPresupuesto)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#A39E8F", textTransform: "uppercase", letterSpacing: 0.5 }}>Real + programado</div>
          <div className="dp" style={{ fontSize: 22, fontWeight: 600, marginTop: 2 }}>{fmt(totalGastado + totalProgramado)}</div>
        </div>
      </div>
      {sinCategoria.length > 0 && (
        <div style={{ background: "#FEF3CD", border: "1px solid #F0D080", borderRadius: 14, overflow: "hidden", marginBottom: 18 }}>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#7A6020" }}>⚠️ Sin categoría o subcategoría ({sinCategoria.length})</div>
            <div style={{ fontSize: 11, color: "#7A6020", marginTop: 2 }}>{fmt(sinCategoria.reduce((s, m) => s + Number(m.amount), 0))} sin asignar · toca un gasto para corregirlo</div>
          </div>
          <div>{sinCategoria.map((m) => <MovRow key={m.id} m={m} />)}</div>
        </div>
      )}
      <div style={{ display: "grid", gap: 12 }}>
        {budgetCategories.map((cat) => {
          const presupuestado = presupuestoPorCat(cat);
          const gastado = gastoPorCat(cat.id);
          const programado = programadoPorCat(cat.id);
          const pct = presupuestado > 0 ? ((gastado + programado) / presupuestado) * 100 : 0;
          const disponible = presupuestado - gastado - programado;
          const isOpen = openCat === cat.id;
          return (
            <div key={cat.id} style={{ background: "#fff", border: "1px solid #E5DFD0", borderRadius: 14, overflow: "hidden" }}>
              <button onClick={() => setOpenCat(isOpen ? null : cat.id)} style={{ width: "100%", padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <CircularPct pct={pct} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{cat.name}</div>
                    <div style={{ fontSize: 11, color: "#A39E8F" }}>{fmt(gastado)} de {fmt(presupuestado)}{programado > 0 ? ` · +${fmt(programado)} programado` : ""}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="dp" style={{ fontSize: 15, fontWeight: 600, color: disponible >= 0 ? "#1C2541" : "#B1645B" }}>{fmt(Math.abs(disponible))}</div>
                  <div style={{ fontSize: 10, color: disponible >= 0 ? "#A39E8F" : "#B1645B" }}>{disponible >= 0 ? "disponible" : "te pasaste"}</div>
                </div>
              </button>
              {isOpen && (
                <div style={{ borderTop: "1px solid #F0ECE0" }}>
                  {cat.subcategories.map((sub) => {
                    const sg = gastoPorSub(sub.id);
                    const sProg = programadoPorSub(sub.id);
                    const sTotal = sg + sProg;
                    const subBudget = budgetFor(sub, monthKey);
                    const sp = subBudget > 0 ? (sTotal / subBudget) * 100 : 0;
                    const gastoBarPct = subBudget > 0 ? Math.min(100, (sg / subBudget) * 100) : 0;
                    const progBarPct = subBudget > 0 ? Math.max(0, Math.min(100 - gastoBarPct, (sProg / subBudget) * 100)) : 0;
                    const sd = subBudget - sTotal;
                    const subMovs = periodMovs.filter((m) => m.subcategoryId === sub.id);
                    const isSubOpen = openSub === sub.id;
                    return (
                      <div key={sub.id} style={{ borderBottom: "1px solid #F7F4EC" }}>
                        <div style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <button onClick={() => setOpenSub(isSubOpen ? null : sub.id)} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 500, color: "#1C2541", padding: 0, textAlign: "left" }}>
                              {sub.name} {subMovs.length > 0 ? <span style={{ fontSize: 10, color: "#A39E8F" }}>({subMovs.length})</span> : null}
                            </button>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt(sg)}{sProg > 0 ? <span style={{ color: "#C9A04D", fontWeight: 500 }}> +{fmt(sProg)} prog.</span> : null}</div>
                              <button onClick={() => setEditingSub(editingSub === sub.id ? null : sub.id)} style={{ background: "none", border: "none", color: "#A39E8F", fontSize: 11 }}>editar</button>
                            </div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: sd >= 0 ? "#A39E8F" : "#B1645B", marginTop: 2 }}>
                            <span>{sd >= 0 ? `${fmt(sd)} disponible` : `Te pasaste ${fmt(Math.abs(sd))}`}</span>
                            <span style={{ color: sp >= 100 ? "#B1645B" : "#6B8F71" }}>{Math.round(sp)}%</span>
                          </div>
                          <div style={{ display: "flex", height: 5, background: "#F0ECE0", borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${gastoBarPct}%`, background: sp >= 100 ? "#B1645B" : "#C9A04D" }} />
                            {progBarPct > 0 && <div style={{ height: "100%", width: `${progBarPct}%`, background: "#E9D9A8" }} />}
                          </div>
                          {editingSub === sub.id && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <input key={sub.id + monthKey} type="number" defaultValue={subBudget} onBlur={(e) => onUpdateBudget(cat.id, sub.id, monthKey, Number(e.target.value || 0))} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #E5DFD0", fontSize: 13 }} />
                                <button onClick={() => { onDeleteSubcategory(cat.id, sub.id); setEditingSub(null); }} style={{ background: "none", border: "none", color: "#B1645B" }}><Trash2 size={14} /></button>
                              </div>
                              <div style={{ fontSize: 10, color: "#A39E8F" }}>Solo aplica a {ciclo.label}</div>
                            </div>
                          )}
                        </div>
                        {isSubOpen && subMovs.length > 0 && (
                          <div style={{ background: "#FAF8F2" }}>
                            {subMovs.sort((a, b) => a.date < b.date ? 1 : -1).map((m) => <MovRow key={m.id} m={m} />)}
                          </div>
                        )}
                        {isSubOpen && subMovs.length === 0 && (
                          <div style={{ padding: "8px 16px", fontSize: 12, color: "#A39E8F", background: "#FAF8F2" }}>Sin gastos aquí todavía.</div>
                        )}
                      </div>
                    );
                  })}
                  {addingSubTo === cat.id
                    ? <AddSubcategoryInline onCancel={() => setAddingSubTo(null)} onSave={(name, budget) => { onAddSubcategory(cat.id, name, budget); setAddingSubTo(null); }} />
                    : <button onClick={() => setAddingSubTo(cat.id)} style={{ width: "100%", padding: 12, background: "#FAF8F2", border: "none", color: "#7A7568", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Plus size={13} /> Agregar subcategoría</button>
                  }
                  <button onClick={() => onDeleteCategory(cat.id)} style={{ width: "100%", padding: 10, background: "transparent", border: "none", color: "#C9BFA8", fontSize: 11 }}>Eliminar "{cat.name}"</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showAddCat ? <AddCategoryInline onCancel={() => setShowAddCat(false)} onSave={(name) => { onAddCategory(name); setShowAddCat(false); }} /> : <button onClick={() => setShowAddCat(true)} style={{ width: "100%", padding: 14, marginTop: 12, background: "#fff", border: "1.5px dashed #C9BFA8", borderRadius: 14, color: "#7A7568", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Plus size={16} /> Agregar categoría</button>}

      {/* Últimos movimientos */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#7A7568", textTransform: "uppercase", letterSpacing: 0.5 }}>{showAllMovs ? "Todos los movimientos" : "Últimos movimientos"}</div>
          {periodMovs.length > 20 && (
            <button onClick={() => setShowAllMovs((v) => !v)} style={{ background: "none", border: "none", color: "#D87554", fontSize: 12, fontWeight: 600 }}>
              {showAllMovs ? "Ver solo recientes" : `Ver todos (${periodMovs.length})`}
            </button>
          )}
        </div>
        <div style={{ background: "#fff", border: "1px solid #E5DFD0", borderRadius: 14, overflow: "hidden" }}>
          {periodMovs.length === 0
            ? <div style={{ padding: 16, fontSize: 13, color: "#A39E8F" }}>Sin movimientos en este ciclo.</div>
            : periodMovs.slice().sort((a, b) => a.date < b.date ? 1 : -1).slice(0, showAllMovs ? undefined : 20).map((m) => {
                const acc = accounts.find((a) => a.id === m.accountId);
                const cat = budgetCategories.find((c) => c.id === m.categoryId);
                const subName = cat?.subcategories.find((s) => s.id === m.subcategoryId)?.name;
                return (
                  <div key={m.id} onClick={() => onEdit(m)} style={{ padding: "10px 16px", borderTop: "1px solid #F0ECE0", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: acc?.color || "#ccc", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{m.label || subName || "—"}</div>
                        <div style={{ fontSize: 11, color: "#A39E8F" }}>
                          {new Date(m.date+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})} · {acc?.name || "—"}
                          {cat ? ` · ${cat.name}${subName ? ` › ${subName}` : ""}` : <span style={{ color: "#C9A04D", fontWeight: 600 }}> · Sin categoría</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="dp" style={{ fontSize: 14, fontWeight: 600, color: m.kind === "ingreso" ? "#6B8F71" : "#B1645B" }}>
                        {m.kind === "ingreso" ? "+" : "−"}{fmt(m.amount)}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(m.id); }} style={{ background: "none", border: "none", color: "#C9BFA8", padding: 2 }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}

function CircularPct({ pct }) {
  const r = 16, c = 2 * Math.PI * r, offset = c - (Math.min(pct, 100) / 100) * c;
  const color = pct >= 100 ? "#B1645B" : pct >= 75 ? "#C9A04D" : "#6B8F71";
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r={r} stroke="#F0ECE0" strokeWidth="4" fill="none" />
      <circle cx="20" cy="20" r={r} stroke={color} strokeWidth="4" fill="none" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 20 20)" />
      <text x="20" y="24" textAnchor="middle" fontSize="10" fontWeight="600" fill="#1C2541">{Math.round(pct)}%</text>
    </svg>
  );
}

function AddSubcategoryInline({ onCancel, onSave }) {
  const [name, setName] = useState(""); const [budget, setBudget] = useState("");
  return (
    <div style={{ padding: 16, background: "#FAF8F2" }}>
      <input style={iS} type="text" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
      <input style={iS} type="number" placeholder="Presupuesto mensual" value={budget} onChange={(e) => setBudget(e.target.value)} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #E5DFD0", background: "#fff", fontSize: 13 }}>Cancelar</button>
        <button onClick={() => name && onSave(name, Number(budget || 0))} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", background: "#1C2541", color: "#fff", fontSize: 13, fontWeight: 600 }}>Guardar</button>
      </div>
    </div>
  );
}

function AddCategoryInline({ onCancel, onSave }) {
  const [name, setName] = useState("");
  return (
    <div style={{ padding: 14, background: "#fff", border: "1px solid #E5DFD0", borderRadius: 14, marginTop: 12 }}>
      <input style={iS} type="text" placeholder="Nombre de categoría" value={name} onChange={(e) => setName(e.target.value)} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #E5DFD0", background: "#fff", fontSize: 13 }}>Cancelar</button>
        <button onClick={() => name && onSave(name)} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", background: "#1C2541", color: "#fff", fontSize: 13, fontWeight: 600 }}>Guardar</button>
      </div>
    </div>
  );
}


function ApartadosView({ accounts, movements, budgetCategories, incomeTemplate, asignaciones, compromisos, ciclo, semanasApartado, apartadoRango, onSaveApartadoRango, onAddIncome, onDeleteIncome, onAddAsignacion, onDeleteAsignacion, onAddCompromiso, onDeleteCompromiso, onTogglePaidCompromiso }) {
  const creditAccounts = accounts.filter((a) => a.type === "Crédito");
  const debitAccounts = accounts.filter((a) => a.type === "Débito");
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [assignFor, setAssignFor] = useState(null);
  const [addingCompromisoFor, setAddingCompromisoFor] = useState(null); // weekIdx
  const [editRango, setEditRango] = useState(false);
  const [tempStart, setTempStart] = useState(apartadoRango.start);
  const [tempEnd, setTempEnd] = useState(apartadoRango.end);

  const totalDeudaFor = (accId) => movements
    .filter((m) => m.accountId === accId && m.kind === "gasto" && m.date >= ciclo.inicio && m.date <= ciclo.finGasto)
    .reduce((s, m) => s + Number(m.amount), 0);
  const asignadoFor = (accId) => asignaciones
    .filter((a) => a.creditAccountId === accId && a.pagoISO === ciclo.pago)
    .reduce((s, a) => s + Number(a.amount), 0);

  if (debitAccounts.length === 0 || creditAccounts.length === 0) return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "#A39E8F" }}>
      <CreditCard size={32} style={{ marginBottom: 10, opacity: 0.5 }} />
      <div style={{ fontSize: 14 }}>Necesitas al menos una cuenta de débito y una de crédito.</div>
    </div>
  );

  return (
    <div>
      {/* Resumen deuda por tarjeta */}
      <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        {creditAccounts.map((acc) => {
          const deuda = totalDeudaFor(acc.id);
          const asignado = asignadoFor(acc.id);
          const falta = Math.max(0, deuda - asignado);
          const pct = deuda > 0 ? Math.min(100, (asignado / deuda) * 100) : 0;
          return (
            <div key={acc.id} style={{ background: "#fff", border: "1px solid #E5DFD0", borderRadius: 14, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: acc.color }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{acc.name}</div>
                </div>
                <div className="dp" style={{ fontSize: 15, fontWeight: 600 }}>{fmt(deuda)}</div>
              </div>
              <div style={{ height: 6, background: "#F0ECE0", borderRadius: 3, marginBottom: 6 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: falta === 0 ? "#6B8F71" : "#C9A04D", borderRadius: 3 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#A39E8F" }}>
                <span>Asignado: {fmt(asignado)}</span>
                <span>{falta === 0 ? "Cubierto ✓" : `Falta: ${fmt(falta)}`}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Semanas de apartado: viernes de entrada / final elegidos a mano */}
      <div style={{ background: "#fff", border: "1px solid #E5DFD0", borderRadius: 14, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Semanas de apartado</div>
        {editRango ? (
          <div>
            <label style={lS}>Viernes de entrada</label>
            <input style={iS} type="date" value={tempStart} onChange={(e) => setTempStart(nearestFriday(e.target.value))} />
            <label style={lS}>Viernes final</label>
            <input style={iS} type="date" value={tempEnd} onChange={(e) => setTempEnd(nearestFriday(e.target.value))} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setTempStart(apartadoRango.start); setTempEnd(apartadoRango.end); setEditRango(false); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #E5DFD0", background: "#fff", fontSize: 13 }}>Cancelar</button>
              <button onClick={() => { if (tempStart && tempEnd && tempStart <= tempEnd) { onSaveApartadoRango(tempStart, tempEnd); setEditRango(false); } }} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", background: "#1C2541", color: "#fff", fontSize: 13, fontWeight: 600 }}>Guardar</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#7A7568" }}>
              {new Date(apartadoRango.start+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})} → {new Date(apartadoRango.end+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})} · {semanasApartado.length} semana{semanasApartado.length === 1 ? "" : "s"}
            </div>
            <button onClick={() => { setTempStart(apartadoRango.start); setTempEnd(apartadoRango.end); setEditRango(true); }} style={{ fontSize: 12, color: "#D87554", background: "none", border: "none", fontWeight: 600 }}>Cambiar</button>
          </div>
        )}
      </div>

      {/* Header ingresos */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#7A7568", textTransform: "uppercase", letterSpacing: 0.5 }}>Plan semanal</div>
        <button onClick={() => setShowAddIncome(true)} style={{ background: "none", border: "none", color: "#D87554", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Plus size={14} /> Ingreso recurrente</button>
      </div>

      {/* Semanas */}
      <div style={{ display: "grid", gap: 14, marginBottom: 16 }}>
        {semanasApartado.map((w, i) => {
          const weekIdx = i + 1;
          const incomesThisWeek = incomeTemplate.filter((inc) => inc.weeks.includes(weekIdx));
          const totalIncomeWeek = incomesThisWeek.reduce((s, inc) => s + Number(inc.amount), 0);
          const asignacionesWeek = asignaciones.filter((a) => a.pagoISO === ciclo.pago && a.weekIdx === weekIdx);
          const totalAsignadoTarjetas = asignacionesWeek.reduce((s, a) => s + Number(a.amount), 0);
          const compromisosWeek = compromisos.filter((c) => c.pagoISO === ciclo.pago && c.weekIdx === weekIdx);
          const totalCompromisos = compromisosWeek.reduce((s, c) => s + Number(c.amount), 0);
          const libre = totalIncomeWeek - totalAsignadoTarjetas - totalCompromisos;
          const rng = `${new Date(w.start + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – ${new Date(w.end + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`;

          return (
            <div key={weekIdx} style={{ background: "#fff", border: "1px solid #E5DFD0", borderRadius: 14, overflow: "hidden" }}>
              {/* Header semana */}
              <div style={{ padding: "12px 16px", background: "#FAF8F2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Semana {weekIdx}</div>
                  <div style={{ fontSize: 10, color: "#A39E8F" }}>{rng}</div>
                </div>
                <div className="dp" style={{ fontSize: 15, fontWeight: 600 }}>{fmt(totalIncomeWeek)}</div>
              </div>

              {/* Ingresos y asignaciones a tarjetas */}
              {incomesThisWeek.length === 0
                ? <div style={{ padding: "12px 16px", fontSize: 12, color: "#A39E8F" }}>Sin ingreso programado esta semana.</div>
                : incomesThisWeek.map((inc) => {
                    const asigInc = asignaciones.filter((a) => a.pagoISO === ciclo.pago && a.weekIdx === weekIdx && a.incomeTemplateId === inc.id);
                    const usadoInc = asigInc.reduce((s, a) => s + Number(a.amount), 0);
                    const libreInc = Number(inc.amount) - usadoInc - compromisosWeek.filter(c => c.incomeTemplateId === inc.id).reduce((s,c) => s + Number(c.amount), 0);
                    const accD = accounts.find((a) => a.id === inc.accountId);
                    return (
                      <div key={inc.id} style={{ padding: "10px 16px", borderTop: "1px solid #F0ECE0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{inc.person} <span style={{ color: "#A39E8F", fontWeight: 400 }}>· {accD?.name}</span></div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{fmt(inc.amount)}</div>
                        </div>

                        {/* Asignaciones a tarjetas */}
                        {asigInc.map((a) => {
                          const credAcc = accounts.find((x) => x.id === a.creditAccountId);
                          return (
                            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0 4px 12px", fontSize: 12 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#7A7568" }}>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: credAcc?.color }} />
                                → {credAcc?.name} <span style={{ fontSize: 10, color: "#A39E8F" }}>(tarjeta)</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontWeight: 600 }}>{fmt(a.amount)}</span>
                                <button onClick={() => onDeleteAsignacion(a.id)} style={{ background: "none", border: "none", color: "#C9BFA8" }}><X size={12} /></button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Compromisos de efectivo */}
                        {compromisosWeek.filter(c => c.incomeTemplateId === inc.id).map((c) => (
                          <CompromisoRow key={c.id} c={c} budgetCategories={budgetCategories} onTogglePaidCompromiso={onTogglePaidCompromiso} onDeleteCompromiso={onDeleteCompromiso} />
                        ))}

                        {/* Botones de asignar */}
                        <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: libreInc > 0 ? "#C9A04D" : "#A39E8F", flex: 1 }}>
                            {libreInc > 0 ? `Sin asignar: ${fmt(libreInc)}` : "Totalmente asignado"}
                          </span>
                          {libreInc > 0 && (<>
                            <button onClick={() => setAssignFor({ weekIdx, incomeId: inc.id, remaining: libreInc })} style={{ fontSize: 11, color: "#D87554", background: "none", border: "1px solid #D87554", borderRadius: 8, padding: "3px 8px", fontWeight: 600 }}>+ Tarjeta</button>
                            <button onClick={() => setAddingCompromisoFor({ weekIdx, incomeId: inc.id, remaining: libreInc })} style={{ fontSize: 11, color: "#6B8F71", background: "none", border: "1px solid #6B8F71", borderRadius: 8, padding: "3px 8px", fontWeight: 600 }}>+ Débito</button>
                          </>)}
                        </div>
                      </div>
                    );
                  })
              }

              {/* Compromisos cuyo ingreso recurrente ya no existe (se borró o
                  se recreó con otro id) — sin esto quedaban contando en el
                  total de Presupuesto pero invisibles aquí. */}
              {(() => {
                const huerfanos = compromisosWeek.filter((c) => !incomesThisWeek.some((inc) => inc.id === c.incomeTemplateId));
                if (huerfanos.length === 0) return null;
                return (
                  <div style={{ padding: "10px 16px", borderTop: "1px solid #F0ECE0", background: "#FEF3CD" }}>
                    <div style={{ fontSize: 10, color: "#7A6020", fontWeight: 600, marginBottom: 2 }}>⚠️ Sin ingreso asignado (el ingreso original ya no existe)</div>
                    {huerfanos.map((c) => <CompromisoRow key={c.id} c={c} budgetCategories={budgetCategories} onTogglePaidCompromiso={onTogglePaidCompromiso} onDeleteCompromiso={onDeleteCompromiso} />)}
                  </div>
                );
              })()}

              {/* Resumen libre */}
              <div style={{ padding: "8px 16px", borderTop: "1px solid #F0ECE0", display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ color: "#B1645B" }}>Tarjetas: {fmt(totalAsignadoTarjetas)}</span>
                  <span style={{ color: "#6B8F71" }}>Débito: {fmt(totalCompromisos)}</span>
                </div>
                <span style={{ fontWeight: 600, color: libre > 0 ? "#C9A04D" : "#A39E8F" }}>Libre: {fmt(Math.max(0, libre))}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ingresos configurados */}
      {incomeTemplate.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "#A39E8F", marginBottom: 6 }}>Ingresos recurrentes:</div>
          {incomeTemplate.map((inc) => (
            <div key={inc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: 12, color: "#7A7568" }}>
              <span>{inc.person} · {fmt(inc.amount)} · sem {inc.weeks.join(", ")}</span>
              <button onClick={() => onDeleteIncome(inc.id)} style={{ background: "none", border: "none", color: "#C9BFA8" }}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {showAddIncome && <AddIncomeModal accounts={debitAccounts} numWeeks={semanasApartado.length} onClose={() => setShowAddIncome(false)} onSave={(inc) => { onAddIncome(inc); setShowAddIncome(false); }} />}
      {assignFor && <AssignModal info={assignFor} creditAccounts={creditAccounts} deudaPendiente={(accId) => Math.max(0, totalDeudaFor(accId) - asignadoFor(accId))} onClose={() => setAssignFor(null)} onSave={(creditAccountId, amount) => { onAddAsignacion({ pagoISO: ciclo.pago, weekIdx: assignFor.weekIdx, incomeTemplateId: assignFor.incomeId, creditAccountId, amount }); setAssignFor(null); }} />}
      {addingCompromisoFor && <CompromisoModal info={addingCompromisoFor} budgetCategories={budgetCategories} onClose={() => setAddingCompromisoFor(null)} onSave={(label, amount, categoryId, subcategoryId) => { onAddCompromiso({ pagoISO: ciclo.pago, weekIdx: addingCompromisoFor.weekIdx, incomeTemplateId: addingCompromisoFor.incomeId, label, amount, categoryId, subcategoryId }); setAddingCompromisoFor(null); }} />}
    </div>
  );
}

function AccCard({ acc, movements, ciclo, budgetCategories, balanceFor, onDeleteAccount }) {
  const [open, setOpen] = useState(false);
  const esCredito = acc.type === "Crédito";
  const gastoCiclo = Math.abs(balanceFor(acc));
  const accMovs = movements.filter((m) => m.accountId === acc.id && m.date >= ciclo.inicio && m.date <= ciclo.finGasto).sort((a, b) => a.date < b.date ? 1 : -1);
  return (
    <div style={{ background: "#fff", border: "1px solid #E5DFD0", borderRadius: 14, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: acc.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{esCredito ? <CreditCard size={18} /> : <Wallet size={18} />}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{acc.name}</div>
            <div style={{ fontSize: 11, color: "#A39E8F" }}>{acc.type} · {accMovs.length} mov. este ciclo</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ textAlign: "right" }}>
            <div className="dp" style={{ fontSize: 16, fontWeight: 600, color: esCredito && gastoCiclo > 0 ? "#B1645B" : "#6B8F71" }}>{fmt(gastoCiclo)}</div>
            <div style={{ fontSize: 10, color: "#A39E8F" }}>{esCredito ? "gastado" : "ingresado"}</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDeleteAccount(acc.id); }} style={{ background: "none", border: "none", color: "#C9BFA8" }}><Trash2 size={14} /></button>
        </div>
      </button>
      {open && (
        <div style={{ borderTop: "1px solid #F0ECE0", background: "#FAF8F2" }}>
          {accMovs.length === 0
            ? <div style={{ padding: "12px 16px", fontSize: 12, color: "#A39E8F" }}>Sin movimientos en este ciclo.</div>
            : accMovs.map((m) => {
                const catName = budgetCategories.find((c) => c.id === m.categoryId)?.name;
                const subName = budgetCategories.find((c) => c.id === m.categoryId)?.subcategories?.find((s) => s.id === m.subcategoryId)?.name;
                return (
                  <div key={m.id} style={{ padding: "8px 16px", borderTop: "1px solid #F0ECE0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{m.label || subName || "—"}</div>
                      <div style={{ fontSize: 11, color: "#A39E8F" }}>{new Date(m.date+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})} · {catName}{subName ? ` › ${subName}` : ""}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: m.kind === "ingreso" ? "#6B8F71" : "#B1645B" }}>{m.kind === "ingreso" ? "+" : "−"}{fmt(m.amount)}</div>
                  </div>
                );
              })
          }
        </div>
      )}
    </div>
  );
}

function CuentasView({ accounts, movements, budgetCategories, ciclo, semanasGasto, onAddAccount, onDeleteAccount }) {
  const balanceFor = (acc) => {
    const movs = movements.filter((m) => m.accountId === acc.id && m.date >= ciclo.inicio && m.date <= ciclo.finGasto);
    return movs.filter((m) => m.kind === "ingreso").reduce((s, m) => s + Number(m.amount), 0) - movs.filter((m) => m.kind === "gasto").reduce((s, m) => s + Number(m.amount), 0);
  };

  return (
    <div>
      {/* Configuración del ciclo */}
      <div style={{ background: "#fff", border: "1px solid #E5DFD0", borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Ciclo activo · {ciclo.label}</div>
        <div style={{ fontSize: 12, color: "#7A7568", marginBottom: 10 }}>
          {semanasGasto.map((w, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 2 }}>
              <span style={{ color: "#A39E8F" }}>S{i+1}</span>
              <span>{new Date(w.start+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})} – {new Date(w.end+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})}</span>
            </div>
          ))}
          <div style={{ marginTop: 6, color: "#A39E8F" }}>Pago {new Date(ciclo.pago+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})}</div>
        </div>
      </div>
      {accounts.length === 0 ? <div style={{ textAlign: "center", padding: "40px 20px", color: "#A39E8F" }}><Wallet size={32} style={{ marginBottom: 10, opacity: 0.5 }} /><div style={{ fontSize: 14 }}>Aún no agregas cuentas.</div></div>
        : <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            {accounts.map((acc) => <AccCard key={acc.id} acc={acc} movements={movements} ciclo={ciclo} budgetCategories={budgetCategories} balanceFor={balanceFor} onDeleteAccount={onDeleteAccount} />)}
          </div>
      }
      <button onClick={onAddAccount} style={{ width: "100%", padding: 14, background: "#fff", border: "1.5px dashed #C9BFA8", borderRadius: 14, color: "#7A7568", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Plus size={16} /> Agregar cuenta</button>
    </div>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(28,37,65,0.5)", display: "flex", alignItems: "flex-end", zIndex: 50 }}>
      <div style={{ background: "#F7F4EC", width: "100%", maxHeight: "88vh", overflowY: "auto", borderRadius: "20px 20px 0 0", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="dp" style={{ fontSize: 18, fontWeight: 600, color: "#1C2541" }}>{title}</div>
          <button onClick={onClose} style={{ background: "#fff", border: "1px solid #E5DFD0", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const iS = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #E5DFD0", fontSize: 14, marginBottom: 12, background: "#fff", color: "#1C2541" };
const lS = { fontSize: 12, fontWeight: 600, color: "#7A7568", marginBottom: 4, display: "block" };

function AddMovementModal({ accounts, budgetCategories, ciclo, initial, onClose, onSave }) {
  const isEdit = !!initial;
  const [kind, setKind] = useState(initial?.kind || "gasto"); const [amount, setAmount] = useState(initial?.amount ?? ""); const [accountId, setAccountId] = useState(initial?.accountId || accounts[0]?.id || "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId || budgetCategories[0]?.id || ""); const [subcategoryId, setSubcategoryId] = useState(initial?.subcategoryId || budgetCategories[0]?.subcategories[0]?.id || "");
  const [label, setLabel] = useState(initial?.label || ""); const [date, setDate] = useState(initial?.date || todayISO);
  const currentCat = budgetCategories.find((c) => c.id === categoryId);
  const subOptions = currentCat?.subcategories || [];
  const categoriaHuerfana = kind === "gasto" && categoryId && !currentCat;
  const subcategoriaHuerfana = kind === "gasto" && !categoriaHuerfana && subcategoryId && !subOptions.some((s) => s.id === subcategoryId);
  const handleCategoryChange = (id) => { setCategoryId(id); const cat = budgetCategories.find((c) => c.id === id); setSubcategoryId(cat?.subcategories[0]?.id || ""); };
  const fueraDelCiclo = date < ciclo.inicio || date > ciclo.finGasto;
  const submit = () => { if (!amount || !accountId) return; if (kind === "gasto" && (!categoryId || !subcategoryId || categoriaHuerfana || subcategoriaHuerfana)) return; onSave({ kind, amount: Number(amount), accountId, categoryId, subcategoryId, label, date }); };
  return (
    <ModalShell title={isEdit ? "Editar movimiento" : "Nuevo movimiento"} onClose={onClose}>
      {categoriaHuerfana && (
        <div style={{ background: "#FEF3CD", border: "1px solid #F0D080", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#7A6020", marginBottom: 12 }}>
          ⚠️ Este gasto tiene una categoría que ya no existe (por eso aparecía sin asignar). Elige una categoría y subcategoría válidas abajo.
        </div>
      )}
      {subcategoriaHuerfana && (
        <div style={{ background: "#FEF3CD", border: "1px solid #F0D080", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#7A6020", marginBottom: 12 }}>
          ⚠️ Este gasto tiene una subcategoría que ya no existe (por eso aparecía sin asignar). Elige una subcategoría válida abajo.
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["gasto","ingreso"].map((k) => <button key={k} onClick={() => setKind(k)} style={{ flex: 1, padding: 10, borderRadius: 10, border: kind === k ? "1.5px solid #D87554" : "1px solid #E5DFD0", background: kind === k ? "#FBEEE8" : "#fff", fontSize: 13, fontWeight: 600, color: "#1C2541" }}>{k === "gasto" ? "Gasto" : "Ingreso"}</button>)}
      </div>
      <label style={lS}>Monto</label><input style={iS} type="number" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <label style={lS}>Cuenta</label>
      <select style={iS} value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}</select>
      {kind === "gasto" && (<>
        <label style={lS}>Categoría</label>
        <select style={iS} value={categoryId} onChange={(e) => handleCategoryChange(e.target.value)}>{categoriaHuerfana && <option value={categoryId}>⚠️ Categoría eliminada — elige otra</option>}{budgetCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <label style={lS}>Subcategoría</label>
        <select style={iS} value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)}>{subcategoriaHuerfana && <option value={subcategoryId}>⚠️ Subcategoría eliminada — elige otra</option>}{subOptions.length === 0 && <option value="">Sin subcategorías</option>}{subOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </>)}
      <label style={lS}>Descripción (opcional)</label><input style={iS} type="text" placeholder="Ej. Netflix, super…" value={label} onChange={(e) => setLabel(e.target.value)} />
      <label style={lS}>
        Fecha · ciclo {new Date(ciclo.inicio+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})} – {new Date(ciclo.finGasto+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})}
      </label>
      <input style={iS} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      {fueraDelCiclo && (
        <div style={{ background: "#FEF3CD", border: "1px solid #F0D080", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#7A6020", marginBottom: 12 }}>
          ⚠️ Esta fecha está fuera del ciclo activo — el movimiento se guardará pero no aparecerá en Presupuesto ni Apartados del ciclo actual.
        </div>
      )}
      <button onClick={submit} style={{ width: "100%", padding: 14, background: "#1C2541", color: "#F7F4EC", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, marginTop: 4 }}>{isEdit ? "Guardar cambios" : "Guardar"}</button>
    </ModalShell>
  );
}

function AddAccountModal({ onClose, onSave }) {
  const [name, setName] = useState(""); const [type, setType] = useState("Débito"); const [initialBalance, setInitialBalance] = useState(""); const [color, setColor] = useState(ACCOUNT_COLORS[0]);
  const submit = () => { if (!name) return; onSave({ name, type, initialBalance: Number(initialBalance || 0), color }); };
  return (
    <ModalShell title="Nueva cuenta" onClose={onClose}>
      <label style={lS}>Nombre</label><input style={iS} type="text" placeholder="Ej. BBVA débito, Amex…" value={name} onChange={(e) => setName(e.target.value)} />
      <label style={lS}>Tipo</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>{ACCOUNT_TYPES.map((t) => <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: 10, borderRadius: 10, border: type === t ? "1.5px solid #D87554" : "1px solid #E5DFD0", background: type === t ? "#FBEEE8" : "#fff", fontSize: 13, fontWeight: 600, color: "#1C2541" }}>{t}</button>)}</div>
      <label style={lS}>{type === "Crédito" ? "Saldo inicial (deuda actual)" : "Saldo inicial"}</label><input style={iS} type="number" placeholder="0" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} />
      <label style={lS}>Color</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>{ACCOUNT_COLORS.map((c) => <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: color === c ? "2.5px solid #1C2541" : "2px solid transparent" }} />)}</div>
      <button onClick={submit} style={{ width: "100%", padding: 14, background: "#1C2541", color: "#F7F4EC", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600 }}>Guardar cuenta</button>
    </ModalShell>
  );
}

function CompromisoModal({ info, budgetCategories, onClose, onSave }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(budgetCategories[0]?.id || "");
  const [subcategoryId, setSubcategoryId] = useState(budgetCategories[0]?.subcategories[0]?.id || "");
  const currentCat = budgetCategories.find((c) => c.id === categoryId);
  const subOptions = currentCat?.subcategories || [];
  const handleCategoryChange = (id) => { setCategoryId(id); const cat = budgetCategories.find((c) => c.id === id); setSubcategoryId(cat?.subcategories[0]?.id || ""); };
  const submit = () => { if (!label || !amount || !categoryId || !subcategoryId) return; onSave(label, Math.min(Number(amount), info.remaining), categoryId, subcategoryId); };
  return (
    <ModalShell title="Gasto proyectado en débito" onClose={onClose}>
      <div style={{ fontSize: 12, color: "#7A7568", marginBottom: 14 }}>Disponible sin asignar: <strong>{fmt(info.remaining)}</strong></div>
      <label style={lS}>Descripción</label>
      <input style={iS} type="text" placeholder="Ej. Mercado, Limpieza, Gasolina…" value={label} onChange={(e) => setLabel(e.target.value)} />
      <label style={lS}>Monto</label>
      <input style={iS} type="number" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <label style={lS}>Categoría</label>
      <select style={iS} value={categoryId} onChange={(e) => handleCategoryChange(e.target.value)}>{budgetCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <label style={lS}>Subcategoría</label>
      <select style={iS} value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)}>{subOptions.length === 0 && <option value="">Sin subcategorías</option>}{subOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <button onClick={submit} style={{ width: "100%", padding: 14, background: "#6B8F71", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600 }}>Agregar</button>
    </ModalShell>
  );
}

function AddIncomeModal({ accounts, numWeeks, onClose, onSave }) {
  const allWeeks = useMemo(() => Array.from({ length: numWeeks || 4 }, (_, i) => i + 1), [numWeeks]);
  const [person, setPerson] = useState(""); const [accountId, setAccountId] = useState(accounts[0]?.id || ""); const [amount, setAmount] = useState(""); const [weeks, setWeeks] = useState(allWeeks);
  const toggleWeek = (w) => setWeeks((p) => p.includes(w) ? p.filter((x) => x !== w) : [...p, w].sort());
  const submit = () => { if (!person || !amount || !accountId || weeks.length === 0) return; onSave({ person, accountId, amount: Number(amount), weeks }); };
  return (
    <ModalShell title="Ingreso recurrente" onClose={onClose}>
      <label style={lS}>¿Quién?</label><input style={iS} type="text" placeholder="Ej. Leo, Ceci…" value={person} onChange={(e) => setPerson(e.target.value)} />
      <label style={lS}>Cuenta de débito</label>
      <select style={iS} value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
      <label style={lS}>Monto por semana</label><input style={iS} type="number" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <label style={lS}>¿En qué semanas llega?</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>{allWeeks.map((w) => <button key={w} onClick={() => toggleWeek(w)} style={{ flex: "1 0 20%", padding: 10, borderRadius: 10, border: weeks.includes(w) ? "1.5px solid #D87554" : "1px solid #E5DFD0", background: weeks.includes(w) ? "#FBEEE8" : "#fff", fontSize: 13, fontWeight: 600, color: "#1C2541" }}>S{w}</button>)}</div>
      <button onClick={submit} style={{ width: "100%", padding: 14, background: "#1C2541", color: "#F7F4EC", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600 }}>Guardar</button>
    </ModalShell>
  );
}

function AssignModal({ info, creditAccounts, deudaPendiente, onClose, onSave }) {
  const [creditAccountId, setCreditAccountId] = useState(creditAccounts[0]?.id || ""); const [amount, setAmount] = useState(info.remaining || "");
  const submit = () => { if (!creditAccountId || !amount) return; onSave(creditAccountId, Math.min(Number(amount), info.remaining)); };
  return (
    <ModalShell title="Asignar a tarjeta" onClose={onClose}>
      <div style={{ fontSize: 12, color: "#7A7568", marginBottom: 14 }}>Disponible sin asignar: <strong>{fmt(info.remaining)}</strong></div>
      <label style={lS}>Tarjeta</label>
      <select style={iS} value={creditAccountId} onChange={(e) => setCreditAccountId(e.target.value)}>{creditAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} · falta {fmt(deudaPendiente(a.id))}</option>)}</select>
      <label style={lS}>Monto a asignar</label><input style={iS} type="number" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button onClick={submit} style={{ width: "100%", padding: 14, background: "#1C2541", color: "#F7F4EC", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600 }}>Asignar</button>
    </ModalShell>
  );
}
