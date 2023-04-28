const sqlite3 = require("sqlite3").verbose();
const fs = require('fs');

const convertDateUI2SQL = (dateStr) => {
    var parts = dateStr.split("/");
    var formattedDate = parts[2] + "-" + parts[1] + "-" + parts[0];
    return formattedDate;
}

const convertDateSQL2UI = (dateStr) => {
    var parts = dateStr.split("-");
    var formattedDate = parts[2] + "/" + parts[1] + "/" + parts[0];
    return formattedDate;
}

const loadAndTranslateJson = (json, req) => {
    const jsonContent = fs.readFileSync(json, 'utf8');
    const jsonObj = JSON.parse(jsonContent);

    // Traduisez les clés 'name' en utilisant la fonction i18n
    for (const key in jsonObj) {
        jsonObj[key].name = req.__(jsonObj[key].name);
        jsonObj[key].extension = req.__(jsonObj[key].extension);
    }

    return jsonObj;
}

function randomColorHex() {
    // Générer 3 nombres aléatoires entre 0 et 255
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);

    // Convertir les nombres en chaîne hexadécimale avec 2 caractères
    const hexR = r.toString(16).padStart(2, '0');
    const hexG = g.toString(16).padStart(2, '0');
    const hexB = b.toString(16).padStart(2, '0');

    // Retourner la chaîne hexadécimale complète
    return `#${hexR}${hexG}${hexB}`;
}

const isNameUnique = (db_name, name) => {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(db_name);
        const query = 'SELECT COUNT(*) as count FROM Team WHERE name = ?';
        db.get(query, [name], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            db.close();
            resolve(row.count === 0);
        });
    });
}

//Init table
const dbinit = (db_name) => {
    fs.access(db_name, fs.F_OK, (err) => {
        if (err) {
            const db = new sqlite3.Database(db_name, err => {
                if (err) {
                    return console.error(err.message);
                }
                console.log("Connected successfully to 'teams.db'.");
                const sql_create_Team = `CREATE TABLE Team (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            country TEXT NOT NULL,
            city TEXT,
            adminPw TEXT NOT NULL,
            public INTEGER NOT NULL DEFAULT '1',
            privateKey TEXT NOT NULL,
            adminname TEXT NOT NULL,
            adminemail TEXT NOT NULL,
            game1Opt INTEGER NOT NULL,
            game2Opt INTEGER NOT NULL,
            archived INTEGER NOT NULL DEFAULT '0'
            );`;

                db.run(sql_create_Team, err => {
                    if (err) {
                        return console.error(err.message);
                    }
                    console.log("Table 'Team' created successfully.");
                });

                const sql_create_Player = `CREATE TABLE Player (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            teamId INTEGER NOT NULL,
            username TEXT NOT NULL,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            rank REAL NOT NULL DEFAULT '1000',
            image TEXT,
            userPw TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#000000'
            );`;

                db.run(sql_create_Player, err => {
                    if (err) {
                        return console.error(err.message);
                    }
                    console.log("Table 'Player' created successfully.");
                });

                const sql_create_Match = `CREATE TABLE Match (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            teamId INTEGER NOT NULL,
              solo INTEGER NOT NULL,
            matchOpt TEXT NOT NULL,            
	        location TEXT NOT NULL
            );`;

                db.run(sql_create_Match, err => {
                    if (err) {
                        return console.error(err.message);
                    }
                    console.log("Table 'Match' created successfully.");
                });

                const sql_create_MatchRanking = `CREATE TABLE MatchRanking (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            playerId INTEGER NOT NULL,
            matchId INTEGER NOT NULL,
            corporation TEXT NOT NULL,
            newRank REAL NOT NULL,
            prevRank REAL NOT NULL,
            standing INTEGER NOT NULL,
            victoryPoints INTEGER,
            tiePoints INTEGER,
            tournamentId INTEGER
            );`;

                db.run(sql_create_MatchRanking, err => {
                    if (err) {
                        return console.error(err.message);
                    }
                    console.log("Table 'MatchRanking' created successfully.");
                });

                const sql_create_Tournament = `CREATE TABLE Tournament (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            startDate TEXT NOT NULL,
            endDate TEXT NOT NULL
            );`;

                db.run(sql_create_Tournament, err => {
                    if (err) {
                        return console.error(err.message);
                    }
                    console.log("Table 'Tournament' created successfully.");
                });
                db.close();
            });
        }
    })
};


module.exports = {
    randomColorHex,
    convertDateUI2SQL,
    convertDateSQL2UI,
    loadAndTranslateJson,
    isNameUnique,
    dbinit
};