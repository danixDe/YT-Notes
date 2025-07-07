"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Youtube, FileText, CheckCircle, Moon, Sun, Copy, RotateCcw } from 'lucide-react';

interface Note {
  id: string;
  content: string;
}

export default function NotesGenerator() {
  const [youtubeLink, setYoutubeLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const isValidYouTubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  const generateNotes = async () => {
    if (!youtubeLink.trim()) {
      alert('Please enter a YouTube link');
      return;
    }

    if (!isValidYouTubeUrl(youtubeLink)) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    setIsLoading(true);
    setHasGenerated(false);

    try {
      const res = await fetch('http://localhost:3001/api/summarize',{
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({url: youtubeLink}),
      });
      if(!res.ok) throw new Error('API call failed');
      
      const data = await res.json();

      const generatedNotes: Note[] = data.notes.split('\n').map((content: string, index: number)=>({
        id: (index + 1).toString(), 
        content: content.trim(),
      })).filter((note:Note) => note.content.length>0);
      setNotes(generatedNotes);
      setHasGenerated(true);
    } catch (error) {
      console.error('Error generating notes:', error);
      alert('Failed to generate notes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateNotes();
  };

  const copyToClipboard = async () => {
    const notesText = notes.map((note, index) => 
      `${index + 1}. ${note.content}`
    ).join('\n\n');
    
    try {
      await navigator.clipboard.writeText(notesText);
      alert('Notes copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy notes:', err);
    }
  };

  const resetForm = () => {
    setNotes([]);
    setHasGenerated(false);
    setYoutubeLink('');
  };

  return (
    <div className={`min-h-screen transition-all duration-500 relative overflow-hidden ${
      isDarkMode 
        ? 'bg-gradient-to-br from-black via-gray-900 to-black' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute inset-0 opacity-20 ${isDarkMode ? 'opacity-30' : 'opacity-10'}`}>
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(${isDarkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0, 0, 0, 0.05)'} 1px, transparent 1px),
              linear-gradient(90deg, ${isDarkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0, 0, 0, 0.05)'} 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            animation: 'gridMove 20s linear infinite'
          }}></div>
        </div>

        <div className="absolute top-20 left-20 w-32 h-32 border-2 border-green-500/20 rotate-45 animate-spin" style={{ animationDuration: '20s' }}></div>
        <div className="absolute top-40 right-32 w-24 h-24 border-2 border-green-400/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-32 left-40 w-20 h-20 bg-green-500/10 rotate-12 animate-bounce" style={{ animationDuration: '3s' }}></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 border-2 border-green-600/20 rotate-45" style={{ 
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          animation: 'float 6s ease-in-out infinite'
        }}></div>
        
        <div className={`absolute top-0 left-1/4 w-px h-full ${isDarkMode ? 'bg-green-500/10' : 'bg-gray-300/30'} transform rotate-12 origin-top`}></div>
        <div className={`absolute top-0 right-1/3 w-px h-full ${isDarkMode ? 'bg-green-400/10' : 'bg-gray-300/30'} transform -rotate-12 origin-top`}></div>
        
        <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-green-500/40 rounded-full animate-ping"></div>
        <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-green-400/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-green-600/40 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex justify-between items-start mb-8">
              <div></div>
              <Button
                onClick={toggleDarkMode}
                variant="ghost"
                size="icon"
                className={`glassmorphism border transition-all duration-300 hover:scale-110 ${
                  isDarkMode 
                    ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            </div>
            
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className={`p-4 rounded-2xl glassmorphism border transition-all duration-300 ${
                isDarkMode ? 'border-green-500/30 bg-green-500/5' : 'border-gray-300 bg-white/50'
              }`}>
                <FileText className={`w-10 h-10 ${isDarkMode ? 'text-green-400' : 'text-gray-800'}`} />
              </div>
              <h1 className={`text-5xl font-bold transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Notes Generator
              </h1>
            </div>
            <p className={`text-xl max-w-2xl mx-auto transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Transform any YouTube video into comprehensive, organized notes instantly. 
              Simply paste the link and let AI create beautiful structured notes for you.
            </p>
          </div>

          <div className={`glassmorphism border rounded-2xl p-8 mb-8 transition-all duration-300 hover:shadow-2xl ${
            isDarkMode 
              ? 'border-green-500/30 bg-black/20 shadow-2xl shadow-green-500/5' 
              : 'border-gray-300 bg-white/50 shadow-2xl shadow-gray-500/10'
          }`}>
            <div className="flex items-center gap-3 mb-6">
              <Youtube className="w-6 h-6 text-red-500" />
              <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                YouTube Link
              </h2>
            </div>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Paste the YouTube video URL you want to generate notes from
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeLink}
                  onChange={(e) => setYoutubeLink(e.target.value)}
                  className={`flex-1 h-14 text-lg glassmorphism focus:border-none transition-all duration-300 focus:scale-[1.02] focus:outline-none focus:ring-0 focus:shadow-none focus:border-transparent ${
                    isDarkMode 
                      ? 'border-green-500/30 bg-black/20 text-white placeholder:text-gray-500 focus:bg-black/30' 
                      : 'border-gray-300 bg-white/70 text-gray-900 placeholder:text-gray-500 focus:bg-white/90'
                  }`}
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  disabled={isLoading || !youtubeLink.trim()}
                  className={`h-14 px-8 cursor-pointer font-semibold text-lg transition-all duration-300 hover:scale-105 disabled:hover:scale-100  ${
                    isDarkMode
                      ? 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-500 text-black shadow-lg shadow-green-500/25'
                      : 'bg-gradient-to-r from-gray-800 to-black hover:from-gray-700 hover:to-gray-900 text-white shadow-lg shadow-gray-500/25'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </div>
                  ) : (
                    'Generate Notes'
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className={`glassmorphism border rounded-2xl p-12 mb-8 transition-all duration-300 ${
              isDarkMode 
                ? 'border-green-500/30 bg-black/20 shadow-2xl shadow-green-500/5' 
                : 'border-gray-300 bg-white/50 shadow-2xl shadow-gray-500/10'
            }`}>
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 glassmorphism border ${
                  isDarkMode ? 'border-green-500/30 bg-green-500/5' : 'border-gray-300 bg-white/50'
                }`}>
                  <Loader2 className={`w-10 h-10 animate-spin ${isDarkMode ? 'text-green-400' : 'text-gray-800'}`} />
                </div>
                <h3 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Generating Your Notes
                </h3>
                <p className={`text-lg max-w-md mx-auto mb-8 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  We are analyzing the video content and creating comprehensive notes for you. 
                  This usually takes a few moments.
                </p>
                <div className="max-w-md mx-auto">
                  <div className={`glassmorphism border rounded-full h-3 overflow-hidden ${
                    isDarkMode ? 'border-green-500/30 bg-black/20' : 'border-gray-300 bg-white/50'
                  }`}>
                    <div className={`h-full rounded-full animate-pulse transition-all duration-1000 ${
                      isDarkMode 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                        : 'bg-gradient-to-r from-gray-800 to-black'
                    }`} style={{ width: '70%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {hasGenerated && notes.length > 0 && (
            <div className={`glassmorphism border rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl ${
              isDarkMode 
                ? 'border-green-500/30 bg-black/20 shadow-2xl shadow-green-500/5' 
                : 'border-gray-300 bg-white/50 shadow-2xl shadow-gray-500/10'
            }`}>
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Generated Notes
                </h2>
              </div>
              <p className={`mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Here are the key points extracted from your YouTube video
              </p>
              
              <div className="space-y-4 mb-8">
                {notes.map((note, index) => (
                  <div key={note.id} className="group">
                    <div className={`flex items-start gap-4 p-6 rounded-xl glassmorphism border transition-all duration-300 hover:scale-[1.02] ${
                      isDarkMode 
                        ? 'border-green-500/20 hover:border-green-500/40 hover:bg-green-500/5' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-white/70'
                    }`}>
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                        isDarkMode
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-black'
                          : 'bg-gradient-to-r from-gray-800 to-black text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className={`leading-relaxed text-lg ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {note.content}
                        </p>
                      </div>
                    </div>
                    {index < notes.length - 1 && (
                      <div className={`my-4 h-px glassmorphism ${
                        isDarkMode ? 'bg-green-500/20' : 'bg-gray-200'
                      }`}></div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className={`pt-8 border-t ${isDarkMode ? 'border-green-500/20' : 'border-gray-200'}`}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    className={`flex items-center gap-3 h-12 px-8 glassmorphism border transition-all duration-300 hover:scale-105 ${
                      isDarkMode 
                        ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Copy className="w-5 h-5" />
                    Copy Notes
                  </Button>
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className={`flex items-center gap-3 h-12 px-8 glassmorphism border transition-all duration-300 hover:scale-105 ${
                      isDarkMode 
                        ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <RotateCcw className="w-5 h-5" />
                    Generate New Notes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!hasGenerated && !isLoading && (
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Youtube,
                  title: "Any YouTube Video",
                  description: "Works with any public YouTube video, from lectures to tutorials and documentaries",
                  color: "red"
                },
                {
                  icon: FileText,
                  title: "Structured Notes",
                  description: "Get organized, bullet-point notes that capture key insights and important details",
                  color: "green"
                },
                {
                  icon: CheckCircle,
                  title: "Instant Results",
                  description: "Generate comprehensive notes in seconds, not hours of manual work",
                  color: "green"
                }
              ].map((feature, index) => (
                <div
                  key={index}
                  className={`text-center p-8 glassmorphism border rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                    isDarkMode 
                      ? 'border-green-500/30 bg-black/20' 
                      : 'border-gray-300 bg-white/50'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl glassmorphism border flex items-center justify-center mx-auto mb-6 transition-all duration-300 ${
                    isDarkMode 
                      ? 'border-green-500/30 bg-green-500/5' 
                      : 'border-gray-300 bg-white/50'
                  }`}>
                    <feature.icon className={`w-8 h-8 ${
                      feature.color === 'red' ? 'text-red-500' : 'text-green-500'
                    }`} />
                  </div>
                  <h3 className={`font-bold text-xl mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {feature.title}
                  </h3>
                  <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(45deg); }
          50% { transform: translateY(-20px) rotate(45deg); }
        }
      `}</style>
    </div>
  );
}