/* eslint-disable no-console */

// v2 https entry + global options
const {onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2/options");

// 仅用于 runtime config（sendgrid 等）兼容
const functions = require("firebase-functions");
const admin = require("firebase-admin");

let express = null;
let cors = null;
let sgMail = null;
let nodemailer = null;

try {
  express = require("express");
} catch (e) {
  console.warn(e.message);
}

try {
  cors = require("cors");
} catch (e) {
  console.warn(e.message);
}

try {
  sgMail = require("@sendgrid/mail");
} catch (e) {
  console.warn(e.message);
}

try {
  nodemailer = require("nodemailer");
} catch (e) {
  console.warn(e.message);
}

// ---- set 2nd-gen global options (region) ----
setGlobalOptions({region: "australia-southeast1"});

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const emailRe = /^\S+@\S+\.\S+$/;

/**
 * Returns a sanitized plain string.
 * @param {string} s
 * @return {string}
 */
function sanitize(s) {
  const str = String(s || "");
  const noTags = str.replace(/<[^>]*>/g, "");
  const noJs = noTags.replace(/javascript:/gi, "");
  const noOn = noJs.replace(/on\w+\s*=/gi, "");
  return noOn.trim();
}

/**
 * Selects an available mailer (SendGrid or Nodemailer).
 * @return {null|{from:string, send:function(Object):Promise<void>}}
 */
function getMailer() {
  let cfg = {};
  if (functions.config) {
    cfg = functions.config() || {};
  }

  const hasSG =
    sgMail &&
    cfg &&
    cfg.sendgrid &&
    cfg.sendgrid.key &&
    cfg.sendgrid.from;

  if (hasSG) {
    sgMail.setApiKey(cfg.sendgrid.key);
    return {
      from: cfg.sendgrid.from,
      async send({to, bcc, subject, text}) {
        const payload = {from: this.from, subject, text};
        if (to) payload.to = to;
        const hasBcc = Array.isArray(bcc) && bcc.length > 0;
        if (hasBcc) payload.bcc = bcc;
        await sgMail.send(payload);
      },
    };
  }

  const hasNM =
    nodemailer &&
    process.env.MAIL_USER &&
    process.env.MAIL_PASS;

  if (hasNM) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
    return {
      from: process.env.MAIL_USER,
      async send({to, bcc, subject, text}) {
        await transporter.sendMail({
          from: this.from,
          to,
          bcc,
          subject,
          text,
        });
      },
    };
  }

  return null;
}

let app = null;

if (express) {
  app = express();

  if (cors) {
    const corsMw = cors({origin: true});
    app.use((req, res, next) => {
      corsMw(req, res, () => {
        if (req.method === "OPTIONS") {
          return res.status(204).send("");
        }
        next();
      });
    });
  }

  app.use(express.json({limit: "1mb"}));

  // POST /submitEnquiry
  app.post("/submitEnquiry", async (req, res) => {
    try {
      const body = req.body || {};
      const name = body.name;
      const email = body.email;
      const program = body.program;
      const message = body.message;
      const consent = body.consent;

      const errors = {};
      const badName = !name || String(name).trim().length < 2;
      if (badName) errors.name = "Invalid name";

      const badEmail = !email || !emailRe.test(email);
      if (badEmail) errors.email = "Invalid email";

      if (!program) errors.program = "Program is required";

      const msgShort = !message || String(message).trim().length < 20;
      if (msgShort) errors.message = "Message is too short";

      if (!consent) errors.consent = "Consent required";

      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ok: false, errors});
      }

      const doc = {
        name: sanitize(name),
        email: sanitize(email),
        program: sanitize(program),
        message: sanitize(message),
        consent: Boolean(consent),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const col = db.collection("enquiries");
      const ref = await col.add(doc);

      try {
        const mailer = getMailer();
        if (mailer) {
          const subj =
            "We received your enquiry about " + String(program);
          const line1 = "Hi " + String(name) + ",";
          const lines = [
            line1,
            "",
            "Thanks for your enquiry:",
            "",
            String(message),
            "",
            "— NFP Health Initiative",
          ];
          const text = lines.join("\n");
          await mailer.send({to: email, subject: subj, text});
        }
      } catch (e) {
        console.warn("mailer failed (ignored):", e.message || e);
      }

      return res.json({ok: true, id: ref.id});
    } catch (e) {
      console.error("submitEnquiry failed", e);
      return res.status(500).json({ok: false, error: "Server error"});
    }
  });

  // POST /bulkEmail
  app.post("/bulkEmail", async (req, res) => {
    try {
      const body = req.body || {};
      const to = Array.isArray(body.to) ? body.to : [];
      const msg = String(body.message || "");

      if (to.length === 0) {
        return res.status(400).json({error: "Recipients required"});
      }
      if (!msg.trim()) {
        return res.status(400).json({error: "Message required"});
      }

      const allValid = to.every((x) => emailRe.test(String(x || "")));
      if (!allValid) {
        return res.status(400).json({error: "Invalid email in list"});
      }

      const mailer = getMailer();
      if (!mailer) {
        return res.status(501).json({error: "Mailer not configured"});
      }

      await mailer.send({bcc: to, subject: "Notification", text: msg});

      try {
        const logs = db.collection("email_logs");
        const preview = msg.slice(0, 500);
        await logs.add({
          to,
          preview,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.warn("log failed (ignored):", e.message || e);
      }

      return res.json({ok: true, count: to.length});
    } catch (e) {
      console.error("bulkEmail failed", e);
      return res.status(500).json({error: "Server error"});
    }
  });

  // GET /submissions
  app.get("/submissions", async (req, res) => {
    try {
      const raw = Number(req.query.limit || 200);
      const lim = isNaN(raw) ? 200 : raw;
      const cap = Math.min(lim, 1000);

      const col = db.collection("enquiries");
      const qry = col.orderBy("createdAt", "desc").limit(cap);
      const snap = await qry.get();

      const items = snap.docs.map((d) => {
        const data = d.data();
        return {id: d.id, ...data};
      });

      return res.json({items});
    } catch (e) {
      console.error("submissions failed", e);
      return res.status(500).json({error: "Server error"});
    }
  });

  // GET /ratings
  app.get("/ratings", async (req, res) => {
    try {
      const programId = String(req.query.programId || "");
      if (!programId) {
        return res.status(400).json({error: "programId required"});
      }

      const col = db.collection("ratings");
      const qry = col.where("programId", "==", programId);
      const snap = await qry.get();

      const items = snap.docs.map((d) => d.data());
      const count = items.length;

      let avg = 0;
      if (count > 0) {
        const sum = items.reduce((s, x) => {
          const v = Number(x.stars || 0);
          return s + v;
        }, 0);
        avg = sum / count;
      }

      return res.json({programId, count, avg});
    } catch (e) {
      console.error("ratings failed", e);
      return res.status(500).json({error: "Server error"});
    }
  });

  // === Admin metrics ===
  // 统计：用户总数、管理员/普通占比、近7天咨询数、平均评分
  app.get("/admin/metrics", async (req, res) => {
    try {
      // users
      const usersCol = db.collection("users");
      const usersCountSnap = await usersCol.count().get();
      const usersTotal = usersCountSnap.data().count || 0;

      const adminsQuery = usersCol.where("role", "==", "admin").count();
      const adminsCountSnap = await adminsQuery.get();
      const admins = adminsCountSnap.data().count || 0;
      const members = Math.max(usersTotal - admins, 0);

      // enquiries (last 7 days)
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const enqCol = db.collection("enquiries");
      const enq7dQuery = enqCol.where("createdAt", ">=", sevenDaysAgo).count();
      const enq7dSnap = await enq7dQuery.get();
      const enquiries7d = enq7dSnap.data().count || 0;

      // ratings avg
      const ratingsCol = db.collection("ratings");
      const ratingsSnap = await ratingsCol.get();
      const ratings = ratingsSnap.docs.map((d) => d.data());
      const n = ratings.length;
      let avgRating = 0;
      if (n > 0) {
        const sum = ratings.reduce((s, x) => s + Number(x.stars || 0), 0);
        avgRating = sum / n;
      }

      return res.json({
        usersTotal,
        admins,
        members,
        enquiries7d,
        avgRating,
      });
    } catch (e) {
      console.error("admin/metrics failed", e);
      return res.status(500).json({error: "Server error"});
    }
  });

  // health check
  app.get("/", (req, res) => {
    return res.json({ok: true});
  });
}

// ---- v2 exports (no .region(...) here; region is set globally) ----
exports.api = onRequest(app);

// 兼容单端点（用于你前端可能直连这个名字）
exports.submitEnquiry = onRequest((req, res) => {
  if (app) {
    return app(req, res);
  }
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }
  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }
  const payload = {ok: false, errors: {info: "express not installed"}};
  return res.status(501).json(payload);
});
