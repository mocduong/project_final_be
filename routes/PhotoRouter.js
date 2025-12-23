const express = require("express");
const mongoose = require("mongoose");
const Photo = require("../db/photoModel");
const User = require("../db/userModel");
const router = express.Router();

router.get("/:id", async (req, res) => {
  const userId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  try {
    const photos = await Photo.find({ user_id: userId })
      .select("_id user_id comments file_name date_time")
      .lean()
      .exec();

    const commentUserIds = new Set();
    photos.forEach((p) => {
      if (Array.isArray(p.comments)) {
        p.comments.forEach((c) => {
          if (c.user_id) commentUserIds.add(String(c.user_id));
        });
      }
    });

    let usersMap = {};
    if (commentUserIds.size > 0) {
      const ids = Array.from(commentUserIds);
      const users = await User.find(
        { _id: { $in: ids } },
        "_id first_name last_name"
      )
        .lean()
        .exec();
      usersMap = users.reduce((acc, u) => {
        acc[String(u._id)] = u;
        return acc;
      }, {});
    }

    const photosResp = photos.map((p) => {
      const comments = (p.comments || []).map((c) => {
        const userObj = usersMap[String(c.user_id)] || null;
        return {
          _id: c._id,
          comment: c.comment,
          date_time: c.date_time,
          user: userObj,
        };
      });
      return {
        _id: p._id,
        user_id: p.user_id,
        file_name: p.file_name,
        date_time: p.date_time,
        comments: comments,
      };
    });

    res.json(photosResp);
  } catch (err) {
    console.error("Error fetching photos of user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/commentsOfPhoto/:photo_id", async (req, res) => {
  const photo_id = req.params.photo_id;
  const { comment } = req.body;
  const user_id = req.session.user_id;

  if (!comment || comment.trim() === "") {
    return res.status(400).send("Empty comment");
  }
  if (!user_id) {
    return res.status(401).send("User not logged in");
  }

  try {
    const photo = await Photo.findById(photo_id);
    if (!photo) return res.status(404).send("Photo not found");

    const newComment = {
      comment: comment,
      user_id: user_id,
      date_time: new Date(),
    };

    photo.comments.push(newComment);
    await photo.save();
    res.status(200).send("Comment added");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding comment");
  }
});

module.exports = router;
