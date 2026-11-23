import { io } from 'socket.io-client'

// Resolver la URL base del socket a partir de VITE_API_URL
const resolveSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || ''
  if (apiUrl.startsWith('http')) {
    const url = new URL(apiUrl)
    return url.origin
  }
  return window.location.origin
}

const socketPath = () => {
  const apiUrl = import.meta.env.VITE_API_URL || ''
  if (apiUrl.includes('/sisec_2026/api')) {
    return '/sisec_2026/socket.io'
  }
  return '/socket.io'
}

let socketInstance = null

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(resolveSocketUrl(), {
      path: socketPath(),
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    })

    socketInstance.on('connect', () => {
      console.log('[SOCKET] Conectado a tiempo real:', socketInstance.id)
    })

    socketInstance.on('disconnect', (reason) => {
      console.log('[SOCKET] Desconectado:', reason)
    })
  }

  return socketInstance
}

export default getSocket
