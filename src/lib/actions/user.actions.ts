"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcrypt";
import User from "../database/models/user.model";
import { connectToDatabase } from "../database/mongoose";
import { handleError } from "../utils";
import { sendVerificationEmail, sendResetPasswordEmail } from "./email.actions";

// inside src/lib/actions/user.actions.ts — replace the createUser function
export async function createUser(user: CreateUserParams) {
  try {
    await connectToDatabase();

    // Normalize and ensure required fields
    const email = String(user?.email ?? "").trim();
    const passwordRaw = String(user?.password ?? "");
    const firstName = String(user?.firstName ?? "").trim();
    const lastName = String(user?.lastName ?? "").trim();
    const photo =
      String(user?.photo ?? "").trim() || "/images/user/default.png";
    const userBio = String(user?.userBio ?? (user as any)?.bio ?? "").trim();

    if (!email) throw new Error("email is required");
    if (!passwordRaw) throw new Error("password is required");

    // prevent duplicate account
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new Error("User already exists with this email");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordRaw, salt);

    const payload: any = {
      email,
      password: hashedPassword,
      photo,
      userBio,
      firstName,
      lastName,
    };

    const newUser = await User.create(payload);

    // Try sending verification email — but do not fail user creation if email fails
    const verificationUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/verify-email?token=${newUser._id}`;
    try {
      await sendVerificationEmail(
        newUser.email,
        newUser.firstName || "User",
        verificationUrl,
      );
    } catch (emailErr) {
      // Log it for debugging, but don't throw — signup should succeed regardless
      console.error("sendVerificationEmail failed:", emailErr);
    }

    return JSON.parse(JSON.stringify(newUser));
  } catch (error: any) {
    // Log full error
    console.error("createUser error (caught):", error);

    // If it's already an Error, rethrow it directly (so it isn't wrapped again)
    if (error instanceof Error) throw error;

    // Otherwise, throw a new Error with a useful message
    throw new Error(
      (error && typeof error === "object" && (error as any).message) ||
        String(error) ||
        "An error occurred during user registration",
    );
  }
}

export async function verifyEmail(token: string) {
  try {
    await connectToDatabase();

    const user = await User.findById(token);
    if (!user) throw new Error("Invalid token or user not found");

    user.isEmailVerified = true;
    await user.save();

    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    handleError(error);
  }
}

export async function requestPasswordReset(email: string) {
  try {
    await connectToDatabase();

    const user = await User.findOne({ email });
    if (!user) throw new Error("User not found");
    const resetUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/reset-password?token=${user._id}`;
    await sendResetPasswordEmail(
      user.email,
      user.firstName || "User",
      resetUrl,
    );

    return true;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    await connectToDatabase();

    const user = await User.findById(token);
    if (!user) throw new Error("Invalid token or user not found");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    handleError(error);
  }
}

export async function getUserById(userId: string) {
  try {
    await connectToDatabase();
    const user = await User.findOne({ Id: userId });
    if (!user) throw new Error("User not found");
    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    handleError(error);
  }
}

export async function updateUser(Id: string, user: UpdateUserParams) {
  try {
    await connectToDatabase();
    const updatedUser = await User.findOneAndUpdate({ _id: Id }, user, {
      new: true,
    });
    if (!updatedUser) throw new Error("User update failed");
    return JSON.parse(JSON.stringify(updatedUser));
  } catch (error) {
    handleError(error);
  }
}

export async function deleteUser(Id: string) {
  try {
    await connectToDatabase();

    const userToDelete = await User.findOne({ Id });
    if (!userToDelete) {
      throw new Error("User not found");
    }

    const deletedUser = await User.findByIdAndDelete(userToDelete._id);
    revalidatePath("/");

    return deletedUser ? JSON.parse(JSON.stringify(deletedUser)) : null;
  } catch (error) {
    handleError(error);
  }
}

export async function updateCredits(userId: string, creditFee: number) {
  try {
    await connectToDatabase();

    const updatedUserCredits = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { creditBalance: creditFee } },
      { new: true },
    );

    if (!updatedUserCredits) throw new Error("User credits update failed");

    return JSON.parse(JSON.stringify(updatedUserCredits));
  } catch (error) {
    handleError(error);
  }
}

export async function getUserByEmail(email: string) {
  try {
    await connectToDatabase();
    const user = await User.findOne({ email });
    if (!user) throw new Error("User not found");

    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    handleError(error);
  }
}

export async function loginUser(email: string, password: string) {
  try {
    await connectToDatabase();

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const user = await User.findOne({ email }).lean();
    if (!user) {
      throw new Error("Invalid credentials");
    }

    // user.password exists in DB (hashed)
    const isMatch = await bcrypt.compare(
      password,
      String((user as any).password || ""),
    );
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    // Remove sensitive fields before returning
    const {
      password: _p,
      resetPasswordToken,
      resetPasswordExpires,
      verificationToken,
      verificationExpires,
      ...safeUser
    } = user as any;

    return safeUser;
  } catch (err) {
    // rethrow a clean Error so callers can handle it
    if (err instanceof Error) throw err;
    throw new Error(String(err));
  }
}
