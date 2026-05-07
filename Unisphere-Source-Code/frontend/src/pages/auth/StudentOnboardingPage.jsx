import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getInterestCategories, saveInterests } from '@/services/onboardingService';

export default function StudentOnboardingPage() {
  const [categories, setCategories] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTags, setCustomTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const { updateUserData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await getInterestCategories();
        setCategories(res?.categories || []);
      } catch {
        toast.error('Failed to load categories');
      } finally {
        setIsFetching(false);
      }
    };
    fetchCategories();
  }, []);

  const toggleInterest = (category) => {
    if (selectedInterests.includes(category)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== category));
    } else {
      setSelectedInterests([...selectedInterests, category]);
    }
  };

  const addCustomTag = (e) => {
    e.preventDefault();
    if (!customTagInput.trim()) return;
    const tag = customTagInput.toLowerCase().trim().replace(/[^a-z0-9_\s]/g, "").replace(/\s+/g, "_");
    if (tag && !customTags.includes(tag) && customTags.length < 5) { // Assuming max 5
      setCustomTags([...customTags, tag]);
    }
    setCustomTagInput('');
  };

  const removeCustomTag = (tag) => {
    setCustomTags(customTags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (selectedInterests.length === 0 && customTags.length === 0) {
      toast.error('Please select at least one interest.');
      return;
    }

    setIsLoading(true);
    try {
      await saveInterests({
        predefinedInterests: selectedInterests,
        customInterests: customTags,
      });

      toast.success('Onboarding complete!');
      updateUserData({ isOnboarded: true });
      navigate('/dashboard/student');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete onboarding.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <div className="flex h-screen items-center justify-center bg-[var(--bg)] text-[var(--text)]">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-8 rounded-2xl bg-[var(--bg-card)] p-8 shadow-xl border border-[var(--border)]">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-[var(--text-h)] font-heading">
            What are your interests?
          </h2>
          <p className="mt-2 text-[var(--text)]">
            Select the topics you care about. We'll use this to recommend clubs and events.
          </p>
        </div>

        <div className="space-y-6">
          {/* Predefined Categories */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-h)] uppercase tracking-wider mb-4">
              Suggested Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const isSelected = selectedInterests.includes(category);
                return (
                  <button
                    key={category}
                    onClick={() => toggleInterest(category)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors border ${
                      isSelected
                        ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                        : 'bg-[var(--bg-card-alt)] text-[var(--text)] border-[var(--border)] hover:border-[var(--primary)]'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Tags */}
          <div className="border-t border-[var(--border)] pt-6">
            <h3 className="text-sm font-semibold text-[var(--text-h)] uppercase tracking-wider mb-4">
              Add Custom Tags (Max 5)
            </h3>
            <form onSubmit={addCustomTag} className="flex gap-2">
              <Input
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="e.g. machine_learning, debating"
                disabled={customTags.length >= 5}
              />
              <Button type="submit" variant="secondary" disabled={customTags.length >= 5}>
                Add
              </Button>
            </form>
            
            {customTags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {customTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-card-alt)] px-3 py-1 text-sm text-[var(--text-h)] border border-[var(--border)]"
                  >
                    #{tag}
                    <button
                      onClick={() => removeCustomTag(tag)}
                      className="ml-1 text-[var(--text)] hover:text-[var(--red)]"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--border)] flex justify-end">
          <Button onClick={handleSubmit} isLoading={isLoading}>
            Finish Onboarding
          </Button>
        </div>
      </div>
    </div>
  );
}
