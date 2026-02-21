'use client';
import { useEffect, useState } from 'react';

export default function MobileView() {
  const [countryCode, setCountryCode] = useState('+91');
  const [customCode, setCustomCode] = useState('');
  const [localNumber, setLocalNumber] = useState('');
  const [fullPhone, setFullPhone] = useState('+91');

  useEffect(() => {
    const code = countryCode === 'other' ? (customCode || '+') : countryCode;
    setFullPhone(`${code}${localNumber}`);
  }, [countryCode, customCode, localNumber]);

  function handleLocalNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    // allow only digits, max 10
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setLocalNumber(digits);
  }

  function handleCustomCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    // allow + and digits
    const v = e.target.value.replace(/[^+0-9]/g, '');
    setCustomCode(v);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const currentCode = countryCode === 'other' ? customCode : countryCode;
    
    // Check if pasted text starts with current country code
    if (currentCode && pastedText.startsWith(currentCode)) {
      // Strip the country code and extract only digits
      const remainingText = pastedText.slice(currentCode.length);
      const digits = remainingText.replace(/\D/g, '').slice(0, 10);
      setLocalNumber(digits);
    } else {
      // Normal paste - extract digits only, max 10
      const digits = pastedText.replace(/\D/g, '').slice(0, 10);
      setLocalNumber(digits);
    }
  }

  return (
    <div id="report" className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Send Message</h2>
      <form action="https://formspree.io/f/mgvgzqog" method="POST" className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            suppressHydrationWarning
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email <span className="text-gray-400 text-xs">(optional)</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            inputMode="email"
            suppressHydrationWarning
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
            placeholder="your.email@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
          <div className="flex gap-2 items-center">
            <select
              aria-label="Country code"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              suppressHydrationWarning
              className="w-20 px-2 py-2 border border-gray-300 rounded-lg bg-white text-sm"
            >
              <option value="+91">+91</option>
              <option value="+1">+1 (USA)</option>
              <option value="+44">+44 (UK)</option>
              <option value="+61">+61 (Australia)</option>
              <option value="other">Other</option>
            </select>

            {countryCode === 'other' ? (
              <input
                aria-label="Custom country code"
                type="text"
                value={customCode}
                onChange={handleCustomCodeChange}
                placeholder="+XX"
                className="w-20 px-2 py-2 text-sm border border-gray-300 rounded-lg"
              />
            ) : null}

            <input
              type="tel"
              id="localNumber"
              name="localNumber"
              required
              value={localNumber}
              onChange={handleLocalNumberChange}
              onPaste={handlePaste}
              inputMode="numeric"
              pattern="\d{10}"
              maxLength={10}
              placeholder="10-digit mobile"
              suppressHydrationWarning
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
            />
          </div>
          {/* hidden combined phone field sent to the server */}
          <input type="hidden" name="phone" value={fullPhone} />
          <p className="text-xs text-gray-400 mt-1">Include 10 digits only; country code will be added.</p>
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Tell us more</label>
          <textarea
            id="message"
            name="message"
            rows={5}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
            placeholder="Describe the problem in simple words..."
          ></textarea>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">
            <span className="font-semibold">Note:</span> We may use the contact information provided to reach out to you regarding any queries.<br />
            <span className="text-xs text-gray-400">By submitting this form, you confirm that you comply with our terms and services.</span>
          </p>
        </div>
        <div>
          <button
            type="submit"
            suppressHydrationWarning
            className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}