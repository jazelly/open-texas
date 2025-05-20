import { Link } from 'react-router-dom';

function PrivacyPage() {
  return (
    <div className="flex flex-col items-center p-6 md:p-8 w-full max-w-7xl mx-auto min-h-screen bg-gray-900">
      <nav className="w-full flex justify-between items-center mb-6">
        <Link 
          to="/lobby" 
          className="bg-green-700 hover:bg-green-600 text-white py-2 px-4 rounded-md transition-colors"
        >
          {`<`} Back
        </Link>
      </nav>
      
      <div className="w-full text-center mb-8 p-6 bg-gradient-to-r from-green-800 to-green-600 rounded-lg shadow-lg">
        <h1 className="text-4xl text-gray-100 font-bold">Privacy Policy</h1>
      </div>
      
      <div className="w-full bg-gray-800 rounded-lg shadow-lg p-6 md:p-8 mb-8">
        <div className="prose prose-invert prose-headings:text-green-400 prose-a:text-blue-400 prose-strong:text-yellow-300 max-w-none">
          <p>
            <strong>Last Updated:</strong> November 2023
          </p>
          
          <h2>1. Introduction</h2>
          <p>
            This Privacy Policy explains how Open Texas and vertile.ai ("we", "us", or "our") collects, uses, 
            and discloses your information when you use our online poker platform.
          </p>
          
          <h2>2. Information We Collect</h2>
          <p>
            We collect the following types of information:
          </p>
          <ul>
            <li><strong>Personal Information</strong>: Your name and any other information you provide when creating an account.</li>
            <li><strong>Gameplay Data</strong>: Information about your gameplay, including game statistics and in-game actions.</li>
            <li><strong>Device Information</strong>: Information about the device you use to access our service, including browser type, IP address, and operating system.</li>
            <li><strong>Cookies and Similar Technologies</strong>: We use cookies and similar technologies to enhance your user experience and collect information about how you interact with our service.</li>
          </ul>
          
          <h2>3. How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul>
            <li>Provide, maintain, and improve our service</li>
            <li>Process and complete transactions</li>
            <li>Send you technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Develop new products and services</li>
            <li>Monitor and analyze trends, usage, and activities</li>
            <li>Detect, investigate, and prevent fraudulent or unauthorized activities</li>
            <li>Personalize your experience</li>
          </ul>
          
          <h2>4. Information Sharing and Disclosure</h2>
          <p>
            We may share your information in the following circumstances:
          </p>
          <ul>
            <li><strong>With Service Providers</strong>: We may share your information with third-party vendors who provide services on our behalf.</li>
            <li><strong>For Legal Reasons</strong>: We may disclose your information if required by law or in response to valid legal requests.</li>
            <li><strong>Business Transfers</strong>: In the event of a merger, acquisition, or sale of all or part of our assets, your information may be transferred as part of the transaction.</li>
          </ul>
          
          <h2>5. Data Security</h2>
          <p>
            We implement reasonable security measures to protect your information from unauthorized access, 
            alteration, disclosure, or destruction. However, no method of transmission over the Internet or 
            electronic storage is 100% secure, and we cannot guarantee absolute security.
          </p>
          
          <h2>6. Your Rights</h2>
          <p>
            Depending on your location, you may have certain rights regarding your personal information, including:
          </p>
          <ul>
            <li>The right to access the personal information we hold about you</li>
            <li>The right to request correction of inaccurate information</li>
            <li>The right to request deletion of your information</li>
            <li>The right to opt out of certain data uses</li>
          </ul>
          
          <h2>7. Children's Privacy</h2>
          <p>
            Our service is not directed to children under the age of 13. We do not knowingly collect personal 
            information from children under 13. If you believe a child under 13 has provided us with personal 
            information, please contact us.
          </p>
          
          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices or for other 
            operational, legal, or regulatory reasons. We will post the revised Privacy Policy on our website with 
            an updated "Last Updated" date.
          </p>
          
          <h2>9. Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy or our privacy practices, please contact us at:
          </p>
          <p>
            <a href="https://vertile.ai" target="_blank" rel="noopener noreferrer">vertile.ai</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPage; 