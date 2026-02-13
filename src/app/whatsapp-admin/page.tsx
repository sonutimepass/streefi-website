'use client';

import { 
  AuthSection, 
  MessageFormSection, 
  LoadingSection,
  useWhatsAppAdmin 
} from '@/modules/whatsapp-admin';

export default function WhatsAppAdminPage() {
  const {
    isUnlocked,
    isCheckingAuth,
    passwordInput,
    setPasswordInput,
    passwordError,
    handleUnlock,
    handleLogout,
    messageType,
    setMessageType,
    phone,
    setPhone,
    message,
    setMessage,
    templateName,
    setTemplateName,
    templateLanguage,
    setTemplateLanguage,
    templateParams,
    setTemplateParams,
    sending,
    statusMessage,
    statusType,
    handleSendWhatsApp,
    messageLog,
    bulkPhones,
    setBulkPhones,
    handleSendBulkWhatsApp,
    handleFileUpload,
    importedPhones,
  } = useWhatsAppAdmin();

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return <LoadingSection />;
  }

  // Show login screen if not authenticated
  if (!isUnlocked) {
    return (
      <AuthSection
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        passwordError={passwordError}
        handleUnlock={handleUnlock}
      />
    );
  }

  // Show admin panel if authenticated
  return (
    <MessageFormSection
      messageType={messageType}
      setMessageType={setMessageType}
      phone={phone}
      setPhone={setPhone}
      message={message}
      setMessage={setMessage}
      templateName={templateName}
      setTemplateName={setTemplateName}
      templateLanguage={templateLanguage}
      setTemplateLanguage={setTemplateLanguage}
      templateParams={templateParams}
      setTemplateParams={setTemplateParams}
      sending={sending}
      statusMessage={statusMessage}
      statusType={statusType}
      handleSendWhatsApp={handleSendWhatsApp}
      handleLogout={handleLogout}
      messageLog={messageLog}
      bulkPhones={bulkPhones}
      setBulkPhones={setBulkPhones}
      handleSendBulkWhatsApp={handleSendBulkWhatsApp}
      handleFileUpload={handleFileUpload}
      importedPhones={importedPhones}
    />
  );
}
