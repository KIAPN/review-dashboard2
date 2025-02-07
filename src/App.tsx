import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';  // Optional, remove if unnecessary

// Define the structure of a review
interface Review {
  rating: string;
  text: string;
  date: string;
  reviewer: string;
}

const ReviewDashboard = () => {
  const [categoryData, setCategoryData] = useState<{ [key: string]: { word: string; count: number }[] }>({
    quality: [],
    service: [],
    technical: [],
    performance: []
  });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cleanText = (text: string | undefined) => {
    if (!text) return '';
    return text
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/â€¦/g, '...')
      .replace(/â€"/g, '—')
      .replace(/Â/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      processData(jsonData);
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const processData = (data: any[]) => {
    const processedReviews: Review[] = data.map((review: any) => ({
      rating: review.Rating || 'FIVE',
      text: cleanText(review['Review Text']) || '',
      date: review.Date ? new Date(review.Date).toISOString().split('T')[0] : '',
      reviewer: review.Reviewer || 'Anonymous'
    }));

    const categories = {
      quality: ['professional', 'excellent', 'quality', 'great', 'amazing', 'fantastic'],
      service: ['service', 'helpful', 'responsive', 'courteous', 'friendly', 'prompt'],
      technical: ['insulation', 'attic', 'foam', 'crawl space', 'installation', 'spray'],
      performance: ['temperature', 'energy', 'efficient', 'comfort', 'saving', 'difference']
    };

    const wordFreqs: { [key: string]: number } = {};
    processedReviews.forEach(review => {
      const words = review.text.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 2) {
          wordFreqs[word] = (wordFreqs[word] || 0) + 1;
        }
      });
    });

    const processedCategories: { [key: string]: { word: string; count: number }[] } = {};
    Object.entries(categories).forEach(([category, keywords]) => {
      processedCategories[category] = keywords
        .map(word => ({
          word,
          count: Object.entries(wordFreqs)
            .filter(([key]) => key.includes(word.toLowerCase()))
            .reduce((sum, [, count]) => sum + count, 0)
        }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);
    });

    setCategoryData(processedCategories);
    setReviews(processedReviews);
  };

  const getDisplayData = () => {
    return Object.entries(categoryData)
      .flatMap(([category, words]) =>
        words.map(item => ({
          ...item,
          category
        }))
      )
      .sort((a, b) => b.count - a.count);
  };

  const getFilteredReviews = () => {
    let filtered = [...reviews];

    if (selectedWord) {
      filtered = filtered.filter(review =>
        review.text.toLowerCase().includes(selectedWord.toLowerCase())
      );
    } else if (selectedCategory !== 'all') {
      const categoryWords = categoryData[selectedCategory].map(item =>
        item.word.toLowerCase()
      );
      filtered = filtered.filter(review =>
        categoryWords.some(word =>
          review.text.toLowerCase().includes(word)
        )
      );
    }

    return filtered;
  };

  const maxCount = Math.max(
    ...Object.values(categoryData)
      .flat()
      .map(item => item.count)
  );

  return (
    <div className="max-w-6xl mx-auto p-4 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Review Analysis Dashboard</h1>

      {/* File Upload */}
      <div className="mb-6">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          className="border p-2"
        />
      </div>

      {loading && <p>Loading reviews...</p>}

      {/* Word Frequency Bar Chart */}
      {!loading && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Word Frequency Chart</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getDisplayData().slice(0, 10)}>
              <XAxis dataKey="word" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Reviews section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Reviews</h2>
        <div className="text-sm text-gray-600 mb-4">
          Showing {getFilteredReviews().length} of {reviews.length} reviews
        </div>

        <div className="space-y-4">
          {getFilteredReviews().map((review, index) => (
            <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-2">
                <div className="text-yellow-400 text-lg">
                  {'★'.repeat(
                    review.rating === 'FIVE' ? 5 :
                      review.rating === 'FOUR' ? 4 :
                        review.rating === 'THREE' ? 3 :
                          review.rating === 'TWO' ? 2 : 1
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(review.date).toLocaleDateString()}
                </div>
              </div>
              <div className="text-sm text-gray-700">
                {review.text}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                - {review.reviewer}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewDashboard;