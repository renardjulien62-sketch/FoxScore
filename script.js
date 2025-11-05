// --- VARIABLES GLOBALES ---
let joueurs = [];
let scoresSecrets = false;
let mancheActuelle = 0;
let lowScoreWins = true;
let monGraphique = null;
let classementFinal = [];
let nomJeuActuel = "Partie";
let categoriesJeuxConnues = []; // NOUVEAU : Pour l'autocomplétion
let joueursRecents = []; // NOUVEAU : Pour les suggestions

let sequenceForceStop = false;
let currentStepSkipper = null;

let conditionsArret = {
    score_limite: { active: false, valeur: 0 },
    score_relatif: { active: false, valeur: 0 },
    manche_total: { active: false, mancheCible: 0 },
    manche_restante: { active: false, mancheCible: 0 }
};

const inputIdMap = {
    'score_limite': 'score-limite',
    'score_relatif': 'score-relatif',
    'manche_total': 'nb-manches-total',
    'manche_restante': 'nb-manches-restantes'
};

// --- SÉLECTION DES ÉLÉMENTS HTML ---
const configEcran = document.getElementById('configuration-ecran');
const scoreEcran = document.getElementById('score-ecran');
const podiumEcran = document.getElementById('podium-ecran');
const nomJeuConfigInput = document.getElementById('nom-jeu-config');
const datalistJeux = document.getElementById('datalist-jeux'); // NOUVEAU
const nomJoueurInput = document.getElementById('nom-joueur');
const ajouterBouton = document.getElementById('ajouter-joueur');
const suggestionsJoueursDiv = document.getElementById('suggestions-joueurs'); // NOUVEAU
const listeSuggestionsJoueurs = document.getElementById('liste-suggestions-joueurs'); // NOUVEAU
const demarrerBouton = document.getElementById('demarrer-partie');
const listeJoueursConf = document.getElementById('liste-joueurs-conf');
const scoreAffichageDiv = document.getElementById('score-affichage');
const saisiePointsDiv = document.getElementById('saisie-points');
const validerTourBouton = document.getElementById('valider-tour');
const modeSecretConfig = document.getElementById('mode-secret-config');
const arreterMaintenantBouton = document.getElementById('arreter-maintenant');
const canvasGraphique = document.getElementById('graphique-scores');
const couleurJoueurInput = document.getElementById('couleur-joueur');
const revealEcran = document.getElementById('reveal-ecran');
const revealContent = document.getElementById('reveal-content');
const revealRang = document.getElementById('reveal-rang');
const revealNom = document.getElementById('reveal-nom');
const revealScore = document.getElementById('reveal-score');
const skipAllBtn = document.getElementById('skip-all-btn');
const retourAccueilBtn = document.getElementById('retour-accueil-btn');
const manchesPasseesAffichage = document.getElementById('manches-passees');
const manchesRestantesAffichageDiv = document.getElementById('manches-restantes-affichage');
const manchesRestantesAffichage = document.getElementById('manches-restantes');
const pointsRestantsAffichageDiv = document.getElementById('points-restants-affichage');
const pointsRestantsAffichage = document.getElementById('points-restants');
const conditionCheckboxes = document.querySelectorAll('.condition-checkbox');
const scoreLimiteInput = document.getElementById('score-limite');
const scoreRelatifInput = document.getElementById('score-relatif');
const nbManchesTotalInput = document.getElementById('nb-manches-total');
const nbManchesRestantesInput = document.getElementById('nb-manches-restantes');


// --- FONCTIONS UTILITAIRES ---

function pause(ms) { /* ... (inchangé) ... */
    return new Promise(resolve => {
        const timer = setTimeout(() => { currentStepSkipper = null; resolve(); }, ms);
        currentStepSkipper = () => { clearTimeout(timer); currentStepSkipper = null; resolve(); };
    });
}
function attendreFinAnimation(element) { /* ... (inchangé) ... */
    return new Promise(resolve => {
        const onAnimEnd = () => { currentStepSkipper = null; resolve(); };
        element.addEventListener('animationend', onAnimEnd, { once: true });
        currentStepSkipper = () => { element.removeEventListener('animationend', onAnimEnd); currentStepSkipper = null; resolve(); };
    });
}

function calculerRangs(joueursTries) { /* ... (inchangé) ... */
    let rangActuel = 0;
    let scorePrecedent = null;
    let nbExAequo = 1;
    joueursTries.forEach((joueur, index) => {
        if (joueur.scoreTotal !== scorePrecedent) {
            rangActuel += nbExAequo;
            nbExAequo = 1;
        } else {
            nbExAequo++;
        }
        joueur.rang = rangActuel;
        scorePrecedent = joueur.scoreTotal;
    });
    return joueursTries;
}


// (Fonction retirerJoueur - Inchangée)
function retirerJoueur(index) { /* ... (inchangé) ... */
    joueurs.splice(index, 1);
    mettreAJourListeJoueurs();
    verifierPeutDemarrer();
 }
// (Fonction mettreAJourListeJoueurs - Inchangée)
function mettreAJourListeJoueurs() { /* ... (inchangé) ... */
    listeJoueursConf.innerHTML = '';
    if (joueurs.length === 0) { listeJoueursConf.innerHTML = '<p>Ajoutez au moins deux joueurs pour commencer.</p>'; return; }
    joueurs.forEach((joueur, index) => {
        const tag = document.createElement('div'); tag.className = 'joueur-tag';
        const swatch = document.createElement('span'); swatch.className = 'joueur-couleur-swatch'; swatch.style.backgroundColor = joueur.couleur;
        const nom = document.createElement('span'); nom.textContent = joueur.nom;
        const retirerBtn = document.createElement('button'); retirerBtn.className = 'bouton-retirer'; retirerBtn.innerHTML = '&times;'; retirerBtn.title = `Retirer ${joueur.nom}`;
        retirerBtn.addEventListener('click', () => { retirerJoueur(index); });
        tag.appendChild(swatch); tag.appendChild(nom); tag.appendChild(retirerBtn); listeJoueursConf.appendChild(tag);
    });
}
// (Fonction verifierPeutDemarrer - Inchangée)
function verifierPeutDemarrer() { /* ... (inchangé) ... */ demarrerBouton.disabled = joueurs.length < 2; }
// (Fonction genererChampsSaisie - Inchangée)
function genererChampsSaisie() { /* ... (inchangé) ... */
    saisiePointsDiv.innerHTML = '';
    joueurs.forEach((joueur, index) => {
        const div = document.createElement('div'); div.className = 'saisie-item';
        div.innerHTML = ` <label for="score-${index}"> <span class="score-couleur-swatch" style="background-color: ${joueur.couleur};"></span> ${joueur.nom} : </label> <input type="number" id="score-${index}" value="0"> `;
        saisiePointsDiv.appendChild(div);
    });
}

function mettreAJourScoresAffichage() { /* ... (inchangé) ... */
    scoreAffichageDiv.innerHTML = '';
    let listePourAffichage = [];
    if (!scoresSecrets) {
        let joueursTries = [...joueurs].sort((a, b) => {
            return lowScoreWins ? a.scoreTotal - b.scoreTotal : b.scoreTotal - a.scoreTotal;
        });
        listePourAffichage = calculerRangs(joueursTries);
    } else {
        listePourAffichage = joueurs;
    }
    let html = '<table class="classement-table">';
    html += '<thead><tr><th>#</th><th>Joueur</th><th>Total</th></tr></thead>';
    html += '<tbody>';
    listePourAffichage.forEach((joueur) => {
        const rangAffichage = joueur.rang && !scoresSecrets ? joueur.rang : '-';
        html += `
            <tr>
                <td>${rangAffichage}</td>
                <td>
                    <span class="score-couleur-swatch" style="background-color: ${joueur.couleur};"></span>
                    ${joueur.nom}
                </td>
                <td class="score-total">${scoresSecrets ? '???' : `${joueur.scoreTotal} pts`}</td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    scoreAffichageDiv.innerHTML = html;
}

function mettreAJourCompteurs() { /* ... (inchangé) ... */
    manchesPasseesAffichage.textContent = mancheActuelle;
    let restantesManches = Infinity; let afficherManchesRestantes = false;
    if (conditionsArret.manche_total.active) { const totalManches = conditionsArret.manche_total.mancheCible; restantesManches = Math.max(0, totalManches - mancheActuelle); afficherManchesRestantes = true; }
    if (conditionsArret.manche_restante.active) { const mancheCible = conditionsArret.manche_restante.mancheCible; const restantesDynamiques = Math.max(0, mancheCible - mancheActuelle); restantesManches = Math.min(restantesManches, restantesDynamiques); afficherManchesRestantes = true; }
    if (afficherManchesRestantes) { manchesRestantesAffichage.textContent = restantesManches; manchesRestantesAffichageDiv.classList.remove('cache'); } else { manchesRestantesAffichageDiv.classList.add('cache'); }
    let pointsMinRestants = Infinity; let afficherPointsRestants = false;
    if (conditionsArret.score_limite.active) { const scoreMax = Math.max(...joueurs.map(j => j.scoreTotal)); const restantsAbsolu = Math.max(0, conditionsArret.score_limite.valeur - scoreMax); pointsMinRestants = Math.min(pointsMinRestants, restantsAbsolu); afficherPointsRestants = true; }
    if (conditionsArret.score_relatif.active) { joueurs.forEach(joueur => { let limiteCible = (joueur.scoreRelatifPivot || 0) + conditionsArret.score_relatif.valeur; const restantsRelatif = Math.max(0, limiteCible - joueur.scoreTotal); pointsMinRestants = Math.min(pointsMinRestants, restantsRelatif); }); afficherPointsRestants = true; }
    if (afficherPointsRestants) { pointsRestantsAffichage.textContent = pointsMinRestants; pointsRestantsAffichageDiv.classList.remove('cache'); } else { pointsRestantsAffichageDiv.classList.add('cache'); }
}
function verifierConditionsArret() { /* ... (inchangé) ... */
    if (validerTourBouton.disabled) return; let doitTerminer = false;
    if (conditionsArret.score_limite.active && conditionsArret.score_limite.valeur > 0) { if (joueurs.some(j => j.scoreTotal >= conditionsArret.score_limite.valeur)) { doitTerminer = true; } }
    if (conditionsArret.score_relatif.active && conditionsArret.score_relatif.valeur > 0) { joueurs.forEach(joueur => { let limiteCible = (joueur.scoreRelatifPivot || 0) + conditionsArret.score_relatif.valeur; if (joueur.scoreTotal >= limiteCible) { doitTerminer = true; } }); }
    if (conditionsArret.manche_total.active && mancheActuelle >= conditionsArret.manche_total.mancheCible && conditionsArret.manche_total.mancheCible > 0) { doitTerminer = true; }
    if (conditionsArret.manche_restante.active && mancheActuelle >= conditionsArret.manche_restante.mancheCible && conditionsArret.manche_restante.mancheCible > 0) { doitTerminer = true; }
    if (doitTerminer) { terminerPartie(); }
}

function construirePodiumFinal() { /* ... (inchangé) ... */
    currentStepSkipper = null;
    const podiumMap = { 1: document.getElementById('podium-1'), 2: document.getElementById('podium-2'), 3: document.getElementById('podium-3') };
    Object.values(podiumMap).forEach(el => el.classList.remove('cache'));
    const premier = classementFinal.filter(j => j.rang === 1);
    const deuxieme = classementFinal.filter(j => j.rang === 2);
    const troisieme = classementFinal.filter(j => j.rang === 3);
    const remplirPlace = (element, joueursPlace) => {
        if (joueursPlace.length > 0) {
            const joueurRef = joueursPlace[0];
            const noms = joueursPlace.map(j => j.nom).join(' & ');
            element.querySelector('.podium-nom').textContent = noms;
            element.querySelector('.podium-score').textContent = `${joueurRef.scoreTotal} pts`;
            element.style.borderColor = joueurRef.couleur;
            element.style.boxShadow = `0 0 15px ${joueurRef.couleur}80`;
        } else {
            element.classList.add('cache');
        }
    };
    remplirPlace(podiumMap[1], premier);
    remplirPlace(podiumMap[2], deuxieme);
    remplirPlace(podiumMap[3], troisieme);
    const autresListe = document.getElementById('autres-joueurs-liste');
    autresListe.innerHTML = '';
    const autresJoueurs = classementFinal.filter(j => j.rang > 3);
    if(autresJoueurs.length === 0) {
        document.getElementById('autres-joueurs').classList.add('cache');
    } else {
        document.getElementById('autres-joueurs').classList.remove('cache');
        autresJoueurs.sort((a, b) => a.rang - b.rang);
        autresJoueurs.forEach((joueur) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="score-couleur-swatch" style="background-color: ${joueur.couleur};"></span>
                <strong>${joueur.rang}. ${joueur.nom}</strong> (${joueur.scoreTotal} pts)
            `;
            autresListe.appendChild(li);
        });
    }
    const graphContainer = document.querySelector('.graphique-container');
    const graphPlaceholder = document.getElementById('graphique-final-container');
    if (graphContainer && graphPlaceholder) {
        graphPlaceholder.innerHTML = '';
        graphPlaceholder.appendChild(graphContainer);
        if (monGraphique) {
             monGraphique.resize();
        }
    }
}

function majContenuReveal(rang, joueur, estExAequoPrecedent) { /* ... (inchangé) ... */
    let rangTexte = `${rang}ème Place`;
    if (estExAequoPrecedent) { rangTexte = `Ex æquo ${rang}ème Place`; }
    if (rang === 3) rangTexte = `🥉 ${estExAequoPrecedent ? 'Ex æquo ' : ''}3ème Place`;
    if (rang === 1) rangTexte = `🥇 GAGNANT ${estExAequoPrecedent ? 'Ex æquo ' : ''}!`;
    revealRang.textContent = rangTexte;
    revealNom.textContent = joueur.nom;
    revealNom.style.color = joueur.couleur;
    revealScore.textContent = `${joueur.scoreTotal} points`;
    revealContent.classList.remove('is-revealed');
}

// MODIFIÉ : Affiche le bouton "Retour"
async function demarrerSequenceReveal() {
    scoreEcran.classList.add('cache');
    revealEcran.classList.remove('cache');
    let joueursAReveler = [];
    joueursAReveler.push(...classementFinal.filter(j => j.rang > 2).reverse());
    joueursAReveler.push(...classementFinal.filter(j => j.rang === 1));
    let rangPrecedent = null;
    for (const joueur of joueursAReveler) {
        if (sequenceForceStop) return;
        const rang = joueur.rang;
        const estExAequo = (rang === rangPrecedent);
        majContenuReveal(rang, joueur, estExAequo);
        revealContent.classList.add('slide-in-from-left');
        await attendreFinAnimation(revealContent);
        revealContent.classList.remove('slide-in-from-left');
        if (sequenceForceStop) return;
        await pause(1500);
        if (sequenceForceStop) return;
        revealContent.classList.add('shake-reveal');
        await attendreFinAnimation(revealContent);
        revealContent.classList.remove('shake-reveal');
        revealContent.classList.add('is-revealed');
        if (sequenceForceStop) return;
        await pause(2500);
        if (sequenceForceStop) return;
        if (joueur !== joueursAReveler[joueursAReveler.length - 1]) {
            revealContent.classList.add('slide-out-to-right');
            await attendreFinAnimation(revealContent);
            revealContent.classList.remove('slide-out-to-right', 'is-revealed');
        }
        rangPrecedent = rang;
    }
    revealEcran.classList.add('cache');
    podiumEcran.classList.remove('cache');
    retourAccueilBtn.classList.remove('cache'); // Affiche le bouton retour
    construirePodiumFinal();
}


function terminerPartie() { /* ... (inchangé) ... */
    sequenceForceStop = false;
    validerTourBouton.disabled = true;
    arreterMaintenantBouton.disabled = true;
    const graphContainer = document.querySelector('.graphique-container');
    if (graphContainer) {
        graphContainer.classList.remove('cache');
    }
    let joueursTries = [...joueurs].sort((a, b) => {
        return lowScoreWins ? a.scoreTotal - b.scoreTotal : b.scoreTotal - a.scoreTotal;
    });
    classementFinal = calculerRangs(joueursTries);
    sauvegarderHistoriquePartie(classementFinal);
    if (scoresSecrets) {
        scoresSecrets = false;
        mettreAJourScoresAffichage();
        if (monGraphique) {
            monGraphique.data.labels = ['Manche 0'];
            monGraphique.data.datasets.forEach(dataset => { dataset.data = [0]; });
            let scoreCumules = new Array(joueurs.length).fill(0);
            for (let i = 0; i < mancheActuelle; i++) {
                 if(monGraphique.data.labels.length <= i + 1) { monGraphique.data.labels.push(`Manche ${i + 1}`); }
                joueurs.forEach((joueur, index) => {
                    const scoreDeCeTour = joueur.scoresTour[i] || 0;
                    scoreCumules[index] += scoreDeCeTour;
                     monGraphique.data.datasets[index].data[i+1] = scoreCumules[index];
                });
            }
             const maxDataLength = Math.max(...monGraphique.data.datasets.map(d => d.data.length));
             while(monGraphique.data.labels.length < maxDataLength) { monGraphique.data.labels.push(`Manche ${monGraphique.data.labels.length}`); }
            monGraphique.update();
            monGraphique.resize();
        }
        alert("FIN DE PARTIE : Les scores secrets sont révélés !");
        setTimeout(demarrerSequenceReveal, 100);
    } else {
         mettreAJourScoresAffichage();
        demarrerSequenceReveal();
    }
}


// --- FONCTIONS GRAPHIQUE ---

function genererCouleurAleatoire() { /* ... (inchangé - corrigé) ... */
    const couleurs = [ '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#8036EB', '#FFAB91', '#81D4FA', '#FFF59D', '#A5D6A7' ];
    let couleursPrises = joueurs.map(j => j.couleur.toUpperCase()); 
    let couleurDispo = couleurs.find(c => !couleursPrises.includes(c)); 
    if (couleurDispo) { return couleurDispo; } return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}
function creerGraphique() { /* ... (inchangé) ... */
    if (monGraphique) { monGraphique.destroy(); }
    const datasets = joueurs.map((joueur, index) => ({ label: joueur.nom, data: [0], borderColor: joueur.couleur, backgroundColor: joueur.couleur + '33', fill: false, tension: 0.1 }));
    monGraphique = new Chart(canvasGraphique, { type: 'line', data: { labels: ['Manche 0'], datasets: datasets }, options: { responsive: true, plugins: { legend: { position: 'top' }, title: { display: false } }, scales: { y: { title: { display: true, text: 'Points' } }, x: { title: { display: true, text: 'Manches' } } } } });
}
function mettreAJourGraphique() { /* ... (inchangé) ... */
     if (!monGraphique) { return; }
     const labelManche = 'Manche ' + mancheActuelle;
     if (!monGraphique.data.labels.includes(labelManche)) { monGraphique.data.labels.push(labelManche); }
     joueurs.forEach((joueur, index) => {
         if(monGraphique.data.datasets[index]) {
             if (monGraphique.data.datasets[index].data.length <= mancheActuelle) { monGraphique.data.datasets[index].data.push(joueur.scoreTotal); }
             else { monGraphique.data.datasets[index].data[mancheActuelle] = joueur.scoreTotal; }
         }
     });
     monGraphique.update();
}

function recreerGraphiqueFinal() { /* ... (inchangé) ... */
    const graphContainer = document.querySelector('.graphique-container');
    const graphPlaceholder = document.getElementById('graphique-final-container');
    if (graphContainer && graphPlaceholder) {
        if (!graphPlaceholder.contains(graphContainer)) {
            graphPlaceholder.innerHTML = '';
            graphPlaceholder.appendChild(graphContainer);
        }
    }
    if (monGraphique) { monGraphique.destroy(); }
    const datasets = joueurs.map((joueur, index) => ({ 
        label: joueur.nom, 
        data: [0], 
        borderColor: joueur.couleur, 
        backgroundColor: joueur.couleur + '33', 
        fill: false, 
        tension: 0.1 
    }));
    monGraphique = new Chart(canvasGraphique, { 
        type: 'line', 
        data: { labels: ['Manche 0'], datasets: datasets }, 
        options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { title: { display: true, text: 'Points' } }, x: { title: { display: true, text: 'Manches' } } } } 
    });
    let scoreCumules = new Array(joueurs.length).fill(0);
    for (let i = 0; i < mancheActuelle; i++) {
        if(monGraphique.data.labels.length <= i + 1) { 
            monGraphique.data.labels.push(`Manche ${i + 1}`); 
        }
        joueurs.forEach((joueur, index) => {
            const scoreDeCeTour = (joueur.scoresTour && joueur.scoresTour[i]) ? joueur.scoresTour[i] : 0;
            scoreCumules[index] += scoreDeCeTour;
            if(monGraphique.data.datasets[index]) {
                monGraphique.data.datasets[index].data[i+1] = scoreCumules[index];
            }
        });
    }
    monGraphique.update();
    monGraphique.resize();
}


// --- GESTION DES ÉVÉNEMENTS ---

// (Activation/désactivation des inputs numériques - Inchangé)
conditionCheckboxes.forEach(checkbox => { /* ... (inchangé) ... */
    checkbox.addEventListener('change', (e) => { const type = e.target.dataset.type; const inputId = inputIdMap[type]; const input = document.getElementById(inputId); if (input) { input.disabled = !checkbox.checked; } mettreAJourConditionsArret(); mettreAJourCompteurs(); }); });
[scoreLimiteInput, scoreRelatifInput, nbManchesTotalInput, nbManchesRestantesInput].forEach(input => { /* ... (inchangé) ... */ input.addEventListener('change', () => { mettreAJourConditionsArret(); mettreAJourCompteurs(); }); });
function mettreAJourConditionsArret() { /* ... (inchangé) ... */
    for (const key in conditionsArret) { conditionsArret[key].active = false; }
    document.querySelectorAll('.condition-checkbox:checked').forEach(checkbox => { const type = checkbox.dataset.type; conditionsArret[type].active = true; const inputId = inputIdMap[type]; const inputElement = document.getElementById(inputId); const valeur = parseInt(inputElement.value, 10) || 0; if (type === 'score_limite') { conditionsArret.score_limite.valeur = valeur; } else if (type === 'score_relatif') { conditionsArret[type].valeur = valeur; joueurs.forEach(j => { j.scoreRelatifPivot = j.scoreTotal; }); } else if (type === 'manche_total') { conditionsArret.manche_total.mancheCible = valeur; } else if (type === 'manche_restante') { conditionsArret.manche_restante.mancheCible = mancheActuelle + valeur; } });
}

// (Ajout d'un joueur - Inchangé)
ajouterBouton.addEventListener('click', () => {
    const nom = nomJoueurInput.value.trim(); const couleur = couleurJoueurInput.value;
    if (nom && !joueurs.some(j => j.nom === nom)) { 
        joueurs.push({ nom: nom, couleur: couleur, scoreTotal: 0, scoresTour: [], scoreRelatifPivot: 0, rang: null }); 
        nomJoueurInput.value = ''; 
        couleurJoueurInput.value = genererCouleurAleatoire(); 
        mettreAJourListeJoueurs(); 
        verifierPeutDemarrer(); 
    }
    else if (joueurs.some(j => j.nom === nom)) { alert(`Le joueur "${nom}" existe déjà !`); }
});
nomJoueurInput.addEventListener('keypress', (e) => { /* ... (inchangé) ... */ if (e.key === 'Enter') { ajouterBouton.click(); } });

// (Démarrage de la partie - MODIFIÉ pour mémoriser les joueurs)
demarrerBouton.addEventListener('click', () => {
    sequenceForceStop = false; if (joueurs.length < 2) return; 
    
    nomJeuActuel = nomJeuConfigInput.value.trim() || "Partie";
    scoresSecrets = modeSecretConfig.checked; 
    const victoireChoix = document.querySelector('input[name="condition-victoire"]:checked').value; 
    lowScoreWins = (victoireChoix === 'low'); 
    mancheActuelle = 0;
    
    joueurs.forEach(j => { 
        j.scoreTotal = 0; 
        j.scoresTour = []; 
        j.scoreRelatifPivot = 0; 
        j.rang = null; 
    }); 
    
    // NOUVEAU : Mémorise les joueurs et leurs couleurs
    if (currentUser) {
        const userRef = db.collection('utilisateurs').doc(currentUser.uid);
        const joueursRecentsRef = userRef.collection('joueursRecents');
        joueurs.forEach(j => {
            // Utilise set() avec le nom comme ID pour créer/mettre à jour
            joueursRecentsRef.doc(j.nom).set({ nom: j.nom, couleur: j.couleur });
        });
        
        // Met à jour la liste locale pour la prochaine fois
        joueurs.forEach(j => {
            const index = joueursRecents.findIndex(jr => jr.nom === j.nom);
            if (index > -1) {
                joueursRecents[index].couleur = j.couleur; // Met à jour couleur
            } else {
                joueursRecents.push({ nom: j.nom, couleur: j.couleur }); // Ajoute nouveau
            }
        });
        afficherSuggestionsJoueurs(); // Rafraîchit l'UI
    }
    
    const graphContainer = document.querySelector('.graphique-container'); 
    const graphOriginalParent = document.querySelector('.score-gauche'); 
    const inputTourDiv = document.querySelector('.input-tour');
    if (graphContainer && graphOriginalParent && inputTourDiv) { 
        graphOriginalParent.insertBefore(graphContainer, inputTourDiv); 
    }
    
    podiumEcran.classList.add('cache'); 
    revealEcran.classList.add('cache');
    // On ne cache plus le bouton retour : retourAccueilBtn.classList.add('cache');
    
    if (scoresSecrets) { if (graphContainer) graphContainer.classList.add('cache'); } else { if (graphContainer) graphContainer.classList.remove('cache'); }
    mettreAJourConditionsArret(); configEcran.classList.add('cache'); scoreEcran.classList.remove('cache');
    genererChampsSaisie(); mettreAJourScoresAffichage(); mettreAJourCompteurs(); creerGraphique();
});

// (Validation d'un tour - Inchangé)
validerTourBouton.addEventListener('click', () => { /* ... (inchangé) ... */
    if (validerTourBouton.disabled) return; mancheActuelle++;
    joueurs.forEach((joueur, index) => { const inputElement = document.getElementById(`score-${index}`); const points = parseInt(inputElement.value, 10) || 0; joueur.scoreTotal += points; joueur.scoresTour.push(points); inputElement.value = 0; });
    mettreAJourScoresAffichage(); mettreAJourCompteurs(); mettreAJourGraphique(); verifierConditionsArret();
});

// (Arrêt manuel - Inchangé)
arreterMaintenantBouton.addEventListener('click', terminerPartie);

// (Événements de Skip - MODIFIÉ pour afficher le bouton retour)
revealEcran.addEventListener('click', (e) => { /* ... (inchangé) ... */ if (e.target.closest('#skip-all-btn') || e.target.closest('#reveal-content')) { return; } if (currentStepSkipper) { currentStepSkipper(); } });
skipAllBtn.addEventListener('click', () => {
    sequenceForceStop = true; 
    if (currentStepSkipper) { currentStepSkipper(); } 
    revealEcran.classList.add('cache'); 
    podiumEcran.classList.remove('cache');
    retourAccueilBtn.classList.remove('cache'); // Affiche le bouton retour
    construirePodiumFinal(); 
});

// (Bouton "Retour à l'accueil" - Inchangé, gère tous les cas)
retourAccueilBtn.addEventListener('click', () => {
    podiumEcran.classList.add('cache');
    userEcran.classList.remove('cache');
    const graphContainer = document.querySelector('.graphique-container');
    const graphOriginalParent = document.querySelector('.score-gauche');
    const inputTourDiv = document.querySelector('.input-tour');
    if (graphContainer && graphOriginalParent && inputTourDiv) {
        graphOriginalParent.insertBefore(graphContainer, inputTourDiv);
        if (monGraphique) {
            monGraphique.destroy(); 
            monGraphique = null;
        }
    }
});


// --- INITIALISATION ---
mettreAJourListeJoueurs();
verifierPeutDemarrer();
couleurJoueurInput.value = genererCouleurAleatoire();



/* =================================================================
--- SECTION AUTHENTIFICATION ET SAUVEGARDE (Code Modifié) ---
=================================================================
*/

// --- 1. Références Firebase (Auth) et Variables d'état ---

const auth = firebase.auth(); 
const authEcran = document.getElementById('auth-ecran');
const userEcran = document.getElementById('user-ecran');
const userEmail = document.getElementById('user-email');
const authErreur = document.getElementById('auth-erreur');
const listePartiesSauvegardees = document.getElementById('liste-parties-sauvegardees');
const listeHistoriqueParties = document.getElementById('liste-historique-parties');
const lancerNouvellePartieBtn = document.getElementById('lancer-nouvelle-partie-btn');
const signupBtn = document.getElementById('auth-signup');
const loginBtn = document.getElementById('auth-login');
const logoutBtn = document.getElementById('auth-logout');
const sauvegarderBtn = document.getElementById('sauvegarder-partie');
const saveFeedback = document.getElementById('save-feedback');
let partieIdActuelle = null; 
let currentUser = null;


// --- 2. Fonctions d'Authentification ---

function afficherAuthErreur(message) { /* ... (inchangé) ... */
    authErreur.textContent = message;
    authErreur.classList.remove('cache');
}
signupBtn.addEventListener('click', () => { /* ... (inchangé) ... */
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    auth.createUserWithEmailAndPassword(email, password)
        .catch(err => { afficherAuthErreur(err.message); });
});
loginBtn.addEventListener('click', () => { /* ... (inchangé) ... */
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    auth.signInWithEmailAndPassword(email, password)
        .catch(err => { afficherAuthErreur(err.message); });
});
logoutBtn.addEventListener('click', () => { /* ... (inchangé) ... */
    auth.signOut();
});

// --- 3. Gestionnaire d'état de connexion (Le Cerveau) ---

// MODIFIÉ : Appelle les chargeurs de suggestions
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        userEmail.textContent = user.email;
        authEcran.classList.add('cache');
        userEcran.classList.remove('cache');
        configEcran.classList.add('cache');
        scoreEcran.classList.add('cache');
        chargerListeParties();
        chargerHistoriqueParties();
        chargerCategoriesConnues(); // NOUVEAU
        chargerJoueursRecents(); // NOUVEAU
    } else {
        currentUser = null;
        authEcran.classList.remove('cache');
        userEcran.classList.add('cache');
        configEcran.classList.add('cache');
        scoreEcran.classList.add('cache');
        podiumEcran.classList.add('cache');
    }
});


// --- 4. Fonctions de Sauvegarde et Chargement ---

lancerNouvellePartieBtn.addEventListener('click', () => { /* ... (inchangé) ... */
    partieIdActuelle = null; 
    joueurs = [];
    mancheActuelle = 0;
    mettreAJourListeJoueurs();
    verifierPeutDemarrer();
    userEcran.classList.add('cache');
    configEcran.classList.remove('cache');
});

sauvegarderBtn.addEventListener('click', async () => { /* ... (inchangé) ... */
    if (!currentUser || validerTourBouton.disabled) return;
    const etatPartie = {
        joueurs: joueurs,
        mancheActuelle: mancheActuelle,
        scoresSecrets: scoresSecrets,
        lowScoreWins: lowScoreWins,
        conditionsArret: conditionsArret,
        dernierSauvegarde: new Date().toISOString()
    };
    const userRef = db.collection('utilisateurs').doc(currentUser.uid);
    const partiesRef = userRef.collection('parties');
    sauvegarderBtn.disabled = true;
    saveFeedback.textContent = "Sauvegarde en cours...";
    saveFeedback.classList.remove('cache');
    try {
        if (partieIdActuelle) {
            await partiesRef.doc(partieIdActuelle).set(etatPartie, { merge: true });
        } else {
            const docRef = await partiesRef.add(etatPartie);
            partieIdActuelle = docRef.id;
        }
        saveFeedback.textContent = "Partie sauvegardée !";
        setTimeout(() => saveFeedback.classList.add('cache'), 2000);
        if (!userEcran.classList.contains('cache')) {
            chargerListeParties();
        }
    } catch (err) {
        console.error("Erreur de sauvegarde: ", err);
        saveFeedback.textContent = "Erreur de sauvegarde.";
    } finally {
        sauvegarderBtn.disabled = false;
    }
});


function chargerListeParties() { /* ... (inchangé) ... */
    if (!currentUser) return;
    const userRef = db.collection('utilisateurs').doc(currentUser.uid);
    listePartiesSauvegardees.innerHTML = "Chargement...";
    userRef.collection('parties').orderBy('dernierSauvegarde', 'desc').get()
           .then(querySnapshot => {
               if (querySnapshot.empty) {
                   listePartiesSauvegardees.innerHTML = "<p>Aucune partie en cours.</p>";
                   return;
               }
               listePartiesSauvegardees.innerHTML = "";
               querySnapshot.forEach(doc => {
                   const partie = doc.data();
                   const nomsJoueurs = partie.joueurs.map(j => j.nom).join(', ');
                   const div = document.createElement('div');
                   div.innerHTML = `
                       <strong>Manche ${partie.mancheActuelle}</strong> (${nomsJoueurs})
                       <button class="charger-btn" data-id="${doc.id}">Charger</button>
                       <button class="supprimer-btn" data-id="${doc.id}">&times;</button>
                   `;
                   listePartiesSauvegardees.appendChild(div);
               });
           })
           .catch(err => {
               console.error("Erreur chargement parties: ", err);
               listePartiesSauvegardees.innerHTML = "<p>Erreur lors du chargement.</p>";
           });
}

listePartiesSauvegardees.addEventListener('click', e => { /* ... (inchangé) ... */
    const target = e.target;
    const id = target.dataset.id;
    if (!id || !currentUser) return;
    const partieRef = db.collection('utilisateurs').doc(currentUser.uid).collection('parties').doc(id);
    if (target.classList.contains('charger-btn')) {
        partieRef.get().then(doc => {
            if (doc.exists) {
                const etatPartie = doc.data();
                partieIdActuelle = doc.id;
                joueurs = etatPartie.joueurs;
                mancheActuelle = etatPartie.mancheActuelle;
                scoresSecrets = etatPartie.scoresSecrets;
                lowScoreWins = etatPartie.lowScoreWins;
                conditionsArret = etatPartie.conditionsArret;
                userEcran.classList.add('cache');
                scoreEcran.classList.remove('cache');
                validerTourBouton.disabled = false;
                arreterMaintenantBouton.disabled = false;
                document.querySelectorAll('.condition-checkbox').forEach(cb => {
                    const type = cb.dataset.type;
                    if (conditionsArret[type]) {
                        cb.checked = conditionsArret[type].active;
                        const input = document.getElementById(inputIdMap[type]);
                        if(input) {
                            input.disabled = !cb.checked;
                            if (type.includes('manche')) {
                               if (type === 'manche_total') input.value = conditionsArret[type].mancheCible;
                            } else {
                               input.value = conditionsArret[type].valeur;
                            }
                        }
                    }
                });
                genererChampsSaisie();
                mettreAJourScoresAffichage();
                creerGraphique();
                if (!scoresSecrets) {
                    let scoreCumules = new Array(joueurs.length).fill(0);
                    if (monGraphique.data.datasets.length !== joueurs.length) {
                        creerGraphique();
                    }
                    for (let i = 0; i < mancheActuelle; i++) {
                        if(monGraphique.data.labels.length <= i + 1) { monGraphique.data.labels.push(`Manche ${i + 1}`); }
                        joueurs.forEach((joueur, index) => {
                            const scoreDeCeTour = (joueur.scoresTour && joueur.scoresTour[i]) ? joueur.scoresTour[i] : 0;
                            scoreCumules[index] += scoreDeCeTour;
                             if(monGraphique.data.datasets[index]) {
                                monGraphique.data.datasets[index].data[i+1] = scoreCumules[index];
                             }
                        });
                    }
                    monGraphique.update();
                }
                mettreAJourCompteurs();
            }
        });
    } else if (target.classList.contains('supprimer-btn')) {
        if (confirm("Voulez-vous vraiment supprimer cette sauvegarde ?")) {
            partieRef.delete().then(() => {
                chargerListeParties();
            });
        }
    }
});

// --- 5. Fonctions pour l'HISTORIQUE (Modifiées) ---

// MODIFIÉ : Met à jour la liste des catégories connues
async function sauvegarderHistoriquePartie(classement) {
    if (!currentUser) return; 
    const userRef = db.collection('utilisateurs').doc(currentUser.uid);
    const historiqueRef = userRef.collection('historique');
    const entreeHistorique = {
        date: new Date().toISOString(),
        nomJeu: nomJeuActuel,
        classement: classement,
        joueursComplets: joueurs,
        manches: mancheActuelle,
        lowScoreWins: lowScoreWins
    };
    try {
        await historiqueRef.add(entreeHistorique);
        console.log("Historique de partie sauvegardé !");
        
        // NOUVEAU : Met à jour la datalist si c'est un nouveau jeu
        if (!categoriesJeuxConnues.includes(nomJeuActuel)) {
            categoriesJeuxConnues.push(nomJeuActuel);
            mettreAJourDatalistJeux();
        }
        
        if (!userEcran.classList.contains('cache')) {
            chargerHistoriqueParties();
        }
        if (partieIdActuelle) {
            const partieEnCoursRef = userRef.collection('parties').doc(partieIdActuelle);
            await partieEnCoursRef.delete();
            partieIdActuelle = null;
            console.log("Partie 'en cours' supprimée et transférée à l'historique.");
             if (!userEcran.classList.contains('cache')) {
                chargerListeParties();
             }
        }
    } catch (err) {
        console.error("Erreur sauvegarde historique: ", err);
    }
}

async function chargerHistoriqueParties() { /* ... (inchangé) ... */
    if (!currentUser) return;
    const userRef = db.collection('utilisateurs').doc(currentUser.uid);
    listeHistoriqueParties.innerHTML = "Chargement...";
    try {
        const querySnapshot = await userRef.collection('historique').orderBy('date', 'desc').get();
        if (querySnapshot.empty) {
            listeHistoriqueParties.innerHTML = "<p>Aucun historique de partie.</p>";
            return;
        }
        const partiesParJeu = {};
        querySnapshot.forEach(doc => {
            const partie = doc.data();
            partie.id = doc.id;
            const nomJeu = partie.nomJeu || "Parties";
            if (!partiesParJeu[nomJeu]) {
                partiesParJeu[nomJeu] = [];
            }
            partiesParJeu[nomJeu].push(partie);
        });
        listeHistoriqueParties.innerHTML = "";
        const nomsJeuxTries = Object.keys(partiesParJeu).sort((a, b) => a.localeCompare(b));
        nomsJeuxTries.forEach(nomJeu => {
            const parties = partiesParJeu[nomJeu];
            const detailsJeu = document.createElement('details');
            detailsJeu.className = 'groupe-jeu';
            detailsJeu.open = true;
            const summaryJeu = document.createElement('summary');
            summaryJeu.className = 'groupe-jeu-summary';
            summaryJeu.textContent = `${nomJeu} (${parties.length} partie${parties.length > 1 ? 's' : ''})`;
            detailsJeu.appendChild(summaryJeu);
            const contenuJeu = document.createElement('div');
            contenuJeu.className = 'partie-historique-contenu';
            parties.forEach(partie => {
                const vainqueurs = partie.classement.filter(j => j.rang === 1);
                const vainqueurNoms = vainqueurs.map(v => v.nom).join(' & ') || 'N/A';
                const datePartie = new Date(partie.date).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                });
                const div = document.createElement('div');
                div.className = 'partie-historique';
                div.innerHTML = `
                    <span><strong>${datePartie}</strong> - Vainqueur(s): ${vainqueurNoms}</span>
                    <div>
                        <button class="voir-hist-btn" data-id="${partie.id}" title="Voir le podium">Voir</button>
                        <button class="supprimer-hist-btn" data-id="${partie.id}" title="Supprimer de l'historique">&times;</button>
                    </div>
                `;
                contenuJeu.appendChild(div);
            });
            detailsJeu.appendChild(contenuJeu);
            listeHistoriqueParties.appendChild(detailsJeu);
        });
    } catch (err) {
        console.error("Erreur chargement historique: ", err);
        listeHistoriqueParties.innerHTML = "<p>Erreur lors du chargement.</p>";
    }
}

listeHistoriqueParties.addEventListener('click', async (e) => { /* ... (inchangé) ... */
    const target = e.target;
    const id = target.dataset.id;
    if (!id || !currentUser) return;
    if (target.classList.contains('supprimer-hist-btn')) {
        const histRef = db.collection('utilisateurs').doc(currentUser.uid).collection('historique').doc(id);
        if (confirm("Voulez-vous vraiment supprimer cette partie de l'historique ?")) {
            try {
                await histRef.delete();
                chargerHistoriqueParties();
            } catch (err) {
                console.error("Erreur de suppression: ", err);
                alert("Une erreur est survenue.");
            }
        }
    }
    if (target.classList.contains('voir-hist-btn')) {
        const histRef = db.collection('utilisateurs').doc(currentUser.uid).collection('historique').doc(id);
        try {
            const doc = await histRef.get();
            if (doc.exists) {
                const partieData = doc.data();
                classementFinal = partieData.classement;
                joueurs = partieData.joueursComplets;
                lowScoreWins = partieData.lowScoreWins;
                mancheActuelle = partieData.manches;
                userEcran.classList.add('cache');
                podiumEcran.classList.remove('cache');
                retourAccueilBtn.classList.remove('cache');
                construirePodiumFinal();
                recreerGraphiqueFinal();
            } else {
                alert("Impossible de trouver cette partie.");
            }
        } catch (err) {
            console.error("Erreur pour voir l'historique: ", err);
            alert("Erreur lors du chargement de la partie.");
        }
    }
});


// --- 6. NOUVELLES Fonctions pour les SUGGESTIONS ---

/**
 * NOUVEAU : Remplit la datalist des noms de jeux
 */
function mettreAJourDatalistJeux() {
    datalistJeux.innerHTML = ''; // Vide la liste
    categoriesJeuxConnues.forEach(nomJeu => {
        const option = document.createElement('option');
        option.value = nomJeu;
        datalistJeux.appendChild(option);
    });
}

/**
 * NOUVEAU : Charge les catégories de jeux uniques depuis l'historique
 */
async function chargerCategoriesConnues() {
    if (!currentUser) return;
    const userRef = db.collection('utilisateurs').doc(currentUser.uid);
    
    try {
        const querySnapshot = await userRef.collection('historique').get();
        const nomsJeux = new Set(); // Utilise un Set pour éviter les doublons
        querySnapshot.forEach(doc => {
            const nomJeu = doc.data().nomJeu;
            if (nomJeu) {
                nomsJeux.add(nomJeu);
            }
        });
        categoriesJeuxConnues = [...nomsJeux].sort(); // Convertit en tableau trié
        mettreAJourDatalistJeux();
    } catch (err) {
        console.error("Erreur chargement catégories: ", err);
    }
}

/**
 * NOUVEAU : Affiche les étiquettes de joueurs récents
 */
function afficherSuggestionsJoueurs() {
    listeSuggestionsJoueurs.innerHTML = ''; // Vide la liste
    if (joueursRecents.length === 0) {
        suggestionsJoueursDiv.classList.add('cache');
        return;
    }
    
    suggestionsJoueursDiv.classList.remove('cache');
    joueursRecents.sort((a,b) => a.nom.localeCompare(b.nom)).forEach(joueur => {
        const tag = document.createElement('div');
        tag.className = 'joueur-suggestion-tag';
        // Stocke les données dans le HTML
        tag.dataset.nom = joueur.nom;
        tag.dataset.couleur = joueur.couleur;
        
        tag.innerHTML = `
            <span class="joueur-couleur-swatch" style="background-color: ${joueur.couleur};"></span>
            <span>${joueur.nom}</span>
        `;
        listeSuggestionsJoueurs.appendChild(tag);
    });
}

/**
 * NOUVEAU : Charge les joueurs récents depuis la BDD
 */
async function chargerJoueursRecents() {
    if (!currentUser) return;
    const userRef = db.collection('utilisateurs').doc(currentUser.uid);
    
    try {
        const querySnapshot = await userRef.collection('joueursRecents').get();
        joueursRecents = []; // Réinitialise
        querySnapshot.forEach(doc => {
            joueursRecents.push(doc.data());
        });
        afficherSuggestionsJoueurs();
    } catch (err) {
        console.error("Erreur chargement joueurs récents: ", err);
    }
}

/**
 * NOUVEAU : Gère le clic sur une suggestion de joueur
 */
listeSuggestionsJoueurs.addEventListener('click', (e) => {
    const tag = e.target.closest('.joueur-suggestion-tag');
    if (tag) {
        const nom = tag.dataset.nom;
        const couleur = tag.dataset.couleur;
        
        // Pré-remplit les champs
        nomJoueurInput.value = nom;
        couleurJoueurInput.value = couleur;
        
        // Bonus : Tente d'ajouter directement le joueur
        // ajouterBouton.click(); 
        // -> Je le laisse en commentaire, c'est mieux de laisser l'utilisateur
        // cliquer sur "Ajouter" lui-même, au cas où il veuille changer la couleur.
    }
});
