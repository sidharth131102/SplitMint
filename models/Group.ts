import mongoose, { Schema, Document, Model, Types } from "mongoose";

const PARTICIPANT_COLORS = [
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
];

export interface IParticipant {
  _id: Types.ObjectId;
  name: string;
  color: string;
  avatar: string | null;
}

export interface IGroupDocument extends Document {
  name: string;
  ownerId: Types.ObjectId;
  participants: IParticipant[];
  createdAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>({
  name: { type: String, required: true },
  color: { type: String, required: true },
  avatar: { type: String, default: null },
});

const GroupSchema = new Schema<IGroupDocument>(
  {
    name: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    participants: {
      type: [ParticipantSchema],
      validate: {
        validator: (arr: IParticipant[]) => arr.length <= 3,
        message: "A group can have at most 3 participants (+ owner = 4 total)",
      },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export { PARTICIPANT_COLORS };

const Group: Model<IGroupDocument> =
  mongoose.models.Group || mongoose.model<IGroupDocument>("Group", GroupSchema);

export default Group;
