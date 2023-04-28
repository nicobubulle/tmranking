$(document).ready(function () {
    // Charger le fichier JSON
    $.getJSON("/json/countries.json", function (data) {
        // Boucler sur les pays dans le fichier JSON
        $.each(data, function (key, value) {
            // Ajouter chaque pays à la liste de suggestions
            $('#countries').append('<option value="' + key + '">' + value + '</option>');
        });
    });

    // Gestionnaire d'événements pour le bouton radio "default"
    $("#default").on("click", function () {
        const default1Radio = $("#default1");
        const enable1Radio = $("#enable1");

        if ($("#default").is(":checked") && default1Radio.is(":checked")) {
            enable1Radio.prop("checked", true);
        }
    });

    // Gestionnaire d'événements pour le bouton radio "default1"
    $("#default1").on("click", function () {
        const defaultRadio = $("#default");
        const enableRadio = $("#enable");

        if ($("#default1").is(":checked") && defaultRadio.is(":checked")) {
            enableRadio.prop("checked", true);
        }
    });

    // initialiser le plugin clipboard.js
    var clipboard = new ClipboardJS('.clipboard-btn');

    // gérer l'événement "copié" et afficher le message de confirmation
    clipboard.on('success', function (e) {
        var copyText = e.trigger.parentElement.nextElementSibling;
        copyText.classList.remove('d-none');
        setTimeout(function () {
            copyText.classList.add('d-none');
        }, 5000);
    });

    // détecter les changements dans l'état des boutons radio
    $('input[name="public"]').on('change', function () {
        if ($(this).val() == "1") {
            // cacher l'élément privé si l'option "Public" est sélectionnée
            $('#private-key-row').addClass('d-none');
        } else {
            // afficher l'élément privé si l'option "Privé" est sélectionnée
            $('#private-key-row').removeClass('d-none');
        }
    });

    const nameInput = $("#team-name");
    const countryInput = $("#country-input");
    const cityInput = $("#city-input");
    const adminNameInput = $("#admin-name");
    const adminEmailInput = $("#admin-email");
    const submitBtn = $("input[type='submit']");

    function checkNameUnique() {
        // Faire une requête AJAX pour vérifier l'unicité du nom
        $.ajax({
            url: "/check-team-name",
            type: "POST",
            data: { name: nameInput.val() },
            success: function (data) {
                const nameInputDom = $("#team-name")[0];
                console.log(nameInputDom)
                if (data.isUnique) {
                    // Nom unique, ajoutez la coche verte
                    nameInputDom.classList.remove("is-invalid");
                    nameInputDom.classList.add("is-valid");

                    const feedback = nameInputDom.parentElement.querySelector(".invalid-feedback");
                    if (feedback) {
                        feedback.remove();
                    }
                } else {
                    // Nom non unique, ajoutez la croix rouge et le message d'erreur
                    nameInputDom.classList.remove("is-valid");
                    nameInputDom.classList.add("is-invalid");

                    let feedback = nameInputDom.parentElement.querySelector(".invalid-feedback");
                    if (!feedback) {
                        feedback = document.createElement("div");
                        feedback.className = "invalid-feedback";
                        nameInputDom.parentElement.appendChild(feedback);
                    }
                    feedback.textContent = "Ce nom existe déjà.";
                }
                updateSubmitButtonState();
            },
        });
    }

    function isCountryValid() {
        const options = $("#countries option");
        const inputVal = countryInput.val();
        let isValid = false;
    
        options.each(function () {
            if ($(this).val() === inputVal) {
                isValid = true;
                return false; // sortir de la boucle each
            }
        });
    
        // Ajouter ou retirer la classe 'is-valid'
        if (isValid) {
            countryInput.addClass("is-valid");
            countryInput.removeClass("is-invalid");
        } else {
            countryInput.addClass("is-invalid");
            countryInput.removeClass("is-valid");
        }
    
        updateSubmitButtonState();
    }

    function isEmpty(inputField) {
        const inputValue = inputField.val().trim();

        if (inputValue === "") {
            inputField.addClass("is-invalid");
            inputField.removeClass("is-valid");
        } else {
            inputField.addClass("is-valid");
            inputField.removeClass("is-invalid");
        }

        updateSubmitButtonState();
    }

    function validateEmail(email) {
        const re = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
        return re.test(String(email).toLowerCase());
    }

    function checkEmailValidity() {
        const isValid = validateEmail(adminEmailInput.val());
    
        if (isValid) {
            adminEmailInput.removeClass("is-invalid");
            adminEmailInput.addClass("is-valid");
        } else {
            adminEmailInput.removeClass("is-valid");
            adminEmailInput.addClass("is-invalid");
        }
    
        updateSubmitButtonState();
    }

    function updateSubmitButtonState() {
        // Vérifiez si tous les champs sont valides
        if (formType === 'Edit') {
            const allValid = 
                countryInput.hasClass("is-valid") &&
                cityInput.hasClass("is-valid") &&
                adminNameInput.hasClass("is-valid") &&
                adminEmailInput.hasClass("is-valid");
    
                submitBtn.prop("disabled", !allValid);
        } else {
            const allValid = 
                nameInput.hasClass("is-valid") && 
                countryInput.hasClass("is-valid") &&
                cityInput.hasClass("is-valid") &&
                adminNameInput.hasClass("is-valid") &&
                adminEmailInput.hasClass("is-valid");
    
                submitBtn.prop("disabled", !allValid);
        }
    }

    // Vérifiez les champs dès l'ouverture de la page en mode édition
    if (formType === 'Edit') {
        countryInput.addClass("is-valid");
        isEmpty(cityInput);
        isEmpty(adminNameInput);
        checkEmailValidity();
        updateSubmitButtonState();
    }

    // Attachez les gestionnaires d'événements pour la vérification en temps réel
    nameInput.on("input", checkNameUnique);
    countryInput.on("input", isCountryValid);
    cityInput.on("input", function () {
        isEmpty(cityInput);
    });
    adminNameInput.on("input", function () {
        isEmpty(adminNameInput);
    });
    adminEmailInput.on("input", checkEmailValidity);
});