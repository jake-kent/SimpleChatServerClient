var users = {};
var rooms = ['Welcome'];
var roomsInfo = {Welcome: {owner: "Admin", password: null}};
var bannedByRoom = {Welcome : []};
// Require the packages we will use:
var http = require("http"),
socketio = require("socket.io"),
fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.

	fs.readFile("client.html", function(err, data){
		// This callback runs when the client.html file has been read from the filesystem.

		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
});
app.listen(3456);

// Do the Socket.IO magic:
var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.
	socket.on('add_user', function(username){
		var socUser = username;
		users[socUser] = socUser;
		console.log("add_user: "+socUser); // log it to the Node.JS output
		socket.username = socUser;
		socket.room = 'Welcome';
		socket.join('Welcome');
		socket.emit('update_rooms', rooms, 'Welcome');
		console.log(socket.username + " has entered " + socket.room);
		socket.emit("message_to_client", "Admin", "You have joined: " + socket.room);
		socket.broadcast.to(socket.room).emit("message_to_client", "Admin", socket.username + " has joined the room");
		var roomUsers = [];
		var namespace = '/';
		var roomName = 'Welcome';
		for (var socketId in io.nsps[namespace].adapter.rooms[roomName]) {
			roomUsers.push(io.sockets.connected[socketId].username);
		}
		socket.emit("update_users", roomUsers, false);
		socket.broadcast.to(socket.room).emit("update_users", roomUsers, false);
	});
	// listen for switch rooms 
	socket.on('switchRooms', function(toRoom){
		var isBanned = false;
		for(var i = 0; i < bannedByRoom[toRoom].length; i++){
			if(bannedByRoom[toRoom][i] == socket.username){
				isBanned = true;
			}
		}
		// if the person is banned from the room do not let them enter
		if(isBanned == false || isBanned === false){
			var roomPassword = roomsInfo[""+toRoom+""]["password"];
			if(roomPassword != null && roomPassword !== null && roomPassword !== ''){
				console.log("prompting user for password");
				socket.emit("password_prompt", toRoom);
				socket.on('client_password', function(attempt){
					console.log("client returned attempt");
					if(attempt == roomPassword){
						console.log("password match");
						socket.leave(socket.room);
						socket.join(toRoom);
						console.log(socket.username + " has entered " + toRoom);
						socket.emit("message_to_client", "Admin", "You have joined: " + toRoom);
						socket.broadcast.to(socket.room).emit('updatechat', 'Admin', socket.username+' has left this room');
						var newRoomOwnerID = "";
						var oldRoomOwnerID = "";
						var oldRoomUsers = [];
						var newRoomUsers = [];
						var namespace = '/';
						for (var socketId in io.nsps[namespace].adapter.rooms[toRoom]) {
							var temp_user = io.sockets.connected[socketId].username;
							if(temp_user == roomsInfo[""+toRoom+""]["owner"]){
								newRoomOwnerID = socketId;
							}
							newRoomUsers.push(temp_user);
						}
						var namespace = '/';
						for (var socketId in io.nsps[namespace].adapter.rooms[socket.room]) {
							var temp_user = io.sockets.connected[socketId].username;
							if(temp_user == roomsInfo[""+socket.room+""]["owner"]){
								oldRoomOwnerID = socketId;
							}
							oldRoomUsers.push(temp_user);
						}
						// update the users in the room 
						socket.emit("update_users", newRoomUsers, false);
						socket.broadcast.to(socket.room).emit("update_users", oldRoomUsers, false);
						socket.room = toRoom;
						socket.broadcast.to(socket.room).emit("message_to_client", "Admin", socket.username + " has joined the room");
						socket.broadcast.to(socket.room).emit("update_users", newRoomUsers, false);
						socket.emit('update_rooms', rooms, toRoom);
						if (newRoomOwnerID !== "") {
							if (newRoomOwnerID === socket.id) { 
								socket.emit("update_users", newRoomUsers, true);
							}
							else{
								io.sockets.connected[newRoomOwnerID].emit("update_users", newRoomUsers, true);
							}
						}
						if (oldRoomOwnerID !== "" ) { 
							io.sockets.connected[oldRoomOwnerID].emit("update_users", oldRoomUsers, true);
						}
					}
					else{
						socket.emit("client_alert", "You entered an incorrect password please try again!");
					}
				});
}
// do this part if the room is not password protected 
else{
	console.log("no password");
	socket.leave(socket.room);
	socket.join(toRoom);
	console.log(socket.username + " has entered " + toRoom);
	socket.emit("message_to_client", "Admin", "You have joined: " + toRoom);
	socket.broadcast.to(socket.room).emit('updatechat', 'Admin', socket.username+' has left this room');
	var newRoomOwnerID = "";
	var oldRoomOwnerID = "";
	var oldRoomUsers = [];
	var newRoomUsers = [];
	var namespace = '/';
	for (var socketId in io.nsps[namespace].adapter.rooms[toRoom]) {
		var temp_user = io.sockets.connected[socketId].username; 
		if(temp_user == roomsInfo[""+toRoom+""]["owner"]){
			newRoomOwnerID = socketId;
		}
		newRoomUsers.push(temp_user);
	}
	var namespace = '/';
	for (var socketId in io.nsps[namespace].adapter.rooms[socket.room]) {
		oldRoomUsers.push(io.sockets.connected[socketId].username);
		if(temp_user == roomsInfo[""+socket.room+""]["owner"]){
			oldRoomOwnerID = socketId;
		}
		oldRoomUsers.push(temp_user);
	}
	socket.emit("update_users", newRoomUsers, false);
	socket.broadcast.to(socket.room).emit("update_users", oldRoomUsers, false);
	socket.room = toRoom;
	socket.broadcast.to(socket.room).emit("message_to_client", "Admin", socket.username + " has joined the room");
	socket.broadcast.to(socket.room).emit("update_users", newRoomUsers, false);
	socket.emit('update_rooms', rooms, toRoom);
	if (newRoomOwnerID !== "") {
		if (newRoomOwnerID === socket.id) { 
			socket.emit("update_users", newRoomUsers, true);
		}
		else{
			io.sockets.connected[newRoomOwnerID].emit("update_users", newRoomUsers, true);
		}
	}
	if (oldRoomOwnerID !== "" ) { 
		io.sockets.connected[oldRoomOwnerID].emit("update_users", oldRoomUsers, true);
	}
}
}
else{
// dont let a user endter the room if they are banned 
	console.log("Banned user " + socket.username + " attempted to enter " + toRoom);
	socket.emit("client_alert", "You were permanently banned from " + toRoom + " and may not enter.");
}
});
// this listens for create room, and then actually creates the room 
socket.on('create_room', function(roomName, roomPassword){
	if(roomPassword == null || roomPassword === null){
		console.log("adding room: " + roomName + " with no password");
		roomsInfo[""+roomName+""] = {owner: socket.username, password: null};
		bannedByRoom[""+roomName+""] = [];
		rooms.push(roomName);
		toRoom = roomName;
		socket.leave(socket.room);
		socket.join(toRoom);
		console.log(socket.username + " has entered " + toRoom);
		socket.emit("message_to_client", "Admin", "You have joined: " + toRoom);
		socket.broadcast.to(socket.room).emit('updatechat', 'Admin', socket.username+' has left this room');
		var oldRoomUsers = [];
		var newRoomUsers = [];
		var namespace = '/';
		for (var socketId in io.nsps[namespace].adapter.rooms[toRoom]) {
			newRoomUsers.push(io.sockets.connected[socketId].username);
		}
		var namespace = '/';
		for (var socketId in io.nsps[namespace].adapter.rooms[socket.room]) {
			oldRoomUsers.push(io.sockets.connected[socketId].username);
		}
		socket.emit("update_users", newRoomUsers, true);
		socket.broadcast.to(socket.room).emit("update_users", oldRoomUsers, false);
		socket.room = toRoom;
		socket.broadcast.to(socket.room).emit("message_to_client", "Admin", socket.username + " has joined the room");
		socket.broadcast.to(socket.room).emit("update_users", newRoomUsers, false);
		//socket.emit('update_rooms', rooms, toRoom);
		io.sockets.sockets.map(function(e) {
			e.emit('update_rooms', rooms, e.room);
		})
	}
	else{
	// this adds a room with no password
		console.log("adding room: " + roomName + " with password: " + roomPassword);
		roomsInfo[""+roomName+''] = {owner: socket.username, password: roomPassword};
		bannedByRoom[""+roomName+""] = [];
		rooms.push(roomName);
		toRoom = roomName;
		socket.leave(socket.room);
		socket.join(toRoom);
		console.log(socket.username + " has entered " + toRoom);
		socket.emit("message_to_client", "Admin", "You have joined: " + toRoom);
		socket.broadcast.to(socket.room).emit('updatechat', 'Admin', socket.username+' has left this room');
		var oldRoomUsers = [];
		var newRoomUsers = [];
		var namespace = '/';
		for (var socketId in io.nsps[namespace].adapter.rooms[toRoom]) {
			newRoomUsers.push(io.sockets.connected[socketId].username);
		}
		var namespace = '/';
		for (var socketId in io.nsps[namespace].adapter.rooms[socket.room]) {
			oldRoomUsers.push(io.sockets.connected[socketId].username);
		}
		socket.emit("update_users", newRoomUsers, true);
		socket.broadcast.to(socket.room).emit("update_users", oldRoomUsers, false);
		socket.room = toRoom;
		socket.broadcast.to(socket.room).emit("message_to_client", "Admin", socket.username + " has joined the room");
		socket.broadcast.to(socket.room).emit("update_users", newRoomUsers, false);
		//socket.emit('update_rooms', rooms, toRoom);
		io.sockets.sockets.map(function(e) {
			e.emit('update_rooms', rooms, e.room);
		})
	}
});
// this is listening ffor temp ban and then kicks the user bakck to welcome
socket.on('tempban', function(userName) {
	var namespace = '/';
	for (var socketId in io.nsps[namespace].adapter.rooms[socket.room]) {
		if(userName == io.sockets.connected[socketId].username){
			var switchUser = io.sockets.connected[socketId];
			toRoom = 'Welcome';
			switchUser.leave(socket.room);
			switchUser.join(toRoom);
			console.log(socket.username + " has been temporarily banned from " + socket.room);
			console.log(socket.username + " has entered " + toRoom);
			switchUser.emit("message_to_client", "Admin", "You were just temporarily kicked out of " + socket.room + " be respectful in the future to avoid a permanent ban!");
			switchUser.emit("message_to_client", "Admin", "You have joined: " + toRoom);
			socket.broadcast.to(socket.room).emit('updatechat', 'Admin', socket.username+' has left this room');
			var oldRoomUsers = [];
			var newRoomUsers = [];
			var namespace = '/';
			for (var socketId in io.nsps[namespace].adapter.rooms[toRoom]) {
				newRoomUsers.push(io.sockets.connected[socketId].username); 
			}
			var namespace = '/';
			for (var socketId in io.nsps[namespace].adapter.rooms[socket.room]) {
				oldRoomUsers.push(io.sockets.connected[socketId].username);
			}
			switchUser.emit("update_users", newRoomUsers, false);
			socket.broadcast.to(socket.room).emit("update_users", oldRoomUsers, false);
			switchUser.room = toRoom;
			socket.broadcast.to(socket.room).emit("message_to_client", "Admin", socket.username + " has joined the room");
			switchUser.broadcast.to(switchUser.room).emit("update_users", newRoomUsers, false);
			switchUser.emit('update_rooms', rooms, toRoom);
			socket.emit("update_users", oldRoomUsers, true);
		}
	}
});
// this is listening for perm ban and adds the users to an array associated with the room so that they ccan nevver reenter
socket.on('permban', function(userName) {
	var namespace = '/';
	for (var socketId in io.nsps[namespace].adapter.rooms[socket.room]) {
		if(userName == io.sockets.connected[socketId].username){
			var switchUser = io.sockets.connected[socketId];
			toRoom = 'Welcome';
			switchUser.leave(socket.room);
			switchUser.join(toRoom);
			console.log(socket.username + " has been permanently banned from " + socket.room);
			console.log(socket.username + " has entered " + toRoom);
			switchUser.emit("message_to_client", "Admin", "You were just permanently kicked out of " + socket.room + ". Sorry, not sorry.");
			switchUser.emit("message_to_client", "Admin", "You have joined: " + toRoom);
			socket.broadcast.to(socket.room).emit('updatechat', 'Admin', socket.username + ' has left this room');
			var oldRoomUsers = [];
			var newRoomUsers = [];
			var namespace = '/';
			for (var socketId in io.nsps[namespace].adapter.rooms[toRoom]) {
				newRoomUsers.push(io.sockets.connected[socketId].username); 
			}
			var namespace = '/';
			for (var socketId in io.nsps[namespace].adapter.rooms[socket.room]) {
				oldRoomUsers.push(io.sockets.connected[socketId].username);
			}
			switchUser.emit("update_users", newRoomUsers, false);
			socket.broadcast.to(socket.room).emit("update_users", oldRoomUsers, false);
			bannedByRoom[switchUser.room].push(switchUser.username);
			switchUser.room = toRoom;
			socket.broadcast.to(socket.room).emit("message_to_client", "Admin", socket.username + " has joined the room");
			switchUser.broadcast.to(switchUser.room).emit("update_users", newRoomUsers, false);
			switchUser.emit('update_rooms', rooms, toRoom);
			socket.emit("update_users", oldRoomUsers, true);
			console.log(bannedByRoom);
		}
	}
});
// send a message 
socket.on('message_to_server', function(message) {
		// This callback runs when the server receives a new message from the client.
		console.log("public message: "+message); // log it to the Node.JS output
		socket.broadcast.to(socket.room).emit("message_to_client", socket.username, message) // broadcast the message to other users
		socket.emit("message_to_client", socket.username, message)
	});
	// send a private message
socket.on('private_message', function(message, usernames) {
	var toUsers = usernames.split(',');
	for(var i = 0; i < toUsers.length; i++){
		console.log("Private message to " + toUsers[i] + " : " + message);
		var userExists = false;
		for (var user in users) {
			if(toUsers[i] == user){
				userExists = true;
			}
		}
		// checck to make sure that the person that you are trying to send a private message to actually exists
		if(userExists == true || userExists === true){
			var userInRoom = false;
			var sendSocketId = "";
			var namespace = '/';
			for (var socketId in io.nsps[namespace].adapter.rooms[socket.room]) {
				if(toUsers[i] == io.sockets.connected[socketId].username){
					userInRoom = true;
					sendSocketId = socketId;
				}
			}
			if(userInRoom == true || userInRoom === true){
				io.sockets.connected[sendSocketId].emit("private_message_to_client", "Private message from: " + socket.username, message);
			}
			else{
				socket.emit("client_alert", "The username you entered (" + toUsers[i] + ") exists but is in another room. Please join their room to message them.");
			}
		}
		else{
			socket.emit("client_alert", "The username you entered (" + toUser[i] + ") is invalid.");
		}
	}
});
// invites a user to join your current room, if they acccept they are automatically switched into that room
socket.on('invite_user', function(username) {
	console.log(socket.username + " has invited " + username + " to " + socket.room);
	var userExists = false;
	for (var user in users) {
		if(username == user){
			userExists = true;
		}
	}
	if(userExists == true || userExists === true){
		var userInRoom = false;
		var sendSocketId = "";
		var namespace = '/';
		for (var socketId in io.nsps[namespace].adapter.rooms[socket.room]) {
			if(username == io.sockets.connected[socketId].username){
				userInRoom = true;
				sendSocketId = socketId;
			}
		}
		if(userInRoom != true || userInRoom !== true){
			io.sockets.sockets.map(function(e) {
				if(e.username == username){
					e.emit("invite_to_join", socket.username, socket.room);
				}
			})
		}
		else{
			socket.emit("client_alert", "The username you entered is already in your room.");
		}
	}
	else{
		socket.emit("client_alert", "The username you entered is invalid.");
	}
});

socket.on("disconnect", function(){
	console.log(socket.username + " has disconnected");
	socket.leave(socket.room);
	var oldRoomUsers = [];
	var namespace = '/';
	for (var socketId in io.nsps[namespace].adapter.rooms[socket.room]) {
		oldRoomUsers.push(io.sockets.connected[socketId].username);
	}
	socket.broadcast.to(socket.room).emit('updatechat', 'Admin', socket.username + ' has left this room');
	socket.broadcast.to(socket.room).emit("update_users", oldRoomUsers, false);
});
});