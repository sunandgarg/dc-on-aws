import { useSiteIntegration } from "@/hooks/useSiteIntegration";

export function WhatsAppButton() {
  const { data: phone } = useSiteIntegration("whatsapp_phone");
  const { data: message } = useSiteIntegration("whatsapp_message");
  const number = (phone || "919990109393").replace(/\D/g, "");
  const text = encodeURIComponent(message || "Hi DekhoCampus, I need help with college admissions");
  const href = `https://api.whatsapp.com/send/?phone=${number}&text=${text}&type=phone_number&app_absent=0`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 lg:bottom-6 left-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
      aria-label="Chat on WhatsApp"
      style={{ backgroundColor: "#25D366" }}
    >
      <svg viewBox="0 0 175.216 175.552" className="w-8 h-8" fill="white">
        <path d="M87.184 14.2c-40.272 0-73.036 32.746-73.052 73.018-.004 12.867 3.36 25.428 9.752 36.514L14.1 161.352l38.456-10.088c10.668 5.816 22.672 8.876 34.88 8.88h.032c40.264 0 73.032-32.752 73.048-73.028.008-19.504-7.576-37.836-21.372-51.64C125.35 21.688 107 14.208 87.184 14.2zm0 133.652h-.028c-10.884-.004-21.56-2.928-30.876-8.456l-2.216-1.312-22.932 6.016 6.12-22.356-1.44-2.292c-6.076-9.66-9.284-20.828-9.28-32.264.016-33.476 27.26-60.704 60.76-60.704 16.228.008 31.476 6.328 42.94 17.8 11.464 11.476 17.776 26.724 17.772 42.944-.016 33.484-27.268 60.724-60.74 60.724zm33.32-45.472c-1.824-.916-10.8-5.328-12.476-5.94-1.672-.612-2.892-.916-4.108.916-1.22 1.832-4.724 5.94-5.792 7.16-1.064 1.22-2.132 1.372-3.956.456-1.824-.916-7.704-2.84-14.676-9.048-5.424-4.832-9.084-10.804-10.148-12.628-1.068-1.832-.116-2.82.8-3.732.82-.82 1.824-2.136 2.736-3.204.916-1.064 1.22-1.832 1.832-3.052.612-1.22.304-2.288-.152-3.204-.456-.916-4.108-9.896-5.628-13.556-1.484-3.556-2.992-3.076-4.108-3.132-1.064-.052-2.284-.064-3.504-.064-1.22 0-3.2.456-4.872 2.288-1.672 1.832-6.388 6.244-6.388 15.224 0 8.98 6.54 17.652 7.452 18.872.916 1.22 12.872 19.644 31.184 27.548 4.356 1.88 7.756 3.004 10.408 3.844 4.372 1.388 8.352 1.192 11.496.724 3.508-.524 10.8-4.416 12.324-8.68 1.524-4.264 1.524-7.92 1.064-8.684-.456-.764-1.676-1.22-3.504-2.136z" />
      </svg>
    </a>
  );
}
