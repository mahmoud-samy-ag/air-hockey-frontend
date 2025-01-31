if (!window.socket) {
    window.socket = io("https://air-hockey-backend.onrender.com/"); // Store socket globally
}
const socket = window.socket; // Reuse existing socket


let currentRoomCode = ""; // Store the room code globally

// Handle room creation
document.getElementById("createRoom").addEventListener("click", () => {
    const playerName = document.getElementById("playerName").value.trim();
    if (playerName) {
        console.log(`Creating room for ${playerName}`);
        socket.emit("createRoom", playerName);
    } else {
        alert("Please enter your name!");
    }
});

// Handle room creation success
socket.on("roomCreated", ({ roomCode }) => {
    currentRoomCode = roomCode; // Store the room code globally
    console.log(`Room created: ${roomCode}`);
    alert(`Room created! Share this code: ${roomCode}`);

    document.getElementById("lobby").style.display = "none";
    document.getElementById("gameInfo").style.display = "block";
    document.getElementById("roomStatus").innerText = `Waiting for opponent in Room: ${roomCode}`;
});

// Handle joining a room
document.getElementById("joinRoom").addEventListener("click", () => {
    const playerName = document.getElementById("playerName").value.trim();
    const roomCode = document.getElementById("roomCode").value.trim();

    if (playerName && roomCode) {
        currentRoomCode = roomCode; // Store the room code when joining
        console.log(`Joining Room: ${currentRoomCode}`);
        socket.emit("joinRoom", { roomCode, playerName });
    } else {
        alert("Enter both name and room code!");
    }
});

// Handle player joined event
socket.on("playerJoined", (data) => {
    if (!data || !data.players || !data.roomCode) {
        console.error("Received invalid playerJoined data:", data);
        return;
    }

    console.log("Updated Players List:", data.players);

    // Store the room code globally for both players
    currentRoomCode = data.roomCode;
    console.log("Room Code Set:", currentRoomCode);

    // Ensure UI updates for both players
    document.getElementById("lobby").style.display = "none";
    document.getElementById("gameInfo").style.display = "block";
    
    // Display current room code and player names
    document.getElementById("roomStatus").innerText = `Players: ${data.players.map(p => p.name).join(", ")} (Room: ${currentRoomCode})`;
});

// Handle error messages
socket.on("errorMessage", (message) => {
    alert(message);
});

// Handle ready button click
document.getElementById("readyButton").addEventListener("click", () => {
    if (currentRoomCode) {
        console.log(`Sending playerReady for room ${currentRoomCode}`);
        socket.emit("playerReady", currentRoomCode);
    } else {
        console.error("No room code found! Make sure the user is in a room.");
    }
});

// Handle game start countdown
socket.on("startCountdown", (count) => {
    console.log(`Countdown started: ${count} seconds`);
    document.getElementById("roomStatus").innerText = `Game starting in ${count} seconds...`;
});

// Handle player leaving
socket.on("playerLeft", (players) => {
    console.log("A player left. Remaining players:", players);
    document.getElementById("roomStatus").innerText = `Players: ${players.map(p => p.name).join(", ")}`;
});


socket.on("startGame", () => {
    console.log("Game is starting! Loading game screen...");

    // Store room code so `game.js` can access it
    localStorage.setItem("roomCode", currentRoomCode);

    // Hide lobby UI and load the game
    document.getElementById("gameInfo").style.display = "none";

    // Load game.js dynamically
    const script = document.createElement("script");
    script.src = "game.js";
    document.body.appendChild(script);
});