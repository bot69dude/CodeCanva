import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
    _id: Types.ObjectId;
    username: string;
    password: string;
    email: string;
}

const UserSchema: Schema<IUser> = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
}, { timestamps: true });

const UserModel = mongoose.model<IUser>('User', UserSchema);

export default UserModel;