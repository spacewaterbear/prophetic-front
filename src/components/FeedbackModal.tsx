"use client";

import { useState } from "react";
import { X, MessageCircleHeart, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
}

export function FeedbackModal({ open, onClose, userId }: FeedbackModalProps) {
  const [likes, setLikes] = useState("");
  const [dislikes, setDislikes] = useState("");
  const [paidFeature, setPaidFeature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!likes.trim() && !dislikes.trim() && !paidFeature.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likes, dislikes, paidFeature, userId }),
      });

      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset after animation
    setTimeout(() => {
      setLikes("");
      setDislikes("");
      setPaidFeature("");
      setSubmitted(false);
      setError(null);
    }, 200);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div
          className="w-full max-w-md bg-[rgb(249,248,244)] dark:bg-[#1e1f20] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <MessageCircleHeart className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              <span className="font-semibold text-gray-900 dark:text-white">Feedback</span>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {submitted ? (
            <div className="px-6 py-12 flex flex-col items-center gap-3 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Thank you for your feedback!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your input helps us improve the experience.
              </p>
              <Button
                onClick={handleClose}
                className="mt-4 bg-gray-800 hover:bg-gray-700 text-white dark:bg-white/10 dark:hover:bg-white/20"
              >
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              {/* Question 1 */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Tell us one thing you <span className="text-green-600 dark:text-green-400">like</span> and one thing you{" "}
                  <span className="text-red-500 dark:text-red-400">don&apos;t like</span>
                </p>
                <div className="space-y-2">
                  <textarea
                    value={likes}
                    onChange={(e) => setLikes(e.target.value)}
                    placeholder="What do you like? ✓"
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 resize-none"
                  />
                  <textarea
                    value={dislikes}
                    onChange={(e) => setDislikes(e.target.value)}
                    placeholder="What do you dislike? ✗"
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 resize-none"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* Question 2 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Which feature would make you choose a paid plan?
                </p>
                <textarea
                  value={paidFeature}
                  onChange={(e) => setPaidFeature(e.target.value)}
                  placeholder="Describe the feature that would be worth paying for..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
              )}

              <Button
                type="submit"
                disabled={submitting || (!likes.trim() && !dislikes.trim() && !paidFeature.trim())}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20 disabled:opacity-50"
              >
                {submitting ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send feedback
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
