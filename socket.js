const { addUser, removeUser, getUser, getUsers, addUnpairedUser, getUnpairedUsers, removeUnpairedUser } = require("./users")

module.exports = function (server) {
    const io = require("socket.io")(server, {
        cors: {
            "Access-Control-Allow-Origin": process.env.FRONTEND_URL
        }
    });

    io.on('connection', (socket) => {
        console.log(`⚡: ${socket.id} user just connected!`)

        socket.on("new-online-user", (userId, callback) => {
            const { error } = addUser(userId, socket.id)
            if (error) return callback(error)
            // reset online users list
            const onlineUsers = getUsers()
            io.emit("get-online-users", onlineUsers);
            callback()
        });

        socket.on("pairing-user", (userId, callback) => {
            const { error } = addUnpairedUser(userId)
            if (error) return callback(error)
            const unpairedUser = getUnpairedUsers()
            if (unpairedUser.length < 2) return
            const user = getUser(userId)
            const user2 = getUser(unpairedUser[0])
            io.to(user.socketId).emit("user-paired", user2.userId)
            removeUnpairedUser(user2.userId)
            io.to(user2.socketId).emit("user-paired", user.userId)
            removeUnpairedUser(user.userId)
        })

        socket.on("send-message", (receiver, message, callback) => {
            const user = getUser(receiver)
            if (!user) {
                return callback()
            }
            io.to(user.socketId).emit("send-message", message)
            callback()
        })

        socket.on("chat-close", (receiver, callback) => {
            const user = getUser(receiver)
            io.to(user.socketId).emit("chat-close")
            callback()
        })

        socket.on("typing", (userId) => {
            const user = getUser(userId)
            io.to(user.socketId).emit("typing")
        })

        socket.on("typing stop", (userId) => {
            const user = getUser(userId)
            io.to(user.socketId).emit("typing stop")
        })

        socket.on("screen-off", () => {
            // remove user from online users list
            const user = removeUser(socket.id)
            // reset online users list
            const onlineUsers = getUsers()
            io.emit("get-online-users", onlineUsers);
        })


        socket.on("offline", () => {
            // remove user from online users list
            const user = removeUser(socket.id)
            // reset online users list
            const onlineUsers = getUsers()
            io.emit("get-online-users", onlineUsers);
        });

        socket.on("disconnect", () => {
            // remove user from online users list
            const user = removeUser(socket.id)
            const onlineUsers = getUsers()
            // reset online users list
            io.emit("get-online-users", onlineUsers);
            console.log('🔥: A user disconnected')
        })
    });
}