// lobby.js
document.addEventListener('DOMContentLoaded', () => {
    const socket = io('http://localhost:3000');
    const createRoomForm = document.getElementById('createRoomForm');
    const joinRoomForm = document.getElementById('joinRoomForm');
    const roomLinkDiv = document.getElementById('roomLink');
    const gameContainer = document.getElementById('renderDiv');

    // Handle room creation
    createRoomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const playerName = document.getElementById('createName').value.trim();
        if (!playerName) return;
        
        socket.emit('createRoom', { playerName }, (response) => {
            if (response.error) {
                alert(response.error);
                return;
            }
            roomLinkDiv.innerHTML = `
                <p>Room created! Share this link:</p>
                <input type="text" value="${window.location.href}?room=${response.roomId}" readonly>
            `;
            createRoomForm.style.display = 'none';
        });
    });

    // Handle room joining
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    
    if (roomId) {
        document.getElementById('roomId').value = roomId;
        document.getElementById('joinSection').style.display = 'block';
    }

    joinRoomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const playerName = document.getElementById('joinName').value.trim();
        const roomId = document.getElementById('roomId').value.trim();
        if (!playerName || !roomId) return;

        socket.emit("joinRoom", { roomId, playerName }, (response) => {
            if (response.error) {
                alert(response.error);
                return;
            }
            // Hide lobby UI and show game
            document.getElementById("lobby").style.display = "none";
            gameContainer.style.display = "block";
            
            // Only initialize the game if not already initialized
            if (!window.phaserGame) {
                window.phaserGame = new Phaser.Game(config);
            }
        });
    });

    socket.on('forceGameInit', () => {
        if (!window.phaserGame) {
            document.getElementById('lobby').style.display = 'none';
            document.getElementById('renderDiv').style.display = 'block';
            window.phaserGame = new Phaser.Game(config);
        }
    });

    callback({ success: true });
});