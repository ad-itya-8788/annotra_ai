const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const messageCentral = require("../message-center");
const db = require("../dbconnect");

const JWT_SECRET = process.env.JWT_SECRET;


const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: { success: false, message: "Too many OTP requests. Try again after 15 minutes." },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: "Too many verification attempts. Try again later." },
});

const validateMobileNumber = (mobile) => {
  const cleaned = String(mobile).replace(/\D/g, "");
  return cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned);
};

const validateName = (name) => {
  return typeof name === "string" && name.trim().length >= 2 && /^[A-Za-z\s]+$/.test(name.trim());
};

const validateOTP = (otp) => /^\d{6}$/.test(otp);


const otpSessions = new Map();
const otpSessionKey = (mobile, type) => `${type}:${mobile}`;

// Clean up expired OTP sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of otpSessions.entries()) {
    if (now > session.expiresAt) {
      otpSessions.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ============================================
// JWT & COOKIE HELPERS
// ============================================
const generateJWTToken = (user) => {
  return jwt.sign(
    {
      id: user.u_id,
      name: user.name,
      mobile: user.phone,
      gender: user.gender,
      userType: user.user_type,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days
    },
    JWT_SECRET
  );
};

const setAuthCookies = (res, sessionId, jwtToken, expiresAt) => {
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: "None",
  };
  res.cookie("sessionId", sessionId, cookieOptions);
  res.cookie("jwtToken", jwtToken, cookieOptions);
};

const getTokenFromRequest = (req) => {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  return req.cookies?.jwtToken;
};

// ============================================
// ROUTES: OTP AUTHENTICATION
// ============================================

// POST /api/auth/send-otp
router.post("/send-otp", otpLimiter, async (req, res) => {
  try {
    const { mobile, type, firstName, lastName, gender } = req.body;

    if (!mobile || !type) {
      return res.status(400).json({ success: false, message: "Mobile number and type required." });
    }

    const cleanedMobile = String(mobile).replace(/\D/g, "");

    if (!validateMobileNumber(cleanedMobile)) {
      return res.status(400).json({ success: false, message: "Invalid 10-digit mobile number." });
    }

    const userResult = await db.query(
      "SELECT u_id, name, phone, gender, user_type, status FROM users WHERE phone = $1 OR phone = $2 OR phone = $3",
      [cleanedMobile, `+${cleanedMobile}`, `+91${cleanedMobile}`]
    );

    const userExists = userResult.rows.length > 0;
    const user = userExists ? userResult.rows[0] : null;

    if (type === "login") {
      if (!userExists) {
        return res.status(404).json({ success: false, message: "User not found. Register first." });
      }
      if (user.status !== "active") {
        return res.status(403).json({ success: false, message: "Account inactive. Contact support." });
      }
    } else if (type === "register") {
      if (userExists) {
        return res.status(409).json({ success: false, message: "User exists. Please login." });
      }
      if (!validateName(firstName) || !validateName(lastName)) {
        return res.status(400).json({ success: false, message: "Valid first and last name required." });
      }
      if (!["Male", "Female", "Other"].includes(gender)) {
        return res.status(400).json({ success: false, message: "Valid gender required." });
      }
    } else {
      return res.status(400).json({ success: false, message: "Invalid type parameter." });
    }

    const otpResult = await messageCentral.sendOTP(cleanedMobile);

    if (!otpResult.success) {
      throw new Error("Failed to send OTP");
    }

    const sessionId = otpSessionKey(cleanedMobile, type);
    otpSessions.set(sessionId, {
      mobile: cleanedMobile,
      type,
      firstName: type === "register" ? firstName.trim() : undefined,
      lastName: type === "register" ? lastName.trim() : undefined,
      gender: type === "register" ? gender : undefined,
      verificationId: otpResult.verificationId,
      attempts: 0,
      expiresAt: Date.now() + 10 * 60 * 1000,
      userId: userExists ? user.u_id : null,
    });

    return res.json({
      success: true,
      message: "OTP sent successfully",
      sessionId,
      otpLength: 6,
      expiresIn: 600,
    });
  } catch (error) {
    console.error("Send OTP error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to send OTP. Try again." });
  }
});

// POST /api/auth/verify-otp
router.post("/verify-otp", verifyLimiter, async (req, res) => {
  try {
    const { mobile, otp, type } = req.body;

    if (!mobile || !otp || !type) {
      return res.status(400).json({ success: false, message: "Mobile, OTP, and type required." });
    }

    const cleanedMobile = String(mobile).replace(/\D/g, "");

    if (!validateOTP(otp)) {
      return res.status(400).json({ success: false, message: "OTP must be exactly 6 digits." });
    }

    const sessionKey = otpSessionKey(cleanedMobile, type);
    const otpSession = otpSessions.get(sessionKey);

    if (!otpSession) {
      return res.status(400).json({ success: false, message: "Invalid or expired session. Request new OTP." });
    }

    if (Date.now() > otpSession.expiresAt) {
      otpSessions.delete(sessionKey);
      return res.status(400).json({ success: false, message: "Session expired. Request new OTP." });
    }

    if (otpSession.attempts >= 3) {
      otpSessions.delete(sessionKey);
      return res.status(429).json({ success: false, message: "Too many failed attempts. Request new OTP." });
    }

    otpSession.attempts++;

    const verificationResult = await messageCentral.verifyOTP(otpSession.mobile, otp, otpSession.verificationId);

    if (!verificationResult.verified) {
      return res.status(401).json({
        success: false,
        message: "Invalid OTP. Try again.",
        attemptsLeft: 3 - otpSession.attempts,
      });
    }

    otpSessions.delete(sessionKey);

    const sessionManager = req.app.locals.sessionManager;
    let user;

    if (otpSession.type === "login") {
      const userResult = await db.query(
        "SELECT u_id, name, phone, gender, user_type FROM users WHERE u_id = $1 AND status = 'active'",
        [otpSession.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: "User not found or inactive." });
      }

      user = userResult.rows[0];
      await db.query("UPDATE users SET updated_at = NOW() WHERE u_id = $1", [user.u_id]);
    } else {
      const fullName = `${otpSession.firstName} ${otpSession.lastName}`;
      const formattedPhone = `+91${cleanedMobile}`;

      const userResult = await db.query(
        `INSERT INTO users (name, phone, gender, user_type, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING u_id, name, phone, gender, user_type`,
        [fullName, formattedPhone, otpSession.gender, "renter", "active"]
      );

      user = userResult.rows[0];
    }

    const { sessionId: userSessionId, expiresAt } = await sessionManager.createSession(user.u_id, req);
    const jwtToken = generateJWTToken(user);

    setAuthCookies(res, userSessionId, jwtToken, expiresAt);

    return res.json({
      success: true,
      message: otpSession.type === "login" ? "Login successful" : "Registration successful",
      redirectTo: "/rooms",
      user: {
        id: user.u_id,
        mobile: user.phone,
        name: user.name,
        gender: user.gender,
        userType: user.user_type,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error.message);
    return res.status(500).json({ success: false, message: "Verification failed. Try again." });
  }
});

// ============================================
// ROUTES: SESSION MANAGEMENT
// ============================================

// GET /api/auth/session-check
router.get("/session-check", async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const jwtToken = req.cookies.jwtToken;

  if (!sessionId || !jwtToken) {
    return res.json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(jwtToken, JWT_SECRET);
    const sessionManager = req.app.locals.sessionManager;
    const session = await sessionManager.getSession(sessionId);

    if (!session) {
      res.clearCookie("sessionId");
      res.clearCookie("jwtToken");
      return res.json({ authenticated: false });
    }

    return res.json({
      authenticated: true,
      user: {
        id: decoded.id,
        name: decoded.name,
        phone: decoded.mobile,
        gender: decoded.gender,
        userType: decoded.userType,
      },
      redirectTo: "/rooms",
    });
  } catch (error) {
    res.clearCookie("sessionId");
    res.clearCookie("jwtToken");
    return res.json({ authenticated: false });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  const sessionId = req.cookies.sessionId;

  if (sessionId) {
    try {
      const sessionManager = req.app.locals.sessionManager;
      await sessionManager.deleteSession(sessionId);
    } catch (error) {
      console.error("Logout error:", error.message);
    }
  }

  res.clearCookie("sessionId");
  res.clearCookie("jwtToken");
  res.json({ success: true, message: "Logged out successfully" });
});


const requireAuth = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    const sessionId = req.cookies?.sessionId;

    if (!token || !sessionId) {
      if (req.accepts("html")) {
        return res.redirect("/login?msg=Please login first");
      }
      return res.status(401).json({ success: false, message: "Authentication required. Please login." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const sessionManager = req.app.locals.sessionManager;

    if (!sessionManager) {
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    const session = await sessionManager.getSession(sessionId);

    if (!session) {
      res.clearCookie("sessionId");
      res.clearCookie("jwtToken");
      if (req.accepts("html")) {
        return res.redirect("/login?msg=Session expired");
      }
      return res.status(401).json({ success: false, message: "Session expired. Please login again." });
    }

    req.user = {
      id: decoded.id,
      name: decoded.name,
      phone: decoded.mobile,
      gender: decoded.gender,
      userType: decoded.userType,
    };

    sessionManager.updateSession(sessionId).catch((err) => console.error("Session touch failed:", err.message));
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    res.clearCookie("sessionId");
    res.clearCookie("jwtToken");

    if (req.accepts("html")) {
      return res.redirect("/login?msg=Authentication error");
    }
    return res.status(401).json({ success: false, message: "Invalid authentication. Please login again." });
  }
};

// Require owner access - user must be logged in AND be an owner
const requireOwner = async (req, res, next) => {
  await requireAuth(req, res, async () => {
    try {
      const userDataManager = req.app.locals.userDataManager;

      if (!userDataManager) {
        return res.status(500).json({ success: false, message: "Server configuration error" });
      }

      const currentUserData = await userDataManager.getUserData(req.user.id);

      if (!currentUserData) {
        if (req.accepts("html")) {
          return res.redirect("/login?msg=User not found");
        }
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (currentUserData.user_type !== "owner") {
        if (req.accepts("html")) {
          return res.redirect("/contact-owner?msg=Owner access required");
        }
        return res.status(403).json({ success: false, message: "Owner access required" });
      }

      req.user.userType = currentUserData.user_type;
      req.user.status = currentUserData.status;
      next();
    } catch (error) {
      console.error("Owner middleware error:", error.message);
      if (req.accepts("html")) {
        return res.redirect("/login?msg=Permission check failed");
      }
      return res.status(500).json({ success: false, message: "Permission check failed" });
    }
  });
};


module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireOwner = requireOwner;