import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, CheckCircle2, Tags, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import { requestClub, uploadClubAssets } from '@/services/clubService';
import { getInterestCategories } from '@/services/onboardingService';
import { useAuth } from '@/context/AuthContext';
import { isFacultyRole } from '@/utils/roles';

const DEPARTMENTS = [
  'Computer Science',
  'Electronics',
  'Mechanical',
  'Civil',
  'Business',
  'Arts',
  'Law',
  'General',
];

const normalizeTag = (tag) => tag
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9_\s]/g, '')
  .replace(/\s+/g, '_')
  .slice(0, 30);

const humanizeTag = (tag) => tag.replace(/_/g, ' ');

export default function RequestClubPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('General');
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTagsInput, setCustomTagsInput] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [uploadingAsset, setUploadingAsset] = useState('');

  const { data: interestData, isLoading: interestsLoading } = useQuery({
    queryKey: ['interest-categories'],
    queryFn: async () => getInterestCategories(),
  });

  const predefinedTags = interestData?.categories || [];
  const maxCustomTags = interestData?.maxCustomTags ?? 10;
  const maxCustomTagLength = interestData?.maxCustomTagLength ?? 30;

  const parsedCustomTags = customTagsInput
    .split(',')
    .map((tag) => normalizeTag(tag))
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, maxCustomTags);

  const requestMutation = useMutation({
    mutationFn: (payload) => requestClub(payload),
    onSuccess: () => {
      toast.success('Club request submitted successfully');
      navigate(isFacultyRole(role) ? '/faculty/clubs' : '/clubs');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to submit club request');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const normalizedName = name.trim();
    const normalizedDescription = description.trim();

    if (normalizedName.length < 3) {
      toast.error('Club name must be at least 3 characters');
      return;
    }

    if (normalizedDescription.length < 20) {
      toast.error('Description must be at least 20 characters');
      return;
    }

    if (!selectedTags.length && !parsedCustomTags.length) {
      toast.error('Select at least one interest tag or add a custom tag');
      return;
    }

    if (parsedCustomTags.length > maxCustomTags) {
      toast.error(`You can add up to ${maxCustomTags} custom tags`);
      return;
    }

    requestMutation.mutate({
      name: normalizedName,
      description: normalizedDescription,
      department,
      logoUrl: logoUrl || undefined,
      bannerUrl: bannerUrl || undefined,
      tags: {
        predefined: selectedTags,
        custom: parsedCustomTags,
      },
    });
  };

  const toggleTag = (tag) => {
    setSelectedTags((current) => (
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    ));
  };

  const handleAssetUpload = async (file, setUrl, label) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error(`${label} must be an image file`);
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`${label} must be smaller than 5MB`);
      return;
    }

    try {
      setUploadingAsset(label);
      const response = await uploadClubAssets({ image: file });
      const uploadedUrl = response?.url;

      if (!uploadedUrl) {
        throw new Error('Upload failed');
      }

      setUrl(uploadedUrl);
      toast.success(`${label} uploaded`);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || `Failed to upload ${label.toLowerCase()}`);
    } finally {
      setUploadingAsset('');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <section className="bg-(--bg-card) border border-(--border) rounded-3xl p-8 shadow-sm space-y-6">
        <h1 className="text-2xl font-bold text-(--text-h) inline-flex items-center gap-2">
          <Building2 className="h-6 w-6 text-indigo-600" />
          Request New Club
        </h1>
        <p className="text-sm text-(--text) mt-2 mb-8">
          Submit a detailed proposal. Admin review is required before the club becomes active.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-(--text-h) mb-2">Club Name</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="e.g. Robotics and AI Society"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-(--text-h) mb-2">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-2xl border border-(--border) bg-(--bg-card) px-4 py-3 text-sm text-(--text-h) focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {DEPARTMENTS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-(--text-h)">Club Branding (Optional)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-(--text)">Club Logo</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAssetUpload(e.target.files?.[0], setLogoUrl, 'Logo')}
                />
                {logoUrl && <p className="text-xs text-(--primary) truncate">Uploaded: {logoUrl}</p>}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-(--text)">Club Banner</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAssetUpload(e.target.files?.[0], setBannerUrl, 'Banner')}
                />
                {bannerUrl && <p className="text-xs text-(--primary) truncate">Uploaded: {bannerUrl}</p>}
              </div>
            </div>
            {uploadingAsset && (
              <p className="text-xs text-(--text)">Uploading {uploadingAsset.toLowerCase()}...</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-semibold text-(--text-h)">Interest Tags</label>
              <button
                type="button"
                onClick={() => setSelectedTags([])}
                className="text-xs font-semibold text-(--primary) hover:underline"
              >
                Clear selection
              </button>
            </div>

            {interestsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-10 rounded-2xl bg-(--bg-card-alt) animate-pulse" />
                ))}
              </div>
            ) : predefinedTags.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {predefinedTags.map((tag) => {
                  const selected = selectedTags.includes(tag);

                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all',
                        selected
                          ? 'border-(--primary) bg-(--primary-glow) text-(--primary)'
                          : 'border-(--border) bg-(--bg-card) text-(--text-h) hover:border-(--primary)'
                      )}
                    >
                      {selected ? <CheckCircle2 className="h-4 w-4" /> : <Tags className="h-4 w-4" />}
                      {humanizeTag(tag)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-(--border) bg-(--bg-card-alt)/50 p-4 text-sm text-(--text)">
                Interest tags are temporarily unavailable. You can still add custom tags below.
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-(--text-h) mb-2">Custom Tags</label>
              <Input
                type="text"
                value={customTagsInput}
                onChange={(e) => setCustomTagsInput(e.target.value)}
                placeholder="e.g. sustainability, student_leadership, first_year"
              />
              <p className="mt-2 text-xs text-(--text)">
                Use comma-separated tags. Max {maxCustomTags} custom tags, each up to {maxCustomTagLength} characters.
              </p>
            </div>

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-2 rounded-full bg-(--primary-glow) px-3 py-1 text-xs font-semibold text-(--primary)">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {humanizeTag(tag)}
                  </span>
                ))}
              </div>
            )}

            {parsedCustomTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {parsedCustomTags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-2 rounded-full bg-(--bg-card-alt) px-3 py-1 text-xs font-semibold text-(--text-h)">
                    {humanizeTag(tag)}
                    <button
                      type="button"
                      onClick={() => setCustomTagsInput((current) => current
                        .split(',')
                        .map((item) => normalizeTag(item))
                        .filter((item) => item !== tag)
                        .join(', '))}
                      className="text-(--text) hover:text-(--red)"
                      aria-label={`Remove ${tag}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-(--text-h) mb-2">Club Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              maxLength={2000}
              className="w-full rounded-2xl border border-(--border) bg-(--bg-card) px-4 py-3 text-sm text-(--text-h) focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="Describe the mission, activities, and expected impact of this club"
            />
            <p className="text-xs text-(--text) mt-1">{description.length}/2000</p>
          </div>

          <div className="flex gap-3">
            <Button type="submit" isLoading={requestMutation.isPending}>
              Submit Request
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(isFacultyRole(role) ? '/faculty/clubs' : '/clubs')}>
              Cancel
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
