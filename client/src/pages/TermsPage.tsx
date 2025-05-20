import { Link } from 'react-router-dom';

function TermsPage() {
  return (
    <div className="flex flex-col items-center p-6 md:p-8 w-full max-w-7xl mx-auto min-h-screen bg-gray-900">
      <nav className="w-full flex justify-between items-center mb-6">
        <Link 
          to="/" 
          className="bg-green-700 hover:bg-green-600 text-white py-2 px-4 rounded-md transition-colors"
        >
         {`<`} Back
        </Link>
      </nav>
      
      <div className="w-full text-center mb-8 p-6 bg-gradient-to-r from-green-800 to-green-600 rounded-lg shadow-lg">
        <h1 className="text-4xl text-gray-100 font-bold">Terms & Conditions</h1>
      </div>
      
      <div className="w-full bg-gray-800 rounded-lg shadow-lg p-6 md:p-8 mb-8">
        <div className="prose prose-invert prose-headings:text-green-400 prose-a:text-blue-400 prose-strong:text-yellow-300 max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using the Open Texas service, you agree to be bound by these Terms and Conditions.
            If you do not agree to all the terms and conditions, please do not use our service.
          </p>
          
          <h2>2. Description of Service</h2>
          <p>
            Open Texas provides an online multiplayer Texas Hold'em poker game for entertainment purposes only.
            No real money gambling is involved or permitted on this platform.
          </p>
          
          <h2>3. Beta Version</h2>
          <p>
            The current version of Open Texas is in beta. This means:
          </p>
          <ul>
            <li>The service may experience interruptions, bugs, or unexpected downtime</li>
            <li>Features may change without notice</li>
            <li>Data may be reset during the beta period</li>
          </ul>
          
          <h2>4. User Accounts</h2>
          <p>
            Users are responsible for maintaining the confidentiality of their account information.
            You agree to provide accurate and complete information when creating an account.
          </p>
          
          <h2>5. User Conduct</h2>
          <p>
            Users agree not to:
          </p>
          <ul>
            <li>Use the service for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to other accounts</li>
            <li>Disrupt or interfere with the service</li>
            <li>Share explicit, offensive, or inappropriate content</li>
            <li>Harass other users</li>
          </ul>
          
          <h2>6. Intellectual Property</h2>
          <p>
            All content on the Open Texas platform is owned by vertile.ai and protected by intellectual property laws.
            Users may not copy, modify, distribute, or reproduce any part of the service without prior written permission.
          </p>
          
          <h2>7. Disclaimer of Warranties</h2>
          <p>
            The service is provided "as is" without warranties of any kind, either express or implied.
            We do not guarantee that the service will be uninterrupted, secure, or error-free.
          </p>
          
          <h2>8. Limitation of Liability</h2>
          <p>
            In no event shall Open Texas or vertile.ai be liable for any indirect, incidental, special, 
            consequential, or punitive damages arising out of or related to your use of the service.
          </p>
          
          <h2>9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the service after 
            changes constitutes acceptance of the new terms.
          </p>
          
          <h2>10. Governing Law</h2>
          <p>
            These terms shall be governed by and construed in accordance with applicable laws, without regard 
            to conflict of law principles.
          </p>
          
          <p className="mt-8 text-sm text-gray-400">
            Last updated: November 2023
          </p>
        </div>
      </div>
    </div>
  );
}

export default TermsPage; 