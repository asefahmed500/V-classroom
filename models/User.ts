import mongoose from "mongoose"

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    grade: {
      type: String,
      required: true,
      enum: ["9", "10", "11", "12"],
    },
    school: {
      type: String,
      required: true,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    avatar: {
      type: String,
      trim: true,
    },
    preferences: {
      notifications: { type: Boolean, default: true },
      publicProfile: { type: Boolean, default: true },
      showOnlineStatus: { type: Boolean, default: true },
    },
    studyStats: {
      totalStudyTime: { type: Number, default: 0 },
      roomsJoined: { type: Number, default: 0 },
      studyStreak: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  },
)

export const User = mongoose.models.User || mongoose.model("User", UserSchema)
