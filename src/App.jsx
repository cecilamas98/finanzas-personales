import React, { useState, useEffect, useMemo } from "react";
import { storage } from './storage.js'
import { Plus, Trash2, Wallet, CreditCard, X, ChevronLeft, ChevronRight } from "lucide-react";

const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);
const toISO = (d) => d.toISOString().slice(0, 10);
const todayISO = toISO(new Date());

// --- Datos migrados del artifact anterior ---
const MIGRATED_ACCOUNTS = [{"name":"Citibanamex Leo","type":"Débito","initialBalance":0,"color":"#6B8F71","id":"acc_1781894776514"},{"name":"BanBajío Ceci","type":"Débito","initialBalance":0,"color":"#C9A04D","id":"acc_1781894809076"},{"name":"Stori Leo","type":"Crédito","initialBalance":0,"color":"#D87554","id":"acc_1781894815675"},{"name":"Didi Leo","type":"Crédito","initialBalance":0,"color":"#5B7DB1","id":"acc_1781894820384"},{"name":"Stori Ceci","type":"Crédito","initialBalance":0,"color":"#8C6BAE","id":"acc_1781894826483"},{"name":"Nu Ceci","type":"Crédito","initialBalance":0,"color":"#B1645B","id":"acc_1781894832783"},{"name":"Plata Ceci","type":"Crédito","initialBalance":0,"color":"#4F9DA6","id":"acc_1781894838918"},{"name":"Por pagar Ceci","type":"Crédito","initialBalance":0,"color":"#A6A15B","id":"acc_1781895252349"}];
const MIGRATED_MOVEMENTS = [{"kind":"gasto","amount":932,"accountId":"acc_1781894826483","categoryId":"cat_esteban","subcategoryId":"sub_panales","label":"Pañales día y noche","date":"2026-06-13","id":"mov_1781895006825"},{"kind":"gasto","amount":932,"accountId":"acc_1781894826483","categoryId":"cat_esteban","subcategoryId":"sub_panales","label":"Pañales","date":"2026-06-19","id":"mov_1781895107228"},{"kind":"gasto","amount":587,"accountId":"acc_1781894826483","categoryId":"cat_esteban","subcategoryId":"sub_farmacia","label":"Probióticos, crema rozaduras ","date":"2026-06-19","id":"mov_1781895190190"},{"kind":"gasto","amount":132,"accountId":"acc_1781895252349","categoryId":"cat_esteban","subcategoryId":"sub_farmacia","label":"Crema golpes","date":"2026-06-19","id":"mov_1781895278906"},{"kind":"gasto","amount":430,"accountId":"acc_1781895252349","categoryId":"cat_alimentos","subcategoryId":"sub_mercado","label":"Proteína Ceci","date":"2026-06-19","id":"mov_1781895438897"},{"kind":"gasto","amount":500,"accountId":"acc_1781895252349","categoryId":"cat_casa","subcategoryId":"sub_adquis","label":"Fumigación ","date":"2026-06-19","id":"mov_1781895454006"},{"kind":"gasto","amount":524,"accountId":"acc_1781895252349","categoryId":"cat_casa","subcategoryId":"sub_internet","label":"Movistar","date":"2026-06-19","id":"mov_1781895474427"},{"kind":"gasto","amount":205,"accountId":"acc_1781894838918","categoryId":"cat_transporte","subcategoryId":"sub_taxis","label":"Uber","date":"2026-06-19","id":"mov_1781895512542"},{"kind":"gasto","amount":1288,"accountId":"acc_1781894838918","categoryId":"cat_alimentos","subcategoryId":"sub_mercado","label":"Walmart semana 1","date":"2026-06-19","id":"mov_1781895534919"},{"kind":"gasto","amount":786,"accountId":"acc_1781894838918","categoryId":"cat_alimentos","subcategoryId":"sub_comerfuera","label":"Alitas y McDonald's","date":"2026-06-19","id":"mov_1781895581998"},{"kind":"gasto","amount":800,"accountId":"acc_1781894820384","categoryId":"cat_alimentos","subcategoryId":"sub_aguatiendas","label":"Partido México","date":"2026-06-19","id":"mov_1781896315987"},{"kind":"gasto","amount":200,"accountId":"acc_1781894820384","categoryId":"cat_alimentos","subcategoryId":"sub_comerfuera","label":"Partido México ","date":"2026-06-19","id":"mov_1781896348837"},{"kind":"gasto","amount":375,"accountId":"acc_1781894838918","categoryId":"cat_casa","subcategoryId":"sub_internet","label":"Atnt","date":"2026-06-19","id":"mov_1781896408478"},{"kind":"gasto","amount":720,"accountId":"acc_1781895252349","categoryId":"cat_alimentos","subcategoryId":"sub_mercado","label":"Walmart","date":"2026-06-20","id":"mov_1782138382204"}];
const MIGRATED_BUDGET = [{"name":"Casa","id":"cat_casa","subcategories":[{"id":"sub_internet","name":"Internet y Teléfono","budget":840},{"id":"sub_adquis","name":"Adquisiciones","budget":500},{"id":"sub_apps","name":"Apps","budget":490},{"id":"sub_alquiler","name":"Alquiler","budget":6000},{"id":"sub_limpieza","name":"Limpieza","budget":1600}]},{"name":"Alimentos","id":"cat_alimentos","subcategories":[{"id":"sub_mercado","name":"Mercado","budget":6000},{"id":"sub_comerfuera","name":"Comer fuera","budget":2400},{"id":"sub_croquetas","name":"Croquetas","budget":800},{"id":"sub_aguatiendas","name":"Agua y tienditas","budget":800}]},{"name":"Transporte","id":"cat_transporte","subcategories":[{"id":"sub_taxis","name":"Taxis","budget":1000},{"id":"sub_gasolina","name":"Gasolina","budget":2000}]},{"name":"Esteban","id":"cat_esteban","subcategories":[{"id":"sub_farmacia","name":"Farmacia","budget":300},{"id":"sub_panales","name":"Pañales","budget":1000},{"id":"sub_1781895061557","name":"Pediatra","budget":500}]},{"name":"Deudas","id":"cat_deudas","subcategories":[{"id":"sub_bravoleo","name":"Bravo Leo","budget":5300},{"id":"sub_bravoceci","name":"Bravo Ceci","budget":9500},{"id":"sub_iteso","name":"Iteso","budget":4000}]},{"name":"Otros","id":"cat_otros","subcategories":[{"id":"sub_salud","name":"Salud","budget":0},{"id":"sub_gustos","name":"Gustos","budget":0},{"id":"sub_viajes","name":"Viajes","budget":0}]}];
const MIGRATED_INCOME = [{"person":"Leo","accountId":"acc_1781894776514","amount":7500,"weeks":[1,2,3,4],"id":"inc_1781895674629"},{"person":"Ceci","accountId":"acc_1781894809076","amount":6500,"weeks":[2,4],"id":"inc_1781895687442"}];

// ── CICLO CONFIGURABLE ──────────────────────────────────────────────
// El usuario define el domingo de inicio de su ciclo (ej. "2026-06-14").
// A partir de ahí:
//   Semanas de GASTO  : inicio → inicio + 27 días (4 semanas exactas)
//   Semanas de APARTO : inicio + 16 días → día 30 del mes siguiente al inicio
//   Fecha de PAGO     : día 30 del mes siguiente al inicio

function getCicloFromDomingo(domingoISO) {
  const inicio = new Date(domingoISO + "T00:00:00");
  const finGasto = new Date(inicio);
  finGasto.setDate(finGasto.getDate() + 27); // 4 semanas

  // Pago: día 30 del mes SIGUIENTE al inicio
  const pagoMes = inicio.getMonth() + 1 > 11 ? 0 : inicio.getMonth() + 1;
  const pagoYear = inicio.getMonth() + 1 > 11 ? inicio.getFullYear() + 1 : inicio.getFullYear();
  const maxDay = new Date(pagoYear, pagoMes + 1, 0).getDate();
  const pago = new Date(pagoYear, pagoMes, Math.min(30, maxDay));

  // Apartados: inicio + 16 días hasta el día de pago
  const inicioApartado = new Date(inicio);
  inicioApartado.setDate(inicioApartado.getDate() + 16);

  const label = pago.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  return {
    inicio: toISO(inicio),
    finGasto: toISO(finGasto),
    inicioApartado: toISO(inicioApartado),
    pago: toISO(pago),
    label: label.charAt(0).toUpperCase() + label.slice(1),
  };
}

// Para compatibilidad con el resto del código (presupuesto usa periodo.inicio y periodo.fin)
function getPeriodoFromDomingo(domingoISO) {
  const c = getCicloFromDomingo(domingoISO);
  return { inicio: c.inicio, fin: c.finGasto, pago: c.pago, label: c.label };
}

// Dado hoy, encuentra el domingo de inicio del ciclo activo
// basándose en el domingo de referencia guardado
function getCicloActivo(domingoRef) {
  const ref = new Date(domingoRef + "T00:00:00");
  const today = new Date(todayISO + "T00:00:00");
  // Avanzar de 4 en 4 semanas desde ref hasta encontrar el ciclo que contiene hoy
  let cursor = new Date(ref);
  while (true) {
    const finGasto = new Date(cursor);
    finGasto.setDate(finGasto.getDate() + 27);
    if (today <= finGasto) return toISO(cursor);
    cursor.setDate(cursor.getDate() + 28);
  }
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

function getSubcatName(bc, catId, subId) { return bc.find((c) => c.id === catId)?.subcategories.find((s) => s.id === subId)?.name || null; }
function getCatName(bc, catId) { return bc.find((c) => c.id === catId)?.name || null; }

const ACCOUNT_TYPES = ["Débito", "Crédito"];
const ACCOUNT_COLORS = ["#6B8F71", "#C9A04D", "#D87554", "#5B7DB1", "#8C6BAE", "#B1645B", "#4F9DA6", "#A6A15B"];
const DEFAULT_DOMINGO = "2026-06-14"; // domingo de inicio del ciclo actual

export default function FinanzasApp() {
  const [accounts, setAccounts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [budgetCategories, setBudgetCategories] = useState([]);
  const [incomeTemplate, setIncomeTemplate] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [domingoRef, setDomingoRef] = useState(DEFAULT_DOMINGO);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("presupuesto");
  const [showAddMov, setShowAddMov] = useState(false);
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      let acc = [], mov = [], bc = [], inc = [], asg = [];
      try { const r = await storage.get("accounts"); acc = r ? JSON.parse(r.value) : []; } catch { acc = []; }
      try { const r = await storage.get("movements"); mov = r ? JSON.parse(r.value) : []; } catch { mov = []; }
      try { const r = await storage.get("budgetCategories"); bc = r ? JSON.parse(r.value) : []; } catch { bc = []; }
      try { const r = await storage.get("incomeTemplate"); inc = r ? JSON.parse(r.value) : []; } catch { inc = []; }
      try { const r = await storage.get("asignaciones"); asg = r ? JSON.parse(r.value) : []; } catch { asg = []; }
      try { const r = await storage.get("domingoRef"); if (r?.value) setDomingoRef(r.value); } catch {}

      if (acc.length === 0) {
        acc = MIGRATED_ACCOUNTS;
        mov = mov.length === 0 ? MIGRATED_MOVEMENTS : mov;
        bc = bc.length === 0 ? MIGRATED_BUDGET : bc;
        inc = inc.length === 0 ? MIGRATED_INCOME : inc;
        await storage.set("accounts", JSON.stringify(acc));
        await storage.set("movements", JSON.stringify(mov));
        await storage.set("budgetCategories", JSON.stringify(bc));
        await storage.set("incomeTemplate", JSON.stringify(inc));
      }

      setAccounts(acc);
      setMovements(mov);
      setBudgetCategories(bc.length > 0 ? bc : MIGRATED_BUDGET);
      setIncomeTemplate(inc);
      setAsignaciones(asg);
      setLoaded(true);
    })();
  }, []);

  const saveDomingo = async (val) => {
    setDomingoRef(val);
    await storage.set("domingoRef", val);
  };

  const persist = async (key, value) => {
    const res = await storage.set(key, JSON.stringify(value));
    if (!res) setError(`No se pudo guardar (${key}). Verifica tu conexión.`);
    return res;
  };

  const addAccount = (a) => { const n = [...accounts, { ...a, id: "acc_" + Date.now() }]; setAccounts(n); persist("accounts", n); };
  const deleteAccount = (id) => { const n = accounts.filter((a) => a.id !== id); setAccounts(n); persist("accounts", n); };
  const addMovement = (m) => { const n = [...movements, { ...m, id: "mov_" + Date.now() }]; setMovements(n); persist("movements", n); };
  const deleteMovement = (id) => { const n = movements.filter((m) => m.id !== id); setMovements(n); persist("movements", n); };
  const addIncomeTemplate = (i) => { const n = [...incomeTemplate, { ...i, id: "inc_" + Date.now() }]; setIncomeTemplate(n); persist("incomeTemplate", n); };
  const deleteIncomeTemplate = (id) => { const n = incomeTemplate.filter((i) => i.id !== id); setIncomeTemplate(n); persist("incomeTemplate", n); const na = asignaciones.filter((a) => a.incomeTemplateId !== id); setAsignaciones(na); persist("asignaciones", na); };
  const addAsignacion = (a) => { const n = [...asignaciones, { ...a, id: "asg_" + Date.now() }]; setAsignaciones(n); persist("asignaciones", n); };
  const deleteAsignacion = (id) => { const n = asignaciones.filter((a) => a.id !== id); setAsignaciones(n); persist("asignaciones", n); };
  const updateSubcategoryBudget = (catId, subId, b) => { const n = budgetCategories.map((c) => c.id === catId ? { ...c, subcategories: c.subcategories.map((s) => s.id === subId ? { ...s, budget: b } : s) } : c); setBudgetCategories(n); persist("budgetCategories", n); };
  const addSubcategory = (catId, name, budget) => { const n = budgetCategories.map((c) => c.id === catId ? { ...c, subcategories: [...c.subcategories, { id: "sub_" + Date.now(), name, budget }] } : c); setBudgetCategories(n); persist("budgetCategories", n); };
  const deleteSubcategory = (catId, subId) => { const n = budgetCategories.map((c) => c.id === catId ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subId) } : c); setBudgetCategories(n); persist("budgetCategories", n); };
  const addCategory = (name) => { const n = [...budgetCategories, { id: "cat_" + Date.now(), name, subcategories: [] }]; setBudgetCategories(n); persist("budgetCategories", n); };
  const deleteCategory = (catId) => { const n = budgetCategories.filter((c) => c.id !== catId); setBudgetCategories(n); persist("budgetCategories", n); };

  // Todo el ciclo se deriva del domingo de referencia
  const domingoActivo = useMemo(() => getCicloActivo(domingoRef), [domingoRef]);
  const ciclo = useMemo(() => getCicloFromDomingo(domingoActivo), [domingoActivo]);
  const periodo = useMemo(() => ({ inicio: ciclo.inicio, fin: ciclo.finGasto, pago: ciclo.pago, label: ciclo.label }), [ciclo]);
  const semanasGasto = useMemo(() => getWeekRanges(ciclo.inicio, ciclo.finGasto), [ciclo]);
  const semanasApartado = useMemo(() => getWeekRanges(ciclo.inicioApartado, ciclo.pago), [ciclo]);

  const periodMovements = useMemo(() => movements.filter((m) => m.date >= periodo.inicio && m.date <= periodo.fin), [movements, periodo]);
  const ingresos = periodMovements.filter((m) => m.kind === "ingreso").reduce((s, m) => s + Number(m.amount), 0);
  const egresos = periodMovements.filter((m) => m.kind === "gasto").reduce((s, m) => s + Number(m.amount), 0);
  const balance = ingresos - egresos;

  if (!loaded) return <div style={{ minHeight: "100vh", background: "#F7F4EC", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: "#1C2541" }}>Cargando…</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#F7F4EC", fontFamily: "system-ui, -apple-system, sans-serif", color: "#1C2541" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap'); .dp{font-family:'Fraunces',serif} *{box-sizing:border-box} button{cursor:pointer;font-family:inherit}`}</style>
      <div style={{ background: "#1C2541", color: "#F7F4EC", padding: "24px 20px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.6, letterSpacing: 1, textTransform: "uppercase" }}>Finanzas personales · {ciclo.label}</div>
            <div className="dp" style={{ fontSize: 28, fontWeight: 600, marginTop: 2 }}>{fmt(balance)}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
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
        {tab === "presupuesto" && <PresupuestoView budgetCategories={budgetCategories} movements={movements} accounts={accounts} periodo={periodo} ciclo={ciclo} onUpdateBudget={updateSubcategoryBudget} onAddSubcategory={addSubcategory} onDeleteSubcategory={deleteSubcategory} onAddCategory={addCategory} onDeleteCategory={deleteCategory} />}
        {tab === "apartados" && <ApartadosView accounts={accounts} movements={movements} incomeTemplate={incomeTemplate} asignaciones={asignaciones} ciclo={ciclo} semanasApartado={semanasApartado} onAddIncome={addIncomeTemplate} onDeleteIncome={deleteIncomeTemplate} onAddAsignacion={addAsignacion} onDeleteAsignacion={deleteAsignacion} />}
        {tab === "cuentas" && <CuentasView accounts={accounts} movements={movements} budgetCategories={budgetCategories} domingoRef={domingoRef} onSaveDomingo={saveDomingo} ciclo={ciclo} semanasGasto={semanasGasto} onAddAccount={() => setShowAddAcc(true)} onDeleteAccount={deleteAccount} />}
      </div>

      {accounts.length > 0 && <button onClick={() => setShowAddMov(true)} style={{ position: "fixed", bottom: 24, right: 24, width: 56, height: 56, borderRadius: "50%", background: "#D87554", color: "#fff", border: "none", boxShadow: "0 4px 14px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={26} /></button>}
      {showAddMov && <AddMovementModal accounts={accounts} budgetCategories={budgetCategories} ciclo={ciclo} onClose={() => setShowAddMov(false)} onSave={(m) => { addMovement(m); setShowAddMov(false); }} />}
      {showAddAcc && <AddAccountModal onClose={() => setShowAddAcc(false)} onSave={(a) => { addAccount(a); setShowAddAcc(false); }} />}
    </div>
  );
}

function PresupuestoView({ budgetCategories, movements, accounts, periodo, ciclo, onUpdateBudget, onAddSubcategory, onDeleteSubcategory, onAddCategory, onDeleteCategory }) {
  const [openCat, setOpenCat] = useState(null);
  const [openSub, setOpenSub] = useState(null);
  const [editingSub, setEditingSub] = useState(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [addingSubTo, setAddingSubTo] = useState(null);
  const periodMovs = useMemo(() => movements.filter((m) => m.kind === "gasto" && m.date >= ciclo.inicio && m.date <= ciclo.finGasto), [movements, ciclo]);
  const gastoPorSub = (subId) => periodMovs.filter((m) => m.subcategoryId === subId).reduce((s, m) => s + Number(m.amount), 0);
  const gastoPorCat = (catId) => periodMovs.filter((m) => m.categoryId === catId).reduce((s, m) => s + Number(m.amount), 0);
  const presupuestoPorCat = (cat) => cat.subcategories.reduce((s, sub) => s + Number(sub.budget || 0), 0);
  const totalPresupuestado = budgetCategories.reduce((s, c) => s + presupuestoPorCat(c), 0);
  const totalGastado = periodMovs.reduce((s, m) => s + Number(m.amount), 0);

  const MovRow = ({ m }) => {
    const acc = accounts.find((a) => a.id === m.accountId);
    const subName = budgetCategories.find((c) => c.id === m.categoryId)?.subcategories.find((s) => s.id === m.subcategoryId)?.name;
    return (
      <div style={{ padding: "8px 16px", borderTop: "1px solid #F7F4EC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: acc?.color || "#ccc", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{m.label || subName || "—"}</div>
            <div style={{ fontSize: 11, color: "#A39E8F" }}>{new Date(m.date+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})} · {acc?.name || "—"}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#B1645B" }}>−{fmt(m.amount)}</div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ background: "#fff", border: "1px solid #E5DFD0", borderRadius: 14, padding: 18, marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: "#A39E8F", textTransform: "uppercase", letterSpacing: 0.5 }}>Disponible</div>
        <div className="dp" style={{ fontSize: 28, fontWeight: 600, color: totalPresupuestado - totalGastado >= 0 ? "#1C2541" : "#B1645B", marginTop: 2 }}>{fmt(totalPresupuestado - totalGastado)}</div>
        <div style={{ fontSize: 12, color: "#A39E8F", marginTop: 2 }}>de {fmt(totalPresupuestado)} presupuestado · {periodo.label}</div>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {budgetCategories.map((cat) => {
          const presupuestado = presupuestoPorCat(cat);
          const gastado = gastoPorCat(cat.id);
          const pct = presupuestado > 0 ? Math.min(100, (gastado / presupuestado) * 100) : 0;
          const isOpen = openCat === cat.id;
          return (
            <div key={cat.id} style={{ background: "#fff", border: "1px solid #E5DFD0", borderRadius: 14, overflow: "hidden" }}>
              <button onClick={() => setOpenCat(isOpen ? null : cat.id)} style={{ width: "100%", padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <CircularPct pct={pct} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{cat.name}</div>
                    <div style={{ fontSize: 11, color: "#A39E8F" }}>{fmt(gastado)} de {fmt(presupuestado)}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="dp" style={{ fontSize: 15, fontWeight: 600, color: presupuestado - gastado >= 0 ? "#1C2541" : "#B1645B" }}>{fmt(presupuestado - gastado)}</div>
                  <div style={{ fontSize: 10, color: "#A39E8F" }}>disponible</div>
                </div>
              </button>
              {isOpen && (
                <div style={{ borderTop: "1px solid #F0ECE0" }}>
                  {cat.subcategories.map((sub) => {
                    const sg = gastoPorSub(sub.id);
                    const sp = sub.budget > 0 ? Math.min(100, (sg / sub.budget) * 100) : 0;
                    const sd = Number(sub.budget || 0) - sg;
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
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt(sg)}</div>
                              <button onClick={() => setEditingSub(editingSub === sub.id ? null : sub.id)} style={{ background: "none", border: "none", color: "#A39E8F", fontSize: 11 }}>editar</button>
                            </div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: sd >= 0 ? "#A39E8F" : "#B1645B", marginTop: 2 }}>
                            <span>{fmt(Math.max(0, sd))} disponible</span>
                            <span style={{ color: sp >= 100 ? "#B1645B" : "#6B8F71" }}>{Math.round(sp)}%</span>
                          </div>
                          <div style={{ height: 5, background: "#F0ECE0", borderRadius: 3, marginTop: 6 }}><div style={{ height: "100%", width: `${sp}%`, background: sp >= 100 ? "#B1645B" : "#C9A04D", borderRadius: 3 }} /></div>
                          {editingSub === sub.id && (
                            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                              <input type="number" defaultValue={sub.budget} onBlur={(e) => onUpdateBudget(cat.id, sub.id, Number(e.target.value || 0))} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #E5DFD0", fontSize: 13 }} />
                              <button onClick={() => { onDeleteSubcategory(cat.id, sub.id); setEditingSub(null); }} style={{ background: "none", border: "none", color: "#B1645B" }}><Trash2 size={14} /></button>
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
        <div style={{ fontSize: 13, fontWeight: 600, color: "#7A7568", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Últimos movimientos</div>
        <div style={{ background: "#fff", border: "1px solid #E5DFD0", borderRadius: 14, overflow: "hidden" }}>
          {periodMovs.length === 0
            ? <div style={{ padding: 16, fontSize: 13, color: "#A39E8F" }}>Sin movimientos en este ciclo.</div>
            : periodMovs.slice().sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 20).map((m) => {
                const acc = accounts.find((a) => a.id === m.accountId);
                const catName = budgetCategories.find((c) => c.id === m.categoryId)?.name;
                const subName = budgetCategories.find((c) => c.id === m.categoryId)?.subcategories.find((s) => s.id === m.subcategoryId)?.name;
                return (
                  <div key={m.id} style={{ padding: "10px 16px", borderTop: "1px solid #F0ECE0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: acc?.color || "#ccc", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{m.label || subName || "—"}</div>
                        <div style={{ fontSize: 11, color: "#A39E8F" }}>
                          {new Date(m.date+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})} · {acc?.name || "—"} · {catName}{subName ? ` › ${subName}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="dp" style={{ fontSize: 14, fontWeight: 600, color: m.kind === "ingreso" ? "#6B8F71" : "#B1645B" }}>
                      {m.kind === "ingreso" ? "+" : "−"}{fmt(m.amount)}
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


function ApartadosView({ accounts, movements, incomeTemplate, asignaciones, ciclo, semanasApartado, onAddIncome, onDeleteIncome, onAddAsignacion, onDeleteAsignacion }) {
  const creditAccounts = accounts.filter((a) => a.type === "Crédito");
  const debitAccounts = accounts.filter((a) => a.type === "Débito");
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [assignFor, setAssignFor] = useState(null);

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
      <div style={{ background: "#fff", border: "1px solid #E5DFD0", borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#7A7568", marginBottom: 2 }}>Gastos de {ciclo.label} · se pagan el {new Date(ciclo.pago+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"long"})}</div>
        <div style={{ fontSize: 12, color: "#A39E8F" }}>
          Gasto {new Date(ciclo.inicio+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})} – {new Date(ciclo.finGasto+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})} · Apartados {new Date(ciclo.inicioApartado+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})} – {new Date(ciclo.pago+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})}
        </div>
      </div>
      <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        {creditAccounts.map((acc) => {
          const deuda = totalDeudaFor(acc.id); const asignado = asignadoFor(acc.id); const falta = Math.max(0, deuda - asignado); const pct = deuda > 0 ? Math.min(100, (asignado / deuda) * 100) : 0;
          return (
            <div key={acc.id} style={{ background: "#fff", border: "1px solid #E5DFD0", borderRadius: 14, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 9, height: 9, borderRadius: "50%", background: acc.color }} /><div style={{ fontSize: 13, fontWeight: 600 }}>{acc.name}</div></div>
                <div className="dp" style={{ fontSize: 15, fontWeight: 600 }}>{fmt(deuda)}</div>
              </div>
              <div style={{ height: 6, background: "#F0ECE0", borderRadius: 3, marginBottom: 6 }}><div style={{ height: "100%", width: `${pct}%`, background: falta === 0 ? "#6B8F71" : "#C9A04D", borderRadius: 3 }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#A39E8F" }}><span>Asignado: {fmt(asignado)}</span><span>{falta === 0 ? "Cubierto ✓" : `Falta: ${fmt(falta)}`}</span></div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#7A7568", textTransform: "uppercase", letterSpacing: 0.5 }}>Ingresos por semana</div>
        <button onClick={() => setShowAddIncome(true)} style={{ background: "none", border: "none", color: "#D87554", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Plus size={14} /> Ingreso recurrente</button>
      </div>
      <div style={{ display: "grid", gap: 14, marginBottom: 16 }}>
        {semanasApartado.map((w, i) => {
          const weekIdx = i + 1;
          const incomesThisWeek = incomeTemplate.filter((inc) => inc.weeks.includes(weekIdx));
          const totalIncomeWeek = incomesThisWeek.reduce((s, inc) => s + Number(inc.amount), 0);
          const asignacionesWeek = asignaciones.filter((a) => a.pagoISO === ciclo.pago && a.weekIdx === weekIdx);
          const totalAsignadoWeek = asignacionesWeek.reduce((s, a) => s + Number(a.amount), 0);
          const libre = totalIncomeWeek - totalAsignadoWeek;
          const fase = weekIdx <= 2 ? "Gasta con tarjeta" : "Paga tarjeta · efectivo";
          const rng = `${new Date(w.start + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – ${new Date(w.end + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`;
          return (
            <div key={weekIdx} style={{ background: "#fff", border: "1px solid #E5DFD0", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", background: "#FAF8F2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>Semana {weekIdx}</div><div style={{ fontSize: 10, color: "#A39E8F" }}>{rng} · {fase}</div></div>
                <div className="dp" style={{ fontSize: 15, fontWeight: 600 }}>{fmt(totalIncomeWeek)}</div>
              </div>
              {incomesThisWeek.length === 0 ? <div style={{ padding: "12px 16px", fontSize: 12, color: "#A39E8F" }}>Sin ingreso programado.</div>
                : incomesThisWeek.map((inc) => {
                    const asigInc = asignaciones.filter((a) => a.pagoISO === ciclo.pago && a.weekIdx === weekIdx && a.incomeTemplateId === inc.id);
                    const usadoInc = asigInc.reduce((s, a) => s + Number(a.amount), 0);
                    const libreInc = Number(inc.amount) - usadoInc;
                    const accD = accounts.find((a) => a.id === inc.accountId);
                    return (
                      <div key={inc.id} style={{ padding: "10px 16px", borderTop: "1px solid #F0ECE0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{inc.person} <span style={{ color: "#A39E8F", fontWeight: 400 }}>· {accD?.name}</span></div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{fmt(inc.amount)}</div>
                        </div>
                        {asigInc.map((a) => {
                          const credAcc = accounts.find((x) => x.id === a.creditAccountId);
                          return (
                            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0 4px 12px", fontSize: 12 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#7A7568" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: credAcc?.color }} />→ {credAcc?.name}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontWeight: 600 }}>{fmt(a.amount)}</span><button onClick={() => onDeleteAsignacion(a.id)} style={{ background: "none", border: "none", color: "#C9BFA8" }}><X size={12} /></button></div>
                            </div>
                          );
                        })}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                          <span style={{ fontSize: 11, color: libreInc > 0 ? "#C9A04D" : "#A39E8F" }}>{libreInc > 0 ? `Sin asignar: ${fmt(libreInc)}` : "Totalmente asignado"}</span>
                          {libreInc > 0 && <button onClick={() => setAssignFor({ weekIdx, incomeId: inc.id, remaining: libreInc })} style={{ fontSize: 11, color: "#D87554", background: "none", border: "none", fontWeight: 600 }}>+ Asignar a tarjeta</button>}
                        </div>
                      </div>
                    );
                  })
              }
              <div style={{ padding: "8px 16px", borderTop: "1px solid #F0ECE0", display: "flex", justifyContent: "space-between", fontSize: 11, color: libre > 0 ? "#6B8F71" : "#A39E8F" }}>
                <span>Libre esta semana</span><span style={{ fontWeight: 600 }}>{fmt(libre)}</span>
              </div>
            </div>
          );
        })}
      </div>
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
      {showAddIncome && <AddIncomeModal accounts={debitAccounts} onClose={() => setShowAddIncome(false)} onSave={(inc) => { onAddIncome(inc); setShowAddIncome(false); }} />}
      {assignFor && <AssignModal info={assignFor} creditAccounts={creditAccounts} deudaPendiente={(accId) => Math.max(0, totalDeudaFor(accId) - asignadoFor(accId))} onClose={() => setAssignFor(null)} onSave={(creditAccountId, amount) => { onAddAsignacion({ pagoISO: ciclo.pago, weekIdx: assignFor.weekIdx, incomeTemplateId: assignFor.incomeId, creditAccountId, amount }); setAssignFor(null); }} />}
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

function CuentasView({ accounts, movements, budgetCategories, domingoRef, onSaveDomingo, ciclo, semanasGasto, onAddAccount, onDeleteAccount }) {
  const [editDomingo, setEditDomingo] = useState(false);
  const [tempDomingo, setTempDomingo] = useState(domingoRef);

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
          <div style={{ marginTop: 6, color: "#A39E8F" }}>Apartados {new Date(ciclo.inicioApartado+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})} → pago {new Date(ciclo.pago+"T00:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})}</div>
        </div>
        {editDomingo ? (
          <div>
            <div style={{ fontSize: 12, color: "#7A7568", marginBottom: 6 }}>Domingo de inicio del ciclo:</div>
            <input type="date" value={tempDomingo} onChange={(e) => setTempDomingo(e.target.value)} style={{ ...iS, marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditDomingo(false)} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #E5DFD0", background: "#fff", fontSize: 13 }}>Cancelar</button>
              <button onClick={() => { onSaveDomingo(tempDomingo); setEditDomingo(false); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", background: "#1C2541", color: "#fff", fontSize: 13, fontWeight: 600 }}>Actualizar ciclo</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setTempDomingo(domingoRef); setEditDomingo(true); }} style={{ fontSize: 12, color: "#D87554", background: "none", border: "none", fontWeight: 600, padding: 0 }}>
            Cambiar domingo de inicio
          </button>
        )}
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

function AddMovementModal({ accounts, budgetCategories, ciclo, onClose, onSave }) {
  const [kind, setKind] = useState("gasto"); const [amount, setAmount] = useState(""); const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [categoryId, setCategoryId] = useState(budgetCategories[0]?.id || ""); const [subcategoryId, setSubcategoryId] = useState(budgetCategories[0]?.subcategories[0]?.id || "");
  const [label, setLabel] = useState(""); const [date, setDate] = useState(todayISO);
  const currentCat = budgetCategories.find((c) => c.id === categoryId);
  const subOptions = currentCat?.subcategories || [];
  const handleCategoryChange = (id) => { setCategoryId(id); const cat = budgetCategories.find((c) => c.id === id); setSubcategoryId(cat?.subcategories[0]?.id || ""); };
  const fueraDelCiclo = date < ciclo.inicio || date > ciclo.finGasto;
  const submit = () => { if (!amount || !accountId) return; if (kind === "gasto" && (!categoryId || !subcategoryId)) return; onSave({ kind, amount: Number(amount), accountId, categoryId, subcategoryId, label, date }); };
  return (
    <ModalShell title="Nuevo movimiento" onClose={onClose}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["gasto","ingreso"].map((k) => <button key={k} onClick={() => setKind(k)} style={{ flex: 1, padding: 10, borderRadius: 10, border: kind === k ? "1.5px solid #D87554" : "1px solid #E5DFD0", background: kind === k ? "#FBEEE8" : "#fff", fontSize: 13, fontWeight: 600, color: "#1C2541" }}>{k === "gasto" ? "Gasto" : "Ingreso"}</button>)}
      </div>
      <label style={lS}>Monto</label><input style={iS} type="number" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <label style={lS}>Cuenta</label>
      <select style={iS} value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}</select>
      {kind === "gasto" && (<>
        <label style={lS}>Categoría</label>
        <select style={iS} value={categoryId} onChange={(e) => handleCategoryChange(e.target.value)}>{budgetCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <label style={lS}>Subcategoría</label>
        <select style={iS} value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)}>{subOptions.length === 0 && <option value="">Sin subcategorías</option>}{subOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
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
      <button onClick={submit} style={{ width: "100%", padding: 14, background: "#1C2541", color: "#F7F4EC", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, marginTop: 4 }}>Guardar</button>
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

function AddIncomeModal({ accounts, onClose, onSave }) {
  const [person, setPerson] = useState(""); const [accountId, setAccountId] = useState(accounts[0]?.id || ""); const [amount, setAmount] = useState(""); const [weeks, setWeeks] = useState([1,2,3,4]);
  const toggleWeek = (w) => setWeeks((p) => p.includes(w) ? p.filter((x) => x !== w) : [...p, w].sort());
  const submit = () => { if (!person || !amount || !accountId || weeks.length === 0) return; onSave({ person, accountId, amount: Number(amount), weeks }); };
  return (
    <ModalShell title="Ingreso recurrente" onClose={onClose}>
      <label style={lS}>¿Quién?</label><input style={iS} type="text" placeholder="Ej. Leo, Ceci…" value={person} onChange={(e) => setPerson(e.target.value)} />
      <label style={lS}>Cuenta de débito</label>
      <select style={iS} value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
      <label style={lS}>Monto por semana</label><input style={iS} type="number" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <label style={lS}>¿En qué semanas llega?</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>{[1,2,3,4].map((w) => <button key={w} onClick={() => toggleWeek(w)} style={{ flex: 1, padding: 10, borderRadius: 10, border: weeks.includes(w) ? "1.5px solid #D87554" : "1px solid #E5DFD0", background: weeks.includes(w) ? "#FBEEE8" : "#fff", fontSize: 13, fontWeight: 600, color: "#1C2541" }}>S{w}</button>)}</div>
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
