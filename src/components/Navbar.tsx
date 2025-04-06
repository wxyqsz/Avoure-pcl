import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Search, User } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  
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

          {/* Right: Subscription, Login & Search */}
          <div className="hidden md:flex items-center space-x-6 text-sm uppercase tracking-wider">
            <Link to="/subscribe" className="hover:opacity-70">Subscription</Link>
            <div className="border-l border-gray-300 h-5"></div>
            <Link to="/signin" className="flex items-center space-x-1 hover:opacity-70">
              <User size={18} />
              <span>Signin</span>
            </Link>
            <Search size={20} className="cursor-pointer hover:opacity-70" />
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
            {/*onClick={() => setIsOpen(false)} if u want the hamburger option to close on its own when u clcik on any options*/} 
            <Link to="/fashion" onClick={() => setIsOpen(false)} className="block py-3 hover:opacity-70 uppercase tracking-widest text-sm">Fashion</Link>
            <Link to="/beauty" onClick={() => setIsOpen(false)} className="block py-3 hover:opacity-70 uppercase tracking-widest text-sm">Beauty</Link>
            <Link to="/lifestyle"onClick={() => setIsOpen(false)} className="block py-3 hover:opacity-70 uppercase tracking-widest text-sm">Lifestyle</Link>
            <Link to="/shopping" onClick={() => setIsOpen(false)} className="block py-3 hover:opacity-70 uppercase tracking-widest text-sm">Shopping</Link>
          </div>
          
          <div className="border-t border-gray-200 my-4"></div>
          
          <div className="space-y-4 mt-6">
            <Link to="/subscribe" onClick={() => setIsOpen(false)} className="block py-3 hover:opacity-70 uppercase tracking-widest text-sm">Subscription</Link>
            <Link to="/signin" onClick={() => setIsOpen(false)} className="flex items-center py-3 hover:opacity-70 uppercase tracking-widest text-sm">
              <User size={18} />
              <span className="ml-2">Signin</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}