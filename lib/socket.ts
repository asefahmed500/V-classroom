import { io, type Socket } from "socket.io-client"

let socket: Socket

export const initSocket = (): Socket => {
  if (!socket) {
    socket = io({
      path: "/socket.io/",
      addTrailingSlash: false,
    })
  }
  return socket
}

export const getSocket = (): Socket => {
  if (!socket) {
    return initSocket()
  }
  return socket
}
