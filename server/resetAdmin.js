
import "dotenv/config";

import mongoose from "mongoose";

import bcrypt from "bcryptjs";

import User from "./src/models/User.js";

const email = process.argv[2]?.trim().toLowerCase();

const password = process.argv[3];

if (!email || !password || password.length < 12) {

  console.error("Provide an admin email and a password of at least 12 characters.");

  process.exitCode = 1;

} else {

  try {

    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({ email });

    if (!user) {

      console.error("No account found for that email. No changes made.");

      process.exitCode = 1;

    } else {

      user.passwordHash = await bcrypt.hash(password, 12);

      user.role = "admin";

      user.isVerified = true;

      user.isActive = true;

      await user.save();

      console.log("Admin account updated successfully:", user.email);

    }

  } catch (error) {

    console.error("Update failed:", error.message);

    process.exitCode = 1;

  } finally {

    await mongoose.disconnect();

  }

}

