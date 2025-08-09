import mongoose from "mongoose"

const WhiteboardDataSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyRoom",
      required: true,
      unique: true,
    },
    paths: [
      {
        id: String,
        points: [
          {
            x: Number,
            y: Number,
          },
        ],
        color: String,
        width: Number,
        tool: String,
        userId: String,
      },
    ],
    lastModified: {
      type: Date,
      default: Date.now,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
)

export const WhiteboardData = (mongoose.models.WhiteboardData || mongoose.model("WhiteboardData", WhiteboardDataSchema)) as any
