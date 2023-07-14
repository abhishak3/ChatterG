var socketio = require('socket.io')
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = (server) => {
    io = socketio(server);

    io.sockets.on('connection', (socket) => {
        guestNumber = assignGuestName(socket, guestNumber,
            nickNames, namesUsed);

        joinRoom(socket, 'Lobby');

        handleMessageBroadcasting(socket, nickNames);
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);

        socket.on('rooms', () => {
            socket.emit('rooms', io.sockets.adapter.rooms);
        })

        handleClientDisconnection(socket, nickNames, namesUsed);
    });
};

function getUsers(socket) {
    var usersInRoom = io.sockets.adapter.rooms.get(currentRoom[socket.id]);
    return [...usersInRoom].map(user => nickNames[user]);
}

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    var name = `Guest_${guestNumber}`;
    nickNames[socket.id] = name;
    socket.emit('nameResult', { success: true, name: name });
    namesUsed.push(name);
    return guestNumber + 1;
}

function joinRoom(socket, room) {
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult', { room: room });
    socket.broadcast.to(room).emit('message', {
        type: 'system',
        text: `<span class='user-joined-msg'>${nickNames[socket.id]} has joined ${room}</span>`
    });
    io.to(currentRoom[socket.id]).emit('users', {users: getUsers(socket)});
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    socket.on('nameAttempt', (username) => {
        if (username.startsWith('Guest')) {
            socket.emit('nameResult', {
                success: false,
                message: 'Names cannot begin with Guest'
            });
        } else {
            if (namesUsed.indexOf(username) == -1) {
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(username);
                nickNames[socket.id] = username;
                delete namesUsed[previousNameIndex];

                socket.emit('nameResult', { success: true, name: username });
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    type: 'system',
                    text: `<span class='user-changed-name'>${previousName} ` 
                            + `changed their name to ${username}.</span>`
                });
            } else {
                socket.emit('nameResult', {
                    success: false,
                    message: 'Name already in use.'
                });
            }
        }
        io.to(currentRoom[socket.id]).emit('users', {users: getUsers(socket)});
    });
}

function handleMessageBroadcasting(socket) {
    socket.on('message', (message) => {
        socket.broadcast.to(message.room).emit('message', {
            type: 'user',
            text: `${nickNames[socket.id]}: ${message.text}`
        });
    });
}

function handleRoomJoining(socket) {
    socket.on('join', function(room) {
        socket.leave(currentRoom[socket.id]);
        socket.broadcast.to(currentRoom[socket.id]).emit('users', {users: getUsers(socket)});
        joinRoom(socket, room.newRoom);
    });
}

function handleClientDisconnection(socket) {
    socket.on('disconnect', function () {
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        var name = nickNames[socket.id];
        delete nickNames[socket.id];
        delete namesUsed[nameIndex];
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
            type: 'system',
            text: `<span class='user-left-msg'>${name} left.</span>`,
        });
        io.to(currentRoom[socket.id]).emit('users', {users: getUsers(socket)});
    })
}
