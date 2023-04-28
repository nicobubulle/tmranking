function selectplayer(checkboxId, playerId, playerRank) {
    const checkboxValue = checkboxId.slice(4);
    const checkDiv = document.getElementById(`check_${checkboxValue}`);
    const myImage = document.getElementById(`img_${checkboxValue}`);
    const imageSrc = myImage.getAttribute("src");

    const selectedGame = document.querySelector('.card.selected');
    const selectedGameId = selectedGame.id;
    if (selectedGameId === "tm-sel") {
        var translatedCorpo = translatedCorpoTM
    } else {
        var translatedCorpo = translatedCorpoTMAE
    }

    // Récupération de la div "stats"
    const statsDiv = document.getElementById("stats");

    // Change la couleur et l'icône de la div check_player.username
    if (checkDiv.classList.contains("selected")) {
        checkDiv.classList.remove("selected");
        checkDiv.innerHTML = "";
        // Si la checkbox est décochée, on supprime la div correspondante
        const divToRemove = document.getElementById(`${checkboxValue}_card`);
        statsDiv.removeChild(divToRemove);
    } else {
        checkDiv.classList.add("selected");
        checkDiv.innerHTML = '<i class="bi bi-check"></i>';
        // Création de la nouvelle div
        const newDiv = document.createElement("div");
        newDiv.classList.add("card");
        newDiv.classList.add("mb-3");
        newDiv.id = `${checkboxValue}_card`;
        newDiv.innerHTML = `
            <div class="card-body player" id="player_${playerId}">
                <img src="${imageSrc}" name="${checkboxValue}_img" class="rounded-circle me-2" width="32" height="32">
                <span name="${checkboxValue}_name">${checkboxValue}</span>
                <i class="bi bi-star ms-3"></i>
                <span name="${checkboxValue}_rank">${playerRank}</span>
                <hr>
                <div class="row">
                  <div class="col">
                    <div id="${checkboxValue}_score" class="row mb-1">
                      <div class="col-md-5">
                        <div class="input-group">
                          <span class="input-group-text points-input">PV</span>
                          <input type="text" name="${checkboxValue}_score" class="form-control" oninput="checkFields()" />
                        </div>
                      </div>
                    </div>
                    <div id="${checkboxValue}_tie" class="row d-none">
                      <div class="col-md-5">
                        <div class="input-group">
                          <span class="input-group-text points-input">M€</span>
                          <input type="text" name="${checkboxValue}_tie" class="form-control" oninput="checkFields()" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col">
                    <div class="input-group">
                      <span class="input-group-text"><i class="bi bi-buildings-fill"></i></span>
                      <select class="form-control select2" id="${checkboxValue}_corpo" name="${checkboxValue}_corpo" oninput="checkFields()">
                        <option value=""></option>
                      </select>
                    </div>
                  </div>
                </div>
            </div>`;
        // Ajout de la nouvelle div dans "stats"
        statsDiv.appendChild(newDiv);

        // Stocker les données dans un objet
        var options = {};
        $.each(JSON.parse(translatedCorpo), function (index, value) {
            // Ajouter chaque option à l'objet selon sa catégorie
            if (!options[value.extension]) {
                options[value.extension] = [];
            }
            options[value.extension].push(value.name);
        });

        // Parcourir chaque catégorie et ajouter les options au champ select
        $.each(options, function (key, value) {
            var optgroup = $("<optgroup>").attr("label", key);
            $.each(value, function (index, value) {
                $("<option>").attr("value", value).text(value).appendTo(optgroup);
            });
            optgroup.appendTo($(`#${checkboxValue}_corpo`));
        });

        // Initialiser le champ select avec Select2
        $(`#${checkboxValue}_corpo`).select2({
            theme: 'bootstrap-5',
            placeholder: translatedCorpoPH,
            allowClear: true
        });
    }

    // Activation du bouton "Suivant" si entre 2 et 6 joueurs sont sélectionnés
    const checkboxes = document.querySelectorAll('[id^="check_"]');
    let nbSelectedPlayers = 0;
    checkboxes.forEach((checkbox) => {
        if (checkbox.classList.contains("selected")) {
            nbSelectedPlayers++;
        }
    });
    const nextButton = document.getElementById("next-button1");
    const tabStats = document.getElementById("tab-2-stats");
    if (nbSelectedPlayers >= 2 && nbSelectedPlayers <= 6) {
        nextButton.removeAttribute("disabled");
        tabStats.classList.remove("disabled");
    } else {
        nextButton.setAttribute("disabled", "disabled");
        tabStats.classList.add("disabled");
    }
}
function navdiv(exceptDiv) {
    const divs = document.querySelectorAll('.navdiv');
    divs.forEach(div => {
        if (div.id !== exceptDiv) {
            const tab = document.getElementById(`tab-${div.id}`);
            div.classList.add('d-none');
            tab.classList.remove('active');
        } else {
            const tab = document.getElementById(`tab-${div.id}`);
            div.classList.remove('d-none');
            tab.classList.add('active');
        }
    });
}
function selectGame(gameId) {
    let otherGameId, otherGameDiv, otherGameDivOptions;

    if (gameId === "tm-sel") {
        otherGameId = "tmae-sel";
    } else {
        otherGameId = "tm-sel";
    }

    const gameDiv = document.getElementById(gameId);
    const gameDivOptions = document.getElementById(`${gameId.slice(0, -3)}options`);

    otherGameDiv = document.getElementById(otherGameId);
    otherGameDivOptions = document.getElementById(`${otherGameId.slice(0, -3)}options`);

    otherGameDiv.classList.remove("selected");
    otherGameDivOptions.classList.add("d-none");
    gameDiv.classList.add("selected");
    gameDivOptions.classList.remove("d-none");

    const nextButton = document.getElementById("next-button0");
    const playtab = document.getElementById('tab-1-players')
    nextButton.removeAttribute("disabled");
    playtab.classList.remove("disabled")
}

window.onload = function() {
    if (game1Opt === "2") {
      selectGame('tm-sel');
    } else if (game2Opt === "2") {
      selectGame('tmae-sel');
    }
  };

function checkFields() {
    const scoreInputs = document.querySelectorAll('input[name$="_score"]');
    const corpoInputs = document.querySelectorAll('select[name$="_corpo"]');
    const scoreMap = {};
    let allScoresFilled = true;
    let allCorpoFieldsFilled = true;

    for (let scoreInput of scoreInputs) {
        const value = scoreInput.value;

        if (value) {
            if (!scoreMap[value]) {
                scoreMap[value] = [];
            }
            scoreMap[value].push(scoreInput.name.replace('_score', '_tie'));
        } else {
            allScoresFilled = false;
        }

        if (isNaN(value)) {
            scoreInput.classList.add('is-invalid');
            allCorpoFieldsFilled = false;
        } else {
            scoreInput.classList.remove('is-invalid');
        }
    }

    for (let corpoInput of corpoInputs) {
        const value = corpoInput.value;

        if (!value) {
            allCorpoFieldsFilled = false;
        }
    }

    let allTieFieldsValid = true;

    for (let score in scoreMap) {
        const tieIds = scoreMap[score];

        if (tieIds.length > 1) {
            for (let tieId of tieIds) {
                const tieElement = document.getElementById(tieId);
                if (tieElement) {
                    tieElement.classList.remove('d-none');
                }

                const tieInput = tieElement.querySelector('input[name$="_tie"]');
                if (!tieInput.value) {
                    allTieFieldsValid = false;
                }
            }
        } else {
            const tieElement = document.getElementById(tieIds[0]);
            if (tieElement) {
                tieElement.classList.add('d-none');
            }
        }
    }
    const nextButton2 = document.getElementById('next-button2');
    const revtab = document.getElementById('tab-3-review')
    if (nextButton2) {
        // Activer le bouton si tous les champs requis sont remplis et valides
        if (allScoresFilled && allTieFieldsValid && allCorpoFieldsFilled) {
            nextButton2.disabled = false;
            revtab.classList.remove("disabled")
        } else {
            // Désactiver le bouton si certains champs requis ne sont pas encore remplis ou valides
            nextButton2.disabled = true;
            revtab.classList.add("disabled")
        }
    }
}
function recap() {
    // Récupérer la div qui a la classe "selected"
    const selectedDiv = document.querySelector('.selected');

    // Créer un objet JSON pour stocker les informations
    var gameOpt = {};

    gameOpt['id'] = selectedDiv.id;
    gameOpt['game'] = selectedDiv.querySelector('h5').textContent;

    // Récupérer les options éventuelles de la div
    const options = {};
    if (selectedDiv.id === 'tm-sel') {
        const select = document.querySelector('#tm-options select');
        if (select) {
            if (select.value === '') {
                options['plateau'] = null;
            } else {
                options['plateau'] = select.value;
            }
        }
    }
    options['extensions'] = [];
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        if (checkbox.checked) {
            const extension = {};
            extension['id'] = checkbox.id;
            extension['name'] = checkbox.labels[0].textContent;
            options['extensions'].push(extension);
        }
    });
    if (Object.keys(options).length > 0) {
        gameOpt['options'] = options;
    }

    // Récupérer la div match-options
    const matchOptionsDiv = document.querySelector('#match-options');

    // Créer l'image du jeu
    const gameImage = document.createElement('img');
    gameImage.src = '/images/' + gameOpt.id + '.png';
    gameImage.alt = gameOpt.game;
    gameImage.setAttribute('data-bs-toggle', 'tooltip');
    gameImage.setAttribute('data-bs-placement', 'top');
    gameImage.setAttribute('title', gameOpt.game);
    gameImage.classList.add('me-2');
    matchOptionsDiv.appendChild(gameImage);

    // Option plateau
    if (gameOpt.options.plateau) {
        const plateauText = document.createElement('span');
        plateauText.textContent = '(' + gameOpt.options.plateau + ')';
        matchOptionsDiv.appendChild(plateauText);
    }

    // Créer les images pour les extensions
    if (gameOpt.options && gameOpt.options.extensions && gameOpt.options.extensions.length > 0) {
        gameOpt.options.extensions.forEach(extension => {
            const extensionImage = document.createElement('img');
            extensionImage.src = '/images/' + extension.id + '.png';
            extensionImage.alt = extension.name;
            extensionImage.setAttribute('data-bs-toggle', 'tooltip');
            extensionImage.setAttribute('data-bs-placement', 'top');
            extensionImage.setAttribute('title', extension.name);
            matchOptionsDiv.appendChild(extensionImage);
        });
    }

    // Récupérez l'élément HTML du champ de texte
    const gameOptInput = document.getElementById("gameOpt");

    // Utilisez JSON.stringify() pour convertir le tableau en une chaîne JSON et affectez-la à la valeur du champ de texte
    gameOptInput.value = JSON.stringify(gameOpt);

    // récupérer tous les éléments avec la classe "card-body"
    const playerCards = document.querySelectorAll(".card-body.player");

    // initialiser un tableau pour stocker les informations des joueurs
    var playersInfo = [];

    // boucle à travers chaque élément de carte
    playerCards.forEach(card => {

        // récupérer l'ID du joueur
        const playerId = card.id.slice(7);

        // récupérer le nom du joueur (valeur de la case à cocher)
        const playerName = card.querySelector("span[name$='_name']").textContent;

        // récupérer le nom du joueur (valeur de la case à cocher)
        const playerRank = card.querySelector("span[name$='_rank']").textContent;

        // récupérer l'image
        const myImage = card.querySelector("img[name$='_img']");
        const playerImg = myImage.getAttribute("src");

        // récupérer la valeur sélectionnée dans la liste déroulante de corporation
        const playerCorpo = card.querySelector("select").value;

        // récupérer la valeur du champ de texte pour les points de vie
        const playerVP = card.querySelector("input[name$='_score']").value;

        // récupérer la valeur du champ de texte pour les millions d'euros (TP)
        const playerTP = card.querySelector("input[name$='_tie']").value;

        // stocker les informations du joueur dans un objet
        const playerInfo = {
            id: playerId,
            name: playerName,
            img: playerImg,
            oldrank: parseFloat(playerRank),
            corpo: playerCorpo,
            VP: playerVP,
            TP: playerTP
        };

        // ajouter l'objet au tableau des joueurs
        playersInfo.push(playerInfo);
    });

    playersInfo.sort(function (a, b) {
        const vpDiff = parseInt(b.VP) - parseInt(a.VP); // tri décroissant par VP
        if (vpDiff !== 0) {
            return vpDiff;
        }
        const tpDiff = parseInt(b.TP) - parseInt(a.TP); // tri décroissant par TP
        return tpDiff;
    });

    // Tableau pour stocker les valeurs de oldrank
    const oldRanks = [];

    // Parcourir chaque élément de playersInfo
    for (let i = 0; i < playersInfo.length; i++) {
        // Récupérer la valeur de oldrank pour l'élément en cours
        const oldRank = playersInfo[i].oldrank;

        // Ajouter la valeur de oldrank au tableau
        oldRanks.push(oldRank);
    }

    // Appeler la fonction getNewEloRatingsRelative avec le tableau de oldranks
    const newRanks = getEloRatings(oldRanks, 32, 1.2);

    // Parcourir chaque élément de playersInfo
    for (let i = 0; i < playersInfo.length; i++) {
        const player = playersInfo[i];
        player.newrank = newRanks[i];
    }

    // Récupérez l'élément HTML du champ de texte
    const playersInfoInput = document.getElementById("playersInfo");

    // Utilisez JSON.stringify() pour convertir le tableau en une chaîne JSON et affectez-la à la valeur du champ de texte
    playersInfoInput.value = JSON.stringify(playersInfo);

    // Sélectionner l'élément HTML avec l'ID "results"
    const resultsDiv = document.getElementById("results");

    // Parcourir les éléments de la variable playersInfo
    playersInfo.forEach((player, index) => {

        const evo = player.newrank - player.oldrank
        // Créer les éléments HTML
        const cardDiv = document.createElement("div");
        const cardBodyDiv = document.createElement("div");
        const row1Div = document.createElement("div");
        const col1Div = document.createElement("div");
        const imgElement = document.createElement("img");
        const playerNameSpan = document.createElement("span");
        const istarElement = document.createElement("i");
        const rankSpan = document.createElement("span");
        const iarrowElement = document.createElement("i");
        const evoSpan = document.createElement("span");
        const col2Div = document.createElement("div");
        const h4Element = document.createElement("h4");
        const badgeSpan = document.createElement("span");
        const row2Div = document.createElement("div");
        const col3Div = document.createElement("div");
        const row3Div = document.createElement("div");
        const pvDiv = document.createElement("div");
        const pvSpan = document.createElement("span");
        const col4Div = document.createElement("div");
        const h4Element2 = document.createElement("h4");

        // Ajouter les classes aux éléments HTML
        cardDiv.classList.add("card", "mb-3");
        cardBodyDiv.classList.add("card-body");
        row1Div.classList.add("row");
        col1Div.classList.add("col");
        imgElement.classList.add("rounded-circle", "me-2");
        istarElement.classList.add("bi", "bi-star", "ms-3", "me-1");
        if (evo > 0) {
            iarrowElement.classList.add("bi", "bi-caret-up-fill", "ms-3", "elo-up");
            evoSpan.classList.add("elo-up")
        } else {
            iarrowElement.classList.add("bi", "bi-caret-down-fill", "ms-3", "elo-down");
            evoSpan.classList.add("elo-down")
        }
        col2Div.classList.add("col", "text-end");
        h4Element.classList.add("mb-0");
        badgeSpan.classList.add("badge");
        row2Div.classList.add("row", "align-items-center");
        col3Div.classList.add("col");
        row3Div.classList.add("row");
        pvDiv.classList.add("d-flex", "justify-content-center", "align-items-center", "rounded-circle", "ms-3", "me-2", "pv-div");
        col4Div.classList.add("col", "text-end");
        h4Element2.classList.add("mb-0");

        // Définir les attributs des éléments HTML
        imgElement.setAttribute("src", player.img);
        imgElement.setAttribute("width", "32");
        imgElement.setAttribute("height", "32");
        playerNameSpan.textContent = player.name;
        pvSpan.textContent = player.VP;
        rankSpan.textContent = player.newrank;
        if (evo > 0) {
            evoSpan.textContent = "+" + evo.toFixed(0)
        } else {
            evoSpan.textContent = evo.toFixed(0)
        }

        // Ajouter les éléments HTML dans leur parent
        cardBodyDiv.appendChild(row1Div);
        cardBodyDiv.appendChild(document.createElement("hr"));
        cardBodyDiv.appendChild(row2Div);
        cardDiv.appendChild(cardBodyDiv);
        row1Div.appendChild(col1Div);
        row1Div.appendChild(col2Div);
        col1Div.appendChild(imgElement);
        col1Div.appendChild(playerNameSpan);
        col1Div.appendChild(istarElement);
        col1Div.appendChild(rankSpan);
        col1Div.appendChild(iarrowElement);
        col1Div.appendChild(evoSpan);
        col2Div.appendChild(h4Element);
        h4Element.appendChild(badgeSpan);
        row2Div.appendChild(col3Div);
        row2Div.appendChild(col4Div);
        col3Div.appendChild(row3Div);
        row3Div.appendChild(pvDiv);
        if (player.TP) {
            const tieDiv = document.createElement("div");
            const tieSpan = document.createElement("span");
            tieDiv.classList.add("d-flex", "justify-content-center", "align-items-center", "tie-div");
            tieSpan.classList.add("text-center");
            tieSpan.textContent = player.TP;
            row3Div.appendChild(tieDiv);
            tieDiv.appendChild(tieSpan);
        }
        col4Div.appendChild(h4Element2);
        pvDiv.appendChild(pvSpan);

        // Ajouter le texte dans les éléments HTML
        if (index === 0) {
            badgeSpan.classList.add("winner");
            badgeSpan.textContent = "Gagnant !";
        } else {
            badgeSpan.classList.add("other");
            badgeSpan.textContent = (index + 1) + "ème";
        }
        h4Element2.textContent = player.corpo;

        // Ajouter la carte dans la div results
        resultsDiv.appendChild(cardDiv);
    });
    // Initialiser les tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })
}
function checkLocation() {
    const addMatch = document.getElementById('addMatch');
    const locationInput = document.getElementById('location')
    if (locationInput.value === '') {
        addMatch.disabled = true;
    } else {
        addMatch.disabled = false;
    }
}
function today() {
    var today = new Date();
    var todayFormatted = today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return todayFormatted
}
$('#datepicker').datepicker({
    uiLibrary: 'bootstrap5',
    locale: 'fr-fr',
    format: 'dd/mm/yyyy',
    value: today(),
    weekStartDay: 1,
    maxDate: new Date(),
});
$('.gj-datepicker-bootstrap').removeClass('mb-3');