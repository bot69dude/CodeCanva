import mongoose, { Schema, Document, Types } from "mongoose";

// Structure item interface (file or folder)
interface IStructureItem {
  id: string;
  name: string;
  type: "file" | "folder";
  parentId: string | null;
  content?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Project interface
interface IProject extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  title: string;
  description: string;
  tags?: string[];
  isPublic?: boolean;
  structure: IStructureItem[];
  createdAt: Date;
  updatedAt: Date;
  forkedFrom?: Types.ObjectId;
}

// Structure item schema
const StructureItemSchema = new Schema<IStructureItem>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["file", "folder"], required: true },
  parentId: { type: String, default: null },
  content: { type: String, default: "" },
  createdAt: { type: Date },
  updatedAt: { type: Date },
});

// Project schema
const ProjectSchema = new Schema<IProject>(
  {
    ownerId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    title: { 
      type: String, 
      required: true,
      trim: true
    },
    description: { 
      type: String, 
      default: "" 
    },
    tags: {
      type: [String],
      default: []
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    structure: [StructureItemSchema],
    forkedFrom: { 
      type: Schema.Types.ObjectId, 
      ref: 'Project' 
    },
  },
  { timestamps: true } 
);

ProjectSchema.index({ ownerId: 1 });
ProjectSchema.index({ title: 1 });
ProjectSchema.index({ createdAt: -1 });

const Project = mongoose.model<IProject>("Project", ProjectSchema);

export { Project, IProject, IStructureItem };