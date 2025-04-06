import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Bold, Italic, Underline, AlignCenter, AlignLeft, AlignRight, Image as ImageIcon, X, Plus, Type } from 'lucide-react';

export default function SubmitBlog() {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    excerpt: '',
    content: '',
    category: 'fashion',
    images: [''],
    authorName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTextStyle, setActiveTextStyle] = useState({
    bold: false,
    italic: false,
    underline: false,
    align: 'left'
  });

  useEffect(() => {
    // Check if user is authenticated when component mounts
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setError('Please sign in to submit a blog post');
      } else {
        // Set the user data
        const userData = await supabase.auth.getUser();
        setUser(userData.data.user);
      }
    };
    
    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      // Check for the required fields
      if (!formData.title.trim() || !formData.content.trim()) {
        throw new Error('Please fill in all required fields');
      }
      
      // Check if at least one image is provided
      const validImages = formData.images.filter(img => img.trim() !== '');
      if (validImages.length === 0) {
        throw new Error('Please provide at least one image URL');
      }

      // Get current user
      if (!user) {
        throw new Error('Please sign in to submit a blog post');
      }

      // *** Using the admin-provided approach ***
      const { data, error: submitError } = await supabase
        .from('user_blogs') // Changed table name to match admin example
        .insert([
          {
            title: formData.title,
            subtitle: formData.subtitle,
            excerpt: formData.excerpt,
            content: formData.content,
            category: formData.category,
            image_urls: validImages, // Changed to match admin example
            author_email: user.email, // Using email as identifier
            author_name: formData.authorName,
            published_at: new Date().toISOString(),
          }
        ]);

      if (submitError) {
        console.error('Submission error:', submitError);
        throw new Error('Failed to submit article: ' + submitError.message);
      }

      console.log('Submission successful:', data);
      setSubmitSuccess(true);
      
      // Clear form fields on success
      setFormData({
        title: '',
        subtitle: '',
        excerpt: '',
        content: '',
        category: 'fashion',
        images: [''],
        authorName: ''
      });
      
      // Show success message and redirect
      alert('Blog submitted successfully!');
      setTimeout(() => {
        navigate('/blogs');
      }, 1500);
      
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit blog post');
      alert('Failed to submit blog. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };

  const addImageField = () => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, '']
    }));
  };

  const removeImageField = (index: number) => {
    if (formData.images.length > 1) {
      const newImages = formData.images.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        images: newImages
      }));
    }
  };

  const applyTextStyle = (style: string) => {
    if (!contentRef.current) return;
    
    const textArea = contentRef.current;
    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    const selectedText = formData.content.substring(start, end);
    let newText = formData.content;
    let cursorOffset = 4; // Default offset for cursor positioning
    
    if (style === 'bold') {
      newText = formData.content.substring(0, start) + `**${selectedText}**` + formData.content.substring(end);
      setActiveTextStyle(prev => ({ ...prev, bold: !prev.bold }));
    } else if (style === 'italic') {
      newText = formData.content.substring(0, start) + `*${selectedText}*` + formData.content.substring(end);
      cursorOffset = 2;
      setActiveTextStyle(prev => ({ ...prev, italic: !prev.italic }));
    } else if (style === 'underline') {
      newText = formData.content.substring(0, start) + `__${selectedText}__` + formData.content.substring(end);
      setActiveTextStyle(prev => ({ ...prev, underline: !prev.underline }));
    } else if (style === 'left' || style === 'center' || style === 'right') {
      let alignMarker = '';
      if (style === 'center') alignMarker = '<center>';
      else if (style === 'right') alignMarker = '<right>';
      else alignMarker = '<left>';
      
      newText = formData.content.substring(0, start) + `${alignMarker}${selectedText}</${style}>` + formData.content.substring(end);
      cursorOffset = alignMarker.length;
      setActiveTextStyle(prev => ({ ...prev, align: style }));
    } else if (style === 'heading') {
      newText = formData.content.substring(0, start) + `## ${selectedText}` + formData.content.substring(end);
      cursorOffset = 3;
    } else if (style === 'image') {
      // Insert image reference based on available images
      const imageCount = formData.images.filter(img => img.trim() !== '').length;
      if (imageCount > 0) {
        const nextImageRef = `{image${Math.min(imageCount, 5)}}`;
        newText = formData.content.substring(0, start) + nextImageRef + formData.content.substring(end);
        cursorOffset = nextImageRef.length;
      } else {
        alert('Please add at least one image URL first');
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, content: newText }));
    
    // Restore focus after state update and reposition cursor
    setTimeout(() => {
      textArea.focus();
      textArea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 10);
  };

  return (
    <div className="pt-20 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white shadow-lg p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-serif tracking-tight mb-2 text-center">Submit Your Article</h1>
          <p className="text-center text-gray-500 mb-12 font-light italic tracking-wide">Share your voice with the AVOURE community</p>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 mb-8 text-center">
              {error}
            </div>
          )}
          
          {submitSuccess && (
            <div className="bg-green-50 text-green-600 p-4 mb-8 text-center">
              Article submitted successfully! Redirecting to blog page...
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Title Section */}
            <div>
              <label className="block uppercase tracking-wide text-xs font-medium text-gray-500 mb-3">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full border-0 border-b-2 border-gray-200 focus:ring-0 focus:border-black py-3 text-2xl font-serif"
                placeholder="Your Captivating Title"
                required
              />
            </div>
            
            {/* Subtitle */}
            <div>
              <label className="block uppercase tracking-wide text-xs font-medium text-gray-500 mb-3">Subtitle</label>
              <input
                type="text"
                name="subtitle"
                value={formData.subtitle || ''}
                onChange={handleChange}
                className="w-full border-0 border-b-2 border-gray-200 focus:ring-0 focus:border-black py-2 text-lg italic font-serif"
                placeholder="An elegant subtitle to draw readers in"
              />
            </div>

            {/* Category Section */}
            <div>
              <label className="block uppercase tracking-wide text-xs font-medium text-gray-500 mb-3">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full border-2 border-gray-200 rounded-none focus:ring-0 focus:border-black py-3"
              >
                <option value="fashion">Fashion</option>
                <option value="beauty">Beauty</option>
                <option value="lifestyle">Lifestyle</option>
                <option value="shopping">Shopping</option>
              </select>
            </div>
            
            {/* Images Section */}
            <div>
              <label className="block uppercase tracking-wide text-xs font-medium text-gray-500 mb-3">
                Images
                <span className="normal-case ml-2 text-gray-400 italic">Add up to 5 images</span>
              </label>
              
              <div className="space-y-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="url"
                      value={image}
                      onChange={(e) => handleImageChange(index, e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 border-2 border-gray-200 p-3 focus:ring-0 focus:border-black"
                      required={index === 0}
                    />
                    <button
                      type="button"
                      onClick={() => removeImageField(index)}
                      className="p-2 text-gray-500 hover:text-red-500"
                      disabled={formData.images.length === 1 && index === 0}
                    >
                      <X size={20} />
                    </button>
                  </div>
                ))}
                
                {formData.images.length < 5 && (
                  <button
                    type="button"
                    onClick={addImageField}
                    className="flex items-center text-gray-500 hover:text-black py-2"
                  >
                    <Plus size={16} className="mr-1" /> Add Another Image
                  </button>
                )}
              </div>
            </div>
            
            {/* Excerpt Section */}
            <div>
              <label className="block uppercase tracking-wide text-xs font-medium text-gray-500 mb-3">Short Excerpt</label>
              <textarea
                name="excerpt"
                value={formData.excerpt}
                onChange={handleChange}
                rows={2}
                className="w-full border-2 border-gray-200 focus:ring-0 focus:border-black p-3"
                placeholder="A brief introduction to entice your readers (will appear in previews)"
                required
              />
            </div>
            
            {/* Content Section with Rich Text Controls */}
            <div>
              <label className="block uppercase tracking-wide text-xs font-medium text-gray-500 mb-3">Content</label>
              
              {/* Text formatting toolbar */}
              <div className="flex flex-wrap border-2 border-b-0 border-gray-200 p-2 space-x-1 bg-gray-50">
                <button 
                  type="button" 
                  className={`p-2 rounded ${activeTextStyle.bold ? 'bg-gray-200' : ''}`}
                  onClick={() => applyTextStyle('bold')}
                  title="Bold"
                >
                  <Bold size={16} />
                </button>
                <button 
                  type="button" 
                  className={`p-2 rounded ${activeTextStyle.italic ? 'bg-gray-200' : ''}`}
                  onClick={() => applyTextStyle('italic')}
                  title="Italic"
                >
                  <Italic size={16} />
                </button>
                <button 
                  type="button" 
                  className={`p-2 rounded ${activeTextStyle.underline ? 'bg-gray-200' : ''}`}
                  onClick={() => applyTextStyle('underline')}
                  title="Underline"
                >
                  <Underline size={16} />
                </button>
                <div className="border-l border-gray-300 mx-1"></div>
                <button 
                  type="button" 
                  className={`p-2 rounded ${activeTextStyle.align === 'left' ? 'bg-gray-200' : ''}`}
                  onClick={() => applyTextStyle('left')}
                  title="Align Left"
                >
                  <AlignLeft size={16} />
                </button>
                <button 
                  type="button" 
                  className={`p-2 rounded ${activeTextStyle.align === 'center' ? 'bg-gray-200' : ''}`}
                  onClick={() => applyTextStyle('center')}
                  title="Align Center"
                >
                  <AlignCenter size={16} />
                </button>
                <button 
                  type="button" 
                  className={`p-2 rounded ${activeTextStyle.align === 'right' ? 'bg-gray-200' : ''}`}
                  onClick={() => applyTextStyle('right')}
                  title="Align Right"
                >
                  <AlignRight size={16} />
                </button>
                <div className="border-l border-gray-300 mx-1"></div>
                <button 
                  type="button" 
                  className="p-2 rounded flex items-center" 
                  title="Insert image reference"
                  onClick={() => applyTextStyle('image')}
                >
                  <ImageIcon size={16} className="mr-1" />
                  <span className="text-xs">Image</span>
                </button>
                <button 
                  type="button" 
                  className="p-2 rounded flex items-center" 
                  title="Format as heading"
                  onClick={() => applyTextStyle('heading')}
                >
                  <Type size={16} className="mr-1" />
                  <span className="text-xs">Heading</span>
                </button>
              </div>
              
              <textarea
                ref={contentRef}
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={15}
                className="w-full border-2 border-t-0 border-gray-200 focus:ring-0 focus:border-black p-4"
                placeholder="Write your article here..."
                required
              />
              <div className="text-xs text-gray-500 mt-2 italic space-y-1">
                <p>Tip: Select text and click formatting buttons to apply styles.</p>
                <p>To add an image in your text, select where you want to insert it and click the Image button, or type {"{image1}"}, {"{image2}"}, etc.</p>
                <p>Markdown is supported: **bold**, *italic*, __underline__, ## headings</p>
              </div>
            </div>
            
            {/* Author Name */}
            <div>
              <label className="block uppercase tracking-wide text-xs font-medium text-gray-500 mb-3">Author Name</label>
              <input
                type="text"
                name="authorName"
                value={formData.authorName}
                onChange={handleChange}
                className="w-full border-2 border-gray-200 focus:ring-0 focus:border-black p-3"
                placeholder="Your name as it will appear on the published article"
                required
              />
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || submitSuccess}
              className="w-full bg-black text-white py-4 px-6 uppercase tracking-widest text-sm hover:bg-gray-800 transition-colors disabled:bg-gray-400"
            >
              {isSubmitting ? 'Submitting...' : submitSuccess ? 'Submitted Successfully!' : 'Publish Article'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}