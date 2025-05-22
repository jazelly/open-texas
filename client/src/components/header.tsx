import { Link, useNavigate } from 'react-router-dom';
import { minidenticon } from 'minidenticons';
import { useAuthContext } from '@/context';
import { formatChips } from '@/utils/chip';
import { Coins } from '@phosphor-icons/react';

// Generate SVG avatar using minidenticons package (no HTTP calls)
const generateAvatar = (userId: string) => {
  const svgString = minidenticon(userId);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
};


function Header() {
  const navigate = useNavigate();
  const { logout, user } = useAuthContext();
  const onLogout =() => {
    logout();
    navigate('/');
  }
  return (
    <div className="w-full bg-gray-900 border-b border-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-green-500">
            <img 
              src={generateAvatar(user.id)} 
              alt={`${user.name}'s avatar`} 
              className="h-full w-full object-cover bg-gray-800"
            />
          </div>
          <div>
            <p className="text-gray-200 font-medium">{user.name}</p>
            <div className="flex items-center space-x-1">
              <Coins className="w-5 h-5 text-green-400"  weight="fill" />
              <p className="text-green-400 text-sm">{`$${formatChips(user.chips).full}`}</p>
              
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link to="/rules" className="text-green-400 hover:text-green-300 text-sm px-3 py-1 rounded-md">
            Rules
          </Link>
          <button 
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default Header;
