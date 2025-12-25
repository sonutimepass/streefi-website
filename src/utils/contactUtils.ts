/**
 * Contact utility functions
 * Handles device-specific contact methods (WhatsApp for mobile, Email for desktop)
 */

const CONTACT_INFO = {
  phoneNumber: "917777933650",
  email: "support@streefi.in",
} as const;

/**
 * Detects if the user is on a mobile device
 */
export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    navigator.userAgent
  );
}

/**
 * Opens appropriate contact method based on device type
 * Mobile: Opens WhatsApp
 * Desktop: Opens default email client
 */
export function handleContactClick(): void {
  if (isMobileDevice()) {
    window.open(`https://wa.me/${CONTACT_INFO.phoneNumber}`, "_blank");
  } else {
    window.location.href = `mailto:${CONTACT_INFO.email}`;
  }
}

/**
 * Get contact info for display purposes
 */
export function getContactInfo() {
  return {
    phone: CONTACT_INFO.phoneNumber,
    email: CONTACT_INFO.email,
    whatsappUrl: `https://wa.me/${CONTACT_INFO.phoneNumber}`,
    emailUrl: `mailto:${CONTACT_INFO.email}`,
  };
}
