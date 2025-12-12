import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },

    // fullName: {
    //   type: String,
    //   required: true,
    //   unique: false,
    //   default: "",
    //   trim: true,
    // },

    photo: {
      type: String,
      required: true,
    },

    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },

    password: {
      type: String,
      required: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    userBio: {
      type: String,
      default: "",
    },
    verificationToken: String,
    verificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  {
    timestamps: true,
  },
);

const User = models?.user || model("user", UserSchema);

export default User;
