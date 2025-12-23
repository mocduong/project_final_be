const express = require("express");
const mongoose = require("mongoose");
const User = require("../db/userModel");
const router = express.Router();

router.get("/list", async (req, res) => {
  try {
    const users = await User.find({}, "_id first_name last_name").lean().exec();
    res.json(users);
  } catch (err) {
    console.error("Error fetching user list:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  try {
    const user = await User.findById(
      id,
      "_id first_name last_name location description occupation"
    )
      .lean()
      .exec();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Error fetching user by id:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
