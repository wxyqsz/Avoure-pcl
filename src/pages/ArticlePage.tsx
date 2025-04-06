import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Article } from '../types';

function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArticle() {
      setIsLoading(true);
      try {
        // Fetch the article
        const { data: articleData, error: articleError } = await supabase
          .from('articles')
          .select('*')
          .eq('id', id)
          .single();

        if (articleError) throw articleError;

        if (!articleData) {
          throw new Error('Article not found');
        }

        setArticle(articleData);

        // Update view count
        await supabase
          .from('articles')
          .update({ views: (articleData.views || 0) + 1 })
          .eq('id', id);

        // Fetch related articles (same category)
        const { data: relatedData, error: relatedError } = await supabase
          .from('articles')
          .select('*')
          .eq('category', articleData.category)
          .neq('id', id)
          .limit(3);

        if (relatedError) throw relatedError;
        setRelatedArticles(relatedData || []);

      } catch (err) {
        console.error('Error fetching article:', err);
        setError('Failed to load article. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchArticle();
    }
  }, [id]);

  const handleLike = async () => {
    if (!article) return;
    
    try {
      const newLikeCount = (article.likes || 0) + 1;
      await supabase
        .from('articles')
        .update({ likes: newLikeCount })
        .eq('id', article.id);
        
      setArticle({...article, likes: newLikeCount});
    } catch (error) {
      console.error('Error liking article:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-serif mb-2">Loading article...</h2>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-serif mb-2">Oops!</h2>
          <p className="text-red-600">{error || 'Article not found'}</p>
          <Link to="/" className="text-black underline mt-4 inline-block">Return to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Article Header */}
      <div className="mb-8">
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <Link to={`/${article.category}`} className="uppercase tracking-wider hover:underline">
            {article.category}
          </Link>
          {article.gender && (
            <>
              <span className="mx-2">•</span>
              <Link to={`/fashion/${article.gender}`} className="uppercase tracking-wider hover:underline">
                {article.gender}
              </Link>
            </>
          )}
        </div>
        <h1 className="text-4xl font-serif mb-4">{article.title}</h1>
        <p className="text-xl text-gray-600 mb-6">{article.excerpt}</p>
        <div className="flex items-center text-sm">
          <span>By {article.author}</span>
          <span className="mx-2">•</span>
          <span>
            {new Date(article.date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
        </div>
      </div>

      {/* Featured Image */}
      <div className="mb-8">
        <img 
          src={article.image} 
          alt={article.title} 
          className="w-full h-auto rounded-lg"
        />
      </div>

      {/* Article Content */}
      <div className="prose max-w-none mb-12">
        {article.content?.split('\n').map((paragraph, index) => (
          <p key={index} className="mb-4">{paragraph}</p>
        ))}
      </div>

      {/* Article Actions */}
      <div className="border-t border-b py-6 my-8 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <button onClick={handleLike} className="flex items-center space-x-2 group">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 text-gray-400 group-hover:text-red-500 transition-colors duration-300" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>{article.likes || 0} likes</span>
          </button>
          <div className="flex items-center space-x-2">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>{article.views || 0} views</span>
          </div>
        </div>
        <div>
          <Link 
            to={`/${article.category}`}
            className="px-4 py-2 border border-black text-sm hover:bg-black hover:text-white transition-colors duration-300"
          >
            More {article.category}
          </Link>
        </div>
      </div>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="mt-12">
          <h3 className="text-2xl font-serif mb-6">Related Articles</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedArticles.map((related) => (
              <Link to={`/article/${related.id}`} key={related.id} className="group">
                <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={related.image} 
                      alt={related.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h4 className="font-medium">{related.title}</h4>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{related.excerpt}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ArticlePage;