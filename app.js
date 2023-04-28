const express = require('express');
const path = require('path');
const port = 4400;
const i18n = require('i18n');
const uuid = require("uuid");
const multer = require("multer");
const { body, validationResult } = require("express-validator");

const app = express();

// i18n
i18n.configure({
  locales: ['en', 'fr'],
  directory: __dirname + '/locales',
  defaultLocale: 'en',
  objectNotation: true,
  register: global
});

app.use(i18n.init);

// EJS
app.set('views', path.join(__dirname, "/views"));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'node_modules')));
app.use("/flags", express.static(path.join(__dirname, 'node_modules/country-flag-icons/3x2')));
app.use("/utils", express.static(path.join(__dirname, 'utils')));
app.use("/uploads", express.static(path.join(__dirname, 'uploads')));

const f = require("./utils/functions")
const d = require("./utils/db")

const db_name = path.join(__dirname, "db", "teams.db");

f.dbinit(db_name);
const sqlite3 = require("sqlite3").verbose();

// MULTER
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

// GET /
app.get('/', async (req, res) => {
  try {
    const stats = await d.getStats(db_name)
    res.render('index', { teamId: null, stats })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
})

// GET /teams
app.get('/teams', async (req, res) => {
  try {
    const teams = await d.getAllTeams(db_name)
    res.render("pages/teams", { teamId: null, teams });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
})

// GET /new-team
app.get("/new-team", (req, res) => {
  res.render("pages/team-new", { team: { adminPw: uuid.v4(), public: 1, privateKey: uuid.v4().substring(0, 8), game1Opt: 1, game2Opt: 1 }, teamId: null, formType: "New" });
});

// POST /check-team-name
app.post('/check-team-name', (req, res) => {
  const teamName = req.body.name;

  if (!teamName) {
    res.status(400).json({ error: 'Le nom de l\'équipe est manquant' });
    return;
  }

  const db = new sqlite3.Database(db_name);
  const query = 'SELECT COUNT(*) as count FROM Team WHERE name = ?';
  db.get(query, [teamName], (err, row) => {
    if (err) {
      res.status(500).json({ error: 'Erreur lors de la vérification du nom de l\'équipe' });
      return;
    }
    db.close();

    const isUnique = row.count === 0;
    res.json({ isUnique: isUnique });
  });
});

// POST /new-team
app.post("/new-team",
  [
    body("name").notEmpty().withMessage("Le nom est requis"),
    body("country").notEmpty().withMessage("Le pays est requis"),
    body("city").notEmpty().withMessage("La ville est requise"),
    body("adminName").notEmpty().withMessage("Le nom de l'administrateur est requis"),
    body("adminEmail").isEmail().withMessage("L'adresse e-mail doit être valide"),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Renvoyer une réponse avec les erreurs
      return res.status(400).json({ errors: errors.array() });
    }

    const nameIsUnique = await f.isNameUnique(db_name, req.body.Name);
    if (!nameIsUnique) {
      return res.status(400).json({ errors: [{ msg: 'Le nom de l\'équipe existe déjà' }] });
    }

    const db = new sqlite3.Database(db_name);
    const sql = "INSERT INTO Team (name, country, city, adminPw, adminname, adminemail, public, game1Opt, game2Opt, privateKey) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const team = [req.body.name, req.body.country, req.body.city, req.body.adminPw, req.body.adminName, req.body.adminEmail, req.body.public, req.body.game1Opt, req.body.game2Opt, req.body.privateKey];
    db.run(sql, team, err => {
      if (err) {
        return console.error(err.message);
      }
      res.redirect("/teams");
    });
    db.close();
  }
);

// GET /team/teamId
app.get('/team/:teamId(\\d+)(/:accessType(admin|private))?(/:accessKey([0-9a-fA-F]{8}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?', async (req, res) => {
  const teamId = req.params.teamId;
  const showUpdateAlert = req.query.updated === 'true' ? true : false;

  const adminPw = (req.params.accessType === 'admin') ? req.params.accessKey : null;
  const adminPWDb = await d.getAdminPw(db_name, teamId);

  const privateKey = (req.params.accessType === 'private') ? req.params.accessKey : null;
  const privateKeyDb = await d.getPrivateKey(db_name, teamId);

  if ((privateKeyDb && privateKey === privateKeyDb) || !privateKeyDb || adminPw === adminPWDb) {
    const winners = 5;
    const top = 3;
    const nbMatches = 2;
    try {
      const matches = await d.getLastMatchesPromise(db_name, teamId, nbMatches)
      const lastWinners = await d.getLastWinnersPromise(db_name, teamId, winners);
      const topPlayers = await d.getTopPlayersPromise(db_name, teamId, top);
      res.render("pages/team", { teamId, adminPw, privateKey, lastWinners, players: topPlayers, matches, showUpdateAlert });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.render("pages/error", { teamId, adminPw, privateKey, title: __("ERRORS.PRIVATE.TITLE"), desc: __("ERRORS.PRIVATE.DESC") });
  }
});

// GET /team/teamId/match/matchId
app.get("/team/:teamId(\\d+)(/:accessType(admin|private))?/match/:matchId(\\d+)(/:accessKey([0-9a-fA-F]{8}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?", async (req, res) => {
  const teamId = req.params.teamId;
  const matchId = req.params.matchId;

  const adminPw = (req.params.accessType === 'admin') ? req.params.accessKey : null;
  const adminPWDb = await d.getAdminPw(db_name, teamId);

  const privateKey = (req.params.accessType === 'private') ? req.params.accessKey : null;
  const privateKeyDb = await d.getPrivateKey(db_name, teamId);

  if ((privateKeyDb && privateKey === privateKeyDb) || !privateKeyDb || adminPw === adminPWDb) {
    try {
      const match = await d.getMatchPromise(db_name, matchId)
      res.render("pages/matches", { teamId, adminPw, privateKey, matches: [match] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.render("pages/error", { teamId, adminPw, privateKey, title: __("ERRORS.PRIVATE.TITLE"), desc: __("ERRORS.PRIVATE.DESC") });
  }
});

// GET /team/teamId/admin/edit/adminPw
app.get("/team/:teamId(\\d+)/admin/edit(/:adminPw([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?", async (req, res) => {
  const teamId = req.params.teamId;
  const adminPw = req.params.adminPw || null;
  const adminPWDb = await d.getAdminPw(db_name, teamId);
  if (adminPw === adminPWDb) {
    try {
      const team = await d.getTeamInfo(db_name, teamId)
      res.render("pages/team-new", { teamId, adminPw, team, privateKey: null, formType: "Edit" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.render("pages/error", { teamId, adminPw, privateKey: null, title: __("ERRORS.ACCESS.TITLE"), desc: __("ERRORS.ACCESS.DESC") });
  }
});

// POST /team/teamId/admin/edit/adminPw
app.post("/team/:teamId(\\d+)/admin/edit(/:adminPw([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?", async (req, res) => {
  const teamId = req.params.teamId;
  const adminPw = req.params.adminPw || null;
  const adminPWDb = await d.getAdminPw(db_name, teamId);
  if (adminPw === adminPWDb) {
    const db = new sqlite3.Database(db_name);
    const country = req.body.country;
    const city = req.body.city;
    const public = req.body.public;
    const adminname = req.body.adminName;
    const adminemail = req.body.adminEmail;
    const game1Opt = req.body.game1Opt;
    const game2Opt = req.body.game2Opt;

    const query = `
    UPDATE Team
    SET
      country = ?,
      city = ?,
      public = ?,
      adminname = ?,
      adminemail = ?,
      game1Opt = ?,
      game2Opt = ?
      WHERE id = ?`;

    db.run(query, [country, city, public, adminname, adminemail, game1Opt, game2Opt, teamId,], (err) => {
      if (err) {
        console.error(err.message);
        res.status(500).send('Erreur lors de la mise à jour des informations de l\'équipe');
      } else {
        res.redirect('/team/' + teamId + '/admin/' + adminPw + '?updated=true');
      }
    });

    db.close();

  } else {
    res.render("pages/error", { teamId, adminPw, privateKey: null, title: __("ERRORS.ACCESS.TITLE"), desc: __("ERRORS.ACCESS.DESC") });
  }
});

// GET /team/teamId/admin/players/adminPw
app.get("/team/:teamId(\\d+)/admin/players(/:adminPw([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?", async (req, res) => {
  const teamId = req.params.teamId;
  const adminPw = req.params.adminPw || null;
  const adminPWDb = await d.getAdminPw(db_name, teamId);
  if (adminPw === adminPWDb) {
    try {
      const players = await d.getTeamPlayers(db_name, teamId)
      res.render("pages/players", { teamId, adminPw, privateKey: null, players });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.render("pages/error", { teamId, adminPw, privateKey: null, title: __("ERRORS.ACCESS.TITLE"), desc: __("ERRORS.ACCESS.DESC") });
  }
});

// GET /team/teamId/admin|user/edit/player/playerId/adminPw|userPw
app.get('/team/:teamId(\\d+)(/:accessType(admin|user))?/edit/player/:playerId(\\d+)(/:accessKey([0-9a-fA-F]{8}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?', async (req, res) => {
  const teamId = req.params.teamId;
  const playerId = req.params.playerId;

  const adminPw = (req.params.accessType === 'admin') ? req.params.accessKey : null;
  const adminPWDb = await d.getAdminPw(db_name, teamId);

  const userPw = (req.params.accessType === 'user') ? req.params.accessKey : null;
  const userPwDb = await d.getUserPw(db_name, playerId);

  if ( userPw=== userPwDb || adminPw === adminPWDb) {
    try {
      const playerInfo = await d.getPlayerInfo(db_name, playerId);
      res.render("pages/team-new-player", { teamId, adminPw, userPw, privateKey: null, playerInfo, formType: "Edit"});
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.render("pages/error", { teamId, adminPw, privateKey: null, title: __("ERRORS.ACCESS.TITLE"), desc: __("ERRORS.ACCESS.DESC") });
  }
});

// POST /team/teamId/admin|user/edit/player/playerId/adminPw|userPw
app.post('/team/:teamId(\\d+)(/:accessType(admin|user))?/edit/player/:playerId(\\d+)(/:accessKey([0-9a-fA-F]{8}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?', upload.single("image"), async (req, res) => {
  const teamId = req.params.teamId;
  const playerId = req.params.playerId;

  const adminPw = (req.params.accessType === 'admin') ? req.params.accessKey : null;
  const adminPWDb = await d.getAdminPw(db_name, teamId);

  const userPw = (req.params.accessType === 'user') ? req.params.accessKey : null;
  const userPwDb = await d.getUserPw(db_name, playerId);

  if ( userPw=== userPwDb || adminPw === adminPWDb) {

    const player = {
      username: req.body.Name,
      color: req.body.color
    };

    const db = new sqlite3.Database(db_name);
    let sql;
    let team;
    
    if (req.file) {
      sql = "UPDATE Player SET username = ?, image = ?, color = ? WHERE id = ?";
      team = [player.username, req.file.filename, player.color, playerId];
    } else {
      sql = "UPDATE Player SET username = ?, color = ? WHERE id = ?";
      team = [player.username, player.color, playerId];
    }

    db.run(sql, team, err => {
      if (err) {
        console.error(err);
      } else {
        res.redirect("/team/" + teamId + ((adminPw) ? "/admin/player/" + playerId + "/" + adminPw : ((userPw) ? "/user/player/" + playerId + "/" + userPw : "")) + '?updated=true');
      }
      db.close();
    });
  } else {
    res.render("pages/error", { teamId, adminPw, privateKey: null, title: __("ERRORS.ACCESS.TITLE"), desc: __("ERRORS.ACCESS.DESC") });
  }
});

// GET /team/teamId/admin/new-player/adminPw
app.get("/team/:teamId(\\d+)/admin/new-player(/:adminPw([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?", async (req, res) => {
  const teamId = req.params.teamId;
  const adminPw = req.params.adminPw || null;
  const adminPWDb = await d.getAdminPw(db_name, teamId);
  if (adminPw === adminPWDb) {
    res.render("pages/team-new-player", { teamId, adminPw, privateKey: null, playerInfo: { userPw: uuid.v4().substring(0, 8), color: f.randomColorHex() }, formType: "New" });
  } else {
    res.render("pages/error", { teamId, adminPw, privateKey, title: __("ERRORS.ACCESS.TITLE"), desc: __("ERRORS.ACCESS.DESC") });
  }
});

// POST /team/teamId/admin/new-player/adminPw
app.post("/team/:teamId(\\d+)/admin/new-player(/:adminPw([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?", upload.single("image"), async (req, res) => {
  const teamId = req.params.teamId;
  const adminPw = req.params.adminPw || null;
  const adminPWDb = await d.getAdminPw(db_name, teamId);
  if (adminPw === adminPWDb) {

    const player = {
      teamId: teamId,
      username: req.body.Name,
      userPw: req.body.UserPw,
      color: req.body.color
    };

    if (req.file) {
      player.image = req.file.filename;
    } else {
      player.image = "player.png"; // Image par défaut
    }

    const db = new sqlite3.Database(db_name);
    const sql = "INSERT INTO Player (teamId, username, image, userPw, color) VALUES (?, ?, ?, ?, ?)";
    const team = [player.teamId, player.username, player.image, player.userPw, player.color];
    db.run(sql, team, err => {
      res.redirect("/team/" + teamId + "/admin/" + adminPw);
      db.close();
    });
  } else {
    res.render("pages/error", { teamId, adminPw, privateKey: null, title: __("ERRORS.ACCESS.TITLE"), desc: __("ERRORS.ACCESS.DESC") });
  }
});

// GET /team/teamId/admin/new-match/adminPw
app.get("/team/:teamId(\\d+)/admin/new-match(/:adminPw([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?", async (req, res) => {
  const teamId = req.params.teamId;
  const adminPw = req.params.adminPw || null;
  const adminPWDb = await d.getAdminPw(db_name, teamId);
  if (adminPw === adminPWDb) {
    const TMjson = path.join(__dirname, "public", "json", "TMCorpo.json");
    const translatedTMCorpo = f.loadAndTranslateJson(TMjson, req);
    const TMAEjson = path.join(__dirname, "public", "json", "TMAECorpo.json");
    const translatedTMAECorpo = f.loadAndTranslateJson(TMAEjson, req);
    try {
      const teamData = await d.getTeamData(db_name, teamId)
      if (teamData) {
        res.render("pages/match-new", { teamData, teamId, adminPw, privateKey: null, translatedTMCorpo, translatedTMAECorpo });
      } else {
        res.render("pages/error", { teamId, adminPw, privateKey: null, title: __("ERRORS.NO_PLAYER.TITLE"), desc: __("ERRORS.NO_PLAYER.DESC") });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.render("pages/error", { teamId, adminPw, privateKey: null, title: __("ERRORS.ACCESS.TITLE"), desc: __("ERRORS.ACCESS.DESC") });
  }
});

// POST /team/teamId/admin/new-match/adminPw
app.post("/team/:teamId(\\d+)/admin/new-match(/:adminPw([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?", async (req, res) => {
  const teamId = req.params.teamId;
  const adminPw = req.params.adminPw || null;
  const adminPWDb = await d.getAdminPw(db_name, teamId);
  if (adminPw === adminPWDb) {
    const db = new sqlite3.Database(db_name);
    const playersInfo = JSON.parse(req.body.playersInfo);
    const gameOpt = req.body.gameOpt;
    const matchdate = f.convertDateUI2SQL(req.body.matchdate);
    const location = req.body.location
    db.run(`INSERT INTO Match (createdAt, teamId, solo, matchOpt, location) VALUES (?, ?, ?, ?, ?)`, matchdate, teamId, 0, JSON.stringify(gameOpt), location, function (err) {
      if (err) {
        console.error(err);
      } else {
        const matchId = this.lastID;

        playersInfo.forEach((player, index) => {
          db.run(`INSERT INTO MatchRanking (playerId, matchId, corporation, newRank, prevRank, standing, victoryPoints, tiePoints, tournamentId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, player.id, matchId, player.corpo, player.newrank, player.oldrank, index + 1, player.VP, player.TP, 0, (err) => {
            if (err) {
              console.error(err);
              res.sendStatus(500);
              return;
            } else if (index === playersInfo.length - 1) {
              // mise à jour des classements des joueurs
              playersInfo.forEach((player) => {
                db.run(`UPDATE Player SET rank = ? WHERE id = ?`, player.newrank, player.id, (err) => {
                  if (err) {
                    console.error(err);
                    res.sendStatus(500);
                    return;
                  }
                });
              });

              res.redirect("/team/" + teamId + "/admin/" + adminPw);
            }
          });
        });
      }
    });
    db.close();
  } else {
    res.render("pages/error", { teamId, adminPw, privateKey: null, title: __("ERRORS.ACCESS.TITLE"), desc: __("ERRORS.ACCESS.DESC") });
  }
});

// GET /team/teamId/player/playerId
app.get("/team/:teamId(\\d+)(/:accessType(admin|private|user))?/player/:playerId(\\d+)(/:accessKey([0-9a-fA-F]{8}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?", async (req, res) => {
  const teamId = req.params.teamId;
  const playerId = req.params.playerId;
  const showUpdateAlert = req.query.updated === 'true' ? true : false;

  const adminPw = (req.params.accessType === 'admin') ? req.params.accessKey : null;
  const adminPWDb = await d.getAdminPw(db_name, teamId);

  const privateKey = (req.params.accessType === 'private') ? req.params.accessKey : null;
  const privateKeyDb = await d.getPrivateKey(db_name, teamId);

  const userPw = (req.params.accessType === 'user') ? req.params.accessKey : null;
  const userPwDb = await d.getUserPw(db_name, playerId);

  if ((privateKeyDb && privateKey === privateKeyDb) || !privateKeyDb || adminPw === adminPWDb || userPw=== userPwDb) {
    try {
      const playerInfo = await d.playerPromise(db_name, playerId)
      const corporation = await d.corporationPromise(db_name, playerId);
      const bestPerforming = await d.bestPerformingPromise(db_name, playerId);
      const worstPerforming = await d.worstPerformingPromise(db_name, playerId);
      const lastFourMatches = await d.lastFourMatchesPromise(db_name, playerId);
      const playerMatches = await d.getPlayerMatchesPromise(db_name, playerId);
      res.render("pages/player", { teamId, adminPw, privateKey, userPw, playerId, showUpdateAlert, playerInfo, corporation, bestPerforming, worstPerforming, lastFourMatches, playerMatches });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.render("pages/error", { teamId, adminPw, privateKey, title: __("ERRORS.PRIVATE.TITLE"), desc: __("ERRORS.PRIVATE.DESC") });
  }
});

// GET /team/teamId/ranking
app.get("/team/:teamId(\\d+)(/:accessType(admin|private))?/ranking(/:accessKey([0-9a-fA-F]{8}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?", async (req, res) => {
  const teamId = req.params.teamId;

  const adminPw = (req.params.accessType === 'admin') ? req.params.accessKey : null;
  const adminPWDb = await d.getAdminPw(db_name, teamId);

  const privateKey = (req.params.accessType === 'private') ? req.params.accessKey : null;
  const privateKeyDb = await d.getPrivateKey(db_name, teamId);

  if ((privateKeyDb && privateKey === privateKeyDb) || !privateKeyDb || adminPw === adminPWDb) {
    const top = 100;
    try {
      const topPlayers = await d.getTopPlayersPromise(db_name, teamId, top);
      res.render("pages/ranking", { teamId, adminPw, privateKey, players: topPlayers });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.render("pages/error", { teamId, adminPw, privateKey, title: __("ERRORS.PRIVATE.TITLE"), desc: __("ERRORS.PRIVATE.DESC") });
  }
});

// GET /team/teamId/matches
app.get("/team/:teamId(\\d+)(/:accessType(admin|private))?/matches(/:accessKey([0-9a-fA-F]{8}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?", async (req, res) => {
  const teamId = req.params.teamId;

  const adminPw = (req.params.accessType === 'admin') ? req.params.accessKey : null;
  const adminPWDb = await d.getAdminPw(db_name, teamId);

  const privateKey = (req.params.accessType === 'private') ? req.params.accessKey : null;
  const privateKeyDb = await d.getPrivateKey(db_name, teamId);

  if ((privateKeyDb && privateKey === privateKeyDb) || !privateKeyDb || adminPw === adminPWDb) {
    try {
      const matches = await d.getLastMatchesPromise(db_name, teamId, null);
      res.render("pages/matches", { teamId, adminPw, privateKey, matches });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.render("pages/error", { teamId, adminPw, privateKey, title: __("ERRORS.PRIVATE.TITLE"), desc: __("ERRORS.PRIVATE.DESC") });
  }
});

// GET /team/teamId/history
app.get("/team/:teamId(\\d+)(/:accessType(admin|private))?/history(/:accessKey([0-9a-fA-F]{8}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?", async (req, res) => {
  const teamId = req.params.teamId;

  const adminPw = (req.params.accessType === 'admin') ? req.params.accessKey : null;
  const adminPWDb = await d.getAdminPw(db_name, teamId);

  const privateKey = (req.params.accessType === 'private') ? req.params.accessKey : null;
  const privateKeyDb = await d.getPrivateKey(db_name, teamId);

  if ((privateKeyDb && privateKey === privateKeyDb) || !privateKeyDb || adminPw === adminPWDb) {
    try {
      const matches = await d.getMatches(db_name, teamId);
      res.render("pages/history", { teamId, adminPw, privateKey, matches });
    } catch (err) {
      console.error(err);
      res.status(500).send('Erreur serveur');
    }
  } else {
    res.render("pages/error", { teamId, adminPw, privateKey, title: __("ERRORS.PRIVATE.TITLE"), desc: __("ERRORS.PRIVATE.DESC") });
  }
});

// GET /team/teamId/corporations
app.get("/team/:teamId(\\d+)(/:accessType(admin|private))?/corporations(/:accessKey([0-9a-fA-F]{8}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?", async (req, res) => {
  const teamId = req.params.teamId;

  const adminPw = (req.params.accessType === 'admin') ? req.params.accessKey : null;
  const adminPWDb = await d.getAdminPw(db_name, teamId);

  const privateKey = (req.params.accessType === 'private') ? req.params.accessKey : null;
  const privateKeyDb = await d.getPrivateKey(db_name, teamId);

  if ((privateKeyDb && privateKey === privateKeyDb) || !privateKeyDb || adminPw === adminPWDb) {
    try {
      const corporationsStats = await d.getCorporationsStatsPromise(db_name, teamId);
      res.render("pages/corporations", { teamId, adminPw, privateKey, corporationsStats });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.render("pages/error", { teamId, adminPw, privateKey, title: __("ERRORS.PRIVATE.TITLE"), desc: __("ERRORS.PRIVATE.DESC") });
  }
});

app.get('*', (req, res) => {
  res.status(404).send('Page not found');
});

app.listen(port, function () {
  console.log(`TMRanking listening on port ${port}`);
})