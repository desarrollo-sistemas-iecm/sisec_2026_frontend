import Swal from 'sweetalert2'

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  showCloseButton: true,
  background: '#ffffff',
  color: '#0f172a',
  padding: '0.85rem 1.15rem',
  customClass: {
    popup: 'swal2-modern-toast !rounded-2xl !shadow-2xl !border !border-slate-200/90 dark:!border-slate-800 dark:!bg-slate-900 dark:!text-slate-100 !backdrop-blur-md',
    title: '!text-sm !font-semibold !text-slate-800 dark:!text-slate-100 !leading-snug !m-0 !text-left',
    timerProgressBar: '!bg-gradient-to-r !from-purple-500 !to-[#6B2D8B]',
    closeButton: '!text-slate-400 hover:!text-slate-700 dark:hover:!text-white !text-lg !p-1 focus:!outline-none'
  },
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer
    toast.onmouseleave = Swal.resumeTimer
  }
})

export const useToast = () => {
  const fire = (icon, iconColor, message, options = {}) => {
    const textMsg = typeof message === 'string' ? message : (message?.text || message?.message || '')
    const titleMsg = options?.title || (typeof message === 'object' && message?.title ? message.title : '')

    Toast.fire({
      icon,
      iconColor,
      title: titleMsg || textMsg,
      html: titleMsg ? `<div class="text-xs text-slate-500 dark:text-slate-400 mt-1">${textMsg}</div>` : undefined,
      timer: options?.timeout || (icon === 'error' ? 5000 : 3500),
      ...options
    })
  }

  const success = (message, options = {}) => fire('success', '#10b981', message, options)
  const error = (message, options = {}) => fire('error', '#f43f5e', message, options)
  const warning = (message, options = {}) => fire('warning', '#f59e0b', message, options)
  const info = (message, options = {}) => fire('info', '#8b5cf6', message, options)

  return {
    success,
    error,
    warning,
    info
  }
}
