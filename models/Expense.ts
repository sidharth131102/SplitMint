import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ISplitEntry {
  participantId: string;
  amount: number;
  percentage: number | null;
}

export interface IExpenseDocument extends Document {
  groupId: Types.ObjectId;
  description: string;
  amount: number;
  date: Date;
  payerId: string;
  splitMode: "equal" | "custom" | "percentage";
  splits: ISplitEntry[];
  category: string;
  createdAt: Date;
}

const SplitSchema = new Schema<ISplitEntry>(
  {
    participantId: { type: String, required: true },
    amount: { type: Number, required: true },
    percentage: { type: Number, default: null },
  },
  { _id: false }
);

const ExpenseSchema = new Schema<IExpenseDocument>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    payerId: { type: String, required: true },
    splitMode: {
      type: String,
      enum: ["equal", "custom", "percentage"],
      required: true,
    },
    splits: { type: [SplitSchema], required: true },
    category: {
      type: String,
      enum: [
        "Food",
        "Travel",
        "Entertainment",
        "Utilities",
        "Shopping",
        "Health",
        "Other",
      ],
      default: "Other",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ExpenseSchema.index({ description: "text" });
ExpenseSchema.index({ groupId: 1, date: -1 });

const Expense: Model<IExpenseDocument> =
  mongoose.models.Expense ||
  mongoose.model<IExpenseDocument>("Expense", ExpenseSchema);

export default Expense;
