import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Article } from '../types';

function Home() {
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
  const [trendingArticles, setTrendingArticles] = useState<Article[]>([]);
  const [fashionArticles, setFashionArticles] = useState<Article[]>([]);
  const [beautyArticles, setBeautyArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  

  useEffect(() => {
    async function fetchArticles() {
      try {
        // Fetch hero/featured articles (most recent)
        const { data: featured, error: featuredError } = await supabase
          .from('articles')
          .select('*')
          .order('date', { ascending: false })
          .limit(3);

        if (featuredError) throw featuredError;
        
        // Fetch trending articles (most liked)
        const { data: trending, error: trendingError } = await supabase
          .from('articles')
          .select('*')
          .order('likes', { ascending: false })
          .limit(6);

        if (trendingError) throw trendingError;

        // Fetch fashion articles
        const { data: fashion, error: fashionError } = await supabase
          .from('articles')
          .select('*')
          .eq('category', 'fashion')
          .order('date', { ascending: false })
          .limit(6);

        if (fashionError) throw fashionError;

        // Fetch beauty articles
        const { data: beauty, error: beautyError } = await supabase
          .from('articles')
          .select('*')
          .eq('category', 'beauty')
          .order('date', { ascending: false })
          .limit(6);

        if (beautyError) throw beautyError;

        setFeaturedArticles(featured || []);
        setTrendingArticles(trending || []);
        setFashionArticles(fashion || []);
        setBeautyArticles(beauty || []);
      } catch (err) {
        console.error('Error fetching articles:', err);
        setError('Failed to load articles. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchArticles();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-serif mb-2">Loading...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-serif mb-2">Oops!</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white relative">
      {/* Logo Header */}
<header className="py-5 border-b border-gray-200">
  <div className="max-w-7xl mx-auto px-4">
    <div className="flex items-center justify-between">
      {/* Empty div for symmetry */}
      <div className="w-6"></div>

      {/* Logo */}
      <div className="flex-1 flex justify-center">
        <Link to="/">
          <h1 className="text-5xl font-serif tracking-tight">Avoure</h1>
          <p className="text-sm text-center uppercase tracking-widest">FASHION</p>
        </Link>
      </div>

      {/* Empty div for symmetry */}
      <div className="w-6"></div>
    </div>
  </div>
</header>

      {/* Hero Section with Large Featured Article */}
      {featuredArticles.length > 0 && (
        <section className="bg-white py-6">
          <div className="max-w-7xl mx-auto px-4">
            <div className="aspect-w-16 aspect-h-9 overflow-hidden relative mb-2">
              <Link to={`/article/${featuredArticles[0].id}`}>
                <img 
                  src={featuredArticles[0].image} 
                  alt={featuredArticles[0].title} 
                  className="w-full h-full object-cover hover:opacity-90 transition-opacity duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white">
                  <span className="text-xs uppercase tracking-widest font-medium mb-2 inline-block">
                    {featuredArticles[0].category}
                  </span>
                  <h2 className="text-3xl md:text-5xl font-serif mb-4 leading-tight">
                    {featuredArticles[0].title}
                  </h2>
                  <p className="text-sm md:text-base text-gray-100 hidden md:block">
                    {featuredArticles[0].excerpt}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Secondary Featured Articles */}
      {featuredArticles.length > 1 && (
        <section className="py-6">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredArticles.slice(1, 3).map((article) => (
                <Link to={`/article/${article.id}`} key={article.id} className="group">
                  <div className="relative overflow-hidden">
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="w-full h-64 md:h-96 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <span className="text-xs uppercase tracking-widest font-medium mb-1 inline-block">
                        {article.category}
                      </span>
                      <h3 className="text-xl md:text-2xl font-serif mb-2">{article.title}</h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* IN THE SPOTLIGHT Section */}
      <section className="py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center mb-6">
            <h2 className="text-2xl font-serif uppercase tracking-wide">IN THE SPOTLIGHT</h2>
            <div className="ml-4 flex-grow border-t border-gray-300"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trendingArticles.slice(0, 3).map((article) => (
              <Link to={`/article/${article.id}`} key={article.id} className="group">
                <div>
                  <div className="overflow-hidden mb-3">
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <span className="text-xs uppercase tracking-widest font-medium mb-1 inline-block text-gray-500">
                    {article.category}
                  </span>
                  <h3 className="text-lg font-serif mb-2 group-hover:underline">
                    {article.title}
                  </h3>
                  <div className="text-xs text-gray-500">
                    By {article.author}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FASHION Section with Horizontal Scrolling */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <h2 className="text-2xl font-serif uppercase tracking-wide">FASHION</h2>
              <div className="ml-4 flex-grow border-t border-gray-300 w-24"></div>
            </div>
            <Link 
              to="/fashion" 
              className="text-sm uppercase tracking-wider hover:underline"
            >
              View All
            </Link>
          </div>
          
          <div className="flex space-x-6 overflow-x-auto pb-6 scrollbar-hide">
            {fashionArticles.map((article) => (
              <Link to={`/article/${article.id}`} key={article.id} className="group flex-shrink-0 w-72">
                <div>
                  <div className="overflow-hidden mb-3">
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="w-full h-72 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <span className="text-xs uppercase tracking-widest font-medium mb-1 inline-block text-gray-500">
                    {article.category}
                  </span>
                  <h3 className="text-lg font-serif mb-2 group-hover:underline">
                    {article.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* BEAUTY Section with Horizontal Scrolling */}
      <section className="py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <h2 className="text-2xl font-serif uppercase tracking-wide">BEAUTY</h2>
              <div className="ml-4 flex-grow border-t border-gray-300 w-24"></div>
            </div>
            <Link 
              to="/beauty" 
              className="text-sm uppercase tracking-wider hover:underline"
            >
              View All
            </Link>
          </div>
          
          <div className="flex space-x-6 overflow-x-auto pb-6 scrollbar-hide">
            {beautyArticles.map((article) => (
              <Link to={`/article/${article.id}`} key={article.id} className="group flex-shrink-0 w-72">
                <div>
                  <div className="overflow-hidden mb-3">
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="w-full h-72 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <span className="text-xs uppercase tracking-widest font-medium mb-1 inline-block text-gray-500">
                    {article.category}
                  </span>
                  <h3 className="text-lg font-serif mb-2 group-hover:underline">
                    {article.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-14 bg-black text-white">
        <div className="max-w-lg mx-auto px-4 text-center">
          <h2 className="text-2xl font-serif mb-4 uppercase tracking-wide">Newsletter</h2>
          <p className="text-gray-300 mb-6">
            Receive weekly updates on fashion, beauty, and culture news with Avoure FASHION.
          </p>
          <form className="flex flex-col md:flex-row gap-2">
            <input 
              type="email"
              placeholder="Your email address"
              className="flex-grow px-4 py-3 border border-white bg-transparent focus:outline-none"
            />
            <button 
              type="submit"
              className="bg-white text-black px-6 py-3 uppercase tracking-wider hover:bg-gray-200 transition-colors duration-300"
            >
              Sign Up
            </button>
          </form>
          <p className="mt-4 text-xs text-gray-400">
            By signing up, you agree to our privacy policy.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif">Avoure</h2>
            <p className="text-sm uppercase tracking-widest mt-1">Fashion</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="font-medium mb-4 uppercase text-sm tracking-wider">Fashion</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/fashion/women" className="hover:underline">Women</Link></li>
                <li><Link to="/fashion/men" className="hover:underline">Men</Link></li>
                <li><Link to="/fashion/trends" className="hover:underline">Trends</Link></li>
                <li><Link to="/fashion/shopping" className="hover:underline">Shopping</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-4 uppercase text-sm tracking-wider">Beauty</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/beauty/makeup" className="hover:underline">Makeup</Link></li>
                <li><Link to="/beauty/skincare" className="hover:underline">Skincare</Link></li>
                <li><Link to="/beauty/fragrance" className="hover:underline">Fragrance</Link></li>
                <li><Link to="/beauty/wellness" className="hover:underline">Wellness</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-4 uppercase text-sm tracking-wider">Culture</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/culture/celebrities" className="hover:underline">Celebrities</Link></li>
                <li><Link to="/culture/art" className="hover:underline">Art</Link></li>
                <li><Link to="/culture/music" className="hover:underline">Music</Link></li>
                <li><Link to="/culture/cinema" className="hover:underline">Cinema</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-4 uppercase text-sm tracking-wider">About</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="hover:underline">Our Story</Link></li>
                <li><Link to="/contact" className="hover:underline">Contact</Link></li>
                <li><Link to="/careers" className="hover:underline">Careers</Link></li>
                <li><Link to="/legal" className="hover:underline">Legal</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-500">
            <div className="flex justify-center space-x-6 mb-4">
              <a href="#" className="hover:text-gray-700">
                <span className="sr-only">Facebook</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </a>
              <a href="#" className="hover:text-gray-700">
                <span className="sr-only">Instagram</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                </svg>
              </a>
              <a href="#" className="hover:text-gray-700">
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="hover:text-gray-700">
                <span className="sr-only">Pinterest</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
                </svg>
              </a>
            </div>
            <p>© {new Date().getFullYear()} Avoure. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;