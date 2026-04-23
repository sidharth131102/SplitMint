import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string | null;
  image: string | null;
  provider: "credentials" | "google";
  createdAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, default: null },
    image: { type: String, default: null },
    provider: {
      type: String,
      enum: ["credentials", "google"],
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);

export default User;
