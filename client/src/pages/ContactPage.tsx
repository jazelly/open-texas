import { useState } from 'react';
import { Link } from 'react-router-dom';

function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    reason: 'invite'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // In a real application, this would be an API call
      // await api.post('/contact', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        message: '',
        reason: 'invite'
      });
    } catch (error) {
      setSubmitError('Failed to submit your request. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-6 md:p-8 w-full max-w-7xl mx-auto min-h-screen bg-gray-900">
      <nav className="w-full flex justify-between items-center mb-6">
        <Link 
          to="/" 
          className="bg-green-700 hover:bg-green-600 text-white py-2 px-4 rounded-md transition-colors"
        >
          {`<`} Back to Home
        </Link>
      </nav>
      
      <div className="w-full text-center mb-8 p-6 bg-gradient-to-r from-green-800 to-green-600 rounded-lg shadow-lg">
        <h1 className="text-4xl text-gray-100 font-bold">Contact Us</h1>
      </div>
      
      <div className="w-full bg-gray-800 rounded-lg shadow-lg p-6 md:p-8 mb-8 max-w-2xl mx-auto">
        <div className="prose prose-invert prose-headings:text-green-400 prose-a:text-blue-400 prose-strong:text-yellow-300 max-w-none mb-6">
          <h2>Get in Touch</h2>
          <p>
            Open Texas is currently in <strong>Alpha</strong> stage and access is by invitation only. 
            Fill out the form below to express your interest or for any other inquiries.
          </p>
        </div>
        
        {submitSuccess ? (
          <div className="bg-green-700 text-white p-4 rounded-md mb-4">
            <h3 className="text-xl font-bold mb-2">Thank You!</h3>
            <p>Your message has been received. We'll get back to you as soon as possible.</p>
            <button 
              onClick={() => setSubmitSuccess(false)} 
              className="mt-4 bg-green-600 hover:bg-green-500 px-4 py-2 rounded-md transition-colors"
            >
              Send Another Message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-gray-300 mb-2">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-gray-300 mb-2">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div>
              <label htmlFor="reason" className="block text-gray-300 mb-2">Reason for Contact</label>
              <select
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="invite">Request Alpha Invitation</option>
                <option value="feedback">Provide Feedback</option>
                <option value="bug">Report a Bug</option>
                <option value="question">General Question</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="message" className="block text-gray-300 mb-2">Message</label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                value={formData.message}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={formData.reason === 'invite' ? 'Tell us why you are interested in joining the Open Texas Alpha.' : ''}
              ></textarea>
            </div>
            
            {submitError && (
              <div className="bg-red-600 text-white p-3 rounded-md">
                {submitError}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 text-white px-4 py-3 rounded-md font-medium hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send Message'
              )}
            </button>
          </form>
        )}
      </div>
      
      <div className="text-center text-gray-400 mb-8">
        <h3 className="text-xl text-green-400 mb-2">Alternative Contact Methods</h3>
        <p className="mb-1">Email: contact@vertile.ai</p>
        <p>Website: <a href="https://vertile.ai" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">vertile.ai</a></p>
      </div>
    </div>

  );
}

export default ContactPage; 