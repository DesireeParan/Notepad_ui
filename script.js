document.addEventListener('DOMContentLoaded', function () {
    const noteContent = document.getElementById('noteContent');
    let ctrlKeyIsPressed = false;

    noteContent.value = localStorage.getItem('note') || '';

    window.addEventListener('keydown', function (event) {
        if (event.key === 'Control') {
            ctrlKeyIsPressed = true;
        }
    });
    window.addEventListener('keyup', function (event) {
        if (event.key === 'Control') {
            ctrlKeyIsPressed = false;
        }
    });
    
    noteContent.addEventListener('wheel', function (event) {
        if (ctrlKeyIsPressed) {
            event.preventDefault();

            const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;

            // Adjust font size
            const currentFontSize = parseFloat(window.getComputedStyle(noteContent).fontSize);
            noteContent.style.fontSize = `${currentFontSize * zoomFactor}px`;
        }
    });
});

function showModal(message, imgSrc) {
    // Show the modal
    const modal = document.getElementById('customModal');
    const modalContent = modal.querySelector('p');
    const modalImage = modal.querySelector('img');
    modalContent.textContent = message;
    modalImage.src = imgSrc; // Update the image source
    modal.style.display = 'block';

    // Add event listener to close the modal
    document.getElementById('closeModal').addEventListener('click', function () {
        modal.style.display = 'none';
    });
}

function newFunction() {
    // Add logic for New
    showModal('Adding new note!', 'assets/write.gif');
}

function saveFunction() {
    // Add logic for Save
    localStorage.setItem('note', document.getElementById('noteContent').value);
    showModal('Note saved!', 'assets/dancecat.gif');
}

function undoFunction() {
    // Add logic for Undo
    showModal('Undo work!', 'assets/circle.gif');
}

function redoFunction() {
    // Add logic for Redo
    showModal('Redo work!', 'assets/cutecat.gif');
}

function printFunction() {
    // Show the modal
    showModal('Printing!', 'assets/printer.gif');
}

function rspRodu() {
    showModal('If close the window yes or No', 'assets/close-icon.gif');
}

//Modal
function openNoteModal(noteTitle) {
    document.getElementById('modalTitle').innerText = noteTitle;
    document.getElementById('noteModal').style.display = 'block';
}

function closeNoteModal() {
    document.getElementById('noteModal').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('noteModal');
    if (event.target === modal) {
        closeNoteModal();
    }
};