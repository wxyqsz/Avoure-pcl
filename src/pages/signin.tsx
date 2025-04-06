import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, BookOpen, ChevronDown } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  
  // Check authentication status on component mount
  useEffect(() => {
    // Check if user is logged in (e.g., by checking for auth token)
    const authToken = localStorage.getItem('authToken');
    setIsAuthenticated(!!authToken);
  }, []);
  
  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownOpen && event.target instanceof Element && !event.target.closest('.profile-dropdown')) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // Sign out function
  const handleSignOut = () => {
    // Clear authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Update authentication state
    setIsAuthenticated(false);
    
    // Redirect to home
    navigate('/');
    
    // Close the dropdown
    setProfileDropdownOpen(false);
  };

  return (
    <>
      <nav className="bg-white fixed top-0 left-0 w-full border-b border-gray-200 z-40">
        {/* Top Navbar */}
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 py-4">
          {/* Left: Menu Button - visible on all devices */}
          <button 
            className="block p-2 text-gray-800 z-50" 
            onClick={() => setIsOpen(!isOpen)} 
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          {/* Center: Logo */}
          <Link to="/" className="text-4xl md:text-5xl font-bold tracking-widest uppercase font-playfair pl-8">
            Avoure
          </Link>

          {/* Right: Subscription, Login/Profile */}
          <div className="hidden md:flex items-center space-x-6 text-sm uppercase tracking-wider">
            <Link to="/subscribe" className="hover:opacity-70">Subscription</Link>
            <div className="border-l border-gray-300 h-5"></div>
            
            {isAuthenticated ? (
              // Show Profile dropdown when authenticated
              <div className="profile-dropdown relative">
                <button 
                  className="flex items-center space-x-1 hover:opacity-70"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                >
                  <User size={18} />
                  <span>Profile</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Profile Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg rounded-md py-1 z-50">
                    <Link to="/your-blog" className="flex items-center px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 uppercase tracking-wide">
                      <BookOpen size={14} className="mr-2" />
                      View Your Blog
                    </Link>
                    <button 
                      onClick={handleSignOut}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 uppercase tracking-wide"
                    >
                      <LogOut size={14} className="mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Show Sign In option when not authenticated
              <Link to="/signin" className="flex items-center space-x-1 hover:opacity-70">
                <User size={18} />
                <span>Signin</span>
              </Link>
            )}
          </div>
        </div>

        {/* Bottom Navigation Links */}
        <div className="flex justify-center space-x-6 uppercase text-xs font-semibold tracking-widest py-3 border-t border-gray-200">
          <Link to="/fashion" className="hover:opacity-70">Fashion</Link>
          <Link to="/beauty" className="hover:opacity-70">Beauty</Link>
          <Link to="/lifestyle" className="hover:opacity-70">Lifestyle</Link>
          <Link to="/shopping" className="hover:opacity-70">Shopping</Link>
        </div>
      </nav>

      {/* Side Menu Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Side Menu */}
      <div className={`fixed top-0 left-0 h-full w-64 md:w-80 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} overflow-y-auto`}>
        {/* Menu Content */}
        <div className="px-6 py-20">
          <div className="font-medium text-sm uppercase tracking-widest mb-6">BLOG</div>
          <Link to="/submit-blog" onClick={() => setIsOpen(false)} className="block py-3 hover:opacity-70 uppercase tracking-widest text-sm">Submit Your Blog</Link>
          <Link to="/community-blogs" onClick={() => setIsOpen(false)} className="block py-3 hover:opacity-70 uppercase tracking-widest text-sm">Read Other Blogs</Link>
          
          <div className="border-t border-gray-200 my-4"></div>
          
          <div className="space-y-4">
            <Link to="/fashion" onClick={() => setIsOpen(false)} className="block py-3 hover:opacity-70 uppercase tracking-widest text-sm">Fashion</Link>
            <Link to="/beauty" onClick={() => setIsOpen(false)} className="block py-3 hover:opacity-70 uppercase tracking-widest text-sm">Beauty</Link>
            <Link to="/lifestyle" onClick={() => setIsOpen(false)} className="block py-3 hover:opacity-70 uppercase tracking-widest text-sm">Lifestyle</Link>
            <Link to="/shopping" onClick={() => setIsOpen(false)} className="block py-3 hover:opacity-70 uppercase tracking-widest text-sm">Shopping</Link>
          </div>
          
          <div className="border-t border-gray-200 my-4"></div>
          
          <div className="space-y-4 mt-6">
            <Link to="/subscribe" onClick={() => setIsOpen(false)} className="block py-3 hover:opacity-70 uppercase tracking-widest text-sm">Subscription</Link>
            
            {isAuthenticated ? (
              // Show authenticated options in side menu
              <>
                <Link to="/your-blog" onClick={() => setIsOpen(false)} className="flex items-center py-3 hover:opacity-70 uppercase tracking-widest text-sm">
                  <BookOpen size={18} />
                  <span className="ml-2">View Your Blog</span>
                </Link>
                <button 
                  onClick={() => {
                    handleSignOut();
                    setIsOpen(false);
                  }} 
                  className="flex items-center py-3 hover:opacity-70 uppercase tracking-widest text-sm w-full text-left"
                >
                  <LogOut size={18} />
                  <span className="ml-2">Sign Out</span>
                </button>
              </>
            ) : (
              // Show Sign In option when not authenticated
              <Link to="/signin" onClick={() => setIsOpen(false)} className="flex items-center py-3 hover:opacity-70 uppercase tracking-widest text-sm">
                <User size={18} />
                <span className="ml-2">Signin</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}