// src/components/ArticleForm.jsx or similar
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function ArticleForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to create an article');
      }
      
      // Insert the article
      const { error } = await supabase.from('articles').insert([
        {
          title,
          content,
          excerpt,
          category,
          author: user.id,
          date: new Date(),
        }
      ]);
      
      if (error) throw error;
      
      // Redirect to the article or articles list
      navigate('/articles');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <div>
        <label>Title</label>
        <input 
          type="text" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          required 
        />
      </div>
      <div>
        <label>Excerpt</label>
        <textarea 
          value={excerpt} 
          onChange={(e) => setExcerpt(e.target.value)} 
        />
      </div>
      <div>
        <label>Content</label>
        <textarea 
          value={content} 
          onChange={(e) => setContent(e.target.value)} 
          required 
        />
      </div>
      <div>
        <label>Category</label>
        <input 
          type="text" 
          value={category} 
          onChange={(e) => setCategory(e.target.value)} 
        />
      </div>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Article'}
      </button>
    </form>
  );
}