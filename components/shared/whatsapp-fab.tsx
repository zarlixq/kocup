export function WhatsappFab() {
  const href = "https://wa.me/905333704391?text=" + encodeURIComponent("Merhaba KoçUp")
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp ile iletişim"
      className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 flex items-center justify-center hover:scale-110 transition-transform"
    >
      <svg
        viewBox="0 0 32 32"
        fill="currentColor"
        className="w-6 h-6 md:w-7 md:h-7"
        aria-hidden="true"
      >
        <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 01-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 01-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.046 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.99 2.722.99.288 0 .53-.042.788-.157.215-.1.788-.358 1.06-.658.215-.243.301-.473.301-.703 0-.5-.401-1.247-.43-1.595zM16.176 28C9.493 28 4 22.526 4 15.81 4 9.16 9.494 3.66 16.175 3.66c6.654 0 12.149 5.5 12.149 12.15 0 6.715-5.494 12.19-12.149 12.19zm0-21.84A9.692 9.692 0 006.498 15.81c0 1.83.546 3.602 1.563 5.115L7.062 24l3.182-.99a9.578 9.578 0 005.932 2.005c5.36 0 9.708-4.345 9.708-9.677 0-5.345-4.348-9.677-9.708-9.677z" />
      </svg>
    </a>
  )
}
