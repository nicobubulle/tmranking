const sqlite3 = require('sqlite3').verbose();
const f = require("./functions")

function convertDateSQL2UI(dateStr) {
  var dateOnly = dateStr.split(" ")[0];
  var parts = dateOnly.split("-");
  var formattedDate = parts[2] + "/" + parts[1] + "/" + parts[0];
  return formattedDate;
}

const getAllTeams = (db_name) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);

    const query = `SELECT Team.id,
                   Team.name,
                   Team.country,
                   Team.City,
                   COUNT(DISTINCT Player.id) AS players,
                   COUNT(DISTINCT Match.id) AS matches
                   FROM Team
                   LEFT JOIN Player ON Team.id = Player.teamId
                   LEFT JOIN Match ON Team.id = Match.teamId
                   WHERE Team.public = 1
                   GROUP BY Team.id
                   ORDER BY Team.id`

    db.all(query, [], (err, rows) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        const teams = rows.map(row => ({
          teamId: row.id,
          name: row.name,
          country: row.country,
          City: row.City,
          players: row.players,
          matches: row.matches
        }));
        resolve(teams);
      }
    }
    );
  });
};

const getStats = (db_name) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);

    const query = `SELECT 
                    COUNT(DISTINCT t.id) AS totalTeams, 
                    COUNT(DISTINCT p.id) AS totalPlayers, 
                    COUNT(DISTINCT m.id) AS totalMatches 
                  FROM 
                    (SELECT 1 AS id) AS dummy
                  LEFT JOIN Team t ON 1=1
                  LEFT JOIN Player p ON 1=1
                  LEFT JOIN Match m ON 1=1`;

    db.get(query, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const getPrivateKey = (db_name, teamId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);

    const query = 'SELECT privateKey FROM Team WHERE id = ? AND public = 0';

    db.get(query, [teamId], (err, row) => {
      db.close();
      if (err) {
        console.error(err.message);
        reject(err);
      }

      if (row !== undefined) {
        resolve(row.privateKey);
      } else {
        resolve(null);
      }
    });
  });
}

const getAdminPw = (db_name, teamId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);

    const query = 'SELECT adminPw FROM Team WHERE id = ?';

    db.get(query, [teamId], (err, row) => {
      db.close();
      if (err) {
        console.error(err.message);
        reject(err);
      }
      resolve(row.adminPw);
    });
  });
}

const getUserPw = (db_name, playerId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);

    const query = 'SELECT userPw FROM Player WHERE id = ?';

    db.get(query, [playerId], (err, row) => {
      db.close();
      if (err) {
        console.error(err.message);
        reject(err);
      }
      resolve(row.userPw);
    });
  });
}

const getTeamData = (db_name, teamId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);

    const query = `SELECT Team.game1Opt, Team.game2Opt, Player.id, Player.username, Player.rank, Player.color, Player.image
                   FROM Team
                   JOIN Player ON Team.id = Player.teamId
                   WHERE Team.id = ?`;

    db.all(query, [teamId], (err, rows) => {
      db.close();
      if (err) {
        console.error(err.message);
        reject(err);
      }
      // Si aucune ligne n'est renvoyée par la requête SQL, retourne null
      if (rows.length === 0) {
        resolve(null);
      } else {
        // Construit l'objet de retour avec les données de l'équipe et de tous les joueurs associés
        const teamData = {
          team: {
            game1Opt: rows[0].game1Opt,
            game2Opt: rows[0].game2Opt
          },
          players: rows.map(row => {
            return {
              id: row.id,
              username: row.username,
              rank: row.rank,
              color: row.color,
              image: row.image
            };
          })
        };

        // Retourne l'objet de retour
        resolve(teamData);
      }
    });
  });
}

const getTeamInfo = (db_name, teamID) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);

    const query = "SELECT * FROM Team WHERE id = ?";

    db.get(query, [teamID], (err, row) => {
      db.close();

      if (err) {
        reject(err);
      } else {
        resolve(row);
      }

    });
  });
}

const getPlayerInfo = (db_name, playerID) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);

    const query = "SELECT * FROM Player WHERE id = ?";

    db.get(query, [playerID], (err, row) => {
      db.close();

      if (err) {
        reject(err);
      } else {
        resolve(row);
      }

    });
  });
}

const getTeamPlayers = (db_name, teamId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);

    const query = `SELECT P.id, P.username, P.createdAt, P.rank, P.image, P.userPw, P.color, count(MR.matchId) as matchCount, max(M.createdAt) as lastMatchDate
                   FROM Player P
                   LEFT JOIN MatchRanking MR ON P.id = MR.playerId
                   LEFT JOIN Match M ON MR.matchId = M.id
                   WHERE P.teamId = ?
                   GROUP BY P.id
                   ORDER BY P.createdAt`;

    db.all(query, [teamId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const players = rows.map(row => ({
          id: row.id,
          username: row.username,
          createdAt: convertDateSQL2UI(row.createdAt),
          rank: row.rank,
          image: row.image,
          userPw: row.userPw,
          color: row.color,
          matchCount: row.matchCount,
          lastMatchDate: row.lastMatchDate ? convertDateSQL2UI(row.lastMatchDate) : null,
        }));
        resolve(players);
      }
      db.close();
    });
  });
}

const getLastWinnersPromise = (db_name, teamId, limit) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);

    let query = `SELECT Match.id, Match.createdAt, Player.username, Player.image
                 FROM Match
                 JOIN MatchRanking ON Match.id = MatchRanking.matchId
                 JOIN Player ON MatchRanking.playerId = Player.id
                 WHERE Match.solo = 0 AND Match.teamId = ? AND MatchRanking.standing = 1
                 ORDER BY Match.createdAt DESC`

    if (limit !== null) {
      query += ` LIMIT ${limit}`;
    }

    db.all(query, [teamId], (err, rows) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        const winners = rows.map(row => ({
          matchId: row.id,
          createdAt: convertDateSQL2UI(row.createdAt),
          username: row.username,
          image: row.image,
        }));
        resolve(winners);
      }
    }
    );
  });
};

const getTopPlayersPromise = (db_name, teamId, limit) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);

    let query = `SELECT p.id, p.username, p.image, p.rank, COUNT(mr.playerId) as matchesPlayed
                 FROM Player p
                 LEFT JOIN MatchRanking mr ON p.id = mr.playerId
                 WHERE p.teamId = ?
                 GROUP BY p.id
                 ORDER BY p.rank DESC`

    if (limit !== null) {
      query += ` LIMIT ${limit}`;
    }

    db.all(query, [teamId], (err, rows) => {
      db.close();

      if (err) {
        reject(err);
      } else {
        const topPlayers = rows.map(row => ({
          id: row.id,
          username: row.username,
          image: row.image,
          rank: row.rank,
          matchesPlayed: row.matchesPlayed
        }));

        resolve(topPlayers);
      }
    });
  });
};

const getLastMatchesPromise = (db_name, teamId, limit) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);

    let query = `SELECT Match.id AS matchId, Match.createdAt AS matchDate, Match.location AS matchLocation, JSON_EXTRACT(Match.matchOpt, '$') AS game,
                 GROUP_CONCAT(Player.username || ':' || Player.image || ':' || MatchRanking.corporation || ':' || (MatchRanking.newRank - MatchRanking.prevRank) || ':' || MatchRanking.victoryPoints) AS playerInfo
                 FROM MatchRanking
                 JOIN Match ON Match.id = MatchRanking.matchId
                 JOIN Player ON Player.id = MatchRanking.playerId
                 WHERE Match.teamId = ?
                 GROUP BY Match.id
                 ORDER BY Match.createdAt DESC`;

    if (limit !== null) {
      query += ` LIMIT ${limit}`;
    }

    db.all(query, [teamId], (err, rows) => {
      db.close();

      if (err) {
        reject(err);
      } else {
        const matches = rows.map(row => {
          const players = row.playerInfo.split(',').map(player => {
            const [name, image, corporation, variation, victoryPoints] = player.split(':');
            if (name === '') {
              return null; // Ignore empty string
            }
            return {
              name,
              image,
              corporation,
              variation: parseInt(variation),
              victoryPoints,
            };
          }).filter(player => player !== null); // Filter out null values

          return {
            matchId: row.matchId,
            matchDate: convertDateSQL2UI(row.matchDate),
            matchOpt: JSON.parse(row.game),
            matchLocation: row.matchLocation,
            players,
          };
        });

        resolve(matches);
      }
    });
  });
};

const getCorporationsStatsPromise = (db_name, teamId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);

    const query = `SELECT JSON_EXTRACT(JSON_EXTRACT(Match.matchOpt, '$'), '$.id') AS game,
                   MatchRanking.corporation,
                   ROUND(SUM(CASE WHEN standing = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0) AS winPercentage,
                   COUNT(*) AS playCount,
                   ROUND(AVG(newRank - prevRank), 0) AS variationAverage
                   FROM MatchRanking
                   JOIN Player ON Player.id = MatchRanking.playerId
                   JOIN Match ON Match.id = MatchRanking.matchId
                   WHERE Match.teamId = ?
                   GROUP BY game, MatchRanking.corporation
                   ORDER BY winPercentage DESC`;

    db.all(query, [teamId], (err, rows) => {
      db.close();

      if (err) {
        reject(err);
      } else {
        const corporations = rows.map(row => ({
          name: row.corporation,
          game: row.game,
          winPercentage: row.winPercentage + " %",
          playCount: row.playCount,
          variationAverage: row.variationAverage,
        }));

        resolve(corporations);
      }
    });
  });
};

const getMatches = (db_name, teamId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);

    const query = `SELECT ROW_NUMBER() OVER (ORDER BY Match.createdAt) AS matchNumber,
                   Match.createdAt AS matchDate,
                   Match.location AS matchLocation,
                   JSON_EXTRACT(JSON_EXTRACT(Match.matchOpt, '$'), '$.id') AS game,
                   Player.username AS winner,
                   GROUP_CONCAT(Player.username || ':' || MatchRanking.newRank || ':' || Player.color, ';') AS playerInfo
                   FROM MatchRanking
                   JOIN Match ON Match.id = MatchRanking.matchId
                   JOIN Player ON Player.id = MatchRanking.playerId
                   WHERE Match.teamId = ?
                   GROUP BY Match.id
                   ORDER BY Match.createdAt`;

    db.all(query, [teamId], (err, rows) => {
      db.close();

      if (err) {
        reject(err);
      } else {
        const matches = rows.map((row, index) => {
          const players = row.playerInfo.split(';').map(player => {
            const [name, newRank, color] = player.split(':');
            return { name, newRank, color };
          });

          return {
            matchNumber: index + 1,
            matchDate: convertDateSQL2UI(row.matchDate),
            winner: row.winner,
            matchLocation: row.matchLocation,
            players,
          };
        });

        resolve(matches);
      }
    });
  });
};

const getMatchPromise = (db_name, matchId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);

    const query = `SELECT GROUP_CONCAT(Player.username || ':' || Player.image || ':' || MatchRanking.corporation || ':' || (MatchRanking.newRank - MatchRanking.prevRank) || ':' || MatchRanking.victoryPoints) AS playerInfo,
                 JSON_EXTRACT(Match.matchOpt, '$') AS matchOptions,
                 Match.createdAt AS matchDate,
                 Match.location AS matchLocation
                 FROM MatchRanking
                 JOIN Match ON Match.id = MatchRanking.matchId
                 JOIN Player ON Player.id = MatchRanking.playerId
                 WHERE Match.id = ?
                 GROUP BY Match.id
                 ORDER BY MatchRanking.standing`;

    db.get(query, [matchId], (err, row) => {
      db.close();

      if (err) {
        reject(err);
      } else {
        const players = row.playerInfo.split(',').map(player => {
          const [name, image, corporation, variation, victoryPoints] = player.split(':');
          if (name === '') {
            return null; // Ignore empty string
          }
          return {
            name,
            image,
            corporation,
            variation: parseInt(variation),
            victoryPoints,
          };
        }).filter(player => player !== null); // Filter out null values

        const match = {
          matchDate: convertDateSQL2UI(row.matchDate),
          matchOpt: JSON.parse(row.matchOptions),
          matchLocation: row.matchLocation,
          players,
        };

        resolve(match);
      }
    });
  });
};

const playerPromise = (db_name, playerId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);
    db.get(
      `SELECT Team.name AS teamName,
       Player.username,
       Player.createdAt,
       Player.rank,
       Player.image
       FROM Player
       JOIN Team ON Player.teamId = Team.id
       WHERE Player.id = ?`,
      playerId,
      (err, row) => {
        db.close();
        if (err) {
          reject(err);
        } else if (!row) {
          reject('Joueur introuvable');
        } else {
          const playerInfo = {
            teamName: row.teamName,
            username: row.username,
            createdAt: row.createdAt,
            rank: row.rank,
            image: row.image
          }
          resolve(playerInfo);
        }
      }
    );
  });
};

const corporationPromise = (db_name, playerId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);
    db.get(
      `SELECT MatchRanking.corporation,
       COUNT(*) AS matches
       FROM MatchRanking
       JOIN Match ON MatchRanking.matchId = Match.id
       WHERE MatchRanking.playerId = ?
       GROUP BY MatchRanking.corporation
       ORDER BY matches DESC
       LIMIT 1`,
      playerId,
      (err, row) => {
        db.close();
        if (err) {
          reject(err);
        } else if (!row) {
          const corporation = {
            favoriteCorporation: "",
            matchesPlayed: 0
          }
          resolve(corporation);
        } else {
          const corporation = {
            favoriteCorporation: row.corporation,
            matchesPlayed: row.matches
          }
          resolve(corporation);
        }
      }
    );
  });
};

const bestPerformingPromise = (db_name, playerId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);
    db.get(
      `SELECT MatchRanking.corporation, MatchRanking.newRank - MatchRanking.prevRank AS points
     FROM MatchRanking
     JOIN Match ON MatchRanking.matchId = Match.id
     WHERE MatchRanking.playerId = ?
     ORDER BY points DESC
     LIMIT 1`,
      playerId,
      (err, row) => {
        db.close();
        if (err) {
          reject(err);
        } else if (!row) {
          const bestPerforming = {
            bestPerformingCorporation: "",
            pointsGained: 0
          }
          resolve(bestPerforming);
        } else {
          const bestPerforming = {
            bestPerformingCorporation: row.corporation,
            pointsGained: row.points
          }
          resolve(bestPerforming);
        }
      }
    );
  });
};

const worstPerformingPromise = (db_name, playerId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);
    db.get(
      `SELECT MatchRanking.corporation, MatchRanking.newRank - MatchRanking.prevRank AS points
     FROM MatchRanking
     JOIN Match ON MatchRanking.matchId = Match.id
     WHERE MatchRanking.playerId = ?
     ORDER BY points ASC
     LIMIT 1`,
      playerId,
      (err, row) => {
        db.close();
        if (err) {
          reject(err);
        } else if (!row) {
          const worstPerforming = {
            worstPerformingCorporation: "",
            pointsLost: 0
          }
          resolve(worstPerforming);
        } else {
          const worstPerforming = {
            worstPerformingCorporation: row.corporation,
            pointsLost: row.points
          }
          resolve(worstPerforming);
        }
      })
  });
};

const lastFourMatchesPromise = (db_name, playerId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);
    db.get(
      `SELECT SUM(MatchRanking.newRank - MatchRanking.prevRank) AS sum_score
      FROM MatchRanking
      JOIN (
        SELECT id
        FROM Match
        WHERE id IN (
          SELECT matchId
          FROM MatchRanking
          WHERE playerId = ?
          ORDER BY id DESC
          LIMIT 4
        )
      ) lastFourMatches ON MatchRanking.matchId = lastFourMatches.id
      WHERE MatchRanking.playerId = ?`,
      [playerId, playerId],
      (err, row) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          const lastFourMatches = row.sum_score || 0;
          resolve(lastFourMatches);
        }
      }
    );
  });
};

const getPlayerMatchesPromise = (db_name, playerId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(db_name);

    const query = `SELECT MatchRanking.standing, MatchRanking.victoryPoints,
                  MatchRanking.newRank - MatchRanking.prevRank AS variation,
                  MatchRanking.corporation, MatchRanking.matchId, 
                  strftime('%s', Match.createdAt, 'start of day') AS matchdate,
                  JSON_EXTRACT(matchOpt, '$') AS game
                  FROM MatchRanking
                  JOIN Match ON MatchRanking.matchId = Match.id
                  WHERE MatchRanking.playerId = ?
                  ORDER BY matchdate DESC`;

    db.all(query, playerId, (err, rows) => {
      db.close();

      if (err) {
        reject(err);
      } else {
        const playerMatches = rows.map((row) => ({
          standing: row.standing,
          victoryPoints: row.victoryPoints,
          variation: row.variation,
          corporation: row.corporation,
          matchId: row.matchId,
          matchdate: f.convertDateSQL2UI(new Date(parseInt(row.matchdate) * 1000).toISOString().slice(0, 10)),
          game: JSON.parse(row.game).id,
        }));

        resolve(playerMatches);
      }
    });
  });
};

module.exports = {
  getStats,
  getPlayerInfo,
  getUserPw,
  getTeamPlayers,
  getTeamInfo,
  getAdminPw,
  getPrivateKey,
  getTeamData,
  getMatchPromise,
  getAllTeams,
  getMatches,
  getCorporationsStatsPromise,
  getLastMatchesPromise,
  getTopPlayersPromise,
  getLastWinnersPromise,
  playerPromise,
  corporationPromise,
  bestPerformingPromise,
  worstPerformingPromise,
  lastFourMatchesPromise,
  getPlayerMatchesPromise
};