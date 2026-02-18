import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Header, MobileHeader, Footer, MobileFooter } from '@/core/layouts';
import { PolicyNavigation, Breadcrumb } from '@/modules/policies';


export default function Policies() {
    return (
        <main className="min-h-screen bg-gray-50 text-gray-800">
            <div className="hidden md:block">
                <Header />
            </div>
            <div className="md:hidden">
                <MobileHeader />
            </div>
            <div className="pt-24 px-4 max-w-4xl mx-auto ">
                <Breadcrumb
                    items={[{ label: 'Policies', href: '/policies/policy' }]}
                    className="text-gray-600"
                />
            </div>
            <PolicyNavigation />

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-18 space-y-8">
                <div id="privacy" className="policy-section scroll-mt-24">
                    <h1>Privacy Policy</h1>

                    <h2>1. Introduction</h2>
                    <p className="text-justify">Streefi ("we", "our", "us") is committed to protecting and respecting your privacy. This Privacy Policy explains how we collect, use, store, share, and protect your personal information when you use our mobile application, website, vendor platform, or any other services we provide (collectively referred to as the "Platform"). By accessing or using the Platform, you agree to the terms of this Privacy Policy and <strong>consent to the processing of your personal information</strong> in accordance with applicable Indian laws.</p>
                    <br></br>
                    <h2>2. Applicability & Scope</h2>
                    <p className="text-justify">This Privacy Policy applies to <strong>all users of the Streefi Platform</strong>, including customers, food vendors, and any other individuals or entities interacting with our services. It covers all modes of interaction, whether through the Streefi mobile application, website, customer support channels, promotional campaigns, or any third-party platforms integrated with our services. This Policy governs the collection, usage, storage, transfer, and disclosure of your personal information while ensuring compliance with the <strong>Information Technology Act, 2000</strong>, and the applicable rules and regulations under Indian law.</p>
                    <br></br>
                    <h2>3. Information We Collect</h2>
                    <p className="text-justify">When you use the Streefi Platform, we may collect and process different types of information, which may include:</p>
                    <ul>
                        <li><strong>Personal Information</strong> such as your name, contact number, email address, and payment details.</li>
                        <li><strong>Business Information</strong> for vendors, including business name, FSSAI license number, GST details, and bank account information.</li>
                        <li><strong>Transaction Data</strong> including dine-in and takeaway order history, payment records, and refunds.</li>
                        <li><strong>Technical & Usage Data</strong> such as IP address, device information, browser type, operating system, location data (to find nearby vendors for dine-in/takeaway), and usage patterns on our platform.</li>
                        <li><strong>Communications</strong> including feedback, customer service requests, and any correspondence you share with us.</li>
                    </ul>
                    <br></br>
                    <h2>4. How We Use Your Information</h2>
                    <p className="text-justify">Streefi uses the information collected from you for the following purposes:</p>
                    <ul>
                        <li>To register and manage your account on the Platform.</li>
                        <li>To process and fulfill dine-in and takeaway orders placed through the Platform, including facilitating payments.</li>
                        <li>To verify vendor credentials, such as FSSAI licenses, and maintain quality standards for listed vendors.</li>
                        <li>To help you discover nearby vendors and restaurants offering dine-in and takeaway services.</li>
                        <li>To communicate with you regarding orders, promotions, updates, or customer service requests.</li>
                        <li>To improve and personalize your experience by analyzing user preferences, behavior, and feedback.</li>
                        <li>To comply with applicable legal obligations, resolve disputes, and enforce our terms and policies.</li>
                    </ul>
                    <br></br>
                    <h2>5. Sharing of Information</h2>
                    <p className="text-justify">Streefi <strong>does not sell, rent, or trade your Personal Information</strong> to third parties for their marketing purposes. However, we may share your information with trusted third-party service providers, payment processors, analytics providers, and regulatory authorities, as required, in the following circumstances:</p>
                    <ul>
                        <li>With <strong>vendors and restaurants</strong> to the extent necessary to fulfill your dine-in or takeaway order and provide related services.</li>
                        <li>With <strong>payment gateway service providers</strong> and banks to process your transactions securely.</li>
                        <li>With <strong>third-party service providers</strong> who assist us in operating the Platform, conducting business, or providing services to you, subject to strict confidentiality obligations.</li>
                        <li>When <strong>required by law, regulation, legal process</strong>, or governmental request.</li>
                        <li>In connection with a <strong>merger, acquisition, or sale of assets</strong>, where such information may be transferred to the new entity in compliance with this Policy.</li>
                    </ul>
                    <p className="text-justify mt-4 text-justify">Such third parties are bound by contractual obligations to ensure the confidentiality and security of your data and are prohibited from using it for any purpose other than the agreed services.</p>
                    <br></br>
                    <h2>6. Data Retention</h2>
                    <p className="text-justify">Streefi will retain your Personal Information only for <strong>as long as is necessary to fulfill the purposes for which it was collected</strong>, or as required by applicable laws and regulations, including for legal, regulatory, accounting, or reporting requirements. Once the retention period expires, we will <strong>securely delete, anonymize, or destroy your data</strong> to prevent unauthorized access or misuse. Certain transaction details, compliance records, and legal documentation may be retained for longer periods if mandated under law or for legitimate business purposes, such as resolving disputes, enforcing our agreements, or preventing fraud.</p>
                    <br></br>
                    <h2>7. Cookies and Tracking Technologies</h2>
                    <p className="text-justify">Streefi uses cookies, pixels, and similar tracking technologies to enhance your browsing and app experience, analyze usage patterns, and deliver personalized content and advertisements. These technologies help us remember your preferences, understand user behavior, and improve our services. You can manage or disable cookies through your browser or device settings; however, <strong>certain features of the Platform may not function optimally</strong> if cookies are disabled.</p>
                    <br></br>
                    <h2>8. Third-Party Services and Links</h2>
                    <p className="text-justify">The Streefi Platform may contain links to third-party websites, applications, or services, as well as integrations with third-party tools such as payment gateways or analytics providers. Please note that these third parties operate independently, and <strong>Streefi is not responsible for their privacy practices</strong>, content, or security measures. We encourage you to review the privacy policies of any third-party services you interact with through our Platform before sharing your personal information.</p>
                    <br></br>
                    <h2>9. Your Rights</h2>
                    <p className="text-justify">As a user of Streefi, you have certain rights regarding your Personal Information, subject to applicable laws. These rights may include the ability to <strong>access, review, update, correct, and delete</strong> your Personal Information held by us. You may also have the right to <strong>withdraw your consent</strong> for certain data processing activities, restrict or object to processing, and request a copy of your data in a portable format. Requests to exercise these rights can be submitted through the contact details provided in our policies, and we will respond in accordance with legal timelines and requirements.</p>
                </div>

                <div id="terms" className="policy-section scroll-mt-24">
                    <h1>Terms of Service</h1>
                    <p className="text-justify">This electronic document is generated pursuant to the provisions of the <strong>Information Technology Act, 2000</strong>, including Section 2(w), and rules made thereunder, and is published in accordance with Rule 3(1) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. As an electronic record, it does not require physical or digital signatures.</p>

                    <h3>1.1 Platform Overview</h3>
                    <p className="text-justify">These Terms of Service ("Terms") govern your access and use of the digital platform comprising the website <a href="http://www.streefi.in/">www.streefi.in</a> ("Website") and the mobile application "Streefi" ("App"), collectively referred to as the "Platform", operated by <strong>Streefi Private Limited</strong>, a company registered under the Companies Act, 2013, having its registered office at Sterling City, Bopal, Ahmedabad.</p>
                    <p className="mt-4 text-justify"><strong>The Platform connects customers with local street food vendors and restaurants for dine-in and takeaway services.</strong> Streefi does not provide delivery services. All orders are fulfilled directly at the vendor's location through dine-in or takeaway options.</p>

                    <h3>1.2 Agreement</h3>
                    <p className="text-justify">By accessing, downloading, installing, or using the Platform in any manner, you ("User", "You") agree to be legally bound by:</p>
                    <ul>
                        <li>These Terms of Service,</li>
                        <li>Our <strong>Privacy Policy</strong>,</li>
                        <li>Our <strong>Cancellation and Refund Policy</strong>, and</li>
                        <li>Any additional policies published from time to time.</li>
                    </ul>
                    <p className="mt-4 text-justify">Your use of the Platform signifies your consent to be governed by Indian laws, including but not limited to:</p>
                    <ul>
                        <li><strong>The Indian Contract Act, 1872</strong></li>
                        <li><strong>The Consumer Protection Act, 2019</strong></li>
                        <li><strong>The Food Safety and Standards Act, 2006</strong></li>
                        <li><strong>The Information Technology Act, 2000</strong></li>
                        <li>Any other applicable rules and guidelines issued by government agencies such as <strong>FSSAI</strong>, <strong>MCA</strong>, and <strong>RBI</strong> (for payment facilitation).</li>
                    </ul>

                    <h3>1.3 Right to Amend</h3>
                    <p className="text-justify">We reserve the right to update or modify these Terms at any time. Changes will be reflected via the "Last Updated" date. Continued use of the Platform following such modifications indicates your acceptance of the revised Terms. If you do not agree, you must immediately uninstall the App and cease using the Platform.</p>
                </div>


                <div className="policy-section scroll-mt-24">
                    <h2>2. Eligibility to Use</h2>
                    <h3>2.1 Nature of Services</h3>
                    <p className="text-justify">The Streefi Platform enables Users to:</p>
                    <ul>
                        <li>Browse, discover, and place orders for street food and beverages ("Products") offered by third-party food vendors ("Vendors") for dine-in or takeaway.</li>
                        <li>Access vendor information, ratings, menus, pricing, location details, and promotions.</li>
                        <li>Make digital payments through integrated payment gateways for dine-in and takeaway orders.</li>
                        <li>Communicate with support teams for issue resolution.</li>
                    </ul>
                    <p className="mt-4 text-justify"><strong>Streefi does not provide delivery services.</strong> All orders placed through the Platform are for dine-in or takeaway only and must be collected directly from the Vendor's location. Streefi acts as an <strong>intermediary</strong> under Section 2(w) of the <strong>Information Technology Act, 2000</strong>, facilitating the online exchange of information and transactions between Users and Vendors, without having control over the preparation, hygiene, or quality of food.</p>

                    <h3 id="license" className="scroll-mt-24">2.2 License to Use</h3>
                    <p className="text-justify">Streefi grants Users a limited, non-exclusive, non-transferable, and revocable license to:</p>
                    <ul>
                        <li>Access the Platform and its features for lawful purposes.</li>
                        <li>Order food for personal consumption through dine-in or takeaway at Vendor locations.</li>
                        <li>Use content, images, and listings as per fair use for non-commercial purposes.</li>
                    </ul>
                    <p className="mt-4 text-justify">This license <strong>does not permit</strong>:</p>
                    <ul>
                        <li>Reproduction, resale, or redistribution of Products or Vendor content.</li>
                        <li>Unauthorized use of proprietary content, logos, trademarks, menus, or images without prior written consent.</li>
                        <li>Automation or scraping of Platform content using bots or scripts.</li>
                    </ul>

                    <h3>2.3 Platform Content</h3>
                    <p className="text-justify">All content on the Platform, including images, product descriptions, logos, UI, and code, is the intellectual property of Streefi or its licensors and is protected by:</p>
                    <ul>
                        <li><strong>Copyright Act, 1957</strong></li>
                        <li><strong>Trademarks Act, 1999</strong></li>
                        <li><strong>Information Technology Act, 2000</strong></li>
                    </ul>
                    <p className="mt-4 text-justify">Any violation of these rights may result in legal action, termination of access, and civil/criminal liabilities under applicable Indian law.</p>

                    <h3>2.4 Third-Party Responsibilities</h3>
                    <ul>
                        <li>Vendors are independently responsible for FSSAI licensing, hygiene, food safety, and product accuracy.</li>
                        <li>Streefi neither prepares nor packages any food items.</li>
                        <li>Vendors are responsible for ensuring the food is ready for collection at the agreed time for takeaway orders or served promptly for dine-in customers.</li>
                    </ul>
                    <p className="mt-4 text-justify">As per <strong>FSSAI regulations</strong>, all food vendors on Streefi must hold a valid <strong>FSSAI license</strong> under the Food Safety and Standards Act, 2006. Streefi is not liable for food adulteration, allergy reactions, or quality issues caused by Vendor negligence.</p>

                    <h3>2.5 Modification of Services</h3>
                    <p className="text-justify">Streefi reserves the right to:</p>
                    <ul>
                        <li>Add, remove, or change Vendors, categories, and offerings.</li>
                        <li>Suspend or discontinue services or the Platform at its discretion.</li>
                        <li>Enforce content policies and remove any listing that violates Indian laws.</li>
                    </ul>
                </div>

                <div className="policy-section scroll-mt-24">
                    <h2>3. Eligibility to Use</h2>
                    <h3>3.1 Legal Capacity</h3>
                    <p className="text-justify">Use of the Streefi Platform is permitted only to individuals who are legally competent to contract as per Section 11 of the <strong>Indian Contract Act, 1872</strong>. This means you must be:</p>
                    <ul>
                        <li>At least <strong>18 years of age</strong>, or the age of majority as defined under the <strong>Indian Majority Act, 1875</strong>.</li>
                        <li>Of sound mind and not disqualified from contracting under any law in force.</li>
                    </ul>
                    <p className="mt-4 text-justify">By using this Platform, you represent and warrant that:</p>
                    <ul>
                        <li>You meet the legal age requirement,</li>
                        <li>Or you are using the Platform <strong>under the supervision and with the consent of a parent or legal guardian</strong>.</li>
                    </ul>

                    <h3>3.2 Responsibility for Minors</h3>
                    <p className="text-justify">If you are under 18 years of age:</p>
                    <ul>
                        <li>You may only use the Platform under the guidance and explicit consent of a responsible adult.</li>
                        <li>All transactions must be reviewed or approved by such parent or legal guardian.</li>
                        <li><strong>Streefi disclaims all liability</strong> for any consequences arising from unauthorized or unsupervised use of the Platform by a minor.</li>
                    </ul>
                    <p className="mt-4 text-justify"><strong>Streefi is not responsible</strong> for verifying user age or for any misuse of the Platform by minors in violation of these Terms.</p>

                    <h3>3.3 Prohibited Users</h3>
                    <p className="text-justify">The following individuals are <strong>not eligible</strong> to use Streefi:</p>
                    <ul>
                        <li><strong>Undischarged insolvents</strong></li>
                        <li><strong>Persons previously suspended or removed from the Platform</strong></li>
                        <li><strong>Users impersonating others or providing false, misleading information</strong></li>
                    </ul>
                    <p className="mt-4 text-justify">Violations may result in immediate account termination and potential action under:</p>
                    <ul>
                        <li><strong>Indian Penal Code, 1860</strong> (identity theft, fraud)</li>
                        <li><strong>Information Technology Act, 2000</strong> (misuse of digital services)</li>
                    </ul>

                    <h3 id="ethics" className="scroll-mt-24">3.4 Non-Discrimination Clause</h3>
                    <p className="text-justify">In line with Article 15 of the <strong>Constitution of India</strong> and the <strong>Rights of Persons with Disabilities Act, 2016</strong>, the Platform must be used respectfully. Discrimination against Vendors on the basis of <strong>caste, religion, gender, disability, ethnicity, or economic background</strong> will result in:</p>
                    <ul>
                        <li>Immediate suspension or termination of access.</li>
                        <li>Possible legal reporting to appropriate authorities.</li>
                    </ul>
                </div>

                <div id="security" className="policy-section scroll-mt-24">
                    <h2>4. User Account, Password, and Security</h2>
                    <h3>4.1 Account Registration</h3>
                    <p className="text-justify">To access certain features of the Platform, including placing dine-in or takeaway orders or saving preferences, You must register for an account ("Account") by providing accurate and verifiable information, such as your name, phone number, and email address.</p>
                    <p className="mt-4 text-justify">Your data is processed and stored in accordance with:</p>
                    <ul>
                        <li><strong>The Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong>, and</li>
                        <li><strong>Our Privacy Policy</strong>, which is compliant with the <strong>IT Act, 2000</strong> and the <strong>Consumer Protection (E-Commerce) Rules, 2020</strong>.</li>
                    </ul>

                    <h3>4.2 User Responsibility</h3>
                    <p className="text-justify">You are solely responsible for:</p>
                    <ul>
                        <li>Ensuring the information provided is complete, accurate, and up to date.</li>
                        <li>Promptly notifying us of any changes to your information.</li>
                        <li>All activities and transactions carried out through your Account, whether authorized or unauthorized.</li>
                    </ul>
                    <p className="mt-4 text-justify">We reserve the right to suspend or terminate any Account with false, misleading, or incomplete information, as permitted under the <strong>Consumer Protection Act, 2019</strong>.</p>

                    <h3>4.3 Password and OTP Security</h3>
                    <ul>
                        <li>You are responsible for maintaining the confidentiality of your login credentials, including password, OTP, or any other authentication information.</li>
                        <li>Sharing your password or OTP with others is <strong>strictly prohibited</strong>.</li>
                        <li>You agree to immediately notify Streefi via official support channels if you suspect any unauthorized access or use of your Account.</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi shall not be held liable for any financial losses, order misuse, or data compromise arising from:</p>
                    <ul>
                        <li>Your failure to secure your Account,</li>
                        <li>Your negligence in protecting access credentials.</li>
                    </ul>

                    <h3>4.4 Device Security</h3>
                    <p className="text-justify">You are expected to ensure that:</p>
                    <ul>
                        <li>Your device is protected from malware, unauthorized access, and is not rooted/jailbroken.</li>
                        <li>You are logged out after use on shared devices.</li>
                        <li>You access the Platform only through official versions from recognized app stores.</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi reserves the right to block or blacklist devices or IPs suspected of abuse, fraud, or unauthorized automation.</p>
                </div>
                <div className="policy-section scroll-mt-24">
                    <h2>5. Payment-Related Information</h2>
                    <h3>5.1 Accepted Payment Methods</h3>
                    <p className="text-justify">The Platform supports a variety of digital payment options for dine-in and takeaway orders, including but not limited to:</p>
                    <ul>
                        <li>UPI (Unified Payments Interface)</li>
                        <li>Debit/Credit Cards (Visa, MasterCard, RuPay)</li>
                        <li>Net Banking</li>
                        <li>Wallets (e.g., PhonePe)</li>
                        <li>Payment gateways (e.g., Razorpay)</li>
                    </ul>
                    <p className="mt-4 text-justify">All transactions are processed securely through <strong>Reserve Bank of India (RBI)</strong>-regulated third-party payment processors compliant with the <strong>Payment and Settlement Systems Act, 2007</strong>. Payment can be made either at the time of order placement through the Platform or at the vendor location for dine-in or takeaway, subject to vendor policies.</p>

                    <h3>5.2 Payment Authorization</h3>
                    <p className="text-justify">By entering your payment details, You represent and warrant that:</p>
                    <ul>
                        <li>You are legally authorized to use the selected payment method.</li>
                        <li>The transaction is not in violation of your bank or payment provider's terms.</li>
                        <li>You consent to the processing of your payment by our authorized partners.</li>
                    </ul>
                    <p className="mt-4 text-justify"><strong>Streefi does not store your payment credentials</strong> such as card numbers, CVV, or UPI PINs, in compliance with RBI's <strong>Card-on-File Tokenization</strong> guidelines.</p>

                    <h3>5.3 Payment Failures</h3>
                    <p className="text-justify">Streefi shall not be liable for transaction failures due to:</p>
                    <ul>
                        <li>Insufficient funds</li>
                        <li>Incorrect payment information</li>
                        <li>Expired cards or technical issues</li>
                        <li>Bank or gateway errors</li>
                        <li>Force Majeure events (e.g., internet outages, service disruptions)</li>
                    </ul>
                    <p className="mt-4 text-justify">In such cases, the order shall be considered unconfirmed until payment is successfully received. Users may attempt payment again or choose to pay directly at the vendor location for dine-in or takeaway orders, where applicable.</p>

                    <h3>5.4 Refunds for Failed or Cancelled Orders</h3>
                    <p className="text-justify">Refunds, when applicable, are subject to the following:</p>
                    <ul>
                        <li>Initiated only after order cancellation or verification of a failed transaction.</li>
                        <li>Processed within <strong>7 business days</strong>, depending on your bank/payment partner's policy.</li>
                        <li>Reflected to the original payment method only.</li>
                    </ul>
                    <p className="mt-4 text-justify">Note: Streefi does not issue <strong>cash refunds</strong> or refunds to alternate bank accounts. For orders paid at the vendor location, refund policies are subject to the vendor's discretion.</p>

                    <h3>5.5 Fraud Prevention</h3>
                    <p className="text-justify">Any attempt to misuse payment methods or raise fraudulent chargebacks may lead to:</p>
                    <ul>
                        <li>Immediate suspension of the Account</li>
                        <li>Legal action under applicable Indian laws, including the <strong>Indian Penal Code, 1860</strong>, and</li>
                        <li>Reporting to authorities including cybercrime cells.</li>
                    </ul>
                </div>
                <div id="pricing" className="policy-section scroll-mt-24">
                    <h2>6. Prices of Products</h2>
                    <h3>6.1 Displayed Prices</h3>
                    <p className="text-justify">All product prices listed on the Streefi Platform for dine-in and takeaway orders:</p>
                    <ul>
                        <li>Are denominated in <strong>Indian Rupees (INR)</strong>, inclusive of applicable <strong>Goods and Services Tax (GST)</strong> under the <strong>Central Goods and Services Tax Act, 2017</strong>.</li>
                        <li>Are set by individual Vendors and may vary from their in-store prices.</li>
                        <li>Are displayed transparently before checkout, along with any additional charges.</li>
                    </ul>
                    <p className="mt-4 text-justify">Prices may change dynamically based on availability, location, time, or Vendor-specific offers. We are not liable for any variation unless otherwise stated.</p>

                    <h3>6.2 Price Revisions</h3>
                    <p className="text-justify">Vendors reserve the right to modify prices without prior notice. Streefi also reserves the right to:</p>
                    <ul>
                        <li>Update pricing in real time based on Vendor inputs.</li>
                        <li>Correct pricing errors (before or after order confirmation).</li>
                        <li>Cancel any order in case of gross pricing error, with a full refund.</li>
                    </ul>

                    <h3>6.3 Product Ownership</h3>
                    <p className="text-justify">Ownership and title to the Products:</p>
                    <ul>
                        <li>For <strong>takeaway orders</strong>: Transfer from the Vendor to You only upon successful pickup from the vendor location.</li>
                        <li>For <strong>dine-in orders</strong>: Transfer from the Vendor to You upon service at the table or counter at the vendor location.</li>
                        <li>Are governed by <strong>Sale of Goods Act, 1930</strong>, where pickup or service is deemed to complete the transaction.</li>
                    </ul>
                    <p className="mt-4 text-justify">Until pickup or service, Vendors remain responsible for food quality, packaging (for takeaway), safety, and condition of the item.</p>

                    <h3>6.4 Additional Charges</h3>
                    <p className="text-justify">At checkout, the following charges will be displayed clearly:</p>
                    <ul>
                        <li>Packaging charges (applicable for takeaway orders only)</li>
                        <li>Platform convenience fees (if any)</li>
                        <li>Applicable taxes</li>
                    </ul>
                    <p className="mt-4 text-justify">These are <strong>not hidden charges</strong>, and payment is collected by authorized third parties on behalf of Vendors and/or Streefi.</p>
                </div>

                <div className="policy-section scroll-mt-24">
                    <h2>7. Order Fulfillment, Fees, and Preparation Time</h2>
                    <h3>7.1 Order Fulfillment Methods</h3>
                    <p className="text-justify">Streefi facilitates <strong>dine-in and takeaway services only</strong>. The Platform does not provide delivery services. All orders placed through the Platform must be fulfilled in one of the following ways:</p>
                    <ul>
                        <li><strong>Takeaway:</strong> You place an order through the Platform and collect it directly from the Vendor's location at the designated time.</li>
                        <li><strong>Dine-in:</strong> You place an order through the Platform and consume the food at the Vendor's premises, where the order will be served to you at your table or counter.</li>
                    </ul>
                    <p className="mt-4 text-justify">The chosen fulfillment method must be selected at the time of placing the order. <strong>Streefi is not responsible for any errors in fulfillment method selection</strong> made by the User.</p>

                    <h3>7.2 Platform and Service Fees</h3>
                    <p className="text-justify">Streefi may charge the following fees, which will be clearly disclosed at checkout before payment:</p>
                    <ul>
                        <li><strong>Platform Convenience Fee:</strong> A nominal fee for using the Platform's ordering and payment services.</li>
                        <li><strong>Packaging Charges:</strong> Applicable only for takeaway orders, charged by Vendors to cover the cost of packaging materials.</li>
                        <li><strong>GST and Applicable Taxes:</strong> As mandated under the <strong>Central Goods and Services Tax Act, 2017</strong>.</li>
                    </ul>
                    <p className="mt-4 text-justify">All fees are transparently displayed before order confirmation. By proceeding with payment, You acknowledge and accept these charges.</p>

                    <h3>7.3 Order Preparation and Estimated Time</h3>
                    <p className="text-justify">After successful order placement and payment confirmation:</p>
                    <ul>
                        <li>The Vendor will prepare your order and provide an <strong>estimated preparation time</strong> displayed on the Platform.</li>
                        <li>Preparation times are <strong>estimates only</strong> and may vary based on order complexity, Vendor workload, peak hours, or unforeseen circumstances.</li>
                        <li>Streefi acts solely as an intermediary and <strong>does not control or guarantee preparation times</strong> set by Vendors.</li>
                    </ul>
                    <p className="mt-4 text-justify">Users are advised to check the estimated preparation time before placing orders and plan their visit to the Vendor location accordingly.</p>

                    <h3>7.4 Takeaway Collection Procedures</h3>
                    <p className="text-justify">For takeaway orders:</p>
                    <ul>
                        <li>You must collect your order from the Vendor's location within the timeframe communicated via the Platform or by the Vendor.</li>
                        <li>You may be required to present your <strong>Order ID or confirmation code</strong> displayed in the App for verification.</li>
                        <li>If you fail to collect your order within <strong>30 minutes of the designated collection time</strong> without prior communication, the Vendor reserves the right to cancel the order, and <strong>no refund will be issued</strong>.</li>
                        <li>Streefi shall not be held responsible for orders not collected due to incorrect address information, User unavailability, or failure to follow Vendor instructions.</li>
                    </ul>

                    <h3 id="dineinpolicy">7.5 Dine-in Service Procedures</h3>
                    <p className="text-justify">For dine-in orders:</p>
                    <ul>
                        <li>You must arrive at the Vendor's location and inform the staff of your order using the <strong>Order ID or confirmation code</strong> displayed in the App.</li>
                        <li>The Vendor will serve your order at the designated table or counter as per their standard service procedures.</li>
                        <li><strong>Time Limit:</strong> Dine-in orders are subject to a time limit set by either Streefi or the Vendor (typically displayed at the time of booking). You are expected to complete your meal and vacate the table/seating area within this time frame to allow other customers to be served.</li>
                        <li>Exceeding the allotted time without prior arrangement with the Vendor may result in additional charges or request to vacate the premises.</li>
                        <li>You are expected to follow the Vendor's seating policies, hygiene protocols, and operational guidelines during your visit.</li>
                        <li>Streefi is not responsible for any disputes, delays, or service quality issues that arise at the Vendor's premises, including but not limited to seating availability, ambience, or staff behavior.</li>
                    </ul>

                    <h3>7.6 User Responsibilities</h3>
                    <p className="text-justify">When collecting takeaway or dining in, You agree to:</p>
                    <ul>
                        <li>Arrive at the Vendor location at or close to the estimated preparation/service time.</li>
                        <li>Provide accurate contact information for any communication from the Vendor or Streefi.</li>
                        <li>Inspect your order upon receipt for accuracy and quality before leaving the premises (for takeaway).</li>
                        <li>Report any issues immediately to the Vendor or through the Platform's support channels.</li>
                    </ul>
                    <p className="mt-4 text-justify">Failure to comply with these responsibilities may result in order cancellation, no entitlement to a refund, or possible suspension of your Account.</p>

                    <h3>7.7 Vendor Responsibilities</h3>
                    <p className="text-justify">Vendors listed on the Streefi Platform are responsible for:</p>
                    <ul>
                        <li>Preparing orders in accordance with food safety standards under the <strong>Food Safety and Standards Act, 2006</strong>.</li>
                        <li>Maintaining accurate preparation time estimates and notifying Users of any delays.</li>
                        <li>Ensuring proper packaging for takeaway orders to prevent spillage or contamination.</li>
                        <li>Providing adequate seating and service for dine-in customers as per their operational capacity.</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi does not assume responsibility for Vendor negligence, food quality issues, or service failures at the Vendor's premises.</p>
                </div>

                <div id="refund" className="policy-section scroll-mt-24">
                    <h2>8. Returns, Cancellations, and Refunds</h2>
                    <h3>8.1 Returns Policy</h3>
                    <p className="text-justify">Due to the <strong>perishable nature of food</strong>, returns are permitted only under specific conditions. You may request a return/refund if:</p>
                    <ul>
                        <li>The wrong item was prepared or served.</li>
                        <li>The food item was <strong>visibly spoiled, contaminated, or damaged</strong> at the time of collection (for takeaway) or service (for dine-in).</li>
                        <li>Packaging was tampered with (for takeaway orders).</li>
                        <li>The order was significantly incomplete or did not match the confirmed order details.</li>
                    </ul>
                    <p className="mt-4 text-justify"><strong>Proof is mandatory</strong> (photo/video taken at the time of collection or service, before consumption) to initiate a return or refund request.</p>
                    <p className="text-justify">Returns are <strong>not eligible</strong> if:</p>
                    <ul>
                        <li>The packaging was opened or food was consumed (unless the issue was discovered during consumption).</li>
                        <li>The issue is based on subjective taste preferences, spice levels, or portion size expectations.</li>
                        <li>The complaint is raised <strong>more than 30 minutes after pickup or service completion</strong>.</li>
                        <li>The User failed to inspect the order at the Vendor location before leaving (for takeaway).</li>
                    </ul>

                    <h3>8.2 Order Cancellations</h3>
                    <p className="text-justify"><strong>Before Vendor Acceptance</strong>:</p>
                    <ul>
                        <li>You may cancel your order free of charge through the Platform.</li>
                        <li>Any amount paid will be refunded in full to your original payment method.</li>
                    </ul>
                    <p className="mt-4 text-justify"><strong>After Vendor Acceptance or Food Preparation Start</strong>:</p>
                    <ul>
                        <li>Cancellation may not be allowed, as food preparation has commenced.</li>
                        <li>If cancellation is permitted at the Vendor's discretion, a cancellation fee (up to 100% of the order value) may apply to cover preparation costs.</li>
                        <li>Streefi and Vendors reserve the right to <strong>reject cancellation requests</strong> if food is already being prepared or packaged.</li>
                    </ul>
                    <p className="mt-4 text-justify"><strong>Cancellation by Vendor/Streefi</strong>:</p>
                    <ul>
                        <li>May occur due to stock unavailability, unexpected closure of Vendor, operational constraints, or force majeure events.</li>
                        <li>Full refund will be processed to your original payment method within 7 business days.</li>
                        <li>You will be notified immediately via the Platform and/or SMS/email.</li>
                    </ul>

                    <h3>8.3 Refund Policy</h3>
                    <p className="text-justify">Refunds will be:</p>
                    <ul>
                        <li>Initiated only after investigation and validation of the complaint by our support team, which may include contacting the Vendor for verification.</li>
                        <li>Processed within <strong>7 business days</strong> after complaint approval and verification.</li>
                        <li>Reflected in your original payment method (UPI, card, wallet, etc.) or as Platform credits, at Streefi's discretion.</li>
                    </ul>
                    <p className="mt-4 text-justify">Note: Refund timelines may vary depending on your bank or payment provider's processing cycle. For orders paid directly at the Vendor location (cash or other methods), refund requests must be resolved directly with the Vendor, and Streefi holds no liability for such transactions.</p>

                    <h3>8.4 Disputes and Escalations</h3>
                    <p className="text-justify">In case of disagreement with refund decisions:</p>
                    <ul>
                        <li>You may raise an escalation by contacting our <strong>Grievance Officer</strong> (details in Section 17).</li>
                        <li>Disputes will be handled under the <strong>Consumer Protection (E-Commerce) Rules, 2020</strong> and <strong>Consumer Protection Act, 2019</strong>.</li>
                        <li>Streefi will make reasonable efforts to resolve disputes within <strong>30 days</strong> of escalation.</li>
                    </ul>
                </div>

                <div id="customer" className="policy-section scroll-mt-24">
                    <h2>9. User Care</h2>
                    <h3>9.1 Vendor Responsibility for Product Quality</h3>
                    <p className="text-justify">All food Products listed and sold through the Streefi Platform are <strong>solely prepared and packaged by independent third-party Vendors</strong>. These Vendors are responsible for:</p>
                    <ul>
                        <li>Ensuring food safety and hygiene in compliance with the <strong>Food Safety and Standards Act, 2006</strong> and <strong>FSSAI regulations</strong>.</li>
                        <li>Possessing a valid <strong>FSSAI license</strong>.</li>
                        <li>Accurately representing their Products through images, descriptions, and labeling.</li>
                        <li>Ensuring timely preparation of orders for takeaway collection or dine-in service.</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi does not prepare, store, or inspect food items and <strong>does not accept liability</strong> for any food-related health issues, preparation delays, or service quality at the Vendor's premises.</p>

                    <h3>9.2 Product Representations</h3>
                    <ul>
                        <li>Product images, names, ingredients, and descriptions shown on the Platform are for <strong>illustrative purposes only</strong>.</li>
                        <li>Variations in packaging, portion size, color, or appearance may occur.</li>
                        <li>Users are advised to check the <strong>physical packaging for actual ingredients, allergens, expiry date</strong>, and other product information at the time of collection (for takeaway) or service (for dine-in).</li>
                    </ul>

                    <h3>9.3 Customer Support</h3>
                    <p className="text-justify">Users may contact Streefi's support team via:</p>
                    <ul>
                        <li>The in-app "Help" section</li>
                        <li>Registered email address</li>
                        <li>Official support number</li>
                    </ul>
                    <p className="mt-4 text-justify">Support is available for issues including:</p>
                    <ul>
                        <li>Order preparation delays or collection issues</li>
                        <li>Refund and cancellation queries</li>
                        <li>Technical issues with the Platform</li>
                        <li>Issues with dine-in or takeaway service at Vendor locations</li>
                    </ul>

                    <h3>9.4 Fraud and Security Advisory</h3>
                    <p className="text-justify">Streefi will never request your:</p>
                    <ul>
                        <li>OTP</li>
                        <li>Card details</li>
                        <li>UPI PIN or CVV</li>
                        <li>Personal passwords</li>
                    </ul>
                    <p className="mt-4 text-justify">Users are advised to:</p>
                    <ul>
                        <li>Never share sensitive data with anyone claiming to be from Streefi.</li>
                        <li>Report suspicious activity through our official support or by visiting <a href="https://cybercrime.gov.in/">https://cybercrime.gov.in</a>.</li>
                    </ul>

                    <h3>9.5 Misuse and Abuse</h3>
                    <p className="text-justify">We reserve the right to:</p>
                    <ul>
                        <li>Refuse service to any User suspected of abusing the Platform.</li>
                        <li>Cancel or suspend accounts engaging in fraudulent or harmful behavior.</li>
                    </ul>
                    <p className="mt-4 text-justify">Any misuse of the Platform may lead to:</p>
                    <ul>
                        <li>Termination of service</li>
                        <li>Blacklisting of account or device</li>
                        <li>Legal action under the <strong>Information Technology Act, 2000</strong>, and other applicable laws</li>
                    </ul>
                </div>

                <div className="policy-section scroll-mt-24">
                    <h2>10. Use of Platform</h2>
                    <h3>10.1 Permitted Use</h3>
                    <p className="text-justify">You are permitted to use the Streefi Platform only for lawful, personal, and non-commercial purposes. This includes:</p>
                    <ul>
                        <li>Browsing vendor listings and discovering local street food options</li>
                        <li>Placing dine-in or takeaway food orders for personal consumption</li>
                        <li>Accessing Platform features via approved interfaces (e.g., official mobile app or website)</li>
                        <li>Visiting Vendor locations to collect takeaway orders or dine in as per your order selection</li>
                    </ul>
                    <p className="mt-4 text-justify">Use of the Platform is subject to compliance with:</p>
                    <ul>
                        <li>These Terms</li>
                        <li>Applicable Indian laws and regulations, including the <strong>Information Technology Act, 2000</strong> and <strong>Consumer Protection (E-Commerce) Rules, 2020</strong></li>
                    </ul>

                    <h3>10.2 Prohibited Activities</h3>
                    <p className="text-justify">You shall not:</p>
                    <ul>
                        <li>Use the Platform for commercial resale, automated ordering, or unauthorized promotion</li>
                        <li>Attempt to gain unauthorized access to other user accounts, servers, or systems</li>
                        <li>Use bots, spiders, or other automated tools to extract data</li>
                        <li>Interfere with Platform security or performance</li>
                        <li>Post or transmit any material that:
                            <ul>
                                <li>Is defamatory, obscene, pornographic, or otherwise unlawful</li>
                                <li>Violates the rights of third parties, including intellectual property or privacy</li>
                                <li>Contains viruses, malware, or harmful code</li>
                                <li>Promotes hatred, violence, or threats to national security</li>
                            </ul>
                        </li>
                    </ul>
                    <p className="mt-4 text-justify">Violations may result in:</p>
                    <ul>
                        <li>Suspension or termination of your account</li>
                        <li>Reporting to cybercrime authorities</li>
                        <li>Legal action under the <strong>Indian Penal Code, 1860</strong>, <strong>IT Act, 2000</strong>, and other applicable laws</li>
                    </ul>

                    <h3>10.3 Platform Access Conditions</h3>
                    <p className="text-justify">You agree to:</p>
                    <ul>
                        <li>Use the most up-to-date version of the App or browser</li>
                        <li>Ensure your internet and device meet basic requirements for functionality</li>
                        <li>Avoid use on rooted or jailbroken devices</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi does not guarantee continuous availability or bug-free operation and reserves the right to:</p>
                    <ul>
                        <li>Deny access to any user at its sole discretion</li>
                        <li>Temporarily suspend Platform functionality for maintenance, updates, or emergencies</li>
                    </ul>
                </div>


                <div className="policy-section scroll-mt-24">
                    <h2>11. Intellectual Property Rights</h2>
                    <h3>11.1 Platform Ownership</h3>
                    <p className="text-justify">All content available on the Streefi Platform—including but not limited to:</p>
                    <ul>
                        <li>Text, graphics, logos, icons, images, videos</li>
                        <li>Audio clips, digital downloads, data compilations</li>
                        <li>Software, source code, and user interface designs</li>
                    </ul>
                    <p className="mt-4 text-justify">—are either the proprietary property of <strong>Streefi Private Limited</strong>, its affiliates, or its content suppliers, and are protected under:</p>
                    <ul>
                        <li><strong>The Copyright Act, 1957</strong></li>
                        <li><strong>The Trademarks Act, 1999</strong></li>
                        <li>Applicable international intellectual property treaties</li>
                    </ul>
                    <p className="mt-4 text-justify">Unauthorized reproduction, distribution, or commercial use of any such content is strictly prohibited.</p>

                    <h3>11.2 Trademarks and Branding</h3>
                    <p className="text-justify">All marks used on the Platform, including:</p>
                    <ul>
                        <li>"Streefi" name and logo</li>
                        <li>Product and service names</li>
                        <li>Promotional taglines</li>
                    </ul>
                    <p className="mt-4 text-justify">are registered or unregistered trademarks owned or licensed by Streefi. Use of these marks without prior written consent constitutes infringement and may lead to civil and/or criminal liability.</p>

                    <h3>11.3 Vendor Content</h3>
                    <p className="text-justify">Vendors retain ownership of their own:</p>
                    <ul>
                        <li>Menus, logos, food images</li>
                        <li>Product names and descriptions</li>
                    </ul>
                    <p className="mt-4 text-justify">However, by listing content on the Platform, Vendors grant Streefi a <strong>royalty-free, worldwide, non-exclusive license</strong> to use, reproduce, display, and distribute such content for marketing and operational purposes.</p>

                    <h3>11.4 User Content</h3>
                    <p className="text-justify">Any content voluntarily submitted by users—such as reviews, ratings, comments, suggestions, or uploaded media—may be used by Streefi for promotional, analytical, or customer service purposes, unless explicitly restricted by the User at the time of submission.</p>
                    <p className="mt-4 text-justify">Streefi reserves the right to remove or moderate content that:</p>
                    <ul>
                        <li>Violates legal or moral standards</li>
                        <li>Infringes third-party rights</li>
                        <li>Misrepresents or defames individuals or entities</li>
                    </ul>

                    <h3>11.5 Infringement Claims</h3>
                    <p className="text-justify">If you believe any content on the Platform violates your intellectual property rights, you may notify Streefi in accordance with Section 20 (<strong>IP Infringement</strong>) of these Terms.</p>
                </div>
                <div className="policy-section scroll-mt-24">
                    <h2>12. Disclaimer of Warranties & Liability</h2>
                    <h3>12.1 Platform Provided "As-Is"</h3>
                    <p className="text-justify">Streefi provides the Platform, its features, and its services strictly on an <strong>"as-is" and "as-available" basis</strong>, without warranties of any kind, either express or implied.</p>
                    <p className="mt-4 text-justify">To the fullest extent permitted by law, Streefi disclaims all representations and warranties, including but not limited to:</p>
                    <ul>
                        <li>Fitness for a particular purpose</li>
                        <li>Merchantability</li>
                        <li>Non-infringement</li>
                        <li>Accuracy or reliability of Vendor listings, pricing, or food quality</li>
                        <li>Continuity or uptime of Platform access</li>
                        <li>Accuracy of order preparation times or Vendor location information</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi does not guarantee:</p>
                    <ul>
                        <li>That the Platform will be uninterrupted, timely, secure, or error-free</li>
                        <li>That the information or content provided will be accurate, up to date, or complete</li>
                        <li>That any defects will be corrected, or that the Platform is free of viruses or other harmful components</li>
                        <li>The availability of seating for dine-in orders or readiness of takeaway orders at the estimated time</li>
                    </ul>

                    <h3>12.2 Product and Service Liability</h3>
                    <p className="text-justify">Streefi:</p>
                    <ul>
                        <li>Does <strong>not</strong> prepare, cook, or serve food</li>
                        <li>Is <strong>not</strong> liable for the taste, portion size, allergen content, hygiene, or temperature of food items</li>
                        <li>Disclaims all liability for personal injury, illness, or death resulting from consumption of food ordered via the Platform</li>
                        <li>Is <strong>not</strong> responsible for the ambience, cleanliness, seating arrangements, or service quality at Vendor premises for dine-in orders</li>
                        <li>Is <strong>not</strong> liable for delays in order preparation, food unavailability, or Vendor operational issues</li>
                    </ul>
                    <p className="mt-4 text-justify">Such responsibilities lie exclusively with:</p>
                    <ul>
                        <li>The respective <strong>Vendors</strong>, who are licensed under the <strong>Food Safety and Standards Act, 2006</strong></li>
                        <li>Users, who are responsible for inspecting their takeaway orders before leaving the Vendor premises</li>
                        <li>Users, who must ensure they arrive at the Vendor location to collect takeaway orders or dine in as per their order selection</li>
                    </ul>

                    <h3>12.3 Third-Party Services</h3>
                    <p className="text-justify">Streefi uses external vendors, APIs, and payment processors. We are not liable for:</p>
                    <ul>
                        <li>Service interruptions due to failures of such third parties</li>
                        <li>Errors or misconduct by any Vendor or Partner</li>
                        <li>Losses resulting from unauthorized access to user accounts through third-party integrations</li>
                        <li>Disputes, accidents, or incidents occurring at Vendor premises during dine-in or takeaway collection</li>
                    </ul>

                    <h3>12.4 Limitation of Liability</h3>
                    <p className="text-justify">To the maximum extent allowed by law, Streefi's liability is limited to:</p>
                    <ul>
                        <li>The <strong>amount paid by the User</strong> for the specific order or transaction in question</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi shall not be liable for:</p>
                    <ul>
                        <li>Indirect, incidental, special, consequential, or punitive damages</li>
                        <li>Loss of profits, data, goodwill, or business interruption</li>
                        <li>Any claims arising from user misuse of the Platform or breach of these Terms</li>
                        <li>Any incidents, injuries, or losses occurring at Vendor premises during dine-in service or takeaway collection</li>
                    </ul>
                </div>

                <div className="policy-section scroll-mt-24">
                    <h2>13. Indemnification and Limitation of Liability</h2>
                    <h3>13.1 User Indemnity</h3>
                    <p className="text-justify">You agree to <strong>indemnify, defend, and hold harmless</strong> Streefi Private Limited, its directors, officers, employees, affiliates, and agents from and against any and all claims, losses, liabilities, damages, costs, or expenses (including reasonable legal fees) arising out of or related to:</p>
                    <ul>
                        <li>Your access to or use of the Platform</li>
                        <li>Your violation of any term of these Terms of Service</li>
                        <li>Any breach of applicable laws, including consumer laws, food safety laws, or IT laws</li>
                        <li>Any content uploaded, submitted, or transmitted by You that violates third-party rights (including intellectual property, privacy, or contract rights)</li>
                        <li>Any fraud, negligence, or intentional misconduct committed by You</li>
                        <li>Your conduct at Vendor premises, including during dine-in service or takeaway collection</li>
                        <li>Any disputes between You and Vendors regarding order quality, service, or payment</li>
                    </ul>
                    <p className="mt-4 text-justify">This indemnity obligation will survive the termination or expiration of these Terms and your use of the Platform.</p>

                    <h3>13.2 Limitation of Liability</h3>
                    <p className="text-justify">To the fullest extent permitted by applicable law, Streefi:</p>
                    <ul>
                        <li>Shall not be liable for any <strong>indirect, incidental, punitive, special, or consequential damages</strong>, including but not limited to:
                            <ul>
                                <li>Loss of profits</li>
                                <li>Data loss</li>
                                <li>Reputation damage</li>
                                <li>Business interruption</li>
                            </ul>
                        </li>
                        <li>Shall not be held responsible for actions or omissions of Vendors, payment processors, or incidents at Vendor premises, even if facilitated through the Platform</li>
                    </ul>

                    <h3>13.3 Aggregate Liability Cap</h3>
                    <p className="text-justify">If, despite the above limitations, Streefi is held liable under any applicable law or regulation:</p>
                    <ul>
                        <li>Our total aggregate liability shall not exceed the <strong>actual amount paid by You</strong> for the specific order or service giving rise to the claim</li>
                        <li>Any claims must be brought within <strong>90 days</strong> from the date of the cause of action, failing which they shall be deemed waived</li>
                    </ul>
                    <p className="mt-4 text-justify">This section shall be governed in accordance with the provisions of the <strong>Indian Contract Act, 1872</strong>, <strong>Consumer Protection Act, 2019</strong>, and other applicable laws.</p>
                </div>
                <div className="policy-section scroll-mt-24">
                    <h2>14. Violation of Terms</h2>
                    <h3>14.1 Breach Consequences</h3>
                    <p className="text-justify">In the event of any actual or suspected breach of these Terms of Service by You, including but not limited to:</p>
                    <ul>
                        <li>Misuse of the Platform</li>
                        <li>Violation of law (including but not limited to the <strong>Information Technology Act, 2000</strong>, <strong>Indian Penal Code, 1860</strong>, <strong>Consumer Protection Act, 2019</strong>)</li>
                        <li>Harassment or abuse of Vendors or support staff</li>
                        <li>Use of fraudulent or stolen payment methods</li>
                        <li>Submission of misleading or defamatory content</li>
                        <li>Repeatedly placing orders and failing to collect takeaway orders or show up for dine-in reservations</li>
                        <li>Disruptive behavior at Vendor premises during dine-in or takeaway collection</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi reserves the right to take one or more of the following actions, with or without prior notice:</p>
                    <ul>
                        <li>Temporarily or permanently <strong>suspend</strong> or <strong>terminate your account</strong></li>
                        <li><strong>Block access</strong> from specific devices, IP addresses, or geolocations</li>
                        <li><strong>Cancel current or future orders</strong></li>
                        <li><strong>Withhold refunds</strong> associated with fraudulent behavior</li>
                        <li><strong>Report your activity</strong> to appropriate law enforcement or regulatory authorities</li>
                    </ul>

                    <h3>14.2 Legal Remedies</h3>
                    <p className="text-justify">You agree that any violation of these Terms:</p>
                    <ul>
                        <li>Will cause <strong>irreparable harm</strong> to Streefi, for which monetary damages may be inadequate</li>
                        <li>Will entitle Streefi to seek <strong>injunctive or equitable relief</strong>, in addition to any other legal remedies available under civil or criminal law</li>
                    </ul>
                    <p className="mt-4 text-justify">All actions shall be taken in accordance with due process and applicable Indian laws. Streefi also reserves the right to cooperate fully with law enforcement investigations.</p>
                </div>

                <div className="policy-section scroll-mt-24">
                    <h2>15. Suspension and Termination</h2>
                    <h3>15.1 Voluntary Termination by User</h3>
                    <p className="text-justify">You may stop using the Streefi Platform at any time by:</p>
                    <ul>
                        <li>Logging out of your account</li>
                        <li>Requesting permanent account deletion via the Platform or by contacting customer support</li>
                    </ul>
                    <p className="mt-4 text-justify">All outstanding orders and obligations must be cleared before termination, including any pending takeaway collections or dine-in orders.</p>

                    <h3>15.2 Suspension or Termination by Streefi</h3>
                    <p className="text-justify">Streefi reserves the right to <strong>suspend, limit, or terminate</strong> your access to the Platform, either temporarily or permanently, without prior notice, under the following conditions:</p>
                    <ul>
                        <li>Violation of these Terms of Service</li>
                        <li>Fraudulent activity, misuse, or illegal behavior</li>
                        <li>Abuse of refund, promotional, or payment systems</li>
                        <li>Non-payment of fees or repeated failure to collect takeaway orders or show up for dine-in orders</li>
                        <li>Activity that threatens the safety, reputation, or operations of the Platform, Vendors, or other users</li>
                        <li>Disruptive or inappropriate conduct at Vendor premises</li>
                    </ul>
                    <p className="mt-4 text-justify">This right is exercised in accordance with the <strong>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong>, and other applicable laws.</p>

                    <h3>15.3 Consequences of Termination</h3>
                    <p className="text-justify">Upon termination:</p>
                    <ul>
                        <li>Your access to the Platform and any associated services will be revoked</li>
                        <li>Streefi may delete your account data, except where required to retain it under applicable data retention laws (e.g., <strong>Income Tax Act, 1961</strong>, <strong>IT Rules, 2011</strong>)</li>
                        <li>You remain liable for all obligations incurred prior to termination (e.g., payment dues, disputes, uncollected orders)</li>
                    </ul>

                    <h3>15.4 No Waiver of Legal Rights</h3>
                    <p className="text-justify">Termination or suspension does not waive:</p>
                    <ul>
                        <li>Streefi's right to pursue legal action</li>
                        <li>Your liability for damages or statutory violations committed during Platform usage</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi may, at its discretion, allow reinstatement of a suspended or terminated account based on investigation outcomes.</p>
                </div>
                <div className="policy-section scroll-mt-24">
                    <h2>16. Governing Law and Jurisdiction</h2>
                    <h3>16.1 Applicable Law</h3>
                    <p className="text-justify">These Terms of Service, including all rights and obligations arising under them, shall be governed by and construed in accordance with the laws of <strong>India</strong>, including but not limited to:</p>
                    <ul>
                        <li><strong>The Indian Contract Act, 1872</strong></li>
                        <li><strong>The Information Technology Act, 2000</strong></li>
                        <li><strong>The Consumer Protection Act, 2019</strong></li>
                        <li><strong>The Food Safety and Standards Act, 2006</strong></li>
                        <li><strong>The Indian Penal Code, 1860</strong>, where applicable</li>
                    </ul>
                    <p className="mt-4 text-justify">This applies regardless of the user's physical location, provided the use of the Streefi Platform originates within India or relates to transactions conducted with Indian Vendors.</p>

                    <h3>16.2 Jurisdiction</h3>
                    <p className="text-justify">All disputes, controversies, or claims arising out of or in connection with:</p>
                    <ul>
                        <li>These Terms of Service</li>
                        <li>The use of the Platform</li>
                        <li>Any order or transaction facilitated by Streefi</li>
                    </ul>
                    <p className="mt-4 text-justify">Shall be subject to the <strong>exclusive jurisdiction of the competent courts located in Ahmedabad, Gujarat</strong>, India.</p>
                    <p className="text-justify">You irrevocably consent to the jurisdiction and venue of these courts and waive any objection regarding inconvenience or forum non conveniens.</p>

                    <h3>16.3 Dispute Resolution (Optional Pre-Litigation Step)</h3>
                    <p className="text-justify">Streefi may, at its sole discretion, offer <strong>internal mediation</strong> or <strong>alternative dispute resolution</strong> before resorting to litigation. If so:</p>
                    <ul>
                        <li>Users must cooperate in good faith to resolve disputes amicably</li>
                        <li>The process will not exceed 30 days unless extended by mutual agreement</li>
                    </ul>
                    <p className="mt-4 text-justify">Nothing in this section shall restrict Streefi's right to seek interim or injunctive relief from a court of competent jurisdiction, at any time.</p>
                </div>

                <div className="policy-section scroll-mt-24">
                    <h2>17. Grievance Redressal Mechanism</h2>
                    <h3>17.1 Commitment to Redressal</h3>
                    <p className="text-justify">Streefi is committed to resolving customer grievances in a fair, transparent, and timely manner, in accordance with:</p>
                    <ul>
                        <li><strong>Consumer Protection (E-Commerce) Rules, 2020</strong></li>
                        <li><strong>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong></li>
                    </ul>
                    <p className="mt-4 text-justify">Users are encouraged to contact support channels first for resolution before initiating legal action.</p>

                    <h3>17.2 First-Level Support</h3>
                    <p className="text-justify">For general issues related to:</p>
                    <ul>
                        <li>Order preparation delays or collection issues</li>
                        <li>Payment disputes</li>
                        <li>Refunds or cancellations</li>
                        <li>Vendor-related concerns</li>
                        <li>Issues with dine-in or takeaway service</li>
                    </ul>
                    <p className="mt-4 text-justify">You may contact:</p>
                    <ul>
                        <li><strong>In-app Chat Support</strong> (available during service hours)</li>
                        <li><strong>Email</strong>: streeficomplain@gmail.com or streefiservicelimited@gmail.com</li>
                    </ul>
                    <p className="mt-4 text-justify">Response Time:</p>
                    <ul>
                        <li>Acknowledgement: within <strong>48 hours</strong></li>
                        <li>Resolution: within <strong>7 business days</strong>, unless exceptional circumstances apply</li>
                    </ul>

                    <h3>17.3 Grievance Officer (Temporary Provision)</h3>
                    <p className="text-justify">In accordance with legal requirements, Streefi will be appointing a Grievance Officer shortly.<br />Until then, any grievance or escalation can be addressed via:</p>
                    <p className="mt-4 text-justify"><strong>Email:</strong> streeficomplain@gmail.com<br />
                        <strong>Postal Address:</strong><br />
                        Streefi Private Limited,<br />
                        Sterling City, Bopal,<br />
                        Ahmedabad – 380058, Gujarat, India</p>
                    <p className="mt-4 text-justify">Timeline for Escalated Complaints:</p>
                    <ul>
                        <li>Acknowledgement: within <strong>48 hours</strong></li>
                        <li>Resolution: within <strong>30 days</strong> from the date of receipt</li>
                    </ul>
                    <p className="mt-4 text-justify">Note: Submission of false, malicious, or misleading complaints may result in account suspension and/or legal consequences.</p>
                </div>

                <div className="policy-section scroll-mt-24">
                    <h2>18. Communications</h2>
                    <h3>18.1 Consent to Receive Communications</h3>
                    <p className="text-justify">By registering on and using the Streefi Platform, you expressly consent to receive:</p>
                    <ul>
                        <li>Transactional updates (order confirmations, preparation status, collection reminders for takeaway, dine-in confirmations)</li>
                        <li>Customer support responses</li>
                        <li>Service-related notifications</li>
                        <li>Promotional and marketing content (only if you opt-in)</li>
                    </ul>
                    <p className="mt-4 text-justify">Such communications may be delivered via:</p>
                    <ul>
                        <li>Email</li>
                        <li>SMS</li>
                        <li>Phone calls</li>
                        <li>WhatsApp</li>
                        <li>In-app push notifications</li>
                    </ul>
                    <p className="mt-4 text-justify">These communications are considered essential for the effective functioning of the service and are sent in accordance with:</p>
                    <ul>
                        <li>The <strong>Information Technology Act, 2000</strong></li>
                        <li>The <strong>Telecom Commercial Communications Customer Preference Regulations, 2018</strong> (TRAI)</li>
                        <li>Applicable data protection rules</li>
                    </ul>

                    <h3>18.2 Opting Out</h3>
                    <p className="text-justify">You may opt out of receiving:</p>
                    <ul>
                        <li>Marketing or promotional messages by using the "unsubscribe" or "opt-out" link provided in such communications.</li>
                        <li>Push notifications through your device settings or in-app preferences.</li>
                    </ul>
                    <p className="mt-4 text-justify">However, opting out of <strong>transactional or essential communications</strong> (e.g., order status, account-related security alerts) is not permitted while you hold an active Streefi account.</p>

                    <h3>18.3 Valid Contact Information</h3>
                    <p className="text-justify">You agree to:</p>
                    <ul>
                        <li>Maintain accurate and up-to-date contact details</li>
                        <li>Be solely responsible for any consequences resulting from outdated or incorrect communication information</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi is not liable for delays, missed collections, uncollected takeaway orders, or any damages arising from failed communications due to incorrect user information.</p>
                </div>
                <div className="policy-section scroll-mt-24">
                    <h2>19. General Provisions</h2>
                    <h3>19.1 Notices</h3>
                    <p className="text-justify">All notices or official communications from Streefi shall be deemed duly given when sent via:</p>
                    <ul>
                        <li>Email to your registered address</li>
                        <li>SMS to your registered mobile number</li>
                        <li>In-app notifications or alerts</li>
                        <li>Posted on the official website: <a href="http://www.streefi.in/">www.streefi.in</a></li>
                    </ul>
                    <p className="mt-4 text-justify">You are responsible for monitoring these channels for updates or changes.</p>

                    <h3>19.2 Assignment</h3>
                    <p className="text-justify">You may not assign or transfer your rights or obligations under these Terms without prior written consent from Streefi.</p>
                    <p className="text-justify">Streefi reserves the right to freely assign or transfer its rights and obligations to any affiliate, partner, acquirer, or successor entity, without requiring prior consent.</p>

                    <h3>19.3 Severability</h3>
                    <p className="text-justify">If any provision of these Terms is deemed unlawful, void, or unenforceable under applicable law:</p>
                    <ul>
                        <li>That provision will be enforced to the maximum extent permissible</li>
                        <li>The remainder of the Terms shall remain valid and enforceable</li>
                    </ul>

                    <h3>19.4 Force Majeure</h3>
                    <p className="text-justify">Streefi shall not be held liable for any delay, failure, or disruption in service caused by events beyond its reasonable control, including but not limited to:</p>
                    <ul>
                        <li>Acts of God</li>
                        <li>Natural disasters</li>
                        <li>War or armed conflict</li>
                        <li>Governmental restrictions or shutdowns</li>
                        <li>Internet outages or cyberattacks</li>
                        <li>Labour strikes or civil disturbances</li>
                        <li>Vendor closures, operational issues, or unavailability at Vendor premises</li>
                        <li>Disruptions affecting food preparation or availability for dine-in or takeaway services</li>
                    </ul>
                    <p className="mt-4 text-justify">Such events will not constitute a breach of contract.</p>

                    <h3>19.5 Waiver</h3>
                    <p className="text-justify">Failure by Streefi to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.</p>
                </div>
                <div className="policy-section scroll-mt-24">
                    <h2>20. IP Infringement</h2>
                    <h3>20.1 Reporting Intellectual Property Violations</h3>
                    <p className="text-justify">Streefi respects the intellectual property rights of others and expects Users and Vendors to do the same. If you believe that any content on the Platform infringes upon your copyright, trademark, or other intellectual property rights, you may report it to us.</p>
                    <p className="mt-4 text-justify">Submit your complaint to:<br />
                        <strong>Email:</strong> streeficomplain@gmail.com</p>
                    <p className="text-justify">Subject line: "Intellectual Property Infringement Notice"</p>
                    <p className="text-justify">Include the following information:</p>
                    <ul>
                        <li>A description of the copyrighted work or trademark that you claim has been infringed</li>
                        <li>The URL or precise location of the allegedly infringing material on our Platform</li>
                        <li>A statement that you believe in good faith that the use of the content is not authorized by the IP owner or applicable law</li>
                        <li>A declaration that the information provided is accurate and, under penalty of perjury, that you are the IP owner or authorized to act on behalf of the owner</li>
                        <li>Your name, physical address, email address, and phone number</li>
                        <li>A clear physical or electronic signature</li>
                    </ul>

                    <h3>20.2 Action Upon Receipt</h3>
                    <p className="text-justify">Upon receiving a valid IP infringement notice:</p>
                    <ul>
                        <li>We will review the claim promptly</li>
                        <li>We may remove or disable access to the infringing content</li>
                        <li>We may notify the Vendor or user who posted the content</li>
                        <li>Repeat or serious offenders may have their accounts suspended or terminated</li>
                    </ul>

                    <h3>20.3 False Claims</h3>
                    <p className="text-justify">Knowingly submitting false or misleading infringement notices is a violation of law and may result in:</p>
                    <ul>
                        <li>Suspension or banning of your account</li>
                        <li>Legal liability for damages, including costs and attorney's fees, under Section 66A of the <strong>Information Technology Act, 2000</strong> and provisions of the <strong>Indian Penal Code, 1860</strong></li>
                    </ul>
                </div>

                <div className="policy-section scroll-mt-24">
                    <h2>21: Advertisements</h2>
                    <h3>21.1 Third-Party Advertisements</h3>
                    <p className="text-justify">The Streefi Platform may display advertisements, promotional offers, or sponsored content provided by third-party advertisers ("Advertisers"). These may appear in the form of:</p>
                    <ul>
                        <li>Banners, videos, or native content</li>
                        <li>Partner brand promotions</li>
                        <li>Vendor-sponsored listings or coupons</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi does <strong>not endorse</strong>, <strong>verify</strong>, or <strong>guarantee</strong> the accuracy, legality, or quality of the products or services advertised by such third parties.</p>

                    <h3>21.2 Advertiser Obligations</h3>
                    <p className="text-justify">All Advertisers on the Streefi Platform must ensure that their content:</p>
                    <ul>
                        <li>Complies with applicable Indian laws, including the <strong>Consumer Protection Act, 2019</strong></li>
                        <li>Adheres to advertising guidelines issued by the <strong>Advertising Standards Council of India (ASCI)</strong></li>
                        <li>Does not contain misleading, deceptive, defamatory, or offensive content</li>
                    </ul>
                    <p className="mt-4 text-justify">Violations may result in:</p>
                    <ul>
                        <li>Suspension or removal of advertising privileges</li>
                        <li>Reporting to legal or regulatory authorities</li>
                    </ul>

                    <h3>21.3 User Discretion and Liability</h3>
                    <ul>
                        <li>Users are advised to exercise discretion before interacting with any advertisement or promotional material on the Platform.</li>
                        <li>Streefi is not liable for any loss or damage incurred as a result of transactions between Users and Advertisers, including claims relating to fraud, service deficiencies, or issues with dine-in or takeaway orders placed through advertised promotions.</li>
                    </ul>

                    <h3>21.4 Reporting Inappropriate Ads</h3>
                    <p className="text-justify">If you encounter an advertisement that appears to be:</p>
                    <ul>
                        <li>Misleading, harmful, or fraudulent</li>
                        <li>Inappropriate or non-compliant with Indian law</li>
                    </ul>
                    <p className="mt-4 text-justify">You may report it by contacting:<br />
                        <strong>Email:</strong> streeficomplain@gmail.com</p>
                    <p className="text-justify">Subject: "Ad Violation Report"</p>
                    <p className="text-justify">Streefi will review reported ads and take appropriate action within a reasonable time.</p>
                </div>
                <div className="policy-section scroll-mt-24">
                    <h2>22: Loyalty & Referral Programs</h2>
                    <h3>22.1 Overview</h3>
                    <p className="text-justify">Streefi may, from time to time, launch promotional programs such as:</p>
                    <ul>
                        <li><strong>Loyalty programs</strong> (e.g., points, credits, or rewards for repeat purchases)</li>
                        <li><strong>Referral programs</strong> (e.g., incentives for referring new users)</li>
                    </ul>
                    <p className="mt-4 text-justify">Participation in such programs is voluntary and subject to these Terms as well as specific program guidelines published at the time of the offer.</p>

                    <h3>22.2 Eligibility</h3>
                    <p className="text-justify">Only users with:</p>
                    <ul>
                        <li>A verified account on Streefi</li>
                        <li>No prior violations of these Terms or program abuse</li>
                    </ul>
                    <p className="mt-4 text-justify">...are eligible to participate. Users must also comply with any location or order-value restrictions stated in the program details.</p>

                    <h3>22.3 Referral Program Terms</h3>
                    <p className="text-justify">If active, the Referral Program allows users ("Referrers") to invite friends ("Referees") using a unique referral code.</p>
                    <p className="text-justify">Conditions:</p>
                    <ul>
                        <li>Referee must be a <strong>new user</strong> with a unique mobile number and device ID</li>
                        <li>Referee must complete a <strong>first successful dine-in or takeaway transaction</strong> within the eligibility period</li>
                        <li>Both Referrer and Referee must not cancel/refund the first order to qualify</li>
                        <li>For takeaway orders, the Referee must successfully collect the order from the Vendor location</li>
                    </ul>
                    <p className="mt-4 text-justify">Rewards:</p>
                    <ul>
                        <li>Will be credited in the form of wallet cash, discount codes, or credits</li>
                        <li>Are non-transferable, non-redeemable for cash, and subject to expiry</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi reserves the right to cap maximum referrals per user and may reject fraudulent invites.</p>

                    <h3>22.4 Loyalty Program Terms</h3>
                    <p className="text-justify">Loyalty programs, if introduced, may reward Users based on:</p>
                    <ul>
                        <li>Order frequency</li>
                        <li>Cumulative spending over a defined period</li>
                        <li>Specific vendor preferences or offers</li>
                        <li>Successful completion of dine-in or takeaway orders</li>
                    </ul>
                    <p className="mt-4 text-justify">Points or rewards:</p>
                    <ul>
                        <li>Cannot be encashed, transferred, or exchanged for other services</li>
                        <li>May have an expiration date</li>
                        <li>Are revocable at Streefi's discretion in case of misuse or error</li>
                    </ul>

                    <h3>22.5 Program Abuse and Penalties</h3>
                    <p className="text-justify">Abuse includes:</p>
                    <ul>
                        <li>Creating fake or duplicate accounts</li>
                        <li>Referring yourself or engaging in "device farming"</li>
                        <li>Misleading friends or public to gain rewards</li>
                        <li>Placing orders through referral codes but failing to collect takeaway orders</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi reserves the right to:</p>
                    <ul>
                        <li><strong>Suspend or ban accounts</strong></li>
                        <li><strong>Revoke earned rewards</strong></li>
                        <li><strong>Pursue legal remedies</strong> for fraudulent activity</li>
                    </ul>

                    <h3>22.6 No Obligation</h3>
                    <p className="text-justify">Streefi is under <strong>no obligation</strong> to continue or maintain any loyalty or referral program. All programs may be modified, suspended, or terminated at any time without notice.</p>
                </div>

                <div id="promotion" className="policy-section scroll-mt-24">
                    <h2>23: Promotional Codes & Discounts</h2>
                    <h3>23.1 Overview</h3>
                    <p className="text-justify">Streefi may issue <strong>promotional codes</strong>, <strong>discount vouchers</strong>, or <strong>limited-time offers</strong> ("Promo Codes") to Users as part of marketing campaigns, loyalty rewards, referral benefits, or vendor-sponsored promotions.</p>
                    <p className="mt-4 text-justify">Use of any Promo Code is subject to:</p>
                    <ul>
                        <li>These Terms of Service</li>
                        <li>Any additional conditions specified during issuance</li>
                    </ul>

                    <h3>23.2 Eligibility and Application</h3>
                    <p className="text-justify">Promo Codes are:</p>
                    <ul>
                        <li>Valid only for the user/account/mobile number to which they are issued</li>
                        <li>Non-transferable and non-redeemable for cash</li>
                        <li>Applicable only on qualifying dine-in or takeaway orders or items as stated in the promotion details</li>
                    </ul>
                    <p className="mt-4 text-justify">Users may apply only <strong>one Promo Code per order</strong>, unless explicitly allowed.</p>

                    <h3>23.3 Restrictions</h3>
                    <p className="text-justify">Promo Codes:</p>
                    <ul>
                        <li>May be restricted to certain vendors, locations, order values, payment methods, or dates</li>
                        <li>May not be combined with other offers unless stated</li>
                        <li>Cannot be applied to taxes or packaging charges (unless specified)</li>
                        <li>Are void where prohibited under law</li>
                    </ul>
                    <p className="mt-4 text-justify">Expired or misused codes will not be reissued or refunded.</p>

                    <h3>23.4 Abuse and Misuse</h3>
                    <p className="text-justify">Any form of misuse, including:</p>
                    <ul>
                        <li>Creation of multiple accounts</li>
                        <li>Use of bots or automation</li>
                        <li>Use of Promo Codes in breach of fair use</li>
                        <li>Placing orders with Promo Codes and failing to collect takeaway orders or complete dine-in service</li>
                    </ul>
                    <p className="mt-4 text-justify">...will lead to:</p>
                    <ul>
                        <li>Immediate cancellation of the order</li>
                        <li>Revocation of credits or benefits</li>
                        <li>Suspension or termination of the user account</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi reserves the right to deny any order or benefit arising from unauthorized or suspicious Promo Code usage.</p>

                    <h3>23.5 Vendor-Specific Offers</h3>
                    <p className="text-justify">In some cases, Promo Codes may be funded or sponsored by third-party vendors. Streefi:</p>
                    <ul>
                        <li>Is not responsible for changes or withdrawal of such vendor-specific offers</li>
                        <li>Disclaims liability for disputes between Users and Vendors over vendor-sponsored benefits</li>
                    </ul>

                    <h3>23.6 Right to Modify</h3>
                    <p className="text-justify">Streefi reserves the right to:</p>
                    <ul>
                        <li>Modify, suspend, or cancel any promotional offer or code at its sole discretion</li>
                        <li>Disqualify users deemed to be misusing promotional benefits</li>
                    </ul>
                    <p className="mt-4 text-justify">All promotional schemes comply with applicable Indian laws, including the <strong>Consumer Protection Act, 2019</strong> and <strong>Prize Chits and Money Circulation Schemes (Banning) Act, 1978</strong>, where relevant.</p>
                </div>
                <div id="vendor" className="policy-section scroll-mt-24">
                    <h2>24: Vendor Obligations</h2>
                    <h3>24.1 Applicability</h3>
                    <p className="text-justify">This section applies to all <strong>third-party food vendors ("Vendors")</strong> who list and sell products via the Streefi Platform. Vendors agree to abide by these obligations in addition to any <strong>separate Vendor Agreement</strong> signed with Streefi.</p>

                    <h3>24.2 Legal Compliance</h3>
                    <p className="text-justify">All Vendors must:</p>
                    <ul>
                        <li>Possess a valid <strong>FSSAI license</strong> as required under the <strong>Food Safety and Standards Act, 2006</strong></li>
                        <li>Comply with all applicable local municipal, health, and food safety regulations</li>
                        <li>Ensure cleanliness and hygiene standards in food preparation, storage, and handling</li>
                        <li>Maintain clean and hygienic premises for dine-in customers, including seating areas, washrooms, and service counters</li>
                        <li>Follow packaging norms per the <strong>Legal Metrology (Packaged Commodities) Rules, 2011</strong> for takeaway orders</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi reserves the right to request and verify documentation at any time.</p>

                    <h3>24.3 Product Accuracy & Quality</h3>
                    <p className="text-justify">Vendors are solely responsible for:</p>
                    <ul>
                        <li>The quality, freshness, and authenticity of the food products</li>
                        <li>Accurately listing menu items, ingredients, pricing, and portion sizes</li>
                        <li>Updating menu availability in real-time to avoid user disputes</li>
                        <li>Ensuring food is served at appropriate temperatures for dine-in orders</li>
                    </ul>
                    <p className="mt-4 text-justify">Food sold must not be expired, contaminated, or falsely labeled.</p>

                    <h3>24.4 Order Fulfillment</h3>
                    <p className="text-justify">Vendors agree to:</p>
                    <ul>
                        <li>Accept, prepare, and serve or pack orders in a timely manner</li>
                        <li>Avoid delays, cancellations, or last-minute denials without valid reason</li>
                        <li>Maintain order pickup standards for takeaway orders</li>
                        <li>Provide adequate seating, table service, and customer care for dine-in orders</li>
                        <li>Have orders ready for collection at the estimated time communicated to customers for takeaway</li>
                        <li>Serve dine-in customers promptly and courteously at their table or designated counter</li>
                    </ul>
                    <p className="mt-4 text-justify">Consistent delays, poor service quality, or user complaints may result in <strong>penalties, deactivation, or permanent delisting</strong>.</p>

                    <h3>24.5 Vendor Content & Branding</h3>
                    <p className="text-justify">All logos, menu images, item descriptions, and banners submitted by Vendors:</p>
                    <ul>
                        <li>Must be original or properly licensed</li>
                        <li>Shall not infringe third-party intellectual property</li>
                        <li>May be used by Streefi for marketing, discovery, or promotional purposes</li>
                    </ul>
                    <p className="mt-4 text-justify">Vendors grant Streefi a non-exclusive, royalty-free license to display such content within the Platform.</p>

                    <h3>24.6 Non-Discrimination</h3>
                    <p className="text-justify">Vendors must not refuse or prioritize service based on:</p>
                    <ul>
                        <li>User identity, religion, caste, gender, profession, or disability</li>
                    </ul>
                    <p className="mt-4 text-justify">Doing so is a violation of law and grounds for delisting.</p>

                    <h3>24.7 Data Responsibility</h3>
                    <p className="text-justify">Any personal data shared by users (e.g., names, numbers for communication) must:</p>
                    <ul>
                        <li>Be used solely for order fulfillment and customer service</li>
                        <li>Not be stored, resold, or reused for marketing without consent</li>
                        <li>Be handled in accordance with the <strong>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong></li>
                    </ul>
                </div>

                <div id="privacy-policy" className="policy-section scroll-mt-24">
                    <h2>25: Data Retention Policy</h2>
                    <h3>25.1 Purpose</h3>
                    <p className="text-justify">Streefi collects and retains user information to operate its services effectively, comply with legal obligations, prevent fraud, and improve the overall experience. This policy outlines how long user data is retained and under what conditions it may be deleted or preserved.</p>

                    <h3>25.2 General Retention Practices</h3>
                    <p className="text-justify">User data is retained for as long as necessary to:</p>
                    <ul>
                        <li>Complete the purposes for which it was collected (e.g., order processing, support, analytics)</li>
                        <li>Comply with Indian laws including the <strong>Information Technology Act, 2000</strong>, the <strong>Consumer Protection Act, 2019</strong>, and applicable data protection and e-commerce regulations</li>
                        <li>Meet tax and financial record-keeping obligations</li>
                    </ul>

                    <h3>25.3 Payment and Transaction Data</h3>
                    <p className="text-justify">Streefi does <strong>not store sensitive card information</strong> such as full card numbers, CVV, or PINs on its servers, in compliance with:</p>
                    <ul>
                        <li>The <strong>Reserve Bank of India (RBI)</strong> guidelines on <strong>card tokenization and storage</strong></li>
                        <li>The <strong>Payments and Settlement Systems Act, 2007</strong></li>
                    </ul>
                    <p className="mt-4 text-justify">All card-based transactions are processed through <strong>RBI-authorized third-party payment gateways</strong> (e.g., Razorpay, PhonePe, etc.). These entities are PCI-DSS compliant and store transaction-related data as per regulatory requirements. Non-sensitive transaction details (e.g., transaction ID, timestamp, payment status) may be retained by Streefi for up to 8 years for audit, refund, dispute, and legal purposes.</p>

                    <h3>25.4 Account and Order Data</h3>
                    <p className="text-justify">User account information, order history (including dine-in and takeaway orders), and support interaction records are typically retained for up to 5 years after your last activity or until account deletion is requested, whichever is earlier. However, in some cases, legal or regulatory reasons may require longer retention (e.g., income tax, GST, or anti-fraud investigations).</p>

                    <h3>25.5 User Deletion Requests</h3>
                    <p className="text-justify">Users have the right to request deletion of their data. You can:</p>
                    <ul>
                        <li>Email <strong>streeficomplain@gmail.com</strong> using your registered email address</li>
                        <li>Or use the in-app "Delete Account" feature (if available)</li>
                    </ul>
                    <p className="mt-4 text-justify">Upon verification, your account and related data will be deleted within 30 days, except for information that must be preserved under applicable laws or ongoing legal matters.</p>

                    <h3>25.6 Exceptions</h3>
                    <p className="text-justify">Streefi may retain certain information longer in the following cases:</p>
                    <ul>
                        <li>Pending payments, chargebacks, or disputes</li>
                        <li>Government investigations, court orders, or law enforcement requests</li>
                        <li>Enforcement of Terms of Service, including fraud prevention</li>
                    </ul>

                    <h3>25.7 Data Security During Retention</h3>
                    <p className="text-justify">All retained data is stored using industry-standard security measures, including:</p>
                    <ul>
                        <li>Role-based access control</li>
                        <li>Secure, encrypted storage</li>
                        <li>Monitoring and audit logs</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi is committed to protecting user privacy while meeting its compliance responsibilities under Indian law.</p>
                </div>
                <div className="policy-section scroll-mt-24">
                    <h2>26: Content Moderation</h2>
                    <h3>26.1 Scope</h3>
                    <p className="text-justify">This section applies to all user-generated content ("UGC") on the Streefi Platform, including but not limited to:</p>
                    <ul>
                        <li>Vendor reviews</li>
                        <li>Ratings</li>
                        <li>Comments</li>
                        <li>Feedback</li>
                        <li>Uploaded images (e.g., food photos)</li>
                    </ul>
                    <p className="mt-4 text-justify">All such content must comply with these Terms, as well as applicable Indian laws including the <strong>Information Technology Act, 2000</strong>, and the <strong>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong>.</p>

                    <h3>26.2 User Responsibility</h3>
                    <p className="text-justify">Users are solely responsible for the content they post. You agree not to upload, post, or share any content that is:</p>
                    <ul>
                        <li>Defamatory, offensive, or obscene</li>
                        <li>Misleading or false</li>
                        <li>Infringing any copyright, trademark, or intellectual property rights</li>
                        <li>Discriminatory or promotes hate speech</li>
                        <li>Containing viruses, scripts, or any code that may harm the Platform</li>
                    </ul>
                    <p className="mt-4 text-justify">Violations may result in content removal, suspension, or permanent deactivation of the user account.</p>

                    <h3>26.3 Moderation & Review</h3>
                    <p className="text-justify">Streefi reserves the right, but is not obligated, to:</p>
                    <ul>
                        <li>Pre-screen, filter, or monitor any content posted by users</li>
                        <li>Remove or restrict access to content that violates laws or policies</li>
                        <li>Edit content for clarity, length, or compliance where necessary</li>
                    </ul>
                    <p className="mt-4 text-justify">Content may be moderated by automated systems, community flags, or manual review teams.</p>

                    <h3>26.4 Vendor Content</h3>
                    <p className="text-justify">Vendors must also ensure their menus, product descriptions, and food images:</p>
                    <ul>
                        <li>Do not mislead users about ingredients, quantity, or pricing</li>
                        <li>Are legally owned or properly licensed for use</li>
                        <li>Do not promote false medical or nutritional claims</li>
                    </ul>
                    <p className="mt-4 text-justify">Failure to comply may result in listing suspension or legal action.</p>

                    <h3>26.5 Reporting Mechanism</h3>
                    <p className="text-justify">If you believe content violates these terms, you may report it by:</p>
                    <ul>
                        <li>Using the "Report" or "Flag" button (if available)</li>
                        <li>Emailing <strong>streeficomplain@gmail.com</strong> with:
                            <ul>
                                <li>A screenshot or direct link to the content</li>
                                <li>The reason for objection</li>
                                <li>Your contact details for follow-up</li>
                            </ul>
                        </li>
                    </ul>
                    <p className="mt-4 text-justify">We aim to review and act upon valid reports within <strong>72 hours</strong>.</p>
                    <p className="text-justify">Streefi is committed to maintaining a safe, inclusive, and respectful environment for all users.</p>
                </div>
                <div id="rating" className="policy-section scroll-mt-24">
                    <h2>27: User Feedback Usage</h2>
                    <h3>27.1 Purpose and Scope</h3>
                    <p className="text-justify">By submitting reviews, ratings, suggestions, or feedback ("Feedback") on the Streefi Platform, you grant Streefi the right to use, reproduce, publish, display, and distribute such content without further approval or compensation.</p>
                    <p className="mt-4 text-justify">This applies to:</p>
                    <ul>
                        <li>Order ratings for dine-in and takeaway experiences</li>
                        <li>Vendor reviews</li>
                        <li>App improvement suggestions</li>
                        <li>Customer service feedback</li>
                    </ul>
                    <p className="mt-4 text-justify">Streefi may use Feedback to:</p>
                    <ul>
                        <li>Improve services, vendor quality, and customer support</li>
                        <li>Develop new features or content</li>
                        <li>Highlight quality Vendors or remove underperforming ones</li>
                        <li>Conduct internal analytics or promotional campaigns</li>
                    </ul>

                    <h3>27.2 Intellectual Property and Consent</h3>
                    <p className="text-justify">You confirm that:</p>
                    <ul>
                        <li>The Feedback you provide is original and lawful</li>
                        <li>It does not violate any copyright, trademark, or third-party rights</li>
                        <li>You have the legal right to grant usage permissions</li>
                    </ul>
                    <p className="mt-4 text-justify">Once submitted, your Feedback may be displayed:</p>
                    <ul>
                        <li>Publicly on vendor pages</li>
                        <li>Internally in dashboards or reports</li>
                        <li>In promotional content or app banners (with anonymization if required)</li>
                    </ul>

                    <h3>27.3 No Obligation to Use</h3>
                    <p className="text-justify">While Streefi may use your Feedback in various ways, it is under no obligation to:</p>
                    <ul>
                        <li>Respond to suggestions</li>
                        <li>Implement any specific request or recommendation</li>
                    </ul>

                    <h3>27.4 Moderation Rights</h3>
                    <p className="text-justify">Streefi may edit, refuse, or remove Feedback that:</p>
                    <ul>
                        <li>Contains profanity, hate speech, or offensive content</li>
                        <li>Is proven to be fake, fraudulent, or posted with malicious intent</li>
                        <li>Is irrelevant to the order, dine-in experience, takeaway service, or vendor experience</li>
                    </ul>

                    <h3>27.5 Revocation and Deletion</h3>
                    <p className="text-justify">You may request the removal of your Feedback by:</p>
                    <ul>
                        <li>Writing to <strong>streeficomplain@gmail.com</strong> from your registered email</li>
                        <li>Stating valid reasons for the request (e.g., privacy, mistaken posting)</li>
                    </ul>
                    <p className="mt-4 text-justify">Feedback helps Streefi maintain high standards, and we thank users for their honest contributions.</p>
                </div>

                <div className="policy-section scroll-mt-24">
                    <h2>28: Platform Availability</h2>
                    <h3>28.1 Service Commitment</h3>
                    <p className="text-justify">Streefi strives to maintain uninterrupted access to its Platform (website and mobile application) to ensure a seamless experience for users and vendors. However, uninterrupted service cannot be guaranteed due to factors beyond our control.</p>

                    <h3>28.2 Planned Downtime</h3>
                    <p className="text-justify">The Platform may be temporarily unavailable during:</p>
                    <ul>
                        <li>Scheduled maintenance or system upgrades</li>
                        <li>Security patches and infrastructure improvements</li>
                        <li>Feature deployments or performance optimizations</li>
                    </ul>
                    <p className="mt-4 text-justify">We will make reasonable efforts to notify users in advance through Platform alerts, banners, or email communication when planned downtime is expected.</p>

                    <h3>28.3 Unforeseen Outages</h3>
                    <p className="text-justify">Unplanned outages may occur due to:</p>
                    <ul>
                        <li>Server or cloud infrastructure failures</li>
                        <li>Internet disruptions, power outages, or DNS issues</li>
                        <li>Cyberattacks (e.g., DDoS, intrusion attempts)</li>
                        <li>Force majeure events as defined in Section 19.4</li>
                    </ul>
                    <p className="mt-4 text-justify">During such outages, Streefi shall not be liable for:</p>
                    <ul>
                        <li>Failed orders or delays in order preparation for dine-in or takeaway</li>
                        <li>Inaccessibility of payment gateways or menus</li>
                        <li>Loss of user-generated content or data</li>
                    </ul>
                    <p className="mt-4 text-justify">We will aim to restore functionality promptly using emergency response and technical protocols.</p>

                    <h3>28.4 User Responsibility</h3>
                    <p className="text-justify">Users are responsible for:</p>
                    <ul>
                        <li>Keeping their app updated to the latest version</li>
                        <li>Ensuring a stable internet connection during usage</li>
                        <li>Not using unauthorized tools or extensions that may interfere with platform performance</li>
                    </ul>

                    <h3>28.5 Limitation of Liability</h3>
                    <p className="text-justify">Streefi is not responsible for any loss of revenue, data, or reputation arising from platform inaccessibility, delays, or downtimes—except where required under applicable Indian law.</p>
                    <p className="mt-4 text-justify">We are committed to maintaining a reliable platform and continuously invest in infrastructure and monitoring tools to reduce disruptions.</p>
                </div>
                <div className="policy-section scroll-mt-24">
                    <h2>29: Survival Clause</h2>
                    <h3>29.1 Continuity of Obligations</h3>
                    <p className="text-justify">Certain provisions of these Terms shall <strong>survive termination</strong>, deactivation, or deletion of your account or access to the Streefi Platform. These obligations will continue to remain legally binding on both the User and Streefi.</p>
                    <p className="mt-4 text-justify">The surviving sections include, but are not limited to:</p>
                    <ul>
                        <li><strong>Section 5</strong>: Payment-Related Information</li>
                        <li><strong>Section 6</strong>: Prices of Products</li>
                        <li><strong>Section 8</strong>: Returns, Cancellations, and Refunds</li>
                        <li><strong>Section 11</strong>: Intellectual Property Rights</li>
                        <li><strong>Section 12</strong>: Disclaimer of Warranties & Liability</li>
                        <li><strong>Section 13</strong>: Indemnification and Limitation of Liability</li>
                        <li><strong>Section 25</strong>: Data Retention Policy</li>
                        <li><strong>Section 27</strong>: User Feedback Usage</li>
                        <li><strong>Section 29</strong>: This clause itself</li>
                    </ul>

                    <h3>29.2 Vendor-Specific Continuation</h3>
                    <p className="text-justify">In the case of Vendors, termination of services or vendor agreements does not release the Vendor from:</p>
                    <ul>
                        <li>Outstanding payments or penalties</li>
                        <li>Claims related to food quality, safety, or user disputes arising from dine-in or takeaway orders</li>
                        <li>Compliance with data protection laws for stored user information</li>
                    </ul>

                    <h3>29.3 Legal Enforcement</h3>
                    <p className="text-justify">These surviving obligations will remain enforceable:</p>
                    <ul>
                        <li>For the duration prescribed by relevant Indian laws and regulations</li>
                        <li>Until such time as Streefi's legal, financial, or operational obligations cease</li>
                    </ul>
                    <p className="mt-4 text-justify">This clause ensures that critical legal and operational responsibilities are honored even after account or service closure.</p>
                </div>

                <div className="policy-section scroll-mt-24">
                    <h2>30: Entire Agreement</h2>
                    <h3>30.1 Binding Legal Agreement</h3>
                    <p className="text-justify">These Terms of Service, along with the Privacy Policy, Cancellation & Refund Policy, and any additional terms and conditions provided with specific services or features, together constitute the <strong>entire legal agreement</strong> between you and Streefi.</p>
                    <p className="mt-4 text-justify">They:</p>
                    <ul>
                        <li>Supersede all prior oral or written communications between you and Streefi regarding the use of the Platform</li>
                        <li>Govern your access to and use of the Platform and associated services</li>
                    </ul>

                    <h3>30.2 No Informal Waiver</h3>
                    <p className="text-justify">No waiver of any right, remedy, or breach under these Terms shall be valid unless expressly made in writing by Streefi. A failure by Streefi to enforce any provision shall not constitute a waiver of its rights at any time.</p>

                    <h3>30.3 Severability</h3>
                    <p className="text-justify">If any provision of these Terms is held to be invalid or unenforceable under Indian law, the remainder of the agreement shall continue to be valid and enforceable to the fullest extent permitted.</p>

                    <h3>30.4 Assignment</h3>
                    <p className="text-justify">You may not assign or transfer any rights or obligations under these Terms without Streefi's prior written consent. Streefi may freely assign these Terms or any rights/obligations without restriction, including to affiliates, legal successors, or in connection with a business restructuring.</p>

                    <h3>30.5 Governing Language</h3>
                    <p className="text-justify">These Terms are originally drafted in English. Any translated version (if provided) is for reference only. In the event of conflict, the <strong>English version shall prevail</strong>.</p>
                    <p className="mt-4 text-justify">These Terms represent a complete understanding between Streefi and the User regarding the Platform, replacing all prior agreements and understandings unless expressly incorporated herein.</p>
                </div>

                <div id="cookies" className="policy-section scroll-mt-24">
                    <h2>31: Cookies Policy</h2>
                    <h3>31.1 What are Cookies?</h3>
                    <p className="text-justify">Like most professional websites, the Streefi Platform uses cookies. Cookies are small text files that are downloaded to your computer or mobile device when you visit a site. They allow the Platform to recognize your device and store some information about your preferences or past actions to enhance your user experience.</p>
                    <p className="mt-4 text-justify">Our use of cookies is fully compliant with the data protection provisions under the <strong>Information Technology Act, 2000</strong>, and its associated rules.</p>

                    <h3>31.2 How We Use Cookies</h3>
                    <p className="text-justify">We use cookies for a variety of reasons detailed below:</p>
                    <ul>
                        <li><strong>Essential Cookies:</strong> These are necessary for the Platform to function correctly. They enable core functionalities such as user logins, account management, and processing dine-in and takeaway orders. Disabling these may render the service unusable.</li>
                        <li><strong>Performance and Analytics Cookies:</strong> We use these cookies to collect anonymous information about how users interact with our Platform. This helps us understand which features are popular and identify areas for improvement. Data collected is aggregated and does not personally identify you.</li>
                        <li><strong>Functionality Cookies:</strong> These cookies are used to remember choices you make, such as your location, username, or language preferences, to provide a more personalized and convenient experience.</li>
                    </ul>

                    <h3>31.3 Disabling Cookies</h3>
                    <p className="text-justify">You can prevent the setting of cookies by adjusting the settings on your browser (see your browser's "Help" section for how to do this). Be aware that disabling cookies will affect the functionality of this and many other websites that you visit. Disabling essential cookies will likely result in you being unable to place orders or use core features of the Streefi Platform.</p>
                    <p className="mt-4 text-justify">Therefore, it is recommended that you do not disable cookies for an optimal experience.</p>
                </div>
                <div id="wishlist" className="policy-section scroll-mt-24">
                    <h2>32: Wishlist Feature Policy</h2>
                    <h3>32.1 Feature Overview</h3>
                    <p className="text-justify">The Streefi Platform may offer a "Wishlist" or "Favorites" feature that allows you to save specific food items or vendors for future reference. This feature is provided as a convenience to help you quickly access items you are interested in.</p>

                    <h3>32.2 Availability and Price Disclaimer</h3>
                    <p className="text-justify">Adding an item to your wishlist <strong>does not constitute a reservation or guarantee of its availability or price</strong>. All items listed on the Platform are subject to change based on the vendor's operational status, stock, and pricing policies.</p>
                    <p className="mt-4 text-justify">Streefi shall not be liable if a wishlisted item becomes unavailable, changes in price, or if the vendor is no longer serviceable at the time you decide to place an order.</p>

                    <h3>32.3 Use of Wishlist Data</h3>
                    <p className="text-justify">By using the Wishlist feature, you agree that Streefi may collect and use aggregated, anonymized data from wishlists to analyze trends, understand product popularity, and improve service recommendations. This data helps us enhance the Platform and suggest relevant vendors or items to the user community. All data usage is governed by our Privacy Policy.</p>

                    <h3>32.4 Modification of the Feature</h3>
                    <p className="text-justify">Streefi reserves the right to modify, suspend, or discontinue the Wishlist feature, in whole or in part, at any time and without prior notice. We are not liable for any loss of saved items or data resulting from such changes. It is the user's responsibility to remember items they wish to order, as the feature is provided "as-is" without any warranty of permanence or reliability.</p>
                </div>
                <div id="stall-booking" className="policy-section scroll-mt-24">
                    <h2>33: Streefi Stall Booking Policy</h2>

                    <h3>33.1 Feature Overview</h3>
                    <p className="text-justify">The Streefi Platform allows users to book specific stalls at participating venues for a set period. This feature is designed to provide convenience and ensure that you have access to a designated space at your chosen venue. Booking a stall via Streefi ensures a guaranteed spot, subject to availability and the vendor’s policies.</p>

                    <h3>33.2 Booking Confirmation</h3>
                    <p className="text-justify">Upon successful completion of your stall booking, you will receive a <strong>confirmation code or Order ID</strong> through the app. This confirmation serves as proof of your booking and should be presented at the venue to claim your stall. Please ensure that all details, such as stall type, time, and duration, are correct before proceeding with your booking.</p>

                    <h3>33.3 Stall Duration and Time Limits</h3>
                    <p className="text-justify">Your stall booking will be subject to a specific time limit. The duration of the stall booking will be displayed during the booking process and must be adhered to. Streefi and/or the Vendor may impose penalties or additional charges if the allotted time is exceeded without prior arrangement. You are required to vacate the stall by the end of your booking time to allow others to use the space.</p>

                    <h3>33.4 Cancellation and Modification</h3>
                   <p className="text-justify">
Bookings can be canceled or modified up to the vendor’s closing time on the same day or at least 16 hours before the scheduled time, whichever is earlier, without penalty. Once the vendor’s daily closing time is reached (or the default reset time of 4:00 AM–5:00 AM, if no closing time is specified), booking slots automatically refresh for the next day and cannot be modified or canceled for a refund. Refunds, if applicable, will be processed within 2 business days. All changes, including stall selection or timing, are subject to availability and operational feasibility. Streefi and the Vendor reserve the right to refuse modifications based on operational constraints.
</p>

                    <h3>33.5 Vendor and Customer Responsibilities</h3>
                    <p className="text-justify">Vendors are responsible for providing the stall in good condition and ensuring its operational readiness. Customers are expected to respect the venue's policies, including hygiene standards and safety protocols. Any damage to the stall or its equipment during your booking will be your responsibility, and you may be required to pay for repairs or replacements.</p>

                    <h3>33.6 Disputes and Liability</h3>
                    <p className="text-justify">Streefi is not responsible for any disputes or issues that arise at the Vendor’s premises related to your stall booking. This includes, but is not limited to, service quality, seating availability, or any disagreements between the customer and the Vendor. All disputes should be resolved directly with the Vendor. Streefi’s liability is limited to the amount paid for the stall booking, and we are not liable for indirect or consequential damages.</p>

                    <h3>33.7 Force Majeure</h3>
                    <p className="text-justify">Streefi and the Vendor shall not be held responsible for any failures to fulfill stall bookings due to circumstances beyond their control, including but not limited to natural disasters, government regulations, or other force majeure events. In such cases, either party may cancel or reschedule the booking at their discretion.</p>

                    <h3>33.8 Modification of the Feature</h3>
                    <p className="text-justify">Streefi reserves the right to modify, suspend, or discontinue the stall booking feature, in whole or in part, at any time without prior notice. We are not liable for any loss of booking data or changes to your reservation caused by such modifications. It is your responsibility to review all booking details before confirming.</p>
                </div>


                {/* Add remaining sections similarly... */}
            </div>

            <Footer />
        </main>
    );
}
