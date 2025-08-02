// Simple toast notification system
export const toast = {
  success: (message: string) => {
    showToast(message, "success")
  },
  error: (message: string) => {
    showToast(message, "error")
  },
  info: (message: string) => {
    showToast(message, "info")
  },
}

function showToast(message: string, type: "success" | "error" | "info") {
  const toast = document.createElement("div")
  toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
    type === "success"
      ? "bg-green-500 text-white"
      : type === "error"
        ? "bg-red-500 text-white"
        : "bg-blue-500 text-white"
  }`
  toast.textContent = message

  document.body.appendChild(toast)

  setTimeout(() => {
    toast.remove()
  }, 3000)
}
