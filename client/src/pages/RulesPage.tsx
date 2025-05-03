import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import rehypeRaw from 'rehype-raw';

function RulesPage() {
  const [rulesContent, setRulesContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Import the markdown file dynamically
    import('../assets/rule.md?raw')
      .then((module) => {
        setRulesContent(module.default);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error loading markdown:', error);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6 md:p-8 w-full max-w-7xl mx-auto min-h-screen bg-gray-900">
      <nav className="w-full flex justify-between items-center mb-6">
        <Link 
          to="/" 
          className="bg-green-700 hover:bg-green-600 text-white py-2 px-4 rounded-md transition-colors"
        >
          Home
        </Link>
        <Link 
          to="/lobby" 
          className="bg-green-700 hover:bg-green-600 text-white py-2 px-4 rounded-md transition-colors"
        >
          Back to Lobby
        </Link>
      </nav>
      
      <div className="w-full text-center mb-8 p-6 bg-gradient-to-r from-green-800 to-green-600 rounded-lg shadow-lg">
        <h1 className="text-4xl text-gray-100 font-bold">Texas Hold'em Rules</h1>
      </div>
      
      <div className="w-full bg-gray-800 rounded-lg shadow-lg p-6 md:p-8 mb-8">
        <div className="prose prose-invert prose-headings:text-green-400 prose-a:text-blue-400 prose-strong:text-yellow-300 max-w-none">
          <ReactMarkdown rehypePlugins={[rehypeRaw]}>
            {rulesContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export default RulesPage; 