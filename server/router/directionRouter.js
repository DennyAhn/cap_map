const express = require("express");
const { getDirection } = require("../controller/directionController");

const router = express.Router();

// Direction 라우트
router.get("/", getDirection);

module.exports = router;