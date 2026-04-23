import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ISettlementDocument extends Document {
  groupId: Types.ObjectId;
  fromId: string;
  toId: string;
  amount: number;
  settledAt: Date;
}

const SettlementSchema = new Schema<ISettlementDocument>({
  groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
  fromId: { type: String, required: true },
  toId: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  settledAt: { type: Date, default: Date.now },
});

const Settlement: Model<ISettlementDocument> =
  mongoose.models.Settlement ||
  mongoose.model<ISettlementDocument>("Settlement", SettlementSchema);

export default Settlement;
