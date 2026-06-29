import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const EXPENSE_API_URL = "http://localhost:5000/api/expenses";
const INCOME_API_URL = "http://localhost:5000/api/incomes";

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-6">Expense Tracker </h1>
        <ExpenseIncomeTracker />
      </main>
    </div>
  );
}

function ExpenseIncomeTracker() {
  const [tab, setTab] = useState("expense"); // 'expense' | 'income'

  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);

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
          <p className="text-lg font-semibold text-emerald-300">₹{totalIncome.toFixed(2)}</p>
        </div>
        <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-4">
          <p className="text-xs text-slate-400">Total Expense</p>
          <p className="text-lg font-semibold text-sky-300">₹{totalExpense.toFixed(2)}</p>
        </div>
        <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-4">
          <p className="text-xs text-slate-400">Net</p>
          <p
            className={
              "text-lg font-semibold " +
              (net >= 0 ? "text-emerald-300" : "text-rose-300")
            }
          >
            ₹{net.toFixed(2)}
          </p>
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
                {list.map((e) => (
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

export default App;

