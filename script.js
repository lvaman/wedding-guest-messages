// --- Récupérer les services Firebase exposés dans l'HTML ---
const { db, doc, onSnapshot, updateDoc } = window.firebaseServices;

// --- Références aux éléments du DOM ---
let groomGuestsContainer = document.getElementById('groom-guests');
let brideGuestsContainer = document.getElementById('bride-guests');
let groomMessagesContainer = document.getElementById('groom-messages');
let brideMessagesContainer = document.getElementById('bride-messages');

/**
 * La fonction principale qui charge les données pour un type d'invité (marié ou mariée)
 * et met en place les écouteurs d'événements.
 * @param {string} type - 'groom' ou 'bride'
 */
function initializeList(type) {
    const guestDocRef = doc(db, 'guests', type);

    onSnapshot(guestDocRef, (docSnap) => {
        const guestContainer = type === 'groom' ? groomGuestsContainer : brideGuestsContainer;
        const messageContainer = type === 'groom' ? groomMessagesContainer : brideMessagesContainer;

        if (docSnap.exists()) {
            const guestData = docSnap.data().names.map(guest =>
                typeof guest === 'string' ? { name: guest, message: '' } : guest
            );
            renderUI(type, guestData, guestContainer, messageContainer);
        } else {
            console.log(`Document pour '${type}' non trouvé.`);
        }
    });

    const guestContainer = type === 'groom' ? groomGuestsContainer : brideGuestsContainer;
    initializeSortable(type, guestContainer);
}

/**
 * Affiche les listes d'invités et de messages dans le DOM.
 */
function renderUI(type, guests, guestContainer, messageContainer) {
    guestContainer.innerHTML = '';
    messageContainer.innerHTML = '';

    guests.forEach((guest, index) => {
        const guestItem = document.createElement('div');
        guestItem.className = 'guest-item';
        guestItem.textContent = guest.name;
        guestItem.dataset.id = index;
        guestContainer.appendChild(guestItem);

        const messageItem = document.createElement('div');
        messageItem.className = 'message-item';
        messageItem.dataset.id = index;

        // --- Scroll et Surlignage ---
        guestItem.addEventListener('click', () => {
            messageItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Applique la classe pour l'animation et la retire après 2 secondes
            messageItem.classList.add('highlight');
            setTimeout(() => {
                messageItem.classList.remove('highlight');
            }, 2000);
        });

        const label = document.createElement('label');
        label.textContent = `Message pour ${guest.name}`;
        
        const textarea = document.createElement('textarea');
        textarea.value = guest.message || '';
        textarea.placeholder = 'Écrivez votre message personnalisé ici...';
        
        // --- Fond vert sur le nom de l'invité ---
        const updateGuestItemStyle = () => {
            if (textarea.value.trim() !== '') {
                guestItem.classList.add('guest-item-written');
            } else {
                guestItem.classList.remove('guest-item-written');
            }
        };

        updateGuestItemStyle(); // Appliquer le style au chargement

        textarea.addEventListener('blur', () => {
            updateGuestItemStyle(); // Mettre à jour le style en quittant la zone de texte
            saveCurrentState(type);
        });
        
        messageItem.appendChild(label);
        messageItem.appendChild(textarea);
        messageContainer.appendChild(messageItem);
    });
}

/**
 * Initialise la bibliothèque SortableJS sur un conteneur d'invités.
 */
function initializeSortable(type, guestContainer) {
    const messageContainer = type === 'groom' ? groomMessagesContainer : brideMessagesContainer;
    new Sortable(guestContainer, {
        group: type,
        animation: 150,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        onEnd: function() {
            synchronizeMessageOrder(guestContainer, messageContainer);
            saveCurrentState(type);
        }
    });
}

/**
 * Réorganise les éléments de message pour correspondre à l'ordre des invités.
 */
function synchronizeMessageOrder(guestContainer, messageContainer) {
    const orderedMessageItems = Array.from(guestContainer.children).map(guestItem => {
        return messageContainer.querySelector(`.message-item[data-id="${guestItem.dataset.id}"]`);
    });
    
    // Réinsère les éléments de message dans le bon ordre
    orderedMessageItems.forEach(item => {
        if(item) messageContainer.appendChild(item);
    });
}


/**
 * Construit l'état actuel à partir du DOM et le sauvegarde sur Firebase.
 */
async function saveCurrentState(type) {
    const guestContainer = type === 'groom' ? groomGuestsContainer : brideGuestsContainer;
    const messageContainer = type === 'groom' ? groomMessagesContainer : brideMessagesContainer;

    const newGuestData = Array.from(guestContainer.children).map((guestItem, index) => {
        const name = guestItem.textContent;
        const messageItem = messageContainer.children[index];
        const message = messageItem ? messageItem.querySelector('textarea').value : '';
        return { name, message };
    });

    try {
        const guestDocRef = doc(db, 'guests', type);
        await updateDoc(guestDocRef, { names: newGuestData });
        console.log(`Liste '${type}' sauvegardée avec succès.`);
    } catch (error) {
        console.error("Erreur lors de la sauvegarde : ", error);
    }
}


// --- Lancement de l'application ---
initializeList('groom');
initializeList('bride');
