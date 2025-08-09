import mongoose from "mongoose"

const StudySessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyRoom",
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    focusScore: {
      type: Number, // 1-10 rating
      min: 1,
      max: 10,
    },
    notes: {
      type: String,
    },
    achievements: [
      {
        type: String,
        enum: ["first_session", "study_streak", "long_session", "collaboration", "subject_master"],
      },
    ],
  },
  {
    timestamps: true,
  },
)

export const StudySession = (mongoose.models.StudySession || mongoose.model("StudySession", StudySessionSchema)) as any
