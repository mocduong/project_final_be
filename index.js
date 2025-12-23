// index.js
const express = require("express");
const app = express();
const cors = require("cors");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const dbConnect = require("./db/dbConnect");
const UserRouter = require("./routes/UserRouter");
const PhotoRouter = require("./routes/PhotoRouter");
const User = require("./db/userModel");
const Photo = require("./db/photoModel");

dbConnect();

app.set("trust proxy", 1);

app.use(
  session({
    secret: "secretKey",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 600000,
      sameSite: "none",
      secure: true,
    },
  })
);

app.use(
  cors({
    origin: "https://csgg4k.csb.app",
    credentials: true,
  })
);

app.use(express.json());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "./images";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });
app.use("/images", express.static("images"));

app.post("/admin/login", async (req, res) => {
  const { login_name, password } = req.body;
  try {
    const user = await User.findOne({ login_name: login_name });
    if (!user || user.password !== password) {
      return res.status(400).json({ message: "Login failed" });
    }
    req.session.user_id = user._id;
    req.session.login_name = user.login_name;

    const userResp = { ...user._doc };
    delete userResp.password;
    res.json(userResp);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post("/admin/logout", (req, res) => {
  if (!req.session.user_id) {
    return res.status(400).send("Not logged in");
  }
  req.session.destroy(() => {
    res.send();
  });
});

app.post("/user", async (req, res) => {
  const {
    login_name,
    password,
    first_name,
    last_name,
    location,
    description,
    occupation,
  } = req.body;
  if (!login_name || !password || !first_name || !last_name) {
    return res.status(400).send("Missing required fields");
  }
  try {
    const existingUser = await User.findOne({ login_name });
    if (existingUser) return res.status(400).send("Login name already exists");
    const newUser = new User({
      login_name,
      password,
      first_name,
      last_name,
      location,
      description,
      occupation,
    });
    await newUser.save();
    res.json({ login_name: newUser.login_name });
  } catch (err) {
    res.status(500).send(err);
  }
});

app.use((req, res, next) => {
  if (req.path.startsWith("/images/")) return next();
  if (!req.session.user_id) {
    return res.status(401).send("Unauthorized");
  }
  next();
});

app.post("/photos/new", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");
  const newPhoto = new Photo({
    file_name: req.file.filename,
    user_id: req.session.user_id,
    date_time: new Date(),
    comments: [],
  });
  try {
    await newPhoto.save();
    res.status(200).send();
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get("/", (request, response) => {
  response.send({ message: "Hello from photo-sharing app API!" });
});

app.use("/user", UserRouter);
app.use("/photosOfUser", PhotoRouter);

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log("server listening on port", PORT);
});
