import { NextRequest, NextResponse } from 'next/server';
import { query } from '@lib/db';
import openai from '@lib/openai'; // For summarization

// Helper function to format answers for the prompt
function formatAnswersForPrompt(answers: any): string {
  let promptText = "";
  if (answers.M) {
    promptText += "\nM's Answers:\n";
    Object.entries(answers.M).forEach(([key, value], index) => {
      promptText += `${index + 1}. ${value}\n`; // Assuming answers are stored in order or using question number
    });
  }
  if (answers.E) {
    promptText += "\nE's Answers:\n";
    Object.entries(answers.E).forEach(([key, value], index) => {
      promptText += `${index + 1}. ${value}\n`;
    });
  }
  return promptText;
}

async function summarizeAnswers(answers: any, setupId: number): Promise<string> {
  if (!answers || !answers.M || !answers.E) {
    throw new Error('Cannot summarize before both users answer.');
  }

  const questionsText = [
    "1. What is the primary issue or topic you are hoping to discuss or resolve today?",
    "2. Briefly, what is your perspective or feeling about this issue?",
    "3. What is one specific outcome you would consider a success for this session?",
    "4. Is there any important background information the other person or the facilitator should know about this issue?",
    "5. On a scale of 1-10, how open do you feel to exploring different solutions right now?"
  ].join('\n');

  const answersText = formatAnswersForPrompt(answers);

  const prompt = `Two partners, M and E, answered the following setup questions for a mediation session. Summarize their answers into a concise background context paragraph (max 150 words) that captures the key issues, perspectives, and goals.

Questions:
${questionsText}
${answersText}
Summary:`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.5,
    });

    const summary = completion.choices[0].message.content?.trim() || "Summary could not be generated.";

    await query(
      'UPDATE conversation_setup SET summary = $1, status = \'complete\', updated_at = CURRENT_TIMESTAMP WHERE setup_id = $2',
      [summary, setupId]
    );

    // TODO: Optionally update room_state structured_state
    return summary;
  } catch (error) {
    console.error("Error summarizing setup answers:", error);
    await query('UPDATE conversation_setup SET status = \'summarization_failed\' WHERE setup_id = $1', [setupId]);
    throw new Error('AI summarization failed.');
  }
}

export async function POST(request: NextRequest) {
  // TODO: Add proper authentication/session management
  const searchParams = request.nextUrl.searchParams;
  const user = searchParams.get('user') as 'M' | 'E';
  const { answers: userAnswers } = await request.json();

  if (!user || !['M', 'E'].includes(user)) {
    return NextResponse.json({ error: 'Valid user (M or E) must be specified' }, { status: 400 });
  }
  if (!userAnswers || typeof userAnswers !== 'object' || Object.keys(userAnswers).length === 0) {
    return NextResponse.json({ error: 'Invalid or empty answers format' }, { status: 400 });
  }

  try {
    const setupResult = await query(
     'SELECT setup_id, answers, status FROM conversation_setup WHERE room_id = \'main-room\' ORDER BY created_at DESC LIMIT 1'
    );

    if (setupResult.rows.length === 0) {
      return NextResponse.json({ error: 'No active setup found for this room' }, { status: 404 });
    }

    const setup = setupResult.rows[0];
    const currentAnswers = setup.answers || {};
    const currentStatus = setup.status;

    if (['complete', 'summarizing', 'summarization_failed'].includes(currentStatus)) {
      return NextResponse.json({ error: 'Setup is already complete or in progress' }, { status: 400 });
    }
    if ((currentStatus === 'awaiting_M' && user !== 'M') || (currentStatus === 'awaiting_E' && user !== 'E')) {
        return NextResponse.json({ error: 'Not your turn to answer setup questions' }, { status: 403 });
    }

    const updatedAnswers = { ...currentAnswers, [user]: userAnswers };

    let nextStatus = currentStatus;
    let summaryGenerated: string | null = null;
    const otherUser = user === 'M' ? 'E' : 'M';

    if (currentAnswers[otherUser]) {
      nextStatus = 'summarizing';
      await query(
        'UPDATE conversation_setup SET answers = $1::jsonb, status = $2, updated_at = CURRENT_TIMESTAMP WHERE setup_id = $3',
        [JSON.stringify(updatedAnswers), nextStatus, setup.setup_id]
      );
      
      try {
          summaryGenerated = await summarizeAnswers(updatedAnswers, setup.setup_id);
          nextStatus = 'complete'; // Set by summarizeAnswers on success
      } catch (summaryError) {
          console.error("Summarization failed trigger:", summaryError);
          nextStatus = 'summarization_failed'; // Set by summarizeAnswers on error
      }
    } else {
      nextStatus = user === 'M' ? 'awaiting_E' : 'awaiting_M';
      await query(
        'UPDATE conversation_setup SET answers = $1::jsonb, status = $2, updated_at = CURRENT_TIMESTAMP WHERE setup_id = $3',
        [JSON.stringify(updatedAnswers), nextStatus, setup.setup_id]
      );
    }

    return NextResponse.json({ 
      success: true, 
      nextStatus: nextStatus, 
      summary: summaryGenerated
    });

  } catch (error) {
    console.error('Error saving setup answer:', error);
    return NextResponse.json({ error: 'Failed to save setup answer' }, { status: 500 });
  }
} 