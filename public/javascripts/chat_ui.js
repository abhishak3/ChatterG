function divEscapedContentElement(message) {
    return $('<div></div>').text(message);
}

function divSystemContentElement(message) {
    return $('<div></div>').html('<strong><i>'+message+'</i></strong>');
}

function processUserInput(chatApp, socket) {
    var message = $('#message').val();
    var systemMessage;

    if (message.startsWith('/')) {
        systemMessage = chatApp.processCommand(message);
        if (systemMessage) {
            $('#messages').append(divSystemContentElement(systemMessage));
        }
    } else {
        chatApp.sendMessage($('#room').text(), message);
        $('#messages').append(divEscapedContentElement(`You: ${message}`));
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }

    $('#message').val('');
}

function updateUsers(userList) {
    var users = "";
    for (var i in userList) {
        users += `<li>${userList[i]}</li>`;
    }
    $('#user-list').html(users);
}

var socket = io.connect();
var usersInRoom = [];

$(document).ready(function() {
    var chatApp = new Chat(socket);
    
    socket.on('nameResult', (result) => {
        var message;
        if (result.success) {
            message = `<span class='user-changed-name'>You are now known as ${result.name}.</span>`;
            updateUsers(result.users);
        } else {
            message = result.message;
        }
        $('#messages').append(divSystemContentElement(message));
    });

    socket.on('joinResult', (result) => {
        $('#room').text(result.room);
        updateUsers(result.users);
        $('#messages').append(divSystemContentElement('Room Changed.'));
    });

    socket.on('message', (message) => {
        var newElement;
        if (message.type == 'system') {
            newElement = divSystemContentElement(message.text);
        } else {
            newElement = divEscapedContentElement(message.text);
        }
        $('#messages').append(newElement);
    });

    socket.on('users', ({users}) => {
        updateUsers(users);
    })

    socket.on('rooms', (rooms) => {
        $('#room-list').empty();
        for (var room in rooms) {
            room = room.substring(1, room.length);
            if (room != '') {
                $('#room-list').append(divEscapedContentElement(room));
            }
        }
        $('#room-list div').click(() => {
            chatApp.processCommand('/join' + $(this).text());
            $('#message').focus();
        });
    });

    setInterval(() => {socket.emit('rooms')}, 5000);

    $('#message').focus();

    $('#send-form').submit(() => {
        processUserInput(chatApp, socket);
        return false;
    });
});
