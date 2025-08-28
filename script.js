// Get Firebase services
const { db, doc, setDoc, onSnapshot } = window.firebaseServices;

// --- DOM Elements ---
const groomGuestsContainer = document.getElementById('groom-guests');
const brideGuestsContainer = document.getElementById('bride-guests');
const groomMessagesContainer = document.getElementById('groom-messages');
const brideMessagesContainer = document.getElementById('bride-messages');

/**
 * The main function to load data from the 'messages' collection.
 * @param {string} type - 'groom' or 'bride'
 */
function initializeList(type) {
    const messageDocRef = doc(db, 'messages', type);

    onSnapshot(messageDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const guestNames = data.order || [];
            const messages = data.messages || {};
            renderUI(type, guestNames, messages);
        } else {
            console.error(`Document for '${type}' not found in 'messages' collection.`);
        }
    });
}

/**
 * Renders the guest and message lists in the DOM.
 */
function renderUI(type, guestNames, messages) {
    const guestContainer = type === 'groom' ? groomGuestsContainer : brideGuestsContainer;
    const messageContainer = type === 'groom' ? groomMessagesContainer : brideMessagesContainer;

    guestContainer.innerHTML = '';
    messageContainer.innerHTML = '';

    guestNames.forEach(name => {
        const guestItem = document.createElement('div');
        guestItem.className = 'guest-item';
        guestItem.textContent = name;
        guestItem.dataset.name = name; // Use name as a stable ID

        const messageItem = document.createElement('div');
        messageItem.className = 'message-item';
        messageItem.dataset.name = name;

        guestItem.addEventListener('click', () => {
            messageItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageItem.classList.add('highlight');
            setTimeout(() => messageItem.classList.remove('highlight'), 2000);
        });

        const label = document.createElement('label');
        label.textContent = `Message for ${name}`;
        
        const textarea = document.createElement('textarea');
        textarea.value = messages[name] || '';
        textarea.placeholder = 'Écrivez votre message personnalisé ici...';
        
        const updateGuestItemStyle = () => {
            guestItem.classList.toggle('guest-item-written', textarea.value.trim() !== '');
        };
        updateGuestItemStyle();

        textarea.addEventListener('blur', () => {
            updateGuestItemStyle();
            saveCurrentState(type);
        });
        
        messageItem.appendChild(label);
        messageItem.appendChild(textarea);
        guestContainer.appendChild(guestItem);
        messageContainer.appendChild(messageItem);
    });

    initializeSortable(type, guestContainer);
}

/**
 * Initializes SortableJS on a guest container.
 */
function initializeSortable(type, guestContainer) {
    const messageContainer = type === 'groom' ? groomMessagesContainer : brideMessagesContainer;
    if(guestContainer.sortable) {
        guestContainer.sortable.destroy();
    }
    guestContainer.sortable = new Sortable(guestContainer, {
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
 * Reorders message items to match the order of guest items.
 */
function synchronizeMessageOrder(guestContainer, messageContainer) {
    const orderedMessageItems = Array.from(guestContainer.children).map(guestItem => {
        return messageContainer.querySelector(`.message-item[data-name="${guestItem.dataset.name}"]`);
    });
    
    orderedMessageItems.forEach(item => {
        if (item) messageContainer.appendChild(item);
    });
}

/**
 * Builds the current state from the DOM and saves it to Firebase.
 */
async function saveCurrentState(type) {
    const guestContainer = type === 'groom' ? groomGuestsContainer : brideGuestsContainer;
    const messageContainer = type === 'groom' ? groomMessagesContainer : brideMessagesContainer;

    const orderedNames = Array.from(guestContainer.children).map(item => item.dataset.name);
    const messagesToSave = {};

    Array.from(messageContainer.children).forEach(messageItem => {
        const name = messageItem.dataset.name;
        const message = messageItem.querySelector('textarea').value;
        if (message.trim() !== '') {
            messagesToSave[name] = message;
        }
    });

    try {
        const messageDocRef = doc(db, 'messages', type);
        await setDoc(messageDocRef, {
            order: orderedNames,
            messages: messagesToSave
        });
        console.log(`Data for '${type}' saved successfully.`);
    } catch (error) {
        console.error("Error while saving: ", error);
    }
}

// --- Application Start ---
initializeList('groom');
initializeList('bride');
