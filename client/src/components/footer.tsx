import { Link } from 'react-router-dom';

function Footer() {
  return (
    <div className="w-full bg-gray-900 border-t border-gray-800 shadow-md mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-8 mb-4 md:mb-0">
            <Link to="/rules" className="text-green-400 hover:text-green-300 text-sm px-3 py-1 rounded-md border border-gray-800 hover:border-green-500 transition-colors">
              View Poker Rules
            </Link>
            
            <Link to="/contact" className="text-green-400 hover:text-green-300 text-sm px-3 py-1 rounded-md border border-gray-800 hover:border-green-500 transition-colors">
              Contact Us
            </Link>
          </div>
          
          <span className="text-gray-500 text-sm">
            © 2025 All rights reserved by{' '}
            <a
              href="https://vertile.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:underline"
            >
              vertile.ai
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}

export default Footer; 