import { useEffect, useMemo, useState } from "react";

import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const EXPENSE_API_URL = "http://localhost:5000/api/expenses";
const INCOME_API_URL = "http://localhost:5000/api/incomes";

const CATEGORIES = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Salary",
  "General",
];

function formatISODate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // normalize to YYYY-MM-DD for <input type="date" />
  return d.toISOString().slice(0, 10);
}

function App() {
  const [theme, setTheme] = useState(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("theme") : null;
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const rootClass =
    theme === "dark"
      ? "min-h-screen bg-slate-950 text-slate-100"
      : "min-h-screen bg-slate-50 text-slate-900";

  const headingClass = theme === "dark" ? "text-2xl font-semibold mb-6" : "text-2xl font-semibold mb-6";

  return (
    <div className={rootClass}>
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className={headingClass}>Expense Tracker</h1>
            <p className={theme === "dark" ? "text-xs text-slate-400" : "text-xs text-slate-500"}>
              Dashboard, charts, filters, export, and theme.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className={
              "rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 " +
              (theme === "dark"
                ? "bg-slate-900/30 border-slate-700 text-slate-200 hover:bg-slate-900/50"
                : "bg-white border-slate-300 text-slate-800 hover:bg-slate-100")
            }
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>

        <ExpenseIncomeTracker theme={theme} />
      </main>
    </div>
  );
}


function ExpenseIncomeTracker({ theme }) {
  const [tab, setTab] = useState("expense"); // 'expense' | 'income'

  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);

  // Filters
  const [filterCategory, setFilterCategory] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [exporting, setExporting] = useState(false);


  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingIncomes, setLoadingIncomes] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "",
    date: "",
  });

  const apiUrl = tab === "expense" ? EXPENSE_API_URL : INCOME_API_URL;
  const list = tab === "expense" ? expenses : incomes;
  const loading = tab === "expense" ? loadingExpenses : loadingIncomes;

  const activeCurrency = "₹";

  const filteredList = useMemo(() => {
    const cat = (filterCategory || "All").trim();
    const fromMs = fromDate ? new Date(fromDate).getTime() : null;
    const toMs = toDate ? new Date(toDate).getTime() : null;

    return (list || []).filter((x) => {
      const xCat = (x.category || "General").trim();
      if (cat !== "All" && xCat !== cat) return false;

      if (fromMs != null) {
        const d = x.date ? new Date(x.date).getTime() : null;
        if (d == null || d < fromMs) return false;
      }
      if (toMs != null) {
        const d = x.date ? new Date(x.date).getTime() : null;
        if (d == null || d > toMs) return false;
      }
      return true;
    });
  }, [filterCategory, fromDate, toDate, list]);

  const filteredTotals = useMemo(() => {
    const total = filteredList.reduce((sum, x) => sum + Number(x.amount || 0), 0);
    return total;
  }, [filteredList]);


  const totalIncome = useMemo(
    () => incomes.reduce((sum, x) => sum + Number(x.amount || 0), 0),
    [incomes]
  );
  const totalExpense = useMemo(
    () => expenses.reduce((sum, x) => sum + Number(x.amount || 0), 0),
    [expenses]
  );

  const net = useMemo(() => totalIncome - totalExpense, [totalIncome, totalExpense]);

  const amountNumber = Number(form.amount);
  const isFormValid = useMemo(() => {
    const titleOk = typeof form.title === "string" && form.title.trim().length > 0;
    const amountOk = Number.isFinite(amountNumber) && amountNumber > 0;
    return titleOk && amountOk;
  }, [form.title, amountNumber]);

  useEffect(() => {
    fetchExpenses();
    fetchIncomes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchExpenses() {
    setLoadingExpenses(true);
    setError("");
    try {
      const res = await axios.get(EXPENSE_API_URL);
      setExpenses(res.data);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load expenses");
    } finally {
      setLoadingExpenses(false);
    }
  }

  async function fetchIncomes() {
    setLoadingIncomes(true);
    setError("");
    try {
      const res = await axios.get(INCOME_API_URL);
      setIncomes(res.data);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load incomes");
    } finally {
      setLoadingIncomes(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isFormValid) return;

    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        amount: amountNumber,
        category: (form.category || "").trim() || "General",
        date: form.date || new Date(),
      };

      await axios.post(apiUrl, payload);
      setForm({ title: "", amount: "", category: "", date: "" });

      if (tab === "expense") await fetchExpenses();
      else await fetchIncomes();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          (tab === "expense" ? "Failed to save expense" : "Failed to save income")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setError("");
    try {
      await axios.delete(`${apiUrl}/${id}`);
      if (tab === "expense") await fetchExpenses();
      else await fetchIncomes();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          (tab === "expense" ? "Failed to delete expense" : "Failed to delete income")
      );
    }
  }

  const isExpense = tab === "expense";

  return (
    <div className="space-y-6">
      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-4">
          <p className="text-xs text-slate-400">Total Income</p>
          <p className="text-lg font-semibold text-emerald-300">
            {activeCurrency}
            {totalIncome.toFixed(2)}
          </p>
        </div>
        <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-4">
          <p className="text-xs text-slate-400">Total Expense</p>
          <p className="text-lg font-semibold text-sky-300">
            {activeCurrency}
            {(tab === "expense" ? filteredTotals : totalExpense).toFixed(2)}
          </p>
        </div>
        <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-4">
          <p className="text-xs text-slate-400">Net</p>
          <p
            className={
              "text-lg font-semibold " +
              ((tab === "expense" ? totalIncome - filteredTotals : net) >= 0
                ? "text-emerald-300"
                : "text-rose-300")
            }
          >
            {activeCurrency}
            {(tab === "expense" ? totalIncome - filteredTotals : net).toFixed(2)}
          </p>
        </div>
      </div>


      {/* Filters + Charts */}
      <div className="grid gap-4 md:grid-cols-[1.2fr,1fr]">

        <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Filters</h2>
            <button
              type="button"
              onClick={() => {
                setFilterCategory("All");
                setFromDate("");
                setToDate("");
              }}
              className={
                "text-[11px] border rounded-xl px-3 py-1 transition-colors " +
                (theme === "dark"
                  ? "border-slate-700 text-slate-200 hover:bg-slate-900/40"
                  : "border-slate-300 text-slate-800 hover:bg-slate-100")
              }
            >
              Reset
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-[11px] text-slate-400">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full mt-1 text-sm rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:border-sky-500"
              >
                <option value="All">All</option>
                {CATEGORIES.filter(Boolean).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400">Date range</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(formatISODate(e.target.value))}
                  className="w-full text-sm rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:border-sky-500"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(formatISODate(e.target.value))}
                  className="w-full text-sm rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 text-[11px] text-slate-400">
            {tab === "expense" ? "Charts show expenses." : "Switch to Expenses tab for spending chart."}
          </div>
        </div>

        <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold mb-2">Monthly spending</h2>
          <div className="relative h-64">
            {/* chart placeholder: rendered below only for expenses */}
            <MonthlySpendingChart
              theme={theme}
              expenses={expenses}
              filterCategory={filterCategory}
              fromDate={fromDate}
              toDate={toDate}
              tab={tab}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">

        <button
          type="button"
          onClick={() => setTab("expense")}
          className={
            "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 " +
            (tab === "expense"
              ? "bg-sky-500/20 border-sky-500 text-sky-200"
              : "bg-slate-900/30 border-slate-800 text-slate-300 hover:bg-slate-900/50")
          }
        >
          Expenses
        </button>
        <button
          type="button"
          onClick={() => setTab("income")}
          className={
            "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 " +
            (tab === "income"
              ? "bg-emerald-500/20 border-emerald-500 text-emerald-200"
              : "bg-slate-900/30 border-slate-800 text-slate-300 hover:bg-slate-900/50")
          }
        >
          Incomes
        </button>
      </div>

      {/* Content */}
      <div className="grid gap-6 md:grid-cols-[1.5fr,2fr] transition-all duration-300 ease-in-out">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="border border-slate-800 rounded-2xl p-4 bg-slate-900/40 space-y-3 transition-all duration-300"
        >
          <h2 className="text-sm font-semibold mb-1">Add {isExpense ? "expense" : "income"}</h2>

          {error ? (
            <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-2">
              {error}
            </div>
          ) : null}

          <input
            className="w-full text-sm rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:border-sky-500"
            placeholder={isExpense ? "Title (e.g. Groceries)" : "Title (e.g. Salary)"}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full text-sm rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:border-sky-500"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />

          <input
            className="w-full text-sm rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:border-sky-500"
            placeholder="Category (e.g. Food)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />

          <input
            type="date"
            className="w-full text-sm rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:border-sky-500"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />

          <button
            type="submit"
            disabled={!isFormValid || saving}
            className="w-full mt-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-medium py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {saving ? "Saving…" : `Save ${isExpense ? "expense" : "income"}`}
          </button>

          <p className="text-[11px] text-slate-500">Stored in MongoDB via an Express API.</p>
        </form>

        {/* List */}
        <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-4">
          <header className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Recent {isExpense ? "expenses" : "incomes"}</h2>
            <span className="text-xs text-slate-400">
              Total: ₹{(isExpense ? totalExpense : totalIncome).toFixed(2)}
            </span>
          </header>

          <div className="transition-opacity duration-200" style={{ opacity: loading ? 0.65 : 1 }}>
            {loading ? (
              <p className="text-xs text-slate-500">Loading…</p>
            ) : list.length === 0 ? (
              <p className="text-xs text-slate-500">No entries yet.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {(tab === "expense" ? filteredList : list).map((e) => (

                  <li
                    key={e._id}
                    className="flex items-center justify-between gap-2 border border-slate-800 rounded-xl px-3 py-2 bg-slate-950/60 transition-all duration-200"
                  >
                    <div>
                      <p className="font-medium text-slate-100">{e.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {e.category || "General"} · {" "}
                        {e.date ? new Date(e.date).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={
                          "font-semibold " + (isExpense ? "text-sky-300" : "text-emerald-300")
                        }
                      >
                        ₹{Number(e.amount || 0).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(e._id)}
                        className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
                      >
                        Delete
                      </button>

                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function exportTransactionsToExcel(transactions, filename = "transactions.xlsx") {
  const rows = (transactions || []).map((t) => ({
    Title: t.title,
    Category: t.category || "General",
    Date: t.date ? new Date(t.date).toISOString().slice(0, 10) : "",
    Amount: Number(t.amount || 0),
    Type: t.type || "Expense",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
  XLSX.writeFile(workbook, filename);
}

function exportTransactionsToPDF(transactions, theme, filename = "transactions.pdf") {
  const doc = new jsPDF({ orientation: "landscape" });

  const headerText = theme === "dark" ? "Expense Tracker (Dark)" : "Expense Tracker (Light)";
  doc.setFontSize(14);
  doc.text(headerText, 10, 14);

  const rows = (transactions || []).map((t) => [
    t.title,
    t.category || "General",
    t.date ? new Date(t.date).toISOString().slice(0, 10) : "",
    Number(t.amount || 0).toFixed(2),
  ]);

  autoTable(doc, {
    startY: 24,
    head: [["Title", "Category", "Date", "Amount"]],
    body: rows,
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: theme === "dark" ? [30, 41, 59] : [203, 213, 225] },
  });

  doc.save(filename);
}

function MonthlySpendingChart({ theme, expenses, filterCategory, fromDate, toDate, tab }) {

  const isExpenseTab = tab === "expense";

  const chartData = useMemo(() => {
    if (!isExpenseTab) {
      return {
        labels: [],
        values: [],
      };
    }

    const cat = (filterCategory || "All").trim();
    const fromMs = fromDate ? new Date(fromDate).getTime() : null;
    const toMs = toDate ? new Date(toDate).getTime() : null;

    const bucket = new Map(); // YYYY-MM -> sum
    for (const x of expenses || []) {
      const xCat = (x.category || "General").trim();
      if (cat !== "All" && xCat !== cat) continue;

      const d = x.date ? new Date(x.date) : null;
      const t = d ? d.getTime() : null;
      if (t == null || Number.isNaN(t)) continue;

      if (fromMs != null && t < fromMs) continue;
      if (toMs != null && t > toMs) continue;

      const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
      bucket.set(monthKey, (bucket.get(monthKey) || 0) + Number(x.amount || 0));
    }

    const labels = Array.from(bucket.keys()).sort();
    const values = labels.map((k) => bucket.get(k));
    return { labels, values };
  }, [expenses, filterCategory, fromDate, toDate, isExpenseTab]);

  const data = useMemo(() => {
    return {
      labels: chartData.labels,
      datasets: [
        {
          label: "Expense",
          data: chartData.values,
          backgroundColor: theme === "dark" ? "rgba(56,189,248,0.35)" : "rgba(2,132,199,0.25)",
          borderColor: theme === "dark" ? "rgba(56,189,248,1)" : "rgba(2,132,199,1)",
          borderWidth: 1,
          borderRadius: 8,
          barPercentage: 0.8,
          categoryPercentage: 0.8,
        },
      ],
    };
  }, [chartData.labels, chartData.values, theme]);

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.raw ?? 0}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: theme === "dark" ? "#cbd5e1" : "#475569" },
          grid: { display: false },
        },
        y: {
          ticks: { color: theme === "dark" ? "#cbd5e1" : "#475569" },
          grid: { color: theme === "dark" ? "rgba(148,163,184,0.15)" : "rgba(15,23,42,0.1)" },
        },
      },
    };
  }, [theme]);

  if (!isExpenseTab) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className={theme === "dark" ? "text-slate-400 text-xs" : "text-slate-500 text-xs"}>
          Switch to <span className="font-semibold">Expenses</span> tab.
        </p>
      </div>
    );
  }

  if (chartData.labels.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className={theme === "dark" ? "text-slate-400 text-xs" : "text-slate-500 text-xs"}>
          No data for the selected filters.
        </p>
      </div>
    );
  }

  return <Bar data={data} options={options} />;
}

export default App;


