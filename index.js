import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// connect MongoDB
const mongoUri = process.env.MONGO_URI;
mongoose.connect(process.env.MONGO_URI);
if (!mongoUri || typeof mongoUri !== "string") {
  console.error(
    "Missing/invalid Mongo connection string. Please set MONGO_URI in your environment (.env)."
  );
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// models
const baseEntrySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, default: "General" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Expense = mongoose.model("Expense", baseEntrySchema);
const Income = mongoose.model("Income", baseEntrySchema);


// routes
app.get("/api/expenses", async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    return res.json(expenses);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch expenses" });
  }
});

app.get("/api/incomes", async (req, res) => {
  try {
    const incomes = await Income.find().sort({ date: -1 });
    return res.json(incomes);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch incomes" });
  }
});

function normalizeEntryPayload(body) {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim() : "";

  const rawAmount = body?.amount;
  const amount = typeof rawAmount === "string" || typeof rawAmount === "number" ? Number(rawAmount) : NaN;

  const dateRaw = body?.date;
  let date;
  if (!dateRaw) {
    date = new Date();
  } else {
    const d = new Date(dateRaw);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
    date = d;
  }

  if (!title) throw new Error("Title is required");
  if (!Number.isFinite(amount)) throw new Error("Amount must be a number");
  if (amount <= 0) throw new Error("Amount must be greater than 0");

  return {
    title,
    amount,
    category: category || "General",
    date,
  };
}

app.post("/api/expenses", async (req, res) => {
  try {
    const payload = normalizeEntryPayload(req.body);
    const expense = await Expense.create(payload);
    return res.status(201).json(expense);
  } catch (err) {
    return res.status(400).json({ message: err?.message || "Invalid data" });
  }
});

app.post("/api/incomes", async (req, res) => {
  try {
    const payload = normalizeEntryPayload(req.body);
    const income = await Income.create(payload);
    return res.status(201).json(income);
  } catch (err) {
    return res.status(400).json({ message: err?.message || "Invalid data" });
  }
});

app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const deleted = await Expense.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Expense not found" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ message: "Invalid expense id" });
  }
});

app.delete("/api/incomes/:id", async (req, res) => {
  try {
    const deleted = await Income.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Income not found" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ message: "Invalid income id" });
  }
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
