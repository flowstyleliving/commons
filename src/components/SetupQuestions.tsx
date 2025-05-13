'use client';

import React, { useState, useEffect } from 'react';

interface Question {
  // Define based on your actual question structure, assuming string for now
  text: string; 
}

interface UserAnswers {
  [questionKey: string]: string; // e.g., { q1: "answer1", q2: "answer2" }
}

interface SetupData {
  status: string; // e.g., 'awaiting_M', 'awaiting_E', 'summarizing', 'complete'
  questions: string[]; // Array of question texts
  userAnswers: UserAnswers | null; // Current user's previously saved answers
  summary?: string | null;
}

interface SetupQuestionsProps {
  initialSetupData: SetupData;
  currentUser: 'M' | 'E';
  onSetupComplete: () => void; // Callback when setup process (including summarization) is finished
  onAnswersSubmitted: (submittedByUser: 'M' | 'E') => void; // Callback when current user submits their answers
}

const SetupQuestions: React.FC<SetupQuestionsProps> = ({ initialSetupData, currentUser, onSetupComplete, onAnswersSubmitted }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswers>(initialSetupData.userAnswers || {});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupState, setSetupState] = useState<SetupData>(initialSetupData);

  const totalQuestions = setupState.questions?.length || 0;

  useEffect(() => {
    // If initial data indicates completion, call the callback.
    if (initialSetupData.status === 'complete') {
      onSetupComplete();
    }
    setSetupState(initialSetupData);
    setAnswers(initialSetupData.userAnswers || {});
  }, [initialSetupData, onSetupComplete]);


  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const questionKey = `q${currentQuestionIndex + 1}`;
    setAnswers({
      ...answers,
      [questionKey]: e.target.value,
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== totalQuestions) {
      setError('Please answer all questions before submitting.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/setup/answer?user=${currentUser}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit answers.');
      }
      
      onAnswersSubmitted(currentUser); // Notify parent that this user has submitted

      // The parent component will re-fetch status and pass new initialSetupData
      // or directly call onSetupComplete if result.nextStatus is 'complete'

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Determine if the current user should be answering questions
  const canCurrentUserAnswer = 
    (setupState.status === 'awaiting_M' && currentUser === 'M') ||
    (setupState.status === 'awaiting_E' && currentUser === 'E') ||
    setupState.status === 'not_started'; // Or if not_started, M usually goes first (handled by API or page.tsx logic)


  if (isLoading) {
    return (
      <div className="p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-stone-100 text-center">
        <p className="text-lg font-medium text-stone-700">Submitting answers...</p>
         <svg className="animate-spin h-6 w-6 text-teal-500 mx-auto mt-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
        <p className="font-semibold">Error:</p>
        <p>{error}</p>
        <button 
            onClick={() => setError(null)} // Allow dismissing error
            className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600"
        >
            Try Again
        </button>
      </div>
    );
  }

  if (!canCurrentUserAnswer && setupState.status !== 'complete' && setupState.status !== 'summarizing') {
     const waitingFor = setupState.status === 'awaiting_M' ? 'M' : 'E';
     return (
        <div className="p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-stone-100 text-center">
          <p className="text-lg font-medium text-stone-700">
            Waiting for User {waitingFor} to answer the setup questions.
          </p>
          <p className="text-sm text-stone-500 mt-2">Please check back shortly.</p>
           <svg className="animate-spin h-6 w-6 text-teal-500 mx-auto mt-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        </div>
     );
  }

  if (setupState.status === 'summarizing') {
    return (
      <div className="p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-stone-100 text-center">
        <p className="text-lg font-medium text-stone-700">Both users have answered.</p>
        <p className="text-sm text-stone-600 mt-1">Generating conversation summary...</p>
        <svg className="animate-spin h-6 w-6 text-teal-500 mx-auto mt-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }
  
  if (setupState.status === 'complete' && setupState.summary) {
    return (
      <div className="p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-stone-100">
        <h3 className="text-xl font-semibold text-teal-700 mb-3">Setup Complete!</h3>
        <p className="text-stone-700 mb-2">Here's a summary of your initial thoughts:</p>
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-md mb-4">
            <p className="text-sm text-teal-800 whitespace-pre-wrap">{setupState.summary}</p>
        </div>
        <button
          onClick={onSetupComplete}
          className="w-full py-2 px-4 bg-gradient-to-r from-teal-500 to-violet-600 text-white rounded-lg hover:from-violet-600 hover:to-violet-700 transition-all shadow-sm"
        >
          Proceed to Chat
        </button>
      </div>
    );
  }


  if (!setupState.questions || totalQuestions === 0) {
    return (
      <div className="p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-stone-100 text-center">
        <p className="text-lg font-medium text-stone-700">No setup questions found or setup is in an unknown state.</p>
        <p className="text-sm text-stone-500 mt-2">Please try resetting the chat or contact support.</p>
      </div>
    );
  }

  const currentQuestionText = setupState.questions[currentQuestionIndex];
  const questionKey = `q${currentQuestionIndex + 1}`;

  return (
    <div className="p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-stone-100">
      <h3 className="text-xl font-semibold text-teal-700 mb-1">Setup Questions for User {currentUser}</h3>
      <p className="text-sm text-stone-600 mb-4">Please answer the following questions to help start the conversation.</p>
      
      <div className="mb-2">
        <span className="text-xs font-medium text-teal-600">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </span>
      </div>
      
      <div className="mb-5 p-4 bg-teal-50 border border-teal-200 rounded-md">
        <label htmlFor={questionKey} className="block text-md font-medium text-stone-800 mb-2">
          {currentQuestionText}
        </label>
        <textarea
          id={questionKey}
          name={questionKey}
          rows={4}
          className="w-full p-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
          value={answers[questionKey] || ''}
          onChange={handleAnswerChange}
          placeholder="Your answer here..."
        />
      </div>

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={handleBack}
          disabled={currentQuestionIndex === 0 || isLoading}
          className="py-2 px-5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>
        
        {currentQuestionIndex < totalQuestions - 1 ? (
          <button
            onClick={handleNext}
            disabled={isLoading}
            className="py-2 px-5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isLoading || Object.keys(answers).length !== totalQuestions}
            className="py-2 px-5 bg-gradient-to-r from-teal-600 to-violet-600 text-white rounded-lg hover:from-violet-700 hover:to-violet-800 disabled:opacity-50 transition-all shadow-sm"
          >
            {isLoading ? 'Submitting...' : 'Submit All Answers'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SetupQuestions; 